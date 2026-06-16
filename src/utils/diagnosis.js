import { DIMENSIONS, RECOMMEND_DIRECTIONS } from '../data/framework';
import { getDimensionActualPct, getBlindSpots, getMonthlyTrend, getCoverageDetail } from './stats';

// ===== 覆盖度诊断 =====
export function diagnoseCoverage(books) {
  if (books.length === 0) return { severe: [], mild: [], ok: [], summary: '暂无阅读记录' };

  const dimPcts = getDimensionActualPct(books);
  const severe = []; // 严重不足（实际 < 目标50%）
  const mild = [];   // 轻度不足（实际 < 目标80%）
  const ok = [];     // 达标或超出

  dimPcts.forEach(d => {
    if (d.count === 0) {
      severe.push({ ...d, status: 'blank' });
    } else if (d.actualPct < d.pct * 0.5) {
      severe.push({ ...d, status: 'severe' });
    } else if (d.actualPct < d.pct * 0.8) {
      mild.push({ ...d, status: 'mild' });
    } else {
      ok.push({ ...d, status: 'ok' });
    }
  });

  return { severe, mild, ok, dimPcts };
}

// ===== 三级节点盲区检测 =====
export function detectBlindSpots(books) {
  const allSpots = getBlindSpots(books);

  // 按维度分组，只报告已覆盖维度的内部盲区 + 完全空白的维度
  const coveredDims = new Set(books.map(b => b.dimension));
  const internalBlind = allSpots.filter(s => coveredDims.has(s.dimension));
  const emptyDimBlind = allSpots.filter(s => !coveredDims.has(s.dimension));

  return {
    total: allSpots.length,
    internalBlind,    // 已涉足维度内的未覆盖节点
    emptyDimBlind,    // 从未涉足维度的盲区
    all: allSpots,
  };
}

// ===== 月度报告 =====
export function generateMonthlyReport(books) {
  const months = [...new Set(books.map(b => b.month))].sort().reverse();
  const currentMonth = months[0];
  const monthBooks = books.filter(b => b.month === currentMonth);

  const dimsThisMonth = {};
  monthBooks.forEach(b => {
    const d = DIMENSIONS.find(dd => dd.key === b.dimension);
    if (!dimsThisMonth[d?.key]) {
      dimsThisMonth[d?.key] = { label: d?.label, icon: d?.icon, count: 0 };
    }
    dimsThisMonth[d?.key].count++;
  });

  const { severe } = diagnoseCoverage(books);

  return {
    month: currentMonth,
    count: monthBooks.length,
    dims: Object.values(dimsThisMonth),
    uncoveredDims: severe,
    nextMonthHint: severe.slice(0, 3).map(d => ({
      dimKey: d.key,
      label: d.label,
      hint: `建议下月补充 1-2 本「${d.label}」类书籍`,
      directions: RECOMMEND_DIRECTIONS[d.key]?.slice(0, 2) || [],
    })),
  };
}

// ===== 阶段性诊断（累计满20本触发） =====
export function generateMilestoneReport(books) {
  const { severe, mild, ok } = diagnoseCoverage(books);
  const blindSpots = detectBlindSpots(books);

  const suggestions = [];

  // 优先补充完全空白的维度
  const blankDims = severe.filter(d => d.status === 'blank');
  if (blankDims.length > 0) {
    suggestions.push({
      priority: 'high',
      type: 'blank_dim',
      message: `${blankDims.map(d => d.label).join('、')} 尚未涉足，建议优先引入`,
      dims: blankDims,
    });
  }

  // 补充严重不足的维度
  const severeDims = severe.filter(d => d.status === 'severe');
  if (severeDims.length > 0) {
    suggestions.push({
      priority: 'medium',
      type: 'severe',
      message: `${severeDims.map(d => d.label).join('、')} 阅读量严重不足`,
      dims: severeDims,
    });
  }

  // 偏科警告
  const overOk = ok.filter(d => d.actualPct > d.pct * 1.5);
  if (overOk.length > 0) {
    suggestions.push({
      priority: 'info',
      type: 'overfocus',
      message: `${overOk.map(d => d.label).join('、')} 阅读比重偏高，可适当放缓`,
      dims: overOk,
    });
  }

  return {
    totalBooks: books.length,
    dimOverview: { severe, mild, ok },
    blindSpots,
    suggestions,
    isMilestone: books.length >= 20,
  };
}

// ===== 推荐方向生成 =====
export function generateRecommendations(books) {
  const { severe } = diagnoseCoverage(books);
  const recommendations = [];

  severe.forEach(d => {
    const dirs = RECOMMEND_DIRECTIONS[d.key];
    if (dirs) {
      dirs.forEach(dir => {
        const alreadyCovered = books.some(b =>
          b.dimension === d.key && b.level3 === dir.level3
        );
        if (!alreadyCovered) {
          recommendations.push({
            dimension: d.key,
            dimLabel: d.label,
            dimIcon: d.icon,
            dimColor: d.color,
            level2: dir.level2,
            level3: dir.level3,
            hint: dir.hint,
          });
        }
      });
    }
  });

  return recommendations.slice(0, 8);
}
