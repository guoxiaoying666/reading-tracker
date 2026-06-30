// Vercel Serverless Function — ISBN 书籍查询
// 数据源：聚合数据 ISBN API（中文图书覆盖好，返回书名/作者/出版社）
// 原则：不篡改数据，只透传

const API_URL = 'https://apis.juhe.cn/isbn/query';

export default async function handler(req, res) {
  const jhKey = process.env.JUHE_ISBN_KEY || '';
  const isbn = (req.query.isbn || '').replace(/[^0-9X]/gi, '');
  if (!isbn) return res.status(400).json({ error: 'no_isbn' });
  if (!jhKey) return res.status(404).json({ error: 'not_found', isbn });

  try {
    const resp = await fetch(`${API_URL}?key=${jhKey}&isbn=${isbn}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!resp.ok) return res.status(404).json({ error: 'not_found', isbn });

    const data = await resp.json();

    // 聚合数据返回格式：{ error_code: 0, reason: '成功', result: { data: { title, author, publisher, img } } }
    if (data.error_code !== 0 || !data.result?.data) {
      return res.status(404).json({ error: 'not_found', isbn });
    }

    const d = data.result.data;

    return res.status(200).json({
      title: d.title || '',
      author: d.author || '',
      publisher: d.publisher || '',
      coverUrl: d.img || '',
      isbn,
    });
  } catch (e) {
    console.warn('[lookup] 网络请求失败:', e.message);
    return res.status(502).json({ error: 'not_found', isbn });
  }
}
