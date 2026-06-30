// ============================================================
// HomePage — 个人主页（v2.0 条件渲染）
// 基于录入书本数动态展示：
//   0本 → 添加按钮
//   1-4本 → 进度条
//   5本+ → 雷达图 + 引导气泡
// 不修改任何录书接口/雷达计算/存储逻辑
// ============================================================
import { useMemo } from 'react';
import { useReading } from '../../context/ReadingContext';
import { WHAT_DIMENSIONS } from '../../data/framework';
import { getWhatActualPct } from '../../utils/stats';

export default function HomePage() {
  const { books, setActiveTab, mapUnlocked } = useReading();
  const count = books.length;

  // ---- 雷达图数据（仅在解锁后计算） ----
  const radarData = useMemo(() => {
    if (!mapUnlocked || count < 5) return null;
    return getWhatActualPct(books);
  }, [books, mapUnlocked, count]);

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
  if (count > 0 && count < 5 && !mapUnlocked) {
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

  return (
    <div style={{ padding: '12px 0' }}>
      {/* 五维雷达图（卡片化，标题在左上角） */}
      <div className="card" style={{ padding: '16px 14px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-title)', marginBottom: 12 }}>
          🗺️ 阅读地图
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

      {/* 个性化书单占位 */}
      <div className="card" style={{ padding: '16px', marginTop: 10 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, fontFamily: 'var(--font-title)' }}>
          📚 个性化书单
        </h3>
        <div style={{ fontSize: 11, color: 'var(--ink3)', lineHeight: 1.6, textAlign: 'center', padding: '12px 0' }}>
          已录入 {count} 本，专属书单即将上线，敬请期待！
        </div>
      </div>

      {/* 引导气泡 */}
      <div onClick={() => setActiveTab('voice_record')} style={{
        marginTop: 12, padding: '12px 16px', borderRadius: 14,
        background: 'linear-gradient(135deg, #FDF0E0, #FFF8F0)',
        border: '1px solid rgba(200,129,92,0.2)',
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
      }}>
        <div style={{ fontSize: 28 }}>🎤</div>
        <div style={{ fontSize: 12, color: '#5C5244', lineHeight: 1.6, flex: 1 }}>
          <strong>听听孩子怎么说 →</strong>
        </div>
        <div style={{ fontSize: 16, color: '#C8815C' }}>→</div>
      </div>

      {/* 探索详细报告入口 */}
      <div onClick={() => setActiveTab('diagnosis')} style={{
        marginTop: 10, padding: '12px 16px', borderRadius: 14,
        background: 'var(--card)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
      }}>
        <div style={{ fontSize: 28 }}>📊</div>
        <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.6, flex: 1 }}>
          查看详细的<strong>能力画像报告</strong> —— 认知能力、内容广度、推荐书单
        </div>
        <div style={{ fontSize: 16, color: '#C8815C' }}>→</div>
      </div>
    </div>
  );
}
