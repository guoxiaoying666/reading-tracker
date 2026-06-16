// Vercel Serverless Function — ISBN 书籍查询
// 查询链路：OpenLibrary → DeepSeek AI 知识 → 返回空表单

const DS_KEY = process.env.VITE_DEEPSEEK_KEY || '';

export default async function handler(req, res) {
  const isbn = (req.query.isbn || '').replace(/[^0-9X]/gi, '');
  if (!isbn) return res.status(200).json({ error: 'no_isbn' });

  let title = '', author = '', publisher = '', publishYear = '',
      subjects = [], coverUrl = null, language = '外文';

  // 1) OpenLibrary 直达
  try {
    const ol = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, { signal: AbortSignal.timeout(6000) });
    if (ol.ok) {
      const d = await ol.json();
      if (d.title) {
        title = d.title;
        publisher = (d.publishers || []).join('、');
        publishYear = (d.publish_date || '').match(/\d{4}/)?.[0] || '';
        coverUrl = d.covers?.[0] ? `https://covers.openlibrary.org/b/id/${d.covers[0]}-M.jpg` : null;
        language = /[一-鿿]/.test(title) ? '中文' : '外文';
        for (const a of (d.authors || []).slice(0, 2)) {
          try {
            const aR = await fetch(`https://openlibrary.org${a.key}.json`, { signal: AbortSignal.timeout(3000) });
            if (aR.ok) { const aD = await aR.json(); if (aD.name) author += (author ? '、' : '') + aD.name; }
          } catch (_) {}
        }
        try {
          const sR = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=1`, { signal: AbortSignal.timeout(3000) });
          if (sR.ok) { const sD = await sR.json(); if (sD.docs?.[0]?.subject) subjects = sD.docs[0].subject; }
        } catch (_) {}
      }
    }
  } catch (_) {}

  // 2) OpenLibrary search
  if (!title) {
    try {
      const sR = await fetch(`https://openlibrary.org/search.json?q=isbn:${isbn}`, { signal: AbortSignal.timeout(5000) });
      if (sR.ok) {
        const sD = await sR.json();
        if (sD.docs?.[0]) {
          const doc = sD.docs[0];
          title = doc.title || '';
          author = (doc.author_name || []).join('、');
          publisher = doc.publisher?.[0] || '';
          publishYear = String(doc.first_publish_year || '');
          subjects = (doc.subject || []);
          coverUrl = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null;
          language = /[一-鿿]/.test(title) ? '中文' : '外文';
        }
      }
    } catch (_) {}
  }

  if (!title) {
    // 中文 ISBN → 预填中文+文学分类
    if (isbn.startsWith('9787')) {
      return res.json({ error: 'not_found', isbn, language: '中文', dimension: 'literature', level2: 'novel', confidence: 'low' });
    }
    return res.json({ error: 'not_found', isbn, language: '外文', dimension: 'literature', level2: 'novel', confidence: 'low' });
  }

  // DeepSeek AI 分类
  let dimension = 'literature', level2 = 'novel', confidence = 'low';
  if (DS_KEY) {
    try {
      const prompt = `你是一个儿童图书分类助手。根据书名和主题判断分类。
可选：self/自我探索、society/社会人文、nature/自然探秘、history/文明之旅、literature/文学花园、art/艺术视界、future/创想未来
二级：self→psychology/心理情绪 body/身体健康 character/性格优势
society→interpersonal/人际沟通 economy/经济商业 politics/政治制度 law/法律规则
nature→math/数学逻辑 physics/物理 chemistry/化学 biology/生物生命 geography/地球地理 astronomy/天文宇宙
history→chinese_history/中国史 world_history/世界史 religion_myth/宗教神话
literature→picturebook/绘本 poetry/诗歌 novel/小说 fable_myth/寓言神话 biography/传记
art→visual_art/视觉艺术 music/音乐 language/语言文字
future→engineering/科技工程 coding/编程计算 ai/AI未来

只输出 JSON：{"dimension":"key","level2":"key","confidence":"high|medium|low"}`;

      const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DS_KEY}` },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是一个儿童图书分类助手，只输出 JSON。' },
            { role: 'user', content: `${prompt}\n\n书名：《${title}》\n作者：${author || '未知'}\n主题：${subjects.slice(0, 5).join('、')}` },
          ],
          max_tokens: 200, temperature: 0.3,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content || '';
        try {
          const ai = JSON.parse(content.replace(/```json|```/g, '').trim());
          if (ai.dimension) { dimension = ai.dimension; level2 = ai.level2 || 'novel'; confidence = ai.confidence || 'low'; }
        } catch (_) {}
      }
    } catch (_) {}
  }

  return res.json({ title, author, publisher, publishYear, coverUrl, language, subjects, dimension, level2, confidence, isbn });
}
