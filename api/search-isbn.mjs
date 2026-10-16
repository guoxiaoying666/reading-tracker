// ISBN 搜索 API — 按书名搜索获取 ISBN 号
// 数据源：豆瓣读书搜索 + 豆瓣图书详情页（国内可访问，无需 Key）

const DOUBAN_SEARCH = 'https://book.douban.com/subject_search';
const DOUBAN_SUBJECT = 'https://book.douban.com/subject';

export default async function handler(req, res) {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: '请输入书名' });

  try {
    // 1. 搜索豆瓣读书，提取 subject ID
    const searchUrl = `${DOUBAN_SEARCH}?search_text=${encodeURIComponent(q)}`;
    const searchResp = await fetch(searchUrl, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    if (!searchResp.ok) return res.status(502).json({ error: 'search_failed' });

    const html = await searchResp.text();
    // 从 HTML 中提取第一个 subject ID（格式如 /subject/10554308/）
    const match = html.match(/\/subject\/(\d+)\//);
    if (!match) return res.status(404).json({ error: 'not_found' });

    const subjectId = match[1];

    // 2. 访问图书详情页，提取 ISBN
    const detailUrl = `${DOUBAN_SUBJECT}/${subjectId}/`;
    const detailResp = await fetch(detailUrl, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    if (!detailResp.ok) return res.status(502).json({ error: 'detail_failed' });

    const detailHtml = await detailResp.text();

    // 从 JSON-LD 或 HTML 中提取 ISBN
    let isbn = '';
    // 方案A：JSON-LD
    const jsonLdMatch = detailHtml.match(/"isbn"\s*:\s*"(\d{10,13})"/);
    if (jsonLdMatch) isbn = jsonLdMatch[1];
    // 方案B：meta tag
    if (!isbn) {
      const metaMatch = detailHtml.match(/<meta\s+property="book:isbn"\s+content="(\d{10,13})"/i);
      if (metaMatch) isbn = metaMatch[1];
    }
    // 方案C：HTML 文本
    if (!isbn) {
      const textMatch = detailHtml.match(/ISBN:\s*<\/span>\s*(\d{10,13})/);
      if (textMatch) isbn = textMatch[1];
    }

    if (!isbn) return res.status(404).json({ error: 'no_isbn' });

    // 3. 提取书名和作者（从 JSON-LD 或页面中）
    let title = '';
    let author = '';
    const titleMatch = detailHtml.match(/"name"\s*:\s*"([^"]+)"/);
    if (titleMatch) title = titleMatch[1];
    const authorMatch = detailHtml.match(/"author"\s*:\s*"([^"]+)"/);
    if (authorMatch) author = authorMatch[1];

    return res.status(200).json({ isbn, title, author });
  } catch (e) {
    console.warn('[search-isbn] 失败:', e.message);
    return res.status(502).json({ error: 'search_failed', message: e.message });
  }
}
