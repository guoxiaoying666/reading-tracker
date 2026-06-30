import { useState, useMemo, useEffect } from 'react';
import { useReading } from '../../context/ReadingContext';
import { WHAT_DIMENSIONS, LANGUAGES, CLASSIC_OPTIONS, FICTION_OPTIONS, getDimension, getAllLevel2Options, getLevel3Options, getBookDimension } from '../../data/framework';
import { getTotalBooks, getMonthlyTrend, getMonths, getAvgChildStar, getCoveredWhatDims } from '../../utils/stats';
import { getImage } from '../../utils/imageDB';
import ImageUpload from '../common/ImageUpload';
import StarPicker, { StarDisplay } from '../common/StarPicker';
import EmptyState from '../common/EmptyState';

const PAGE_SIZE = 20;

export default function Bookshelf() {
  const { books, updateBook, deleteBook, setActiveTab } = useReading();
  const [filterDim, setFilterDim] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [sortBy, setSortBy] = useState('month-desc');
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [menuBookId, setMenuBookId] = useState(null);

  const months = useMemo(() => getMonths(books), [books]);
  const monthly = useMemo(() => getMonthlyTrend(books), [books]);

  const filtered = useMemo(() => {
    let result = [...books];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(b => b.title.toLowerCase().includes(q) || (b.author && b.author.toLowerCase().includes(q)));
    }
    if (filterDim) result = result.filter(b => getBookDimension(b) === filterDim);
    if (filterMonth) result = result.filter(b => b.month === filterMonth);
    switch (sortBy) {
      case 'month-desc': result.sort((a, b) => (b.month || '').localeCompare(a.month || '')); break;
      case 'month-asc': result.sort((a, b) => (a.month || '').localeCompare(b.month || '')); break;
      case 'childStar-desc': result.sort((a, b) => b.childStar - a.childStar); break;
      default: break;
    }
    return result;
  }, [books, searchQuery, filterDim, filterMonth, sortBy]);

  const displayBooks = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  // 点击外部关闭菜单
  useEffect(() => {
    const handler = () => setMenuBookId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const loadMore = () => setVisibleCount(p => Math.min(p + PAGE_SIZE, filtered.length));

  const filterLabel = filterDim || filterMonth || sortBy !== 'month-desc'
    ? `筛选 (${[filterDim, filterMonth, sortBy !== 'month-desc' ? '已排序' : ''].filter(Boolean).length})`
    : '筛选';

  if (books.length === 0) {
    return <EmptyState icon="📚" title="书架空空" description="去「新书录入」页添加孩子读过的第一本书吧！" />;
  }

  return (
    <div>
      {/* 顶部统计 — 3 块紧凑徽章 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <div style={{ flex: 1, background: 'var(--card)', borderRadius: 8, padding: '7px 6px', textAlign: 'center', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.3 }}>{getTotalBooks(books)}</div>
          <div style={{ fontSize: 9, color: 'var(--ink3)' }}>📚 累计阅读</div>
        </div>
        <div style={{ flex: 1, background: 'var(--card)', borderRadius: 8, padding: '7px 6px', textAlign: 'center', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.3 }}>{getCoveredWhatDims(books)}/5</div>
          <div style={{ fontSize: 9, color: 'var(--ink3)' }}>🎯 覆盖维度</div>
        </div>
        <div style={{ flex: 1, background: 'var(--card)', borderRadius: 8, padding: '7px 6px', textAlign: 'center', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.3 }}>{getAvgChildStar(books) || '-'}</div>
          <div style={{ fontSize: 9, color: 'var(--ink3)' }}>⭐ 平均喜爱度</div>
        </div>
      </div>

      {/* 全部书架标题 + 筛选 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 className="section-title" style={{ margin: 0, fontSize: 14 }}>
          📖 全部书架
          <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--ink3)', marginLeft: 4 }}>
            {searchQuery ? `找到 ${filtered.length} 本` : `${filtered.length} 本`}
          </span>
        </h2>
        <div style={{ position: 'relative' }}>
          <button onClick={e => { e.stopPropagation(); setShowFilter(!showFilter); }}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: 'var(--ink2)', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
            {filterLabel} ▾
          </button>
          {showFilter && (
            <div onClick={e => e.stopPropagation()} style={{
              position: 'absolute', top: 30, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 10,
              boxShadow: '0 4px 16px rgba(44,36,22,0.1)', zIndex: 50, padding: '10px', minWidth: 160,
            }}>
              <div style={{ fontSize: 10, color: 'var(--ink3)', marginBottom: 6, fontWeight: 600 }}>维度</div>
              <select value={filterDim} onChange={e => setFilterDim(e.target.value)} style={{ width: '100%', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, marginBottom: 8, fontFamily: 'var(--font)' }}>
                <option value="">全部维度</option>
                {WHAT_DIMENSIONS.map(d => (
                  <option key={d.key} value={d.key}>{d.icon} {d.label}</option>
                ))}
              </select>
              <div style={{ fontSize: 10, color: 'var(--ink3)', marginBottom: 6, fontWeight: 600 }}>月份</div>
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ width: '100%', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, marginBottom: 8, fontFamily: 'var(--font)' }}>
                <option value="">全部月份</option>
                {months.map(m => (
                  <option key={m} value={m}>{m.replace(/^\d+-/, '').replace(/^0/, '')}月</option>
                ))}
              </select>
              <div style={{ fontSize: 10, color: 'var(--ink3)', marginBottom: 6, fontWeight: 600 }}>排序</div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: '100%', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, fontFamily: 'var(--font)' }}>
                <option value="month-desc">最近</option>
                <option value="month-asc">最早</option>
                <option value="childStar-desc">最喜爱</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 搜索框 + 新书录入 — 横向排列 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center' }}>
        <div style={{ flex: 3, minWidth: 0 }}>
          <input type="search" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="🔍 搜索书名..."
            style={{ width: '100%', padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font)', background: 'transparent', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <button onClick={() => setActiveTab('record')} style={{
          flex: 2, background: '#C8815C', color: 'white', border: 'none', borderRadius: 8,
          padding: '7px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'var(--font)', whiteSpace: 'nowrap', textAlign: 'center',
        }}>
          ➕ 新书录入
        </button>
      </div>

      {/* 书列表 */}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {displayBooks.map(book => (
          <BookRow key={book.id} book={book}
            isEditing={editingId === book.id}
            menuOpen={menuBookId === book.id}
            onToggleMenu={(e) => { e.stopPropagation(); setMenuBookId(menuBookId === book.id ? null : book.id); }}
            onEdit={() => setEditingId(editingId === book.id ? null : book.id)}
            onSave={(data) => { updateBook(book.id, data); setEditingId(null); }}
            onDelete={() => { if (window.confirm(`确定删除《${book.title}》？`)) deleteBook(book.id); }}
            onVoice={() => {
              localStorage.setItem('wonderead-pending-book', book.title);
              setActiveTab('voice_record');
            }}
          />
        ))}
      </div>

      {displayBooks.length === 0 && (
        <EmptyState icon="🔍" title="没有匹配的书" description="试试调整筛选条件" />
      )}

      {/* 加载更多 */}
      {hasMore && (
        <div style={{textAlign:'center',marginTop:12,marginBottom:8}}>
          <button onClick={loadMore} className="btn-ghost" style={{padding:'8px 28px',fontSize:12}}>
            加载更多
          </button>
        </div>
      )}
    </div>
  );
}

function BookRow({ book, isEditing, menuOpen, onToggleMenu, onEdit, onSave, onDelete, onVoice }) {
  const dimKey = getBookDimension(book);
  const dim = getDimension(dimKey);
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
      <div className="card" style={{padding:14}}>
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
              {WHAT_DIMENSIONS.map(d => <option key={d.key} value={d.key}>{d.icon} {d.label}</option>)}
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

  return (
    <div className="card" style={{
      display:'flex', gap:10, padding:'10px 12px', alignItems:'center', position:'relative',
      borderLeft: `3px solid ${dim?.color || '#C4BBAE'}40`,
    }}>
      {/* 封面 */}
      {coverUrl ? (
        <img src={coverUrl} alt="" style={{width:40,height:56,objectFit:'cover',borderRadius:4,flexShrink:0,border:'1px solid var(--border)'}} />
      ) : (
        <div style={{width:40,height:56,borderRadius:4,flexShrink:0,border:'1px solid rgba(200,190,175,0.08)',background:'#2C2A28',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'#555'}}>📖</div>
      )}

      {/* 信息 */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:600,color:'var(--ink)',lineHeight:1.4}}>{book.title}</div>
        {book.author && <div style={{fontSize:10,color:'var(--ink3)',marginTop:1}}>{book.author}</div>}
        <div style={{display:'flex',gap:4,marginTop:3,flexWrap:'wrap'}}>
          {dim && <span style={{fontSize:9,padding:'1px 6px',borderRadius:3,background:(dim?.color||'#C47A6E')+'22',color:dim?.colorDark||'#B5857A',fontWeight:600}}>{dim.icon} {dim.label}</span>}
          {l2 && <span style={{fontSize:9,padding:'1px 6px',borderRadius:3,background:'var(--bg)',color:'var(--ink3)'}}>{l2.label}</span>}
          <span style={{fontSize:9,color:'var(--ink4)'}}>{book.month?.replace(/^\d+-/,'').replace(/^0/,'')}月</span>
        </div>
      </div>

      {/* 说感受按钮 */}
      <button onClick={onVoice} style={{
        background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#C8815C',padding:'4px',flexShrink:0,
      }} title="说感受">🎙️</button>

      {/* 菜单按钮 */}
      <div style={{position:'relative'}}>
        <button onClick={onToggleMenu} style={{
          background:'none',border:'none',fontSize:16,cursor:'pointer',color:'var(--ink3)',padding:'4px',flexShrink:0,lineHeight:1,
        }}>⋯</button>
        {menuOpen && (
          <div onClick={e => e.stopPropagation()} style={{
            position:'absolute',top:28,right:0,background:'white',border:'1px solid var(--border)',borderRadius:8,
            boxShadow:'0 4px 16px rgba(44,36,22,0.1)',zIndex:50,minWidth:100,overflow:'hidden',
          }}>
            <button onClick={onEdit} style={{width:'100%',padding:'8px 14px',border:'none',background:'none',fontSize:12,cursor:'pointer',fontFamily:'var(--font)',color:'var(--ink)',textAlign:'left',display:'flex',gap:6}}>
              ✏️ 编辑
            </button>
            <button onClick={onDelete} style={{width:'100%',padding:'8px 14px',border:'none',background:'none',fontSize:12,cursor:'pointer',fontFamily:'var(--font)',color:'#C47A6E',textAlign:'left',display:'flex',gap:6}}>
              🗑️ 删除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
