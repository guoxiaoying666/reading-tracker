// ============================================================
// RecommendedBookCard — 可复用的推荐书目展示组件
// 水平滑动展示书籍封面、书名、作者
// ============================================================

export default function RecommendedBookCard({ books, onClickBook }) {
  if (!books || books.length === 0) {
    return (
      <div style={{ fontSize: 11, color: 'var(--ink3)', lineHeight: 1.6 }}>书单匹配中...</div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
      {books.slice(0, 8).map((b, i) => (
        <div key={b.title + (b.author || '') + i}
          onClick={(e) => {
            // 【已修复】原来这里点击只调用了 onClickBook，没有阻止冒泡。
            // 这个卡片外层（首页"阅读拓展"模块）还包着一个跳转到阅读洞察页的
            // 点击事件，导致点具体某本书时，"打开详情"和"跳转tab"两个动作
            // 会同时触发——这正是"到底是调起书还是跳tab"这个疑惑的真正原因。
            e.stopPropagation();
            onClickBook?.(b);
          }}
          style={{ flexShrink: 0, width: 80, cursor: onClickBook ? 'pointer' : 'default' }}
          title={`${b.title}${b.author ? ' - ' + b.author : ''}`}
        >
          {/* 封面占位 */}
          <div style={{
            width: 72, height: 100, borderRadius: 8,
            background: 'linear-gradient(145deg, #2C2A28, #3A3835)',
            border: '1px solid rgba(200,190,175,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            📖
          </div>
          {/* 书名 */}
          <div style={{
            fontSize: 10, fontWeight: 500, color: 'var(--ink)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            textAlign: 'center', lineHeight: 1.3, marginBottom: 2,
          }}>
            {b.title}
          </div>
          {/* 作者 */}
          {b.author && (
            <div style={{
              fontSize: 8, color: 'var(--ink3)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textAlign: 'center',
            }}>
              {b.author}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
