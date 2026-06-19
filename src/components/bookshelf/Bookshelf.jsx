import { useState, useMemo, useEffect } from 'react';
import { useReading } from '../../context/ReadingContext';
import { useAuth } from '../../context/AuthContext';
import { getTotalBooks, getDimensionActualPct, getMonthlyTrend, getMonths, getAvgChildStar, getLevel2Distribution } from '../../utils/stats';
import { DIMENSIONS, LANGUAGES, CLASSIC_OPTIONS, FICTION_OPTIONS, getDimension, getAllLevel2Options, getLevel3Options } from '../../data/framework';
import { diagnoseCoverage, generateMonthlyReport, generateRecommendations } from '../../utils/diagnosis';
import { getImage } from '../../utils/imageDB';
import ImageUpload from '../common/ImageUpload';
import StarPicker, { StarDisplay } from '../common/StarPicker';
import EmptyState from '../common/EmptyState';

export default function Bookshelf() {
  const { books, updateBook, deleteBook, setActiveTab } = useReading();
  const [filterDim, setFilterDim] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [sortBy, setSortBy] = useState('month-desc');
  const [editingId, setEditingId] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [showAllBooks, setShowAllBooks] = useState(false);
  const [expandedStructDim, setExpandedStructDim] = useState(() => {
    const first = DIMENSIONS.find(d => books.some(b => b.dimension === d.key));
    return first?.key || null;
  });
  const [expandedBarDim, setExpandedBarDim] = useState('literature');
  const [searchQuery, setSearchQuery] = useState('');

  const months = useMemo(() => getMonths(books), [books]);
  const dimPcts = useMemo(() => getDimensionActualPct(books), [books]);
  const l2Dist = useMemo(() => getLevel2Distribution(books), [books]);
  const monthly = useMemo(() => getMonthlyTrend(books), [books]);
  const coverage = useMemo(() => diagnoseCoverage(books), [books]);
  const monthlyReport = useMemo(() => generateMonthlyReport(books), [books]);
  const recommendations = useMemo(() => generateRecommendations(books), [books]);

  // 近期月份（最近2个月）
  const recentMonths = useMemo(() => {
    const sorted = [...new Set(books.map(b => b.month))].sort().reverse();
    return sorted.slice(0, 2);
  }, [books]);

  // 近期书籍
  const recentBooks = useMemo(() => {
    return books.filter(b => recentMonths.includes(b.month));
  }, [books, recentMonths]);

  const filtered = useMemo(() => {
    let result = [...books];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(b => b.title.toLowerCase().includes(q) || (b.author && b.author.toLowerCase().includes(q)));
    }
    if (filterDim) result = result.filter(b => b.dimension === filterDim);
    if (filterMonth) result = result.filter(b => b.month === filterMonth);
    switch (sortBy) {
      case 'month-desc': result.sort((a, b) => b.month.localeCompare(b.month)); break;
      case 'month-asc': result.sort((a, b) => a.month.localeCompare(b.month)); break;
      case 'childStar-desc': result.sort((a, b) => b.childStar - a.childStar); break;
      default: break;
    }
    return result;
  }, [books, searchQuery, filterDim, filterMonth, sortBy]);

  const reviewBooks = useMemo(() => books.filter(b => b.needsReview), [books]);

  const displayBooks = useMemo(() => {
    if (showReview) return reviewBooks;
    if (!showAllBooks && !filterDim && !filterMonth) return recentBooks;
    return filtered;
  }, [showReview, reviewBooks, showAllBooks, filterDim, filterMonth, searchQuery, recentBooks, filtered]);

  // 计算被折叠的书籍数量
  const hiddenCount = books.length - recentBooks.length;

  // 访客演示数据
  const [demoData, setDemoData] = useState(null);
  const [showDemo, setShowDemo] = useState(false);
  const loadDemo = async () => {
    if (!demoData) {
      const resp = await fetch('/demo_data.json');
      const data = await resp.json();
      setDemoData(data);
    }
    setShowDemo(true);
  };

  if (books.length === 0) {
    return <EmptyState icon="📚" title="书架空空" description="去「新书录入」页添加孩子读过的第一本书吧！" />;
  }

  return (
    <div>
      {/* 统计卡片 - 紧凑型 */}
      <div style={{display:'flex',gap:6,marginBottom:12}}>
        <div style={{flex:1,background:'var(--card)',borderRadius:'var(--radius-sm)',padding:'10px 8px',textAlign:'center',border:'1px solid var(--border)'}}>
          <div style={{fontSize:20,fontWeight:700,color:'var(--accent)'}}>{getTotalBooks(books)}</div>
          <div style={{fontSize:10,color:'var(--ink3)'}}>📚 累计阅读</div>
        </div>
        <div style={{flex:1,background:'var(--card)',borderRadius:'var(--radius-sm)',padding:'10px 8px',textAlign:'center',border:'1px solid var(--border)'}}>
          <div style={{fontSize:20,fontWeight:700,color:'var(--accent)'}}>{new Set(books.map(b => b.dimension)).size}/7</div>
          <div style={{fontSize:10,color:'var(--ink3)'}}>🎯 覆盖维度</div>
        </div>
        <div style={{flex:1,background:'var(--card)',borderRadius:'var(--radius-sm)',padding:'10px 8px',textAlign:'center',border:'1px solid var(--border)'}}>
          <div style={{fontSize:20,fontWeight:700,color:'var(--accent)'}}>{getAvgChildStar(books) || '-'}</div>
          <div style={{fontSize:10,color:'var(--ink3)'}}>⭐ 平均喜爱度</div>
        </div>
      </div>

      {/* 访客示例数据按钮 */}
      {!showDemo && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 12, cursor: 'pointer', border: '1px dashed var(--border)', background: 'var(--bg)' }}
          onClick={loadDemo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>查看示例阅读报告</div>
              <div style={{ fontSize: 10, color: 'var(--ink3)' }}>不保存、不修改，仅预览功能效果</div>
            </div>
            <span style={{ color: 'var(--ink3)', fontSize: 14 }}>›</span>
          </div>
        </div>
      )}

      {/* 阅读结构：横向对比条 */}
      <h2 className="section-title"><span className="icon">📊</span> 阅读结构</h2>
      <div className="card">
        <div className="dim-bars">
          {[...dimPcts].sort((a, b) => b.count - a.count).map(d => {
            const isExpanded = expandedBarDim === d.key;
            const dimDef = DIMENSIONS.find(dd => dd.key === d.key);
            const l2s = l2Dist[d.key] || {};
            return (
            <div key={d.key}>
              <div className="dim-bar-row" style={{cursor: 'pointer'}}
                onClick={() => setExpandedBarDim(isExpanded ? null : d.key)}>
                <div className="dim-bar-label" style={{display:'flex',alignItems:'center',gap:3}}>
                  <span style={{fontSize:8,color:d.color,opacity:0.7,transition:'transform 0.2s',transform:isExpanded?'rotate(90deg)':'none'}}>▸</span>
                  {d.icon} {d.label.replace(/^[①②③④⑤⑥⑦] /, '')}
                </div>
                <div className="dim-bar-track">
                  <div className="dim-bar-fill" style={{
                    width: `${Math.min(d.actualPct, 100)}%`,
                    background: `linear-gradient(90deg, ${d.color}, ${d.colorDark})`,
                  }}>
                    {d.actualPct >= 12 && `${d.actualPct}%`}
                  </div>
                  <div className="dim-bar-target" style={{ left: `${Math.min(d.pct, 100)}%` }} />
                </div>
                <div className="dim-bar-count">{d.count}</div>
              </div>
              {isExpanded && dimDef && (
                <div style={{padding: '6px 0 8px 86px', display: 'flex', flexWrap: 'wrap', gap: 4}}>
                  {dimDef.children.filter(l2 => l2s[l2.key]).map(l2 => (
                    <span key={l2.key} style={{
                      fontSize: 10.5, padding: '2px 8px', borderRadius: 5,
                      background: `${d.color}18`, color: d.colorDark, fontWeight: 600,
                      border: `1px solid ${d.color}33`,
                    }}>
                      {l2.label} <span style={{opacity: 0.6}}>{l2s[l2.key]}本</span>
                    </span>
                  ))}
                  {Object.keys(l2s).length === 0 && <span style={{fontSize: 10, color: '#C4BBAE'}}>暂无二级分类数据</span>}
                </div>
              )}
            </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#C4BBAE', marginTop: 4, paddingLeft: 86 }}>
          <span>━ 参考比例</span>
          <span>实际 %</span>
        </div>
      </div>


      {/* 月度阅读量 */}
      <h2 className="section-title"><span className="icon">📅</span> 月度阅读量</h2>
      {monthly.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 200, paddingTop: 4 }}>
            {monthly.slice(-12).map(m => {
              const maxAll = Math.max(...monthly.map(x => x.count), 1);
              const pct = (m.count / maxAll) * 100;
              return (
                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 3, height: '100%' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: m.count > 0 ? '#C47A6E' : '#D6CFC4' }}>{m.count}</span>
                  <div style={{
                    width: '80%', maxWidth: 36, height: pct + '%', minHeight: 2,
                    borderRadius: '4px 4px 2px 2px',
                    background: m.count > 0 ? '#C8815C' : '#F0EBE4',
                    opacity: m.count > 0 ? Math.min(1, 0.3 + pct / 100) : 0.2,
                    transition: 'height 0.3s',
                  }} />
                  <span style={{ fontSize: 9, color: m.count > 0 ? '#5C5244' : '#D6CFC4' }}>
                    {m.month.replace(/^\d+-/, '').replace(/^0/, '')}月
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 诊断面板 */}
      <div style={{ marginBottom: 12 }}>
        <h2 className="section-title"><span className="icon">🔍</span> 阅读诊断</h2>

        {/* 月度摘要 */}
        <div className="diag-banner">
          <h3>📋 {monthlyReport.month?.replace(/^\d+-/, '').replace(/^0/, '') || '本'}月小结</h3>
          <p>本月共读 <strong style={{color:'var(--accent)'}}>{monthlyReport.count}</strong> 本
            {monthlyReport.dims.length > 0 && <>，覆盖 {monthlyReport.dims.map(d => `${d.icon}${d.label}`).join('、')}</>}
          </p>
        </div>

        {/* 覆盖度告警 */}
        {coverage.severe.length > 0 && (
          <div className="card">
            <h3 style={{color:'var(--red)'}}>⚠️ 覆盖度不足</h3>
            {coverage.severe.map(d => (
              <div key={d.key} className="alert-item">
                <span className="alert-badge danger">{d.count === 0 ? '空白' : '不足'}</span>
                <div>
                  <strong>{d.icon} {d.label}</strong>
                  <div style={{fontSize:10,color:'#5A5A78'}}>
                    实际 {d.actualPct}% / 参考 {d.pct}%
                    {d.count === 0 ? ' — 建议下月各补1-2本' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 下月建议 */}
        {monthlyReport.nextMonthHint?.length > 0 && (
          <div className="card">
            <h3 style={{color:'var(--yellow)'}}>💡 下月建议方向</h3>
            {monthlyReport.nextMonthHint.map((hint, i) => (
              <div key={i} className="alert-item">
                <span className="alert-badge warning">建议补充</span>
                <div>
                  <strong>{hint.label}</strong>
                  {hint.directions?.map((dir, j) => (
                    <div key={j} style={{fontSize:10,color:'#5A5A78',marginTop:2}}>
                      · {dir.level3} — {dir.hint}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 推荐 */}
        {recommendations.length > 0 && (
          <div className="card">
            <h3 style={{color:'var(--purple)'}}>📖 推荐方向</h3>
            {recommendations.slice(0, 4).map((rec, i) => (
              <div key={i} className="recommend-card">
                <h4 style={{color: rec.dimColor}}>{rec.dimIcon} {rec.level3}</h4>
                <div className="rec-meta">{rec.dimLabel} · {rec.level2}</div>
                <div className="rec-hint">{rec.hint}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 近期书单 */}
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <h2 className="section-title" style={{ margin: 0, display:'flex',alignItems:'center',gap:6 }}>
          {showReview ? `🔍 待确认` : '📖 ' + (showAllBooks ? '全部书单' : '近期阅读')}
          {searchQuery && displayBooks.length > 0 && (
            <span style={{fontSize:10,fontWeight:400,color:'var(--ink3)'}}>
              找到 {displayBooks.length} 本
            </span>
          )}
        </h2>
        <div className="filter-bar">
          {!showReview && (
            <>
              <div style={{position:'relative',display:'flex',alignItems:'center'}}>
                <input type="search" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); if (e.target.value) setShowAllBooks(true); }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setShowAllBooks(true); } }}
                  placeholder="🔍 搜书名..." style={{
                    padding: '7px 28px 7px 10px', border: searchQuery ? '1px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: 8, fontSize: 12, fontFamily: 'var(--font)', background: 'var(--card)',
                    color: 'var(--ink)', outline: 'none', width: 130, minWidth: 0, transition: 'all 0.15s',
                  }} />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{
                    position:'absolute',right:4,background:'none',border:'none',fontSize:14,
                    cursor:'pointer',color:'var(--ink3)',padding:'2px',lineHeight:1,
                  }}>✕</button>
                )}
              </div>
              <select value={filterDim} onChange={e => { setFilterDim(e.target.value); if (e.target.value) setShowAllBooks(true); }}>
                <option value="">全部维度</option>
                {DIMENSIONS.map(d => (
                  <option key={d.key} value={d.key}>{d.icon} {d.label.replace(/^[①②③④⑤⑥] /, '')}</option>
                ))}
              </select>
              <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value); if (e.target.value) setShowAllBooks(true); }}>
                <option value="">全部月份</option>
                {months.map(m => (
                  <option key={m} value={m}>{m.replace(/^\d+-/, '').replace(/^0/, '')}月</option>
                ))}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="month-desc">最近</option>
                <option value="month-asc">最早</option>
                <option value="childStar-desc">最喜爱</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* 书卡 */}
      <div className="book-grid">
        {displayBooks.map(book => (
          <BookCard key={book.id} book={book}
            isEditing={editingId === book.id}
            onEdit={() => setEditingId(editingId === book.id ? null : book.id)}
            onSave={(data) => { updateBook(book.id, data); setEditingId(null); }}
            onDelete={() => { if (window.confirm(`确定删除《${book.title}》？`)) deleteBook(book.id); }}
          />
        ))}
      </div>

      {/* 展开全部 / 收起 */}
      {!showReview && hiddenCount > 0 && !filterDim && !filterMonth && (
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <button className="btn-ghost" onClick={() => setShowAllBooks(!showAllBooks)}>
            {showAllBooks ? `收起（仅显示近期）` : `展开全部（还有 ${hiddenCount} 本）`}
          </button>
        </div>
      )}

      {displayBooks.length === 0 && (
        <EmptyState icon="🔍" title="没有匹配的书" description="试试调整筛选条件" />
      )}

      {/* 底部：跳转到记录页 */}
      <div style={{ textAlign: 'center', marginTop: 24, paddingBottom: 8 }}>
        <button
          className="btn-primary"
          style={{ padding: '12px 32px', fontSize: 15 }}
          onClick={() => setActiveTab('record')}
        >
          ✍️ 新书录入
        </button>
      </div>

      {/* 访客示例数据弹窗 */}
      {showDemo && demoData && (
        <div className="modal-overlay" onClick={() => setShowDemo(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, maxHeight: '80vh', overflow: 'auto', borderRadius: 16, padding: 0 }}>
            <div style={{ padding: 20, background: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 24 }}>📋</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>示例阅读报告</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)' }}>脱敏预览 · 不保存到本地</div>
                </div>
                <button onClick={() => setShowDemo(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 18, color: 'var(--ink3)', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 12 }}>
                累计阅读 <strong>{demoData.diagnosis.totalBooks}</strong> 本 ·
                虚构 {demoData.diagnosis.fictionCount} 本 / 非虚构 {demoData.diagnosis.nonFictionCount} 本
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>维度覆盖</div>
              {demoData.diagnosis.dimensionStats.map(d => (
                <div key={d.dim} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 12 }}>
                  <span>{d.status}</span>
                  <span style={{ color: 'var(--ink2)' }}>{d.dim}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--ink3)' }}>{d.count}本 · 目标{d.target}</span>
                </div>
              ))}
              <div style={{ marginTop: 12, padding: 8, background: '#F9F7F4', borderRadius: 8, fontSize: 11, color: 'var(--ink2)', lineHeight: 1.6 }}>
                💡 {demoData.diagnosis.suggestion}
              </div>
              <div style={{ marginTop: 16, fontSize: 11, color: 'var(--ink3)', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                示例包含 {demoData.books.length} 本代表性书目，涵盖 7 个维度。完整数据库含 400+ 本。
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== 书卡组件 =====
function BookCard({ book, isEditing, onEdit, onSave, onDelete }) {
  const dim = getDimension(book.dimension);
  const l2 = dim?.children.find(c => c.key === book.level2);
  const [form, setForm] = useState({
    title: book.title, author: book.author, month: book.month,
    source: book.source || '广图', language: book.language || '外文',
    classic: book.classic || false, fiction: book.fiction || '虚构',
    dimension: book.dimension, level2: book.level2,
    level3: book.level3 || '', childStar: book.childStar || 0, note: book.note || '',
    imageId: book.imageId || null,
  });
  const [coverUrl, setCoverUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (book.imageId) { getImage(book.imageId).then(data => { if (!cancelled) setCoverUrl(data); }); }
    else setCoverUrl(null);
    return () => { cancelled = true; };
  }, [book.imageId]);

  const l2Options = getAllLevel2Options(form.dimension);
  const l3Options = getLevel3Options(form.dimension, form.level2);

  const handleChange = (f, v) => {
    const n = { ...form, [f]: v };
    if (f === 'dimension') { n.level2 = getAllLevel2Options(v)[0]?.key || ''; n.level3 = ''; }
    if (f === 'level2') n.level3 = '';
    setForm(n);
  };

  if (isEditing) {
    return (
      <div className="book-card" style={{ borderColor: 'rgba(0,229,255,0.4)', boxShadow: '0 0 16px rgba(0,229,255,0.1)' }}>
        <div className="inline-edit">
          <input value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="书名" style={{fontWeight:700,fontSize:14}} />
          <input value={form.author} onChange={e => handleChange('author', e.target.value)} placeholder="作者" />
          <div style={{display:'flex',gap:6}}>
            <select value={form.language} onChange={e => handleChange('language', e.target.value)} style={{flex:1}}>
              {LANGUAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={form.fiction} onChange={e => handleChange('fiction', e.target.value)} style={{flex:1}}>
              {FICTION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={form.classic ? '是' : '否'} onChange={e => handleChange('classic', e.target.value === '是')} style={{flex:1}}>
              {CLASSIC_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{display:'flex',gap:6}}>
            <select value={form.dimension} onChange={e => handleChange('dimension', e.target.value)} style={{flex:1}}>
              {DIMENSIONS.map(d => <option key={d.key} value={d.key}>{d.icon} {d.label}</option>)}
            </select>
            <select value={form.level2} onChange={e => handleChange('level2', e.target.value)} style={{flex:1}}>
              {l2Options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          <div style={{display:'flex',gap:6}}>
            <select value={form.level3} onChange={e => handleChange('level3', e.target.value)} style={{flex:1}}>
              <option value="">三级(选填)</option>
              {l3Options.map((l3,i) => <option key={i} value={l3}>{l3}</option>)}
            </select>
            <input value={form.source} onChange={e => handleChange('source', e.target.value)} placeholder="来源" style={{flex:1}} />
          </div>
          <div style={{display:'flex',gap:6}}>
            <input type="month" value={form.month} onChange={e => handleChange('month', e.target.value)} style={{flex:1}} />
            <div style={{flex:1,display:'flex',alignItems:'center'}}>
              <StarPicker value={form.childStar} onChange={v => handleChange('childStar', v)} />
            </div>
          </div>
          <input value={form.note} onChange={e => handleChange('note', e.target.value)} placeholder="一句话感受..." />
          <div style={{marginTop:4}}>
            <ImageUpload imageId={form.imageId} onChange={(newId) => handleChange('imageId', newId)} size="small" />
          </div>
          <div style={{display:'flex',gap:6,marginTop:6}}>
            <button className="btn-primary" style={{padding:'5px 14px',fontSize:11}} onClick={() => onSave(form)}>💾 保存</button>
            <button className="btn-ghost" style={{padding:'5px 14px',fontSize:11}} onClick={onEdit}>取消</button>
          </div>
        </div>
      </div>
    );
  }

  const confColors = { high: { border:'#7BA88B', bg:'rgba(123,168,139,0.06)' }, medium: { border:'#C4A55A', bg:'rgba(196,165,90,0.04)' }, low: { border:'#B8856A', bg:'rgba(184,133,106,0.08)' } };
  const conf = book.confidence || 'low';
  const borderColor = book.needsReview ? '#FF2D95' : confColors[conf]?.border || '#2A2A45';
  const bgTint = book.needsReview ? 'rgba(255,45,149,0.04)' : confColors[conf]?.bg || 'transparent';

  return (
    <div className="book-card" style={{display:'flex',gap:10,borderColor,borderLeftWidth:4,background:bgTint}}>
      {book.needsReview && (
        <div style={{position:'absolute',top:6,right:8,background:'rgba(255,45,149,0.2)',color:'var(--accent)',fontSize:9,fontWeight:800,padding:'2px 7px',borderRadius:8,border:'1px solid rgba(196,122,110,0.25)'}}>待确认</div>
      )}
      {!book.needsReview && conf !== 'high' && (
        <div style={{position:'absolute',top:6,right:8,background:conf==='medium'?'rgba(196,165,90,0.1)':'rgba(184,133,106,0.1)',color:conf==='medium'?'#C4A55A':'#B8856A',fontSize:8,fontWeight:700,padding:'1px 6px',borderRadius:6}}>{conf==='medium'?'中':'低'}</div>
      )}
      {coverUrl ? (
        <img src={coverUrl} alt="" style={{width:60,height:85,objectFit:'cover',borderRadius:6,flexShrink:0,border:'1px solid #2A2A45'}} />
      ) : (
        <div style={{width:60,height:85,borderRadius:6,flexShrink:0,border:'1px solid #E8E2D8',background:'#F5F3F0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>📚</div>
      )}
      <div style={{flex:1,minWidth:0}}>
        <div className="book-card-header">
          <div style={{flex:1}}>
            <div className="book-title">{book.title}</div>
            {book.author && <div className="book-author">✍️ {book.author}</div>}
          </div>
          <StarDisplay value={book.childStar} />
        </div>
        <div className="book-meta">
          <span className="book-tag dim" style={{background:(dim?.color||'#C47A6E')+'22',color:dim?.colorDark||'#B5857A'}}>{dim?.icon} {dim?.label?.replace(/^[①②③④⑤⑥] /,'')}</span>
          {l2 && <span className="book-tag l2">{l2.label}</span>}
          <span className="book-tag source">{book.source}</span>
          <span className="book-tag" style={{background:'rgba(140,125,168,0.1)',color:'#8C7DA8',border:'1px solid rgba(140,125,168,0.2)'}}>{book.language||'外文'}</span>
          <span className="book-tag" style={{background:book.fiction==='非虚构'?'rgba(123,168,139,0.1)':'rgba(107,155,168,0.1)',color:book.fiction==='非虚构'?'#7BA88B':'#6B9BA8',border:`1px solid ${book.fiction==='非虚构'?'rgba(123,168,139,0.25)':'rgba(107,155,168,0.25)'}`}}>{book.fiction||'虚构'}</span>
          {book.classic && <span className="book-tag" style={{background:'rgba(255,229,64,0.1)',color:'#C4A55A',border:'1px solid rgba(255,229,64,0.25)'}}>名著</span>}
        </div>
        <div style={{fontSize:10,color:'#5A5A78',marginTop:4}}>{book.month.replace(/^\d+-/,'').replace(/^0/,'')}月{book.level3?` · ${book.level3}`:''}</div>
        {book.note && <div className="book-note">💬 {book.note}</div>}
        {book.discoveries && book.discoveries.length > 0 && (
          <div style={{fontSize: 10, color: 'var(--accent)', fontWeight: 600, marginTop: 2}}>💭 {book.discoveries.length} 条说说</div>
        )}
        
        <div className="book-actions">
          <button onClick={onEdit}>✏️ 编辑</button>
          <button className="danger" onClick={onDelete}>🗑️</button>
        </div>
      </div>
    </div>
  );
}
