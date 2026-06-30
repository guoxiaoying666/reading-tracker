import { WHAT_DIMENSIONS, HOW_DIMENSIONS, WHAT_TO_HOW, getBookDimension, getBenchmark } from '../data/framework';

// ============================================================
// WHAT 五维统计函数（兼容旧七维数据，自动映射）
// ============================================================

// 总阅读本数
export function getTotalBooks(books) {
  return books.length;
}

// 各WHAT维度本数分布（自动迁移旧维度）
export function getWhatDistribution(books) {
  const dist = {};
  WHAT_DIMENSIONS.forEach(d => {
    dist[d.key] = {
      key: d.key,
      label: d.label,
      icon: d.icon,
      color: d.color,
      colorDark: d.colorDark,
      pct: d.pct,
      count: 0,
    };
  });
  books.forEach(b => {
    const dimKey = getBookDimension(b);
    if (dist[dimKey]) dist[dimKey].count++;
  });
  return Object.values(dist);
}

// 各WHAT维度实际比重（%）+ 可传入年龄段基准
export function getWhatActualPct(books, ageBand) {
  const total = books.length || 1;
  return getWhatDistribution(books).map(d => {
    const benchmark = getBenchmark(d.key, ageBand);
    const actualPct = +((d.count / total) * 100).toFixed(1);
    return {
      ...d,
      actualPct,
      benchmark,
      diff: +((d.count / total) * 100 - benchmark).toFixed(1),
    };
  });
}

// 已覆盖的WHAT维度数
export function getCoveredWhatDims(books) {
  return new Set(books.map(b => getBookDimension(b))).size;
}

// ============================================================
// HOW 四维计算（由 WHAT 自动权重映射）
// ============================================================

/**
 * 计算 HOW 四维能力得分
 * 每本书按其 WHAT 维度映射到 HOW，乘以权重，
 * 最后归一化为百分比（0-100）
 */
export function calculateHOW(books) {
  if (books.length === 0) {
    return HOW_DIMENSIONS.map(d => ({ ...d, score: 0, level: '缺' }));
  }

  // 四维原始累计分
  const raw = {};
  HOW_DIMENSIONS.forEach(d => { raw[d.key] = 0; });

  // 每本书按 WHAT→HOW 映射加权
  books.forEach(b => {
    const dimKey = getBookDimension(b);
    const mapping = WHAT_TO_HOW[dimKey];
    if (!mapping) return;
    Object.entries(mapping).forEach(([howKey, weight]) => {
      if (raw[howKey] !== undefined) raw[howKey] += weight;
    });
  });

  // 归一化：每维最高得分为 books.length
  const maxScore = books.length;
  const scores = HOW_DIMENSIONS.map(d => {
    const rawScore = raw[d.key] || 0;
    const score = maxScore > 0 ? +((rawScore / maxScore) * 100).toFixed(1) : 0;

    // 等级评定
    let level;
    if (score === 0) level = '缺';
    else if (score < 20) level = '弱';
    else if (score < 50) level = '中';
    else level = '强';

    return { ...d, score, rawScore, level };
  });

  return scores;
}

// ============================================================
// 其他统计（兼容）
// ============================================================

// 月度阅读量趋势
export function getMonthlyTrend(books) {
  const months = {};
  const sorted = [...books].sort((a, b) => a.month.localeCompare(b.month));
  sorted.forEach(b => {
    const m = b.month;
    if (!months[m]) months[m] = { month: m, count: 0 };
    months[m].count++;
  });
  return Object.values(months);
}

// 来源分布
export function getSourceDistribution(books) {
  const sources = {};
  books.forEach(b => {
    const s = b.source || '其他';
    sources[s] = (sources[s] || 0) + 1;
  });
  return Object.entries(sources).map(([name, count]) => ({ name, count }));
}

// 各WHAT维度内二级分类分布
export function getLevel2Distribution(books) {
  const result = {};
  books.forEach(b => {
    const dimKey = getBookDimension(b);
    if (!result[dimKey]) result[dimKey] = {};
    if (!result[dimKey][b.level2]) result[dimKey][b.level2] = 0;
    result[dimKey][b.level2]++;
  });
  return result;
}

// 孩子平均评分
export function getAvgChildStar(books) {
  const rated = books.filter(b => b.childStar > 0);
  if (rated.length === 0) return 0;
  return (rated.reduce((s, b) => s + b.childStar, 0) / rated.length).toFixed(1);
}

// 各WHAT维度三级节点覆盖情况
export function getCoverageDetail(books) {
  const bookDims = books.map(b => ({ ...b, _dimKey: getBookDimension(b) }));
  const dims = {};
  WHAT_DIMENSIONS.forEach(d => {
    const l2map = {};
    d.children.forEach(l2 => {
      const l3set = new Set();
      bookDims
        .filter(b => b._dimKey === d.key && b.level2 === l2.key)
        .forEach(b => { if (b.level3) l3set.add(b.level3); });
      l2map[l2.key] = {
        label: l2.label,
        total: l2.children.length,
        covered: l3set.size,
        nodes: l2.children.map(l3 => ({
          label: l3,
          covered: l3set.has(l3),
        })),
      };
    });
    dims[d.key] = {
      label: d.label,
      icon: d.icon,
      color: d.color,
      pct: d.pct,
      bookCount: bookDims.filter(b => b._dimKey === d.key).length,
      level2: l2map,
    };
  });
  return dims;
}

// 获取盲区
export function getBlindSpots(books) {
  const coverage = getCoverageDetail(books);
  const spots = [];
  WHAT_DIMENSIONS.forEach(d => {
    d.children.forEach(l2 => {
      l2.children.forEach(l3 => {
        const hasBook = books.some(b =>
          getBookDimension(b) === d.key && b.level2 === l2.key && b.level3 === l3
        );
        if (!hasBook) {
          spots.push({
            dimension: d.key,
            dimLabel: d.label,
            dimIcon: d.icon,
            dimColor: d.color,
            level2: l2.key,
            l2Label: l2.label,
            level3: l3,
          });
        }
      });
    });
  });
  return spots;
}

// 已覆盖的月份列表
export function getMonths(books) {
  return [...new Set(books.map(b => b.month))].sort().reverse();
}
