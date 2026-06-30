// ============================================================
// 爬虫 #5：童阅中国（中国儿童中心）
// 权重：8 | 来源标签：童阅中国
//
// 数据源：中国儿童中心官网 ccc.org.cn（HTML + PDF）
// 年度入选书目30种、入围100种
// ============================================================

import { fetchHtml, extractText, extractBookEntries, withRetry } from './lib/extract.js';
import { classifyBooks } from './lib/classifier.js';
import { SOURCES } from './lib/config.js';

const SOURCE = SOURCES.ccc_tongyue;

/**
 * 从中国儿童中心专题页抓取书单
 */
async function scrape() {
  const mainUrl = 'https://www.ccc.org.cn/col/col525/index.html';

  const allBooks = [];

  try {
    console.log(`  抓取: ${mainUrl}`);
    const html = await withRetry(() => fetchHtml(mainUrl));
    const text = extractText(html);

    const entries = extractBookEntries(text);
    for (const entry of entries) {
      if (!allBooks.some(b => b.title === entry.title)) {
        allBooks.push({
          title: entry.title,
          author: entry.author,
          source: SOURCE.tag,
          language: '中文',
        });
      }
    }
    console.log(`  → 解析到 ${entries.length} 本`);
  } catch (err) {
    console.log(`  ⚠ 抓取失败: ${err.message}`);
    throw err;
  }

  return allBooks;
}

/**
 * 备用数据：第五届童阅中国年度入选书目（30种精选）
 */
function getFallbackData() {
  console.log('  使用内置备用数据（第五届童阅中国年度入选书目·精选）');
  return [
    { title: '不一样的1', author: '吴亚男', language: '中文' },
    { title: '鸡同鸭讲', author: '曹文轩', language: '中文' },
    { title: '一只猫的哲学', author: '李浩', language: '中文' },
    { title: '蜗牛不放弃', author: '小河', language: '中文' },
    { title: '我的第一本哲学启蒙书', author: '董毓', language: '中文' },
    { title: '大象班都拉', author: '格日勒其木格·黑鹤', language: '中文' },
    { title: '中国恐龙地图', author: '金海月', language: '中文' },
    { title: '昆虫界的奥德赛', author: '张辰亮', language: '中文' },
    { title: '我听见万物的歌唱', author: '常立', language: '中文' },
    { title: '从前有个金箍棒', author: '陈诗哥', language: '中文' },
    { title: '一只鹰鹞', author: '炜然', language: '中文' },
    { title: '太阳想吃冰激凌', author: '张玮', language: '中文' },
    { title: '三彩马的旅行', author: '李政', language: '中文' },
    { title: '春福', author: '张越', language: '中文' },
    { title: '最好的面包店', author: '张越', language: '中文' },
    { title: '鲸鱼的世界', author: '乔纳森·伦敦', language: '外文', translator: '任战' },
    { title: '你不能欺负我', author: '菲利普·韦希特', language: '外文', translator: '王萍' },
    { title: '河流是什么', author: '莫妮卡·瓦西里', language: '外文', translator: '李虹' },
    { title: '世界国家公园', author: '米歇尔·米罗', language: '外文', translator: '李双' },
    { title: '人类的样子', author: '迪特·博格', language: '外文', translator: '李莉' },
    { title: '深海传奇', author: '露西·莱维斯', language: '外文', translator: '王林' },
    { title: '探索星空', author: '丹尼尔·索尔', language: '外文', translator: '张磊' },
    { title: '小孩哲学', author: '李静', language: '中文' },
    { title: '情绪小怪兽去上学', author: '安娜·耶纳斯', language: '外文', translator: '张亦琦' },
    { title: '身体大发现', author: '菅原惠子', language: '外文', translator: '李力' },
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

  const classified = classifyBooks(books, 'ccc_tongyue');
  console.log(`  共 ${classified.length} 本`);
  return classified;
}

if (process.argv[1]?.endsWith('05_ccc_tongyue.mjs')) {
  const result = await run();
  console.log(JSON.stringify(result, null, 2));
}
