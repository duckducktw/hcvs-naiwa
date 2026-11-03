// 新竹高工官網 奶龍風重製（非官方）— Vercel serverless：代理 ischool 公開 API（官方 API 無 CORS）
import UNITS from '../lib/units.js';

const ROOT = 'https://www.hcvs.hc.edu.tw/ischool/';
const TAB_UID = 'WID_0_15_82ff8072601d6250aecc3ee4f26ac4a49b1d586a';
const CAROUSEL_UID = 'WID_0_13_6d19441b504ff0cdab63b0d9885f7e6ea2ebc972';
const NEWS_UIDS = new Set(Object.keys(UNITS));
const UA = 'Mozilla/5.0 (X11; Linux x86_64) hcvs-naiwa-mirror';

async function up(path, init = {}) {
  const r = await fetch(ROOT + path, { ...init, headers: { 'User-Agent': UA, Referer: 'https://www.hcvs.hc.edu.tw/home', ...(init.headers || {}) } });
  return { ok: r.ok, status: r.status, type: r.headers.get('content-type') || 'application/json; charset=utf-8', body: await r.text() };
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
  const send = (r, ttl, type) => { res.setHeader('content-type', type || r.type); res.setHeader('cache-control', `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 5}`); res.status(r.ok === false ? 502 : 200).send(r.body); };
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
      return send({ ok: true, body: JSON.stringify(parseShow(r.body, nid)) }, 600, 'application/json; charset=utf-8');
    }
    if (route === 'carousel') {
      return send(await up('widget/carousel/news_query_json_field.php', form(new URLSearchParams({ uid: CAROUSEL_UID }))), 3600);
    }
    res.status(404).send('Not found');
  } catch (e) {
    res.status(502).send('upstream error');
  }
}
