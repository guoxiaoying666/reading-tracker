// ============================================================
// 青少年阅读成长体系 v1.6
// 来源：IB MYP × GB/T 13745-2009 × 2022义务教育课标 × 北师大5C
// 原则：三级统一按题材分 | 语言/名著/形态为独立属性 | 文学/艺术独立成维度
// ============================================================

export const THEORY_SOURCES = [
  { name: 'IB MYP（国际文凭中学项目）', org: '国际文凭组织 IBO', usage: '六大维度均衡分布逻辑、知识论贯穿方式' },
  { name: 'GB/T 13745-2009 学科分类', org: '国家技术监督局', usage: '二级学科划分参考' },
  { name: '义务教育课程方案（2022版）', org: '中华人民共和国教育部', usage: '中国史、语文、艺术内容深度参考' },
  { name: '北师大 5C 模型（2018）', org: '北京师范大学 × 美国P21联盟', usage: '能力副轴标注，不驱动选书' },
  { name: '丹妈读童书 + 小花生网', org: '自媒体阅读博主', usage: '文学体裁题材拆分、虚构/非虚构二分法参考' },
];

export const FIVE_C = {
  culture: { label: '文化理解与传承', short: '文化理解' },
  critical: { label: '审辨思维', short: '审辨思维' },
  creativity: { label: '创新', short: '创新' },
  communication: { label: '沟通', short: '沟通' },
  collaboration: { label: '合作', short: '合作' },
};

// ---- 书籍属性选项 ----
export const LANGUAGES = ['中文', '外文'];
export const CLASSIC_OPTIONS = ['是', '否'];
export const FICTION_OPTIONS = ['虚构', '非虚构'];

// ---- 七大维度（v1.6）----
export const DIMENSIONS = [
  {
    key: 'self',
    label: '① 自我探索',
    pct: 5,
    color: '#D4956E', colorDark: '#B87550', icon: '🧘',
    c5: ['culture', 'critical'],
    philosophy: '自我哲学',
    children: [
      { key: 'psychology', label: '心理情绪', children: ['情绪识别', '压力焦虑', '心理健康'] },
      { key: 'body', label: '身体健康', children: ['青春期发育', '营养睡眠', '运动体能'] },
      { key: 'character', label: '性格优势', children: ['性格探索', '优势发现', '习惯自律'] },
      { key: 'life_death', label: '生死生命', children: ['生命意义', '死亡失去', '信仰启蒙'] },
      { key: 'self_philosophy', label: '自我哲学', children: ['我是谁', '自由选择', '人生方向'] },
    ],
  },
  {
    key: 'society',
    label: '② 社会人文',
    pct: 10,
    color: '#F4A261', colorDark: '#D4883C', icon: '🤝',
    c5: ['communication', 'collaboration'],
    philosophy: '伦理哲学',
    children: [
      { key: 'interpersonal', label: '人际沟通', children: ['友谊关系', '冲突和解', '倾听表达'] },
      { key: 'sociology', label: '社会群体', children: ['家庭社区', '阶层公平', '媒体素养'] },
      { key: 'economy', label: '经济商业', children: ['钱的来源', '市场交换', '创业价值'] },
      { key: 'politics', label: '政治制度', children: ['国家政府', '规则民主', '全球治理'] },
      { key: 'law', label: '法律规则', children: ['规则来源', '权利义务', '公正惩罚'] },
      { key: 'ethics', label: '伦理哲学', children: ['善与恶', '道德困境', '公平正义'] },
    ],
  },
  {
    key: 'nature',
    label: '③ 自然探秘',
    pct: 27,
    color: '#5A9E6F', colorDark: '#3D7A4F', icon: '🌿',
    c5: ['critical', 'creativity'],
    philosophy: '科学哲学',
    children: [
      { key: 'math', label: '数学逻辑', children: ['数感思维', '几何空间', '概率统计', '数学史'] },
      { key: 'physics', label: '物理', children: ['力与运动', '光电声热', '能量守恒'] },
      { key: 'chemistry', label: '化学', children: ['物质变化', '元素周期', '化学生活'] },
      { key: 'biology', label: '生物生命', children: ['细胞遗传', '动植物', '人体健康', '进化生态'] },
      { key: 'geography', label: '地球地理', children: ['地形气候', '资源环境', '地图空间'] },
      { key: 'astronomy', label: '天文宇宙', children: ['太阳系', '星系起源', '时间空间'] },
      { key: 'science_philosophy', label: '科学哲学', children: ['科学运作', '假设证伪', '科学边界'] },
    ],
  },
  {
    key: 'history',
    label: '④ 文明之旅',
    pct: 10,
    color: '#D4A574', colorDark: '#B08968', icon: '🏛️',
    c5: ['culture', 'critical'],
    philosophy: '历史哲学',
    children: [
      { key: 'chinese_history', label: '中国史', children: ['先秦古代', '朝代制度', '近现代史', '生活史'] },
      { key: 'world_history', label: '世界史', children: ['古代文明', '中世纪航海', '工业革命', '二十世纪'] },
      { key: 'anthropology', label: '文化人类', children: ['民族生活', '风俗仪式', '语言文化'] },
      { key: 'religion_myth', label: '宗教神话', children: ['中国神话', '世界宗教', '神话象征'] },
      { key: 'history_philosophy', label: '历史哲学', children: ['历史书写', '规律偶然', '历史启示'] },
    ],
  },
  {
    key: 'literature',
    label: '⑤ 文学花园',
    pct: 40,
    color: '#C0392B', colorDark: '#96281B', icon: '📖',
    c5: ['culture', 'communication'],
    philosophy: '文学哲学',
    children: [
      { key: 'picturebook', label: '绘本', children: ['生活认知', '情绪品格', '想象奇幻', '经典绘本'] },
      { key: 'poetry', label: '诗歌', children: [] },
      { key: 'novel', label: '小说', children: ['幻想冒险', '成长校园', '推理悬疑', '动物故事', '历史小说', '现实生活'] },
      { key: 'fable_myth', label: '寓言神话', children: ['动物寓言', '哲理寓言', '英雄神话', '创世神话'] },
      { key: 'prose', label: '散文', children: ['自然散文', '游记', '生活散文'] },
      { key: 'biography', label: '传记', children: ['科学家', '艺术家', '政治军事', '文学家', '社会人物'] },
      { key: 'drama', label: '戏剧', children: ['悲剧', '喜剧', '寓言剧'] },
      { key: 'lit_criticism', label: '文学赏析', children: ['经典导读', '名著解析', '文学评论', '写作技法'] },
    ],
  },
  {
    key: 'art',
    label: '⑥ 艺术视界',
    pct: 3,
    color: '#B565A7', colorDark: '#914582', icon: '🎨',
    c5: ['culture', 'communication'],
    philosophy: '美学哲学',
    children: [
      { key: 'visual_art', label: '视觉艺术', children: ['绘画', '设计色彩', '建筑空间', '摄影影像'] },
      { key: 'music', label: '音乐', children: ['音乐史', '乐器乐理', '传统音乐', '流行与世界音乐'] },
      { key: 'language', label: '语言文字', children: ['汉字演变', '语言学', '修辞写作', '跨语言'] },
      { key: 'aesthetics_philosophy', label: '美学哲学', children: ['什么是美', '艺术意义', '文学与人性'] },
    ],
  },
  {
    key: 'future',
    label: '⑦ 创想未来',
    pct: 5,
    color: '#4A90B8', colorDark: '#357093', icon: '🚀',
    c5: ['creativity', 'collaboration'],
    philosophy: '技术哲学',
    children: [
      { key: 'engineering', label: '科技工程', children: ['发明技术史', '工程设计', '能源可持续'] },
      { key: 'coding', label: '编程计算', children: ['逻辑算法', '编程基础', '计算机原理'] },
      { key: 'ai', label: 'AI未来', children: ['AI是什么', 'AI改变行业', '人与机器'] },
      { key: 'design_thinking', label: '创新设计', children: ['发现问题', '原型迭代', '创造力'] },
      { key: 'tech_philosophy', label: '技术哲学', children: ['技术与人类', '数据隐私', 'AI伦理'] },
    ],
  },
];

// ---- 辅助查询函数 ----
export function getDimension(key) {
  return DIMENSIONS.find(d => d.key === key);
}

export function getLevel2(dimKey, l2Key) {
  const dim = getDimension(dimKey);
  if (!dim) return null;
  return dim.children.find(c => c.key === l2Key);
}

export function getAllLevel2Options(dimKey) {
  const dim = getDimension(dimKey);
  if (!dim) return [];
  return dim.children.map(c => ({ key: c.key, label: c.label }));
}

export function getLevel3Options(dimKey, l2Key) {
  const l2 = getLevel2(dimKey, l2Key);
  if (!l2) return [];
  return l2.children;
}

// ---- 推荐方向 ----
export const RECOMMEND_DIRECTIONS = {
  self: [
    { level2: '心理情绪', level3: '情绪识别', hint: '如《我的情绪小怪兽》《菲菲生气了》' },
    { level2: '身体健康', level3: '青春期发育', hint: '如《女孩之书》《青春期的秘密》' },
  ],
  society: [
    { level2: '人际沟通', level3: '友谊关系', hint: '如《青蛙和蟾蜍》《一百条裙子》' },
    { level2: '经济商业', level3: '钱的来源', hint: '如《小狗钱钱》《零花钱大计划》' },
    { level2: '伦理哲学', level3: '善与恶', hint: '如《思考世界的孩子》《哲学鸟飞罗》' },
  ],
  nature: [
    { level2: '生物生命', level3: '进化生态', hint: '如《物种起源（少儿版）》《森林报》' },
    { level2: '天文宇宙', level3: '太阳系', hint: '如《神奇校车·迷失在太阳系》《宇宙简史》' },
    { level2: '地球地理', level3: '资源环境', hint: '如《希利尔讲世界地理》《地球的故事》' },
    { level2: '数学逻辑', level3: '数学史', hint: '如《汉声数学图画书》《数学帮帮忙》' },
  ],
  history: [
    { level2: '中国史', level3: '先秦古代', hint: '如《写给儿童的中国历史》《林汉达历史故事》' },
    { level2: '世界史', level3: '古代文明', hint: '如《人类的故事（少儿版）》《希利尔讲世界史》' },
    { level2: '宗教神话', level3: '中国神话', hint: '如《中国神话故事》《山海经（少儿版）》' },
  ],
  literature: [
    { level2: '小说', level3: '幻想冒险', hint: '如《纳尼亚传奇》《哈利波特》' },
    { level2: '诗歌', level3: '', hint: '如《繁星·春水》《一个孩子的诗园》' },
    { level2: '散文', level3: '自然散文', hint: '如《森林报》《沙粒给云雀写信》' },
    { level2: '传记', level3: '科学家', hint: '如《实现不可能：埃隆·马斯克传》' },
    { level2: '戏剧', level3: '寓言剧', hint: '如《青鸟》已读，可继续莎士比亚故事集' },
  ],
  art: [
    { level2: '视觉艺术', level3: '绘画', hint: '如《你好，艺术！》《画给孩子的人文史》' },
    { level2: '音乐', level3: '音乐史', hint: '如《儿童音乐之旅》《音乐的故事》' },
    { level2: '语言文字', level3: '汉字演变', hint: '如《汉字是画出来的》《三十六个字》' },
  ],
  future: [
    { level2: '科技工程', level3: '发明技术史', hint: '如《万物简史》《发明的故事》' },
    { level2: '编程计算', level3: '逻辑算法', hint: '如《儿童编程大冒险》《Scratch编程》' },
    { level2: 'AI未来', level3: 'AI是什么', hint: '如《给孩子的人工智能启蒙》' },
  ],
};
