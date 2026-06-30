#!/usr/bin/env node
// ============================================================
// 好读书单自动化采集 — 主运行脚本
// 依次执行所有爬虫 → 输出 JSON → 可选写入 Supabase
// ============================================================
// 用法：
//   node run_all.mjs                   # 仅爬取并输出 JSON
//   SUPABASE_SERVICE_KEY=xxx node run_all.mjs --db   # 爬取并写入数据库
//   node run_all.mjs --source=02       # 只跑指定来源
// ============================================================

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 加载 .env
try {
  const envPaths = [
    join(__dirname, '.env'),
    join(__dirname, '..', '..', '.env.local'),
  ];
  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const eqIdx = trimmed.indexOf('=');
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch (_) {}

// ===== 解析参数 =====
const args = process.argv.slice(2);
const writeToDb = args.includes('--db');
const sourceFilter = args.find(a => a.startsWith('--source='));
const onlySource = sourceFilter ? sourceFilter.split('=')[1] : null;

// ===== 爬虫注册表 =====
const CRAWLERS = [
  { key: '01', name: '四季童读', module: './01_nlc_seasons.mjs' },
  { key: '02', name: '亲近母语分级', module: './02_qjmy_graded.mjs' },
  { key: '03', name: '百班千人共读', module: './03_100class_books.mjs' },
  { key: '04', name: '中国教育报十大童书', module: './04_jyb_top10.mjs' },
  { key: '05', name: '童阅中国', module: './05_ccc_tongyue.mjs' },
  { key: '06', name: '红泥巴年度TOP10', module: './06_hongniba_top10.mjs' },
  { key: '07', name: '丹妈读童书', module: './07_danma_articles.mjs' },
  { key: '08', name: '童书妈妈三川玲', module: './08_tongshumama_articles.mjs' },
  { key: '10', name: '当当网童书畅销榜', module: './10_dangdang_bestseller.mjs' },
];

// ===== 主流程 =====
async function main() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║    好读·书单自动化采集系统 v1.0           ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log(`写入数据库: ${writeToDb ? '✅ 是' : '❌ 否（仅输出JSON）'}`);
  if (onlySource) console.log(`仅运行来源: ${onlySource}`);
  console.log('');

  const allResults = {};
  const report = [];

  // 依次运行爬虫
  for (const crawler of CRAWLERS) {
    if (onlySource && !crawler.key.startsWith(onlySource)) continue;

    try {
      const mod = await import(crawler.module);
      if (typeof mod.run !== 'function') {
        console.log(`  ⚠ ${crawler.name}: 没有 run() 函数，跳过`);
        continue;
      }

      const books = await mod.run();
      allResults[crawler.key] = books;

      report.push({
        source: crawler.name,
        count: books.length,
        status: '✅',
      });
    } catch (err) {
      console.log(`  ❌ ${crawler.name} 出错: ${err.message}`);
      report.push({
        source: crawler.name,
        count: 0,
        status: '❌ ' + err.message,
      });
    }

    console.log('');
  }

  // ===== 输出统计报告 =====
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║    爬取结果汇总                            ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');
  console.log('| 来源 | 数量 | 状态 |');
  console.log('|------|------|------|');
  let total = 0;
  for (const r of report) {
    console.log(`| ${r.source} | ${r.count} | ${r.status} |`);
    total += r.count;
  }
  console.log(`| **合计** | **${total}** | |`);
  console.log('');

  // ===== 写入 JSON 文件 =====
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputPath = join(__dirname, `output_${timestamp}.json`);
  writeFileSync(outputPath, JSON.stringify(allResults, null, 2), 'utf8');
  console.log(`📄 完整数据已保存至: ${outputPath}`);

  // ===== 写入数据库 =====
  if (writeToDb) {
    console.log('\n📦 写入数据库...');
    const { getClient, ensureSystemUser, batchInsertBooks, getInsertionReport } = await import('./lib/db.js');
    const { SOURCES } = await import('./lib/config.js');

    try {
      // 确保系统用户
      await ensureSystemUser();

      // 逐来源入库
      let totalInserted = 0;
      let totalSkipped = 0;
      let totalErrors = 0;

      for (const crawler of CRAWLERS) {
        const books = allResults[crawler.key];
        if (!books || books.length === 0) continue;

        // 找对应的来源配置
        const sourceConfig = Object.values(SOURCES).find(s =>
          crawler.name.includes(s.name.slice(0, 4))
        );

        const sourceTag = sourceConfig?.tag || crawler.name;
        const weight = sourceConfig?.weight || 5;

        console.log(`\n  📥 ${sourceTag} (权重 ${weight})...`);
        const { inserted, skipped, errors } = await batchInsertBooks(books, sourceTag, weight);
        totalInserted += inserted;
        totalSkipped += skipped;
        totalErrors += errors;
        console.log(`    写入 ${inserted} / 跳过 ${skipped} / 错误 ${errors}`);
      }

      console.log(`\n✅ 入库完成: 写入 ${totalInserted} / 跳过 ${totalSkipped} / 错误 ${totalErrors}`);

      // 打印完整统计
      const dbReport = await getInsertionReport();
      if (!dbReport.error) {
        console.log('\n📊 数据库存量统计:');
        console.log('| 来源 | 数量 |');
        console.log('|------|------|');
        for (const [tag, info] of Object.entries(dbReport)) {
          console.log(`| ${tag} | ${info.count}本 |`);
        }
      }

    } catch (err) {
      console.error(`\n❌ 数据库写入失败: ${err.message}`);
      console.log('建议：请提供 SUPABASE_SERVICE_KEY 环境变量');
    }
  } else {
    console.log('\n💡 提示: 若要写入数据库，请运行:');
    console.log('  SUPABASE_SERVICE_KEY=your_key node run_all.mjs --db');
  }

  console.log('\n✅ 完成！');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
