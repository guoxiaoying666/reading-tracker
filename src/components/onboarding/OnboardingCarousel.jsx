// ============================================================
// OnboardingCarousel — 3屏新手引导轮播（v2.0 最终定稿版）
// 支持左右触摸滑动切换
// 点击"开始记录第一本书"后永久销毁
// ============================================================
import { useState, useRef, useCallback } from 'react';

const PAGES = [
  {
    emoji: '🧭',
    titleAbove: '好读',
    title: 'WondeRead：看见阅读广度，丈量思考深度。',
    body: '从孩子正在读的一本书开始记录。慢慢拼出属于他/她的成长地图。',
    btnText: '看看怎么用 →',
  },
  {
    emoji: '🗺️',
    title: '照见阅读地图',
    bodyParts: ['好读', '把阅读内容归纳为 5 大地图版块：文学、科学、人文、艺术、自我。'],
    btnText: '下一步',
  },
  {
    emoji: '📖',
    title: '让读后感变简单',
    body: '孩子读完书，说几句感受，AI 自动生成读书发现卡，积累成专属作品集。',
    btnText: '✨ 开始记录第一本书',
  },
];

/** 静态条状图示例 — 与真实首页阅读地图样式一致 */
const BAR_DATA = [
  { label: '文学叙事', icon: '📖', pct: 57.3, color: '#C0392B', colorDark: '#96281B' },
  { label: '自然科学', icon: '🌿', pct: 15.1, color: '#5A9E6F', colorDark: '#3D7A4F' },
  { label: '艺术创想', icon: '🎨', pct: 12.3, color: '#B565A7', colorDark: '#914582' },
  { label: '人文社会', icon: '🏛️', pct: 10.6, color: '#D4A574', colorDark: '#B08968' },
  { label: '自我成长', icon: '🧘', pct: 2.5, color: '#4A90B8', colorDark: '#357093' },
];

function BarChartDemo() {
  return (
    <div style={{ width: '100%', maxWidth: 300, margin: '0 auto', padding: '8px 0' }}>
      <div className="dim-bars">
        {BAR_DATA.map(d => (
          <div key={d.label} style={{ marginBottom: 10 }}>
            <div className="dim-bar-row" style={{ gap: 6 }}>
              <div className="dim-bar-label" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, width: 68, flexShrink: 0 }}>
                {d.icon} {d.label}
              </div>
              <div className="dim-bar-track" style={{ minWidth: 40 }}>
                <div className="dim-bar-fill" style={{
                  width: `${d.pct}%`,
                  background: `linear-gradient(90deg, ${d.color}, ${d.colorDark})`,
                }}>
                  {d.pct >= 10 && `${d.pct}%`}
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink3)', flexShrink: 0, minWidth: 32, textAlign: 'right' }}>{d.pct}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


export default function OnboardingCarousel({ onComplete }) {
  const [page, setPage] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = useCallback((e) => { touchStartX.current = e.touches[0].clientX; touchEndX.current = e.touches[0].clientX; }, []);
  const handleTouchMove = useCallback((e) => { touchEndX.current = e.touches[0].clientX; }, []);
  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && page < PAGES.length - 1) setPage(p => p + 1);
      if (diff < 0 && page > 0) setPage(p => p - 1);
    }
  }, [page]);

  const handleNext = () => { if (page < PAGES.length - 1) setPage(p => p + 1); };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(160deg, #F0EAE2 0%, #F5F1EB 50%, #E8E2D8 100%)',
      display: 'flex', flexDirection: 'column',
      height: '100vh',
      padding: '60px 16px 40px',
      overflow: 'hidden',
    }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 进度指示器 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexShrink: 0, marginBottom: 12 }}>
        {PAGES.map((_, i) => (
          <div key={i} style={{
            width: page === i ? 24 : 8, height: 8, borderRadius: 4,
            background: page === i ? '#C8815C' : '#D6CFC4',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>

      {/* 内容区（flex: 1 撑满，从顶部排列确保内容可见） */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingTop: 6 }}>
        {/* ====== 第1屏：品牌 ====== */}
        {page === 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>{PAGES[0].emoji}</div>
            <div style={{
              fontSize: 22, color: '#C8815C', fontWeight: 800,
              letterSpacing: 6, marginBottom: 6,
              fontFamily: 'var(--font-title)',
            }}>
              {PAGES[0].titleAbove}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#5C5244', lineHeight: 1.5, marginBottom: 16, fontFamily: 'var(--font-title)' }}>
              {PAGES[0].title}
            </h1>
            <p style={{ fontSize: 14, color: '#9B9082', lineHeight: 1.8, maxWidth: 300, margin: '0 auto' }}>
              {PAGES[0].body}
            </p>
          </div>
        )}

        {/* ====== 第2屏：阅读地图 ====== */}
        {page === 1 && (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 360, margin: '0 auto' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#5C5244', lineHeight: 1.5, marginBottom: 12, fontFamily: 'var(--font-title)' }}>
              {PAGES[1].title} 🗺️
            </h1>
            <p style={{ fontSize: 13, color: '#9B9082', lineHeight: 1.8, margin: '0 0 20px' }}>
              <span style={{ color: '#C8815C', fontWeight: 700 }}>{PAGES[1].bodyParts[0]}</span>
              {PAGES[1].bodyParts[1]}
            </p>
            <BarChartDemo />
          </div>
        )}

        {/* ====== 第3屏：行动号召 ====== */}
        {page === 2 && (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 360, margin: '0 auto' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#5C5244', lineHeight: 1.5, marginBottom: 12, fontFamily: 'var(--font-title)' }}>
              {PAGES[2].title} 🎤
            </h1>
            <p style={{ fontSize: 13, color: '#9B9082', lineHeight: 1.8, margin: '0 0 20px' }}>
              {PAGES[2].body}
            </p>
            {/* 深度卡示例 — 深浅融合设计（3:4 长条形） */}
            <div style={{
              maxWidth: 260, minHeight: 300, margin: '0 auto',
              padding: '20px 18px 16px',
              borderRadius: 16, position: 'relative',
              background: '#2C2A28',
              backgroundImage: 'linear-gradient(135deg, rgba(170, 140, 110, 0.08) 0%, rgba(44, 42, 40, 0.9) 60%)',
              boxShadow: '0 8px 32px rgba(44, 36, 22, 0.18), 0 2px 8px rgba(44, 36, 22, 0.1)',
              border: '1px solid rgba(200, 190, 175, 0.08)',
              textAlign: 'left', color: '#E8E2D7',
            }}>
              <div style={{ fontSize: 8, color: '#A39C94', letterSpacing: 0.5, marginBottom: 6 }}>
                示例 · 来自《当怪物来敲门》
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 8, color: '#A39C94', fontWeight: 500, marginBottom: 3, letterSpacing: 0.5 }}>发现</div>
                <div style={{ fontSize: 11, lineHeight: 1.8, color: '#E8E2D7' }}>
                  整本书藏着一个词——『谈一谈』。妈妈、外婆、连怪物巨人都说过。
                </div>
              </div>
              <div style={{ marginBottom: 12, paddingLeft: 10, borderLeft: '2.5px solid #A39C94' }}>
                <div style={{ fontSize: 8, color: '#A39C94', fontWeight: 500, marginBottom: 3, letterSpacing: 0.5 }}>金句</div>
                <div style={{ fontSize: 11, lineHeight: 1.8, color: '#E8E2D7', fontStyle: 'italic' }}>
                  外婆抢走抹布说："我来这里不是为了让小孩去做他不想做的事。" 康纳说："难道你会去擦吗？"
                </div>
              </div>
              <div style={{ marginBottom: 0 }}>
                <div style={{ fontSize: 8, color: '#A39C94', fontWeight: 500, marginBottom: 3, letterSpacing: 0.5 }}>值得思考</div>
                <div style={{ fontSize: 11, lineHeight: 1.8, color: '#E8E2D7' }}>
                  为什么大人要说"谈一谈"，而不是直接说？
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部操作按钮（始终固定在底部） */}
      <div style={{ flexShrink: 0, marginTop: 'auto', textAlign: 'center', paddingTop: 16 }}>
        {page < PAGES.length - 1 && (
          <button onClick={handleNext} style={{
            background: '#C8815C', color: 'white', border: 'none',
            padding: '14px 36px', borderRadius: 12, fontSize: 16, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font)', letterSpacing: 1,
            boxShadow: '0 4px 16px rgba(200,129,92,0.25)',
          }}>
            {page === 1 ? PAGES[1].btnText : PAGES[0].btnText}
          </button>
        )}
        {page === PAGES.length - 1 && (
          <button onClick={onComplete} style={{
            background: 'linear-gradient(135deg, #C8815C, #A56545)', color: 'white', border: 'none',
            padding: '16px 40px', borderRadius: 14, fontSize: 17, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'var(--font)', letterSpacing: 1,
            boxShadow: '0 6px 24px rgba(200,129,92,0.3)',
          }}>
            {PAGES[page].btnText}
          </button>
        )}
        <div style={{ fontSize: 11, color: '#C4BBAE', marginTop: 16 }}>
          因好奇多读，因思考深读
        </div>
      </div>
    </div>
  );
}
