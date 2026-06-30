import { useMemo, useState, useCallback } from 'react';
import { useReading } from '../../context/ReadingContext';
import { WHAT_DIMENSIONS, getBenchmark } from '../../data/framework';
import { getTotalBooks, getWhatActualPct, getCoveredWhatDims, getMonthlyTrend } from '../../utils/stats';
import { diagnoseCoverage, generateRecommendations, getHowProfile } from '../../utils/diagnosis';
import { CURATED_BOOKLISTS } from '../../data/curatedBooklists';
import '../../styles/diagnosis.css';

/** 正向标签映射（用户友好版） */
const POSITIVE_LABELS = {
  strong: { label: '优势项', color: '#3D7A4F', bg: '#E8F5E9' },
  medium: { label: '基础扎实', color: '#6B8F5E', bg: '#F0F5ED' },
  gentle: { label: '可加强', color: '#E88D67', bg: '#FBE9E7' },
  explore: { label: '待拓展', color: '#A69B8E', bg: '#F5F5F5' },
};

function getPositiveLabel(level) {
  switch (level) {
    case '强': return POSITIVE_LABELS.strong;
    case '中': return POSITIVE_LABELS.medium;
    case '弱': return POSITIVE_LABELS.gentle;
    case '缺': return POSITIVE_LABELS.explore;
    default: return POSITIVE_LABELS.explore;
  }
}

/** 生成一句话综合评价 */
function generateSummary(howProfile, sortedDims, gaps) {
  if (!howProfile || howProfile.length === 0) return '';
  const strongOnes = howProfile.filter(h => h.level === '强');
  const mediumOnes = howProfile.filter(h => h.level === '中');
  const parts = [];
  if (sortedDims.length > 0 && sortedDims[0].count > 0) {
    parts.push('阅读侧重' + sortedDims[0].icon + sortedDims[0].label);
  }
  if (gaps.length > 0) {
    parts.push('可拓展' + gaps.slice(0, 2).map(g => {
      const dim = WHAT_DIMENSIONS.find(d => d.key === g.key);
      return dim?.label || g.key;
    }).join('、'));
  }
  if (strongOnes.length > 0) {
    parts.push(strongOnes.map(h => h.label).join('、') + '表现突出');
  } else if (mediumOnes.length > 0) {
    parts.push(mediumOnes.map(h => h.label).join('、') + '方向有潜力');
  }
  return parts.join('，') + '。';
}

export default function DiagnosisPage() {
  const { books, setActiveTab } = useReading();
  const [ageBand] = useState('7-9');
  const [theoryOpen, setTheoryOpen] = useState(false);

  // === WHAT 数据 ===
  const totalBooks = useMemo(() => getTotalBooks(books), [books]);
  const coveredDims = useMemo(() => getCoveredWhatDims(books), [books]);
  const whatPcts = useMemo(() => getWhatActualPct(books), [books]);
  const sortedDims = useMemo(() => [...whatPcts].sort((a, b) => b.count - a.count), [whatPcts]);
  const monthly = useMemo(() => getMonthlyTrend(books), [books]);

  // === HOW 数据 ===
  const howProfile = useMemo(() => getHowProfile(books), [books]);

  // === 探索方向 + 推荐 ===
  const { gaps } = useMemo(() => diagnoseCoverage(books, ageBand), [books, ageBand]);
  const recommendations = useMemo(() => generateRecommendations(books, ageBand), [books, ageBand]);

  // 找精选书单
  const getBooklist = useCallback((rec) => {
    const dimKey = rec.dimKey;
    const l2Label = rec.level2;
    const l3Label = rec.level3;
    const dimLists = CURATED_BOOKLISTS[dimKey];
    if (!dimLists) return null;
    const l2Entry = Object.entries(dimLists).find(([key]) => key === l2Label);
    if (!l2Entry) return null;
    const [, l3Map] = l2Entry;
    const l3Entry = Object.entries(l3Map).find(([key]) => key === l3Label);
    if (l3Entry) return l3Entry[1];
    const firstL3 = Object.values(l3Map)[0];
    return firstL3 || null;
  }, []);

  if (books.length === 0) {
    return (
      <div className="diag-empty">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#A0795A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12, display: 'block' }}>
          <path d="M9 18h6" /><path d="M10 22h4" />
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
        </svg>
        <div className="diag-empty-title">暂无能力画像数据</div>
        <div className="diag-empty-desc">先录入一些书目，能力画像报告会自动生成</div>
      </div>
    );
  }

  // 满5本书才能解锁完整报告
  if (books.length < 5) {
    const allDimOptions = [
      { key: 'narrative', label: '文学叙事', icon: '📖' },
      { key: 'science', label: '自然科学', icon: '🌿' },
      { key: 'humanity', label: '人文社会', icon: '🏛️' },
      { key: 'art_create', label: '艺术创想', icon: '🎨' },
      { key: 'self_growth', label: '自我成长', icon: '🧘' },
    ];
    const covered = new Set(books.map(b => b.dimension).filter(Boolean));
    const uncovered = allDimOptions.filter(d => !covered.has(d.key));

    return (
      <div style={{
        padding: '32px 16px calc(80px + env(safe-area-inset-bottom))',
        textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
      }}>
        {/* 解锁进度 */}
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#A0795A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12, display: 'block' }}>
          <path d="M9 18h6" /><path d="M10 22h4" />
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
        </svg>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 6, fontFamily: 'var(--font-title)' }}>
          能力画像报告
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 20, lineHeight: 1.6 }}>
          {books.length === 0
            ? '录入 5 本书后，自动生成孩子的专属阅读分析报告'
            : `再录 ${5 - books.length} 本即可解锁完整报告`
          }
        </div>

        {/* 进度条 */}
        <div style={{ maxWidth: 280, margin: '0 auto 24px', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink3)', marginBottom: 4 }}>
            <span>解锁进度</span>
            <span>{books.length}/5</span>
          </div>
          <div style={{ width: '100%', height: 10, background: '#EBE6DF', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{
              width: (books.length / 5) * 100 + '%', height: '100%',
              background: 'linear-gradient(90deg, #C8815C, #A56545)',
              borderRadius: 5, transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* 快捷操作区：已覆盖 / 未覆盖维度提示 + 录入入口 */}
        <div style={{ maxWidth: 320, margin: '0 auto' }}>
          {/* 已覆盖维度 */}
          {covered.size > 0 && (
            <div style={{ marginBottom: 14, textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 6 }}>✅ 已覆盖的维度</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allDimOptions.filter(d => covered.has(d.key)).map(d => (
                  <span key={d.key} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 6,
                    background: '#EAF1ED', color: '#5E7E6E', fontWeight: 500,
                  }}>
                    {d.icon} {d.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 待拓展维度 + 快速录入引导 */}
          {uncovered.length > 0 && books.length >= 1 && (
            <div style={{ marginBottom: 20, textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 6 }}>🎯 试试拓展这些维度</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {uncovered.map(d => (
                  <span key={d.key} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 6,
                    background: '#F3EDE0', color: '#B89450', fontWeight: 500,
                  }}>
                    {d.icon} {d.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 录入入口按钮 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {books.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.6, marginBottom: 4 }}>
                点击下方按钮，开始记录孩子的第一本书 📝
              </div>
            ) : null}
            <button
              className="btn-primary"
              style={{ width: '100%', padding: 14, fontSize: 15 }}
              onClick={() => setActiveTab('record')}
            >
              {books.length === 0 ? '📝 录入第一本书' : '📝 继续录入'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="diag-page">

      {/* ======== 核心洞察 ======== */}
      <div className="diag-card" style={{ padding: '14px 16px', marginBottom: 16, background: 'var(--card2)' }}>
        <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.8 }}>
          {generateSummary(howProfile, sortedDims, gaps)}
        </div>
      </div>

      {/* ======== 认知雷达 ======== */}
      <div className="diag-section-header" style={{ marginTop: 20 }}>
        <h2 className="diag-section-title" style={{ marginBottom: 0 }}>🤝 认知雷达</h2>
        <span className="diag-theory-capsule" onClick={() => setTheoryOpen(true)}>
          📋 理论基础 ↗
        </span>
      </div>
      <p style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 6, marginBottom: 14 }}>
        基于孩子{totalBooks}本书的阅读结构 · 反映认知能力的均衡度
      </p>
      <div className="how-grid">
        {howProfile.map(h => {
          const scoreBar = Math.min(h.score, 100);
          const badge = getPositiveLabel(h.level);
          return (
            <div key={h.key} className="how-card" style={{ borderColor: h.color + '33' }}>
              <div className="how-card-header">
                <span style={{ fontSize: 18, flexShrink: 0 }}>{h.icon}</span>
                <div className="how-card-info">
                  <div className="how-card-title">{h.label}</div>
                  <div className="how-card-desc">{h.desc}</div>
                </div>
                <span className="how-level-badge" style={{
                  background: badge.bg,
                  color: badge.color,
                }}>
                  {badge.label}
                </span>
              </div>
              <div className="how-bar-track">
                <div className="how-bar-fill" style={{
                  width: `${scoreBar}%`,
                  background: `linear-gradient(90deg, ${h.color}88, ${h.color})`,
                }} />
              </div>
              <div className="how-advice">{h.advice}</div>
            </div>
          );
        })}
      </div>

      {/* ======== 理论基础弹窗 ======== */}
      {theoryOpen && (
        <div className="modal-overlay" onClick={() => setTheoryOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, borderRadius: '18px 18px 0 0', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-title)' }}>📋 理论基础</h3>
              <button onClick={() => setTheoryOpen(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--ink3)' }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.8 }}>
              <p style={{ marginBottom: 12 }}>
                好读的阅读分析模型基于以下教育理论框架构建：
              </p>
              <ul style={{ paddingLeft: 18, margin: 0, listStyle: 'none' }}>
                <li style={{ marginBottom: 10, display: 'flex', gap: 6 }}>
                  <span style={{ color: 'var(--accent)' }}>•</span>
                  <div><strong>IB MYP</strong>（国际文凭中学项目）— 维度均衡分布逻辑</div>
                </li>
                <li style={{ marginBottom: 10, display: 'flex', gap: 6 }}>
                  <span style={{ color: 'var(--accent)' }}>•</span>
                  <div><strong>义务教育课程方案（2022版）</strong>— 内容深度参考</div>
                </li>
                <li style={{ marginBottom: 10, display: 'flex', gap: 6 }}>
                  <span style={{ color: 'var(--accent)' }}>•</span>
                  <div><strong>北师大 5C 模型（2018）</strong>— HOW 能力副轴标注</div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ======== 阅读版图 ======== */}
      <div className="diag-section-header" style={{ marginTop: 24 }}>
        <h2 className="diag-section-title" style={{ marginBottom: 0 }}>🗺️ 阅读地图</h2>
        <span style={{ fontSize: 10, color: 'var(--ink3)', fontWeight: 400 }}>（10 岁）</span>
      </div>
      <div className="diag-card">
        <div className="dim-bars">
          {sortedDims.map(d => {
            const benchmark = getBenchmark(d.key, ageBand);
            const diff = d.actualPct - benchmark;
            let statusText = '';
            let statusColor = '';
            if (d.count === 0) { statusText = '待拓展'; statusColor = 'var(--ink3)'; }
            else if (diff < -5) { statusText = `渐入 ${Math.round(Math.abs(diff))}%`; statusColor = '#E88D67'; }
            else if (diff > 5) { statusText = `领先 ${Math.round(diff)}%`; statusColor = '#5A9E6F'; }
            else { statusText = '均衡'; statusColor = '#6B8F5E'; }

            return (
              <div key={d.key} className="dim-bar-row">
                <div className="dim-bar-label" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {d.icon} {d.label}
                </div>
                <div className="dim-bar-track">
                  <div className="dim-bar-fill" style={{
                    width: `${Math.min(d.actualPct, 100)}%`,
                    background: `linear-gradient(90deg, ${d.color}, ${d.colorDark})`,
                  }}>
                    {d.actualPct >= 10 && `${d.actualPct}%`}
                  </div>
                  <div className="dim-bar-target" style={{ left: `${Math.min(benchmark, 100)}%` }} />
                </div>
                <div className="dim-bar-count">
                  <span style={{ fontSize: 9, color: statusColor, fontWeight: 600 }}>{statusText}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#C4BBAE', marginTop: 4, paddingLeft: 86 }}>
          <span>━ 参考比例（{ageBand}）</span>
          <span>实际 %</span>
        </div>
      </div>

      {/* ======== 阅读趋势（柱状图） ======== */}
      {monthly.length > 0 && (
        <>
          <h2 className="diag-section-title" style={{ marginTop: 24 }}>📈 阅读趋势</h2>
          <div className="diag-card">
            <div style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 10, fontWeight: 500 }}>
              累计 {totalBooks} 本
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
              {(() => {
                const latestMonth = monthly.reduce((latest, m) => m.month > latest ? m.month : latest, '');
                if (!latestMonth) return null;
                const [year, monthNum] = latestMonth.split('-').map(Number);
                const months = [];
                for (let i = 5; i >= 0; i--) {
                  let m = monthNum - i;
                  let y = year;
                  if (m <= 0) { m += 12; y -= 1; }
                  const key = y + '-' + String(m).padStart(2, '0');
                  const found = monthly.find(x => x.month === key);
                  months.push({ month: key, count: found ? found.count : 0 });
                }
                const maxAll = Math.max(...months.map(x => x.count), 1);
                return months.map(m => {
                  const pct = (m.count / maxAll) * 100;
                  return (
                    <div key={m.month} style={{
                      flex: 1, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'flex-end', gap: 2, height: '100%'
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: m.count > 0 ? '#C47A6E' : '#D6CFC4', lineHeight: 1 }}>
                        {m.count}
                      </span>
                      <div style={{
                        width: '70%', maxWidth: 28, height: pct + '%', minHeight: m.count > 0 ? 4 : 2,
                        borderRadius: '3px 3px 1px 1px',
                        background: m.count > 0 ? '#C8815C' : '#F0EBE4',
                        opacity: m.count > 0 ? Math.min(1, 0.3 + pct / 100) : 0.3,
                      }} />
                      <span style={{ fontSize: 8, color: m.count > 0 ? '#5C5244' : '#D6CFC4', minWidth: 22, textAlign: 'center' }}>
                        {m.month.replace(/^\d+-/, '').replace(/^0/, '')}月
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </>
      )}

      {/* ======== 拓展阅读（水平滑动 Carousel） ======== */}
      {gaps.length > 0 && (
        <>
          <h2 className="diag-section-title" style={{ marginTop: 24 }}>📖 拓展阅读</h2>
          <div style={{ marginBottom: 8 }}>
            {gaps.map(d => {
              const dimDef = WHAT_DIMENSIONS.find(dd => dd.key === d.key);
              const dimRecs = recommendations.filter(r => r.dimKey === d.key);
              if (dimRecs.length === 0) return null;

              return (
                <div key={d.key} style={{ marginBottom: 14 }}>
                  {/* 维度标题行 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '0 2px' }}>
                    <span style={{ fontSize: 16 }}>{d.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-title)' }}>
                      {dimDef?.label || d.key}
                    </span>
                    <span className="diag-gap-badge" style={{
                      background: d.status === 'untouched' ? 'var(--red-light)' : 'var(--yellow-light)',
                      color: d.status === 'untouched' ? 'var(--red)' : 'var(--yellow)',
                    }}>
                      {d.label}
                    </span>
                  </div>

                  {/* 水平滑动容器 */}
                  <div style={{
                    display: 'flex', gap: 8, overflowX: 'auto',
                    scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
                    padding: '2px 4px 8px',
                    margin: '-2px -4px -8px',
                  }}>
                    {dimRecs.slice(0, 5).map((rec, i) => {
                      const booklist = getBooklist(rec);
                      return (
                        <div key={i} style={{
                          flex: '0 0 44%', minWidth: 148,
                          scrollSnapAlign: 'start',
                          background: 'var(--card2)', borderRadius: 10,
                          border: '1px solid var(--border)',
                          padding: '12px 10px',
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                            {rec.level3 || rec.level2}
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--ink3)', marginBottom: 8 }}>
                            {rec.level2}
                          </div>

                          {/* 书列表（最多2本） */}
                          {booklist && booklist.slice(0, 2).map((book, j) => (
                            <div key={j} style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '5px 0', borderTop: j > 0 ? '1px dashed var(--border)' : 'none',
                            }}>
                              <span style={{ fontSize: 16, flexShrink: 0 }}>📘</span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {book.title}
                                </div>
                                <div style={{ fontSize: 8, color: 'var(--ink3)' }}>
                                  {book.author}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* 无书时展示方向提示 */}
                          {!booklist && (
                            <div style={{ fontSize: 9, color: 'var(--ink3)', fontStyle: 'italic' }}>
                              {rec.hint}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {gaps.length === 0 && (
        <div className="diag-banner" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
          <h3 style={{ margin: '0 0 4px', color: 'var(--ink)' }}>各维度发展均衡</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink3)' }}>
            孩子目前在各个阅读维度上分布比较均衡，继续保持即可
          </p>
        </div>
      )}

    </div>
  );
}
