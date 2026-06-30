// ============================================================
// 爬虫 #4：中国教育报·教师推荐十大童书
// 权重：8 | 来源标签：中教报推荐
//
// 数据源：中国教育新闻网 paper.jyb.cn（HTML）
// 每年仅10本，手动维护更可靠
// ============================================================

import { fetchHtml, extractText, extractBookEntries, withRetry } from './lib/extract.js';
import { classifyBooks } from './lib/classifier.js';
import { SOURCES } from './lib/config.js';

const SOURCE = SOURCES.jyb_top10;

/**
 * 尝试抓取中国教育报历年十大童书页面
 */
async function scrape() {
  const urls = [
    { year: '2025', url: 'https://share.app3.jyb.cn/news_d/4264c0e409bfddcd9a4ffd912356f3a4' },
    { year: '2024', url: 'http://paper.jyb.cn/zgjyb/html/2025-04/23/content_144748_18463676.htm' },
    { year: '2023', url: 'https://zhuanlan.zhihu.com/p/680727429' },
    { year: '2021', url: 'http://www.jyb.cn/rmtzgjyb/202112/t20211229_672782.html' },
  ];

  const allBooks = [];

  for (const { year, url } of urls) {
    try {
      console.log(`  抓取 ${year}年度: ${url}`);
      const html = await withRetry(() => fetchHtml(url));
      const text = extractText(html);

      const entries = extractBookEntries(text);
      for (const entry of entries) {
        if (!allBooks.some(b => b.title === entry.title)) {
          allBooks.push({
            title: entry.title,
            author: entry.author,
            source: SOURCE.tag,
            month: year,
            language: '中文',
          });
        }
      }
      console.log(`  → 找到 ${entries.length} 本`);
    } catch (err) {
      console.log(`  ⚠ ${year}年度 抓取失败: ${err.message}`);
    }
  }

  return allBooks;
}

/**
 * 备选手动数据（经搜索整理的历年十大童书）
 */
function getFallbackData() {
  console.log('  使用内置备用数据');
  return [
    // 2025年度
    { title: '1938回答2026', author: '刘慈欣', month: '2025', language: '中文' },
    { title: '给孩子的考古', author: '王巍', month: '2025', language: '中文' },
    { title: '讲给孩子听的中轴线上的老故事', author: '王丹', month: '2025', language: '中文' },
    // 2024年度
    { title: '古建筑里的中国智慧', author: '李华东', month: '2024', language: '中文' },
    { title: '给妈妈的一百万封信', author: '木也', month: '2024', language: '中文' },
    { title: '木拉提爷爷，你去哪儿？', author: '唐亚明', month: '2024', language: '中文' },
    { title: '我们的语言', author: '袁坚', month: '2024', language: '中文' },
    // 2023年度
    { title: '穿越北京中轴线', author: '郑军', month: '2023', language: '中文' },
    { title: '大海上的脚印', author: '王棵', month: '2023', language: '中文' },
    { title: '十个月的奇迹', author: '孙睿', month: '2023', language: '中文' },
    // 2021年度
    { title: '1分钟数学', author: '陈永明', month: '2021', language: '中文' },
    { title: '大象的旅程', author: '格日勒其木格·黑鹤', month: '2021', language: '中文' },
    { title: '丰子恺家塾课', author: '丰子恺', month: '2021', language: '中文' },
    // 跨年度经典
    { title: '小兵张嘎', author: '徐光耀', month: '2020', language: '中文' },
    { title: '一百条裙子', author: '埃莉诺·埃斯特斯', month: '2020', language: '外文', translator: '马爱农' },
    { title: '彼得兔的故事', author: '毕翠克丝·波特', month: '2020', language: '外文', translator: '阿甲' },
  ];
}

export async function run() {
  console.log(`\n===== ${SOURCE.name} (权重${SOURCE.weight}) =====`);

  let books;
  try {
    books = await scrape();
  } catch (err) {
    console.log(`  ⚠ 网页抓取失败: ${err.message}`);
  }

  if (!books || books.length === 0) {
    books = getFallbackData();
  }

  const classified = classifyBooks(books, 'jyb_top10');
  console.log(`  共 ${classified.length} 本`);
  return classified;
}

if (process.argv[1]?.endsWith('04_jyb_top10.mjs')) {
  const result = await run();
  console.log(JSON.stringify(result, null, 2));
}
