import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// 导入 API 模块（与生产服务器 server.mjs 共享，消除重复）
import authHandler from './api/auth.mjs'
import { callDeepSeek } from './api/deepseek.mjs'
import lookupHandler from './api/lookup.mjs'
import searchIsbnHandler from './api/search-isbn.mjs'
import classifyHandler from './api/classify.mjs'
import adminHandler from './api/admin.mjs'

// 读取 .env.local 中的环境变量，注入 process.env 供 API 模块使用
function loadEnvVars() {
  const vars = {};
  try {
    const text = fs.readFileSync('.env.local', 'utf8');
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const eq = t.indexOf('=');
      vars[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
    }
  } catch (_) {}
  return vars;
}

const ENV = loadEnvVars();
const SUPABASE_URL = ENV.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = ENV.VITE_SUPABASE_ANON_KEY || '';

// 将 API Keys 注入 process.env，供共享模块读取
process.env.VITE_DEEPSEEK_KEY = ENV.VITE_DEEPSEEK_KEY || '';
if (ENV.JUHE_ISBN_KEY) process.env.JUHE_ISBN_KEY = ENV.JUHE_ISBN_KEY;
if (SUPABASE_URL) process.env.VITE_SUPABASE_URL = SUPABASE_URL;
if (SUPABASE_KEY) process.env.VITE_SUPABASE_ANON_KEY = SUPABASE_KEY;

// 启动时检查 Supabase 配置
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[api-proxy] ⚠️ Supabase 未配置，auth 功能不可用');
  console.warn('[api-proxy]   请检查 .env.local 文件中的 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
} else {
  console.log('[api-proxy] ✅ Supabase 已配置: ' + SUPABASE_URL);
}

/** 解析请求体 JSON */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      resolve({});
      return;
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

/** 包装 res 对象，提供 status() 和 json() 方法供 Vercel 风格 handler 使用 */
function wrapRes(res) {
  res.status = function (code) { this.statusCode = code; return this; };
  res.json = function (data) { this.setHeader('Content-Type', 'application/json; charset=utf-8'); this.end(JSON.stringify(data)); };
  return res;
}

// API 代理插件 (内联处理所有 /api/*，不依赖外部 server.mjs)
function apiPlugin() {
  return {
    name: 'api-proxy',
    configureServer(server) {
      // ---- POST /api/auth — 用户认证（委托 api/auth.mjs）----
      server.middlewares.use('/api/auth', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204; res.end(); return;
        }
        if (req.method !== 'POST') {
          res.statusCode = 405; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'Method Not Allowed' })); return;
        }
        try {
          req.body = await parseBody(req);
          await authHandler(req, wrapRes(res));
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: '服务器错误：' + e.message }));
        }
      });

      // ---- POST /api/deepseek — 统一 DeepSeek API 网关（委托 api/deepseek.mjs）----
      server.middlewares.use('/api/deepseek', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        try {
          const params = await parseBody(req);
          res.setHeader('Content-Type', 'application/json');
          const { result, error } = await callDeepSeek(params.task_type, params);
          if (error) { res.end(JSON.stringify({ error })); return; }
          res.end(JSON.stringify({ result, error: null }));
        } catch (e) {
          res.end(JSON.stringify({ error: e.message }));
        }
      });

      // ---- POST /api/classify — AI 书籍分类（委托 api/classify.mjs）----
      server.middlewares.use('/api/classify', async (req, res) => {
        if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        try {
          req.body = await parseBody(req);
          await classifyHandler(req, wrapRes(res));
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e.message }));
        }
      });

      // ---- GET /api/lookup — ISBN 书籍查询（委托 api/lookup.mjs）----
      server.middlewares.use('/api/lookup', async (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        req.query = Object.fromEntries(url.searchParams);
        res.setHeader('Content-Type', 'application/json');
        try {
          await lookupHandler(req, wrapRes(res));
        } catch (e) {
          res.end(JSON.stringify({ error: e.message }));
        }
      });

      // ---- GET /api/search-isbn — 按书名搜索 ISBN（委托 api/search-isbn.mjs）----
      server.middlewares.use('/api/search-isbn', async (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        req.query = Object.fromEntries(url.searchParams);
        res.setHeader('Content-Type', 'application/json');
        try {
          await searchIsbnHandler(req, wrapRes(res));
        } catch (e) {
          res.end(JSON.stringify({ error: e.message }));
        }
      });

      // ---- POST /api/admin — 管理后台（委托 api/admin.mjs）----
      server.middlewares.use('/api/admin', async (req, res) => {
        if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        try {
          req.body = await parseBody(req);
          await adminHandler(req, wrapRes(res));
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiPlugin()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.ngrok-free.dev']
  }
})