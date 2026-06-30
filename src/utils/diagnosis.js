import { WHAT_DIMENSIONS, RECOMMEND_DIRECTIONS, HOW_DIMENSIONS, WHAT_TO_HOW, getBookDimension, DEFAULT_AGE_BAND } from '../data/framework';
import { getWhatActualPct, calculateHOW } from './stats';

// ============================================================
// WHAT 五维覆盖度诊断（积极语言）
// ============================================================

/**
 * 诊断内容维度覆盖情况
 * @param {Array} books
 * @param {string} [ageBand] - 年龄段 key，用于获取 benchmark
 * @returns {{ gaps: Array, ok: Array, summary: string }}
 */
export function diagnoseCoverage(books, ageBand) {
  if (books.length === 0) return { gaps: [], ok: [], summary: '暂无阅读记录' };

  const dimPcts = getWhatActualPct(books, ageBand);
  const gaps = []; // 建议补充的维度
  const ok = [];   // 已均衡或超出

  dimPcts.forEach(d => {
    const benchmark = d.benchmark; // getWhatActualPct 已包含 benchmark
    if (d.count === 0) {
      gaps.push({ ...d, benchmark, status: 'untouched', label: '尚未涉足' });
    } else if (d.actualPct < benchmark * 0.6) {
      gaps.push({ ...d, benchmark, status: 'low', label: '值得尝试' });
      // v2.0: "可适当补充" → "值得尝试"
    } else if (d.actualPct < benchmark * 0.9) {
      gaps.push({ ...d, benchmark, status: 'slight', label: '略有空间' });
    } else {
      ok.push({ ...d, benchmark, status: 'ok', label: '均衡' });
    }
  });

  // gaps 排序：未涉足 > 可补充 > 略有空间
  gaps.sort((a, b) => {
    const order = { untouched: 0, low: 1, slight: 2 };
    return (order[a.status] || 3) - (order[b.status] || 3);
  });

  return { gaps, ok, dimPcts };
}

// ============================================================
// HOW 四维报告
// ============================================================

/**
 * 获取 HOW 能力画像
 * 附带每项能力的说明和建议
 */
export function getHowProfile(books) {
  const scores = calculateHOW(books);

  // 按得分排序、附加建议文案
  const withAdvice = scores.map(s => {
    let advice = '';
    switch (s.level) {
      case '强':
        advice = '这是孩子的优势方向，继续保持多样化阅读会更有趣';
        break;
      case '中':
        advice = '有一定基础，可以通过相关题材进一步激发兴趣';
        break;
      case '弱':
        advice = '孩子正在逐步建立这个方向的感觉，慢慢来就好';
        break;
      case '缺':
        advice = '目前接触较少，可以找机会往这个方向轻轻探索一下';
        break;
    }
    return { ...s, advice };
  });

  const sorted = [...withAdvice].sort((a, b) => {
    const lvlOrder = { 强: 0, 中: 1, 弱: 2, 缺: 3 };
    return (lvlOrder[a.level] || 4) - (lvlOrder[b.level] || 4);
  });

  return sorted;
}

// ============================================================
// 推荐方向生成
// ============================================================

/**
 * 根据缺口维度生成推荐
 * @param {Array} books
 * @param {string} [ageBand]
 * @param {string} [depthLevel] - 可选，用于匹配深度层级推荐
 * @returns {Array}
 */
export function generateRecommendations(books, ageBand, depthLevel) {
  const { gaps } = diagnoseCoverage(books, ageBand);
  const recommendations = [];

  gaps.forEach(d => {
    const dirs = RECOMMEND_DIRECTIONS[d.key];
    if (dirs) {
      dirs.forEach(dir => {
        const alreadyCovered = books.some(b =>
          getBookDimension(b) === d.key && b.level2 === dir.level2 && b.level3 === dir.level3
        );
        if (!alreadyCovered) {
          recommendations.push({
            dimKey: d.key,
            dimLabel: d.label,
            dimIcon: d.icon,
            dimColor: d.color,
            level2: dir.level2,
            level3: dir.level3,
            hint: dir.hint,
            gapStatus: d.status,
          });
        }
      });
    }
  });

  // 如有深度层级，可附加推荐说明（后续扩展）
  return recommendations.slice(0, 8);
}

// ============================================================
// v2.0 新增：基于 25% 基准差值阈值触发书单推荐（预留接口）
// ============================================================

/**
 * 判断维度低于基准值 25% 时触发推荐
 * @param {Array} books
 * @param {string} ageBand
 * @returns {Array} [{ dimKey, dimLabel, dimIcon, dimColor, actualPct, benchmark, directions }]
 */
export function getGapRecommendations(books, ageBand) {
  if (books.length === 0) return [];
  const { gaps } = diagnoseCoverage(books, ageBand);
  // 低于基准值 25%+ 的维度：status 为 'untouched' 或 'low'
  const triggerDims = gaps.filter(d => d.status === 'untouched' || d.status === 'low');
  const recs = [];
  triggerDims.forEach(d => {
    const dirs = RECOMMEND_DIRECTIONS[d.key];
    if (dirs) {
      recs.push({
        dimKey: d.key,
        dimLabel: d.label,
        dimIcon: d.icon,
        dimColor: d.color,
        actualPct: d.actualPct,
        benchmark: d.benchmark,
        directions: dirs.slice(0, 3),
      });
    }
  });
  return recs;
}

// ============================================================
// 月度/阶段性报告
// ============================================================

export function generateMonthlyReport(books) {
  const months = [...new Set(books.map(b => b.month))].sort().reverse();
  const currentMonth = months[0];
  const monthBooks = books.filter(b => b.month === currentMonth);

  const dimsThisMonth = {};
  monthBooks.forEach(b => {
    const d = WHAT_DIMENSIONS.find(dd => dd.key === getBookDimension(b));
    if (!dimsThisMonth[d?.key]) {
      dimsThisMonth[d?.key] = { label: d?.label, icon: d?.icon, count: 0 };
    }
    dimsThisMonth[d?.key].count++;
  });

  return {
    month: currentMonth,
    count: monthBooks.length,
    dims: Object.values(dimsThisMonth),
  };
}
