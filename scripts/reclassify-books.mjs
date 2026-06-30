// ============================================================
// 跑批脚本：清洗现有书籍的错误分类数据
// 用途：扫描所有分类为默认值（narrative/novel）的书籍，
//       调用 DeepSeek v2 分类 API 重新分类并更新数据库
// 用法：node scripts/reclassify-books.mjs
// ============================================================

// 从 .env.local 加载环境变量
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eqIdx = trimmed.indexOf('=');
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const DEEPSEEK_KEY = process.env.VITE_DEEPSEEK_KEY || process.env.DEEPSEEK_KEY;

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
};

// ---- 分类映射 ----
const DIM_CN_TO_EN = {
  '文学叙事': 'narrative', '自然科学': 'science', '人文社会': 'humanity',
  '艺术创想': 'art_create', '自我成长': 'self_growth',
};

const LEVEL2_CN_TO_EN = {
  '绘本': 'picturebook', '诗歌': 'poetry', '小说': 'novel',
  '寓言神话': 'fable_myth', '散文': 'prose', '传记': 'biography',
  '戏剧': 'drama', '文学赏析': 'lit_criticism',
  '数学逻辑': 'math', '物理': 'physics', '化学': 'chemistry',
  '生物生命': 'biology', '地球地理': 'geography', '天文宇宙': 'astronomy',
  '科学哲学': 'science_philosophy', '科技工程': 'engineering',
  '编程计算': 'coding', 'AI未来': 'ai',
  '中国史': 'chinese_history', '世界史': 'world_history',
  '文化人类': 'anthropology', '宗教神话': 'religion_myth',
  '历史哲学': 'history_philosophy', '人际沟通': 'interpersonal',
  '社会群体': 'sociology', '经济商业': 'economy', '政治制度': 'politics',
  '法律规则': 'law', '伦理哲学': 'ethics',
  '视觉艺术': 'visual_art', '音乐': 'music', '语言文字': 'language',
  '美学哲学': 'aesthetics_philosophy', '创新设计': 'design_thinking',
  '技术哲学': 'tech_philosophy',
  '心理情绪': 'psychology', '身体健康': 'body', '性格优势': 'character',
  '生死生命': 'life_death', '自我哲学': 'self_philosophy',
};

/** 调用 DeepSeek v2 分类 API */
async function callDeepSeekClassify(title, author) {
  const prompt = `【一级分类维度】（必选其一）：
文学叙事、自然科学、人文社会、艺术创想、自我成长

【二级分类体系表】（请严格从该表选择最匹配的二级分类）：
- 文学叙事：绘本、诗歌、小说、寓言神话、散文、传记、戏剧、文学赏析
- 自然科学：数学逻辑、物理、化学、生物生命、地球地理、天文宇宙、科学哲学、科技工程、编程计算、AI未来
- 人文社会：中国史、世界史、文化人类、宗教神话、历史哲学、人际沟通、社会群体、经济商业、政治制度、法律规则、伦理哲学
- 艺术创想：视觉艺术、音乐、语言文字、美学哲学、创新设计、技术哲学
- 自我成长：心理情绪、身体健康、性格优势、生死生命、自我哲学

【三级标签】（请用 1~3 个高度凝练的标签词概括，如："自然教育/育儿/心理"）

仅返回 JSON 格式，不要任何多余的解释。
如果简介为空，请依靠书名和经验推断。
JSON 结构如下：
{"dimension": "一级分类名称", "level2": "二级分类名称", "labels": ["标签1", "标签2"]}`;

  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + DEEPSEEK_KEY,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一位专业的儿童图书分类专家。请根据书籍书名和简介，将其归类到规定的分类体系中。' },
        { role: 'user', content: prompt + '\n\n【输入信息】\n书名：' + title + (author ? '\n作者：' + author : '') },
      ],
      max_tokens: 800,
      temperature: 0.3,
    }),
  });

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    const dimEn = DIM_CN_TO_EN[parsed.dimension];
    const l2En = LEVEL2_CN_TO_EN[parsed.level2];
    if (!dimEn || !l2En) return null;
    return { dimension: dimEn, level2: l2En, labels: parsed.labels || [] };
  } catch {
    return null;
  }
}

/** 更新 Supabase 中某本书的分类 */
async function updateBookClassification(bookId, dimension, level2) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/books?id=eq.${bookId}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ dimension, level2 }),
  });
  return resp.ok;
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  console.log('🔍 扫描需要重新分类的书籍…\n');

  // 读所有书
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/books?select=id,title,author,dimension,level2&order=created_at.desc`, {
    headers: HEADERS,
  });
  if (!resp.ok) { console.error('❌ 读取书籍失败:', resp.status); process.exit(1); }

  const allBooks = await resp.json();
  console.log(`📚 共有 ${allBooks.length} 本书\n`);

  // 筛选需要重新分类的：分类为默认值 narrative/novel，或者明显不匹配的
  const toReclassify = allBooks.filter(b =>
    (b.dimension === 'narrative' && b.level2 === 'novel') ||
    (!b.dimension || !b.level2 || b.dimension === '' || b.level2 === '')
  );

  if (toReclassify.length === 0) {
    console.log('✅ 没有需要重新分类的书籍');
    return;
  }

  console.log(`🔧 需要重新分类: ${toReclassify.length} 本\n`);

  let success = 0;
  let fail = 0;

  for (let i = 0; i < toReclassify.length; i++) {
    const book = toReclassify[i];
    const label = `[${i + 1}/${toReclassify.length}]`;

    try {
      console.log(`${label} 分类中: 《${book.title}》${book.author ? ' - ' + book.author : ''}`);

      const result = await callDeepSeekClassify(book.title, book.author);

      if (!result) {
        console.log(`  ⚠️ 跳过（分类失败）`);
        fail++;
        continue;
      }

      const ok = await updateBookClassification(book.id, result.dimension, result.level2);
      if (ok) {
        console.log(`  ✅ ${result.dimension} → ${result.level2} ${result.labels.length > 0 ? '🏷️ ' + result.labels.join(', ') : ''}`);
        success++;
      } else {
        console.log(`  ❌ 更新失败`);
        fail++;
      }
    } catch (e) {
      console.log(`  ❌ 错误: ${e.message}`);
      fail++;
    }

    // DeepSeek API 限流保护
    if (i < toReclassify.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\n📊 完成：成功 ${success} 本，失败 ${fail} 本`);
}

main().catch(console.error);
