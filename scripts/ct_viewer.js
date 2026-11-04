/* ===== 課表免登入（欣河雲端公開資料）===== */
const CT_TYPES=[['Class','班級'],['Teacher','教師'],['Classroom','教室']];
const CT_KEY='hcvs-naiwa-ct';
let ctState={yt:'',type:'Class',no:'',opts:{}};
function ctSaved(){try{return JSON.parse(localStorage.getItem(CT_KEY)||'{}')}catch(e){return{}}}
async function ctJSON(qs){const r=await fetch('/api/ct?'+qs);if(!r.ok)throw r.status;return r.json();}
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
        <input id="ct-q" list="ct-list" placeholder="輸入班級／老師／教室（例：資一甲）" autocomplete="off">
        <datalist id="ct-list"></datalist>
      </div>
      <div id="ct-out"><p class="pp-hint">${NL}選一個班級、老師或教室，奶龍幫你翻課表</p></div>
      <div class="art-foot"><a data-raw="1" class="btn btn-o" href="${esc(href)}" target="_blank" rel="noopener">在欣河原系統開啟</a></div>
    </div>`;
    $('#ct-yt').value=ctState.yt;
    $('#ct-yt').onchange=()=>{ctState.yt=$('#ct-yt').value;ctState.opts={};ctLoadOpts(true);};
    document.querySelectorAll('[data-ct-type]').forEach(b=>b.onclick=()=>{ctState.type=b.dataset.ctType;ctState.no='';$('#ct-q').value='';ctLoadOpts(true);});
    $('#ct-q').oninput=ctPick;$('#ct-q').onchange=ctPick;
    await ctLoadOpts(false);
  }catch(e){$('#mb').innerHTML='<div class="loading">'+NL+pickLine(FAIL)+`<br><br><a data-raw="1" class="btn btn-y" href="${esc(href)}" target="_blank" rel="noopener">改去欣河原系統看</a></div>`;}
}

async function ctLoadOpts(reset){
  document.querySelectorAll('[data-ct-type]').forEach(b=>b.classList.toggle('on',b.dataset.ctType===ctState.type));
  const key=ctState.yt+'|'+ctState.type;
  if(!ctState.opts[key]){$('#ct-list').innerHTML='';$('#ct-q').placeholder='讀取清單中…';
    try{ctState.opts[key]=await ctJSON(`op=options&type=${ctState.type}&yt=${ctState.yt}`);}catch(e){$('#ct-out').innerHTML=`<p class="pp-hint">${pickLine(FAIL)}</p>`;return;}}
  const list=ctState.opts[key];
  const tn={Class:'班級',Teacher:'老師',Classroom:'教室'}[ctState.type];
  $('#ct-q').placeholder=`輸入${tn}名稱或代號（共 ${list.length} 個）`;
  $('#ct-list').innerHTML=list.map(o=>`<option value="${esc(o.name)}">`).join('');
  if(!reset&&ctState.no){const o=list.find(x=>x.v===ctState.no);if(o){$('#ct-q').value=o.name;ctShow(o);return;}}
  if(reset)$('#ct-out').innerHTML=`<p class="pp-hint">${NL}選一個${tn}，奶龍幫你翻課表</p>`;
}
function ctPick(){
  const v=$('#ct-q').value.trim();if(!v)return;
  const list=ctState.opts[ctState.yt+'|'+ctState.type]||[];
  const o=list.find(x=>x.name===v)||list.find(x=>x.v.toLowerCase()===v.toLowerCase())||(list.filter(x=>x.name.includes(v)).length===1?list.find(x=>x.name.includes(v)):null);
  if(o&&o.v!==ctState.no){ctState.no=o.v;ctShow(o);}
}
async function ctShow(o){
  localStorage.setItem(CT_KEY,JSON.stringify({yt:ctState.yt,type:ctState.type,no:o.v}));
  const out=$('#ct-out');out.innerHTML='<div class="loading">'+NL+pickLine(LOADING)+'</div>';
  try{const d=await ctJSON(`op=table&type=${ctState.type}&no=${encodeURIComponent(o.v)}&yt=${ctState.yt}`);
    if(ctState.no!==o.v)return; // 使用者已改選別的
    if(!d.cells.length){out.innerHTML=`<p class="pp-hint">${NL}${esc(o.name)} 這學期沒有排課，奶龍也很羨慕</p>`;return;}
    const used=new Set(d.cells.map(c=>c.s));
    const secs=d.sections.filter(s=>used.has(s.s)||(s.s>=1&&s.s<=7));
    const at=(dd,ss)=>d.cells.filter(c=>c.d===dd&&c.s===ss);
    const sub=c=>ctState.type==='Class'?[c.teacher,c.room]:ctState.type==='Teacher'?[c.cls,c.room]:[c.cls,c.teacher];
    const cell=cs=>cs.length?cs.map(c=>`<div class="ct-c${/^無.*課$/.test(c.subj)?' none':''}"><b>${esc(c.subj)}</b>${sub(c).filter(Boolean).map(x=>`<small>${esc(x)}</small>`).join('')}${c.wk?`<em>${esc(c.wk)}</em>`:''}</div>`).join(''):'';
    const today=new Date().getDay();
    const real=d.cells.filter(c=>!/^無.*課$/.test(c.subj)).length;
    out.innerHTML=`<div class="ct-head"><b>${esc(o.name)}</b><span>${real} 節課</span></div>
      <div class="ct-wrap"><table class="ct-t"><thead><tr><th></th>${d.days.map(w=>`<th class="${w.d===today?'today':''}">${esc(w.name)}</th>`).join('')}</tr></thead>
      <tbody>${secs.map(s=>`<tr><th><b>${esc(s.name)}</b>${s.time?`<small>${esc(s.time).replace('~','<br>')}</small>`:''}</th>${d.days.map(w=>`<td class="${w.d===today?'today':''}">${cell(at(w.d,s.s))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }catch(e){out.innerHTML=`<p class="pp-hint">${pickLine(FAIL)}</p>`;}
}
// 攔截：官網「課表查詢」入口（198/?str=classtable）與欣河課表網址
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.button||a.dataset.raw)return;
  if(/publish_page\/198\/\?str=classtable|cloud\.shin-her\.com\.tw\/ClassTableV2/.test(a.href)){e.preventDefault();e.stopImmediatePropagation();openClassTable(a.href);}
},true);
