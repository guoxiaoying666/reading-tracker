// ============================================================
// 爬虫 #2：亲近母语分级阅读书目
// 权重：9 | 来源标签：亲近母语分级
//
// 数据源：qjmy.cn/edu/book/category/（HTML 结构化页面）
// ============================================================

import { fetchHtml, extractText, withRetry } from './lib/extract.js';
import { classifyBooks } from './lib/classifier.js';
import { SOURCES } from './lib/config.js';

const SOURCE = SOURCES.qjmy_graded;

/**
 * 从亲近母语分级阅读页面抓取书单
 * 每个年级有独立的页面
 */
async function scrape() {
  const grades = [
    { url: 'https://qjmy.cn/edu/book/category/', label: '全部分级' },
  ];

  const allBooks = [];

  for (const grade of grades) {
    try {
      console.log(`  抓取: ${grade.label}`);
      const html = await withRetry(() => fetchHtml(grade.url));
      const text = extractText(html);

      // 亲近母语的页面结构：列表形式展示书名和作者
      // 尝试多种匹配模式
      const lines = text.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      let found = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 模式1：寻找《》包裹的书名
        const bookMatch = line.match(/《([^》]+)》/g);
        if (bookMatch) {
          for (const m of line.matchAll(/《([^》]+)》/g)) {
            const title = m[1].trim();
            if (title && title.length > 1 && title.length < 50) {
              // 尝试从临近行提取作者
              let author = '';
              const authorMatch = line.match(/[／/]\s*([^\s《》\d]{2,10})/);
              if (authorMatch) author = authorMatch[1];
              else if (i < lines.length - 1) {
                const nextLine = lines[i + 1];
                const authorMatch2 = nextLine.match(/^[（(]?([^）)）\s，。]{2,10})[）)]?$/);
                if (authorMatch2) author = authorMatch2[1];
              }

              if (!allBooks.some(b => b.title === title)) {
                allBooks.push({
                  title,
                  author: author || '',
                  source: SOURCE.tag,
                  language: '中文',
                });
                found++;
              }
            }
          }
        }
      }

      console.log(`  → 解析到 ${found} 本`);
    } catch (err) {
      console.log(`  ⚠ ${grade.label} 抓取失败: ${err.message}`);
    }
  }

  return allBooks;
}

/**
 * 备用：内嵌亲近母语经典分级书目（精简版·代表书目）
 * 当网页抓取失败时使用
 */
function getFallbackData() {
  console.log('  使用内置备用数据（亲近母语分级书目·精选）');
  return [
    // === 一年级 ===
    { title: '小巴掌童话', author: '张秋生', language: '中文' },
    { title: '笨狼的故事', author: '汤素兰', language: '中文' },
    { title: '小猪唏哩呼噜', author: '孙幼军', language: '中文' },
    { title: '大卫上学去', author: '大卫·香农', language: '外文', translator: '余治莹' },
    { title: '猜猜我有多爱你', author: '山姆·麦克布雷尼', language: '外文', translator: '梅子涵' },
    { title: '青蛙和蟾蜍', author: '艾诺·洛贝尔', language: '外文', translator: '潘人木' },
    { title: '我妈妈', author: '安东尼·布朗', language: '外文', translator: '余治莹' },
    // === 二年级 ===
    { title: '没头脑和不高兴', author: '任溶溶', language: '中文' },
    { title: '大头儿子和小头爸爸', author: '郑春华', language: '中文' },
    { title: '花婆婆', author: '芭芭拉·库尼', language: '外文', translator: '方素珍' },
    { title: '爷爷一定有办法', author: '菲比·吉尔曼', language: '外文', translator: '宋珮' },
    { title: '安徒生童话', author: '安徒生', language: '外文', translator: '叶君健' },
    { title: '格林童话', author: '格林兄弟', language: '外文', translator: '魏以新' },
    // === 三年级 ===
    { title: '夏洛的网', author: 'E·B·怀特', language: '外文', translator: '任溶溶' },
    { title: '长袜子皮皮', author: '林格伦', language: '外文', translator: '李之义' },
    { title: '稻草人', author: '叶圣陶', language: '中文' },
    { title: '宝葫芦的秘密', author: '张天翼', language: '中文' },
    { title: '时代广场的蟋蟀', author: '乔治·塞尔登', language: '外文', translator: '傅湘雯' },
    // === 四年级 ===
    { title: '西游记', author: '吴承恩', language: '中文' },
    { title: '草原上的小木屋', author: '劳拉·英格尔斯·怀尔德', language: '外文', translator: '杨永汉' },
    { title: '秘密花园', author: 'F·H·伯内特', language: '外文', translator: '李文俊' },
    { title: '绿野仙踪', author: '莱曼·弗兰克·鲍姆', language: '外文', translator: '马爱农' },
    { title: '爱的教育', author: '亚米契斯', language: '外文', translator: '夏丏尊' },
    // === 五年级 ===
    { title: '城南旧事', author: '林海音', language: '中文' },
    { title: '小王子', author: '圣埃克苏佩里', language: '外文', translator: '周克希' },
    { title: '窗边的小豆豆', author: '黑柳彻子', language: '外文', translator: '赵玉皎' },
    { title: '西游记（原著）', author: '吴承恩', language: '中文' },
    // === 六年级 ===
    { title: '朝花夕拾', author: '鲁迅', language: '中文' },
    { title: '鲁滨逊漂流记', author: '丹尼尔·笛福', language: '外文', translator: '鹿金' },
    { title: '汤姆·索亚历险记', author: '马克·吐温', language: '外文', translator: '张友松' },
    { title: '尼尔斯骑鹅旅行记', author: '塞尔玛·拉格洛夫', language: '外文', translator: '石琴娥' },
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

  // 分类
  const classified = classifyBooks(books, 'qjmy_graded');

  console.log(`  共 ${classified.length} 本`);
  return classified;
}

if (process.argv[1]?.endsWith('02_qjmy_graded.mjs')) {
  const result = await run();
  console.log(JSON.stringify(result, null, 2));
}
