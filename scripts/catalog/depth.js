// ============================================================
// 好读书单 · 深度层级判定
// 基于年龄 + 体裁 + 来源覆盖度 计算阅读深度
// depth_level ∈ { 入门层, 进阶层, 鉴赏层 }
// ============================================================

/**
 * 体裁 → 深度基准映射
 * 各体裁的自然起点层级
 */
const GENRE_BASE_DEPTH = {
  // 叙事类
  '绘本':        '入门层',
  '诗歌':        '进阶层',
  '小说':        '进阶层',
  '寓言神话':    '入门层',
  '散文':        '进阶层',
  '传记':        '进阶层',
  '戏剧':        '进阶层',
  '文学赏析':    '鉴赏层',
  '拼音读物':    '入门层',
  '桥梁书':      '入门层',
  '漫画':        '入门层',
  // 科学类
  '科普':        '入门层',
  '数学逻辑':    '进阶层',
  '物理':        '进阶层',
  '化学':        '进阶层',
  '生物生命':    '入门层',
  '地球地理':    '入门层',
  '天文宇宙':    '入门层',
  '科学哲学':    '鉴赏层',
  '科技工程':    '进阶层',
  '编程计算':    '进阶层',
  'AI未来':     '进阶层',
  // 人文类
  '中国史':      '进阶层',
  '世界史':      '进阶层',
  '文化人类':    '进阶层',
  '宗教神话':    '进阶层',
  '历史哲学':    '鉴赏层',
  '人际沟通':    '进阶层',
  '社会群体':    '进阶层',
  '经济商业':    '进阶层',
  '政治制度':    '鉴赏层',
  '法律规则':    '进阶层',
  '伦理哲学':    '鉴赏层',
  // 艺术类
  '视觉艺术':    '入门层',
  '音乐':        '入门层',
  '语言文字':    '进阶层',
  '美学哲学':    '鉴赏层',
  '创新设计':    '进阶层',
  '技术哲学':    '鉴赏层',
  // 自我成长类
  '心理情绪':    '入门层',
  '身体健康':    '入门层',
  '性格优势':    '进阶层',
  '生死生命':    '进阶层',
  '自我哲学':    '鉴赏层',
};

/**
 * 年龄段修正系数
 * 同样的体裁，大龄儿童可以读更深版本
 */
const AGE_DEPTH_MAP = [
  { age: 3,  label: '0-3岁',  offset: -1 },   // 比基准浅
  { age: 4,  label: '4-6岁',  offset: 0 },    // 与基准一致
  { age: 7,  label: '7-9岁',  offset: 0 },
  { age: 10, label: '10-12岁', offset: 1 },   // 比基准深一级
  { age: 13, label: '13岁+',  offset: 1 },
];

const DEPTH_ORDER = ['入门层', '进阶层', '鉴赏层'];

/**
 * 根据年龄获取偏移量
 */
function getAgeOffset(ageMin, ageMax) {
  // 取年龄中位数
  const mid = ageMin > 0 && ageMax > 0
    ? (ageMin + ageMax) / 2
    : ageMin > 0 ? ageMin : ageMax > 0 ? ageMax : 7;

  for (const entry of AGE_DEPTH_MAP) {
    if (mid <= entry.age) return entry.offset;
  }
  return 1; // 13+
}

/**
 * 根据来源数提升深度层级
 * 多个权威来源交叉验证的书 → 提升一级
 */
function getSourceDepthBoost(sourceTags) {
  if (!sourceTags || sourceTags.length < 2) return 0;
  // 3个及以上来源且包含 T1 来源 → 提升
  const t1Tags = sourceTags.filter(t =>
    ['国图四季童读', '亲近母语分级'].includes(t)
  );
  if (sourceTags.length >= 3 || t1Tags.length >= 1) return 1;
  return 0;
}

/**
 * 计算书的深度层级
 *
 * @param {object} book - 书的信息
 * @param {string} book.level2 - 二级分类（如"绘本""小说"）
 * @param {number} [book.age_min] - 适龄下限
 * @param {number} [book.age_max] - 适龄上限
 * @param {string[]} [book.source_tags] - 来源标签数组
 * @param {string} [book.title] - 书名（用于关键词精修）
 * @returns {string} 入门层 / 进阶层 / 鉴赏层
 */
export function determineDepthLevel(book) {
  const base = GENRE_BASE_DEPTH[book.level2] || '入门层';
  const baseIdx = DEPTH_ORDER.indexOf(base);
  if (baseIdx === -1) return '入门层';

  // 年龄修正（base 带年龄）
  const ageOffset = getAgeOffset(book.age_min || 0, book.age_max || 0);

  // 来源权威性修正
  const sourceBoost = getSourceDepthBoost(book.source_tags || []);

  // 总偏移量
  const totalOffset = Math.max(-1, Math.min(1, ageOffset + sourceBoost));
  let finalIdx = Math.max(0, Math.min(2, baseIdx + totalOffset));

  // ★ 书名关键词精修（作为最终裁定 — 即使年龄/来源数据不足也能区分）
  const titleRefined = refineByTitle(book.title || '', DEPTH_ORDER[finalIdx]);
  const refinedIdx = DEPTH_ORDER.indexOf(titleRefined);
  if (refinedIdx > finalIdx) finalIdx = refinedIdx; // 只提升不降低（书名明确表明深度的）

  return DEPTH_ORDER[finalIdx];
}

/**
 * 批量计算深度层级
 */
export function batchDetermineDepth(books) {
  return books.map(book => ({
    ...book,
    depth_level: determineDepthLevel(book),
  }));
}

/**
 * 根据书名关键词做更精细的深度判定
 * 部分书名字面就暗示了难度
 */
const DEPTH_TITLE_KEYWORDS = {
  '入门层': [
    '幼儿', '宝宝', '启蒙', '低幼', '小手', '第一本', '触摸', '洞洞',
    '0-3', '0-2', '3-6', '2-4', '婴儿', '咿呀', '撕不烂', '翻翻书',
    '立体书', '发声书', '触摸书', '洗澡书', '布书', '纸板书',
    '晚安', '睡前', '入园', '小小', '宝宝的第一本',
    '我爱', '抱抱', '亲亲', '0岁', '1岁', '2岁', '3岁',
  ],
  '鉴赏层': [
    '全集', '精选集', '典藏', '原典', '导读', '赏析', '批评', '研究',
    '文集', '选集', '精装', '珍藏版', '经典版', '全译本',
    '传世', '百年', '不朽', '大师', '巨匠', '里程碑',
    '通史', '简史', '哲学', '论', '学导论', '原理',
  ],
  // 进阶层关键词（探测到则至少为进阶层）
  '进阶层': [
    '百科', '十万个为什么', '大百科', '百科全书',
    '系列', '全册', '套装', '礼盒',
    '进阶', '高阶', '提高', '强化',
    '少年', '青少年', '小学生', '中学生',
    '逻辑', '思维', '推理', '编程', '物理', '化学',
    '地理', '历史', '天文', '宇宙', '奥秘',
    '动物小说', '校园', '成长', '冒险',
  ],
};

export function refineByTitle(title, currentDepth) {
  if (!title) return currentDepth;
  const tl = title.toLowerCase();
  const currentIdx = DEPTH_ORDER.indexOf(currentDepth);

  let maxIdx = currentIdx;
  for (const [depth, keywords] of Object.entries(DEPTH_TITLE_KEYWORDS)) {
    if (keywords.some(kw => tl.includes(kw))) {
      const idx = DEPTH_ORDER.indexOf(depth);
      if (idx > maxIdx) maxIdx = idx;
    }
  }

  return DEPTH_ORDER[maxIdx];
}
