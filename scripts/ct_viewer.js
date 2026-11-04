/* ===== 課表免登入（欣河雲端公開資料）===== */
const CT_TYPES=[['Class','班級'],['Teacher','教師'],['Classroom','教室']];
const CT_KEY='hcvs-naiwa-ct';
let ctState={yt:'',type:'Class',no:'',opts:{}};
function ctSaved(){try{return JSON.parse(localStorage.getItem(CT_KEY)||'{}')}catch(e){return{}}}
const CT_CACHE='hcvs-naiwa-ctc:',CT_TTL=6*3600e3;
function ctCacheGet(qs){try{const x=JSON.parse(localStorage.getItem(CT_CACHE+qs)||'null');return x&&x.d?x:null}catch(e){return null}}
function ctCachePut(qs,d){try{localStorage.setItem(CT_CACHE+qs,JSON.stringify({t:Date.now(),d}))}catch(e){
  // 滿了就清掉舊的課表快取再試一次
  Object.keys(localStorage).filter(k=>k.startsWith(CT_CACHE)).forEach(k=>localStorage.removeItem(k));
  try{localStorage.setItem(CT_CACHE+qs,JSON.stringify({t:Date.now(),d}))}catch(e2){}}}
async function ctFetch(qs){const r=await fetch('/api/ct?'+qs);if(!r.ok)throw r.status;const d=await r.json();ctCachePut(qs,d);return d;}
// 有快取：新鮮的直接回；過期的先回舊資料，背景更新（onFresh 收到新資料再重畫）
async function ctJSON(qs,onFresh){
  const c=ctCacheGet(qs);
  if(c){if(Date.now()-c.t>CT_TTL)ctFetch(qs).then(d=>{if(onFresh&&JSON.stringify(d)!==JSON.stringify(c.d))onFresh(d)}).catch(()=>{});return c.d;}
  return ctFetch(qs);
}
async function openClassTable(href){
  modal('📅 課表查詢（免登入）','<div class="loading">'+NL+pickLine(LOADING)+'</div>');
  try{
    const terms=await ctJSON('op=terms');
    const sv=ctSaved();
    ctState.yt=(terms.find(t=>t.v===sv.yt)||terms.find(t=>t.on)||terms[0]).v;
    ctState.type=CT_TYPES.some(t=>t[0]===sv.type)?sv.type:'Class';
    ctState.no=sv.no||'';
    $('#mb').innerHTML=`<div class="ct">
      <div class="ct-bar">
        <select id="ct-yt" aria-label="學年學期">${terms.map(t=>`<option value="${esc(t.v)}">${esc(t.name)}</option>`).join('')}</select>
        <div class="ct-types" role="tablist">${CT_TYPES.map(([k,n])=>`<button data-ct-type="${k}" role="tab">${n}</button>`).join('')}</div>
        <select id="ct-g" aria-label="分組"></select>
        <select id="ct-q" aria-label="查詢對象"><option value="">讀取清單中…</option></select>
      </div>
      <div id="ct-out"><p class="pp-hint">${NL}選一個班級、老師或教室，奶龍幫你翻課表</p></div>
      <div class="art-foot"><a data-raw="1" class="btn btn-o" href="${esc(href)}" target="_blank" rel="noopener">在欣河原系統開啟</a></div>
    </div>`;
    $('#ct-yt').value=ctState.yt;
    $('#ct-yt').onchange=()=>{ctState.yt=$('#ct-yt').value;ctState.opts={};ctLoadOpts(true);};
    document.querySelectorAll('[data-ct-type]').forEach(b=>b.onclick=()=>{ctState.type=b.dataset.ctType;ctState.no='';ctLoadOpts(true);});
    $('#ct-g').onchange=()=>ctFillQ('');
    $('#ct-q').onchange=ctPick;
    await ctLoadOpts(false);
  }catch(e){$('#mb').innerHTML='<div class="loading">'+NL+pickLine(FAIL)+`<br><br><a data-raw="1" class="btn btn-y" href="${esc(href)}" target="_blank" rel="noopener">改去欣河原系統看</a></div>`;}
}

// 分組：班級依科別、教師依代號百位、教室依大樓
const CT_DEPT={A:'機械科',B:'板金科',C:'製圖科',D:'室內空間設計科',F:'電機科',G:'資訊科',H:'化工科',J:'機械加工',K:'餐飲服務科'};
function ctGroup(type,o){
  if(type==='Class'){const k=o.v[0];return CT_DEPT[k]||'其他';}
  if(type==='Teacher')return (o.name.replace(/^\S+\s+/,'')[0]||'其他')+' 姓';
  const m=o.name.replace(/^\S+\s+/,'').match(/^(至善樓|藝德樓|機械|板金)/);if(m)return m[1].replace(/^(機械|板金)$/,'$1館');
  return /工場|教室/.test(o.name)&&/^1[12]/.test(o.v)?(o.v[1]==='1'?'電機館':'資訊館'):'其他';
}
async function ctLoadOpts(reset){
  document.querySelectorAll('[data-ct-type]').forEach(b=>b.classList.toggle('on',b.dataset.ctType===ctState.type));
  const key=ctState.yt+'|'+ctState.type;
  $('#ct-g').innerHTML='';$('#ct-q').innerHTML='<option value="">讀取清單中…</option>';
  if(!ctState.opts[key]){
    try{ctState.opts[key]=await ctJSON(`op=options&type=${ctState.type}&yt=${ctState.yt}`,nd=>{ctState.opts[key]=nd;});}catch(e){$('#ct-out').innerHTML=`<p class="pp-hint">${pickLine(FAIL)}</p>`;return;}}
  const list=ctState.opts[key];
  let groups=[...new Set(list.map(o=>ctGroup(ctState.type,o)))];
  if(ctState.type==='Teacher')groups=groups.sort((x,y)=>x.localeCompare(y,'zh-Hant-TW-u-co-stroke'));
  $('#ct-g').innerHTML=groups.map(g=>`<option>${esc(g)}</option>`).join('');
  const tn={Class:'班級',Teacher:'老師',Classroom:'教室'}[ctState.type];
  const cur=!reset&&ctState.no?list.find(x=>x.v===ctState.no):null;
  if(cur){$('#ct-g').value=ctGroup(ctState.type,cur);ctFillQ(cur.v);ctShow(cur);return;}
  ctFillQ('');
  if(reset||!ctState.no)$('#ct-out').innerHTML=`<p class="pp-hint">${NL}選一個${tn}，奶龍幫你翻課表</p>`;
}
function ctFillQ(sel){
  const list=ctState.opts[ctState.yt+'|'+ctState.type]||[];
  const g=$('#ct-g').value;
  const tn={Class:'班級',Teacher:'老師',Classroom:'教室'}[ctState.type];
  const items=list.filter(o=>ctGroup(ctState.type,o)===g);
  if(ctState.type==='Teacher')items.sort((x,y)=>x.name.replace(/^\S+\s+/,'').localeCompare(y.name.replace(/^\S+\s+/,''),'zh-Hant-TW-u-co-stroke'));
  $('#ct-q').innerHTML=`<option value="">選擇${tn}（${items.length}）</option>`+items.map(o=>`<option value="${esc(o.v)}"${o.v===sel?' selected':''}>${esc(o.name)}</option>`).join('');
}
function ctPick(){
  const v=$('#ct-q').value;if(!v)return;
  const o=(ctState.opts[ctState.yt+'|'+ctState.type]||[]).find(x=>x.v===v);
  if(o){ctState.no=o.v;ctShow(o);}
}
async function ctShow(o){
  localStorage.setItem(CT_KEY,JSON.stringify({yt:ctState.yt,type:ctState.type,no:o.v}));
  const out=$('#ct-out');out.innerHTML='<div class="loading">'+NL+pickLine(LOADING)+'</div>';
  const qs=`op=table&type=${ctState.type}&no=${encodeURIComponent(o.v)}&yt=${ctState.yt}`;
  try{const type=ctState.type;const d=await ctJSON(qs,nd=>{if(ctState.no===o.v&&ctState.type===type)ctRender(o,nd,type)});
    if(ctState.no!==o.v)return; // 使用者已改選別的
    ctRender(o,d,type);
  }catch(e){out.innerHTML=`<p class="pp-hint">${pickLine(FAIL)}</p>`;}
}
function ctRender(o,d,type){
  const out=$('#ct-out');{
    if(!d.cells.length){out.innerHTML=`<p class="pp-hint">${NL}${esc(o.name)} 這學期沒有排課，奶龍也很羨慕</p>`;return;}
    const used=new Set(d.cells.map(c=>c.s));
    const secs=d.sections.filter(s=>used.has(s.s)||(s.s>=1&&s.s<=7));
    const at=(dd,ss)=>d.cells.filter(c=>c.d===dd&&c.s===ss);
    const sub=c=>type==='Class'?[c.teacher,c.room]:type==='Teacher'?[c.cls,c.room]:[c.cls,c.teacher];
    const cell=cs=>cs.length?cs.map(c=>`<div class="ct-c${/^無.*課$/.test(c.subj)?' none':''}"><b>${esc(c.subj)}</b>${sub(c).filter(Boolean).map(x=>`<small>${esc(x)}</small>`).join('')}${c.wk?`<em>${esc(c.wk)}</em>`:''}</div>`).join(''):'';
    const today=new Date().getDay();
    const real=d.cells.filter(c=>!/^無.*課$/.test(c.subj)).length;
    out.innerHTML=`<div class="ct-head"><b>${esc(o.name)}</b><span>${real} 節課</span></div>
      <div class="ct-wrap"><table class="ct-t"><thead><tr><th></th>${d.days.map(w=>`<th class="${w.d===today?'today':''}">${esc(w.name)}</th>`).join('')}</tr></thead>
      <tbody>${secs.map(s=>`<tr><th><b>${esc(s.name)}</b>${s.time?`<small>${esc(s.time).replace('~','<br>')}</small>`:''}</th>${d.days.map(w=>`<td class="${w.d===today?'today':''}">${cell(at(w.d,s.s))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
}
// 攔截：官網「課表查詢」入口（198/?str=classtable）與欣河課表網址
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.button||a.dataset.raw)return;
  if(/publish_page\/198\/\?str=classtable|cloud\.shin-her\.com\.tw\/ClassTableV2/.test(a.href)){e.preventDefault();e.stopImmediatePropagation();openClassTable(a.href);}
},true);
