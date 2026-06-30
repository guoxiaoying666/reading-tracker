// ============================================================
// 好读·阅读成长体系 v2.0 — WHAT五维 + HOW四维 + DEPTH三层
// 来源：IB MYP × GB/T 13745-2009 × 2022义务教育课标 × 北师大5C
// ============================================================

// ============================================================
// 第一部分：WHAT 内容五维
// 核心：孩子读什么
// ============================================================

export const THEORY_SOURCES = [
  { name: 'IB MYP（国际文凭中学项目）', org: '国际文凭组织 IBO', usage: '维度均衡分布逻辑' },
  { name: '义务教育课程方案（2022版）', org: '中华人民共和国教育部', usage: '内容深度参考' },
  { name: '北师大 5C 模型（2018）', org: '北京师范大学 × 美国P21联盟', usage: 'HOW 能力副轴标注' },
];

// ---- 年龄段基准占比 ----
export const AGE_BANDS = [
  { key: '0-6', label: '0-6岁', desc: '学龄前' },
  { key: '7-9', label: '7-9岁', desc: '小学低年级' },
  { key: '10-12', label: '10-12岁', desc: '小学高年级' },
  { key: '13+', label: '13岁+', desc: '中学阶段' },
];

export const DEFAULT_AGE_BAND = '7-9';

// ---- WHAT 五维 -- 文学叙事 ----
const NARRATIVE_CHILDREN = [
  { key: 'picturebook', label: '绘本', children: ['生活认知', '情绪品格', '想象奇幻', '经典绘本'] },
  { key: 'poetry', label: '诗歌', children: [] },
  { key: 'novel', label: '小说', children: ['幻想冒险', '成长校园', '推理悬疑', '动物故事', '历史小说', '现实生活'] },
  { key: 'fable_myth', label: '寓言神话', children: ['动物寓言', '哲理寓言', '英雄神话', '创世神话'] },
  { key: 'prose', label: '散文', children: ['自然散文', '游记', '生活散文'] },
  { key: 'biography', label: '传记', children: ['科学家', '艺术家', '政治军事', '文学家', '社会人物'] },
  { key: 'drama', label: '戏剧', children: ['悲剧', '喜剧', '寓言剧'] },
  { key: 'lit_criticism', label: '文学赏析', children: ['经典导读', '名著解析', '文学评论', '写作技法'] },
];

// ---- WHAT 五维 -- 自然科学（自然探秘 + 创想未来中的科技工程/编程计算/AI未来）----
const SCIENCE_CHILDREN = [
  { key: 'math', label: '数学逻辑', children: ['数感思维', '几何空间', '概率统计', '数学史'] },
  { key: 'physics', label: '物理', children: ['力与运动', '光电声热', '能量守恒'] },
  { key: 'chemistry', label: '化学', children: ['物质变化', '元素周期', '化学生活'] },
  { key: 'biology', label: '生物生命', children: ['细胞遗传', '动植物', '人体健康', '进化生态'] },
  { key: 'geography', label: '地球地理', children: ['地形气候', '资源环境', '地图空间'] },
  { key: 'astronomy', label: '天文宇宙', children: ['太阳系', '星系起源', '时间空间'] },
  { key: 'science_philosophy', label: '科学哲学', children: ['科学运作', '假设证伪', '科学边界'] },
  { key: 'engineering', label: '科技工程', children: ['发明技术史', '工程设计', '能源可持续'] },
  { key: 'coding', label: '编程计算', children: ['逻辑算法', '编程基础', '计算机原理'] },
  { key: 'ai', label: 'AI未来', children: ['AI是什么', 'AI改变行业', '人与机器'] },
];

// ---- WHAT 五维 -- 人文社会（文明之旅 + 社会人文合并）----
const HUMANITY_CHILDREN = [
  { key: 'chinese_history', label: '中国史', children: ['先秦古代', '朝代制度', '近现代史', '生活史'] },
  { key: 'world_history', label: '世界史', children: ['古代文明', '中世纪航海', '工业革命', '二十世纪'] },
  { key: 'anthropology', label: '文化人类', children: ['民族生活', '风俗仪式', '语言文化'] },
  { key: 'religion_myth', label: '宗教神话', children: ['中国神话', '世界宗教', '神话象征'] },
  { key: 'history_philosophy', label: '历史哲学', children: ['历史书写', '规律偶然', '历史启示'] },
  { key: 'interpersonal', label: '人际沟通', children: ['友谊关系', '冲突和解', '倾听表达'] },
  { key: 'sociology', label: '社会群体', children: ['家庭社区', '阶层公平', '媒体素养'] },
  { key: 'economy', label: '经济商业', children: ['钱的来源', '市场交换', '创业价值'] },
  { key: 'politics', label: '政治制度', children: ['国家政府', '规则民主', '全球治理'] },
  { key: 'law', label: '法律规则', children: ['规则来源', '权利义务', '公正惩罚'] },
  { key: 'ethics', label: '伦理哲学', children: ['善与恶', '道德困境', '公平正义'] },
];

// ---- WHAT 五维 -- 艺术创想（艺术视界 + 创想未来中的创新设计/技术哲学）----
const ARTCREATE_CHILDREN = [
  { key: 'visual_art', label: '视觉艺术', children: ['绘画', '设计色彩', '建筑空间', '摄影影像'] },
  { key: 'music', label: '音乐', children: ['音乐史', '乐器乐理', '传统音乐', '流行与世界音乐'] },
  { key: 'language', label: '语言文字', children: ['汉字演变', '语言学', '修辞写作', '跨语言'] },
  { key: 'aesthetics_philosophy', label: '美学哲学', children: ['什么是美', '艺术意义', '文学与人性'] },
  { key: 'design_thinking', label: '创新设计', children: ['发现问题', '原型迭代', '创造力'] },
  { key: 'tech_philosophy', label: '技术哲学', children: ['技术与人类', '数据隐私', 'AI伦理'] },
];

// ---- WHAT 五维 -- 自我成长（原自我探索）----
const SELFGROWTH_CHILDREN = [
  { key: 'psychology', label: '心理情绪', children: ['情绪识别', '压力焦虑', '心理健康'] },
  { key: 'body', label: '身体健康', children: ['青春期发育', '营养睡眠', '运动体能'] },
  { key: 'character', label: '性格优势', children: ['性格探索', '优势发现', '习惯自律'] },
  { key: 'life_death', label: '生死生命', children: ['生命意义', '死亡失去', '信仰启蒙'] },
  { key: 'self_philosophy', label: '自我哲学', children: ['我是谁', '自由选择', '人生方向'] },
];

// ---- WHAT 五维定义 ----
export const WHAT_DIMENSIONS = [
  {
    key: 'narrative',
    label: '文学叙事',
    pct: 40, // 默认参考占比（用于回退）
    benchmarks: { '0-6': 70, '7-9': 50, '10-12': 35, '13+': 25 },
    color: '#C0392B', colorDark: '#96281B', icon: '📖',
    howPrimary: 'empathy',
    children: NARRATIVE_CHILDREN,
  },
  {
    key: 'science',
    label: '自然科学',
    pct: 25,
    benchmarks: { '0-6': 15, '7-9': 25, '10-12': 28, '13+': 28 },
    color: '#5A9E6F', colorDark: '#3D7A4F', icon: '🌿',
    howPrimary: 'logic',
    children: SCIENCE_CHILDREN,
  },
  {
    key: 'humanity',
    label: '人文社会',
    pct: 15,
    benchmarks: { '0-6': 5, '7-9': 10, '10-12': 20, '13+': 25 },
    color: '#D4A574', colorDark: '#B08968', icon: '🏛️',
    howPrimary: 'logic',
    children: HUMANITY_CHILDREN,
  },
  {
    key: 'art_create',
    label: '艺术创想',
    pct: 10,
    benchmarks: { '0-6': 7, '7-9': 8, '10-12': 10, '13+': 12 },
    color: '#B565A7', colorDark: '#914582', icon: '🎨',
    howPrimary: 'expression',
    children: ARTCREATE_CHILDREN,
  },
  {
    key: 'self_growth',
    label: '自我成长',
    pct: 10,
    benchmarks: { '0-6': 3, '7-9': 7, '10-12': 7, '13+': 10 },
    color: '#4A90B8', colorDark: '#357093', icon: '🧘',
    howPrimary: 'self_awareness',
    children: SELFGROWTH_CHILDREN,
  },
];

// 书籍属性选项
export const LANGUAGES = ['中文', '外文', '双语'];
export const CLASSIC_OPTIONS = ['是', '否'];
export const FICTION_OPTIONS = ['虚构', '非虚构'];

// ---- 旧七维 → 新五维映射 ----
const OLD_TO_NEW_MAP = {
  literature: 'narrative',
  nature: 'science',
  history: 'humanity',
  society: 'humanity',
  art: 'art_create',
  self: 'self_growth',
};

// future 需要按 level2 细分
const FUTURE_SPLIT = {
  engineering: 'science',
  coding: 'science',
  ai: 'science',
  design_thinking: 'art_create',
  tech_philosophy: 'art_create',
};

/**
 * 将旧七维 dimension key 转换为新五维 key
 * @param {string} oldDim - 旧维度 key
 * @param {string} [level2] - 二级分类（future 维度需要）
 * @returns {string} 新维度 key
 */
export function migrateDimension(oldDim, level2) {
  if (oldDim === 'future') return FUTURE_SPLIT[level2] || 'science';
  return OLD_TO_NEW_MAP[oldDim] || oldDim;
}

/** 批量迁移书籍的维度 */
export function migrateBooks(books) {
  return books.map(b => ({
    ...b,
    _dimNew: migrateDimension(b.dimension, b.level2),
  }));
}

/** 获取书的实际新维度 key（优先用已迁移的，否则实时计算） */
export function getBookDimension(book) {
  return book._dimNew ?? migrateDimension(book.dimension, book.level2);  // P2-7
}

// ============================================================
// 第二部分：HOW 认知能力四维
// 核心：孩子怎么读——由 WHAT 维度按权重自动映射
// ============================================================

export const HOW_DIMENSIONS = [
  { key: 'empathy', label: '人际共情', icon: '🤝', color: '#E88D67', desc: '理解他人、感受情感' },
  { key: 'logic', label: '逻辑探究', icon: '🔍', color: '#5A9E6F', desc: '分析因果、推理判断' },
  { key: 'expression', label: '创造表达', icon: '✨', color: '#B565A7', desc: '想象创造、语言表达' },
  { key: 'self_awareness', label: '自我认知', icon: '🧘', color: '#4A90B8', desc: '认识自己、反思成长' },
];

/**
 * WHAT → HOW 映射权重
 * 主方向 0.7，次方向 0.3（多个次方向平分 0.3）
 */
export const WHAT_TO_HOW = {
  narrative: { empathy: 0.7, self_awareness: 0.15, expression: 0.15 },
  science: { logic: 0.7, expression: 0.3 },
  humanity: { logic: 0.7, empathy: 0.3 },
  art_create: { expression: 0.7, logic: 0.3 },
  self_growth: { self_awareness: 0.7, empathy: 0.3 },
};

// ============================================================
// 第三部分：DEPTH 阅读深度三层
// 核心：孩子读到什么程度——通过家长观察题判断
// ============================================================

export const DEPTH_LEVELS = [
  { key: 'entry', label: '入门层', icon: '🌱', color: '#9CAF88',
    desc: '能理解内容，但尚未形成个人观点',
    recNote: '建议从孩子感兴趣的题材入手，逐步引导思考' },
  { key: 'progressive', label: '进阶层', icon: '🌿', color: '#6B8F5E',
    desc: '有自己的偏好，能联想和感受',
    recNote: '可以提供同题材更深度的作品，鼓励表达观点' },
  { key: 'appreciation', label: '鉴赏层', icon: '🌳', color: '#3D6B35',
    desc: '能评价比较，有独立判断力',
    recNote: '可以引入经典原著和跨题材对比阅读' },
];

/** 深度判断三道观察题 */
export const DEPTH_QUESTIONS = [
  {
    id: 'q1',
    question: '孩子读完一本书之后，通常会……',
    options: [
      { key: 'A', label: '能说出大概讲了什么', level: 'entry' },
      { key: 'B', label: '会分享感受或联想', level: 'progressive' },
      { key: 'C', label: '会主动评价好不好及原因', level: 'appreciation' },
    ],
  },
  {
    id: 'q2',
    question: '孩子选书的方式是……',
    options: [
      { key: 'A', label: '你推荐什么就读什么', level: 'entry' },
      { key: 'B', label: '自己有偏好，会主动找某类书', level: 'progressive' },
      { key: 'C', label: '会比较不同作者或版本，有自己判断', level: 'appreciation' },
    ],
  },
  {
    id: 'q3',
    question: '孩子读书的状态是……',
    options: [
      { key: 'A', label: '读完就读完了', level: 'entry' },
      { key: 'B', label: '会反复读喜欢的部分', level: 'progressive' },
      { key: 'C', label: '会做摘录/写感想，或主动讨论', level: 'appreciation' },
    ],
  },
];

/**
 * 根据三道题的回答判断深度层级
 * @param {object} answers - { q1: 'A', q2: 'B', q3: 'A' }
 * @returns {string} depth key
 */
export function determineDepthLevel(answers) {
  if (!answers) return null;
  const counts = { entry: 0, progressive: 0, appreciation: 0 };
  DEPTH_QUESTIONS.forEach(q => {
    const answer = answers[q.id];
    const opt = q.options.find(o => o.key === answer);
    if (opt && counts[opt.level] !== undefined) counts[opt.level]++;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (!top || top[1] === 0) return null;
  return top[0];
}

// ============================================================
// 辅助查询函数
// ============================================================

/** 获取 WHAT 维度定义 */
export function getWhatDimension(key) {
  return WHAT_DIMENSIONS.find(d => d.key === key);
}

export function getDimension(key) {
  return getWhatDimension(key);
}

/** 获取指定维度的二级分类列表 */
export function getLevel2(dimKey, l2Key) {
  const dim = getWhatDimension(dimKey);
  if (!dim) return null;
  return dim.children.find(c => c.key === l2Key);
}

export function getAllLevel2Options(dimKey) {
  const dim = getWhatDimension(dimKey);
  if (!dim) return [];
  return dim.children.map(c => ({ key: c.key, label: c.label }));
}

export function getLevel3Options(dimKey, l2Key) {
  const l2 = getLevel2(dimKey, l2Key);
  if (!l2) return [];
  return l2.children;
}

/** 获取年龄段对应的参考占比 */
export function getBenchmark(dimKey, ageBand) {
  const dim = getWhatDimension(dimKey);
  if (!dim) return 0;
  const band = ageBand || DEFAULT_AGE_BAND;
  return dim.benchmarks?.[band] ?? dim.pct ?? 0;
}

/** 获取 HOW 维度定义 */
export function getHowDimension(key) {
  return HOW_DIMENSIONS.find(d => d.key === key);
}

/** 获取某 WHAT 维度的 HOW 映射 */
export function getHowMapping(dimKey) {
  return WHAT_TO_HOW[dimKey] || {};
}

/** 获取深度层级定义 */
export function getDepthLevel(key) {
  return DEPTH_LEVELS.find(d => d.key === key);
}

// ============================================================
// 推荐方向（按新五维组织）
// ============================================================

export const RECOMMEND_DIRECTIONS = {
  narrative: [
    { level2: '小说', level3: '幻想冒险', hint: '如《纳尼亚传奇》《哈利波特》' },
    { level2: '诗歌', level3: '', hint: '如《繁星·春水》《一个孩子的诗园》' },
    { level2: '散文', level3: '自然散文', hint: '如《森林报》《沙粒给云雀写信》' },
    { level2: '传记', level3: '科学家', hint: '如《实现不可能：埃隆·马斯克传》' },
    { level2: '戏剧', level3: '寓言剧', hint: '如《青鸟》，可继续莎士比亚故事集' },
  ],
  science: [
    { level2: '生物生命', level3: '进化生态', hint: '如《物种起源（少儿版）》《森林报》' },
    { level2: '天文宇宙', level3: '太阳系', hint: '如《神奇校车·迷失在太阳系》《宇宙简史》' },
    { level2: '地球地理', level3: '资源环境', hint: '如《希利尔讲世界地理》《地球的故事》' },
    { level2: '数学逻辑', level3: '数学史', hint: '如《汉声数学图画书》《数学帮帮忙》' },
    { level2: '科技工程', level3: '发明技术史', hint: '如《万物简史》《发明的故事》' },
    { level2: 'AI未来', level3: 'AI是什么', hint: '如《给孩子的人工智能启蒙》' },
  ],
  humanity: [
    { level2: '中国史', level3: '先秦古代', hint: '如《写给儿童的中国历史》《林汉达历史故事》' },
    { level2: '世界史', level3: '古代文明', hint: '如《人类的故事（少儿版）》《希利尔讲世界史》' },
    { level2: '宗教神话', level3: '中国神话', hint: '如《中国神话故事》《山海经（少儿版）》' },
    { level2: '人际沟通', level3: '友谊关系', hint: '如《青蛙和蟾蜍》《一百条裙子》' },
    { level2: '经济商业', level3: '钱的来源', hint: '如《小狗钱钱》《零花钱大计划》' },
    { level2: '伦理哲学', level3: '善与恶', hint: '如《思考世界的孩子》《哲学鸟飞罗》' },
  ],
  art_create: [
    { level2: '视觉艺术', level3: '绘画', hint: '如《你好，艺术！》《画给孩子的人文史》' },
    { level2: '音乐', level3: '音乐史', hint: '如《儿童音乐之旅》《音乐的故事》' },
    { level2: '语言文字', level3: '汉字演变', hint: '如《汉字是画出来的》《三十六个字》' },
    { level2: '创新设计', level3: '发现问题', hint: '如《设计思维工具箱》《小小发明家》' },
  ],
  self_growth: [
    { level2: '心理情绪', level3: '情绪识别', hint: '如《我的情绪小怪兽》《菲菲生气了》' },
    { level2: '身体健康', level3: '青春期发育', hint: '如《女孩之书》《青春期的秘密》' },
    { level2: '性格优势', level3: '优势发现', hint: '如《品格的力量》《独一无二的你》' },
  ],
};
