// ============================================================
// 用 DeepSeek 批量优化适龄数据
// 每批 50 本书，API 调用约 35 次覆盖全部 1,760 本
// ============================================================
// SUPABASE_SERVICE_KEY=xxx VITE_DEEPSEEK_KEY=xxx node deepseek_age.mjs
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const deepseekKey = process.env.VITE_DEEPSEEK_KEY;
if (!supabaseUrl || !serviceKey) { console.error('需要 SUPABASE_SERVICE_KEY'); process.exit(1); }
if (!deepseekKey) { console.error('需要 VITE_DEEPSEEK_KEY'); process.exit(1); }

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

/** 调 DeepSeek API */
async function callDeepSeek(books) {
  const prompt = `你是一个童书适龄推荐专家。请为以下每本书推荐适读年龄。
注意：
- age_min 和 age_max 必须是 0-18 之间的整数
- 如果是绘本/图画书 → 通常 0-6 岁
- 如果是桥梁书/拼音书 → 通常 6-9 岁
- 如果是儿童文学/小说 → 通常 7-15 岁
- 如果是科普/百科 → 根据内容深度（6-12 或 10-15）
- 如果是经典名著原版 → 通常 12-18 岁
- 如果是青春期/性教育 → 通常 10-16 岁
- 如果是低幼纸板书/洞洞书 → 0-3 岁

只返回 JSON 数组，不要其他文字：
${JSON.stringify(books.map(b => ({ title: b.title, author: b.author || '', dimension: b.dimension, level2: b.level2 })))}`;

  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + deepseekKey,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个童书年龄推荐专家。只输出JSON数组，不要任何其他文字。每个对象格式：{"title":"书名","age_min":整数,"age_max":整数}' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`API ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const json = await resp.json();
  const raw = json.choices?.[0]?.message?.content || '';

  // 尝试提取 JSON
  try {
    // 找第一个 [ 和最后一个 ]
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    return JSON.parse(raw);
  } catch {
    console.error('  ⚠ DeepSeek 返回无法解析:', raw.slice(0, 100));
    return null;
  }
}

async function main() {
  // 1. 拉取全部书籍
  let allBooks = [];
  let from = 0;
  while (true) {
    const { data } = await supabase.from('catalog_books').select('id, title, author, dimension, level2, age_min, age_max').range(from, from + 499);
    if (!data || data.length === 0) break;
    allBooks.push(...data);
    from += 500;
  }
  console.log('共 ' + allBooks.length + ' 本书\n');

  // 2. 分批调用 DeepSeek
  const BATCH_SIZE = 50;
  const batches = [];
  for (let i = 0; i < allBooks.length; i += BATCH_SIZE) {
    batches.push(allBooks.slice(i, i + BATCH_SIZE));
  }
  console.log('分 ' + batches.length + ' 批，每批 ' + BATCH_SIZE + ' 本\n');

  let totalUpdated = 0;
  let totalErrors = 0;
  let totalSkipped = 0;

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    console.log(`[${batchIdx + 1}/${batches.length}] 处理 ${batch.length} 本...`);

    let result;
    try {
      result = await callDeepSeek(batch);
    } catch (err) {
      console.log(`  ❌ API 调用失败: ${err.message}`);
      totalErrors += batch.length;
      continue;
    }

    if (!result) {
      console.log('  ⚠ 返回为空，跳过');
      totalSkipped += batch.length;
      continue;
    }

    // 逐条更新
    for (const item of result) {
      const book = batch.find(b => b.title === item.title);
      if (!book) continue;

      const ageMin = Math.max(0, Math.min(18, item.age_min || 0));
      const ageMax = Math.max(ageMin, Math.min(18, item.age_max || 0));

      // 如果已有年龄且 DeepSeek 建议没差很多，跳过
      if (book.age_min > 0 || book.age_max > 0) {
        const diff = Math.abs(book.age_min - ageMin) + Math.abs(book.age_max - ageMax);
        if (diff <= 2) { totalSkipped++; continue; }
      }

      const { error } = await supabase
        .from('catalog_books')
        .update({ age_min: ageMin, age_max: ageMax })
        .eq('id', book.id);

      if (error) {
        console.error(`  ✗ ${book.title}: ${error.message}`);
        totalErrors++;
      } else {
        totalUpdated++;
      }
    }

    // 进度
    console.log(`  → 更新 ${totalUpdated} / 跳过 ${totalSkipped} / 错误 ${totalErrors}`);

    // API 限速保护
    if (batchIdx < batches.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // 3. 最终统计
  console.log('\n=== 完成 ===');
  console.log('更新: ' + totalUpdated + ' 本');
  console.log('跳过: ' + totalSkipped + ' 本');
  console.log('错误: ' + totalErrors + ' 本');

  const { data: verify } = await supabase.from('catalog_books').select('age_min, age_max');
  const ages = {};
  for (const b of verify || []) {
    if (b.age_min > 0 || b.age_max > 0) {
      ages[b.age_min + '-' + b.age_max] = (ages[b.age_min + '-' + b.age_max] || 0) + 1;
    }
  }
  console.log('\n最终年龄分布:');
  for (const [k, v] of Object.entries(ages).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    console.log('  ' + k + '岁: ' + v + '本');
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
