// 第一屏：案例引入
// Slogan: 因好奇多读，因思考深读
export default function Screen1ProblemHook({ onScrollToScreen2 }) {
  const dims = [
    { label: '文学叙事', pct: 51.7, color: '#C0392B' },
    { label: '自然科学', pct: 24.2, color: '#5A9E6F' },
    { label: '人文社会', pct: 17.5, color: '#D4A574' },
    { label: '艺术创想', pct: 4.2, color: '#B565A7' },
    { label: '自我成长', pct: 2.5, color: '#4A90B8' },
  ];

  return (
    <section className="landing-section screen1">
      <div className="landing-container">
        {/* 顶部案例标识 */}
        <div className="sample-banner" style={{ marginBottom: 20 }}>
          <span className="sample-banner-icon">📖</span>
          <div className="sample-banner-text">
            <strong>成长报告样例</strong>
            <div className="sample-banner-sub">10岁女孩 · 405条内容记录</div>
          </div>
        </div>

        <h1 className="screen1-headline" style={{ marginBottom: 20 }}>
          孩子接触过的内容，<br />
          正在悄悄<em>塑造他/她</em>。
        </h1>

        <div className="clear-preview">
          <div className="preview-card">
            <div className="preview-card-title">成长结构分析</div>
            {dims.map(d => (
              <div key={d.label} className="preview-bar">
                <span className="preview-bar-label">{d.label}</span>
                <div className="preview-bar-track">
                  <div className="preview-bar-fill" style={{ width: `${d.pct}%`, background: d.color }} />
                </div>
                <span style={{width:40,textAlign:'left',fontSize:10,color:'#9B9082',fontWeight:600}}>{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <p className="screen1-subtitle" style={{ marginBottom: 20 }}>
          阅读数量告诉我们读了多少，<br />
          成长结构告诉我们正在长成什么样的人。
        </p>

        <div className="credential-line">成长分析模型基于儿童发展心理学 · IB课程框架 · 义务教育课程标准构建</div>

        <p className="screen1-kicker" style={{ marginTop: 24, marginBottom: 20 }}>
          因好奇多读，因<em>思考深读</em>。
        </p>

        <button className="screen1-cta" onClick={onScrollToScreen2}>
          查看完整报告 →
        </button>
      </div>

      <div className="screen1-scroll-arrow" onClick={onScrollToScreen2}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </section>
  );
}
