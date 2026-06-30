// ============================================================
// VoiceRecord — 按钮点击事件物理排查版
// ============================================================
import { useState, useRef, useCallback, useEffect } from 'react';
import { useReading } from '../../context/ReadingContext';
import { useAuth } from '../../context/AuthContext';
import { generateDiscoveryCard } from '../../utils/deepseek';
import { fetchDiscoveries, supabase } from '../../supabase';
import { v4 as uuidv4 } from 'uuid';
import ReadingDiscoveryCard from './ReadingDiscoveryCard';
import { getAvatar, getImage } from '../../utils/imageDB';

export default function VoiceRecord() {
  const { books, childSettings, activeTab } = useReading();
  const { session } = useAuth();
  const userUuid = session?.user_uuid;
  const isLoggedIn = session && !session.is_anonymous;

  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [voiceCard, setVoiceCard] = useState(null);
  const [selectedBook, setSelectedBook] = useState('');
  const [feedbackEmoji, setFeedbackEmoji] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [savedCards, setSavedCards] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wonderead-cards') || '[]'); }
    catch { return []; }
  });
  const [mode, setMode] = useState('voice');
  const [textInput, setTextInput] = useState('');

  const [showBookDrawer, setShowBookDrawer] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [bookCover, setBookCover] = useState(null);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const transcriptRef = useRef('');
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
      if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (_) {}
    };
  }, []);

  useEffect(() => { getAvatar().then(url => { if (url) setAvatarUrl(url); }); }, []);
  useEffect(() => { localStorage.setItem('wonderead-cards', JSON.stringify(savedCards)); }, [savedCards]);
  
  useEffect(() => {
    if (!userUuid) return;
    fetchDiscoveries(userUuid).then(cloudCards => {
      if (!cloudCards || cloudCards.length === 0) return;
      setSavedCards(prev => {
        const localIds = new Set(prev.map(c => c._id));
        let changed = false;
        const merged = [...prev];
        for (const cc of cloudCards) {
          if (!localIds.has(cc.id)) {
            merged.push({
              _id: cc.id,
              bookTitle: cc.book_title || '',
              discovery: cc.discovery || '',
              thinking: cc.question || '',
              quote: cc.quote || '',
              userVoice: cc.user_voice || cc.original || '',
              feedbackEmoji: cc.feedback_emoji || '',
              savedAt: new Date(cc.created_at || cc.date).getTime() || Date.now(),
            });
            changed = true;
          }
        }
        return changed ? merged : prev;
      });
    }).catch(e => console.warn('[VoiceRecord] 加载云端发现卡失败:', e.message));
  }, [userUuid]);

  const selectedBookData = books.find(b => b.title === selectedBook);
  const recordedCount = books.filter(b => b.feedbackEmoji || b.reading_records?.length).length;

  // 从书架点击🎙️跳转过来时，自动选中 pending book
  useEffect(() => {
    const pending = localStorage.getItem('wonderead-pending-book');
    if (pending) {
      localStorage.removeItem('wonderead-pending-book');
      if (books.some(b => b.title === pending)) {
        setSelectedBook(pending);
      }
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedBookData?.imageId) getImage(selectedBookData.imageId).then(url => setBookCover(url));
    else setBookCover(null);
  }, [selectedBookData?.imageId]);

  const sortedBooks = [...books].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const latestBook = sortedBooks[0] || null;
  const selectorDisplayText = selectedBook ? selectedBook : (latestBook ? `最近在读：《${latestBook.title}》` : '选择一本书');
  const recentBooks = sortedBooks.slice(0, 10);
  const filteredBooks = bookSearch.trim() ? books.filter(b => b.title.includes(bookSearch.trim()) || b.author?.includes(bookSearch.trim())) : recentBooks;

  const generateCard = useCallback(async (transcript) => {
    if (!selectedBook) return;
    setGenerating(true);
    try {
      const result = await generateDiscoveryCard({
        text: transcript,
        bookTitle: selectedBook,
        author: selectedBookData?.author || '',
      });
      const hasQuote = result.quote && result.quote.trim().length > 0;
      const feelingText = (result.feeling || '').replace(/^["""""""''「」『』]|["""""""''「」『』]$/g, '').trim();
      setVoiceCard({
        discovery: result.discovery || '',
        quote: hasQuote ? result.quote : '',
        thinking: result.question || '',
        userVoice: feelingText || transcript.slice(0, 60),
        bookTitle: selectedBook,
      });
    } catch (e) {
      console.warn('[VoiceRecord] DeepSeek 调用失败，使用降级方案:', e.message);
      const fallbackDiscovery = transcript.length > 20 ? transcript.slice(0, 40) + '……' : transcript;
      setVoiceCard({
        discovery: fallbackDiscovery,
        quote: '',
        thinking: '你认为这本书最打动你的是什么？',
        userVoice: fallbackDiscovery,
        bookTitle: selectedBook,
      });
    } finally { setGenerating(false); }
  }, [selectedBook, selectedBookData]);

  const recordingRef = useRef(false);

  // ---- 录音逻辑 ----
  const startRecording = useCallback(() => {
    if (!selectedBook) { setToast('请先选择一本书'); setTimeout(() => setToast(null), 2000); return; }
    if (recordingRef.current) return;

    setVoiceCard(null);
    setGenerating(false);
    transcriptRef.current = '';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setToast('此浏览器不支持麦克风'); setTimeout(() => setMode('text'), 1500);
      return;
    }

    recordingRef.current = true;
    setRecording(true);

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (!recordingRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      mediaStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.start();

      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setTimer(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.lang = 'zh-CN';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognitionRef.current = recognition;
        recognition.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) transcriptRef.current += event.results[i][0].transcript;
          }
        };
        recognition.start();
      }
    }).catch((e) => {
      recordingRef.current = false;
      setRecording(false);
      const isDenied = e.name === 'NotAllowedError' || e.message?.includes('permission');
      setToast(isDenied ? '请在设置中允许麦克风权限' : '无法访问麦克风');
      setTimeout(() => setToast(null), 3000);
    });
  }, [selectedBook]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setRecording(false);

    clearInterval(timerRef.current);
    setTimer(0);

    const recognition = recognitionRef.current;
    recognitionRef.current = null;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }

    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    if (elapsed < 2) {
      setToast('太快了，多说几句吧'); setTimeout(() => setToast(null), 3000); return;
    }

    if (recognition) {
      recognition.onend = () => {
        const finalTranscript = transcriptRef.current.trim();
        generateCard(finalTranscript || '（语音录音）');
      };
      try { recognition.stop(); } catch (_) {}
    } else {
      await generateCard(transcriptRef.current.trim() || '（语音录音）');
    }
  }, [generateCard]);

  const handleSaveCard = useCallback(async (emojiToSave) => {
    if (saving || saved) return;
    if (!voiceCard) { setToast('暂无卡片可保存'); setTimeout(() => setToast(null), 2000); return; }
    const finalEmoji = emojiToSave || feedbackEmoji || '';
    setSaving(true);
    setSaved(false);
    try {
      const cardId = uuidv4();
      const savedCard = { ...voiceCard, _id: cardId, feedbackEmoji: finalEmoji, savedAt: Date.now() };
      setSavedCards(prev => [savedCard, ...prev]);

      if (userUuid) {
        try {
          const { error } = await supabase.from('discoveries').insert({
            id: cardId,
            user_id: userUuid,
            book_id: selectedBookData?.id || null,
            book_title: voiceCard.bookTitle || '',
            discovery: voiceCard.discovery || '',
            question: voiceCard.thinking || '',
            quote: voiceCard.quote || '',
            original: voiceCard.userVoice || '',
            feedback_emoji: finalEmoji,
            user_voice: voiceCard.userVoice || '',
            date: new Date().toISOString().slice(0, 10),
          });
          if (error) console.warn('[VoiceRecord] Supabase 同步失败:', error.message);
        } catch (syncErr) {
          console.warn('[VoiceRecord] Supabase 同步异常（不影响本地）:', syncErr.message);
        }
      }
      setSaved(true);
      setSaving(false);
      setToast('✅ 卡片已保存！');
      setTimeout(() => { setToast(null); setVoiceCard(null); }, 1200);
    } catch (e) {
      setSaving(false);
      setToast('保存失败，请重试。');
      setTimeout(() => setToast(null), 3000);
    }
  }, [saving, saved, voiceCard, feedbackEmoji, userUuid, selectedBookData]);

  const prevTabRef = useRef(activeTab);
  const voiceCardRef = useRef(voiceCard);
  const savedRef = useRef(saved);
  const savingRef = useRef(saving);
  const feedbackEmojiRef = useRef(feedbackEmoji);
  useEffect(() => { voiceCardRef.current = voiceCard; }, [voiceCard]);
  useEffect(() => { savedRef.current = saved; }, [saved]);
  useEffect(() => { savingRef.current = saving; }, [saving]);
  useEffect(() => { feedbackEmojiRef.current = feedbackEmoji; }, [feedbackEmoji]);

  useEffect(() => {
    const prev = prevTabRef.current;
    prevTabRef.current = activeTab;
    if (prev === 'voice_record' && activeTab !== 'voice_record' && voiceCard && !saved && !saving) {
      handleSaveCard(feedbackEmoji);
    }
  }, [activeTab, voiceCard, saved, saving, feedbackEmoji, handleSaveCard]);

  const handleTextSubmit = useCallback(async () => {
    if (!selectedBook) { setToast('请先选择一本书'); setTimeout(() => setToast(null), 2000); return; }
    if (!textInput.trim()) return;
    setVoiceCard(null);
    await generateCard(textInput.trim());
    setTextInput('');
  }, [selectedBook, textInput, generateCard]);

  const handleSelectBook = (title) => {
    setSelectedBook(title);
    setVoiceCard(null);
    setShowBookDrawer(false);
    setBookSearch('');
  };

  if (books.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎤</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>还没有书</div>
        <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.6 }}>先去录入一本书，再来说说你的感受吧</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 4px' }}>
      {/* 选书器 */}
      <div onClick={() => { setShowBookDrawer(true); setBookSearch(''); }} className="capsule-selector">
        <span className="cs-icon">📖</span>
        <span className="cs-text" style={{ color: selectedBook ? 'var(--ink)' : 'var(--ink2)' }}>{selectorDisplayText}</span>
        <span className="cs-arrow">▼</span>
      </div>

      {/* 语音模式 */}
      {selectedBook && !voiceCard && !generating && mode === 'voice' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px', background: 'linear-gradient(160deg, #F5F1EB 0%, #EDE4D8 50%, #F0EAE2 100%)', borderRadius: 20, marginTop: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#9B9082', marginBottom: 16 }}>已记录 <strong style={{color: '#C8815C'}}>{recordedCount}</strong> 本书的感受</div>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            {recording && (
              <div style={{ position: 'absolute', top: -16, left: -16, right: -16, bottom: -16, borderRadius: '50%', border: '2px solid rgba(200,129,92,0.3)', animation: 'pulse 1.5s infinite', pointerEvents: 'none' }} />
            )}
            <button
              onClick={() => {
                if (recordingRef.current) stopRecording();
                else startRecording();
              }}
              style={{ width: 100, height: 100, borderRadius: '50%', background: recording ? 'linear-gradient(135deg, #C8815C, #A56545)' : 'linear-gradient(135deg, #E8D5C0, #D4B89B)', border: 'none', cursor: 'pointer', boxShadow: recording ? '0 0 30px rgba(200,129,92,0.4)' : '0 4px 20px rgba(200,129,92,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', fontSize: 32, color: 'white', outline: 'none' }}
            >
              {recording ? '🛑' : '🎙️'}
            </button>
          </div>
          <div style={{ fontSize: 13, color: '#5C5244', fontWeight: 500, marginBottom: 2 }}>
            {recording ? `正在录音（${timer}s）` : '点击开始，再次点击停止'}
          </div>
          <div style={{ fontSize: 10, color: '#9B9082', marginBottom: 16, textAlign: 'center', lineHeight: 1.6 }}>读完一本书后，让孩子说说感受</div>
          <div style={{ fontSize: 11, color: '#C8815C', cursor: 'pointer', fontWeight: 500 }} onClick={() => setMode('text')}>✏️ 或手动输入感受</div>
        </div>
      )}

      {/* 文字模式 */}
      {selectedBook && !voiceCard && !generating && mode === 'text' && (
        <div style={{ marginTop: 8, marginBottom: 12 }}>
          <div style={{ background: '#F9F7F4', borderRadius: 16, padding: '16px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: '#5C5244', fontWeight: 600, marginBottom: 8 }}>✏️ 写下孩子的感受</div>
            <textarea value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="把孩子的原话写下来，也可以是你观察到的反应…" rows={4} style={{ width: '100%', padding: '10px', border: '1px solid #E8E2D8', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box', background: 'white', color: 'var(--ink)' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => setMode('voice')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 11, color: 'var(--ink3)', cursor: 'pointer', fontFamily: 'var(--font)' }}>🎙️ 录音</button>
              <button onClick={handleTextSubmit} style={{ flex: 1, background: '#C8815C', color: 'white', border: 'none', padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>✨ 生成说说</button>
            </div>
          </div>
        </div>
      )}

      {generating && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✨</div>
          <div style={{ fontSize: 14, color: '#5C5244', fontWeight: 500, marginBottom: 4 }}>AI 正在生成…</div>
          <div style={{ fontSize: 11, color: '#9B9082' }}>基于孩子的感受智能整理</div>
        </div>
      )}

      {/* 卡片展示 */}
      {voiceCard && !generating && (
        <div style={{ marginTop: 12, marginBottom: 12 }}>
          <ReadingDiscoveryCard
            bookTitle={voiceCard.bookTitle}
            discovery={voiceCard.discovery}
            quote={voiceCard.quote}
            thinking={voiceCard.thinking}
            userVoice={voiceCard.userVoice}
            avatarUrl={avatarUrl}
            keyword="谈一谈"
            saved={saved}
            coverUrl={bookCover}
            author={selectedBookData?.author || ''}
            month={selectedBookData?.month || ''}
            bookId={selectedBookData?.id}
            onAvatarUpdate={(url) => setAvatarUrl(url)}
            onReRecord={() => setVoiceCard(null)}
          />
          {!saved && (
            <div style={{ marginTop: 18, marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: '#9B9082', textAlign: 'center', marginBottom: 8 }}>这本书孩子感觉如何？（选填，切换页面自动保存）</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                {[
                  { emoji: '😊', label: '喜欢' },
                  { emoji: '🙂', label: '还行' },
                  { emoji: '🤔', label: '思考中' },
                  { emoji: '😖', label: '不喜欢' },
                ].map(item => (
                  <div key={item.emoji} onClick={() => { if (saving || saved) return; setFeedbackEmoji(item.emoji); handleSaveCard(item.emoji); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: saving || saved ? 'default' : 'pointer', userSelect: 'none', opacity: feedbackEmoji === item.emoji || saved ? 1 : 0.4, transition: 'opacity 0.15s' }} onMouseEnter={e => { if (!saving && !saved) e.currentTarget.style.opacity = '0.8'; }} onMouseLeave={e => { if (!saving && !saved) e.currentTarget.style.opacity = feedbackEmoji === item.emoji ? 1 : 0.4; }}>
                    <span style={{ fontSize: 26, lineHeight: 1 }}>{item.emoji}</span>
                    <span style={{ fontSize: 9, color: '#9B9082', lineHeight: 1 }}>{item.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: 10 }}><button onClick={() => handleSaveCard('')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 16px', fontSize: 11, color: 'var(--ink3)', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--ink3)'; }}>💾 直接保存</button></div>
            </div>
          )}
          {saved && <div style={{ marginTop: 18, marginBottom: 8, textAlign: 'center' }}><div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EAF1ED', color: '#3D7A4F', padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>✅ 已保存到作品集</div></div>}
        </div>
      )}

      {/* 作品集画廊 */}
      {savedCards.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <div className="gallery-section-title">📚 作品集 <span className="gallery-section-count">{savedCards.length} 张</span></div>
          <StackedCardCarousel cards={savedCards} onSelect={(card) => { setVoiceCard(card); setSaved(true); if (card.bookTitle && card.bookTitle !== selectedBook) setSelectedBook(card.bookTitle); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        </div>
      ) : (
        !selectedBook && !voiceCard && !generating && (
          <div className="discovery-empty-cta">
            <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.5 }}>✨</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>还没有说说感受</div>
            <div className="cta-text">聊聊你喜欢的书吧，做个纪念。</div>
            {books.length > 0 && <button className="cta-button" onClick={() => { if (latestBook) handleSelectBook(latestBook.title); }}>🎤 说几句你的感受 →</button>}
          </div>
        )
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 120, left: '10%', right: '10%', zIndex: 9999, background: '#5C5244', color: 'white', textAlign: 'center', padding: '10px 16px', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 20px rgba(44,36,22,0.15)', fontFamily: 'var(--font)', lineHeight: 1.5 }}>{toast}</div>
      )}

      {/* 选书抽屉 */}
      {showBookDrawer && (
        <div className="modal-overlay" onClick={() => { setShowBookDrawer(false); setBookSearch(''); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, margin: '0 auto', borderRadius: '18px 18px 0 0', padding: '20px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>选择一本书</div>
              <button onClick={() => { setShowBookDrawer(false); setBookSearch(''); }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: 'var(--ink3)', cursor: 'pointer', fontFamily: 'var(--font)' }}>✕ 关闭</button>
            </div>
            <input value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder="🔍 搜索书名…" autoFocus style={{ width: '100%', padding: '11px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'var(--font)', color: 'var(--ink)', background: 'var(--card)', boxSizing: 'border-box', marginBottom: 8 }} />
            <div style={{ fontSize: 10, color: 'var(--ink3)', padding: '6px 2px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>{bookSearch.trim() ? `搜索结果（${filteredBooks.length}）` : '最近录入'}</div>
            {filteredBooks.length === 0 ? <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--ink3)', fontSize: 12 }}>{bookSearch.trim() ? '没有找到匹配的书' : '暂无书籍'}</div> : (
              <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                {filteredBooks.map(b => <div key={b.id} onClick={() => handleSelectBook(b.title)} style={{ padding: '10px 4px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.1s' }} onMouseEnter={e => { e.currentTarget.style.background = '#F8F3ED'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div><div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 1 }}>{b.author || '未知作者'}{selectedBook === b.title && <span style={{ marginLeft: 6, color: '#C8815C', fontWeight: 600 }}>· 当前选中</span>}</div></div>
                  <div style={{ fontSize: 10, color: 'var(--ink4)', whiteSpace: 'nowrap', marginLeft: 8 }}>{b.createdAt ? new Date(b.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : ''}</div>
                </div>)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// StackedCardCarousel — 堆叠深色卡展示
// ============================================================
function StackedCardCarousel({ cards, onSelect }) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => { setFocusedIndex(0); }, [cards.length]);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e) => { touchEndX.current = e.touches[0].clientX; };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0 && focusedIndex < cards.length - 1) setFocusedIndex(i => i + 1);
      if (diff < 0 && focusedIndex > 0) setFocusedIndex(i => i - 1);
    }
  };

  const focused = cards[focusedIndex];
  if (!focused) return null;

  return (
    <div>
      <div style={{ position: 'relative', height: 340, marginBottom: 10 }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {focusedIndex > 0 && <div onClick={() => setFocusedIndex(i => i - 1)} style={{ position: 'absolute', left: -8, top: 12, width: 60, height: 300, borderRadius: 14, overflow: 'hidden', zIndex: 1, cursor: 'pointer', background: '#2C2A28', border: '1px solid rgba(200,190,175,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}><span style={{ fontSize: 22 }}>📖</span></div>}
        {focusedIndex < cards.length - 1 && <div onClick={() => setFocusedIndex(i => i + 1)} style={{ position: 'absolute', right: -8, top: 12, width: 60, height: 300, borderRadius: 14, overflow: 'hidden', zIndex: 1, cursor: 'pointer', background: '#2C2A28', border: '1px solid rgba(200,190,175,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}><span style={{ fontSize: 22 }}>📖</span></div>}
        <div onClick={() => onSelect?.(focused)} style={{ width: '82%', margin: '0 auto', height: 320, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', position: 'relative', zIndex: 2, background: '#2C2A28', backgroundImage: 'linear-gradient(145deg, rgba(170, 140, 110, 0.08) 0%, rgba(44, 42, 40, 0.95) 60%)', boxShadow: '0 12px 40px rgba(44, 36, 22, 0.2)', border: '1px solid rgba(200,190,175,0.08)', color: '#E8E2D7', padding: '20px 16px 14px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 8, color: '#A39C94', marginBottom: 4 }}>来自《{focused.bookTitle}》</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E8E2D7', marginBottom: 10 }}>📖 读书说说</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ marginBottom: 10 }}><div style={{ fontSize: 8, color: '#A39C94', marginBottom: 2 }}>发现</div><div style={{ fontSize: 11.5, lineHeight: 1.7, color: '#E8E2D7' }}>{focused.discovery?.slice(0, 80)}</div></div>
            {focused.quote && <div style={{ marginBottom: 10, paddingLeft: 10, borderLeft: '2px solid #7C9A7C' }}><div style={{ fontSize: 8, color: '#A39C94', marginBottom: 2 }}>金句</div><div style={{ fontSize: 11.5, lineHeight: 1.7, color: '#E8E2D7', fontStyle: 'italic' }}>{focused.quote?.slice(0, 60)}</div></div>}
          </div>
          <div style={{ fontSize: 8, color: '#A39C94', textAlign: 'right' }}>{new Date(focused.savedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</div>
        </div>
      </div>
      {cards.length > 1 && <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 8 }}>{cards.slice(0, Math.min(cards.length, 8)).map((_, i) => <div key={i} style={{ width: i === focusedIndex ? 18 : 6, height: 6, borderRadius: 3, background: i === focusedIndex ? '#C8815C' : '#D6CFC4', transition: 'all 0.25s' }} />)}</div>}
    </div>
  );
}