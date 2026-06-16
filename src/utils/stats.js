import { DIMENSIONS } from '../data/framework';

// 总阅读本数
export function getTotalBooks(books) {
  return books.length;
}

// 各维度本数分布
export function getDimensionDistribution(books) {
  const dist = {};
  DIMENSIONS.forEach(d => {
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
    if (dist[b.dimension]) dist[b.dimension].count++;
  });
  return Object.values(dist);
}

// 各维度实际比重（%）
export function getDimensionActualPct(books) {
  const total = books.length || 1;
  return getDimensionDistribution(books).map(d => ({
    ...d,
    actualPct: +((d.count / total) * 100).toFixed(1),
    diff: +((d.count / total) * 100 - d.pct).toFixed(1),
  }));
}

// 月度阅读量趋势
export function getMonthlyTrend(books) {
  const months = {};
  const sorted = [...books].sort((a, b) => a.month.localeCompare(b.month));
  sorted.forEach(b => {
    const m = b.month; // YYYY-MM
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

// 各维度三级节点覆盖情况
export function getCoverageDetail(books) {
  const dims = {};
  DIMENSIONS.forEach(d => {
    const l2map = {};
    d.children.forEach(l2 => {
      const l3set = new Set();
      books
        .filter(b => b.dimension === d.key && b.level2 === l2.key)
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
      bookCount: books.filter(b => b.dimension === d.key).length,
      level2: l2map,
    };
  });
  return dims;
}

// 获取盲区：未覆盖的三级节点
export function getBlindSpots(books) {
  const coverage = getCoverageDetail(books);
  const spots = [];
  DIMENSIONS.forEach(d => {
    d.children.forEach(l2 => {
      l2.children.forEach(l3 => {
        const hasBook = books.some(b =>
          b.dimension === d.key && b.level2 === l2.key && b.level3 === l3
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

// 孩子平均评分
export function getAvgChildStar(books) {
  const rated = books.filter(b => b.childStar > 0);
  if (rated.length === 0) return 0;
  return (rated.reduce((s, b) => s + b.childStar, 0) / rated.length).toFixed(1);
}


// 各维度内二级分类分布
export function getLevel2Distribution(books) {
  const result = {};
  books.forEach(b => {
    if (!result[b.dimension]) result[b.dimension] = {};
    if (!result[b.dimension][b.level2]) result[b.dimension][b.level2] = 0;
    result[b.dimension][b.level2]++;
  });
  return result;
}
