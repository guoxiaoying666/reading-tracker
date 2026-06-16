import { useState, lazy, Suspense, useRef, useEffect } from 'react';
import { useReading } from '../../context/ReadingContext';
import { DIMENSIONS, LANGUAGES, CLASSIC_OPTIONS, FICTION_OPTIONS, getAllLevel2Options, getLevel3Options } from '../../data/framework';
import { lookupBook } from '../../utils/bookLookup';
import { saveImage } from '../../utils/imageDB';
import ImageUpload from '../common/ImageUpload';
import StarPicker from '../common/StarPicker';
const BarcodeScanner = lazy(() => import('../common/BarcodeScanner'));

const EMPTY = {
  title: '', author: '', translator: '', month: '', source: '广图',
  language: '外文', classic: false, fiction: '虚构',
  dimension: 'literature', level2: 'novel', level3: '',
  childStar: 0, note: '', imageId: null, isbn: '',
};

const isPoetry = (l2) => l2 === 'poetry';

const DIM_LABEL_MAP = {};
DIMENSIONS.forEach(d => { DIM_LABEL_MAP[d.key] = d.icon + ' ' + d.label; });

function C5Label({ c5Keys }) {
  const M = { culture: '文化理解', critical: '审辨思维', creativity: '创新', communication: '沟通', collaboration: '合作' };
  const C = { culture: '#8C7DA8', critical: '#C47A6E', creativity: '#E8B44F', communication: '#6B8CA0', collaboration: '#6F9177' };
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 3 }}>
      {c5Keys?.map(c => (
        <span key={c} style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 3, background: `${C[c]}18`, color: C[c], fontWeight: 600 }}>
          {M[c]}
        </span>
      ))}
    </div>
  );
}

async function fetchCoverToDB(coverUrl) {
  try {
    // 用 Image 加载绕过 CORS，转 canvas 后再保存
    const dataUrl = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve(c.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = reject;
      img.src = coverUrl;
    });
    const resp = await fetch(dataUrl);
    const blob = await resp.blob();
    return await saveImage(new File([blob], 'cover.jpg', { type: 'image/jpeg' }));
  } catch (_) { return null; }
}

export default function Record() {
  const { addBook, setActiveTab } = useReading();
  const [form, setForm] = useState({
    ...EMPTY, month: new Date().toISOString().slice(0, 7),
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [isbnInput, setIsbnInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMsg, setLookupMsg] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const isbnRef = useRef('');
  const lookingUpRef = useRef(false);
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  const level2Options = getAllLevel2Options(form.dimension);
  const level3Options = isPoetry(form.level2) ? [] : getLevel3Options(form.dimension, form.level2);
  const dim = DIMENSIONS.find(d => d.key === form.dimension);

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
    setSuggestion(null);
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

    addBook({
      ...form, title: form.title.trim(), author: form.author.trim(),
      childStar: Number(form.childStar), confidence: 'high', needsReview: false,
      discoveries: form.note.trim() ? [{
        id: Date.now().toString(),
        discovery: form.note.trim(),
        question: '',
        quote: '',
        date: new Date().toISOString().slice(0, 10),
        createdAt: Date.now(),
      }] : [],
    });
    setSubmitted(true);
  };

  // ---- ISBN 查询 ----
  const doLookup = async (isbn) => {
    if (lookingUpRef.current) return; // 防止并发查询
    lookingUpRef.current = true;
    setLookingUp(true);
    setLookupMsg('正在查询…');

    const result = await lookupBook(isbn);

    if (result.error) {
      setLookupMsg(result.error);
      lookingUpRef.current = false;
      setTimeout(() => setLookingUp(false), 2000);
      return;
    }

    const hasTitle = result.title && result.title.trim().length > 0;

    // 下载封面
    let imageId = null;
    if (result.coverUrl) {
      try { imageId = await fetchCoverToDB(result.coverUrl); } catch (_) {}
    }

    // 始终填充表单（查到什么填什么，查不到也填分类和语言）
    const newMonth = new Date().toISOString().slice(0, 7);
    setForm(prev => ({
      ...prev,
      title: result.title || '',
      isbn: result.isbn || '',
      author: result.author || '',
      language: result.language,
      fiction: result.fiction,
      classic: result.classic,
      dimension: result.dimension,
      level2: result.level2,
      level3: result.level3 || '',
      source: prev.source || '广图',
      month: prev.month || newMonth,
      imageId: imageId || prev.imageId,
    }));
    setSuggestion({
      dimension: result.dimension,
      level2: result.level2,
      level2Label: result.level2Label,
      confidence: result.confidence,
    });
    setLookupMsg(hasTitle ? '✅ ' + result.title : '未查到该书，请手动填写书名');
    lookingUpRef.current = false;
    setTimeout(() => setLookingUp(false), 800);
  };

  const handleScan = (isbn) => { setScanOpen(false); doLookup(isbn); };

  const handleManualIsbn = () => {
    const clean = isbnRef.current.replace(/[^0-9X]/gi, '');
    if (clean.length < 8) { setErrors(p => ({ ...p, title: 'ISBN 格式不正确' })); return; }
    doLookup(clean);
  };

  const isAutoFilled = suggestion !== null;

  return (
    <div>
      <h2 className="section-title">✍️ 新书录入</h2>

      {submitted && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { resetForm(); setSubmitted(false); } }}>
          <div className="modal-content" style={{ maxWidth: 340, textAlign: 'center', borderRadius: 16, padding: 28 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>已添加成功！</h3>
            <p style={{ fontSize: 13, color: 'var(--ink3)', margin: '0 0 18px' }}>
              《{form.title}》已加入到书架
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: 14 }}
                onClick={() => { resetForm(); setSubmitted(false); }}>
                📝 继续录入
              </button>
              <button className="btn-ghost" style={{ flex: 1, padding: '12px', fontSize: 14 }}
                onClick={() => { setActiveTab('bookshelf'); setSubmitted(false); }}>
                📚 去书架
              </button>
            </div>
          </div>
        </div>
      )}

      {lookingUp && (
        <div className="lookup-overlay">
          <div className="lookup-card">
            <div className="lookup-spinner" />
            <div className="lookup-text">{lookupMsg}</div>
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
            <input id="isbn-input" type="text" value={isbnInput}
              onChange={e => { const v = e.target.value.replace(/[^0-9X]/gi, ''); setIsbnInput(v); isbnRef.current = v; }}
              placeholder="或手动输入 13 位 ISBN 号" autoFocus style={{ width: '100%', fontSize: 16, padding: '10px 12px', border: '1px solid #D6CFC4', borderRadius: 8, outline: 'none', marginBottom: 6, boxSizing: 'border-box' }}
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

        {/* 译者 */}
        <div className="form-group">
          <label>译者 <span style={{fontSize:10,color:'var(--ink3)'}}>（选填）</span></label>
          <input type="text" value={form.translator} onChange={e => setFormField('translator', e.target.value)} placeholder="译者姓名" />
        </div>

        {/* ISBN */}
        <div className="form-group">
          <label>ISBN</label>
          <input type="text" value={form.isbn} onChange={e => setFormField('isbn', e.target.value.replace(/[^0-9X]/gi, ''))}
            placeholder="扫码或查询后自动填充" style={{fontSize:16,color:'var(--ink3)'}} />
        </div>

        {/* 月份 + 来源 */}
        <div className="form-row">
          <div className="form-group">
            <label>读完月份 *</label>
            <input type="month" value={form.month} onChange={e => setFormField('month', e.target.value)} />
            {errors.month && <span className="error-msg">{errors.month}</span>}
          </div>
          <div className="form-group">
            <label>来源</label>
            <input type="text" value={form.source} onChange={e => setFormField('source', e.target.value)} placeholder="广图 / 淘宝 / 自购..." />
          </div>
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
        <div className="form-group">
          <label>名著</label>
          <select value={form.classic ? '是' : '否'} onChange={e => setFormField('classic', e.target.value === '是')}>
            {CLASSIC_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* 分类 */}
        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <label style={{ marginBottom: 0 }}>一级维度</label>
            {isAutoFilled && <span className="suggestion-badge" style={{
              background: suggestion.confidence === 'high' ? '#E8F5E9' : suggestion.confidence === 'medium' ? '#FFF8E1' : '#FFEBEE',
              color: suggestion.confidence === 'high' ? '#2E7D32' : suggestion.confidence === 'medium' ? '#F57F17' : '#C62828',
              borderColor: suggestion.confidence === 'high' ? '#A5D6A7' : suggestion.confidence === 'medium' ? '#FFE082' : '#EF9A9A',
            }}>🤖 {DIM_LABEL_MAP[suggestion.dimension]}</span>}
          </div>
          <select value={form.dimension} onChange={e => setFormField('dimension', e.target.value)}>
            {DIMENSIONS.map(d => (<option key={d.key} value={d.key}>{d.icon} {d.label}</option>))}
          </select>
          {dim && <C5Label c5Keys={dim.c5} />}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>二级分类</label>
            <select value={form.level2} onChange={e => setFormField('level2', e.target.value)}>
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
            <label>🧒 孩子喜爱度</label>
            <StarPicker value={form.childStar} onChange={v => setFormField('childStar', v)} size="large" />
          </div>
        </div>

        <div className="form-group">
          <label>一句话感受</label>
          <textarea value={form.note} onChange={e => setFormField('note', e.target.value)} placeholder="读完后的感想、孩子的反应..." />
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
