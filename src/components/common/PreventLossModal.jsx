// ============================================================
// PreventLossModal — 匿名用户防丢弹窗
// 触发时机：beforeunload / 退出登录按钮
// ============================================================
export default function PreventLossModal({ onClose, onBind, onLeave }) {
  return (
    <div className="modal-overlay" onClick={onClose}
      style={{ zIndex: 1100, alignItems: 'center' }}>
      <div className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 340, textAlign: 'center', borderRadius: 18,
          padding: 24, animation: 'slideUp 0.25s ease',
        }}>
        {/* 右上角关闭 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -8 }}>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20,
            color: 'var(--ink3)', cursor: 'pointer', padding: 4, lineHeight: 1,
          }}>✕</button>
        </div>

        {/* 图标 */}
        <div style={{ fontSize: 48, marginBottom: 8 }}>💡</div>

        {/* 标题 */}
        <div style={{
          fontSize: 18, fontWeight: 700, color: 'var(--ink)',
          marginBottom: 12, fontFamily: 'var(--font-title)',
        }}>
          小心丢书
        </div>

        {/* 正文 */}
        <div style={{
          fontSize: 13, color: 'var(--ink2)', marginBottom: 24,
          lineHeight: 1.8, padding: '0 4px',
        }}>
          您已录入图书，目前保存在本设备。绑定手机号后，随时随地都能找回收藏。
        </div>

        {/* 按钮 */}
        <button
          className="btn-primary"
          style={{ width: '100%', padding: 14, fontSize: 15, marginBottom: 10 }}
          onClick={onBind}
        >
          📱 绑定手机号，防止丢失
        </button>

        <button onClick={onLeave} style={{
          background: 'none', border: 'none', padding: 10, fontSize: 13,
          color: 'var(--ink3)', cursor: 'pointer', fontFamily: 'var(--font)',
          width: '100%', transition: 'color 0.15s',
        }}
          onMouseEnter={e => e.target.style.color = 'var(--ink)'}
          onMouseLeave={e => e.target.style.color = 'var(--ink3)'}
        >
          先不绑定，继续离开
        </button>
      </div>
    </div>
  );
}
