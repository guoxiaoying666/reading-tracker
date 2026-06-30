// ============================================================
// 好读书单 · 递归链接爬虫
// 从种子 URL 出发，递归发现子链接，遵循白/黑名单规则
// ============================================================

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

// ---- 链接过滤规则 ----
const WHITELIST_PATTERNS = [
  '/s/',           // 公众号文章
  'booklist',
  'recommend',
  'book',
];

const BLACKLIST_PATTERNS = [
  'buy',
  'mall',
  'item',
  'cart',
  'pay',
  'order',
  'login',
  'register',
  'download',
  'share',
];

/**
 * 检查 URL 是否在白名单中
 */
function isWhitelisted(url) {
  const lower = url.toLowerCase();
  return WHITELIST_PATTERNS.some(p => lower.includes(p));
}

/**
 * 检查 URL 是否在黑名单中
 */
function isBlacklisted(url) {
  const lower = url.toLowerCase();
  return BLACKLIST_PATTERNS.some(p => lower.includes(p));
}

/**
 * 解析绝对 URL
 */
function resolveUrl(base, href) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

/**
 * 判断是否为同域链接（避免跳到外部站点）
 */
function isSameDomain(urlA, urlB) {
  try {
    const ua = new URL(urlA);
    const ub = new URL(urlB);
    return ua.hostname === ub.hostname
      || ub.hostname.endsWith('.qq.com');      // 微信域名泛匹配
  } catch {
    return false;
  }
}

/**
 * 从 HTML 中提取所有链接
 * @param {string} html
 * @param {string} baseUrl
 * @returns {string[]} 去重后的绝对 URL 列表
 */
export function extractLinks(html, baseUrl) {
  const links = new Set();

  // 匹配 <a href="..."> 和 <a href='...'>
  const hrefRegex = /<a[^>]+href=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const resolved = resolveUrl(baseUrl, match[1]);
    if (resolved) links.add(resolved);
  }

  // 也匹配 iframe src（部分公众号用）
  const srcRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
  while ((match = srcRegex.exec(html)) !== null) {
    const resolved = resolveUrl(baseUrl, match[1]);
    if (resolved) links.add(resolved);
  }

  return [...links];
}

/**
 * 抓取 HTML
 */
async function fetchHtml(url, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 递归发现链接（广度优先）
 *
 * @param {string[]} seedUrls - 种子 URL 数组
 * @param {object} [options]
 * @param {number} [options.maxDepth=2] - 最大递归深度
 * @param {boolean} [options.sameDomainOnly=true] - 是否仅限同域
 * @returns {Promise<Map<string, number>>} URL → 深度 的映射
 */
export async function discoverLinks(seedUrls, options = {}) {
  const { maxDepth = 2, sameDomainOnly = true } = options;

  const visited = new Map();  // url → depth
  const queue = [];           // { url, depth, sourceUrl }

  // 初始化队列
  for (const url of seedUrls) {
    if (!visited.has(url)) {
      visited.set(url, 0);
      queue.push({ url, depth: 0, sourceUrl: null });
    }
  }

  for (let i = 0; i < queue.length; i++) {
    const { url, depth } = queue[i];
    console.log(`  [爬虫] ${'  '.repeat(depth)}深度 ${depth}: ${url.slice(0, 80)}`);

    if (depth >= maxDepth) {
      console.log(`  [爬虫] ${'  '.repeat(depth)}→ 已达最大深度，停止递归`);
      continue;
    }

    try {
      const html = await fetchHtml(url);
      const links = extractLinks(html, url);

      let discovered = 0;
      for (const link of links) {
        // 白名单检查
        if (!isWhitelisted(link)) continue;
        // 黑名单检查
        if (isBlacklisted(link)) continue;
        // 同域检查
        if (sameDomainOnly && !isSameDomain(url, link)) continue;
        // 已访问检查
        if (visited.has(link)) continue;

        visited.set(link, depth + 1);
        queue.push({ url: link, depth: depth + 1, sourceUrl: url });
        discovered++;
      }

      if (discovered > 0) {
        console.log(`  [爬虫] ${'  '.repeat(depth)}→ 发现 ${discovered} 个新链接`);
      }
    } catch (err) {
      console.log(`  [爬虫] ${'  '.repeat(depth)}⚠ ${err.message}`);
    }

    // 礼貌延迟，避免被封
    if (i < queue.length - 1) {
      await new Promise(r => setTimeout(r, 300 + Math.random() * 200));
    }
  }

  console.log(`\n  [爬虫] 共发现 ${visited.size} 个链接（含种子）`);
  return visited;
}

/**
 * 从已知的 URL 映射中筛选出文章类链接（适合提取内容的页面）
 * @param {Map<string, number>} links - discoverLinks 的返回结果
 * @returns {string[]} 适合提取内容的 URL 列表
 */
export function filterArticleUrls(links) {
  return [...links.entries()]
    .filter(([url]) => {
      // 优先选公众号文章页面
      return url.includes('/s/') || url.includes('/mp/');
    })
    .map(([url]) => url);
}
