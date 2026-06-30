// ============================================================
// 好读书单 · 目录库写入工具
// 将爬取/整理的书单写入 Supabase catalog_books 表
// 支持去重合并：同 title+author → 合并 source_tag，取最高 weight
// ============================================================

import { createClient } from '@supabase/supabase-js';

// ===== 维度映射（英文 key → 中文 enum 值）=====
const DIMENSION_MAP = {
  narrative: '文学叙事',
  science: '自然科学',
  humanity: '人文社会',
  art_create: '艺术创想',
  self_growth: '自我成长',
};

/** 将维度值统一转为中文（兼容已为中文的情况） */
export function toChineseDimension(dim) {
  if (!dim) return '文学叙事';
  if (DIMENSION_MAP[dim]) return DIMENSION_MAP[dim];
  // 已经是中文
  if (['文学叙事', '自然科学', '人文社会', '艺术创想', '自我成长'].includes(dim)) return dim;
  return '文学叙事';
}

let _client = null;

/**
 * 获取 Supabase 客户端
 */
function getClient() {
  if (_client) return _client;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('缺少 VITE_SUPABASE_URL');

  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;
  if (!key) throw new Error('缺少 Supabase key');

  _client = createClient(supabaseUrl, key, { auth: { persistSession: false } });
  return _client;
}

/**
 * 按书名+作者查询已存在的记录
 */
async function findExistingBooks(books) {
  const supabase = getClient();
  if (books.length === 0) return {};

  // 逐条查询（服务端用 OR 条件一次查完）
  const conditions = books
    .filter(b => b.title)
    .map(b => `and(title.eq.${b.title.replace(/'/g, "''")},author.eq.${(b.author || '').replace(/'/g, "''")})`)
    .join(',');

  if (!conditions) return {};

  const { data, error } = await supabase
    .from('catalog_books')
    .select('id, title, author, source_tag, source_weight')
    .or(conditions);

  if (error) {
    console.error(`[DB] 查询已有记录失败: ${error.message}`);
    return {};
  }

  // 构建 key → record 映射（忽略大小写）
  const map = {};
  for (const row of data || []) {
    const key = `${(row.title || '').toLowerCase().trim()}||${(row.author || '').toLowerCase().trim()}`;
    map[key] = row;
  }
  return map;
}

/**
 * 批量写入或合并书籍到 catalog_books
 *
 * 去重逻辑：
 * - 同 title+author → 合并 source_tag 数组，source_weight 取最高值
 * - 不同 title → 直接插入
 *
 * @param {Array} books - 待写入的书籍数组
 * @param {string} sourceTag - 当前来源标签（如 "丹妈推荐"）
 * @param {number} weight - 当前来源权重
 * @returns {Promise<{inserted: number, merged: number, skipped: number}>}
 */
export async function upsertCatalogBooks(books, sourceTag, weight) {
  const supabase = getClient();
  let inserted = 0;
  let merged = 0;
  let skipped = 0;

  if (books.length === 0) return { inserted, merged, skipped };

  // 1. 查询已存在的记录
  const existingMap = await findExistingBooks(books);

  // 2. 逐条处理
  for (const book of books) {
    if (!book.title) { skipped++; continue; }

    const matchKey = `${(book.title || '').toLowerCase().trim()}||${(book.author || '').toLowerCase().trim()}`;
    const existing = existingMap[matchKey];

    if (existing) {
      // ---- 合并逻辑 ----
      const oldTags = existing.source_tag || [];
      const newTags = oldTags.includes(sourceTag) ? oldTags : [...oldTags, sourceTag];
      const newWeight = Math.max(existing.source_weight || 0, weight);

      const { error } = await supabase
        .from('catalog_books')
        .update({
          source_tag: newTags,
          source_weight: newWeight,
          // 用新数据补充空缺字段
          translator: book.translator || existing.translator || '',
          publisher: book.publisher || existing.publisher || '',
          isbn: book.isbn || existing.isbn || '',
          cover_url: book.cover_url || existing.cover_url || '',
          description: book.description || existing.description || '',
          // 扩宽年龄范围
          age_min: Math.min(book.age_min || 0, existing.age_min || 0),
          age_max: Math.max(book.age_max || 0, existing.age_max || 0),
        })
        .eq('id', existing.id);

      if (error) {
        console.error(`  ✗ 合并失败: ${book.title} — ${error.message}`);
      } else {
        merged++;
      }

    } else {
      // ---- 插入逻辑 ----
      const record = {
        title: book.title.trim(),
        author: (book.author || '').trim(),
        translator: (book.translator || '').trim(),
        publisher: (book.publisher || '').trim(),
        isbn: (book.isbn || '').trim(),
        age_min: book.age_min || 0,
        age_max: book.age_max || 0,
        dimension: toChineseDimension(book.dimension),
        level2: book.level2 || '',
        depth_level: book.depth_level || '入门层',
        source_tag: [sourceTag],
        source_weight: weight,
        cover_url: book.cover_url || '',
        description: book.description || '',
      };

      const { error } = await supabase
        .from('catalog_books')
        .insert(record);

      if (error) {
        // 唯一约束冲突 → 说明并发合并，走更新路径
        if (error.message?.includes('duplicate key') || error.code === '23505') {
          // 重新合并（递归调用自己，但只处理这一本）
          const reMerge = await upsertCatalogBooks([book], sourceTag, weight);
          merged += reMerge.merged;
        } else {
          console.error(`  ✗ 写入失败: ${book.title} — ${error.message}`);
          skipped++;
        }
      } else {
        inserted++;
      }
    }
  }

  return { inserted, merged, skipped };
}

/**
 * 从 catalog_books 中查询按权重排序的书目
 * 用于推荐 API
 */
export async function queryCatalogBooks({
  dimension = null,
  depth = null,
  ageMin = null,
  ageMax = null,
  limit = 20,
  page = 1,
} = {}) {
  const supabase = getClient();

  let query = supabase
    .from('catalog_books')
    .select('*', { count: 'exact' });

  if (dimension) {
    query = query.eq('dimension', dimension);
  }
  if (depth) {
    query = query.eq('depth_level', depth);
  }
  if (ageMin !== null) {
    query = query.lte('age_min', ageMax || 99);
  }
  if (ageMax !== null) {
    query = query.gte('age_max', ageMin || 0);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query
    .order('source_weight', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(`查询失败: ${error.message}`);
  return { data: data || [], total: count || 0, page, limit };
}

/**
 * 统计数据入库情况（按来源统计）
 */
export async function getCatalogReport() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('catalog_books')
    .select('source_tag, source_weight');

  if (error) return { error: error.message };

  // 展开数组来源
  const tagCounts = {};
  let total = 0;
  for (const row of data) {
    total++;
    for (const tag of row.source_tag || []) {
      if (!tagCounts[tag]) tagCounts[tag] = { count: 0, weight: row.source_weight };
      tagCounts[tag].count++;
    }
  }

  return { total, bySource: tagCounts };
}

/**
 * 清空并重建目录库（慎用！全量更新时调用）
 */
export async function resetCatalog() {
  const supabase = getClient();
  const { error } = await supabase
    .from('catalog_books')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // 删所有

  if (error) throw new Error(`清空失败: ${error.message}`);
  console.log('[DB] catalog_books 已清空');
}
