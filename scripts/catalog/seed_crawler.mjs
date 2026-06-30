// ============================================================
// 好读书单 · 种子爬虫 v2.0
// 关键能力：识别索引页 → 提取子链接(带年龄标签) → 逐抓取
//
// 用法：
//   node seed_crawler.mjs                         # 试跑，仅输出 JSON
//   node seed_crawler.mjs --db                    # 爬取并写入 Supabase
//   node seed_crawler.mjs --shallow               # 不跟随子链接（仅抓种子页）
// ============================================================

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 加载 .env
try {
  const envPaths = [
    join(__dirname, '.env'),
    join(__dirname, '..', '..', '.env.local'),
  ];
  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      for (const line of readFileSync(envPath, 'utf8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#') || !t.includes('=')) continue;
        const eq = t.indexOf('=');
        const k = t.slice(0, eq).trim();
        const v = t.slice(eq + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
    }
  }
} catch (_) {}

// ===== 依赖 =====
import { classifyBooks } from '../book_crawler/lib/classifier.js';
import { getWeightByTag } from '../book_crawler/lib/config.js';
import { fetchHtml, extractText, extractBookEntries, withRetry } from '../book_crawler/lib/extract.js';
import { determineDepthLevel } from './depth.js';

// ============================
// 【种子入口】请在此填入链接
// ============================
const SEED_URLS = [
  // === 国家图书馆·四季童读（T1 官方基石）===
  // 2023年四季
  'https://mp.weixin.qq.com/s/L9Dlm8Q68ICvWmMLNkKKWA',   // 2023春
  'https://mp.weixin.qq.com/s/uG6gIUa8GqPvVyOTtGphEg',   // 2023夏
  'https://mp.weixin.qq.com/s/U_mYRBPCbmiH8JH_soqS5g',   // 2023秋
  'https://mp.weixin.qq.com/s/tWXiGAHEPhywsfJbHb5WGg',   // 2023冬
  // 2024年四季
  'https://mp.weixin.qq.com/s/eorOuW21SrkIO87dxqKTtQ',   // 2024春
  'https://mp.weixin.qq.com/s/UbznFnrskDOt7wCdTp6-vg',   // 2024夏
  'https://mp.weixin.qq.com/s/SrldLOuurshMySzOE9f2kg',   // 2024秋
  'https://mp.weixin.qq.com/s/dLFp3l5BGOAgctvHaAwrjA',   // 2024冬
  // 2025年四季
  'https://mp.weixin.qq.com/s/OWdziQe1K6chdvA9wEqC-w',   // 2025春
  'https://mp.weixin.qq.com/s/7uRPvcQKomwaKuThduWZgg',   // 2025夏
  'https://mp.weixin.qq.com/s/wMc2F3xc3eqFjzmOKS60RQ',   // 2025秋
  'https://mp.weixin.qq.com/s/HPNWT15mgN8JUDNiBA26cg',   // 2025冬
  // 2026年春夏
  'https://mp.weixin.qq.com/s/qozZEqk-N4u8x2U7AWfxig',   // 2026春
  'https://mp.weixin.qq.com/s/YBIgz3zAj24sYDaBm3RAUA',   // 2026夏

  // === 童书妈妈三川玲（T2 专业口碑）===
  'https://mp.weixin.qq.com/s/EhLG07UOuD8oRwKGREMjxg',
  'https://mp.weixin.qq.com/s/hltX-ETPgZCScHUocPYgZw',
  'https://mp.weixin.qq.com/s/Sf3K05QW3K3TeMUg-rZJ0Q',

  // === 丹妈读童书（T2 专业口碑）===
  'https://mp.weixin.qq.com/s/8jwggjgx3-qqPao3nV6oWQ',
  'https://mp.weixin.qq.com/s/1HNKc6Xc8eW_0v6bNxZZPw',
  'https://mp.weixin.qq.com/s/h2LAXwOWIj8SPhmN4R4njw',
];

// ===== 已知来源 → source_tag 映射 =====
const URL_SOURCE_OVERRIDES = {
  // 国图四季童读（T1）
  'L9Dlm8Q68ICvWmMLNkKKWA': '国图四季童读',
  'uG6gIUa8GqPvVyOTtGphEg': '国图四季童读',
  'U_mYRBPCbmiH8JH_soqS5g': '国图四季童读',
  'tWXiGAHEPhywsfJbHb5WGg': '国图四季童读',
  'eorOuW21SrkIO87dxqKTtQ': '国图四季童读',
  'UbznFnrskDOt7wCdTp6-vg': '国图四季童读',
  'SrldLOuurshMySzOE9f2kg': '国图四季童读',
  'dLFp3l5BGOAgctvHaAwrjA': '国图四季童读',
  'OWdziQe1K6chdvA9wEqC-w': '国图四季童读',
  '7uRPvcQKomwaKuThduWZgg': '国图四季童读',
  'wMc2F3xc3eqFjzmOKS60RQ': '国图四季童读',
  'HPNWT15mgN8JUDNiBA26cg': '国图四季童读',
  'qozZEqk-N4u8x2U7AWfxig': '国图四季童读',
  'YBIgz3zAj24sYDaBm3RAUA': '国图四季童读',
  // 童书妈妈（T2）
  'EhLG07UOuD8oRwKGREMjxg': '童书妈妈推荐',
  'hltX-ETPgZCScHUocPYgZw': '童书妈妈推荐',
  'Sf3K05QW3K3TeMUg-rZJ0Q': '童书妈妈推荐',
  // 丹妈读童书（T2）
  '8jwggjgx3-qqPao3nV6oWQ': '丹妈推荐',
};

// ============================
// 辅助函数
// ============================

/** 从文章中提取公众号名称 */
function extractAccountName(html) {
  const patterns = [
    /var\s+nickname\s*=\s*"([^"]+)"/,
    /"nick_name"\s*:\s*"([^"]+)"/,
    /"profile_nickname">([^<]+)</,
    /"rich_media_meta_nickname">([^<]+)</,
    /id="js_name">([^<]+)</,
    /class="profile_nickname"[^>]*>([^<]+)</,
  ];
  for (const pat of patterns) {
    const m = html.match(pat);
    if (m) return m[1].trim();
  }
  return '';
}

/** 提取文章主体 HTML */
function extractArticleBody(html) {
  const bodyMatch = html.match(
    /<div[^>]*id="js_content"[^>]*>([\s\S]*?)<\/div>\s*<script/i
  );
  if (bodyMatch) return bodyMatch[1];

  const richMatch = html.match(
    /<div[^>]*class="rich_media_content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<(?:div|script)/i
  );
  if (richMatch) return richMatch[1];

  const bodyTagMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyTagMatch) return bodyTagMatch[1];

  return html;
}

/** 提取封面图 URL */
function extractCoverUrl(html) {
  const patterns = [
    /var\s+msg_cdn_url\s*=\s*"([^"]+)"/,
    /"cdn_url"\s*:\s*"([^"]+)"/,
    /msg_cdn_url="([^"]+)"/,
    /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/,
  ];
  for (const pat of patterns) {
    const m = html.match(pat);
    if (m) return m[1].trim();
  }
  return '';
}

/** 书名噪音过滤器 */
function isValidBookTitle(title) {
  if (!title || title.length < 2 || title.length > 60) return false;
  if (/<[^>]+>/.test(title)) return false;
  if (/^(http|https|ftp|file):/i.test(title)) return false;
  if (/^[^一-龥A-Za-z0-9一-鿿]/.test(title)) return false;
  if (/^[\d\s\-—,./:;"'%#@&()]+$/.test(title)) return false;
  if (/^(var|function|return|if|else|const|let|class|import|export|style|width|height|color|font|margin|padding)/i.test(title)) return false;
  if (/\.[a-z]{2,}\b/.test(title)) return false;
  if (/^(window|document|null|undefined|true|false|http|html|json|href|src|data|img|span|div|p>)/i.test(title)) return false;
  const chineseChars = (title.match(/[一-鿿]/g) || []).length;
  if (chineseChars === 0 && title.length < 4) return false;
  return true;
}

/** 清洗书名：去除尾部装饰符号 */
function cleanTitle(title) {
  return title
    .replace(/[\s●▶·▸◆◇◎■□○●△▲▼※†‡°]+$/, '')  // 尾部装饰符
    .replace(/^[\s●▶·▸◆◇◎■□○●△▲▼※†‡°]+/, '')  // 头部装饰符
    .trim();
}

/** 清洗作者字段：过滤非真实作者名的文章文本碎片 */
function cleanAuthor(author) {
  if (!author) return '';

  // 直接清除明显是文章碎片的特征
  // 包含"的"、"了"、"是"、"就"、"被"等在作者名中几乎不出现的字
  if (/[的了是就被把让给在和于还但然而虽因则由]/.test(author)) return '';
  // 纯数字/版本信息（"3册""4册""单册"）
  if (/^[\d册套辑部种年版本卷集]*$/.test(author)) return '';
  // 纯装饰符
  if (/^[●▶·▸◆◇◎■□○●△▲▼※†‡°\s]+$/.test(author)) return '';
  // 单独的"4-8岁""注音版"等
  if (/^[\d\-+岁以上下小学初中高中册全套辑部种年版本卷集]$/.test(author)) return '';
  // 开头就是虚词或非名字字符
  if (/^[的了对不这是就来和与及在被]/.test(author)) return '';

  // 提取"作者：XXX"中的实际作者
  const m = author.match(/作者[：:]\s*([^，,。.]{1,20})/);
  if (m) return m[1].trim();
  // 提取"[法]XXX"等国籍前缀后的作者
  const m2 = author.match(/\[([^\]]+)\]\s*([^\[【\d]{1,20})/);
  if (m2) {
    const name = m2[2].replace(/^[：:\s]*/, '').trim();
    if (name.length >= 2 && !/[的了是]/.test(name)) return name;
  }

  // 普通作者名：2-4个中文字符，或带·的中文名
  if (/^[一-鿿·]{2,4}$/.test(author.trim())) return author.trim();
  // 带外文点的名字：E·B·怀特、J.K.罗琳
  if (/^[A-Za-z·.一-鿿\s]{2,15}$/.test(author.trim())) return author.trim();

  // 其他太长的内容都丢弃
  if (author.length > 6) return '';

  return author.replace(/^[●▶·▸\s]+/, '').trim();
}

/** 判断来源 */
function detectSource(url, html) {
  // 1. URL 特征覆盖
  for (const [key, tag] of Object.entries(URL_SOURCE_OVERRIDES)) {
    if (url.includes(key)) return tag;
  }

  // 2. 页面标题检测（某些公众号不暴露 nickname 变量）
  const titleMatch = html.match(/var\s+msg_title\s*=\s*["']([^"']+)["']/);
  const pageTitle = titleMatch ? titleMatch[1] : '';
  if (pageTitle.includes('四季童读') && pageTitle.includes('国图')) {
    return '国图四季童读';
  }

  // 3. 页面内容提取公众号名称
  const accountName = extractAccountName(html);
  if (accountName) {
    const nameMap = {
      '丹妈读童书': '丹妈推荐',
      '童书妈妈三川玲': '童书妈妈推荐',
      '三川玲': '童书妈妈推荐',
      '三联生活周刊': '三联生活周刊',
      '阿甲说书': '阿甲推荐',
      '百班千人': '百班千人',
    };
    for (const [name, tag] of Object.entries(nameMap)) {
      if (accountName.includes(name)) return tag;
    }
  }

  // 4. 回退
  return '公众号推荐';
}

// ============================
// 国家图书馆·四季童读专用解析器
// 文章格式：书名不加《》，但行结构规律：
//   [书名]
//   [作者/著]  ← 含 /著  /绘  /文图 等标记
//   [出品方/出版社/ISBN]
//   内容简介：...
// ============================

/** 从国图四季童读文章中提取书单（纯文本行结构） */
function extractNlcBooks(html) {
  const bodyMatch = html.match(/<div[^>]*id="js_content"[^>]*>([\s\S]*?)<\/div>\s*<script/i);
  const body = bodyMatch ? bodyMatch[1] : '';

  // 去标签保留换行
  const text = body
    .replace(/<br[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/　/g, '');
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const books = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 快速过滤：太短太长、不含中文
    if (line.length < 2 || line.length > 40) continue;
    if (!/[一-龥]/.test(line)) continue;

    // 过滤非书名行
    if (line.startsWith('ISBN') || line.startsWith('出版社') || line.startsWith('出品方')) continue;
    if (line.includes('内容简介') || line.includes('封面图') || line.includes('作者简介')) continue;
    if (line.includes('岁以下') || line.includes('岁以上') || line.includes('阅读全文')) continue;
    if (/[的是了就被把让给在于还但]/.test(line) && !line.endsWith('！') && !line.endsWith('？')) continue;

    // ★ 关键：检查后面1-2行是否有作者标记
    const next1 = lines[i + 1] || '';
    const next2 = lines[i + 2] || '';
    const hasAuthorMark =
      next1.includes('/著') || next1.includes('/绘') || next1.includes('/文图') ||
      next1.includes('文；图') || next1.includes('图文') || next1.includes('／著') ||
      next1.startsWith('[') || next1.includes('/著绘') || next1.includes('/编译') ||
      next1.includes('/编写') || next1.includes('/文；') || next1.includes('/图；') ||
      next1.includes('/著；') || next1.toLowerCase().includes('watt') ||
      next2.includes('/著') || next2.includes('/绘');

    if (!hasAuthorMark) continue;

    // 清洗书名
    let title = line
      .replace(/^[《》◆●▶·\s]+/, '')
      .replace(/[《》◆●▶·\s]+$/, '')
      .trim();

    // 去掉尾部的册数信息
    title = title.replace(/（全\d+册）$/, '').replace(/\(全\d+册\)$/, '').trim();

    // 书名本身不能包含"/"（排除作者行误入）
    if (title.includes('/')) continue;
    // 书名本身不能包含纯英文人名的长度特征
    if (title.length > 15 && (title.match(/[A-Za-z]/g) || []).length > 5) continue;

    // 去重
    const key = title.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);

    if (title.length >= 2 && title.length <= 30) {
      // 提取作者（从下一行）
      let author = '';
      if (next1.includes('/著') || next1.includes('/绘') || next1.includes('/文图')) {
        author = next1.split('/')[0].replace(/^[[（(]\s*/, '').trim();
        // 外文作者格式 "[加]西德尼·史密斯" → "西德尼·史密斯"
        const m = author.match(/\]\s*([^【\[【]{1,20})/);
        if (m) author = m[1].trim();
      } else if (next1.startsWith('[')) {
        // 外文作者
        author = next1.replace(/^\[[^\]]*\]/, '').replace(/\/.*$/, '').trim();
      }
      if (author.length > 15) author = '';

      books.push({
        title,
        author: cleanAuthor(author),
      });
    }
  }
  return books;
}

/** 从链接文本中解析年龄段 */
function extractAgeFromText(text) {
  const patterns = [
    /(\d+)[-–到](\d+)岁/,        // "0-3岁" "3-6岁"
    /(\d+)岁[以以][上下来]/,     // "6岁以上"
    /(\d+)\+岁?/,                 // "3+岁"
    /^(\d+)-(\d+)/,               // "0-3" 开头的
    /[低中高]年?级/,              // "低年级" "中年级" "高年级"
    /小学/,                       // "小学生"
  ];

  for (const pat of patterns) {
    const m = text.match(pat);
    if (!m) continue;

    if (pat.toString().includes('年级') || pat.toString().includes('小学')) {
      return { min: 6, max: 12 };
    }

    const a = parseInt(m[1]);
    const b = parseInt(m[2]);

    if (!isNaN(a) && !isNaN(b)) return { min: Math.min(a, b), max: Math.max(a, b) };
    if (!isNaN(a)) return { min: a, max: a + 2 };
  }

  return null;
}

// ============================
// 索引页识别 + 子链接提取
// ============================

/** 判断当前页是否为"索引页"（包含大量书单子链接） */
function isIndexPage(bodyHtml) {
  // 统计指向公众号文章的链接数
  const linkCount = (bodyHtml.match(/https?:\/\/mp\.weixin\.qq\.com\/s\?/g) || []).length;
  const albumCount = (bodyHtml.match(/https?:\/\/mp\.weixin\.qq\.com\/mp\/appmsgalbum/g) || []).length;

  // 有超过 5 个文章/专辑子链接 → 判定为索引页
  return linkCount + albumCount >= 5;
}

/**
 * 从索引页提取所有书单子链接（带标签）
 * @returns {Array<{url: string, label: string, age: {min, max}|null}>}
 */
function extractSubLinks(bodyHtml, baseUrl) {
  const links = [];
  const seen = new Set();

  // 匹配 <a href="..."> 标签文字 </a>
  const linkRegex = /<a[^>]*href=["']([^"']{10,400})["'][^>]*>([\s\S]{0,150})<\/a>/gi;
  let m;

  while ((m = linkRegex.exec(bodyHtml)) !== null) {
    let url = m[1].replace(/&amp;/g, '&').replace(/amp;/g, '');
    const rawText = m[2];
    const text = extractText(rawText).trim();

    // 只保留公众号文章链接
    if (!url.includes('mp.weixin.qq.com/s') && !url.includes('mp.weixin.qq.com/mp/appmsgalbum')) continue;

    // 过滤无意义的短链接
    if (text.length < 2) continue;

    // 去重
    const key = text + '|' + url.slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);

    // 解析年龄
    const age = extractAgeFromText(text);

    links.push({ url, text, age });
  }

  // 去重 URL
  const byUrl = new Map();
  for (const link of links) {
    if (!byUrl.has(link.url)) byUrl.set(link.url, link);
  }

  return [...byUrl.values()];
}

// ============================
// 书籍提取（从单篇文章）
// ============================

/** 从单篇文章提取书名列表 */
function extractBooksFromArticle(bodyHtml) {
  const cleanText = extractText(bodyHtml);
  const entries = extractBookEntries(cleanText);
  const books = [];
  const seen = new Set();

  for (const entry of entries) {
    if (!isValidBookTitle(entry.title)) continue;
    const cleanedTitle = cleanTitle(entry.title);
    if (!cleanedTitle || cleanedTitle.length < 2) continue;
    const key = cleanedTitle.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      books.push({
        title: cleanTitle(entry.title),
        author: cleanAuthor(entry.author || ''),
      });
    }
  }

  // 如果结果太少（<5），再用宽松模式在原始 HTML 上补充
  if (books.length < 5) {
    const looseRegex = /《([^>《》]{1,50})》/g;
    let m;
    while ((m = looseRegex.exec(bodyHtml)) !== null) {
      const title = cleanTitle(m[1].trim());
      if (isValidBookTitle(title)) {
        const key = title.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          books.push({ title, author: '' });
        }
      }
    }
  }

  return books;
}

// ============================
// 主爬取流程
// ============================

/**
 * 处理单个 URL
 * @param {string} url
 * @param {object} [context] - { age: {min,max}, sourceTag, theme }
 * @returns {Promise<Array>}
 */
async function crawlUrl(url, context = {}) {
  console.log(`  [抓取] ${url.slice(0, 100)}`);

  try {
    const html = await withRetry(() => fetchHtml(url, { timeout: 20000 }), 2, 1500);
    const sourceTag = context.sourceTag || detectSource(url, html);
    const weight = getWeightByTag(sourceTag);
    const bodyHtml = extractArticleBody(html);

    // ★ 如果是国图四季童读文章，使用专用解析器
    const titleMatch = html.match(/var\s+msg_title\s*=\s*["']([^"']+)["']/);
    const pageTitle = titleMatch ? titleMatch[1] : '';
    const isNlcArticle = sourceTag === '国图四季童读' || pageTitle.includes('四季童读');
    if (isNlcArticle) {
      const nlcBooks = extractNlcBooks(html);
      if (nlcBooks.length > 0) {
        console.log(`  → 四季童读专用解析: ${nlcBooks.length} 本`);
        const classified = classifyBooks(nlcBooks, 'nlc_seasons');
        return classified.map(book => ({
          ...book,
          depth_level: determineDepthLevel({ ...book, source_tags: [sourceTag] }),
          source_tag: sourceTag,
          source_weight: weight,
          cover_url: extractCoverUrl(html),
        }));
      }
      console.log(`  → 四季童读专用解析未提取到，回退通用解析`);
    }

    // 判断是否为索引页
    if (!context.isSubPage && isIndexPage(bodyHtml)) {
      console.log(`  → 检测为索引页，提取子链接中...`);
      const subLinks = extractSubLinks(bodyHtml, url);

      // 只选取有书单关键词的子链接
      const booklistLinks = subLinks.filter(l =>
        /书单|绘本|科普|小学|桥梁书|读物|阅读|[0-9]岁|年级|文学|系列|启蒙|百科|漫画|小说|故事/.test(l.text)
      );

      console.log(`  → 发现 ${booklistLinks.length} 个书单子链接（共 ${subLinks.length} 个子链接）`);

      if (booklistLinks.length > 0) {
        // 只抓取前 25 个最有价值的子链接
        const toCrawl = booklistLinks.slice(0, 25);
        console.log(`  → 计划抓取 ${toCrawl.length} 个子页面`);

        const allBooks = [];
        for (let i = 0; i < toCrawl.length; i++) {
          const sub = toCrawl[i];
          console.log(`    [${i + 1}/${toCrawl.length}] ${sub.text.slice(0, 40)}`);
          const subBooks = await crawlUrl(sub.url, {
            sourceTag,
            isSubPage: true,
            parentLabel: sub.text,
            age: sub.age,
          });

          // 给子页面的书加上年龄标签
          for (const book of subBooks) {
            if (sub.age && !book.age_min && !book.age_max) {
              book.age_min = sub.age.min;
              book.age_max = sub.age.max;
            }
            // 添加主题标签（从链接文字提取主题）
            if (sub.text && !book.theme) {
              book.theme = sub.text.replace(/书单|收藏|推荐|超强|好[书单]|一定要看|值得|合集/g, '').trim();
            }
          }

          allBooks.push(...subBooks);

          // 礼貌延迟
          if (i < toCrawl.length - 1) {
            await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
          }
        }

        // 去重（子页面之间可能重复推荐同一本书）
        const seen = new Set();
        const deduped = [];
        for (const book of allBooks) {
          const key = book.title.toLowerCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            deduped.push(book);
          }
        }

        console.log(`  → 索引页完成: ${toCrawl.length} 个子页 → ${allBooks.length} 本(去重后 ${deduped.length} 本)`);
        return deduped;
      }
    }

    // 普通页面：直接提取书名
    const books = extractBooksFromArticle(bodyHtml);
    if (books.length === 0) {
      console.log(`  → 未提取到书`);
      return [];
    }

    console.log(`  → 提取 ${books.length} 本 (${sourceTag})`);

    const sourceKey = { '丹妈推荐': 'danma', '童书妈妈推荐': 'tongshumama' }[sourceTag] || null;
    const classified = classifyBooks(books, sourceKey);

    const enriched = classified.map(book => ({
      ...book,
      depth_level: determineDepthLevel({
        ...book,
        source_tags: [sourceTag],
        age_min: context.age?.min || book.age_min || 0,
        age_max: context.age?.max || book.age_max || 0,
      }),
      source_tag: sourceTag,
      source_weight: weight,
      age_min: context.age?.min || book.age_min || 0,
      age_max: context.age?.max || book.age_max || 0,
      cover_url: extractCoverUrl(html),
    }));

    return enriched;

  } catch (err) {
    console.log(`  ⚠ ${err.message}`);
    return [];
  }
}

// ============================
// 运行入口
// ============================

export async function run(options = {}) {
  const seedUrls = options.seedUrls || SEED_URLS;
  const shallow = options.shallow === true;

  console.log('╔═══════════════════════════════════════════╗');
  console.log('║    好读·种子书单爬虫 v2.0                  ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log(`种子链接: ${seedUrls.length} 个`);
  console.log(`子链接跟随: ${shallow ? '❌ 不跟随' : '✅ 自动（索引页最多25个）'}`);
  console.log('');

  const allBooks = [];
  const sourceSummary = {};
  const globalSeen = new Set(); // 跨种子去重

  for (let i = 0; i < seedUrls.length; i++) {
    const url = seedUrls[i];
    console.log(`\n[${i + 1}/${seedUrls.length}] 种子 ${i + 1}`);
    const books = await crawlUrl(url, { isSubPage: false });

    for (const book of books) {
      const key = book.title.toLowerCase().trim() + '||' + (book.author || '').toLowerCase().trim();
      if (!globalSeen.has(key)) {
        globalSeen.add(key);
        allBooks.push(book);
        const tag = book.source_tag || '未知';
        sourceSummary[tag] = (sourceSummary[tag] || 0) + 1;
      }
    }
  }

  // 汇总
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║    爬取结果汇总                            ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');
  console.log('| 来源 | 数量 |');
  console.log('|------|------|');
  const sorted = Object.entries(sourceSummary).sort((a, b) => b[1] - a[1]);
  for (const [tag, count] of sorted) {
    console.log(`| ${tag} | ${count}本 |`);
  }
  console.log(`| **合计** | **${allBooks.length}本** |`);

  // 按维度
  const byDim = {};
  for (const b of allBooks) {
    const d = b.dimension || '未知';
    byDim[d] = (byDim[d] || 0) + 1;
  }
  console.log('\n按维度:');
  for (const [d, c] of Object.entries(byDim).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${d}: ${c}本`);
  }

  // 按深度
  const byDepth = {};
  for (const b of allBooks) {
    const d = b.depth_level || '未知';
    byDepth[d] = (byDepth[d] || 0) + 1;
  }
  console.log('\n按深度:');
  for (const [d, c] of Object.entries(byDepth).sort()) {
    console.log(`  ${d}: ${c}本`);
  }

  return allBooks;
}

// ===== 命令行入口 =====
async function main() {
  const args = process.argv.slice(2);
  const writeToDb = args.includes('--db');
  const shallow = args.includes('--shallow');

  const books = await run({ shallow });

  // 保存 JSON
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputPath = join(__dirname, `seed_output_${timestamp}.json`);
  writeFileSync(outputPath, JSON.stringify(books, null, 2), 'utf8');
  console.log(`\n📄 数据已保存至: ${outputPath}`);

  // 写入数据库
  if (writeToDb) {
    console.log('\n📦 写入数据库...');
    const { upsertCatalogBooks } = await import('./db_catalog.js');

    const groups = {};
    for (const book of books) {
      const tag = book.source_tag || '未知';
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(book);
    }

    let totalInserted = 0, totalMerged = 0;
    for (const [tag, group] of Object.entries(groups)) {
      const weight = getWeightByTag(tag);
      console.log(`  📥 ${tag} (权重 ${weight}, ${group.length}本)...`);
      const result = await upsertCatalogBooks(group, tag, weight);
      totalInserted += result.inserted;
      totalMerged += result.merged;
      console.log(`    → 新增 ${result.inserted} / 合并 ${result.merged}`);
    }

    console.log(`\n✅ 入库完成: 新增 ${totalInserted} / 合并 ${totalMerged}`);
  } else {
    console.log(`\n💡 要写入数据库，加 --db 参数:`);
    console.log(`   node scripts/catalog/seed_crawler.mjs --db`);
  }
}

if (process.argv[1]?.endsWith('seed_crawler.mjs')) {
  main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
