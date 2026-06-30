// ============================================================
// Supabase 数据库工具 — 连接、系统用户、批量写入
// ============================================================

import { createClient } from '@supabase/supabase-js';

// 系统用户 UUID（用于存放推荐书单的固定用户）
export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

let _client = null;

/**
 * 获取 Supabase 客户端
 * 优先使用 service_role key（服务端），否则用 anon key
 */
export function getClient() {
  if (_client) return _client;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('缺少 VITE_SUPABASE_URL 环境变量');

  // 优先使用 service_role key（写入不受 RLS 限制）
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  const key = serviceKey || anonKey;
  if (!key) throw new Error('缺少 Supabase key 环境变量');

  _client = createClient(supabaseUrl, key, {
    auth: { persistSession: false },
  });

  console.log(`[DB] 已连接 ${supabaseUrl} (${serviceKey ? 'service_role' : 'anon'} 模式)`);
  return _client;
}

/**
 * 确保系统用户存在（用于存放推荐书单）
 */
export async function ensureSystemUser() {
  const supabase = getClient();

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', SYSTEM_USER_ID)
    .maybeSingle();

  if (existing) {
    console.log('[DB] 系统用户已存在');
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .insert({
      id: SYSTEM_USER_ID,
      name: '好读书库',
      is_anonymous: true,
    });

  if (error && !error.message.includes('duplicate key')) {
    throw new Error(`创建系统用户失败: ${error.message}`);
  }
  console.log('[DB] 系统用户已创建');
}

/**
 * 批量写入书籍（去重：同 title + source 不重复写入）
 * @param {Array} books - 书籍数组
 * @param {string} sourceTag - 来源标签
 * @param {number} weight - 来源权重
 * @returns {Promise<{inserted: number, skipped: number, errors: number}>}
 */
export async function batchInsertBooks(books, sourceTag, weight) {
  const supabase = getClient();
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  // 先查询此来源已存在的书名
  const { data: existing } = await supabase
    .from('books')
    .select('title')
    .eq('source_tag', sourceTag);

  const existingTitles = new Set((existing || []).map(r => r.title));

  for (const book of books) {
    if (!book.title) {
      skipped++;
      continue;
    }

    // 去重
    if (existingTitles.has(book.title)) {
      skipped++;
      continue;
    }

    const record = {
      user_id: SYSTEM_USER_ID,
      title: book.title.trim(),
      author: (book.author || '').trim(),
      source: sourceTag,
      source_tag: sourceTag,
      dimension: book.dimension || 'narrative',
      level2: book.level2 || 'novel',
      level3: book.level3 || '',
      fiction: book.fiction || '虚构',
      language: book.language || '中文',
      classic: book.classic || false,
      is_foreign_classic: book.is_foreign_classic || false,
      childStar: weight, // 用 childStar 字段暂存权重（后续 API 按此排序）
      month: book.month || '',
      note: book.note || '',
      isbn: book.isbn || '',
    };

    const { error } = await supabase.from('books').insert(record);
    if (error) {
      console.error(`  ✗ 写入失败: ${book.title} — ${error.message}`);
      errors++;
    } else {
      inserted++;
      existingTitles.add(book.title); // 防止同批重复
    }
  }

  return { inserted, skipped, errors };
}

/**
 * 统计数据入库情况
 */
export async function getInsertionReport() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('books')
    .select('source_tag, childStar')
    .eq('user_id', SYSTEM_USER_ID);

  if (error) return { error: error.message };

  const report = {};
  for (const row of data) {
    const key = row.source_tag || '未知来源';
    if (!report[key]) report[key] = { count: 0, weight: row.childStar };
    report[key].count++;
  }

  return report;
}
