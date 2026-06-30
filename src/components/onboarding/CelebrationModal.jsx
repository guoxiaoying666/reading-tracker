// ============================================================
// CelebrationModal — 第5本书录入庆祝弹窗（v2.0 优化版）
// 标题："🎉 地图亮起来了！"
// 按钮："查看天赋地图"
// ============================================================
export default function CelebrationModal({ onDismiss }) {
  return (
    <div className="modal-overlay" onClick={onDismiss}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'linear-gradient(160deg, #FFF8F0, #FDF0E0)',
        borderRadius: 24, padding: '40px 32px 32px', maxWidth: 340, width: '90%',
        boxShadow: '0 20px 60px rgba(44,36,22,0.15)',
        textAlign: 'center', border: '1px solid rgba(200,129,92,0.2)',
      }}>
        {/* 插画缩小 30%，并加微动效 */}
        <div style={{
          fontSize: 40, marginBottom: 14, lineHeight: 1.2,
          animation: 'float 2.5s ease-in-out infinite',
          display: 'inline-block',
        }}>
          🎉
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#5C5244', marginBottom: 14 }}>
          地图亮起来了！
        </div>
        <p style={{ fontSize: 14, color: '#9B9082', lineHeight: 1.7, margin: '0 0 28px', maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>
          孩子的阅读地图已经点亮，来看看TA的首张天赋画像吧。
        </p>
        {/* 按钮宽度 80%，加阴影 */}
        <button onClick={onDismiss} style={{
          width: '80%', padding: '15px 0', borderRadius: 12,
          background: 'linear-gradient(135deg, #C8815C, #A56545)',
          color: 'white', border: 'none',
          fontSize: 16, fontWeight: 700, letterSpacing: 1,
          cursor: 'pointer', fontFamily: 'var(--font)',
          boxShadow: '0 6px 24px rgba(200,129,92,0.35), 0 2px 8px rgba(200,129,92,0.15)',
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => e.target.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.target.style.transform = 'none'}>
          查看天赋地图
        </button>
      </div>
    </div>
  );
}
