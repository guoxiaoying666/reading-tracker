// Vercel Serverless Function — DeepSeek API 代理
// Key 在 Vercel 环境变量中设置，不暴露到前端

const DEEPSEEK_KEY = process.env.VITE_DEEPSEEK_KEY || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!DEEPSEEK_KEY) {
    return res.status(200).json({ error: 'no_key', message: '服务端未配置 API Key' });
  }

  try {
    const { text, bookTitle, author } = req.body;

    const prompt = `你是一个读书发现卡的编辑助手。将10岁孩子读完书后的碎片感受记录，整理成一张读书发现卡。

目标格式（三段式，保留孩子原话细节和语气）：
🔍 这次发现
💡 值得继续想的问题
⭐ 我的感受

如果孩子说得太少，某一段可以略过，不硬凑。

要求：
1. 保留孩子自己的语气和用词，不要改得太书面，但要通顺
2. 发现段落从原话中提炼最精彩的一个发现
3. 问题要基于孩子的发现来延伸，不要硬编
4. 感受部分必须是孩子原话中的完整句子，用双引号包裹，不能缩写、截断或省略号结尾
5. 语气温暖，让孩子看了有成就感

注意：
- 不要加"孩子说""我觉得"这类开头
- 发现段落可以有孩子原话中的具体细节和情节
- 感受部分引用孩子原话中最完整、最打动人的一句话
- 不要添油加醋，孩子说多少就整理多少`;

    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + DEEPSEEK_KEY,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一个儿童读书发现卡编辑，擅长从孩子的口语录音中提炼精彩内容，保留孩子的语气和原话。输出精炼，不啰嗦。' },
          { role: 'user', content: prompt + '\n\n书名：《' + bookTitle + '》\n作者：' + (author || '未知') + '\n\n孩子的话：\n' + text },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';

    return res.status(200).json({ content, error: null });
  } catch (e) {
    return res.status(200).json({ error: 'request_failed', message: e.message });
  }
}
