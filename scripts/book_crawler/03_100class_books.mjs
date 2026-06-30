// ============================================================
// 爬虫 #3：百班千人共读书目
// 权重：8 | 来源标签：百班千人
//
// 数据源：bookclass100.cn 按期数发布共读书目
// 每期覆盖1-6年级，每班3-4本书
// ============================================================

import { fetchHtml, extractText, withRetry } from './lib/extract.js';
import { classifyBooks } from './lib/classifier.js';
import { SOURCES } from './lib/config.js';

const SOURCE = SOURCES.class100;

/**
 * 精校数据：百班千人历年经典共读书目精选
 * 来源：bookclass100.cn 多期共读书目汇总
 */
function getSeedData() {
  return [
    // === 低年级（1-2年级）经典共读 ===
    { title: '躲猫猫大王', author: '张晓玲', language: '中文' },
    { title: '团圆', author: '余丽琼', language: '中文' },
    { title: '一园青菜成了精', author: '周翔', language: '中文' },
    { title: '老鼠娶新娘', author: '张玲玲', language: '中文' },
    { title: '阿诗有块大花布', author: '符文征', language: '中文' },
    { title: '云朵面包', author: '白希那', language: '外文', translator: '明书' },
    { title: '妈妈的红沙发', author: '薇拉·威廉斯', language: '外文', translator: '柯倩华' },
    { title: '小真的长头发', author: '高楼方子', language: '外文', translator: '季颖' },
    { title: '耗子大爷在家吗？', author: '周翔', language: '中文' },
    { title: '神笔马良', author: '洪汛涛', language: '中文' },
    { title: '我有友情要出租', author: '方素珍', language: '中文' },
    { title: '吃六顿晚餐的猫', author: '英格·莫尔', language: '外文', translator: '黄廼毓' },
    // === 中年级（3-4年级）经典共读 ===
    { title: '一百条裙子', author: '埃莉诺·埃斯特斯', language: '外文', translator: '马爱农' },
    { title: '苹果树上的外婆', author: '米拉·洛贝', language: '外文', translator: '张桂贞' },
    { title: '吹牛大王历险记', author: '毕尔格', language: '外文', translator: '曹乃云' },
    { title: '亲爱的汉修先生', author: '贝芙莉·克莱瑞', language: '外文', translator: '柯倩华' },
    { title: '木头娃娃的旅行', author: '雷切尔·菲尔德', language: '外文', translator: '陈静抒' },
    { title: '精灵鼠小弟', author: 'E·B·怀特', language: '外文', translator: '任溶溶' },
    { title: '傻狗温迪克', author: '凯特·迪卡米洛', language: '外文', translator: '傅蓓蒂' },
    { title: '豆蔻镇的居民和强盗', author: '托比扬·埃格纳', language: '外文', translator: '叶君健' },
    { title: '查理和巧克力工厂', author: '罗尔德·达尔', language: '外文', translator: '任溶溶' },
    { title: '长袜子皮皮', author: '林格伦', language: '外文', translator: '李之义' },
    // === 高年级（5-6年级）经典共读 ===
    { title: '呼兰河传', author: '萧红', language: '中文' },
    { title: '草房子', author: '曹文轩', language: '中文' },
    { title: '青铜葵花', author: '曹文轩', language: '中文' },
    { title: '小兵张嘎', author: '徐光耀', language: '中文' },
    { title: '上下五千年', author: '林汉达', language: '中文' },
    { title: '中国神话故事', author: '聂作平', language: '中文' },
    { title: '西游记（少儿版）', author: '吴承恩', language: '中文' },
    { title: '三国演义（少儿版）', author: '罗贯中', language: '中文' },
    { title: '水浒传（少儿版）', author: '施耐庵', language: '中文' },
    { title: '城南旧事', author: '林海音', language: '中文' },
    // === 近年新增书目 ===
    { title: '兔子坡', author: '罗伯特·罗素', language: '外文', translator: '禹田' },
    { title: '波普先生的企鹅', author: '理查德·阿特沃特', language: '外文', translator: '安聿麒' },
    { title: '数星星', author: '洛伊丝·劳里', language: '外文', translator: '汴桥' },
    { title: '蓝色的海豚岛', author: '斯·奥台尔', language: '外文', translator: '傅定邦' },
    { title: '毛毛', author: '米切尔·恩德', language: '外文', translator: '李士勋' },
  ];
}

export async function run() {
  console.log(`\n===== ${SOURCE.name} (权重${SOURCE.weight}) =====`);

  // 尝试网页抓取
  let webBooks = [];
  try {
    const html = await withRetry(() => fetchHtml(
      'https://www.bookclass100.cn/plus/tags.php?/%E4%B9%A6%E5%8D%95/4/'
    ));
    const text = extractText(html);
    // 用《》找书名
    const matches = text.matchAll(/《([^》]+)》/g);
    for (const m of matches) {
      const title = m[1].trim();
      if (title && title.length > 1 && title.length < 50 &&
          !webBooks.some(b => b.title === title) &&
          !title.includes('书单') && !title.includes('共读') && !title.includes('报名')) {
        webBooks.push({ title, author: '', source: SOURCE.tag, language: '中文' });
      }
    }
    console.log(`  网页抓取到 ${webBooks.length} 本`);
  } catch (err) {
    console.log(`  ⚠ 网页抓取失败: ${err.message}`);
  }

  // 合并网页 + 精校数据
  const seed = getSeedData();
  const allBooks = [...webBooks];

  for (const book of seed) {
    if (!allBooks.some(b => b.title === book.title)) {
      allBooks.push({ ...book, source: SOURCE.tag });
    }
  }

  const classified = classifyBooks(allBooks, 'class100');
  console.log(`  共 ${classified.length} 本（其中精校数据 ${seed.length} 本）`);
  return classified;
}

if (process.argv[1]?.endsWith('03_100class_books.mjs')) {
  const result = await run();
  console.log(JSON.stringify(result, null, 2));
}
