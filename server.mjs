// Zeabur 生产服务器 — 托管静态文件 + API 路由
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');

// ---- API 处理器 ----
import authHandler from './api/auth.mjs';

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
function parseBody(req) {
  return new Promise((resolve) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return resolve({});
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

// Wrap Vercel 风格的 handler 为 http.createServer 风格
function wrapVercelHandler(handler) {
  return async (req, res) => {
    req.body = await parseBody(req);
    // 自定义 json 辅助方法
    res.status = (code) => { res.statusCode = code; return res; };
    const origJson = res.json;
    res.json = (data) => {
      if (!origJson) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(data));
      } else {
        origJson.call(res, data);
      }
    };
    await handler(req, res);
  };
}

// ---- 服务器 ----
const server = http.createServer((req, res) => {
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
  if (url.startsWith('/api/')) {
    const wrapped = wrapVercelHandler(authHandler);
    wrapped(req, res);
    return;
  }

  // ---- 静态文件 ----
  serveStatic(url, res);
});

const PORT = parseInt(process.env.PORT || '3000', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
