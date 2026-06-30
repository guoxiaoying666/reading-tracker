// 第四屏：注册转化 — 把价值转化为行动
export default function Screen4CTA({ onRegister, onLogin }) {
  const BENEFITS = [
    { icon: '📈', text: '看见优势能力', sub: '发现孩子最强的发展方向' },
    { icon: '🌱', text: '发现成长空间', sub: '找到下一阶段值得尝试的领域' },
    // v2.0: "值得补充" → "值得尝试"
    { icon: '📚', text: '个性化成长书单', sub: '每一本推荐都有明确成长目标' },
    { icon: '📖', text: '长期成长档案', sub: '持续记录能力发展的变化轨迹' },
  ];

  return (
    <section className="landing-section screen4">
      <div className="landing-container">
        {/* 章节标题 */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span style={{
            fontSize: 10, color: 'var(--ink3)', background: 'rgba(255,255,255,0.5)',
            padding: '3px 14px', borderRadius: 20, border: '1px solid var(--border)',
            letterSpacing: 0.5, fontWeight: 500,
          }}>
            成长建议
          </span>
        </div>

        <h2 className="screen4-headline">
          你的孩子，<br />
          正在被什么塑造？
        </h2>
        <p className="screen4-sub">
          记录孩子接触过的内容，自动生成成长档案。<br />
          发现优势，发现成长空间，找到下一步成长方向。
        </p>

        <div className="screen4-benefits">
          {BENEFITS.map((b, i) => (
            <div key={i} className="screen4-benefit-item">
              <span className="screen4-benefit-icon">{b.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{b.text}</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>{b.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="screen4-cta-group">
          <button className="screen4-cta" onClick={onRegister}>
            生成我的报告
          </button>
          <button className="screen4-login-link" onClick={onLogin}>
            已有档案，立即查看
          </button>
        </div>
      </div>
    </section>
  );
}
