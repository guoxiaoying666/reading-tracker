// 第三屏：成长画像 — 整个首页最重要的一屏
// 目的：制造价值高潮，输出能力评估和成长方向
// 不重复展示阅读结构图，不重复展示分类
export default function Screen3DiagnosisPreview() {
  const strengths = [
    { label: '表达与理解', icon: '📖', color: '#C0392B' },
    { label: '社会认知', icon: '🏛️', color: '#D4A574' },
  ];

  const improvements = [
    { label: '科学思维', icon: '🌿', color: '#5A9E6F' },
    { label: '审美创造', icon: '🎨', color: '#B565A7' },
    { label: '情绪成长', icon: '🧘', color: '#4A90B8' },
  ];

  return (
    <section className="landing-section" style={{ minHeight: '100vh', padding: '48px 24px', background: 'var(--bg)', textAlign: 'center' }}>
      <div className="landing-container" style={{ textAlign: 'left' }}>
        {/* 章节标题（替换案例 Bar） */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span style={{
            fontSize: 10, color: 'var(--ink3)', background: 'var(--bg)',
            padding: '3px 14px', borderRadius: 20, border: '1px solid var(--border)',
            letterSpacing: 0.5, fontWeight: 500,
          }}>
            能力发展概览
          </span>
        </div>

        {/* 成长指数 */}
        <div className="growth-index">
          <div className="growth-index-score">82</div>
          <div className="growth-index-label">成长输入指数</div>
          <div className="growth-index-bar">
            <div className="growth-index-fill" style={{ width: '82%' }} />
          </div>
        </div>

        <h2 className="diagnosis-header" style={{ marginTop: 0, textAlign: 'center' }}>
          孩子的成长画像
        </h2>

        {/* 优势能力 */}
        <div className="profile-section">
          <div className="profile-group-label" style={{ color: '#3D7A4F' }}>✓ 优势能力</div>
          {strengths.map(s => (
            <div key={s.label} className="profile-item" style={{ borderColor: s.color + '33', background: s.color + '08' }}>
              <div className="profile-item-icon" style={{ color: s.color }}>{s.icon}</div>
              <div className="profile-item-label">{s.label}</div>
              <span className="profile-item-tag" style={{ background: '#E8F5E9', color: '#3D7A4F' }}>优势</span>
            </div>
          ))}
        </div>

        {/* 值得加强 */}
        <div className="profile-section">
          <div className="profile-group-label" style={{ color: '#E88D67' }}>△ 值得加强</div>
          {improvements.map(s => (
            <div key={s.label} className="profile-item" style={{ borderColor: s.color + '33' }}>
              <div className="profile-item-icon" style={{ color: s.color }}>{s.icon}</div>
              <div className="profile-item-label">{s.label}</div>
              <span className="profile-item-tag" style={{ background: '#FFF3E0', color: '#E88D67' }}>可提升</span>
            </div>
          ))}
        </div>

        {/* 成长总结 */}
        <div className="profile-summary">
          <div className="profile-summary-title">成长总结</div>
          <p className="profile-summary-text">
            这个孩子拥有丰富的人文与文学输入，表达能力发展突出。科学探索类内容相对不足，艺术创想和自我成长领域也有较大的发展空间。未来可以适当增加科学阅读与纪录片输入，帮助形成更加均衡的成长结构。
          </p>
        </div>
      </div>
    </section>
  );
}
