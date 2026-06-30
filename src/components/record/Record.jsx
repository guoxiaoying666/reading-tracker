import { useState, lazy, Suspense, useRef, useEffect, useCallback } from 'react';
import { useReading } from '../../context/ReadingContext';
import { WHAT_DIMENSIONS, LANGUAGES, FICTION_OPTIONS, getAllLevel2Options, getLevel3Options } from '../../data/framework';
import { lookupBook } from '../../utils/bookLookup';
import { saveImage } from '../../utils/imageDB';
import { classifyBook } from '../../utils/classify';
import ImageUpload from '../common/ImageUpload';
import StarPicker from '../common/StarPicker';
const BarcodeScanner = lazy(() => import('../common/BarcodeScanner'));

const EMPTY = {
  title: '', author: '', translator: '', month: '', source: '自购',
  language: '中文', fiction: '虚构',
  dimension: 'narrative', level2: 'novel', level3: '',
  childStar: 0, feedbackEmoji: '', note: '', imageId: null, isbn: '',
};

const isPoetry = (l2) => l2 === 'poetry';

const DIM_LABEL_MAP = {};
WHAT_DIMENSIONS.forEach(d => { DIM_LABEL_MAP[d.key] = d.icon + ' ' + d.label; });

function HowPrimaryLabel({ howKey }) {
  if (!howKey) return null;
  const M = { empathy: '人际共情', logic: '逻辑探究', expression: '创造表达', self_awareness: '自我认知' };
  const C = { empathy: '#E88D67', logic: '#5A9E6F', expression: '#B565A7', self_awareness: '#4A90B8' };
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 3 }}>
      <span key={howKey} style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 3, background: `${C[howKey]}18`, color: C[howKey], fontWeight: 600 }}>
        🎯 {M[howKey] || howKey}
      </span>
    </div>
  );
}

async function fetchCoverToDB(coverUrl) {
  try {
    const resp = await fetch(coverUrl);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await saveImage(new File([blob], 'cover.jpg', { type: blob.type || 'image/jpeg' }));
  } catch (_) { return null; }
}

export default function Record() {
  const { addBook, setActiveTab, books } = useReading();
  const [form, setForm] = useState({
    ...EMPTY, month: new Date().toISOString().slice(0, 7),
  });
  const [errors, setErrors] = useState({});
  const [scanOpen, setScanOpen] = useState(false);
  const [isbnInput, setIsbnInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMsg, setLookupMsg] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [confirmBook, setConfirmBook] = useState(null);
  const [monthStatus, setMonthStatus] = useState('');
  const [classifying, setClassifying] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const classifyTimer = useRef(null);
  const isbnRef = useRef('');
  const lookingUpRef = useRef(false);
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  // ---- AI 自动分类（书名输入后延迟触发）----
  const triggerClassify = useCallback(async (title, author) => {
    if (!title || title.length < 2) { setAiSuggestion(null); return; }
    setClassifying(true);
    const result = await classifyBook(title, author);
    if (result.error || !result.dimension || !result.level2) {
      setClassifying(false);
      return;
    }
    // 只有用户还没手动修改过分类时才自动填充
    setForm(prev => {
      // 如果用户已经改过 dimension 或 level2（非初始值），不覆盖
      const isDefaultDim = prev.dimension === 'narrative' && prev.level2 === 'novel';
      if (!isDefaultDim && prev.title === form.title) {
        setClassifying(false);
        return prev;
      }
      const next = { ...prev, dimension: result.dimension, level2: result.level2, level3: '' };
      setAiSuggestion({ dimension: result.dimension, level2: result.level2, labels: result.labels });
      setClassifying(false);
      return next;
    });
  }, []);

  // 监听书名变化 → 防抖触发分类
  useEffect(() => {
    if (classifyTimer.current) clearTimeout(classifyTimer.current);
    const title = form.title?.trim();
    if (title && title.length >= 2) {
      classifyTimer.current = setTimeout(() => {
        triggerClassify(title, form.author);
      }, 800);
    } else {
      setAiSuggestion(null);
    }
    return () => { if (classifyTimer.current) clearTimeout(classifyTimer.current); };
  }, [form.title, form.author, triggerClassify]);

  const level2Options = getAllLevel2Options(form.dimension);
  const level3Options = isPoetry(form.level2) ? [] : getLevel3Options(form.dimension, form.level2);
  const dim = WHAT_DIMENSIONS.find(d => d.key === form.dimension);

  const setFormField = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'dimension') {
        const l2 = getAllLevel2Options(value);
        next.level2 = l2[0]?.key || '';
        next.level3 = '';
      }
      if (field === 'level2') next.level3 = '';
      return next;
    });
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
  };

  const resetForm = () => {
    setForm({ ...EMPTY, month: new Date().toISOString().slice(0, 7) });
    setMonthStatus('');
    setSuggestion(null);
    setConfirmBook(null);
    setIsbnInput('');
    setErrors({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = '请输入书名';
    if (!form.month) errs.month = '请选择月份';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const bookTitle = form.title.trim();

    addBook({
      ...form, title: bookTitle, author: form.author.trim(),
      childStar: Number(form.childStar), confidence: 'high', needsReview: false,
      feedbackEmoji: form.feedbackEmoji || '',
      discoveries: form.note.trim() ? [{
        id: Date.now().toString(),
        discovery: form.note.trim(),
        question: '',
        quote: '',
        date: new Date().toISOString().slice(0, 10),
        createdAt: Date.now(),
      }] : [],
    });

    // Toast 提示 + 直接跳转到书架
    window.dispatchEvent(new CustomEvent('book-added', { detail: { title: bookTitle } }));
    setActiveTab('bookshelf');
  };

  // ---- ISBN 查询（确认后填表）----
  const doLookup = async (isbn) => {
    if (lookingUpRef.current) return;
    lookingUpRef.current = true;
    setLookingUp(true);
    setLookupMsg('正在查询…');

    const result = await lookupBook(isbn);

    if (result.error === 'not_found') {
      setLookupMsg('未查到该书，请手动填写');
      lookingUpRef.current = false;
      setTimeout(() => setLookingUp(false), 2000);
      return;
    }
    if (result.error) {
      setLookupMsg('查询失败: ' + result.error);
      lookingUpRef.current = false;
      setTimeout(() => setLookingUp(false), 2000);
      return;
    }

    lookingUpRef.current = false;
    setLookingUp(false);

    // 查到了 → 弹出确认框，让用户决定
    // 空值保护：确保必填字段有默认值，防止下游访问 crash
    setConfirmBook({
      title: result?.title || '',
      author: result?.author || '',
      publisher: result?.publisher || '',
      coverUrl: result?.coverUrl || null,
      isbn: result?.isbn || result?.data?.isbn || '未知ISBN',
    });
  };

  /** 用户确认录入 → 填充表单 */
  const handleConfirmBook = async () => {
    const book = confirmBook;
    if (!book) return;
    let imageId = null;
    if (book.coverUrl) {
      try { imageId = await fetchCoverToDB(book.coverUrl); } catch (_) {}
    }
    const newMonth = new Date().toISOString().slice(0, 7);
    setForm(prev => ({
      ...prev,
      title: book.title || '',
      isbn: book.isbn || '',
      author: book.author || '',
      source: prev.source || '广图',
      month: prev.month || newMonth,
      imageId: imageId || prev.imageId,
    }));
    setSuggestion({ dimension: null, level2: null, level2Label: null, confidence: 'high' });
    setConfirmBook(null);
  };

  /** 用户拒绝 → 清空回到手动 */
  const handleRejectBook = () => {
    setConfirmBook(null);
  };

  const handleScan = (isbn) => { setScanOpen(false); doLookup(isbn); };

  const handleManualIsbn = () => {
    // 优先使用 state（手机上更可靠），ref 作为 fallback
    const clean = (isbnInput || isbnRef.current || '').replace(/[^0-9X]/gi, '');
    if (clean.length < 8) { setErrors(p => ({ ...p, title: 'ISBN 格式不正确' })); return; }
    doLookup(clean);
  };

  const isAutoFilled = suggestion !== null;

  return (
    <div>
      <h2 className="section-title">✍️ 新书录入</h2>

      {lookingUp && (
        <div className="lookup-overlay">
          <div className="lookup-card">
            <div className="lookup-spinner" />
            <div className="lookup-text">{lookupMsg}</div>
          </div>
        </div>
      )}

      {/* ---- ISBN 确认弹窗 ---- */}
      {confirmBook && confirmBook.title !== undefined && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setConfirmBook(null); }}>
          <div className="modal-content" style={{ maxWidth: 380, margin: '0 auto', borderRadius: 18, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 14, fontFamily: 'var(--font-title)' }}>
              📖 找到该书，请核对信息是否正确
            </div>

            <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
              {/* 封面 */}
              {(confirmBook?.coverUrl) ? (
                <img src={confirmBook.coverUrl} alt=""
                  style={{ width: 60, height: 84, borderRadius: 6, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} />
              ) : (
                <div style={{ width: 60, height: 84, borderRadius: 6, flexShrink: 0, background: '#2C2A28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#555', border: '1px solid rgba(200,190,175,0.08)' }}>📖</div>
              )}
              {/* 文字信息 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{confirmBook?.title || '未知名'}</div>
                {(confirmBook?.author) && <div style={{ fontSize: 12, color: 'var(--ink2)', marginTop: 2 }}>作者: {confirmBook.author}</div>}
                {(confirmBook?.publisher) && <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>出版社: {confirmBook.publisher}</div>}
                <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 4 }}>ISBN: {confirmBook?.isbn || '未知ISBN'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleRejectBook} style={{
                flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'white', fontSize: 13, color: 'var(--ink3)', cursor: 'pointer',
                fontFamily: 'var(--font)', fontWeight: 500,
              }}>
                ❌ 信息有误，我手动填
              </button>
              <button onClick={handleConfirmBook} style={{
                flex: 2, padding: '12px', borderRadius: 10, border: 'none',
                background: '#C8815C', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font)',
              }}>
                ✅ 确认，录入这本书
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ padding: 18 }}>

        {/* ISBN 查询入口 */}
        <div style={{
          marginBottom: 16, padding: '14px', borderRadius: 10,
          background: '#F5F3F0', border: '1px solid #E8E2D8',
        }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button type="button" className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: 14 }}
              onClick={() => setScanOpen(true)}>
              📷 扫条形码获取 ISBN
            </button>
          </div>
          <div>
            <input id="isbn-input" inputMode="numeric" type="text" value={isbnInput}
              onChange={e => { const v = e.target.value.replace(/[^0-9X]/gi, ''); setIsbnInput(v); isbnRef.current = v; }}
              placeholder="输入 13 位 ISBN 号" style={{ width: '100%', fontSize: 16, padding: '10px 12px', border: '1px solid #D6CFC4', borderRadius: 8, outline: 'none', marginBottom: 6, boxSizing: 'border-box' }}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleManualIsbn())} />
            <button type="button" className="btn-primary" style={{ width: '100%', padding: '10px', fontSize: 14 }}
              onClick={handleManualIsbn}>
              🔍 查询
            </button>
          </div>
        </div>

        {/* 识别结果摘要 */}
        {isAutoFilled && (
          <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 14, background: '#F5FAF5', border: '1px solid #D4E4D6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{DIM_LABEL_MAP[suggestion.dimension]?.split(' ')[0] || '📖'}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{form.title}</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)' }}>
                  {form.author && `${form.author} · `}
                  {suggestion.dimension && DIM_LABEL_MAP[suggestion.dimension]}
                  {suggestion.level2Label && ` · ${suggestion.level2Label}`}
                </div>
                <span className="suggestion-badge" style={{ marginTop: 2, display: 'inline-flex',
                  background: suggestion.confidence === 'high' ? '#E8F5E9' : suggestion.confidence === 'medium' ? '#FFF8E1' : '#FFEBEE',
                  color: suggestion.confidence === 'high' ? '#2E7D32' : suggestion.confidence === 'medium' ? '#F57F17' : '#C62828',
                  borderColor: suggestion.confidence === 'high' ? '#A5D6A7' : suggestion.confidence === 'medium' ? '#FFE082' : '#EF9A9A',
                }}>
                  🤖 {suggestion.confidence === 'high' ? '高置信度' : suggestion.confidence === 'medium' ? '中置信度' : '低置信度'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 书名 */}
        <div className="form-group">
          <label>书名 *</label>
          <input type="text" value={form.title} onChange={e => setFormField('title', e.target.value)}
            placeholder="书名" />
          {errors.title && <span className="error-msg">{errors.title}</span>}
        </div>

        {/* 作者 */}
        <div className="form-group">
          <label>作者</label>
          <input type="text" value={form.author} onChange={e => setFormField('author', e.target.value)} placeholder="作者" />
        </div>

        {/* 月份 + 来源 */}
        <div className="form-row">
          <div className="form-group">
            <label>状态 / 读完月份 *</label>
            <select value={monthStatus} onChange={e => setMonthStatus(e.target.value)} style={{ marginBottom: 6 }}>
              <option value="">— 选择状态 —</option>
              <option value="reading">📖 阅读中</option>
              <option value="pending">📌 待读</option>
              <option value="month">📅 选择月份</option>
            </select>
            {monthStatus === 'month' && (
              <input type="month" value={form.month || ''}
                onChange={e => { if (e.target.value) setFormField('month', e.target.value); }}
                style={{ width: '100%' }} />
            )}
            {monthStatus === 'reading' && <div style={{ fontSize: 11, color: 'var(--ink2)' }}>⏳ 正在阅读中</div>}
            {monthStatus === 'pending' && <div style={{ fontSize: 11, color: 'var(--ink2)' }}>📌 计划要读</div>}
            {monthStatus === 'month' && form.month && <div style={{ fontSize: 11, color: 'var(--ink2)' }}>✅ {form.month} 读完</div>}
            {errors.month && <span className="error-msg">{errors.month}</span>}
          </div>
          <div className="form-group">
            <label>来源</label>
            <select value={form.source} onChange={e => setFormField('source', e.target.value)}>
              <option value="赠送">🎁 赠送</option>
              <option value="自购">🛒 自购</option>
              <option value="借阅">📖 借阅</option>
              <option value="其他">📌 其他</option>
            </select>
          </div>
        </div>

        {/* ========== 更多信息（折叠，首次隐藏以缩短表单） ========== */}
        <div style={{ margin: '12px 0', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div onClick={() => setShowMore(!showMore)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
            <span style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 500 }}>
              📋 更多信息（分类、书封、评分……）
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink3)', transition: 'transform 0.2s', transform: showMore ? 'rotate(180deg)' : 'none' }}>
              {classifying ? '🤖' : '▾'}
            </span>
          </div>

          {showMore && (
            <div style={{ animation: 'fadeIn 0.2s ease', marginTop: 10 }}>
              {/* 译者 */}
              <div className="form-group">
                <label>译者 <span style={{fontSize:10,color:'var(--ink3)'}}>（选填）</span></label>
                <input type="text" value={form.translator} onChange={e => setFormField('translator', e.target.value)} placeholder="译者姓名" />
              </div>

              {/* ISBN（展示） */}
              <div className="form-group">
                <label>ISBN</label>
                <input type="text" value={form.isbn} onChange={e => setFormField('isbn', e.target.value.replace(/[^0-9X]/gi, ''))}
                  placeholder="扫码或查询后自动填充" style={{fontSize:16,color:'var(--ink3)'}} />
              </div>

              {/* 属性 */}
              <div className="form-row">
                <div className="form-group">
                  <label>语言</label>
                  <select value={form.language} onChange={e => setFormField('language', e.target.value)}>
                    {LANGUAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>形态</label>
                  <select value={form.fiction} onChange={e => setFormField('fiction', e.target.value)}>
                    {FICTION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* 分类 */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <label style={{ marginBottom: 0 }}>一级维度</label>
                  {classifying && <span style={{ fontSize: 10, color: 'var(--ink3)' }}>🤖 分类中…</span>}
                  {aiSuggestion && !classifying && (
                    <span className="suggestion-badge" style={{
                      background: '#E8F5E9', color: '#2E7D32', borderColor: '#A5D6A7',
                    }}>
                      🤖 {DIM_LABEL_MAP[aiSuggestion.dimension]}
                      {aiSuggestion.labels?.length > 0 && ` · ${aiSuggestion.labels.slice(0, 2).join('/')}`}
                    </span>
                  )}
                  {isAutoFilled && !aiSuggestion && <span className="suggestion-badge" style={{
                    background: suggestion.confidence === 'high' ? '#E8F5E9' : suggestion.confidence === 'medium' ? '#FFF8E1' : '#FFEBEE',
                    color: suggestion.confidence === 'high' ? '#2E7D32' : suggestion.confidence === 'medium' ? '#F57F17' : '#C62828',
                    borderColor: suggestion.confidence === 'high' ? '#A5D6A7' : suggestion.confidence === 'medium' ? '#FFE082' : '#EF9A9A',
                  }}>🤖 {DIM_LABEL_MAP[suggestion.dimension]}</span>}
                </div>
                <select value={form.dimension} onChange={e => { setAiSuggestion(null); setFormField('dimension', e.target.value); }}>
                  {WHAT_DIMENSIONS.map(d => (<option key={d.key} value={d.key}>{d.icon} {d.label}</option>))}
                </select>
                {dim && dim.howPrimary && <HowPrimaryLabel howKey={dim.howPrimary} />}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>二级分类</label>
                  <select value={form.level2} onChange={e => { setAiSuggestion(null); setFormField('level2', e.target.value); }}>
                    {level2Options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>三级节点</label>
                  <select value={form.level3} onChange={e => setFormField('level3', e.target.value)}>
                    <option value="">（选填）</option>
                    {level3Options.map((l3, i) => <option key={i} value={l3}>{l3}</option>)}
                  </select>
                </div>
              </div>

              {/* 书封 + 评分 */}
              <div className="form-row">
                <div className="form-group">
                  <label>📷 书封</label>
                  <ImageUpload imageId={form.imageId} onChange={(newId) => setFormField('imageId', newId)} size="large" />
                </div>
                <div className="form-group">
                  <label>😊 孩子读这本书觉得？ <span style={{fontSize:10,color:'var(--ink3)'}}>（选填）</span></label>
                  <div style={{display:'flex',gap:12,fontSize:28,justifyContent:'center',padding:'8px 0'}}>
                    {['😄','😊','🤔','😖'].map(e => (
                      <span key={e} onClick={() => setFormField('feedbackEmoji', form.feedbackEmoji === e ? '' : e)}
                        style={{
                          fontSize:32,cursor:'pointer',opacity: form.feedbackEmoji === e ? 1 : 0.3,
                          transition:'all 0.15s',transform: form.feedbackEmoji === e ? 'scale(1.2)' : 'scale(1)',
                          filter: form.feedbackEmoji === e ? 'none' : 'grayscale(0.5)',
                        }}>{e}</span>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>🧒 孩子喜爱度</label>
                  <StarPicker value={form.childStar} onChange={v => setFormField('childStar', v)} size="large" />
                </div>
              </div>

              <div className="form-group">
                <label>一句话感受</label>
                <textarea value={form.note} onChange={e => setFormField('note', e.target.value)} placeholder="读完后的感想、孩子的反应..." />
              </div>
            </div>
          )}
        </div>

        <div className="form-sticky-actions">
          <button type="button" className="btn-cancel" onClick={resetForm} style={{ flex: 1 }}>清空</button>
          <button type="submit" className="btn-submit" style={{ flex: 2, padding: '14px 24px', fontSize: 16 }}>
            ✅ 确认添加
          </button>
        </div>
      </form>

      {scanOpen && (
        <Suspense fallback={null}>
          <BarcodeScanner isOpen={scanOpen} onClose={() => setScanOpen(false)} onScan={handleScan} />
        </Suspense>
      )}
    </div>
  );
}
