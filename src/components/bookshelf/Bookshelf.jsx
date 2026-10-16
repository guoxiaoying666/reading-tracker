import { useState, useMemo, useEffect } from 'react';
import { useReading } from '../../context/ReadingContext';
import { WHAT_DIMENSIONS, getDimension, getBookDimension } from '../../data/framework';
import { formatMonthShort } from '../../utils/bookStatus';
import { getTotalBooks, getMonthlyTrend, getMonths, getAvgChildStar, getCoveredWhatDims } from '../../utils/stats';
import { getImage } from '../../utils/imageDB';
import EmptyState from '../common/EmptyState';
import BookDetailDrawer from '../common/BookDetailDrawer';

const PAGE_SIZE = 20;

export default function Bookshelf() {
  const { books, updateBook, deleteBook, setActiveTab } = useReading();
  const [filterDim, setFilterDim] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [sortBy, setSortBy] = useState('month-desc');
  const [detailBook, setDetailBook] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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
            onOpenDetail={() => setDetailBook(book)}
            onVoice={() => {
              localStorage.setItem('wonderead-pending-book', book.title);
              setActiveTab('voice_record');
            }}
          />
        ))}
      </div>

      {detailBook && (
        <BookDetailDrawer
          book={detailBook}
          onClose={() => setDetailBook(null)}
          onSave={(data) => updateBook(detailBook.id, data)}
          onDelete={() => deleteBook(detailBook.id)}
        />
      )}

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

function BookRow({ book, onOpenDetail, onVoice }) {
  const dimKey = getBookDimension(book);
  const dim = getDimension(dimKey);
  const l2 = dim?.children.find(c => c.key === book.level2);
  const [coverUrl, setCoverUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (book.imageId) { getImage(book.imageId).then(data => { if (!cancelled) setCoverUrl(data); }); }
    else setCoverUrl(null);
    return () => { cancelled = true; };
  }, [book.imageId]);

  return (
    <div className="card" onClick={onOpenDetail} style={{
      display:'flex', gap:10, padding:'10px 12px', alignItems:'center', position:'relative',
      borderLeft: `3px solid ${dim?.color || '#C4BBAE'}40`, cursor: 'pointer',
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
          <span style={{fontSize:9,color:'var(--ink4)'}}>{formatMonthShort(book.month)}</span>
        </div>
      </div>

      {/* 说感受按钮 —— 需要阻止冒泡，否则会连带触发卡片点击打开详情页 */}
      <button onClick={(e) => { e.stopPropagation(); onVoice(); }} style={{
        background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#C8815C',padding:'4px',flexShrink:0,
      }} title="说感受">🎙️</button>
    </div>
  );
}
