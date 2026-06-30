#!/usr/bin/env node
// ============================================================
// 好读书单 · 主流水线
// 编排所有步骤：
//   1. 种子爬虫（公众号精华文章） → 提取书单
//   2. 已有爬虫（四季童读/亲近母语等） → 提取书单
//   3. 统一合并 → 分类 → 深度判定 → 入库 catalog_books
//
// 用法：
//   node pipeline.mjs                             # 全量运行
//   node pipeline.mjs --seed-only                 # 仅跑种子爬虫
//   node pipeline.mjs --crawlers-only             # 仅跑已有爬虫
//   node pipeline.mjs --db                        # 爬取并写入数据库
//   node pipeline.mjs --db --seed-only            # 仅种子爬虫并入库
// ============================================================

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 加载 .env
try {
  const envPaths = [
    join(__dirname, '.env'),
    join(__dirname, '..', '.env.local'),
  ];
  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      for (const line of readFileSync(envPath, 'utf8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#') || !t.includes('=')) continue;
        const eq = t.indexOf('=');
        const k = t.slice(0, eq).trim();
        const v = t.slice(eq + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
    }
  }
} catch (_) {}

// ===== 依赖 =====
import { getWeightByTag } from '../book_crawler/lib/config.js';

// ===== 爬虫注册表 =====
const CRAWLER_DIR = join(__dirname, '..', 'book_crawler');

const CRAWLERS = [
  { key: '01', name: '国家图书馆·四季童读', module: join(CRAWLER_DIR, '01_nlc_seasons.mjs'), tag: '国图四季童读' },
  { key: '02', name: '亲近母语分级阅读',    module: join(CRAWLER_DIR, '02_qjmy_graded.mjs'), tag: '亲近母语分级' },
  { key: '03', name: '百班千人共读书目',    module: join(CRAWLER_DIR, '03_100class_books.mjs'), tag: '百班千人' },
  { key: '04', name: '中国教育报十大童书',  module: join(CRAWLER_DIR, '04_jyb_top10.mjs'), tag: '中教报推荐' },
  { key: '05', name: '童阅中国',            module: join(CRAWLER_DIR, '05_ccc_tongyue.mjs'), tag: '童阅中国' },
  { key: '06', name: '红泥巴年度TOP10',    module: join(CRAWLER_DIR, '06_hongniba_top10.mjs'), tag: '红泥巴推荐' },
  { key: '07', name: '丹妈读童书',          module: join(CRAWLER_DIR, '07_danma_articles.mjs'), tag: '丹妈推荐' },
  { key: '08', name: '童书妈妈三川玲',      module: join(CRAWLER_DIR, '08_tongshumama_articles.mjs'), tag: '童书妈妈推荐' },
  { key: '10', name: '当当网童书畅销榜',    module: join(CRAWLER_DIR, '10_dangdang_bestseller.mjs'), tag: '当当畅销榜' },
];

// ============================
// 主流程
// ============================

export async function run(options = {}) {
  const { seedOnly = false, crawlersOnly = false, writeToDb = false } = options;

  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   好读·冷启动书单流水线 v1.0              ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');
  console.log(`模式: ${seedOnly ? '仅种子爬虫' : crawlersOnly ? '仅已有爬虫' : '全量'}`);
  console.log(`写入数据库: ${writeToDb ? '✅' : '❌（仅输出 JSON）'}`);
  console.log('');

  const allBooks = [];
  const report = [];

  // ---- 阶段 1：种子爬虫 ----
  if (!crawlersOnly) {
    console.log('━'.repeat(50));
    console.log('阶段 1/2: 种子爬虫（公众号精华文章）');
    console.log('━'.repeat(50));

    try {
      const { run: runSeed } = await import('./seed_crawler.mjs');
      const seedBooks = await runSeed({
        recursive: true,
      });
      allBooks.push(...seedBooks);
      report.push({ source: '种子爬虫（公众号）', count: seedBooks.length, status: '✅' });
      console.log(`\n阶段 1 完成: ${seedBooks.length} 本\n`);
    } catch (err) {
      console.error(`\n❌ 种子爬虫失败: ${err.message}`);
      report.push({ source: '种子爬虫（公众号）', count: 0, status: '❌ ' + err.message });
    }
  }

  // ---- 阶段 2：已有爬虫 ----
  if (!seedOnly) {
    console.log('━'.repeat(50));
    console.log('阶段 2/2: 系统来源爬虫（官方/专业/市场）');
    console.log('━'.repeat(50));

    for (const crawler of CRAWLERS) {
      try {
        const mod = await import(crawler.module);
        if (typeof mod.run !== 'function') {
          console.log(`  ⚠ ${crawler.name}: 没有 run()，跳过`);
          continue;
        }

        const books = await mod.run();
        // 给每本书加上 source_tag 和 weight
        const enriched = books.map(b => ({
          ...b,
          source_tag: crawler.tag,
          source_weight: getWeightByTag(crawler.tag),
        }));
        allBooks.push(...enriched);
        report.push({ source: crawler.name, count: books.length, status: '✅' });
      } catch (err) {
        console.log(`  ❌ ${crawler.name}: ${err.message}`);
        report.push({ source: crawler.name, count: 0, status: '❌ ' + err.message });
      }

      // 来源间延迟
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // ---- 汇总报告 ----
  console.log('\n' + '━'.repeat(50));
  console.log('📊 汇总');
  console.log('━'.repeat(50));
  console.log('');
  console.log('| 来源 | 数量 | 状态 |');
  console.log('|------|------|------|');
  let total = 0;
  for (const r of report) {
    console.log(`| ${r.source} | ${r.count} | ${r.status} |`);
    total += r.count;
  }
  console.log(`| **合计** | **${total}** | |`);

  // ---- 保存 JSON ----
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputPath = join(__dirname, `pipeline_output_${timestamp}.json`);
  writeFileSync(outputPath, JSON.stringify(allBooks, null, 2), 'utf8');
  console.log(`\n📄 完整数据已保存至: ${outputPath}`);

  // ---- 写入数据库 ----
  if (writeToDb) {
    console.log('\n📦 写入 catalog_books 数据库...');
    const { upsertCatalogBooks } = await import('./db_catalog.js');

    const groups = {};
    for (const book of allBooks) {
      const tag = book.source_tag || '未知';
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(book);
    }

    let totalInserted = 0, totalMerged = 0;
    for (const [tag, group] of Object.entries(groups)) {
      const weight = getWeightByTag(tag);
      console.log(`  📥 ${tag} (权重 ${weight}) — ${group.length} 本`);
      const result = await upsertCatalogBooks(group, tag, weight);
      totalInserted += result.inserted;
      totalMerged += result.merged;
    }

    console.log(`\n✅ 入库完成: 新增 ${totalInserted} / 合并 ${totalMerged}`);

    // 打印统计
    const { getCatalogReport } = await import('./db_catalog.js');
    const dbReport = await getCatalogReport();
    if (!dbReport.error) {
      console.log('\n📊 catalog_books 存量统计:');
      console.log(`  总计: ${dbReport.total} 本`);
      console.log('  按来源:');
      for (const [tag, info] of Object.entries(dbReport.bySource).sort()) {
        console.log(`    ${tag}: ${info.count} 本`);
      }
    }
  }

  console.log('\n✅ 流水线完成！');
  return allBooks;
}

// ===== 命令行入口 =====
async function main() {
  const args = process.argv.slice(2);

  const seedOnly = args.includes('--seed-only');
  const crawlersOnly = args.includes('--crawlers-only');
  const writeToDb = args.includes('--db');

  await run({ seedOnly, crawlersOnly, writeToDb });
}

if (process.argv[1]?.endsWith('pipeline.mjs')) {
  main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
