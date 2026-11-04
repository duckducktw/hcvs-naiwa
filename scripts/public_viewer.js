/* ===== 指定公開頁免登入：行事曆 / 分機 / 傑出校友 ===== */
const ALUMNI_RE=/script\.google\.com\/(?:a\/macros\/[^/]+|macros)\/s\/AKfycbzaskfvcZkDUUfFXj3vlphbsrJfbHTeWdQyFk94OtlPWcGaUeQaogx7dCeM-h19TcC9\/exec/;
function openPhone(href){
 modal('☎️ 處室分機',`<div class="phonev"><img src="/img/phone.webp?v=1" alt="新竹高工處室分機一覽表"><div class="art-foot"><a data-raw="1" class="btn btn-o" href="/api/phone" target="_blank" rel="noopener">下載原 PDF</a><a data-raw="1" class="btn btn-o" href="${esc(href)}" target="_blank" rel="noopener">學校原頁</a></div></div>`);
}
async function openAlumni(href){
 modal('🏆 歷屆傑出校友','<div class="loading">'+NL+pickLine(LOADING)+'</div>');
 try{const r=await fetch('/api/alumni');if(!r.ok)throw 0;const d=await r.json();
  const years=[...new Set(d.data.map(x=>String(x['獲獎年度'])))].sort((a,b)=>b-a);
  $('#mb').innerHTML=`<div class="al">
   <div class="al-bar"><select id="al-y"><option value="">全部年度（${d.data.length}）</option>${years.map(y=>`<option>${y}</option>`).join('')}</select><input id="al-q" placeholder="搜尋姓名、科別、經歷"></div>
   <div id="al-list"></div>
   <div class="art-foot"><a data-raw="1" class="btn btn-o" href="${esc(href)}" target="_blank" rel="noopener">在學校原系統開啟</a></div>
  </div>`;
  const draw=()=>{const y=$('#al-y').value,q=$('#al-q').value.trim().toLowerCase();const rows=d.data.filter(x=>(!y||String(x['獲獎年度'])===y)&&(!q||Object.values(x).join(' ').toLowerCase().includes(q)));
   $('#al-list').innerHTML=`<p class="al-count">顯示 ${rows.length} 位</p><div class="al-grid">${rows.map(x=>{const m=String(x['照片']||'').match(/\/d\/([^/]+)/);const img=m?`https://lh3.googleusercontent.com/d/${m[1]}=h160`:'';return `<article class="al-card">${img?`<img src="${img}" alt="${esc(x['姓名'])}" loading="lazy" referrerpolicy="no-referrer">`:''}<div><span class="al-year">${esc(x['獲獎年度'])} 年度 · 第 ${esc(x['編號'])} 號</span><h3>${esc(x['姓名'])}</h3><p class="al-meta">${esc(x['級別'])} 級 · ${esc(x['科別'])}</p><p><b>經歷：</b>${esc(x['經歷']||'—')}</p><details><summary>傑出事蹟</summary><p>${esc(x['傑出/優秀事蹟']||'—')}</p></details></div></article>`;}).join('')}</div>`;};
  $('#al-y').onchange=draw;$('#al-q').oninput=draw;draw();
 }catch(e){$('#mb').innerHTML=`<div class="loading">${NL}${pickLine(FAIL)}<br><br><a data-raw="1" class="btn btn-y" href="${esc(href)}" target="_blank" rel="noopener">改去原系統看</a></div>`;}
}
// 比一般 publish_page 攔截更早處理（capture listener 註冊於其後，stopImmediatePropagation 防重複）
document.addEventListener('click',e=>{
 const a=e.target.closest('a[href]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.button||a.dataset.raw)return;
 if(/publish_page\/87\/?\?cid=1589/.test(a.href)){e.preventDefault();e.stopImmediatePropagation();openPhone(a.href);return;}
 if(ALUMNI_RE.test(a.href)){e.preventDefault();e.stopImmediatePropagation();openAlumni(a.href);}
},true);
