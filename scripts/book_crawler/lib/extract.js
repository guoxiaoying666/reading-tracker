// ============================================================
// HTML 提取工具 — 获取网页、去噪、提取结构化信息
// ============================================================

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

/**
 * 抓取 HTML
 * @param {string} url
 * @param {object} [options]
 * @returns {Promise<string>} HTML 文本
 */
export async function fetchHtml(url, options = {}) {
  const headers = { ...DEFAULT_HEADERS, ...options.headers };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);

  try {
    const res = await fetch(url, {
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText} (${url})`);
    }
    const html = await res.text();
    return html;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 从 HTML 中提取纯文本（去标签、去脚本、去样式）
 * @param {string} html
 * @returns {string}
 */
export function extractText(html) {
  return html
    // 移除 script 和 style 块
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // 移除 HTML 标签
    .replace(/<[^>]+>/g, ' ')
    // 解码 HTML 实体
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d{2,6};/g, ' ')
    // 合并空白字符
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * 从文本中提取书名和作者（启发式）
 * 假设常见格式: "《书名》作者名" 或 "书名（作者）" 或 "书名 作者"
 * @param {string} text
 * @returns {Array<{title: string, author: string}>}
 */
export function extractBookEntries(text) {
  const entries = [];

  // 模式1：《书名》作者
  //      《书名》文/作者
  //      《书名》（作者）
  // 使用两个独立的正则来避免复杂字符类的兼容问题
  const pattern1a = /《([^》]+)》[（(]?\s*([^）\s，,。\)]{1,15})[）)]?/g;
  let m;
  while ((m = pattern1a.exec(text)) !== null) {
    const title = m[1].trim();
    let author = m[2]?.trim() || '';
    // 去除常见前缀：文/、图/、著、绘、编著
    author = author.replace(/^(文|图|著|绘|编著|编译)\//, '').trim();
    if (title && title.length >= 1) {
      entries.push({ title, author });
    }
  }

  // 模式1b：只有《书名》（没抓到作者的情况）
  const pattern1b = /《([^》]+)》/g;
  while ((m = pattern1b.exec(text)) !== null) {
    const title = m[1].trim();
    if (title && !entries.some(e => e.title === title)) {
      entries.push({ title, author: '' });
    }
  }

  // 模式2：书名 —— 作者（没有《》号的情况，如排行榜）
  const pattern2 = /(?:\d+[.、．]\s*)([^《\d][^，。,.\n]{2,40}?)\s*[／/（(]\s*([^）\s，,。\)]{1,15})\s*[）)]?/g;
  while ((m = pattern2.exec(text)) !== null) {
    const title = m[1].trim();
    const author = (m[2]?.trim() || '').replace(/^(文|图|著|绘|编著|编译)\//, '').trim();
    // 避免重复（已通过模式1捕获）
    if (title && !entries.some(e => e.title === title)) {
      entries.push({ title, author });
    }
  }

  return entries;
}

/**
 * 简单重试包装：失败时最多重试 retries 次
 * @param {Function} fn - async function to retry
 * @param {number} retries - max retries (default 2)
 * @param {number} delayMs - delay between retries (default 1000)
 */
export async function withRetry(fn, retries = 2, delayMs = 1000) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries) throw err;
      console.log(`  重试 ${i + 1}/${retries}: ${err.message}`);
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
}
