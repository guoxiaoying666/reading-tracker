// ============================================================
// 五维分类器 — 基于书名的关键词匹配
// MVP 阶段使用简单的词频打分，后续可升级为 AI 分类
// ============================================================

// 五维分类关键词表（按权重从高到低排列）
const DIMENSION_KEYWORDS = {
  narrative: [
    // 核心关键词（命中即高概率属于此类）
    '童话', '故事', '绘本', '小说', '诗歌', '散文', '寓言', '神话',
    '传记', '戏剧', '幻想', '冒险', '传奇', '民间', '童谣', '儿歌',
    '叙事', '文学', '名著', '经典', '诗词', '韵文',
    '桥梁书', '注音', '漫画', '连环画',
    // 常见叙事类体裁
    '日记', '奇遇', '历险', '旅行记', '回忆',
  ],
  science: [
    // 核心
    '科学', '科普', '自然', '数学', '物理', '化学', '生物', '天文',
    '地理', '工程', '编程', '代码', 'AI', '人工智能', '机器人',
    '宇宙', '地球', '海洋', '森林', '动物', '植物', '昆虫', '恐龙',
    '人体', '发明', '实验', '技术', '逻辑', '数感',
    // 常见科普前缀
    '十万个为什么', '神奇校车', 'DK', '百科',
    '探秘', '揭秘', '穿越', '太空', '原子', '基因',
  ],
  humanity: [
    '历史', '社会', '文化', '人类', '哲学', '经济', '政治', '法律',
    '沟通', '民族', '文明', '传统', '节日', '风俗',
    '世界', '中国', '国家', '城市', '乡村',
    '地图', '丝绸之路', '大航海', '革命', '战争',
    '和平', '平等', '权利', '规则',
  ],
  art_create: [
    '艺术', '绘画', '音乐', '设计', '美学', '创意', '想象',
    '颜色', '美术', '画画', '手工', '创造', '审美',
    '乐器', '舞蹈', '戏剧表演', '摄影',
    '建筑', '色彩', '线条', '图形',
  ],
  self_growth: [
    '心理', '情绪', '成长', '性格', '生命', '健康', '自我',
    '勇气', '友谊', '家庭', '死亡', '身体', '安全教育',
    '自信', '坚强', '独立', '习惯', '品格',
    '青春期', '自我保护', '情感', '社交',
    '哲学启蒙', '思考',
  ],
};

/** 书名关键词映射到 level2 分类（粗略，后续可精化） */
const LEVEL2_MAP = [
  // 叙事类
  { dim: 'narrative', keywords: ['童话', '奇幻', '魔法', '仙境', '龙'], level2: 'fable_myth', level3: '' },
  { dim: 'narrative', keywords: ['冒险', '侦探', '推理', '悬疑', '探案'], level2: 'novel', level3: '推理悬疑' },
  { dim: 'narrative', keywords: ['校园', '上学', '老师', '同学'], level2: 'novel', level3: '成长校园' },
  { dim: 'narrative', keywords: ['动物', '恐龙'], level2: 'novel', level3: '动物故事' },
  { dim: 'narrative', keywords: ['历史', '古代', '王朝', '皇帝'], level2: 'novel', level3: '历史小说' },
  { dim: 'narrative', keywords: ['诗歌', '诗', '韵文', '童谣', '儿歌'], level2: 'poetry', level3: '' },
  { dim: 'narrative', keywords: ['传记', '传', '的一生', '故事'], level2: 'biography', level3: '' },
  { dim: 'narrative', keywords: ['散文', '随笔'], level2: 'prose', level3: '' },
  { dim: 'narrative', keywords: ['戏剧', '剧本', '剧'], level2: 'drama', level3: '' },
  // 科学类
  { dim: 'science', keywords: ['数学', '数感', '数字', '几何'], level2: 'math', level3: '' },
  { dim: 'science', keywords: ['物理', '力', '电', '光', '声', '磁'], level2: 'physics', level3: '' },
  { dim: 'science', keywords: ['化学', '元素', '物质', '分子'], level2: 'chemistry', level3: '' },
  { dim: 'science', keywords: ['动物', '植物', '昆虫', '恐龙', '生物', '生态', '进化'], level2: 'biology', level3: '' },
  { dim: 'science', keywords: ['地球', '地理', '地图', '气候', '环境'], level2: 'geography', level3: '' },
  { dim: 'science', keywords: ['天文', '宇宙', '太空', '星球', '星星', '太阳系'], level2: 'astronomy', level3: '' },
  { dim: 'science', keywords: ['工程', '发明', '技术', '机械'], level2: 'engineering', level3: '' },
  { dim: 'science', keywords: ['编程', '代码', 'AI', '人工智能', '机器人', '算法'], level2: 'coding', level3: '' },
  { dim: 'science', keywords: ['科学', '科普', '百科', '十万个为什么'], level2: 'science_philosophy', level3: '' },
  // 人文类
  { dim: 'humanity', keywords: ['历史', '文明', '古代', '朝代'], level2: 'chinese_history', level3: '' },
  { dim: 'humanity', keywords: ['世界', '环球', '国际'], level2: 'world_history', level3: '' },
  { dim: 'humanity', keywords: ['文化', '民族', '风俗', '节日', '传统'], level2: 'anthropology', level3: '' },
  { dim: 'humanity', keywords: ['沟通', '友谊', '朋友', '关系'], level2: 'interpersonal', level3: '' },
  { dim: 'humanity', keywords: ['社会', '群体', '社区', '公平'], level2: 'sociology', level3: '' },
  { dim: 'humanity', keywords: ['经济', '钱', '商业', '市场'], level2: 'economy', level3: '' },
  { dim: 'humanity', keywords: ['法律', '规则', '权利'], level2: 'law', level3: '' },
  { dim: 'humanity', keywords: ['哲学', '思考', '人生', '意义'], level2: 'ethics', level3: '' },
  // 艺术类
  { dim: 'art_create', keywords: ['艺术', '美术', '绘画', '名画', '颜色', '色彩'], level2: 'visual_art', level3: '' },
  { dim: 'art_create', keywords: ['音乐', '乐器', '唱歌', '节奏'], level2: 'music', level3: '' },
  { dim: 'art_create', keywords: ['文字', '汉字', '语言', '字母'], level2: 'language', level3: '' },
  { dim: 'art_create', keywords: ['设计', '创意', '创造'], level2: 'design_thinking', level3: '' },
  // 自我成长类
  { dim: 'self_growth', keywords: ['情绪', '情感', '感觉', '心情', '害怕', '生气'], level2: 'psychology', level3: '' },
  { dim: 'self_growth', keywords: ['身体', '健康', '安全', '青春期', '性别'], level2: 'body', level3: '' },
  { dim: 'self_growth', keywords: ['性格', '习惯', '品格', '自律', '自信'], level2: 'character', level3: '' },
  { dim: 'self_growth', keywords: ['生命', '死亡', '出生', '成长'], level2: 'life_death', level3: '' },
  { dim: 'self_growth', keywords: ['哲学启蒙', '思考', '我是谁'], level2: 'self_philosophy', level3: '' },
];

/** 源默认维度（当关键词匹配不到时） */
const SOURCE_DEFAULT_DIM = {
  nlc_seasons: 'narrative',
  qjmy_graded: 'narrative',
  class100: 'narrative',
  jyb_top10: 'narrative',
  ccc_tongyue: 'narrative',
  hongniba: 'narrative',
  danma: 'narrative',
  tongshumama: 'narrative',
  dangdang: 'narrative',
};

/** 源默认 level2 */
const SOURCE_DEFAULT_LEVEL2 = {
  nlc_seasons: 'picturebook',
  qjmy_graded: 'novel',
  class100: 'novel',
  jyb_top10: 'novel',
  ccc_tongyue: 'novel',
  hongniba: 'picturebook',
  danma: 'picturebook',
  tongshumama: 'novel',
  dangdang: 'picturebook',
};

/**
 * 根据书名和来源进行分类
 * @param {string} title - 书名
 * @param {string} [sourceKey] - 来源 key
 * @returns {{ dimension: string, level2: string, level3: string }}
 */
export function classifyBook(title, sourceKey = null) {
  if (!title) {
    return {
      dimension: SOURCE_DEFAULT_DIM[sourceKey] || 'narrative',
      level2: SOURCE_DEFAULT_LEVEL2[sourceKey] || 'novel',
      level3: '',
    };
  }

  const tl = title.toLowerCase();

  // 1. 先用关键词匹配 level2（更精确）
  for (const rule of LEVEL2_MAP) {
    if (rule.keywords.some(kw => tl.includes(kw))) {
      return {
        dimension: rule.dim,
        level2: rule.level2,
        level3: rule.level3 || '',
      };
    }
  }

  // 2. 再按维度关键词评分
  const scores = {};
  for (const [dim, keywords] of Object.entries(DIMENSION_KEYWORDS)) {
    scores[dim] = keywords.filter(kw => tl.includes(kw)).length;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const bestDim = sorted[0];

  if (bestDim && bestDim[1] > 0) {
    return {
      dimension: bestDim[0],
      level2: SOURCE_DEFAULT_LEVEL2[sourceKey] || 'novel',
      level3: '',
    };
  }

  // 3. 回退到源默认值
  return {
    dimension: SOURCE_DEFAULT_DIM[sourceKey] || 'narrative',
    level2: SOURCE_DEFAULT_LEVEL2[sourceKey] || 'novel',
    level3: '',
  };
}

/** 批量分类 */
export function classifyBooks(books, sourceKey) {
  return books.map(book => {
    const cls = classifyBook(book.title, sourceKey);
    return { ...book, ...cls };
  });
}
