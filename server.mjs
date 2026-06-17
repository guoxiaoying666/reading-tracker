// Zeabur 生产服务器 — 托管静态文件 + API 路由
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');

// ---- API 路由表 ----
const API_ROUTES = {
  '/api/auth': './api/auth.mjs',
  '/api/analyze': './api/analyze.mjs',
  '/api/classify': './api/classify.mjs',
  '/api/lookup': './api/lookup.mjs',
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
  let filePath = url === '/' ? '/index.html' : url.split('?')[0];
  const fullPath = path.join(DIST, filePath);

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

// 解析请求体
async function parseBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return {};
  let body = '';
  for await (const chunk of req) body += chunk;
  try { return JSON.parse(body); } catch { return {}; }
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
  const routeMatch = Object.keys(API_ROUTES).find(r => url.startsWith(r));
  if (routeMatch) {
    try {
      const mod = await import(API_ROUTES[routeMatch]);
      req.body = await parseBody(req);
      // Vercel 风格的 handler → 包装成普通 http handler
      await mod.default(req, {
        ...res,
        status(code) { this.statusCode = code; return this; },
        json(data) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(data));
        },
      });
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: e.message }));
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
