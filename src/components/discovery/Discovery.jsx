import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useReading } from '../../context/ReadingContext';
import { aiAnalyze } from '../../utils/deepseek';
import { extractColors } from '../../utils/colorExtract';
import { DIMENSIONS } from '../../data/framework';

// ===== 分析过程动画 =====
function AnalysisAnimation({ done, progressMsg }) {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: '📖', text: '看完你写的话啦…', detail: '让我找找你最棒的想法' },
    { icon: '🔍', text: '帮你找出最棒的那句话', detail: '这句话一定很精彩' },
    { icon: '💭', text: '想想你发现了什么', detail: '你的想法我都记住了' },
    { icon: '🤔', text: '给你想一个有趣的问题', detail: '这个问题你肯定喜欢' },
    { icon: '🎨', text: '把你的话做成漂亮的卡片', detail: '马上就好啦' },
    { icon: '✨', text: '完成啦！', detail: '来看看你的发现卡吧' },
  ];

  useEffect(() => {
    if (done) { setStep(steps.length); return; }
    if (step < steps.length) {
      const delays = [700, 800, 700, 800, 600, 500];
      const t = setTimeout(() => setStep(s => s + 1), delays[step] || 700);
      return () => clearTimeout(t);
    }
  }, [step, done]);

  const currentStep = step < steps.length ? steps[step] : steps[steps.length - 1];
  const displayText = step < steps.length ? currentStep.text : '✅ 分析完成！';
  const displayIcon = step < steps.length ? currentStep.icon : '✅';

  return (
    <div style={{ padding: '36px 20px 24px', textAlign: 'center' }}>
      <div style={{
        fontSize: 40, marginBottom: 14,
        animation: step < steps.length ? 'pulse 0.8s ease-in-out infinite' : 'none',
      }}>
        {displayIcon}
      </div>

      <div style={{
        fontSize: 16, color: 'var(--ink)', fontWeight: 700, lineHeight: 1.6, marginBottom: 4,
      }}>
        {displayText}
      </div>

      {step < steps.length && (
        <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 14, fontStyle: 'italic' }}>
          {currentStep.detail}
        </div>
      )}

      {/* AI 进度消息 */}
      {progressMsg && step < steps.length && (
        <div style={{
          fontSize: 11, color: '#C8815C', fontWeight: 600, marginBottom: 14,
          background: 'rgba(200,129,92,0.06)', padding: '6px 14px', borderRadius: 8,
          display: 'inline-block',
        }}>
          {progressMsg}
        </div>
      )}

      {/* 进度条 */}
      <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: '#F0EBE4', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: 'linear-gradient(90deg, #C8815C, #D4956E)',
          width: step >= steps.length ? '100%' : `${(step / steps.length) * 100}%`,
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* 步骤标签 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
        {steps.map((s, i) => (
          <span key={i} style={{
            fontSize: 9, padding: '2px 7px', borderRadius: 4,
            background: i <= step ? '#C8815C18' : '#F5F3F0',
            color: i <= step ? '#C8815C' : '#C4BBAE',
            fontWeight: 600, transition: 'all 0.3s',
          }}>
            {s.icon} {s.text.slice(0, 5)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ===== 卡片预览（带下载） =====
// ===== 卡片预览（带下载） =====
function CardPreview({ result, book, colors }) {
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [coverUrl, setCoverUrl] = useState(null);
  const dim = book?._dim || { icon: '📖', color: '#5a9e72', colorDark: '#3d7a4f' };
  
  useEffect(() => {
    if (book?.imageId) {
      let active = true;
      import('../../utils/imageDB').then(({ getImage }) => {
        getImage(book.imageId).then(data => { if (data && active) setCoverUrl(data); });
      }).catch(() => {});
      return () => { active = false; };
    }
  }, [book?.imageId]);
  if (!result) return <div style={{color:'white',padding:20}}>加载中...</div>;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = '发现卡-' + (book?.title || '卡片') + '.png';
      link.href = dataUrl;
      link.click();
    } catch (_) { alert('下载失败'); }
    setDownloading(false);
  };

  return (
    <div ref={cardRef} style={{ background: '#1a1a1a', borderRadius: 16, padding: '24px 22px', color: 'white', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
          {coverUrl ? (
            <img src={coverUrl} alt="" style={{width: 50, height: 70, borderRadius: 3, objectFit: 'cover', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)'}} />
          ) : (
            <div style={{width: 50, height: 70, borderRadius: 4, background: 'linear-gradient(135deg, ' + dim.color + ', ' + dim.colorDark + ')', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22}}>{dim.icon}</div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{book?.title || '我的发现'}</div>
      {book?.author && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>{book.author} 著</div>}
          </div>
        </div>
      <div style={{ fontSize: 11, letterSpacing: 2, color: colors?.accent || '#5a9e72', fontWeight: 700, marginBottom: 6 }}>🔍 这 次 发 现</div>
      <div style={{ fontSize: 13, lineHeight: 1.85, marginBottom: 16, color: 'rgba(255,255,255,0.75)' }}>{result.discovery || ''}</div>
      <div style={{ fontSize: 11, letterSpacing: 2, color: colors?.accent || '#5a9e72', fontWeight: 700, marginBottom: 6 }}>💡 值 得 继 续 想 的 问 题</div>
      <div style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 16, color: 'rgba(255,255,255,0.45)' }}>{result.question || ''}</div>
      <div style={{ fontSize: 11, letterSpacing: 2, color: colors?.accent || '#5a9e72', fontWeight: 700, marginBottom: 6 }}>⭐ 我 的 感 受</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.15)'}}>
            <img src='/avatar.jpg' alt="" style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', flex: 1, lineHeight: 1.4 }}>「{result.quote || ''}」</div>
        </div>
      <button className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: 14, background: colors?.accent || '#5a9e72' }}
        onClick={handleDownload} disabled={downloading}>{downloading ? '⏳' : '📥 下载卡片'}</button>
    </div>
  );
}

// ===== 语音识别（支持持续录制，最长5分钟） =====
function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const transcriptRef = useRef('');

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('当前浏览器不支持语音输入，请用 Safari 或 Chrome'); return; }
    const r = new SR();
    r.lang = 'zh-CN';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let final = '';
      for (let i = 0; i < e.results.length; i++) final += e.results[i][0].transcript;
      transcriptRef.current = final;
      setTranscript(final);
    };
    r.onerror = () => { setIsListening(false); clearInterval(timerRef.current); };
    r.onend = () => { setIsListening(false); clearInterval(timerRef.current); };
    recognitionRef.current = r;
    r.start();
    setIsListening(true);
    startTimeRef.current = Date.now();
    setElapsed(0);
    transcriptRef.current = '';
    timerRef.current = setInterval(() => {
      const sec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(sec);
      if (sec >= 300) {
        if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch(_) {} recognitionRef.current = null; }
        clearInterval(timerRef.current);
        setIsListening(false);
      }
    }, 1000);
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch(_) {} recognitionRef.current = null; }
    clearInterval(timerRef.current);
    setIsListening(false);
  }, []);

  return { isListening, transcript, setTranscript, elapsed, start, stop };
}

// ===== 发现画廊（卡片叠放，点击翻看） =====
function DiscoveryGallery({ books }) {

  const allEntries = useMemo(() => {
    const entries = [];
    books.forEach(book => {
      if (book.discoveries) {
        book.discoveries.forEach(d => entries.push({ ...d, bookTitle: book.title, bookId: book.id }));
      }
    });
    return entries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [books]);

  if (allEntries.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '30px 20px' }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>💭</div>
        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>还没有发现记录</div>
        <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4, marginBottom: 12 }}>
          去「写新发现」记录孩子的第一句话吧
        </div>
      </div>
    );
  }

    return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 8, textAlign: 'center' }}>
        共 {allEntries.length} 条发现
      </div>

      {/* 平铺列表 */}
      <div style={{ marginBottom: 8 }}>
        {allEntries.slice(0, 20).map((entry, i) => (
          <div key={entry.id} style={{
            background: '#1a1a1a', borderRadius: 12, padding: '14px 16px',
            marginBottom: 8, color: 'white',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: '#5a9e72', fontWeight: 600 }}>
                📖 {entry.bookTitle}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>
                {entry.date}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 6 }}>
              {entry.discovery}
            </div>
            {entry.question && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid rgba(255,255,255,0.08)' }}>
                💡 {entry.question}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              {entry.quote ? (
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', flex: 1 }}>
                  「{entry.quote}」
                </div>
              ) : <div />}
              <button onClick={async () => {
                try {
                  const htmlContent = '<div style="background:#1a1a1a;color:white;padding:16px;border-radius:12px;font-family:sans-serif;width:340px">' +
                    '<div style="color:#5a9e72;font-size:11px;margin-bottom:6px">📖 ' + String(entry.bookTitle||'').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>' +
                    '<div style="font-size:12px;line-height:1.7;margin-bottom:6px">' + String(entry.discovery||'').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>') + '</div>' +
                    (entry.question ? '<div style="font-size:11px;padding-left:8px;border-left:2px solid rgba(255,255,255,0.1);margin-bottom:4px">💡 ' + String(entry.question).replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>' : '') +
                    (entry.quote ? '<div style="font-size:11px;font-weight:600;margin-top:4px">「' + String(entry.quote).replace(/</g,'&lt;').replace(/>/g,'&gt;') + '」</div>' : '') +
                    '</div>';
                  const { toPng } = await import('html-to-image');
                  const temp = document.createElement('div');
                  temp.innerHTML = htmlContent;
                  document.body.appendChild(temp);
                  await new Promise(r => setTimeout(r, 100));
                  const dataUrl = await toPng(temp, { quality: 0.95, pixelRatio: 2 });
                  temp.remove();
                  const link = document.createElement('a');
                  link.download = '说说-' + (entry.bookTitle || '卡片') + '.png';
                  link.href = dataUrl;
                  link.click();
                } catch(_) { alert('下载失败'); }
              }} style={{
                flexShrink: 0, border: 'none', background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.3)', fontSize: 10, padding: '3px 8px',
                borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font)',
                marginLeft: 6, whiteSpace: 'nowrap',
              }}>📥 下载</button>
            </div>
          </div>
        ))}
      </div>


    </div>
  );
}

// ===== 主组件 =====// ===== 主组件 =====
export default function Discovery() {
  const { books, updateBook } = useReading();
  const [page, setPage] = useState('select');
  
  const [selectedBook, setSelectedBook] = useState(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeDone, setAnalyzeDone] = useState(false);
  const [cardColors, setCardColors] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const { isListening, transcript, setTranscript, elapsed, start, stop } = useSpeechRecognition();

  const prevTranscriptRef = useRef('');
  useEffect(() => {
    if (transcript && transcript !== prevTranscriptRef.current) {
      prevTranscriptRef.current = transcript;
      setText(prev => prev + (prev ? '\n' : '') + transcript);
    }
  }, [transcript]);

  const availBooks = useMemo(() => {
    let list = books.filter(b => b.title.trim());
    if (bookSearch.trim()) {
      const q = bookSearch.trim().toLowerCase();
      list = list.filter(b => b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q));
    }
    return list;
  }, [books, bookSearch]);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setAnalyzing(true);
    setAnalyzeDone(false);
    setResult(null);

    // AI 分析
    let formatted = null;
    try {
      formatted = await aiAnalyze(text, selectedBook?.title || '这本书', selectedBook?.author || '');
    } catch (e) {
      console.warn('[Discovery] AI 分析失败，使用简单处理', e);
      formatted = { discovery: text.slice(0, 80) + '…', question: '你觉得这本书里最有趣的是哪里？', quote: text.slice(0, 40), original: text };
    }
    
    const startTime = Date.now();
    
    // 确保有结果
    if (!formatted || (!formatted.discovery && !formatted.question)) {
      formatted = { 
        discovery: text.slice(0, 80) + '…',
        question: '读完这本书，你最喜欢哪个部分？',
        quote: text.slice(0, 40),
        original: text 
      };
    }
    
    console.log('[Discovery] 分析完成:', formatted);
    setResult(formatted);
    setShowPreview(true);
    setAnalyzeDone(true);
    setAnalyzing(false);
  };

  const handleSave = () => {
    if (!result || !selectedBook) return;
    const entry = {
      id: Date.now().toString(),
      ...result,
      date: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
    };
    const existing = selectedBook.discoveries || [];
    updateBook(selectedBook.id, { discoveries: [...existing, entry] });
    setPage('select');
    setPage('select');
  };

  const handleReset = () => {
    setPage('select');
    setSelectedBook(null);
    setText('');
    setResult(null);
    setAnalyzing(false);
    setAnalyzeDone(false);
    setTranscript('');
  };

  return (
    <div>
      <h2 className="section-title">💭 读书说说</h2>

            {/* ===== 首页 ===== */}
      {page === 'select' && (
        <div>
          {/* 模块一：有感而发 */}
          <button className="btn-primary" style={{
            width: '100%', padding: '14px', fontSize: 15, marginBottom: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
            onClick={() => setShowBookPicker(true)}>
            ✨ 有感就发
          </button>

          {/* 选书面板 */}
          {showBookPicker && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>选一本书</span>
                <span onClick={() => { setShowBookPicker(false); setBookSearch(""); }} style={{ cursor: 'pointer', color: 'var(--accent)' }}>关闭 ✕</span>
              </div>
              <input type="search" value={bookSearch} onChange={e => setBookSearch(e.target.value)}
                placeholder="🔍 搜索书名或作者..." style={{
                  width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
                  borderRadius: 8, fontSize: 12, fontFamily: 'var(--font)',
                  color: 'var(--ink)', background: 'var(--card)', outline: 'none',
                  marginBottom: 8, boxSizing: 'border-box',
                }} />
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {availBooks.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--ink3)', textAlign: 'center', padding: 10 }}>没有找到匹配的书</div>
                ) : availBooks.map(book => {
                  const dim = DIMENSIONS.find(d => d.key === book.dimension);
                  return (
                    <div key={book.id} className="book-card"
                      style={{ cursor: 'pointer', borderLeft: '4px solid ' + (dim?.color || '#C4BBAE'), marginBottom: 6 }}
                      onClick={async () => { const colors = await extractColors(book.imageId); setCardColors(colors); setSelectedBook({ ...book, _dim: dim }); setPage('record'); }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="book-title" style={{ fontSize: 14 }}>{book.title}</div>
                        <div className="book-meta">
                          {dim && <span className="book-tag dim" style={{ background: dim.color + '18', color: dim.colorDark, border: '1px solid ' + dim.color + '33' }}>{dim.icon} {dim.label}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: 18, color: 'var(--ink3)', display: 'flex', alignItems: 'center' }}>→</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 模块二：叠放卡片 */}
          <DiscoveryGallery books={books} />
        </div>
      )}{/* ===== 记录页 ===== */}
      {page === 'record' && selectedBook && !analyzing && !result && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <button className="btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }} onClick={handleReset}>← 返回</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedBook._dim?.icon} {selectedBook.title}</div>
              {selectedBook.author && <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{selectedBook.author}</div>}
            </div>
          </div>

          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder={`读完《${selectedBook.title}》，孩子说了什么？\n\n把 ta 的原话记下来就好——\n发现了什么、喜欢哪里、想到了什么…`}
            style={{
              width: '100%', padding: '14px', border: '1px solid var(--border)',
              borderRadius: 12, fontSize: 15, fontFamily: 'var(--font)',
              color: 'var(--ink)', background: '#FFFCF9', outline: 'none',
              minHeight: 160, resize: 'vertical', lineHeight: 1.8,
            }}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
            <button onClick={() => isListening ? stop() : start()}
              style={{
                background: isListening ? '#C47A6E' : 'var(--card)',
                border: '1px solid var(--border)', borderRadius: 10,
                padding: '10px 16px', cursor: 'pointer',
                color: isListening ? 'white' : 'var(--ink2)',
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--font)', fontSize: 13,
              }}>
              🎤 {isListening ? '正在听...' : '语音输入'}
            </button>
            {isListening && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#C47A6E', fontWeight: 600 }}>
                  🎙️ {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
                </span>
                <button onClick={stop} style={{
                  background: 'var(--accent)', border: 'none', borderRadius: 6,
                  padding: '6px 14px', fontSize: 11, color: 'white', cursor: 'pointer',
                  fontWeight: 600, fontFamily: 'var(--font)',
                }}>
                  ✅ 完成
                </button>
              </div>
            )}
            <div style={{ flex: 1 }} />
            <button className="btn-cancel" style={{ padding: '10px 16px', fontSize: 12 }} onClick={handleReset}>取消</button>
            <button className="btn-submit" style={{ padding: '10px 24px', fontSize: 13 }}
              disabled={!text.trim()} onClick={handleGenerate}>
              ✨ 生成发现卡
            </button>
          </div>
        </div>
      )}

      {/* ===== 分析动画 ===== */}
      {analyzing && (
        <div className="card" style={{ padding: 0, marginBottom: 12, animation: 'fadeIn 0.3s ease' }}>
          <AnalysisAnimation done={analyzeDone} progressMsg={''} />
        </div>
      )}

      {/* ===== 卡片预览 ===== */}
{showPreview && result && selectedBook && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <button className="btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}
              onClick={() => { setShowPreview(false); setPage('record'); setResult(null); }}>← 修改</button>
            <button className="btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }} onClick={handleReset}>📝 新建</button>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--ink3)' }}>{selectedBook.title}</span>
          </div>

          <CardPreview result={result} book={selectedBook} colors={cardColors} />

          <details style={{ marginTop: 10 }}>
            <summary style={{ fontSize: 11, color: '#9B9082', cursor: 'pointer' }}>查看孩子原话</summary>
            <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.6, padding: 10, background: '#FDFAF6', borderRadius: 8, marginTop: 6, fontStyle: 'italic' }}>{result.original}</div>
          </details>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn-cancel" style={{ flex: 1, padding: '12px', fontSize: 13 }}
              onClick={handleReset}>✏️ 继续记录</button>
            <button className="btn-submit" style={{ flex: 1, padding: '12px', fontSize: 13 }}
              onClick={handleSave}>💾 保存到发现记录</button>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#C4BBAE' }}>每一句话都值得被记住 ✨</div>
    </div>
  );
}
