// 本機測試伺服器：模擬 Vercel（public/ 靜態 + api/[route].js）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import handler from '../api/[route].js';
const root = new URL('../public/', import.meta.url).pathname;
const types = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.js': 'text/javascript' };
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/api/')) {
    const r = { setHeader: (k, v) => res.setHeader(k, v), status(c) { res.statusCode = c; return r; }, send(b) { res.end(b); } };
    return handler(req, r);
  }
  const f = path.join(root, u.pathname === '/' ? 'index.html' : u.pathname);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.statusCode = 404; return res.end('nf'); }
  res.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
}).listen(process.env.PORT || 8787, () => console.log('listening ' + (process.env.PORT || 8787)));
