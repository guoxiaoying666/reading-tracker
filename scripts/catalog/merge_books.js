// ============================================================
// 好书单 · 同书名合并脚本
// 同名多条记录 → 合并 source_tag → 保留最高权重 → 删多余
// ============================================================
// 用法: SUPABASE_SERVICE_KEY=xxx node merge_books.js
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error('需要 SUPABASE_SERVICE_KEY 环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

// 分页拉取全部
async function fetchAll() {
  let all = [];
  let from = 0;
  const size = 500;
  while (true) {
    const { data, error } = await supabase
      .from('catalog_books')
      .select('*')
      .range(from, from + size - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < size) break;
    from += size;
  }
  return all;
}

// 合并逻辑
async function main() {
  console.log('拉取数据...');
  const books = await fetchAll();
  console.log('共 ' + books.length + ' 条\n');

  // 按书名分组
  const groups = {};
  for (const b of books) {
    const key = b.title.trim().toLowerCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  }

  // 只处理有重复的分组
  let mergedCount = 0;
  let deletedCount = 0;
  let errorCount = 0;
  const results = [];

  for (const [titleKey, dupBooks] of Object.entries(groups)) {
    if (dupBooks.length <= 1) continue;

    // 按权重降序排列
    dupBooks.sort((a, b) => b.source_weight - a.source_weight);
    const best = dupBooks[0]; // 权重最高的作为主记录
    const rest = dupBooks.slice(1);

    // 合并 source_tag 数组（去重）
    const allTags = new Set();
    for (const b of dupBooks) {
      const tags = Array.isArray(b.source_tag) ? b.source_tag : (b.source_tag ? [b.source_tag] : []);
      for (const t of tags) if (t) allTags.add(t);
    }

    // 找最佳作者（优先非空、真实姓名）
    let bestAuthor = best.author || '';
    for (const b of dupBooks) {
      const a = (b.author || '').trim();
      if (a && !/^[\[：:（(]/.test(a) && a.length <= 6) { bestAuthor = a; break; }
    }
    // 如果 best 的作者不好，但别的记录有更好作者
    if (!bestAuthor || /[的是了被]/.test(bestAuthor)) {
      for (const b of dupBooks) {
        const a = (b.author || '').trim();
        if (a && !/^[\[：:（(]/.test(a) && a.length <= 6 && !/[的是了被]/.test(a)) {
          bestAuthor = a;
          break;
        }
      }
    }

    // 合并其他字段（非空优先）
    const merged = {
      title: best.title.trim(),
      author: bestAuthor,
      translator: rest.reduce((v, b) => v || b.translator, best.translator || ''),
      publisher: rest.reduce((v, b) => v || b.publisher, best.publisher || ''),
      isbn: rest.reduce((v, b) => v || b.isbn, best.isbn || ''),
      age_min: Math.min(...dupBooks.map(b => b.age_min || 99)),
      age_max: Math.max(...dupBooks.map(b => b.age_max || 0)),
      dimension: best.dimension || '文学叙事',
      level2: best.level2 || '',
      depth_level: best.depth_level || '入门层',
      source_tag: [...allTags],
      source_weight: best.source_weight,
      cover_url: rest.reduce((v, b) => v || b.cover_url, best.cover_url || ''),
      description: rest.reduce((v, b) => v || b.description, best.description || ''),
    };

    // age_min/age_max：如果取最小/最大不合理，用有值的那条
    if (merged.age_min === 99) merged.age_min = 0;
    if (merged.age_max === 0 && best.age_max === 0 && rest.some(b => b.age_max > 0)) {
      merged.age_max = Math.max(...dupBooks.map(b => b.age_max || 0));
    }

    // 更新主记录
    const { error: updErr } = await supabase
      .from('catalog_books')
      .update({
        author: merged.author,
        translator: merged.translator,
        publisher: merged.publisher,
        isbn: merged.isbn,
        age_min: merged.age_min,
        age_max: merged.age_max,
        dimension: merged.dimension,
        depth_level: merged.depth_level,
        source_tag: merged.source_tag,
        source_weight: merged.source_weight,
        cover_url: merged.cover_url,
        description: merged.description,
      })
      .eq('id', best.id);

    if (updErr) {
      console.error('  ✗ 更新失败: ' + best.title + ' — ' + updErr.message);
      errorCount++;
      continue;
    }

    // 删除多余记录
    for (const del of rest) {
      const { error: delErr } = await supabase
        .from('catalog_books')
        .delete()
        .eq('id', del.id);
      if (delErr) {
        console.error('  ✗ 删除失败: ' + del.title + ' — ' + delErr.message);
        errorCount++;
      } else {
        deletedCount++;
      }
    }

    mergedCount++;
    results.push({
      title: best.title.trim(),
      sources: [...allTags].join(', '),
      weight: best.source_weight,
      kept: best.id.slice(0, 8),
      deleted: rest.length,
    });
  }

  // 报告
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║    合并完成                                ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('合并组数: ' + mergedCount);
  console.log('删除重复: ' + deletedCount + ' 条');
  console.log('错误: ' + errorCount);
  console.log('');

  if (results.length > 0) {
    console.log('合并明细:');
    // 按来源数降序排列
    results.sort((a, b) => b.sources.split(',').length - a.sources.split(',').length);
    results.forEach(r => {
      console.log('  《' + r.title + '》 → [' + r.sources + '] 权重:' + r.weight);
    });
  }

  // 最终统计
  const { count, error: cntErr } = await supabase
    .from('catalog_books')
    .select('*', { count: 'exact', head: true });
  if (!cntErr) {
    console.log('\n最终 catalog_books 记录数: ' + count);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
