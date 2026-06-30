// ============================================================
// 爬虫 #8：童书妈妈三川玲（公众号精华书单）
// 权重：7 | 来源标签：童书妈妈推荐
//
// ⚠️ 如需从公众号文章爬取，请将链接填入 MANUAL_URLS
// 精校数据来自童书妈妈历年年度书单 + 「100本伟大的书」
// ============================================================

import { fetchHtml, extractText, extractBookEntries, withRetry } from './lib/extract.js';
import { classifyBooks } from './lib/classifier.js';
import { SOURCES } from './lib/config.js';

const SOURCE = SOURCES.tongshumama;

const MANUAL_URLS = [];

/**
 * 精校数据：童书妈妈三川玲经典书单
 * 来源：历年公众号年度书单 + 网易专栏 + 「100本伟大的书」
 */
function getSeedData() {
  return [
    // === 乐趣·幽默漫画 ===
    { title: '屁屁侦探', author: 'Troll', language: '外文', translator: '彭懿' },
    { title: '神探狗狗', author: '戴夫·皮尔奇', language: '外文', translator: '刘嘉' },
    { title: '蓝发女孩希尔达', author: '卢克·皮尔森', language: '外文', translator: '马爱农' },
    { title: '穿内裤的狼', author: '威尔弗雷德·卢帕诺', language: '外文', translator: '李双' },
    // === 滋养心灵·文学 ===
    { title: '长袜子皮皮', author: '林格伦', language: '外文', translator: '李之义' },
    { title: '卡尔维诺意大利童话', author: '伊塔洛·卡尔维诺', language: '外文', translator: '马小漠' },
    { title: '男孩、鼹鼠、狐狸和马', author: '查理·麦克西', language: '外文', translator: '汪晗雪' },
    { title: '小熊维尼的世界', author: 'A·A·米尔恩', language: '外文', translator: '任溶溶' },
    // === 经典绘本 ===
    { title: '蔡皋经典中国绘本', author: '蔡皋', language: '中文' },
    { title: '宫泽贤治经典绘本', author: '宫泽贤治', language: '外文', translator: '周龙梅' },
    { title: '小鸟和鳄鱼', author: '邓正祺', language: '中文' },
    { title: '野兽国', author: '莫里斯·桑达克', language: '外文', translator: '宋珮' },
    // === 心理自助 ===
    { title: '拉鲁斯儿童心理小百科', author: '卡琳·西蒙', language: '外文', translator: '陈杉' },
    { title: '我的名字叫"害怕"', author: '米拉·洛贝', language: '外文', translator: '张桂贞' },
    { title: '儿童情绪管理', author: '特蕾西·莫洛尼', language: '外文', translator: '李婷' },
    // === 好奇心·科普 ===
    { title: '神奇校车·图画书版', author: '乔安娜·柯尔', language: '外文', translator: '蒲公英' },
    { title: '我们的感觉', author: '菲利普·森普特', language: '外文', translator: '陈小齐' },
    { title: '科学之友', author: '五味太郎等', language: '外文', translator: '彭懿' },
    { title: '身体的秘密', author: '丹·格林', language: '外文', translator: '王秋实' },
    { title: '儿童大学', author: '乌尔里希·扬森', language: '外文', translator: '王萍' },
    // === 文化传承 ===
    { title: '儿童版·彩绘全本三国演义', author: '罗贯中', language: '中文' },
    { title: '穿越时空看文明', author: '米莱童书', language: '中文' },
    { title: '写给儿童的中国历史', author: '陈卫平', language: '中文' },
    { title: '写给儿童的世界历史', author: '陈卫平', language: '中文' },
    // === 艺术·审美 ===
    { title: '我的艺术小书', author: '莎娜·戈瓦尔德', language: '外文', translator: '陈阳' },
    { title: '温迪嬷嬷讲述1000幅世界名画', author: '温迪·贝克特', language: '外文', translator: '颜岭' },
    { title: '你好，艺术！', author: '结城昌子', language: '外文', translator: '郑忠' },
    // === 成长·认知 ===
    { title: '不可以摸我的屁股', author: '保拉·马萨拉', language: '外文', translator: '王蕾' },
    { title: 'DK高效学习法', author: 'DK出版社', language: '外文', translator: '李晨' },
    // === 100本伟大的书（精选）===
    { title: '小王子', author: '圣埃克苏佩里', language: '外文', translator: '周克希' },
    { title: '夏洛的网', author: 'E·B·怀特', language: '外文', translator: '任溶溶' },
    { title: '窗边的小豆豆', author: '黑柳彻子', language: '外文', translator: '赵玉皎' },
    { title: '秘密花园', author: 'F·H·伯内特', language: '外文', translator: '李文俊' },
    { title: '地海巫师', author: '厄休拉·勒古恩', language: '外文', translator: '蔡美玲' },
    // === 父母书单 ===
    { title: '通往幸福的教育', author: '三川玲', language: '中文' },
    { title: '游戏力', author: '劳伦斯·科恩', language: '外文', translator: '李岩' },
    { title: '正面管教', author: '简·尼尔森', language: '外文', translator: '玉冰' },
    { title: '孩子是如何学习的', author: '约翰·霍特', language: '外文', translator: '张雪兰' },
  ];
}

export async function run() {
  console.log(`\n===== ${SOURCE.name} (权重${SOURCE.weight}) =====`);

  let books = [];

  // 尝试网易专栏
  try {
    const html = await withRetry(() => fetchHtml(
      'https://kids.163.com/special/tongshuchubanmama_05/'
    ));
    const text = extractText(html);
    const entries = extractBookEntries(text);
    for (const entry of entries) {
      if (!books.some(b => b.title === entry.title)) {
        books.push({ ...entry, source: SOURCE.tag, language: '中文' });
      }
    }
    console.log(`  网易专栏: ${entries.length} 本`);
  } catch (err) {
    console.log(`  ⚠ 网易专栏抓取失败`);
  }

  // 合并精校数据
  const seed = getSeedData();
  for (const book of seed) {
    if (!books.some(b => b.title === book.title)) {
      books.push({ ...book, source: SOURCE.tag });
    }
  }

  const classified = classifyBooks(books, 'tongshumama');
  console.log(`  共 ${classified.length} 本（含精校数据 ${seed.length} 本）`);
  return classified;
}

if (process.argv[1]?.endsWith('08_tongshumama_articles.mjs')) {
  const result = await run();
  console.log(JSON.stringify(result, null, 2));
}
