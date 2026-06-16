// DeepSeek AI 整理引擎（通过后端 API 代理，Key 不暴露到浏览器）
import { getAllLevel2Options } from '../data/framework';

export async function aiAnalyze(text, bookTitle, author) {
  try {
    const resp = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, bookTitle, author }),
    });

    const data = await resp.json();

    if (data.error === 'no_key') {
      console.warn('[DeepSeek] 服务端未配置 API Key，使用规则引擎降级');
      return fallback(text, bookTitle);
    }

    if (data.error || !data.content) {
      console.warn('[DeepSeek] API 返回异常:', data.error, data.message);
      return fallback(text, bookTitle);
    }

    const content = data.content;

    // 解析 AI 返回的内容
    const discovery = content.match(/🔍 这次发现\s*\n([\s\S]*?)(?=\n💡|\n⭐|$)/)?.[1]?.trim() || '';
    const question = content.match(/💡 值得继续想的问题\s*\n([\s\S]*?)(?=\n⭐|$)/)?.[1]?.trim() || '';
    let quote = '';
    // 优先找 ⭐ 下面的完整引号句子
    const feelIdx = content.indexOf('⭐');
    if (feelIdx >= 0) {
      const afterFeel = content.slice(feelIdx);
      const q = afterFeel.match(/"([^"]+)"/) || afterFeel.match(/「([^」]+)」/);
      if (q) {
        const candidate = q[1].trim();
        // 只取完整的句子（有句号或长度大于等于10）
        if (candidate.length >= 10 || /[。！？\.!?]/.test(candidate)) quote = candidate;
      }
    }
    // 后备：全文找最长的完整引号句子
    if (!quote) {
      const allQuotes = [];
      let m;
      const re = /"([^"]{10,})"/g;
      while ((m = re.exec(content)) !== null) {
        const candidate = m[1].trim();
        if (/[。！？\.!?]/.test(candidate) || candidate.length >= 15) allQuotes.push(candidate);
      }
      if (allQuotes.length > 0) {
        // 选最长的
        allQuotes.sort((a, b) => b.length - a.length);
        quote = allQuotes[0];
      }
    }
    if (!quote) {
      // 从原文中选最完整的一句话
      const sentences = text.split(/[。！？\n!?]+/).filter(s => s.trim().length >= 8);
      quote = sentences.length > 0 ? sentences.sort((a,b) => b.length - a.length)[0].trim() : text.slice(0, 40);
    }
    if (!discovery && !question) return fallback(text, bookTitle);

    return { discovery, question, quote, original: text };
  } catch (e) {
    console.warn('[DeepSeek] 网络错误:', e);
    return fallback(text, bookTitle);
  }
}

// 降级规则引擎
function fallback(text, bookTitle) {
  const sentences = text.split(/[。！？\n!?]+/).filter(s => s.trim());
  const quote = sentences.length > 0 ? sentences.reduce((a, b) => a.length >= b.length ? a : b).trim() : text;
  let discovery = '';
  for (const s of sentences) {
    const st = s.trim();
    if (!st) continue;
    if (/发现|原来|知道|明白|注意|觉得|有意思|我记得|有一次/.test(st)) discovery += st + '。';
  }
  if (!discovery) discovery = (sentences[0] || '').trim() + '。';
  return {
    discovery: discovery || '读了《' + bookTitle + '》，孩子有很多想说的。',
    question: '你最喜欢书里的哪个部分？为什么？',
    quote: quote.slice(0, 60),
    step: '第一遍',
    original: text,
  };
}
