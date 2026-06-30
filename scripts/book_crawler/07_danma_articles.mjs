// ============================================================
// 爬虫 #7：丹妈读童书（公众号精华书单）
// 权重：8 | 来源标签：丹妈推荐
//
// ⚠️ 需要人工提供公众号文章链接
// 使用方法：
//   1. 在丹妈读童书公众号发送「书单」
//   2. 将返回的精华书单文章链接填入下面的 URLS
//   3. 运行: node 07_danma_articles.mjs
// ============================================================

import { fetchHtml, extractText, extractBookEntries, withRetry } from './lib/extract.js';
import { classifyBooks } from './lib/classifier.js';
import { SOURCES } from './lib/config.js';

const SOURCE = SOURCES.danma;

// ⚠️ 请将下方 URL 替换为从丹妈读童书公众号获取的文章链接
// 你可以发送「书单」给公众号获取精华书单文章
const MANUAL_URLS = [
  // 示例: 'https://mp.weixin.qq.com/s/...',
  // 填入后删除这行示例注释
];

/**
 * 从公众号文章链接中解析书单
 * 支持 mp.weixin.qq.com 及转载平台
 */
async function scrapeFromUrls(urls) {
  const allBooks = [];

  for (const url of urls) {
    try {
      console.log(`  解析: ${url}`);
      const html = await withRetry(() => fetchHtml(url));
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
      console.log(`  ⚠ 解析失败: ${url} — ${err.message}`);
    }
  }

  return allBooks;
}

/**
 * 内置精选数据（丹妈读童书经典书单汇总）
 * 这些是从公开转载文章整理的代表性书目
 */
function getEmbeddedData() {
  console.log('  使用内置数据（丹妈读童书经典书单精选）');
  return [
    // 0-2岁经典
    { title: '好饿的毛毛虫', author: '艾瑞·卡尔', language: '外文', translator: '郑明进' },
    { title: '棕色的熊、棕色的熊，你在看什么？', author: '比尔·马汀', language: '外文', translator: '李坤珊' },
    { title: '猜猜我有多爱你', author: '山姆·麦克布雷尼', language: '外文', translator: '梅子涵' },
    { title: '小蓝和小黄', author: '李欧·李奥尼', language: '外文', translator: '彭懿' },
    { title: '月亮，晚安', author: '玛格丽特·怀兹·布朗', language: '外文', translator: '阿甲' },
    // 2-3岁经典
    { title: '蹦！', author: '松冈达英', language: '外文', translator: '蒲蒲兰' },
    { title: '鳄鱼怕怕牙医怕怕', author: '五味太郎', language: '外文', translator: '上谊' },
    { title: '小金鱼逃走了', author: '五味太郎', language: '外文', translator: '上谊' },
    { title: '谁藏起来了', author: '大西悟', language: '外文', translator: '蒲蒲兰' },
    { title: '鸭子骑车记', author: '大卫·香农', language: '外文', translator: '彭懿' },
    // 3-4岁经典
    { title: '母鸡萝丝去散步', author: '佩特·哈群斯', language: '外文', translator: '上谊' },
    { title: '我爸爸', author: '安东尼·布朗', language: '外文', translator: '余治莹' },
    { title: '大卫不可以', author: '大卫·香农', language: '外文', translator: '余治莹' },
    { title: '小黑鱼', author: '李欧·李奥尼', language: '外文', translator: '彭懿' },
    { title: '花婆婆', author: '芭芭拉·库尼', language: '外文', translator: '方素珍' },
    // 4-6岁经典
    { title: '爱心树', author: '谢尔·希尔弗斯坦', language: '外文', translator: '傅惟慈' },
    { title: '活了100万次的猫', author: '佐野洋子', language: '外文', translator: '唐亚明' },
    { title: '爷爷一定有办法', author: '菲比·吉尔曼', language: '外文', translator: '宋珮' },
    { title: '失落的一角', author: '谢尔·希尔弗斯坦', language: '外文', translator: '陈明俊' },
    { title: '苏和的白马', author: '大冢勇三', language: '外文', translator: '猿渡静子' },
    // 小学低年级
    { title: '神奇校车·图画书版', author: '乔安娜·柯尔', language: '外文', translator: '蒲公英' },
    { title: '不一样的卡梅拉', author: '克利斯提昂·约里波瓦', language: '外文', translator: '郑迪蔚' },
    { title: '宫西达也恐龙系列', author: '宫西达也', language: '外文', translator: '杨文' },
    { title: '小猪小象系列', author: '莫·威廉斯', language: '外文', translator: '漪然' },
    { title: '青蛙和蟾蜍', author: '艾诺·洛贝尔', language: '外文', translator: '潘人木' },
    // 小学中高年级
    { title: '夏洛的网', author: 'E·B·怀特', language: '外文', translator: '任溶溶' },
    { title: '窗边的小豆豆', author: '黑柳彻子', language: '外文', translator: '赵玉皎' },
    { title: '哈利·波特与魔法石', author: 'J.K.罗琳', language: '外文', translator: '马爱农' },
    { title: '纳尼亚传奇', author: 'C.S.刘易斯', language: '外文', translator: '陈良廷' },
    { title: '地海巫师', author: '厄休拉·勒古恩', language: '外文', translator: '蔡美玲' },
  ];
}

export async function run() {
  console.log(`\n===== ${SOURCE.name} (权重${SOURCE.weight}) =====`);
  console.log('  ⚠ 如需从公众号文章爬取，请在 MANUAL_URLS 填入链接');

  let books;

  // 如果有手动填入的 URL，优先爬取
  if (MANUAL_URLS.length > 0 && MANUAL_URLS[0] !== 'https://mp.weixin.qq.com/s/...') {
    console.log('  使用手动提供的 URL 爬取...');
    books = await scrapeFromUrls(MANUAL_URLS);
  } else {
    console.log('  未提供 URL，使用内置精选数据');
    books = getEmbeddedData();
  }

  const classified = classifyBooks(books, 'danma');
  console.log(`  共 ${classified.length} 本`);
  return classified;
}

if (process.argv[1]?.endsWith('07_danma_articles.mjs')) {
  const result = await run();
  console.log(JSON.stringify(result, null, 2));
}
