/* ===== 單位頁 / 內容頁 站內原生顯示 ===== */
const PP_RE=/\/ischool\/publish_page\/(\d+)\/?(?:\?cid=(\d+))?(?:$|[&#])/;
const HOME_RE=/^https:\/\/www\.hcvs\.hc\.edu\.tw\/home\?cid=(\d+)$/;
const MS_RE=/\/ischool\/widget\/main_menu\/show\.php\?id=(\d+)/;
const PP_SKIP=new Set([198]); // 198 = 服務維護重新導向（成績/課表等系統），保留外連
function ppLink(l,cls=''){
  if((l.bid||l.home)&&!PP_SKIP.has(l.bid))return `<a class="${cls}" href="${esc(l.url)}" data-pp="${l.bid}" data-cid="${l.cid||0}">${esc(l.name)}</a>`;
  return `<a class="${cls}" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)}<span class="ext">↗</span></a>`;
}
async function openPage(bid,cid,fallback,href){
  modal(fallback||'單位頁','<div class="loading">'+NL+pickLine(LOADING)+'</div>');
  try{const r=await fetch(`/api/page?bid=${bid}&cid=${cid||0}`);if(!r.ok)throw 0;const d=await r.json();
    if(/國立新竹高級工業職業學校/.test(d.site))d.site='國立新竹奶龍工業職業學校';
    $('#mt').textContent=d.cid&&d.title!==d.site?`${d.site}｜${d.title}`:d.site||fallback||'單位頁';
    const menu=d.menu.length?`<nav class="pp-menu">${d.menu.map(l=>ppLink(l,l.bid===d.bid&&l.cid===d.cid?'on':'')).join('')}</nav>`:'';
    const crumbs=d.crumbs.length?`<div class="pp-crumbs">${d.crumbs.map(c=>`<a href="#" data-pp="${d.bid}" data-cid="${c.cid}">${esc(c.name)}</a>`).join(' / ')} / <b>${esc(d.title)}</b></div>`:'';
    const subs=d.subpages.length?`<div class="pp-subs">${d.subpages.map(l=>ppLink(l)).join('')}</div>`:'';
    let body=d.content?`<div class="art-body">${sanitize(d.content)}</div>`:'';
    if(d.gone)body=`<p class="pp-hint">${NL}這個頁面已經不存在了，奶龍去找也找不到</p>`;
    else if(!body&&!subs)body=`<p class="pp-hint">${NL}${d.menu.length?'左邊（手機是上面）選一個看看，奶龍幫你翻':'這頁學校沒放內容，奶龍也沒辦法'}</p>`;
    const news=d.newsUid?`<div class="pp-news"><b>📢 ${esc(d.site)} 公佈欄</b><div id="ppnews" data-uid="${esc(d.newsUid)}"><div class="loading">${NL}${pickLine(LOADING)}</div></div></div>`:'';
    $('#mb').innerHTML=`<div class="pp">${menu}<div class="pp-main">${crumbs}${subs}${body}${news}<div class="art-foot"><a data-raw="1" class="btn btn-o" href="${esc(href)}" target="_blank" rel="noopener">在學校官網開啟原頁</a></div></div></div>`;
    $('#mb').scrollTop=0;
    if(d.newsUid)ppNews(d.newsUid);
  }catch(e){$('#mb').innerHTML='<div class="loading">'+NL+pickLine(FAIL)+`<br><br><a data-raw="1" class="btn btn-y" href="${esc(href)}" target="_blank" rel="noopener">改去官網看</a></div>`;}
}
async function ppNews(uid){
  const box=$('#ppnews');if(!box)return;
  try{const r=await fetch('/api/unews?uid='+encodeURIComponent(uid));if(!r.ok)throw 0;const d=await r.json();const it=d.slice(1);
    if(!it.length){box.closest('.pp-news').remove();return;}
    box.innerHTML=it.length?`<ul class="pp-nlist">${it.map(x=>{const href=x.content_type==='url'?x.content:H+'/ischool/public/news_view/show.php?nid='+x.newsId;return `<li><span>${esc(x.time)}</span><a href="${esc(href)}" target="_blank" rel="noopener">${esc(x.title)}</a></li>`;}).join('')}</ul>`:`<p class="loading">${pickLine(EMPTY)}</p>`;
  }catch(e){box.innerHTML=`<p class="pp-hint">${pickLine(FAIL)}</p>`;}
}
async function openMShow(id,fallback,href){
  modal(fallback||'內容','<div class="loading">'+NL+pickLine(LOADING)+'</div>');
  try{const r=await fetch('/api/mshow?id='+id);if(!r.ok)throw 0;const d=await r.json();
    $('#mt').textContent=d.title||fallback||'內容';
    $('#mb').innerHTML=`<div class="art"><div class="art-body">${sanitize(d.content)||'<p class="loading">'+NL+'這頁是空的</p>'}</div><div class="art-foot"><a data-raw="1" class="btn btn-o" href="${esc(href)}" target="_blank" rel="noopener">在學校官網開啟原頁</a></div></div>`;
    $('#mb').scrollTop=0;
  }catch(e){$('#mb').innerHTML='<div class="loading">'+NL+pickLine(FAIL)+`<br><br><a data-raw="1" class="btn btn-y" href="${esc(href)}" target="_blank" rel="noopener">改去官網看</a></div>`;}
}
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.button)return;
  if(a.dataset.raw)return;
  const lc=a.cloneNode(true);lc.querySelectorAll('small,.ext').forEach(x=>x.remove());
  const label=(lc.textContent.trim()||a.querySelector('img')?.alt||a.title||'');
  if(a.dataset.pp){e.preventDefault();const bid=+a.dataset.pp,cid=+a.dataset.cid||0;const href=bid?H+`/ischool/publish_page/${bid}/`+(cid?`?cid=${cid}`:''):H+'/home?cid='+cid;openPage(bid,cid,label,href);return;}
  let m=a.href.match(PP_RE);
  if(m&&!PP_SKIP.has(+m[1])&&!/[?&]str=/.test(a.href)){e.preventDefault();openPage(+m[1],+(m[2]||0),label,a.href);return;}
  if(/^https:\/\/www\.hcvs\.hc\.edu\.tw\/(resource\/openfid\.php|ischool\/news\/attached\/\d+\/[^?#]+\.pdf$|ischool\/resources\/WID_[^?#]+\.pdf$)/i.test(a.href)){e.preventDefault();openFile(a.href,label);return;}
  m=a.href.match(HOME_RE);
  if(m){e.preventDefault();openPage(0,+m[1],label,a.href);return;}
  m=a.href.match(MS_RE);
  if(m){e.preventDefault();openMShow(+m[1],label,a.href);}
},true);

async function openFile(href,label){
  const name=label||decodeURIComponent(href.split('/').pop().split('?')[0])||'檔案';
  const foot=`<div class="art-foot"><a data-raw="1" class="btn btn-o" href="${esc(href)}" target="_blank" rel="noopener">下載 / 在學校官網開啟</a></div>`;
  modal(name,'<div class="loading">'+NL+pickLine(LOADING)+'</div>');
  try{const r=await fetch('/api/file?u='+encodeURIComponent(href));
    if(!r.ok)throw r.status;
    const blob=await r.blob();const url=URL.createObjectURL(blob);
    const view=blob.type.startsWith('image/')?`<img src="${url}" alt="${esc(name)}" style="max-width:100%;border-radius:12px">`:`<iframe class="f" src="${url}" title="${esc(name)}"></iframe>`;
    $('#mb').innerHTML=`<div class="pdfv">${view}${foot}</div>`;
  }catch(e){
    const why=e===415?'這個檔案不是 PDF 或圖片，奶龍沒辦法在這裡打開':e===413?'檔案太大了，奶龍搬不動':pickLine(FAIL);
    $('#mb').innerHTML=`<div class="loading">${NL}${why}<br><br>${foot}</div>`;}
}
