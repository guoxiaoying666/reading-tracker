// ============================================================
// HomePage — 个人主页（v2.0 条件渲染）
// 基于录入书本数动态展示：
//   0本 → 添加按钮
//   1-4本 → 进度条
//   5本+ → 雷达图 + 3个卡片模块
// 不修改任何录书接口/雷达计算/存储逻辑
// ============================================================
import { useMemo, useState } from 'react';
import { useReading } from '../../context/ReadingContext';
import { WHAT_DIMENSIONS } from '../../data/framework';
import { getWhatActualPct } from '../../utils/stats';
import { generateRecommendations } from '../../utils/diagnosis';
import RecommendedBookCard from '../common/RecommendedBookCard';
import BookDetailDrawer from '../common/BookDetailDrawer';

export default function HomePage() {
  const { books, setActiveTab } = useReading();
  const count = books.length;

  // ---- 雷达图数据（满5本后计算） ----
  const radarData = useMemo(() => {
    if (count < 5) return null;
    return getWhatActualPct(books);
  }, [books, count]);

  // ============ 状态0：0本书 ============
  if (count === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📚</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, fontFamily: 'var(--font-title)' }}>
          还没有记录
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink3)', lineHeight: 1.7, marginBottom: 28 }}>
          记录孩子正在读的书，发现TA的成长方向。
        </p>
        <button onClick={() => setActiveTab('record')} style={{
          background: '#C8815C', color: 'white', border: 'none',
          padding: '14px 36px', borderRadius: 12, fontSize: 16, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--font)', letterSpacing: 1,
          boxShadow: '0 4px 16px rgba(200,129,92,0.25)',
        }}>
          ✍️ 添加书本
        </button>
      </div>
    );
  }

  // ============ 状态1-4：进度条 ============
  if (count > 0 && count < 5) {
    return (
      <div style={{ padding: '20px 0' }}>
        {/* 进度条 */}
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px 20px', border: '1px solid var(--border)', textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
            阅读地图生成中
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 16 }}>
            已录入 {count}/5 本 · {count >= 5 ? '' : `再录 ${5 - count} 本，地图即将点亮。`}
          </div>
          <div style={{ width: '100%', maxWidth: 280, margin: '0 auto', height: 10, background: '#EBE6DF', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{
              width: `${(count / 5) * 100}%`, height: '100%',
              background: 'linear-gradient(90deg, #C8815C, #A56545)',
              borderRadius: 5, transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* 快捷入口 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div onClick={() => setActiveTab('record')} style={{
            flex: 1, background: 'var(--card)', borderRadius: 14, padding: '16px 12px',
            border: '1px solid var(--border)', textAlign: 'center', cursor: 'pointer',
          }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>✍️</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)' }}>继续录入</div>
          </div>
          <div onClick={() => setActiveTab('bookshelf')} style={{
            flex: 1, background: 'var(--card)', borderRadius: 14, padding: '16px 12px',
            border: '1px solid var(--border)', textAlign: 'center', cursor: 'pointer',
          }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>📚</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)' }}>查看书架</div>
          </div>
        </div>
      </div>
    );
  }

  // ============ 状态5+：地图已解锁，显示雷达图 ============
  const sortedDims = radarData ? [...radarData].sort((a, b) => b.count - a.count) : [];

  // 【已修复】原来这里调用 flattenCuratedBooks() 展示的是固定不变的静态书单，
  // 跟"阅读洞察"页的"拓展阅读"完全是两套独立逻辑：一个人人一样，
  // 一个按孩子五维缺口个性化推荐——两处内容对不上，用户会疑惑是不是同一个功能。
  // 现在改成调用同一套 generateRecommendations 引擎，首页只展示精简的前3个结果，
  // 阅读洞察页展示完整版，两处数据来源统一。
  const personalizedRecs = useMemo(() => {
    if (count < 5) return [];
    return generateRecommendations(books).slice(0, 3).map(r => r.book).filter(Boolean);
  }, [books, count]);

  const [detailBook, setDetailBook] = useState(null);

  return (
    <div style={{ padding: '12px 0' }}>
      {/* 模块一：阅读地图 + 一句话洞察 */}
      <div className="card" style={{ padding: '16px 14px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-title)', marginBottom: 12 }}>
          🗺️ 阅读地图
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.8, marginBottom: 14, padding: '10px 12px', background: 'var(--card2)', borderRadius: 10 }}>
          阅读侧重文学叙事，可拓展自然科学、自我成长，人际共情、逻辑探究、创造表达方向有潜力。
        </div>
        <div className="dim-bars">
          {sortedDims.map(d => {
            const dimDef = WHAT_DIMENSIONS.find(dd => dd.key === d.key);
            return (
              <div key={d.key} style={{ marginBottom: 10 }}>
                <div className="dim-bar-row">
                  <div className="dim-bar-label" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    {dimDef?.icon} {d.label}
                  </div>
                  <div className="dim-bar-track">
                    <div className="dim-bar-fill" style={{
                      width: `${Math.min(d.actualPct, 100)}%`,
                      background: `linear-gradient(90deg, ${d.color}, ${d.colorDark})`,
                    }}>
                      {d.actualPct >= 10 && `${d.actualPct}%`}
                    </div>
                    <div className="dim-bar-target" style={{ left: `${Math.min(d.pct, 100)}%` }} />
                  </div>
                  <div className="dim-bar-count">{d.count}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#C4BBAE', marginTop: 4, paddingLeft: 86 }}>
          <span>━ 参考占比</span>
          <span>本数</span>
        </div>
      </div>

      {/* 模块二：为你拓展（个性化推荐，与阅读洞察页共用同一套引擎，仅展示精简版） */}
      <div onClick={() => {
        localStorage.setItem('wonderead-scroll-to', 'recommendations');
        setActiveTab('diagnosis');
      }} className="card" style={{ padding: '16px', marginTop: 10, cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-title)', margin: 0 }}>
              🧭 为你拓展
            </h3>
            <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 2 }}>根据阅读地图为你推荐</div>
          </div>
          <span style={{ fontSize: 16, color: '#C8815C' }}>→</span>
        </div>
        {personalizedRecs.length > 0 ? (
          <RecommendedBookCard books={personalizedRecs} onClickBook={(b) => setDetailBook(b)} />
        ) : (
          <div style={{ fontSize: 11, color: "var(--ink3)", lineHeight: 1.6, marginTop: 8 }}>
            孩子目前各维度阅读比较均衡，继续保持即可 🎉
          </div>
        )}
        <div style={{ fontSize: 10, color: '#C8815C', marginTop: 10, fontWeight: 500 }}>查看完整拓展书单 →</div>
      </div>

      <div onClick={() => {
        localStorage.setItem('wonderead-focus-isbn', 'true');
        setActiveTab('record');
      }} className="card" style={{ padding: '16px', marginTop: 10, cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-title)', margin: 0 }}>
              📚 继续录入新书
            </h3>
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>
              记录更多书籍，阅读地图将更精准。
            </div>
          </div>
          <span style={{ fontSize: 16, color: '#C8815C' }}>→</span>
        </div>
      </div>
      {detailBook && (
        <BookDetailDrawer book={detailBook} onClose={() => setDetailBook(null)} />
      )}
    </div>
  );
}
