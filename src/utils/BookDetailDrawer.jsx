// ============================================================
// BookDetailDrawer — 书籍详情页
// 【已重新设计】原来是半截弹窗，只重复展示已经在卡片上看到过的标题作者，
// 现在改为全屏详情页，根据传入的书是否"已入库"自动切换两种模式：
//   - 已入库（书架点击）：展示 + 可编辑全部属性，可保存/删除
//   - 未入库（首页/阅读洞察推荐点击）：展示推荐理由，可关闭
// 判断依据：book.id 存在 且 传入了 onSave 回调 → 已入库模式
// ============================================================
import { useState, useEffect } from 'react';
import { WHAT_DIMENSIONS, LANGUAGES, CLASSIC_OPTIONS, FICTION_OPTIONS, getAllLevel2Options, getLevel3Options } from '../../data/framework';
import { getImage } from '../../utils/imageDB';
import { isMonthValue, monthToStatusKey } from '../../utils/bookStatus';
import ImageUpload from './ImageUpload';
import StarPicker from './StarPicker';

export default function BookDetailDrawer({ book, onClose, onSave, onDelete, onAddToShelf }) {
  if (!book) return null;

  const isOwned = !!(book.id && onSave);

  if (isOwned) {
    return <OwnedBookDetail book={book} onClose={onClose} onSave={onSave} onDelete={onDelete} />;
  }
  return <RecommendedBookDetail book={book} onClose={onClose} onAddToShelf={onAddToShelf} />;
}

// ---- 未入库：推荐书详情（只读 + 可选"加入书架"） ----
function RecommendedBookDetail({ book, onClose, onAddToShelf }) {
  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: 40, overflowY: 'auto', zIndex: 1100 }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 400, margin: '0 auto', width: '100%' }}>
        <div className="modal-content" style={{ borderRadius: 18, padding: '24px 20px 32px' }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 72, height: 100, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(145deg, var(--accent), #3A3835)',
              border: '1px solid rgba(200,190,175,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}>
              📖
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 4, fontFamily: 'var(--font-title)' }}>
                {book.title}
              </div>
              {book.author && (
                <div style={{ fontSize: 12, color: 'var(--ink2)' }}>{book.author}</div>
              )}
            </div>
          </div>

          {(book.note || book.reason) && (
            <div style={{ background: 'var(--card2)', borderRadius: 10, padding: '14px 16px', marginBottom: 20, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>📌 推荐理由</div>
              <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.7 }}>{book.note || book.reason}</div>
            </div>
          )}
          {!book.note && !book.reason && (
            <div style={{ fontSize: 11, color: 'var(--ink3)', lineHeight: 1.6, marginBottom: 20, padding: '14px 0', textAlign: 'center' }}>
              来自拓展阅读的推荐好书
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="btn-cancel" style={{ flex: 1, padding: 14, fontSize: 14 }}>
              关闭
            </button>
            {onAddToShelf && (
              <button onClick={() => onAddToShelf(book)} className="btn-primary" style={{ flex: 2, padding: 14, fontSize: 14 }}>
                ➕ 加入书架
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- 已入库：完整详情 + 可编辑 ----
function OwnedBookDetail({ book, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    title: book.title, author: book.author || '', translator: book.translator || '',
    month: book.month || '', source: book.source || '自购',
    language: book.language || '中文', classic: book.classic || false, fiction: book.fiction || '虚构',
    dimension: book.dimension, level2: book.level2, level3: book.level3 || '',
    childStar: book.childStar || 0, note: book.note || '', imageId: book.imageId || null,
  });
  const [monthStatus, setMonthStatus] = useState(() => monthToStatusKey(book.month));
  const [coverUrl, setCoverUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (book.imageId) getImage(book.imageId).then(data => { if (!cancelled) setCoverUrl(data); });
    return () => { cancelled = true; };
  }, [book.imageId]);

  const l2Options = getAllLevel2Options(form.dimension);
  const l3Options = getLevel3Options(form.dimension, form.level2);

  const handleChange = (f, v) => {
    setForm(prev => {
      const n = { ...prev, [f]: v };
      if (f === 'dimension') { n.level2 = getAllLevel2Options(v)[0]?.key || ''; n.level3 = ''; }
      if (f === 'level2') n.level3 = '';
      return n;
    });
  };

  const handleDelete = () => {
    if (window.confirm(`确定删除《${book.title}》？`)) {
      onDelete();
      onClose();
    }
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: 40, overflowY: 'auto', zIndex: 1100 }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 400, margin: '0 auto', width: '100%' }}>
        <div className="modal-content" style={{ borderRadius: 18, padding: '20px 18px 28px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-title)' }}>📖 书籍详情</div>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: 'var(--ink3)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              ✕ 关闭
            </button>
          </div>

          {/* 封面 */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
            {coverUrl ? (
              <img src={coverUrl} alt="" style={{ width: 64, height: 90, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid var(--border)' }} />
            ) : (
              <div style={{ width: 64, height: 90, borderRadius: 8, flexShrink: 0, background: '#2C2A28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#555' }}>📖</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <ImageUpload imageId={form.imageId} onChange={(newId) => handleChange('imageId', newId)} size="small" />
            </div>
          </div>

          {/* 书名 */}
          <div className="form-group">
            <label style={{ fontWeight: 700 }}>书名 <span style={{ color: '#C0392B' }}>*</span></label>
            <input value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="书名" style={{ borderWidth: 1.5, borderColor: '#C8815C' }} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>作者</label>
              <input value={form.author} onChange={e => handleChange('author', e.target.value)} placeholder="作者" />
            </div>
            <div className="form-group">
              <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>译者</label>
              <input value={form.translator} onChange={e => handleChange('translator', e.target.value)} placeholder="译者（选填）" />
            </div>
          </div>

          {/* 语言/形态/经典 */}
          <div className="form-row">
            <div className="form-group">
              <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>语言</label>
              <select value={form.language} onChange={e => handleChange('language', e.target.value)}>
                {LANGUAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>形态</label>
              <select value={form.fiction} onChange={e => handleChange('fiction', e.target.value)}>
                {FICTION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>经典</label>
            <select value={form.classic ? '是' : '否'} onChange={e => handleChange('classic', e.target.value === '是')}>
              {CLASSIC_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* 分类 */}
          <div className="form-group">
            <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>一级维度</label>
            <select value={form.dimension} onChange={e => handleChange('dimension', e.target.value)}>
              {WHAT_DIMENSIONS.map(d => <option key={d.key} value={d.key}>{d.icon} {d.label}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>二级分类</label>
              <select value={form.level2} onChange={e => handleChange('level2', e.target.value)}>
                {l2Options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>三级节点</label>
              <select value={form.level3} onChange={e => handleChange('level3', e.target.value)}>
                <option value="">（选填）</option>
                {l3Options.map((l3, i) => <option key={i} value={l3}>{l3}</option>)}
              </select>
            </div>
          </div>

          {/* 状态 / 读完月份 —— 【已修复】原来这里只有一个裸的月份输入框，
              已经存了具体月份的书没法再切回"阅读中"或"待读"。现在跟录入页
              用同一套三态按钮，切换互不影响，并且真正把状态写进 form.month。 */}
          <div className="form-row">
            <div className="form-group" style={{ flex: '1 1 100%' }}>
              <label style={{ fontWeight: 700 }}>状态 / 读完月份 <span style={{ color: '#C0392B' }}>*</span></label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {[
                  { key: 'reading', label: '📖 阅读中' },
                  { key: 'pending', label: '📌 待读' },
                  { key: 'month', label: '📅 已读完' },
                ].map(opt => (
                  <button key={opt.key} type="button"
                    onClick={() => {
                      setMonthStatus(opt.key);
                      if (opt.key === 'reading' || opt.key === 'pending') handleChange('month', opt.key);
                      else if (!isMonthValue(form.month)) handleChange('month', '');
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
                  onChange={e => { if (e.target.value) handleChange('month', e.target.value); }}
                  style={{ width: '100%' }} />
              )}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>来源</label>
              <select value={form.source} onChange={e => handleChange('source', e.target.value)}>
                <option value="赠送">🎁 赠送</option>
                <option value="自购">🛒 自购</option>
                <option value="借阅">📖 借阅</option>
                <option value="其他">📌 其他</option>
              </select>
            </div>
          </div>

          {/* 喜爱度 */}
          <div className="form-group">
            <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>🧒 孩子喜爱度</label>
            <StarPicker value={form.childStar} onChange={v => handleChange('childStar', v)} />
          </div>

          {/* 一句话感受 */}
          <div className="form-group">
            <label style={{ color: 'var(--ink3)', fontWeight: 400 }}>一句话感受</label>
            <textarea value={form.note} onChange={e => handleChange('note', e.target.value)} placeholder="读完后的感想、孩子的反应..." />
          </div>

          {/* 操作 */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={handleDelete} style={{
              padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'white', color: '#C47A6E', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)',
            }}>
              🗑️ 删除
            </button>
            <button onClick={handleSave} className="btn-primary" style={{ flex: 1, padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>
              💾 保存修改
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
