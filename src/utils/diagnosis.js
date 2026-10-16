import { WHAT_DIMENSIONS, HOW_DIMENSIONS, WHAT_TO_HOW, getBookDimension, DEFAULT_AGE_BAND } from '../data/framework';
import { getWhatActualPct, calculateHOW } from './stats';
import { CURATED_BOOKLISTS } from '../data/curatedBooklists';

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
 * 构建推荐书单（基于 CURATED_BOOKLISTS + 用户阅读画像）
 * 过滤已读书目，按五维缺口排序，动态生成推荐理由
 */
export function generateRecommendations(books, ageBand, depthLevel) {
  const { gaps } = diagnoseCoverage(books, ageBand);
  const recommendations = [];

  // 用户已读标识集
  const ownedSet = new Set();
  books.forEach(b => {
    if (b.isbn) ownedSet.add('isbn:' + b.isbn.replace(/[^0-9X]/gi, ''));
    ownedSet.add('book:' + (b.title || '') + (b.author || ''));
  });

  // 按缺口严重程度遍历维度
  gaps.forEach(d => {
    const dimBooks = CURATED_BOOKLISTS[d.key];
    if (!dimBooks) return;

    Object.entries(dimBooks).forEach(([l2Label, l3Map]) => {
      Object.entries(l3Map).forEach(([l3Label, bookList]) => {
        bookList.forEach(book => {
          const bookKey = 'book:' + (book.title || '') + (book.author || '');
          if (ownedSet.has(bookKey)) return;

          // 【已修复】原来这里先拼一句"继续丰富你的XX阅读版图"这种模板句，
          // 再追加书本自己的 note——但同一个分类/缺口状态下的所有书，
          // 这句模板前缀是完全一样的，而且分类名和"略有空间"这类状态
          // 在卡片外层（分组标题、状态标签）已经出现过一次，卡片内再讲
          // 一遍纯属信息重复，真正有区分度的只有 note。
          // 现在改成：有 note 就直接用 note，没有才用模板句兜底。
          let reason = book.note || '';
          if (!reason) {
            if (d.status === 'untouched') {
              reason = `你还没有读过${d.label}类的书，从这本开始探索吧`;
            } else if (d.status === 'low') {
              reason = `你的${d.label}阅读量较少，这本书很适合拓展这个方向`;
            } else {
              reason = `继续丰富你的${d.label}阅读版图`;
            }
          }

          recommendations.push({
            dimKey: d.key,
            dimLabel: d.label,
            dimIcon: d.icon,
            dimColor: d.color,
            level2: l2Label,
            level3: l3Label,
            book: { title: book.title, author: book.author, note: book.note },
            reason,
            gapStatus: d.status,
          });
        });
      });
    });
  });

  // 按缺口严重度排序
  const order = { untouched: 0, low: 1, slight: 2 };
  recommendations.sort((a, b) => (order[a.gapStatus] || 3) - (order[b.gapStatus] || 3));

  return recommendations.slice(0, 20);
}

// ============================================================
// v2.0 新增：基于缺口维度推荐具体书单
// ============================================================

/**
 * 判断维度低于基准值 25% 时触发推荐
 */
export function getGapRecommendations(books, ageBand) {
  if (books.length === 0) return [];
  const { gaps } = diagnoseCoverage(books, ageBand);
  const triggerDims = gaps.filter(d => d.status === 'untouched' || d.status === 'low');
  const recs = [];
  triggerDims.forEach(d => {
    const dimBooks = CURATED_BOOKLISTS[d.key];
    if (!dimBooks) return;
    const booksForDim = [];
    Object.entries(dimBooks).forEach(([l2Label, l3Map]) => {
      Object.entries(l3Map).forEach(([_l3, bookList]) => {
        bookList.forEach(book => {
          booksForDim.push({ title: book.title, author: book.author, note: book.note, level2: l2Label });
        });
      });
    });
    recs.push({
      dimKey: d.key,
      dimLabel: d.label,
      dimIcon: d.icon,
      dimColor: d.color,
      actualPct: d.actualPct,
      benchmark: d.benchmark,
      books: booksForDim.slice(0, 3),
    });
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
