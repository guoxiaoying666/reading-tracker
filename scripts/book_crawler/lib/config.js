// ============================================================
// 书单来源配置 — 权重、标签、入口 URL、来源层级
// ============================================================

// 来源层级定义
export const TIERS = {
  T1: { label: '官方基石', cap: 0.4 },    // 单来源在 top-N 中不超过 40%
  T2: { label: '专业口碑', cap: 0.3 },    // 不超过 30%
  T3: { label: '市场热度', cap: 0.2 },    // 不超过 20%
};

export const SOURCES = {
  nlc_seasons: {
    key: 'nlc_seasons',
    name: '国家图书馆·四季童读',
    tag: '国图四季童读',
    weight: 10,
    tier: 'T1',
    icon: '📚',
  },
  qjmy_graded: {
    key: 'qjmy_graded',
    name: '亲近母语分级阅读',
    tag: '亲近母语分级',
    weight: 9,
    tier: 'T1',
    icon: '📖',
  },
  class100: {
    key: 'class100',
    name: '百班千人共读书目',
    tag: '百班千人',
    weight: 8,
    tier: 'T2',
    icon: '🏫',
  },
  jyb_top10: {
    key: 'jyb_top10',
    name: '中国教育报·教师推荐十大童书',
    tag: '中教报推荐',
    weight: 8,
    tier: 'T2',
    icon: '📰',
  },
  ccc_tongyue: {
    key: 'ccc_tongyue',
    name: '童阅中国',
    tag: '童阅中国',
    weight: 8,
    tier: 'T2',
    icon: '🇨🇳',
  },
  hongniba: {
    key: 'hongniba',
    name: '红泥巴·年度优秀童书',
    tag: '红泥巴推荐',
    weight: 8,
    tier: 'T2',
    icon: '🏆',
  },
  // 丹妈读童书 — 需要公众号文章链接
  danma: {
    key: 'danma',
    name: '丹妈读童书',
    tag: '丹妈推荐',
    weight: 7,
    tier: 'T2',
    icon: '📱',
    requiresManualLink: true,
  },
  // 童书妈妈三川玲 — 需要公众号文章链接（T2 专业口碑）
  tongshumama: {
    key: 'tongshumama',
    name: '童书妈妈三川玲',
    tag: '童书妈妈推荐',
    weight: 8,
    tier: 'T2',
    icon: '👩',
    requiresManualLink: true,
  },
  dangdang: {
    key: 'dangdang',
    name: '当当网童书畅销榜',
    tag: '当当畅销榜',
    weight: 5,
    tier: 'T3',
    icon: '🛒',
  },
};

/** 根据 sourceTag 获取权重 */
export function getWeightByTag(sourceTag) {
  const found = Object.values(SOURCES).find(s => s.tag === sourceTag);
  return found ? found.weight : 5;
}

/** 根据 sourceTag 获取来源层级 */
export function getTierByTag(sourceTag) {
  const found = Object.values(SOURCES).find(s => s.tag === sourceTag);
  return found?.tier || 'T3';
}

/** 获取来源层级的限额占比 */
export function getTierCap(tier) {
  return TIERS[tier]?.cap || 0.2;
}

/** 所有可自动爬取的来源 key */
export const AUTO_SOURCES = Object.values(SOURCES)
  .filter(s => !s.requiresManualLink)
  .map(s => s.key);
