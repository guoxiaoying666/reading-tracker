import { useState, lazy, Suspense, useRef, useEffect, useCallback } from 'react';
import { useReading } from '../../context/ReadingContext';
import { WHAT_DIMENSIONS, LANGUAGES, FICTION_OPTIONS, getAllLevel2Options, getLevel3Options } from '../../data/framework';
import { lookupBook } from '../../utils/bookLookup';
import { saveImage } from '../../utils/imageDB';
import { classifyBook } from '../../utils/classify';
import { isMonthValue } from '../../utils/bookStatus';
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

const HOW_LABEL_MAP = { empathy: '人际共情', logic: '逻辑探究', expression: '创造表达', self_awareness: '自我认知' };

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
  // 【已修复】原来这里默认预填"今天所在的月份"，导致"状态/读完月份"这个必填项
  // 哪怕用户完全没碰过"阅读中/待读/选择月份"选择器，也能悄悄提交成功——
  // 必填校验形同虚设。现在改成真正的空值，逼着用户必须显式选一个状态。
  const [form, setForm] = useState({ ...EMPTY });
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
  const [showClassify, setShowClassify] = useState(false);
  const [showFeelings, setShowFeelings] = useState(false);
  const classifyTimer = useRef(null);
  const isbnRef = useRef('');
  const lookingUpRef = useRef(false);
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  // 从首页「继续录入新书」跳转来，自动聚焦 ISBN 输入框
  useEffect(() => {
    if (localStorage.getItem('wonderead-focus-isbn') === 'true') {
      localStorage.removeItem('wonderead-focus-isbn');
      setTimeout(() => document.getElementById('isbn-input')?.focus(), 100);
    }
  }, []);

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
    setForm({ ...EMPTY });
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
    if (!form.month) errs.month = '请选择阅读状态';
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
    // 【已修复】原来这里会在 month 为空时偷偷填入"今天所在月份"，
    // 跟"阅读中/待读"状态选择器完全没有关联，一样会导致必填校验形同虚设。
    // 现在 ISBN 自动填充只处理书名/作者/封面，不碰 month。
    setForm(prev => ({
      ...prev,
      title: book.title || '',
      isbn: book.isbn || '',
      author: book.author || '',
      source: prev.source || '广图',
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

        {/* ISBN 查询入口 —— 【已优化】原来是"扫码按钮/输入框/查询按钮"三个满宽大块堆叠，
            第一屏几乎全被操作步骤占满。现在收成一行，跟常见的搜索框布局一致。 */}
        <div style={{
          marginBottom: 16, padding: '8px', borderRadius: 10,
          background: '#F5F3F0', border: '1px solid #E8E2D8',
          display: 'flex', gap: 6, alignItems: 'center',
        }}>
          <button type="button" onClick={() => setScanOpen(true)} title="扫条形码获取 ISBN"
            style={{
              flexShrink: 0, width: 40, height: 40, borderRadius: 8, border: 'none',
              background: '#C8815C', color: 'white', fontSize: 17, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            📷
          </button>
          <input id="isbn-input" inputMode="numeric" type="text" value={isbnInput}
            onChange={e => { const v = e.target.value.replace(/[^0-9X]/gi, ''); setIsbnInput(v); isbnRef.current = v; }}
            placeholder="输入或扫描 ISBN 号"
            style={{ flex: 1, minWidth: 0, fontSize: 15, padding: '10px 10px', border: '1px solid #D6CFC4', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleManualIsbn())} />
          <button type="button" onClick={handleManualIsbn} title="查询"
            style={{
              flexShrink: 0, width: 40, height: 40, borderRadius: 8, border: 'none',
              background: '#C8815C', color: 'white', fontSize: 17, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            🔍
          </button>
        </div>

        {/* 识别结果摘要 —— 【已简化】原来这里整张卡片重复展示了书名/作者，
            跟紧接着下方的"书名""作者"输入框内容完全一样。现在改成一行确认条，
            只提示"已自动填充"，具体内容看下方表单即可，不再重复一遍。 */}
        {isAutoFilled && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, marginBottom: 12, background: '#F5FAF5', border: '1px solid #D4E4D6', fontSize: 11, color: '#2E7D32' }}>
            <span>✅ 已根据 ISBN 自动填充书籍信息</span>
            <span className="suggestion-badge" style={{ marginLeft: 'auto',
              background: suggestion.confidence === 'high' ? '#E8F5E9' : suggestion.confidence === 'medium' ? '#FFF8E1' : '#FFEBEE',
              color: suggestion.confidence === 'high' ? '#2E7D32' : suggestion.confidence === 'medium' ? '#F57F17' : '#C62828',
              borderColor: suggestion.confidence === 'high' ? '#A5D6A7' : suggestion.confidence === 'medium' ? '#FFE082' : '#EF9A9A',
            }}>
              🤖 {suggestion.confidence === 'high' ? '高置信度' : suggestion.confidence === 'medium' ? '中置信度' : '低置信度'}
            </span>
          </div>
        )}

        {/* 书名（必填，加粗+星号+加深边框，与选填项形成对比） */}
        <div className="form-group">
          <label style={{ fontWeight: 700 }}>书名 <span style={{ color: '#C0392B' }}>*</span></label>
          <input type="text" value={form.title} onChange={e => setFormField('title', e.target.value)}
            placeholder="书名" style={{ borderWidth: 1.5, borderColor: errors.title ? '#C0392B' : '#C8815C' }} />
          {errors.title && <span className="error-msg">{errors.title}</span>}
        </div>

        {/* 作者（选填，标签调淡） */}
        <div className="form-group">
          <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>作者 <span style={{ fontSize: 10 }}>（选填）</span></label>
          <input type="text" value={form.author} onChange={e => setFormField('author', e.target.value)} placeholder="作者" />
        </div>

        {/* 月份 + 来源 */}
        <div className="form-row">
          <div className="form-group">
            <label style={{ fontWeight: 700 }}>状态 / 读完月份 <span style={{ color: '#C0392B' }}>*</span></label>
            {/* 【已修复】原来是"下拉框 + 紧挨着的月份原生输入框"的组合，
                在选完具体月份后，下拉框会卡住无法切回其他状态（原生 select 和
                month picker 挨在一起时的常见交互冲突）。改成三个独立按钮，
                每个按钮的点击互不影响，不会再有"选完月份切不回去"的问题。 */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {[
                { key: 'reading', label: '📖 阅读中' },
                { key: 'pending', label: '📌 待读' },
                { key: 'month', label: '📅 已读完' },
              ].map(opt => (
                <button key={opt.key} type="button"
                  onClick={() => {
                    setMonthStatus(opt.key);
                    // 【已修复】原来点击这里只切换了 monthStatus 这个纯展示状态，
                    // 从没真正写进 form.month（提交时用的数据），导致"阅读中/待读"
                    // 点了跟没点一样，最终存的还是别处遗留的日期值。
                    if (opt.key === 'reading' || opt.key === 'pending') setFormField('month', opt.key);
                    else if (!isMonthValue(form.month)) setFormField('month', '');
                  }}
                  style={{
                    flex: 1, padding: '10px 2px', borderRadius: 8, fontSize: 11.5, cursor: 'pointer',
                    border: monthStatus === opt.key ? '1.5px solid #C8815C' : '1px solid var(--border)',
                    background: monthStatus === opt.key ? '#FBF3EC' : 'white',
                    color: monthStatus === opt.key ? '#C8815C' : 'var(--ink2)',
                    fontWeight: monthStatus === opt.key ? 600 : 400,
                    fontFamily: 'var(--font)',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
            {monthStatus === 'month' && (
              <input type="month" value={isMonthValue(form.month) ? form.month : ''}
                onChange={e => { if (e.target.value) setFormField('month', e.target.value); }}
                style={{ width: '100%' }} />
            )}
            {monthStatus === 'reading' && <div style={{ fontSize: 11, color: 'var(--ink2)' }}>⏳ 正在阅读中</div>}
            {monthStatus === 'pending' && <div style={{ fontSize: 11, color: 'var(--ink2)' }}>📌 计划要读</div>}
            {monthStatus === 'month' && form.month && <div style={{ fontSize: 11, color: 'var(--ink2)' }}>✅ {form.month} 读完</div>}
            {errors.month && <span className="error-msg">{errors.month}</span>}
          </div>
          <div className="form-group">
            <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>来源 <span style={{ fontSize: 10 }}>（选填）</span></label>

            <select value={form.source} onChange={e => setFormField('source', e.target.value)}>
              <option value="赠送">🎁 赠送</option>
              <option value="自购">🛒 自购</option>
              <option value="借阅">📖 借阅</option>
              <option value="其他">📌 其他</option>
            </select>
          </div>
        </div>

        {/* ========== 分类信息（默认折叠） ========== */}
        <div style={{ margin: '12px 0', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div onClick={() => setShowClassify(!showClassify)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
            <span style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 500 }}>
              📖 分类信息（语言、形态、五维分类……）
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink3)', transition: 'transform 0.2s', transform: showClassify ? 'rotate(180deg)' : 'none' }}>
              {classifying ? '🤖' : '▾'}
            </span>
          </div>

          {showClassify && (
            <div style={{ animation: 'fadeIn 0.2s ease', marginTop: 10 }}>
              {/* 译者 */}
              <div className="form-group">
                <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>译者 <span style={{ fontSize: 10 }}>（选填）</span></label>
                <input type="text" value={form.translator} onChange={e => setFormField('translator', e.target.value)} placeholder="译者姓名" />
              </div>

              {/* ISBN —— 已通过上方查询自动填充时改为只读展示，避免"同一个号码填两遍"的观感 */}
              <div className="form-group">
                <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>ISBN <span style={{ fontSize: 10 }}>（选填）</span></label>
                <input type="text" value={form.isbn} onChange={e => setFormField('isbn', e.target.value.replace(/[^0-9X]/gi, ''))}
                  placeholder="上方查询后自动填充，也可手动输入"
                  disabled={!!form.isbn}
                  style={{ fontSize: 14, color: form.isbn ? 'var(--ink3)' : 'var(--ink)', background: form.isbn ? 'var(--card2)' : 'white' }} />
              </div>

              {/* 属性 */}
              <div className="form-row">
                <div className="form-group">
                  <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>语言</label>
                  <select value={form.language} onChange={e => setFormField('language', e.target.value)}>
                    {LANGUAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>形态</label>
                  <select value={form.fiction} onChange={e => setFormField('fiction', e.target.value)}>
                    {FICTION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* 一级维度 —— 【已优化】原来这里同时飘着绿色"🤖 AI建议"徽章 + 独立的粉色
                  "🎯 创造表达"标签，三层信息叠在一起看不出彼此关系。现在合并成一行说明文字，
                  一次性讲清楚"AI 是怎么判断的"和"这个分类对应什么能力"。 */}
              <div className="form-group">
                <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>一级维度</label>
                <select value={form.dimension} onChange={e => { setAiSuggestion(null); setFormField('dimension', e.target.value); }}>
                  {WHAT_DIMENSIONS.map(d => (<option key={d.key} value={d.key}>{d.icon} {d.label}</option>))}
                </select>
                {(classifying || aiSuggestion || (isAutoFilled && !aiSuggestion) || (dim && dim.howPrimary)) && (
                  <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 4, lineHeight: 1.6 }}>
                    {classifying && '🤖 AI 正在识别分类…'}
                    {!classifying && aiSuggestion && `🤖 AI 已根据书名识别${aiSuggestion.labels?.length > 0 ? ' · ' + aiSuggestion.labels.slice(0, 2).join('/') : ''}`}
                    {!classifying && !aiSuggestion && isAutoFilled && '🤖 已根据 ISBN 信息判断'}
                    {dim && dim.howPrimary && (
                      <span>{(aiSuggestion || (isAutoFilled && !aiSuggestion)) ? ' · ' : ''}对应能力：🎯 {HOW_LABEL_MAP[dim.howPrimary] || dim.howPrimary}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>二级分类</label>
                  <select value={form.level2} onChange={e => { setAiSuggestion(null); setFormField('level2', e.target.value); }}>
                    {level2Options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>三级节点</label>
                  <select value={form.level3} onChange={e => setFormField('level3', e.target.value)}>
                    <option value="">（选填）</option>
                    {level3Options.map((l3, i) => <option key={i} value={l3}>{l3}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========== 读完感受（默认折叠） ========== */}
        <div style={{ margin: '12px 0', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div onClick={() => setShowFeelings(!showFeelings)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
            <span style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 500 }}>
              💭 读完感受（书封、喜爱度、一句话感受……）
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink3)', transition: 'transform 0.2s', transform: showFeelings ? 'rotate(180deg)' : 'none' }}>▾</span>
          </div>

          {showFeelings && (
            <div style={{ animation: 'fadeIn 0.2s ease', marginTop: 10 }}>
              {/* 【已调整】原来"书封上传"和"孩子觉得/喜爱度"挤在同一个三列行里，
                  上传控件本身比另外两个高，导致底部对不齐、很难看。
                  现在书封单独占一整行，剩下两个高度接近的控件放在一起。 */}
              <div className="form-group">
                <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>📷 书封</label>
                <ImageUpload imageId={form.imageId} onChange={(newId) => setFormField('imageId', newId)} size="small" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>😊 孩子读这本书觉得？ <span style={{ fontSize: 10 }}>（选填）</span></label>
                  <div style={{ display: 'flex', gap: 12, fontSize: 28, justifyContent: 'center', padding: '8px 0' }}>
                    {['😄', '😊', '🤔', '😖'].map(e => (
                      <span key={e} onClick={() => setFormField('feedbackEmoji', form.feedbackEmoji === e ? '' : e)}
                        style={{
                          fontSize: 32, cursor: 'pointer', opacity: form.feedbackEmoji === e ? 1 : 0.3,
                          transition: 'all 0.15s', transform: form.feedbackEmoji === e ? 'scale(1.2)' : 'scale(1)',
                          filter: form.feedbackEmoji === e ? 'none' : 'grayscale(0.5)',
                        }}>{e}</span>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>🧒 孩子喜爱度</label>
                  <StarPicker value={form.childStar} onChange={v => setFormField('childStar', v)} size="large" />
                </div>
              </div>

              <div className="form-group">
                <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>一句话感受</label>
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
