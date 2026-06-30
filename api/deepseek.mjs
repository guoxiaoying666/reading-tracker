// DeepSeek API 统一代理网关
// 三种任务：generate_card / classify_book / lookup_translation
// 供 Vite 开发服务器和生产服务器 server.mjs 共用

// ---- 任务配置 ----
// 注意：API Key 在函数调用时实时读取，避免 ESM import 时 process.env 尚未注入
const TASKS = {
  generate_card: {
    system: '你是一个儿童读书发现卡编辑，擅长从孩子的口语录音中提炼精彩内容。去除口语废话（首先、然后、就是、反正、那个、就是说），只保留最核心的意思和孩子特有的用词。输出精炼，不啰嗦，但保留孩子话里的重要细节。',
    user: ({ text, bookTitle, author }) => {
      const prefix = '将孩子读完书后的碎片感受，整理成一张读书发现卡。卡片结构如下：\n\n【发现】孩子所有感受的总结性概括。\n- 重要调整：开头直击核心，不报书名，不写封面外观。精确提炼核心矛盾，保留孩子口中的具体细节和画面感。字数目标：50~70字左右。\n\n【原文】孩子提到的书中原话或情节引用。\n- 约束：如果孩子提及了书里的具体对话或原话，必须原封不动摘录。如果孩子没有引述书中内容，此字段必须留空字符串 ""，绝对不要硬编一句假"原文"。\n\n【值得思考】基于孩子的发现延伸出的问题。\n- 约束：必须顺着孩子自己提到的问题点或情绪去延伸，不要凭空抛出一个孩子根本没察觉到的"高深问题"。\n\n【底部金句】孩子说的话中最凝练、最打动人的一句话。\n- 约束：去掉口语废话（首先、然后、就是、反正、那个、就是说、那个），保留孩子原本的语气和态度。控制在30字以内。这是提炼，不是编造。\n\n要求：\n1. 保留孩子自己的语气和用词，不要改得太书面。\n2. 发现段落是用编辑语言做归纳总结，不是照搬原话，但必须保留孩子说话时的画面感。\n3. 原文必须是孩子提到的书中具体内容，没有就不写，不要硬编。\n4. 思考问题要基于孩子的发现来延伸，不要硬编。\n5. 底部金句不是照搬原话，而是去口语废话后的精炼版。\n6. 语气温暖，让孩子看了有成就感。\n7. 所有字段都不允许输出引号字符。\n\n输出严格JSON，不要其他文字：\n{"discovery":"发现段落（50-70字）","quote":"书中原话引用或空字符串","question":"值得继续想的问题","feeling":"底部金句，孩子原话精炼版（≤30字，纯文本）"}';
      return prefix + '\n\n书名：《' + bookTitle + '》\n作者：' + (author || '未知') + '\n\n孩子的话：\n' + text;
    },
    maxTokens: 1000,
    parser: (raw) => {
      try { return JSON.parse(raw); }
      catch { return { discovery: raw, question: '', feeling: '', quote: '' }; }
    },
  },
  classify_book: {
    system: '你是一个儿童图书分类专家，熟悉儿童读物的五大维度分类。输出严格 JSON。',
    user: ({ bookTitle, author, originalTitle }) => {
      const title = bookTitle || originalTitle || '';
      return '请将书籍分类到五维之一：narrative(文学叙事)/science(自然科学)/humanity(人文社会)/art_create(艺术创想)/self_growth(自我成长)。返回 {dimension, label, confidence}\n书名：' + title + ' 作者：' + (author || '未知');
    },
    maxTokens: 600,
    parser: (raw) => {
      try { return JSON.parse(raw); }
      catch { return { dimension: 'narrative', label: '文学叙事', confidence: 0 }; }
    },
  },
  /** v2.0 新版分类 — 使用精确中文分类体系，返回中文维度名 + 中文二级 + 标签 */
  classify_book_v2: {
    system: '你是一位专业的儿童图书分类专家。请根据书籍书名和简介，将其归类到规定的分类体系中。',
    user: ({ bookTitle, author, description }) => {
      const prompt = `【一级分类维度】（必选其一）：
文学叙事、自然科学、人文社会、艺术创想、自我成长

【二级分类体系表】（请严格从该表选择最匹配的二级分类）：
- 文学叙事：绘本、诗歌、小说、寓言神话、散文、传记、戏剧、文学赏析
- 自然科学：数学逻辑、物理、化学、生物生命、地球地理、天文宇宙、科学哲学、科技工程、编程计算、AI未来
- 人文社会：中国史、世界史、文化人类、宗教神话、历史哲学、人际沟通、社会群体、经济商业、政治制度、法律规则、伦理哲学
- 艺术创想：视觉艺术、音乐、语言文字、美学哲学、创新设计、技术哲学
- 自我成长：心理情绪、身体健康、性格优势、生死生命、自我哲学

【三级标签】（请用 1~3 个高度凝练的标签词概括，如："自然教育/育儿/心理"）

仅返回 JSON 格式，不要任何多余的解释。
如果简介为空，请依靠书名和经验推断。
JSON 结构如下：
{"dimension": "一级分类名称", "level2": "二级分类名称", "labels": ["标签1", "标签2"]}`;

      let input = '书名：' + (bookTitle || '');
      if (author) input += '\n作者：' + author;
      if (description) input += '\n简介：' + description;
      return prompt + '\n\n【输入信息】\n' + input;
    },
    maxTokens: 800,
    parser: (raw) => {
      try {
        const parsed = JSON.parse(raw);
        // 验证必填字段
        if (!parsed.dimension || !parsed.level2) throw new Error('字段不完整');
        if (!Array.isArray(parsed.labels)) parsed.labels = [];
        return parsed;
      } catch {
        // 解析失败时尝试从内容中提取 JSON
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            if (parsed.dimension && parsed.level2) return parsed;
          } catch {}
        }
        return null; // 完全失败
      }
    },
  },
  lookup_translation: {
    system: '你是一个儿童图书翻译专家，熟悉中外名著的各种中文译本。输出严格 JSON。',
    user: ({ originalTitle, author }) =>
      '请为以下外国经典名著推荐3个最佳中文译本，仅限2000年以后的版本。返回JSON格式：{"top3":[{"translator":"译者名","publish_year":年份,"recommend_reason":"推荐理由","publisher":"出版社"}]}\n\n书名：' + (originalTitle || '') + '\n作者：' + (author || '未知'),
    maxTokens: 600,
    parser: (raw) => {
      try { return JSON.parse(raw); }
      catch { return { top3: [] }; }
    },
  },
};

/**
 * 核心：调用 DeepSeek API 并返回解析后的结果
 * @returns {{ result: object|null, error: string|null }}
 */
export async function callDeepSeek(task_type, params) {
  const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY || process.env.VITE_DEEPSEEK_KEY || '';
  if (!DEEPSEEK_KEY) {
    return { result: null, error: 'API Key 未配置' };
  }
  const task = TASKS[task_type];
  if (!task) {
    return { result: null, error: '未知任务类型: ' + task_type };
  }

  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + DEEPSEEK_KEY,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: task.system },
        { role: 'user', content: task.user(params) },
      ],
      max_tokens: task.maxTokens,
      temperature: 0.7,
    }),
  });

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';
  const result = task.parser(content);
  return { result, error: null };
}

/** Vercel/Express 风格 handler（供 server.mjs 使用） */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { task_type, text, bookTitle, author, originalTitle } = req.body || {};
    const { result, error } = await callDeepSeek(task_type, { text, bookTitle, author, originalTitle });
    if (error) return res.status(503).json({ error });
    return res.status(200).json({ result, error: null });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
