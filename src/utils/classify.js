// ============================================================
// 好读分类映射工具 v2.0
// 将 DeepSeek 返回的中文分类名称 → 前端使用的英文 key
// ============================================================

/** 中文维度 → 英文 key 映射 */
const DIM_CN_TO_EN = {
  '文学叙事': 'narrative',
  '自然科学': 'science',
  '人文社会': 'humanity',
  '艺术创想': 'art_create',
  '自我成长': 'self_growth',
};

/** 英文维度 key → 中文名 */
const DIM_EN_TO_CN = {
  narrative: '文学叙事',
  science: '自然科学',
  humanity: '人文社会',
  art_create: '艺术创想',
  self_growth: '自我成长',
};

/** 中文二级分类 → 英文 key 映射（按维度分组） */
const LEVEL2_CN_TO_EN = {
  // 文学叙事
  '绘本': 'picturebook',
  '诗歌': 'poetry',
  '小说': 'novel',
  '寓言神话': 'fable_myth',
  '散文': 'prose',
  '传记': 'biography',
  '戏剧': 'drama',
  '文学赏析': 'lit_criticism',
  // 自然科学
  '数学逻辑': 'math',
  '物理': 'physics',
  '化学': 'chemistry',
  '生物生命': 'biology',
  '地球地理': 'geography',
  '天文宇宙': 'astronomy',
  '科学哲学': 'science_philosophy',
  '科技工程': 'engineering',
  '编程计算': 'coding',
  'AI未来': 'ai',
  // 人文社会
  '中国史': 'chinese_history',
  '世界史': 'world_history',
  '文化人类': 'anthropology',
  '宗教神话': 'religion_myth',
  '历史哲学': 'history_philosophy',
  '人际沟通': 'interpersonal',
  '社会群体': 'sociology',
  '经济商业': 'economy',
  '政治制度': 'politics',
  '法律规则': 'law',
  '伦理哲学': 'ethics',
  // 艺术创想
  '视觉艺术': 'visual_art',
  '音乐': 'music',
  '语言文字': 'language',
  '美学哲学': 'aesthetics_philosophy',
  '创新设计': 'design_thinking',
  '技术哲学': 'tech_philosophy',
  // 自我成长
  '心理情绪': 'psychology',
  '身体健康': 'body',
  '性格优势': 'character',
  '生死生命': 'life_death',
  '自我哲学': 'self_philosophy',
};

/**
 * 将 DeepSeek v2 返回的中文分类结果映射为前端使用的英文 key
 * @param {object} result - DeepSeek 返回的原始结果 { dimension, level2, labels }
 * @returns {{ dimension: string|null, level2: string|null, labels: string[], error: string|null }}
 */
export function mapClassifyResult(result) {
  if (!result) return { dimension: null, level2: null, labels: [], error: '分类结果为空' };

  const dimEn = DIM_CN_TO_EN[result.dimension];
  if (!dimEn) return { dimension: null, level2: null, labels: [], error: '无法识别维度：' + result.dimension };

  const l2En = LEVEL2_CN_TO_EN[result.level2];
  if (!l2En) return { dimension: dimEn, level2: null, labels: result.labels || [], error: '无法识别二级分类：' + result.level2 };

  return {
    dimension: dimEn,
    level2: l2En,
    labels: result.labels || [],
    error: null,
  };
}

/**
 * 调用 DeepSeek v2 分类 API
 * @param {string} title - 书名
 * @param {string} [author] - 作者
 * @param {string} [description] - 简介
 * @returns {Promise<{ dimension: string|null, level2: string|null, labels: string[], error: string|null }>}
 */
export async function classifyBook(title, author, description) {
  try {
    const resp = await fetch('/api/deepseek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_type: 'classify_book_v2',
        bookTitle: title,
        author: author || '',
        description: description || '',
      }),
    });
    const data = await resp.json();
    if (data.error) return { dimension: null, level2: null, labels: [], error: data.error };
    return mapClassifyResult(data.result);
  } catch (e) {
    return { dimension: null, level2: null, labels: [], error: e.message };
  }
}

export { DIM_CN_TO_EN, DIM_EN_TO_CN, LEVEL2_CN_TO_EN };
