// 單位頁 publish_page/<bid>/?cid=<cid>
// 學校伺服器端渲染，擷取成結構化資料給前端原生顯示
const ROOT = 'https://www.hcvs.hc.edu.tw/ischool/';

const ENT = {
  quot: '"', apos: "'", lt: '<', gt: '>',
  nbsp: ' ', amp: '&', eacute: 'é', middot: '·'
};

export function decode(s) {
  return String(s || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&([a-z]+);/gi, (m, k) => ENT[k] ?? m);
}

const strip = s => decode(String(s || '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

function abs(p, base) {
  try { return new URL(decode(p), base).href; } catch { return ''; }
}
// 從 <a ...> 抽出連結資訊；站內單位頁回傳 {bid,cid}，其他回傳外部 href
function linkOf(attrs, text, base) {
  const href = (attrs.match(/href\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
  const title = (attrs.match(/title\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
  const name = strip(text) || strip(title);
  const url = abs(href, base);
  const m = url.match(/\/ischool\/publish_page\/(\d+)\/?(?:\?cid=(\d+))?/);
  if (m) return { name, bid: +m[1], cid: m[2] ? +m[2] : 0, url };
  const h = url.match(/^https:\/\/www\.hcvs\.hc\.edu\.tw\/home\?cid=(\d+)$/);
  if (h) return { name, bid: 0, cid: +h[1], url, home: 1 };
  return { name, url };
}

// 側欄選單（main_menu_content）
function parseMenu(html, base) {
  const m = html.match(/<div id='main_menu_content'>([\s\S]*?)<\/div><div class='footer'>/);
  if (!m) return [];
  const out = [];
  for (const a of m[1].matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const l = linkOf(a[1], a[2], base);
    if (l.name && l.url) out.push(l);
  }
  return out;
}

// 子頁清單（sites-subpages-content 內的 li）
function parseSubpages(seg, base) {
  const m = seg.match(/sites-subpages-content[^>]*>([\s\S]*?)<\/ul>/);
  if (!m) return [];
  const out = [];
  for (const a of m[1].matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const l = linkOf(a[1], a[2], base);
    if (l.name && l.url) out.push(l);
  }
  return out;
}
// 主解析：bid=單位頁編號，cid=子頁編號（0=單位首頁）
export function parsePage(html, bid, cid) {
  const base = bid ? ROOT + `publish_page/${bid}/` + (cid ? `?cid=${cid}` : '') : 'https://www.hcvs.hc.edu.tw/home?cid=' + cid;
  const nameMeta = decode((html.match(/itemprop="name" content="([^"]*)"/) || [])[1] || '');
  const site = strip(nameMeta.split('|')[0]);
  const gone = /網頁內容已不存在/.test(html);

  // pagecontent 區塊（到公佈欄 widget 之前）
  const i = html.indexOf("class='pagecontent'");
  let j = html.indexOf("id='site_news'", i);
  if (j < 0) j = html.indexOf("<div id='footer'", i);
  const seg = i >= 0 ? html.slice(i, j > i ? j : undefined) : '';

  // 麵包屑
  const crumbs = [];
  for (const a of seg.matchAll(/<a class='a_map[^']*' href='([^']*)' title='([^']*)'>/g)) {
    const c = abs(a[1], base).match(/cid=(\d+)/);
    crumbs.push({ name: strip(a[2]), cid: c ? +c[1] : 0 });
  }
  const here = strip((seg.match(/<span class='l_map'[^>]*>([\s\S]*?)<\/span>/) || [])[1] || '');

  // 內文
  let content = '';
  const k = seg.indexOf('id="page_main_content"');
  if (k >= 0) {
    const start = seg.indexOf('>', k) + 1;
    content = seg.slice(start)
      .replace(/<div\s*$/, '')
      .replace(/(\s*<\/div>)+\s*$/, '');
    // 收掉多餘的結尾 </div>（內文自身的 div 要保留配對）
    const opens = (content.match(/<div\b/gi) || []).length;
    let closes = (content.match(/<\/div>/gi) || []).length;
    while (closes > opens) { content = content.replace(/<\/div>(?![\s\S]*<\/div>)/i, ''); closes--; }
  }
  content = content.replace(
    /(src|href)\s*=\s*(["'])(?!https?:|data:|mailto:|tel:|#|javascript:)([^"']*)\2/gi,
    (_, a, q, p) => `${a}=${q}${abs(p, base)}${q}`
  );
  if (gone) content = '';

  const subpages = parseSubpages(seg, base);
  const menu = parseMenu(html, base);
  if (!menu.length) menu.push(...parseMenu2(html, base).filter(l => !/\/home$/.test(l.url)));
  const seen = new Set();
  const uniq = l => { const k = l.name + '|' + l.url; if (seen.has(k)) return false; seen.add(k); return true; };
  const menuU = menu.filter(uniq);
  const newsUid = (html.match(/id='site_news' class='(WID_\d+_\d+_[0-9a-f]{40})/) || [])[1] || '';
  const title = here || site;
  return { bid, cid, site, title, crumbs, menu: menuU, subpages, content, newsUid, gone };
}

// 橫式選單（main_menu_content2，例：圖書館）
export function parseMenu2(html, base) {
  const m = html.match(/<div id='main_menu_content2'[^>]*>([\s\S]*?)<\/ul><\/div>/);
  if (!m) return [];
  const out = [];
  for (const a of m[1].matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const l = linkOf(a[1], a[2], base);
    if (l.name && l.url && !/config\/login\.php/.test(l.url)) out.push(l);
  }
  return out;
}

// 內容頁 widget/main_menu/show.php?id=<cid>
export function parseShowPage(html, id) {
  const base = ROOT + 'widget/main_menu/show.php?id=' + id;
  const title = strip((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
  let content = '';
  const k = html.indexOf('id="page_main_content"');
  if (k >= 0) {
    const start = html.indexOf('>', k) + 1;
    let stop = html.indexOf('</body>', start);
    if (stop < 0) stop = html.length;
    content = html.slice(start, stop).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/(\s*<\/div>)+\s*$/, '');
  }
  content = content.replace(
    /(src|href)\s*=\s*(["'])(?!https?:|data:|mailto:|tel:|#|javascript:)([^"']*)\2/gi,
    (_, a, q, p) => `${a}=${q}${abs(p, base)}${q}`
  );
  return { id, title, content };
}
