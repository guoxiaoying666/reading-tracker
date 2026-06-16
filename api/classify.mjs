// Vercel Serverless Function — AI 书籍分类
// 根据书名、作者、subjects 自动判断一二级分类

const DEEPSEEK_KEY = process.env.VITE_DEEPSEEK_KEY || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!DEEPSEEK_KEY) {
    return res.status(200).json({ error: 'no_key', message: '服务端未配置 API Key' });
  }

  try {
    const { title, author, subjects } = req.body;
    const subjectStr = (subjects || []).slice(0, 5).join('、');

    const prompt = `你是一个儿童图书分类助手。根据书名、作者和主题信息，判断这本书最适合放在哪个分类中。

可选分类（一级 → 二级）：
① 自我探索 → 心理情绪、身体健康、性格优势、生死生命、自我哲学
② 社会人文 → 人际沟通、社会群体、经济商业、政治制度、法律规则、伦理哲学
③ 自然探秘 → 数学逻辑、物理、化学、生物生命、地球地理、天文宇宙、科学哲学
④ 文明之旅 → 中国史、世界史、文化人类、宗教神话、历史哲学
⑤ 文学花园 → 绘本、诗歌、小说、寓言神话、散文、传记、戏剧、文学赏析
⑥ 艺术视界 → 视觉艺术、音乐、语言文字、美学哲学
⑦ 创想未来 → 科技工程、编程计算、AI未来、创新设计、技术哲学

只输出 JSON 格式，不要其他文字：
{"dimension":"维度key","level2":"二级key","confidence":"high|medium|low"}

注意：
- confidence: high=明确匹配 / medium=有一定依据 / low=信息不足的猜测
- 完全无法判断时用 literature/novel 和 low`;

    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + DEEPSEEK_KEY,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一个儿童图书分类助手，只输出 JSON。' },
          { role: 'user', content: prompt + '\n\n书名：《' + title + '》\n作者：' + (author || '未知') + '\n主题：' + subjectStr },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';

    // 解析 JSON
    let result;
    try {
      result = JSON.parse(content.replace(/```json|```/g, '').trim());
    } catch (_) {
      return res.status(200).json({ error: 'parse_failed', content });
    }

    return res.status(200).json({ ...result, error: null });
  } catch (e) {
    return res.status(200).json({ error: 'request_failed', message: e.message });
  }
}
