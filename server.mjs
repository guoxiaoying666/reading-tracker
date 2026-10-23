// 生产服务器 — 托管静态文件 + API 路由
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');

// 加载 .env.local 环境变量（Vite 自动加载，但 server.mjs 是独立进程需要手动加载）
try {
  const envPath = path.join(__dirname, '.env.local');
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
    console.log('[env] Loaded ' + path.basename(envPath));
  }
} catch (_) { /* ignore */ }

// ---- API 路由表 ----
const API_ROUTES = {
  '/api/admin': './api/admin.mjs',
  '/api/auth': './api/auth.mjs',
  '/api/analyze': './api/analyze.mjs',
  '/api/classify': './api/classify.mjs',
  '/api/lookup': './api/lookup.mjs',
  '/api/search-isbn': './api/search-isbn.mjs',
  '/api/deepseek': './api/deepseek.mjs',
  '/api/recommend': './api/recommend.mjs',
  '/api/feishu': './api/feishu.mjs',
};

// ---- MIME 类型 ----
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webp': 'image/webp',
};

function serveStatic(url, res) {
  let filePath;
  try {
    filePath = url === '/' ? '/index.html' : decodeURIComponent(url.split('?')[0]);
  } catch {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }
  // 防路径穿越：解析后必须仍在 dist 目录内
  const fullPath = path.resolve(DIST, '.' + filePath);
  if (!fullPath.startsWith(DIST + path.sep)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      // SPA fallback：所有前端路由返回 index.html
      fs.readFile(path.join(DIST, 'index.html'), (err2, data2) => {
        if (err2) { res.statusCode = 404; res.end('Not Found'); return; }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(data2);
      });
      return;
    }
    const ext = path.extname(fullPath);
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    if (ext === '.html') res.setHeader('Cache-Control', 'no-cache');
    else res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(data);
  });
}

// 解析请求体（限制大小，避免超大请求拖垮进程）
const MAX_BODY_BYTES = 1024 * 1024;
async function parseBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return {};
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const err = new Error('Payload Too Large');
      err.statusCode = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

// ---- 服务器 ----
const server = http.createServer(async (req, res) => {
  const url = req.url;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // ---- API 路由 ----
  // 精确匹配 /api/xxx 与 /api/xxx?query，避免 /api/feishu-anything 误命中
  const routeMatch = Object.keys(API_ROUTES).find(r => url === r || url.startsWith(r + '?'));
  if (routeMatch) {
    try {
      const mod = await import(API_ROUTES[routeMatch]);
      // 解析 URL 查询参数（GET 接口如 /api/lookup 需要）
      const parsedUrl = new URL(url, 'http://localhost');
      req.query = Object.fromEntries(parsedUrl.searchParams);
      req.body = await parseBody(req);
      // Vercel 风格的 handler → 包装成普通 http handler
      const apiRes = {
        status(code) { res.statusCode = code; return apiRes; },
        json(data) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(data));
          return apiRes;
        },
        setHeader(name, value) { res.setHeader(name, value); return apiRes; },
        getHeader(name) { return res.getHeader(name); },
        writeHead(code, headers) { res.writeHead(code, headers); return apiRes; },
        write(chunk) { return res.write(chunk); },
        end(chunk) { res.end(chunk); return apiRes; },
        get statusCode() { return res.statusCode; },
        set statusCode(v) { res.statusCode = v; },
      };
      await mod.default(req, apiRes);
    } catch (e) {
      const status = Number(e.statusCode) || 500;
      if (status >= 500) console.error(`[api] ${req.method} ${url}`, e);
      if (!res.headersSent) {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: status >= 500 ? 'Internal Server Error' : e.message }));
      } else {
        res.end();
      }
    }
    return;
  }

  // ---- 静态文件 ----
  serveStatic(url, res);
});

const PORT = parseInt(process.env.PORT || '3000', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
