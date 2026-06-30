// 第二屏：成长空间
// 目的：让用户理解产品的分析价值，而非展示分类结果
// 展示逻辑：能力 → 来源内容 → 成长建议
export default function Screen2FullPicture() {
  const CAPABILITIES = [
    {
      key: 'literacy',
      label: '表达与理解能力',
      icon: '📖',
      color: '#C0392B',
      colorBg: '#C0392B15',
      score: 4,
      maxScore: 5,
      pct: 51.7,
      sourceLabel: '文学叙事类书籍',
      rangeMin: 35,
      rangeMax: 50,
      status: '已形成优势',
      statusColor: '#3D7A4F',
      statusBg: '#E8F5E9',
      why: '这类输入滋养语言表达、情感共鸣和故事理解能力，是孩子认识世界和表达自我的基础。',
      directions: ['经典儿童文学', '诗歌散文', '人物传记'],
    },
    {
      key: 'science',
      label: '科学思维能力',
      icon: '🌿',
      color: '#5A9E6F',
      colorBg: '#5A9E6F15',
      score: 3,
      maxScore: 5,
      pct: 24.2,
      sourceLabel: '自然科学类书籍',
      rangeMin: 25,
      rangeMax: 28,
      status: '值得尝试',
      // v2.0: "建议补充" → "值得尝试"
      statusColor: '#E88D67',
      statusBg: '#FFF3E0',
      why: '科学类输入培养逻辑推理和探究式思考能力，是理解世界运行规律的关键。',
      directions: ['天文宇宙', '数学逻辑', '科技工程'],
    },
    {
      key: 'society',
      label: '社会认知能力',
      icon: '🏛️',
      color: '#D4A574',
      colorBg: '#D4A57415',
      score: 3,
      maxScore: 5,
      pct: 17.5,
      sourceLabel: '人文社会类书籍',
      rangeMin: 10,
      rangeMax: 20,
      status: '发展良好',
      statusColor: '#6B8F5E',
      statusBg: '#F1F8E9',
      why: '人文历史类输入培养历史纵深感和社会理解力，让孩子懂得世界如何运转。',
      directions: ['中国历史', '世界文明', '经济启蒙'],
    },
    {
      key: 'art',
      label: '审美创造能力',
      icon: '🎨',
      color: '#B565A7',
      colorBg: '#B565A715',
      score: 2,
      maxScore: 5,
      pct: 4.2,
      sourceLabel: '艺术创想类书籍',
      rangeMin: 8,
      rangeMax: 10,
      status: '优先关注',
      statusColor: '#C47A6E',
      statusBg: '#FBE9E7',
      why: '艺术与设计类输入激发审美判断和创造性表达，是创新思维的重要源泉。',
      directions: ['视觉艺术', '音乐启蒙', '创新设计'],
    },
    {
      key: 'self',
      label: '情绪成长能力',
      icon: '🧘',
      color: '#4A90B8',
      colorBg: '#4A90B815',
      score: 2,
      maxScore: 5,
      pct: 2.5,
      sourceLabel: '自我成长类书籍',
      rangeMin: 7,
      rangeMax: 10,
      status: '优先关注',
      statusColor: '#C47A6E',
      statusBg: '#FBE9E7',
      why: '心理成长类输入帮助孩子认识情绪、理解自己，是内在力量和健康人格的基石。',
      directions: ['情绪认知', '性格优势', '身体认知'],
    },
  ];

  // 渲染星级
  const renderStars = (score, maxScore) => {
    const full = '★';
    const empty = '☆';
    return full.repeat(score) + empty.repeat(maxScore - score);
  };

  return (
    <section className="landing-section screen2">
      <div className="landing-container" style={{ textAlign: 'left' }}>
        {/* 章节标题（替换案例 Bar） */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span style={{
            fontSize: 10, color: 'var(--ink3)', background: 'var(--bg)',
            padding: '3px 14px', borderRadius: 20, border: '1px solid var(--border)',
            letterSpacing: 0.5, fontWeight: 500,
          }}>
            能力结构分析
          </span>
        </div>

        <h2 className="diagnosis-header">
          成长空间
        </h2>
        <p className="diagnosis-sub">
          每种内容的输入，都在塑造一种能力 · 各维度均有科学建议区间
        </p>

        {CAPABILITIES.map(cap => {
          const barWidth = Math.min(cap.pct, 100);

          return (
            <div key={cap.key} className="diag-dim-section">
              {/* 能力头：名称 + 星级 + 状态 */}
              <div className="diag-dim-header">
                <div className="diag-dim-icon" style={{ background: cap.colorBg, color: cap.color }}>
                  {cap.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="diag-dim-title">{cap.label}</div>
                  <div style={{ fontSize: 13, color: cap.color, letterSpacing: 1 }}>
                    {renderStars(cap.score, cap.maxScore)}
                  </div>
                </div>
                <span className="diag-dim-badge" style={{ background: cap.statusBg, color: cap.statusColor, fontSize: 10, padding: '3px 10px' }}>
                  {cap.status}
                </span>
              </div>

              {/* 来源标签 */}
              <div style={{ paddingLeft: 36, fontSize: 11, color: 'var(--ink3)', marginBottom: 8 }}>
                主要来源：{cap.sourceLabel}
              </div>

              {/* 占比条 + 建议区间 */}
              <div style={{ paddingLeft: 36, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: 'var(--ink2)', fontWeight: 500 }}>{cap.pct}%</span>
                  <span style={{ color: 'var(--ink3)' }}>
                    建议区间 {cap.rangeMin}%–{cap.rangeMax}%
                  </span>
                </div>
                <div style={{ position: 'relative', height: 12, background: '#EBE6DF', borderRadius: 6, overflow: 'visible' }}>
                  {/* 建议区间范围高亮 */}
                  <div style={{
                    position: 'absolute', left: `${cap.rangeMin}%`, width: `${cap.rangeMax - cap.rangeMin}%`,
                    height: '100%', background: cap.statusBg || 'rgba(107,143,94,0.15)', borderRadius: 6,
                  }} />
                  {/* 实际占比 */}
                  <div style={{
                    width: `${barWidth}%`, height: '100%',
                    background: `linear-gradient(90deg, ${cap.color}, ${cap.color}dd)`,
                    borderRadius: 6, position: 'relative', zIndex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                    paddingRight: 4, fontSize: 8, color: 'white', fontWeight: 600,
                  }}>
                    {barWidth >= 10 && `${cap.pct}%`}
                  </div>
                </div>
              </div>

              {/* 为什么重要 */}
              <div className="diag-dim-why">
                <strong>为什么重要：</strong>{cap.why}
              </div>

              {/* 推荐方向 */}
              <div className="diag-dim-recs" style={{ marginBottom: 0 }}>
                <strong>探索方向：</strong>
                {cap.directions.join('、')}
              </div>
            </div>
          );
        })}

        <div className="trust-anchor">
          成长分析模型基于儿童发展心理学 · IB课程框架 · 义务教育课程标准构建
        </div>
      </div>
    </section>
  );
}
