// 新竹高工官網 奶龍風重製（非官方）— Vercel serverless：代理 ischool 公開 API（官方 API 無 CORS）
import UNITS from '../lib/units.js';
import { parsePage, parseShowPage } from '../lib/page.js';
import * as CT from '../lib/classtable.js';

const ROOT = 'https://www.hcvs.hc.edu.tw/ischool/';
const TAB_UID = 'WID_0_15_82ff8072601d6250aecc3ee4f26ac4a49b1d586a';
const CAROUSEL_UID = 'WID_0_13_6d19441b504ff0cdab63b0d9885f7e6ea2ebc972';
const NEWS_UIDS = new Set(Object.keys(UNITS));
const UA = 'Mozilla/5.0 (X11; Linux x86_64) hcvs-naiwa-mirror';

async function up(path, init = {}) {
  const r = await fetch(ROOT + path, { ...init, headers: { 'User-Agent': UA, Referer: 'https://www.hcvs.hc.edu.tw/home', ...(init.headers || {}) } });
  return { ok: r.ok, status: r.status, type: r.headers.get('content-type') || 'application/json; charset=utf-8', body: await r.text() };
}
async function upAbs(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://www.hcvs.hc.edu.tw/home' } });
  return { ok: r.ok, status: r.status, type: r.headers.get('content-type') || 'text/html', body: await r.text() };
}
const form = p => ({ method: 'POST', body: p.toString(), headers: { 'content-type': 'application/x-www-form-urlencoded' } });

// 公告內文：show.php 是伺服器端渲染，直接擷取標題/資訊/附件/內文
const decode = s => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&eacute;/g, 'é').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const pick = (html, re) => (html.match(re) || [, ''])[1].trim();
function parseShow(html, nid) {
  const title = decode(pick(html, /<span[^>]*id="title"[^>]*>\s*<h4>([\s\S]*?)<\/h4>/).replace(/<[^>]+>/g, ''));
  const unit = decode(pick(html, /id="info_unit">([^<]*)</));
  const person = decode(pick(html, /id="info_person">([^<]*)</));
  const time = pick(html, /id="info_time">([^<]*)</);
  let files = [];
  const raw = pick(html, /g_attached_file_json_data = "((?:[^"\\]|\\.)*)"/);
  try {
    files = JSON.parse(JSON.parse('"' + raw + '"')).map(f => {
      const name = unescape(f[2]);
      return { name, size: +f[1] || 0, url: `${ROOT}news/attached/${nid}/${encodeURIComponent(name).replace(/%20/g, '+')}` };
    });
  } catch { files = []; }
  const i = html.indexOf('id="content"');
  let content = '';
  if (i >= 0) {
    const start = html.indexOf('>', i) + 1;
    let stop = html.indexOf('<!--<div style="float:right', start);
    if (stop < 0) stop = html.indexOf('</body>', start);
    if (stop < 0) stop = html.length;
    let end = html.lastIndexOf('</div>', stop);           // div_news_table_1_content
    end = html.lastIndexOf('</div>', end - 1);            // div_news_table_1_main
    end = html.lastIndexOf('</div>', end - 1);            // #content
    content = html.slice(start, end > start ? end : stop).replace(/(\s*<\/div>)+\s*$/, '');
  }
  // 相對路徑轉絕對，避免圖片破掉
  content = content.replace(/(src|href)="(?!https?:|data:|mailto:|tel:|#|javascript:)([^"]*)"/g, (_, a, p) => `${a}="${new URL(p, ROOT + 'public/news_view/show.php').href}"`);
  return { nid, title, unit, person, time, files, content };
}

export default async function handler(req, res) {
  const u = new URL(req.url, 'http://x');
  const q = u.searchParams;
  const route = u.pathname.replace(/^\/api\//, '');
  const int = (k, d, max) => { const n = parseInt(q.get(k) ?? d, 10); return isNaN(n) ? d : Math.max(0, Math.min(n, max)); };
  // CDN 快取 ttl 秒；過期後一天內先回舊的、背景更新；瀏覽器端快取交給前端 cache.js
  const send = (r, ttl, type, swr) => { res.setHeader('content-type', type || r.type); res.setHeader('cache-control', `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${swr || 86400}`); if (r.ok === false) res.setHeader('cache-control', 'no-store'); res.status(r.ok === false ? 502 : 200).send(r.body); };
  try {
    if (route === 'news') {
      const uid = q.get('uid');
      if (!NEWS_UIDS.has(uid)) return res.status(400).send('bad uid');
      const field = ['time', 'title', 'issuer', 'clicks', 'unit', 'attr'].includes(q.get('field')) ? q.get('field') : 'time';
      const order = q.get('order') === 'ASC' ? 'ASC' : 'DESC';
      const flock = /^((unit|attr)_\d+)(-(attr)_\d+)?$/.test(q.get('flock') || '') ? q.get('flock') : '';
      const keyword = (q.get('keyword') || '').slice(0, 300);
      const p = new URLSearchParams({ field, order, pageNum: int('pageNum', 0, 100000), maxRows: int('maxRows', 42, 100), uid, tf: '1', auth_type: 'user', keyword });
      if (flock) p.set('flock', flock);
      return send(await up('widget/site_news/news_query_json.php', form(p)), 120);
    }
    if (route === 'tab') {
      const p = new URLSearchParams({ uid: TAB_UID, cid: int('cid', 9, 100000), maxRows: int('maxRows', 5, 500) });
      if (q.get('queryall')) p.set('queryall', '1');
      return send(await up('widget/site_news_tab/news_query_json.php?' + p), 600);
    }
    if (route === 'tabc') {
      const p = new URLSearchParams({ uid: TAB_UID, nid: int('nid', 0, 10000000) });
      const r = await up('widget/site_news_tab/news_query_content.php?' + p);
      const body = [...r.body.matchAll(/<content><!\[CDATA\[([\s\S]*?)\]\]><\/content>/g)].map(m => m[1]).join('');
      return send({ ok: r.ok, body }, 600, 'text/html; charset=utf-8');
    }
    if (route === 'show') {
      const nid = int('nid', 0, 10000000);
      if (!nid) return res.status(400).send('bad nid');
      const r = await up('public/news_view/show.php?nid=' + nid);
      if (!r.ok) return send(r, 60);
      return send({ ok: true, body: JSON.stringify(parseShow(r.body, nid)) }, 3600, 'application/json; charset=utf-8');
    }
    if (route === 'page') {
      // bid=0 → 主站 /home?cid=（主站子頁）；其餘 → publish_page/<bid>/
      const bid = int('bid', 0, 100000);
      const cid = int('cid', 0, 10000000);
      if (!bid && !cid) return res.status(400).send('bad bid');
      const r = bid
        ? await up(`publish_page/${bid}/` + (cid ? `?cid=${cid}` : ''))
        : await upAbs('https://www.hcvs.hc.edu.tw/home?cid=' + cid);
      if (!r.ok) return send(r, 60);
      return send({ ok: true, body: JSON.stringify(parsePage(r.body, bid, cid)) }, 3600, 'application/json; charset=utf-8');
    }
    if (route === 'unews') {
      // 單位頁公佈欄：只接受 ischool widget uid 格式，固定回最新 8 則
      const uid = q.get('uid') || '';
      if (!/^WID_\d+_\d+_[0-9a-f]{40}$/.test(uid)) return res.status(400).send('bad uid');
      const p = new URLSearchParams({ field: 'time', order: 'DESC', pageNum: 0, maxRows: 8, uid, tf: '1', auth_type: 'user', keyword: '' });
      return send(await up('widget/site_news/news_query_json.php', form(p)), 300);
    }
    if (route === 'mshow') {
      const id = int('id', 0, 10000000);
      if (!id) return res.status(400).send('bad id');
      const r = await up('widget/main_menu/show.php?id=' + id);
      if (!r.ok) return send(r, 60);
      return send({ ok: true, body: JSON.stringify(parseShowPage(r.body, id)) }, 3600, 'application/json; charset=utf-8');
    }
    if (route === 'file') {
      // 學校公開檔案代理（只收學校網域的檔案路徑），讓 PDF 能在站內預覽
      let t;
      try { t = new URL(q.get('u') || ''); } catch { return res.status(400).send('bad url'); }
      const okPath = /^\/(resource\/openfid\.php|ischool\/news\/attached\/\d+\/|ischool\/resources\/WID_)/.test(t.pathname);
      if (t.protocol !== 'https:' || t.hostname !== 'www.hcvs.hc.edu.tw' || !okPath) return res.status(400).send('bad url');
      const r = await fetch(t.href, { headers: { 'User-Agent': UA, Referer: 'https://www.hcvs.hc.edu.tw/home' } });
      const type = r.headers.get('content-type') || 'application/octet-stream';
      if (!r.ok || !/^(application\/pdf|image\/)/.test(type)) return res.status(415).send('not previewable');
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 4.3 * 1024 * 1024) return res.status(413).send('too large');
      res.setHeader('content-type', type);
      res.setHeader('content-disposition', 'inline');
      res.setHeader('cache-control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
      return res.status(200).send(buf);
    }
    if (route === 'ct') {
      // 課表（欣河雲端公開查詢）：?op=terms | options&type= | table&type=&no=
      const op = q.get('op');
      const type = ['Class', 'Teacher', 'Classroom'].includes(q.get('type')) ? q.get('type') : '';
      const yt = /^\d{2,3}_[12]$/.test(q.get('yt') || '') ? q.get('yt').split('_') : null;
      const json = (o, ttl) => send({ ok: true, body: JSON.stringify(o) }, ttl, 'application/json; charset=utf-8', 604800);
      if (op === 'terms') return json(await CT.terms(), 21600);
      if (!type || !yt) return res.status(400).send('bad params');
      if (op === 'options') return json(await CT.options(type, yt[0], yt[1]), 21600);
      if (op === 'table') {
        const no = q.get('no') || '';
        if (!/^[A-Za-z0-9]{1,8}$/.test(no)) return res.status(400).send('bad no');
        return json(await CT.timetable(type, no, yt[0], yt[1]), 21600);
      }
      return res.status(400).send('bad op');
    }
    if (route === 'carousel') {
      return send(await up('widget/carousel/news_query_json_field.php', form(new URLSearchParams({ uid: CAROUSEL_UID }))), 3600);
    }
    res.status(404).send('Not found');
  } catch (e) {
    res.status(502).send('upstream error');
  }
}
