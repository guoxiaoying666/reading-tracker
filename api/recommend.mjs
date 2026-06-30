// ============================================================
// 好读·冷启动书单推荐 API
// 从 catalog_books 查询 → 权重排序 → 来源限额 → 返回
//
// GET /api/recommend
//   参数:
//     dimension  - 五维分类（文学叙事/自然科学/人文社会/艺术创想/自我成长）
//     depth      - 深度层级（入门层/进阶层/鉴赏层）
//     age        - 适龄区间（0-3, 4-6, 7-9, 10-12, 13+）
//     limit      - 每页条数（默认 20，最大 50）
//     page       - 页码（默认 1）
//     keyword    - 关键字搜索（匹配书名/作者）
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { getTierByTag, getTierCap } from '../scripts/book_crawler/lib/config.js';

// ---- 来源限额配置 ----
// key = source_tag, value = max count in top-N
// 使用 tier 级别控制
const TIER_CAP_RATIOS = {
  T1: 0.40,  // 同一 T1 来源不超过 top-N 的 40%
  T2: 0.30,  // 同一 T2 来源不超过 30%
  T3: 0.20,  // 同一 T3 来源不超过 20%
};

// ---- 年龄区间映射 ----
const AGE_RANGES = {
  '0-3':  { min: 0,  max: 3 },
  '4-6':  { min: 4,  max: 6 },
  '7-9':  { min: 7,  max: 9 },
  '10-12': { min: 10, max: 12 },
  '13+':  { min: 13, max: 99 },
};

// ---- Supabase 客户端 ----
function getClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Missing Supabase config');
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

// ============================================================
// 来源限额算法
// ============================================================

/**
 * 从候选列表中应用来源限额（分层轮询 + 缺口回补）
 *
 * 策略：
 * 1. 候选按权重排序，取 top 200
 * 2. 分层轮询：T1→T2→T3 交替各取1本
 * 3. 某层级耗尽后，名额回补给其他层级
 * 4. 同层内同来源最多占该层限额的 2/3
 *
 * @param {Array} candidates - 候选书籍列表
 * @param {number} targetCount - 目标返回数量
 * @returns {Array} 应用限额后的列表
 */
function applySourceCap(candidates, targetCount) {
  if (candidates.length === 0) return [];

  // 按层级分组（保留原排序）
  const byTier = { T1: [], T2: [], T3: [] };

  for (const book of candidates) {
    const primarySource = Array.isArray(book.source_tag)
      ? book.source_tag[0]
      : (book.source_tag || '未知');
    const tier = getTierByTag(primarySource);
    if (byTier[tier]) byTier[tier].push({ book, source: primarySource });
  }

  // 每层的最大限额
  const tierCaps = {
    T1: Math.max(1, Math.ceil(targetCount * (TIER_CAP_RATIOS.T1 || 0.40))),
    T2: Math.max(1, Math.ceil(targetCount * (TIER_CAP_RATIOS.T2 || 0.30))),
    T3: Math.max(1, Math.ceil(targetCount * (TIER_CAP_RATIOS.T3 || 0.20))),
  };

  const result = [];
  const tierCounts = { T1: 0, T2: 0, T3: 0 };
  const sourceCounts = {};
  const tierDone = { T1: false, T2: false, T3: false };

  // 同层内同来源限额（防止单来源刷屏）
  const srcCapPerTier = {
    T1: Math.max(1, Math.ceil(tierCaps.T1 * 2 / 3)),
    T2: Math.max(1, Math.ceil(tierCaps.T2 * 2 / 3)),
    T3: Math.max(1, Math.ceil(tierCaps.T3 * 2 / 3)),
  };

  const pointers = { T1: 0, T2: 0, T3: 0 };

  // 轮询：逐层交替取书
  while (result.length < targetCount) {
    let anyAdded = false;

    for (const tier of ['T1', 'T2', 'T3']) {
      if (result.length >= targetCount) break;
      if (tierDone[tier]) continue;

      const pool = byTier[tier];
      let ptr = pointers[tier];

      // 寻找该层下一本可用的书
      while (ptr < pool.length) {
        const { book, source } = pool[ptr];

        // 检查该层是否已达限额
        if (tierCounts[tier] >= tierCaps[tier]) {
          tierDone[tier] = true;
          break;
        }

        // 检查该来源是否已达层内限额
        if ((sourceCounts[source] || 0) < srcCapPerTier[tier]) {
          result.push(book);
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
          tierCounts[tier]++;
          pointers[tier] = ptr + 1;
          anyAdded = true;
          break;
        }
        ptr++;
      }

      if (ptr >= pool.length) {
        tierDone[tier] = true; // 该层已耗尽
      }
    }

    if (!anyAdded) break; // 所有层级都耗尽或无符合条件的书
  }

  // ★ 如果结果不够 targetCount，差额从剩余候选中按权重补
  if (result.length < targetCount) {
    const selectedIds = new Set(result.map(r => r.id));
    const remaining = candidates.filter(c => !selectedIds.has(c.id));

    // 先按剩余限额补一圈
    const remainingCaps = {};
    let totalRemaining = 0;
    for (const tier of ['T1', 'T2', 'T3']) {
      remainingCaps[tier] = tierCaps[tier] - tierCounts[tier];
      totalRemaining += remainingCaps[tier];
    }

    for (const book of remaining) {
      if (result.length >= targetCount) break;
      const primarySource = Array.isArray(book.source_tag)
        ? book.source_tag[0]
        : (book.source_tag || '未知');
      const tier = getTierByTag(primarySource);
      if (remainingCaps[tier] > 0) {
        result.push(book);
        remainingCaps[tier]--;
        totalRemaining--;
      }
    }

    // 仍不够？按各层原始比例分配剩余名额
    if (result.length < targetCount) {
      const afterCap = new Set(result.map(r => r.id));
      const slotsLeft = targetCount - result.length;

      // 按 tierCap 比例算各层应补多少
      const capTotal = tierCaps.T1 + tierCaps.T2 + tierCaps.T3;
      const extraTarget = {
        T1: Math.max(0, Math.round(slotsLeft * tierCaps.T1 / capTotal)),
        T2: Math.max(0, Math.round(slotsLeft * tierCaps.T2 / capTotal)),
      };
      extraTarget.T3 = slotsLeft - extraTarget.T1 - extraTarget.T2;
      for (const t of ['T1','T2','T3']) if (extraTarget[t] < 0) extraTarget[t] = 0;

      const extraAdded = { T1: 0, T2: 0, T3: 0 };
      for (const book of candidates) {
        if (result.length >= targetCount) break;
        if (afterCap.has(book.id)) continue;
        const primarySource = Array.isArray(book.source_tag)
          ? book.source_tag[0]
          : (book.source_tag || '未知');
        const tier = getTierByTag(primarySource);
        if (extraAdded[tier] < extraTarget[tier]) {
          result.push(book);
          extraAdded[tier]++;
        }
      }
    }

    // ★ 终极兜底：还不够就从权重最高的剩余候选中任意补满
    if (result.length < targetCount) {
      const seen = new Set(result.map(r => r.id));
      for (const book of candidates) {
        if (result.length >= targetCount) break;
        if (!seen.has(book.id)) result.push(book);
      }
    }
  }

  return result;
}

// ============================================================
// 查询构造器
// ============================================================

/**
 * 构建 Supabase 查询参数
 */
function buildQuery({ dimension, depth, age, keyword, limit, page }) {
  const params = {};
  const filters = [];

  // 维度筛选
  if (dimension) {
    filters.push({ field: 'dimension', operator: 'eq', value: dimension });
  }

  // 深度筛选
  if (depth) {
    filters.push({ field: 'depth_level', operator: 'eq', value: depth });
  }

  // 年龄筛选
  if (age && AGE_RANGES[age]) {
    const range = AGE_RANGES[age];
    // 书的 age_min ≤ 用户年龄上限 AND age_max ≥ 用户年龄下限
    // 即：书覆盖区间与用户区间有交集
    params.age_floor = range.min;
    params.age_ceil = range.max;
  }

  // 关键字搜索
  if (keyword) {
    params.keyword = keyword;
  }

  // 分页（内部用更大的 buffer，因为后面要做 cap 过滤）
  // 高权重来源（T1）可能占比大，所以 buffer 要足够包含 T2/T3
  // 使用固定200的最大buffer，确保各级来源都能进入候选池
  params.dbLimit = 200;
  params.dbPage = page;

  return { params, filters };
}

// ============================================================
// API Handler（适配 server.mjs 和 Vercel）
// ============================================================

export default async function handler(req, res) {
  // 仅支持 GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '仅支持 GET' });
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const queryParams = {
      dimension: url.searchParams.get('dimension') || null,
      depth: url.searchParams.get('depth') || null,
      age: url.searchParams.get('age') || null,
      keyword: url.searchParams.get('keyword') || null,
      limit: Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50),
      page: Math.max(1, parseInt(url.searchParams.get('page') || '1', 10)),
    };

    const { params, filters } = buildQuery(queryParams);
    const supabase = getClient();

    // ---- 构建查询 ----
    let query = supabase
      .from('catalog_books')
      .select('*', { count: 'exact' });

    // 应用过滤器
    for (const f of filters) {
      query = query[f.operator](f.field, f.value);
    }

    // 年龄区间过滤：书与用户年龄区间有交集
    if (params.age_floor !== undefined) {
      query = query.lte('age_min', params.age_ceil);
      query = query.gte('age_max', params.age_floor);
    }

    // 关键字搜索
    if (params.keyword) {
      query = query.or(
        `title.ilike.%${params.keyword}%,author.ilike.%${params.keyword}%`
      );
    }

    // 排序：先权重降序，后创建时间降序
    query = query
      .order('source_weight', { ascending: false })
      .order('updated_at', { ascending: false });

    // ---- 先查总数（无分页） ----
    const { count: totalCount, error: countError } = await query;
    if (countError) throw new Error(countError.message);

    // ---- 查数据（用 buffer 量） ----
    const fetchFrom = 0;
    const fetchTo = params.dbLimit - 1;

    const { data: bufferData, error: dataError } = await query.range(fetchFrom, fetchTo);
    if (dataError) throw new Error(dataError.message);

    const candidates = bufferData || [];

    // ---- 应用来源限额 ----
    const capLimited = applySourceCap(candidates, queryParams.limit);

    // ---- 分页偏移（在限额结果上做分页） ----
    // 注意：因为限额是动态的，真实分页需要记录偏移。
    // MVP 阶段简单处理：page=1 返回前 N 条
    if (queryParams.page > 1) {
      // 非第1页，返回空（后续可加 cursor-based 分页）
      return res.json({
        data: [],
        total: totalCount,
        page: queryParams.page,
        limit: queryParams.limit,
        caps_applied: true,
        note: '第 2 页及以上暂不支持（需 cursor-based）',
      });
    }

    // ---- 补充元信息 ----
    const enriched = capLimited.map(book => ({
      id: book.id,
      title: book.title,
      author: book.author,
      translator: book.translator,
      publisher: book.publisher,
      isbn: book.isbn,
      age_range: book.age_min || book.age_max
        ? `${book.age_min || 0}-${book.age_max || 99}`
        : null,
      dimension: book.dimension,
      level2: book.level2,
      depth_level: book.depth_level,
      sources: book.source_tag,       // 来源标签数组
      source_weight: book.source_weight,
      cover_url: book.cover_url,
      description: book.description,
    }));

    // ---- 来源占比统计 ----
    const sourceStats = {};
    for (const book of enriched) {
      const primary = Array.isArray(book.sources) ? book.sources[0] : '未知';
      sourceStats[primary] = (sourceStats[primary] || 0) + 1;
    }

    return res.json({
      data: enriched,
      total: totalCount,
      page: queryParams.page,
      limit: queryParams.limit,
      caps_applied: true,
      source_stats: sourceStats,
    });

  } catch (err) {
    console.error('[recommend] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
