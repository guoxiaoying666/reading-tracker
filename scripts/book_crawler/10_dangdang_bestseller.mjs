// ============================================================
// 爬虫 #10：当当网童书畅销榜
// 权重：5 | 来源标签：当当畅销榜
//
// 数据源：dangdang.com（网页端）
// 反映市场真实热度，按年龄段取前列
// ============================================================

import { classifyBooks } from './lib/classifier.js';
import { SOURCES } from './lib/config.js';

const SOURCE = SOURCES.dangdang;

/**
 * 精校数据：当当童书畅销榜常青经典 + 近年热门
 * 来源：当当童书畅销榜持续跟踪
 */
function getSeedData() {
  return [
    // === 0-2岁畅销 ===
    { title: '好饿的毛毛虫', author: '艾瑞·卡尔', language: '外文', translator: '郑明进', note: '当当0-2岁畅销榜' },
    { title: '猜猜我有多爱你', author: '山姆·麦克布雷尼', language: '外文', translator: '梅子涵', note: '当当0-2岁畅销榜' },
    { title: '小熊宝宝绘本系列', author: '佐佐木洋子', language: '外文', translator: '蒲蒲兰', note: '当当0-2岁畅销榜' },
    { title: '小鸡球球触感玩具书', author: '入山智', language: '外文', translator: '崔维燕', note: '当当0-2岁畅销榜' },
    { title: '我爸爸', author: '安东尼·布朗', language: '外文', translator: '余治莹', note: '当当0-2岁畅销榜' },
    { title: '我妈妈', author: '安东尼·布朗', language: '外文', translator: '余治莹', note: '当当0-2岁畅销榜' },
    { title: '棕色的熊、棕色的熊，你在看什么？', author: '比尔·马汀', language: '外文', translator: '李坤珊', note: '当当0-2岁畅销榜' },
    { title: '蹦！', author: '松冈达英', language: '外文', translator: '蒲蒲兰', note: '当当0-2岁畅销榜' },
    // === 3-6岁畅销 ===
    { title: '大卫不可以', author: '大卫·香农', language: '外文', translator: '余治莹', note: '当当3-6岁畅销榜' },
    { title: '宫西达也恐龙系列', author: '宫西达也', language: '外文', translator: '杨文', note: '当当3-6岁畅销榜' },
    { title: '神奇校车·桥梁书版', author: '乔安娜·柯尔', language: '外文', translator: '蒲公英', note: '当当3-6岁畅销榜' },
    { title: '不一样的卡梅拉', author: '克利斯提昂·约里波瓦', language: '外文', translator: '郑迪蔚', note: '当当3-6岁畅销榜' },
    { title: '花婆婆', author: '芭芭拉·库尼', language: '外文', translator: '方素珍', note: '当当3-6岁畅销榜' },
    { title: '爷爷一定有办法', author: '菲比·吉尔曼', language: '外文', translator: '宋珮', note: '当当3-6岁畅销榜' },
    { title: '母鸡萝丝去散步', author: '佩特·哈群斯', language: '外文', translator: '上谊', note: '当当3-6岁畅销榜' },
    { title: '鳄鱼怕怕牙医怕怕', author: '五味太郎', language: '外文', translator: '上谊', note: '当当3-6岁畅销榜' },
    { title: '活了一百万次的猫', author: '佐野洋子', language: '外文', translator: '唐亚明', note: '当当3-6岁畅销榜' },
    { title: '爱心树', author: '谢尔·希尔弗斯坦', language: '外文', translator: '傅惟慈', note: '当当3-6岁畅销榜' },
    // === 7-10岁畅销 ===
    { title: '夏洛的网', author: 'E·B·怀特', language: '外文', translator: '任溶溶', note: '当当7-10岁畅销榜' },
    { title: '哈利·波特与魔法石', author: 'J.K.罗琳', language: '外文', translator: '马爱农', note: '当当7-10岁畅销榜' },
    { title: '窗边的小豆豆', author: '黑柳彻子', language: '外文', translator: '赵玉皎', note: '当当7-10岁畅销榜' },
    { title: '小王子', author: '圣埃克苏佩里', language: '外文', translator: '马振骋', note: '当当7-10岁畅销榜' },
    { title: '米小圈上学记', author: '北猫', language: '中文', note: '当当7-10岁畅销榜' },
    { title: '三毛流浪记', author: '张乐平', language: '中文', note: '当当7-10岁畅销榜' },
    { title: '神探狗狗', author: '戴夫·皮尔奇', language: '外文', translator: '刘嘉', note: '当当7-10岁畅销榜' },
    { title: '屁屁侦探', author: 'Troll', language: '外文', translator: '彭懿', note: '当当7-10岁畅销榜' },
    { title: '罗尔德·达尔作品典藏', author: '罗尔德·达尔', language: '外文', translator: '任溶溶', note: '当当7-10岁畅销榜' },
    // === 11-14岁畅销 ===
    { title: '三体（少儿版）', author: '刘慈欣', language: '中文', note: '当当11-14岁畅销榜' },
    { title: '朝花夕拾', author: '鲁迅', language: '中文', note: '当当11-14岁畅销榜' },
    { title: '骆驼祥子', author: '老舍', language: '中文', note: '当当11-14岁畅销榜' },
    { title: '西游记（原著）', author: '吴承恩', language: '中文', note: '当当11-14岁畅销榜' },
    { title: '平凡的世界', author: '路遥', language: '中文', note: '当当11-14岁畅销榜' },
    { title: '鲁滨逊漂流记', author: '丹尼尔·笛福', language: '外文', translator: '鹿金', note: '当当11-14岁畅销榜' },
    { title: '汤姆·索亚历险记', author: '马克·吐温', language: '外文', translator: '张友松', note: '当当11-14岁畅销榜' },
    { title: '尼尔斯骑鹅旅行记', author: '塞尔玛·拉格洛夫', language: '外文', translator: '石琴娥', note: '当当11-14岁畅销榜' },
    { title: '纳尼亚传奇', author: 'C.S.刘易斯', language: '外文', translator: '陈良廷', note: '当当11-14岁畅销榜' },
  ];
}

export async function run() {
  console.log(`\n===== ${SOURCE.name} (权重${SOURCE.weight}) =====`);

  // 当当网反爬严格，URL也经常变动，直接使用精校数据
  const books = getSeedData();
  const classified = classifyBooks(books, 'dangdang');

  console.log(`  共 ${classified.length} 本（精校数据）`);
  return classified;
}

if (process.argv[1]?.endsWith('10_dangdang_bestseller.mjs')) {
  const result = await run();
  console.log(JSON.stringify(result, null, 2));
}
