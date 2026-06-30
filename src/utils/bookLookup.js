// ============================================================
// ISBN 书籍查询引擎（精简版）
// 只调用后端 /api/lookup，不再在前端重试任何外部 API
// ============================================================

/** 通过后端 API 查询 ISBN 书籍信息 */
export async function lookupBook(isbn) {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
  try {
    const resp = await fetch('/api/lookup?isbn=' + cleanIsbn);
    const data = await resp.json();
    if (data.error === 'not_found') return { error: 'not_found', isbn: cleanIsbn };
    if (!resp.ok || data.error) return { error: data.error || '网络错误' };

    return {
      title: data.title || '',
      author: data.author || '',
      publisher: data.publisher || '',
      coverUrl: data.coverUrl || null,
      isbn: cleanIsbn,
    };
  } catch (e) {
    return { error: e.message };
  }
}
