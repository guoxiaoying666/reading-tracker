import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

// ===== 年龄推断规则 =====

// 1. 二级分类 → 默认年龄段
const LEVEL2_AGE = {
  // 绘本/低幼
  'picturebook':    { min: 0, max: 6 },
  // 诗歌
  'poetry':         { min: 6, max: 12 },
  // 小说类
  'novel':          { min: 7, max: 15 },
  'fable_myth':     { min: 4, max: 10 },
  'drama':          { min: 10, max: 15 },
  'biography':      { min: 8, max: 15 },
  'prose':          { min: 8, max: 15 },
  'lit_criticism':  { min: 10, max: 18 },
  // 科学类
  'math':           { min: 6, max: 12 },
  'physics':        { min: 10, max: 15 },
  'chemistry':      { min: 10, max: 15 },
  'biology':        { min: 4, max: 12 },
  'geography':      { min: 6, max: 12 },
  'astronomy':      { min: 6, max: 12 },
  'science_philosophy': { min: 6, max: 12 },
  'engineering':    { min: 8, max: 15 },
  'coding':         { min: 8, max: 15 },
  // 人文类
  'chinese_history': { min: 7, max: 15 },
  'world_history':   { min: 7, max: 15 },
  'anthropology':   { min: 8, max: 15 },
  'religion_myth':  { min: 8, max: 15 },
  'history_philosophy': { min: 10, max: 18 },
  'interpersonal':  { min: 6, max: 12 },
  'sociology':      { min: 10, max: 15 },
  'economy':        { min: 8, max: 15 },
  'politics':       { min: 10, max: 18 },
  'law':            { min: 10, max: 18 },
  'ethics':         { min: 8, max: 18 },
  // 艺术类
  'visual_art':     { min: 3, max: 12 },
  'music':          { min: 3, max: 12 },
  'language':       { min: 6, max: 12 },
  'aesthetics_philosophy': { min: 10, max: 18 },
  'design_thinking': { min: 8, max: 15 },
  'tech_philosophy': { min: 10, max: 18 },
  // 自我成长
  'psychology':     { min: 6, max: 15 },
  'body':           { min: 6, max: 15 },
  'character':      { min: 4, max: 10 },
  'life_death':     { min: 6, max: 15 },
  'self_philosophy': { min: 10, max: 18 },
};

// 2. 书名关键词 → 年龄修正（精确匹配时覆盖默认值）
const TITLE_AGE_HINTS = [
  // 低幼
  { kw: ['幼儿', '宝宝', '婴儿', '低幼', '0-3', '0-2', '0岁', '1岁', '2岁', '3岁',
         '小小', '撕不烂', '布书', '触摸书', '洞洞书', '发声书', '翻翻书',
         '纸板书', '洗澡书', '咿呀', '晚安', '睡前', '入园', '抱抱', '亲亲'], min: 0, max: 3 },
  // 3-6岁
  { kw: ['3-6', '4岁', '5岁', '6岁', '学龄前', '幼儿园', '学前', '绘本', '图画书',
         '情绪', '品格', '习惯'], min: 3, max: 6 },
  // 6-9岁（小学低年级）
  { kw: ['7岁', '8岁', '9岁', '小学低年级', '桥梁书', '拼音', '注音', '一年级', '二年级',
         '三年级', '1-3'], min: 6, max: 9 },
  // 10-12岁（小学高年级）
  { kw: ['10岁', '11岁', '12岁', '小学高年级', '高年级', '四年级', '五年级', '六年级',
         '少年', '青少年', '青春期', '4-6年级'], min: 10, max: 12 },
  // 中学生
  { kw: ['中学', '初中', '高中', '13岁', '14岁', '15岁', '少年'], min: 12, max: 15 },
  // 小学通用
  { kw: ['小学生', '小学', '学古文', '数学思维'], min: 6, max: 12 },
];

// 3. 来源 → 年龄提示（有些来源专注特定年龄段）
const SOURCE_AGE = {
  '0-3岁书单': { min: 0, max: 3 },
};

async function main() {
  // 取所有没有年龄的书
  let all = [];
  let from = 0;
  while (true) {
    const { data } = await supabase.from('catalog_books').select('*').range(from, from + 499);
    if (!data || data.length === 0) break;
    all.push(...data);
    from += 500;
  }
  console.log('总共 ' + all.length + ' 本');

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const book of all) {
    // 已经有年龄的跳过
    if ((book.age_min || 0) > 0 || (book.age_max || 0) > 0) { skipped++; continue; }

    const title = book.title || '';
    const level2 = book.level2 || '';

    // 1. 书名关键词精确匹配（优先级最高）
    let ageMin = 0, ageMax = 0;
    for (const hint of TITLE_AGE_HINTS) {
      if (hint.kw.some(k => title.includes(k))) {
        ageMin = hint.min;
        ageMax = hint.max;
        break;
      }
    }

    // 2. 如果书名没匹配到，用 level2 默认值
    if (!ageMin && !ageMax && LEVEL2_AGE[level2]) {
      const def = LEVEL2_AGE[level2];
      ageMin = def.min;
      ageMax = def.max;
    }

    // 3. 兜底：绘本 → 0-6岁，其他 → 6-12岁
    if (!ageMin && !ageMax) {
      if (book.dimension === '文学叙事' && level2 === 'picturebook') {
        ageMin = 0; ageMax = 6;
      } else {
        ageMin = 6; ageMax = 12;
      }
    }

    // 更新数据库
    const { error } = await supabase
      .from('catalog_books')
      .update({ age_min: ageMin, age_max: ageMax })
      .eq('id', book.id);

    if (error) {
      console.error('  ✗ ' + book.title + ': ' + error.message);
      errors++;
    } else {
      updated++;
    }
  }

  console.log('\n更新: ' + updated + ' 本');
  console.log('跳过（已有年龄）: ' + skipped + ' 本');
  console.log('错误: ' + errors + ' 本\n');

  // 验证结果
  const { data: verify } = await supabase.from('catalog_books').select('age_min, age_max');
  const withAge = verify.filter(b => (b.age_min || 0) > 0 || (b.age_max || 0) > 0);
  console.log('最终有年龄的: ' + withAge.length + '/' + verify.length + ' 本 (' + Math.round(withAge.length/verify.length*100) + '%)');
  
  const ages = {};
  for (const b of verify) {
    if (b.age_min || b.age_max) {
      ages[b.age_min + '-' + b.age_max] = (ages[b.age_min + '-' + b.age_max] || 0) + 1;
    }
  }
  console.log('年龄分布:');
  for (const [a,c] of Object.entries(ages).sort()) console.log('  ' + a + '岁: ' + c + '本');
}

main().catch(err => { console.error(err); process.exit(1); });
