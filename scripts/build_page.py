import re, json, os
src='/home/user/Data/Dev/cf/hcvs-naiwa/index.html'
dst='/home/user/Data/Dev/cf/hcvs-naiwa-vercel/public/index.html'
s=open(src,encoding='utf-8').read()
def R(a,b,cnt=1):
    global s
    n=s.count(a)
    assert n>=1,('MISS',a[:60])
    s=s.replace(a,b) if cnt==0 else s.replace(a,b,cnt)

# ---------- Vercel: units 直接內嵌 ----------
units=open('/home/user/Data/Dev/cf/hcvs-naiwa-vercel/lib/units.js',encoding='utf-8').read().replace('export default ','').rstrip().rstrip(';')
R('const UNITS=__UNITS__;','const UNITS='+units+';')
s=s.replace('<head>','<head>\n<meta name="robots" content="noindex,nofollow">',1) if 'name="robots"' not in s else s

# ---------- 2. 公告 → 站內原生 modal ----------
R("""function modalDoc(title,doc){""","""function modalDoc(title,doc){""")
native_js=r"""
/* 公告原生顯示：攔截 show.php?nid= 連結 */
const NID_RE=/news_view\/show\.php\?nid=(\d+)/;
const fmtSize=n=>n>1048576?(n/1048576).toFixed(1)+' MB':n>1024?Math.round(n/1024)+' KB':n+' B';
function sanitize(html){
  const t=document.createElement('template');t.innerHTML=html;
  t.content.querySelectorAll('script,style,link,meta,object,embed,form,base').forEach(e=>e.remove());
  t.content.querySelectorAll('*').forEach(e=>{[...e.attributes].forEach(a=>{const n=a.name.toLowerCase(),v=a.value.trim().toLowerCase();
    if(n.startsWith('on')||((n==='href'||n==='src')&&v.startsWith('javascript:'))||n==='style'&&/expression|url\s*\(/.test(v))e.removeAttribute(a.name);});
    if(e.tagName==='A'){e.target='_blank';e.rel='noopener noreferrer';}
    if(e.tagName==='IFRAME'){const ok=/^https:\/\/(drive\.google\.com|docs\.google\.com|www\.youtube\.com|www\.youtube-nocookie\.com|www\.facebook\.com)\//.test(e.getAttribute('src')||'');if(!ok){const a=document.createElement('a');a.href=e.getAttribute('src')||'#';a.textContent='開啟嵌入內容';a.target='_blank';e.replaceWith(a);}else{e.removeAttribute('width');e.setAttribute('loading','lazy');}}
    if(e.tagName==='IMG'){e.loading='lazy';e.removeAttribute('width');e.removeAttribute('height');}
  });
  return t.innerHTML;
}
async function openNews(nid,fallback,href){
  modal(fallback||'公告','<div class="loading">'+NL+pickLine(LOADING)+'</div>');
  try{const r=await fetch('/api/show?nid='+nid);if(!r.ok)throw 0;const d=await r.json();
    $('#mt').textContent=d.title||fallback||'公告';
    const files=d.files.length?`<div class="art-files"><b>📎 附件（${d.files.length}）</b>${d.files.map(f=>`<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.name)}<small>${fmtSize(f.size)}</small></a>`).join('')}</div>`:'';
    $('#mb').innerHTML=`<div class="art"><div class="art-meta"><span>🏢 ${esc(d.unit)}</span><span>👤 ${esc(d.person)}</span><span>🕒 ${esc(d.time)}</span></div>${files}<div class="art-body">${sanitize(d.content)||'<p class="loading">'+NL+'這則公告只有標題，內文被奶龍吃了</p>'}</div><div class="art-foot"><a data-raw="1" class="btn btn-o" href="${esc(href)}" target="_blank" rel="noopener">在學校官網開啟原文</a></div></div>`;
    $('#mb').scrollTop=0;
  }catch(e){$('#mb').innerHTML='<div class="loading">'+NL+pickLine(FAIL)+`<br><br><a data-raw="1" class="btn btn-y" href="${esc(href)}" target="_blank" rel="noopener">改去官網看</a></div>`;}
}
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.button)return;
  if(a.dataset.raw)return;const m=a.href.match(NID_RE);if(!m)return;
  e.preventDefault();openNews(m[1],a.textContent.trim()||a.querySelector('img')?.alt||'',a.href);
},true);
"""
R("$('#mx').onclick=","/*NATIVE*/\n$('#mx').onclick=")
s=s.replace("/*NATIVE*/",native_js,1)

# tab「更多」清單裡的 a 也會被上面攔截；tabItem 對 url 類型保持 a tag 即可

# ---------- 3. 換掉 default.jpeg 清朝老圖 ----------
R("""if(it[0]){$('#fimg').innerHTML=it[0].linktype==='url'?""","""if(it[0]){if(/default\\.jpe?g$/i.test(it[0].image||''))it[0].image=coverFor(it[0].title,FTABS[i][0]);$('#fimg').innerHTML=it[0].linktype==='url'?""")
cover_js=r"""
/* 預設封面：ischool 的 default.jpeg 換成奶龍雷霆海報（SVG 動態生成） */
function coverFor(title,tab){
  const t=String(title).replace(/\(\d{7}\)/,'').trim();
  const big=t.length>16?t.slice(0,16)+'…':t;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
<defs><radialGradient id="g" cx="30%" cy="35%" r="85%"><stop offset="0" stop-color="#fff3b0"/><stop offset=".55" stop-color="#ffcd00"/><stop offset="1" stop-color="#ff9f1c"/></radialGradient>
<pattern id="p" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)"><rect width="60" height="60" fill="none"/><path d="M0 30h60" stroke="#fff" stroke-opacity=".18" stroke-width="14"/></pattern></defs>
<rect width="1200" height="675" fill="url(#g)"/><rect width="1200" height="675" fill="url(#p)"/>
<g fill="#1a1a2e" font-family="Noto Serif TC,serif" font-weight="900">
<text x="60" y="120" font-size="44" fill="#c0392b">⚡ 竹工雷霆捷報 ⚡ ${esc(tab)}</text>
<text x="60" y="260" font-size="78">${esc(big)}</text>
<text x="60" y="360" font-size="40" font-weight="700">前世沒上榜的，這一世都上了</text>
<text x="60" y="600" font-size="30" font-weight="700" fill="#5b4300">非官方 · 純玩梗 · 以學校官網為準</text></g>
<image href="${location.origin}/img/nl0.webp?v=2" x="820" y="250" width="340" height="420"/>
</svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
"""
R("/* featured tabs */",cover_js+"/* featured tabs */")
# data: 會被 esc 保持（只轉 &<>"'），encodeURIComponent 後安全

# ---------- 4. 右下角那隻 ----------
R('<div id="modal" role="dialog"','<div id="corner" title="?"><div class="bubble" id="cbub"></div><img src="/img/corner.webp?v=1" alt="" draggable="false"></div>\n<div id="modal" role="dialog"')
corner_css="""
#corner{position:fixed;right:14px;bottom:0;z-index:150;width:120px;cursor:pointer;filter:drop-shadow(0 8px 14px rgba(0,0,0,.25));transform-origin:bottom center;animation:cn-idle 3.4s ease-in-out infinite}
#corner img{width:100%;display:block}
#corner:hover{animation:cn-shake .35s infinite}
#corner .bubble{position:absolute;right:96%;bottom:70%;white-space:nowrap;background:#1a1a2e;color:#ffcd00;font-weight:800;padding:8px 12px;border-radius:14px;font-size:13px;opacity:0;transform:translateY(6px);transition:.2s;pointer-events:none}
#corner.talk .bubble{opacity:1;transform:none}
@keyframes cn-idle{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-6px) rotate(-2deg)}}
@keyframes cn-shake{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
@media(max-width:640px){#corner{width:78px;right:6px}}
/* 原生公告 */
.art-meta{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:14px;color:#555;padding-bottom:12px;border-bottom:2px dashed var(--border);margin-bottom:14px}
.art-files{background:#fff8d6;border:2px solid #ffcd00;border-radius:14px;padding:12px 14px;margin-bottom:16px}
.art-files b{display:block;margin-bottom:6px}
.art-files a{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-top:1px dashed #e8c95a;word-break:break-all}
.art-files a:first-of-type{border-top:0}
.art-files small{color:#888;white-space:nowrap}
.art-body{line-height:1.85;font-size:16px;word-break:break-word}
.art-body img{max-width:100%;height:auto;border-radius:10px}
.art-body iframe{width:100%;min-height:60vh;border:0;border-radius:10px}
.art-body table{border-collapse:collapse;max-width:100%;display:block;overflow:auto;font-size:14px}
.art-body td,.art-body th{border:1px solid #e5dcc0;padding:4px 8px}
.art-body a{color:var(--accent);text-decoration:underline}
.art-foot{margin-top:18px;padding-top:14px;border-top:2px dashed var(--border);text-align:right}
"""
R("</style>",corner_css+"</style>")

# ---------- 5. 更雷霆抽象的文案 ----------
T=[
('>⚡ 雷霆警告 ⚡ 開啟前請先看這裡<','>⚡⚡ 雷霆警告：前方高能奶龍出沒 ⚡⚡<'),
('>我同意，進入<','>我同意，並願意被奶龍吃掉<'),
('>不同意<','>我拒絕（奶龍會哭）<'),
('>非官方 · 純玩梗 · 內容以學校官網為準<','>非官方 · 純玩梗 · 內容以學校官網為準 · 奶龍不背鍋<'),
('>奶龍大學 · 竹工分校（重生版）<','>奶龍大學 · 竹工分校 · 第 114514 次重生<'),
('>⚡ 雷霆認證 · 奶龍親自坐鎮 ⚡<','>⚡ 雷霆認證 · 奶龍坐鎮 · 教官看了都沉默 ⚡<'),
('>重生回到國三那年，<br>我含淚填下了竹工<','>重生回到國三那年，<br>我含淚填下了竹工，<br>這次我要讓焊槍記住我的名字<'),
('>入學資訊</a>\n        <a class="btn btn-ghost" href="#news">最新消息</a>','>入學資訊（機械加工科車銑鉋磨後推薦）</a>\n        <a class="btn btn-ghost" href="#news">最新消息（燙嘴）</a>'),
('>奶龍一則一則舔過，眼睛已經不行了<','>每一則都是奶龍用肚子壓出來的，所以很平<'),
('>九條命，一條比一條硬<','>八科一心，互相甩鍋比你的感情還牢<'),
('>十一位長老鎮守竹工，蓋章蓋到手斷<','>十一位長老鎮守竹工，公文跑一趟等於取經<'),
('>八十年前它就在了，八十年後奶龍還在<','>學校八十歲了，奶龍還是三歲，這就是差距<'),
('>點下去的那一刻，命運齒輪開始轉動<','>點下去的那一刻，命運齒輪開始轉動，然後卡住，因為它是板金科做的<'),
('>這裡的每個處室，都曾是某個人的白月光<','>每個處室都是某個人的白月光，也是某個人的公文地獄<'),
('>榜單上沒有你的名字？沒關係，奶龍也沒有<','>榜單上沒有你的名字？沒關係，奶龍已經幫你在夢裡錄取台科了<'),
('>即時同步。奶龍比教官還早知道<','>即時同步。奶龍比教官還早知道，比你媽還晚知道<'),
('>連結很多，請不要一口氣全部點開，奶龍會心疼你的記憶體<','>連結很多，一口氣全點開的話，你的電腦會變成奶龍的形狀<'),
('>前世我錯過了竹工，<','>餐飲科擺盤三小時，<'),
('>這一世，我要親手焊出我的未來<','>奶龍三口吃完<'),
('>你拒絕了奶龍。奶龍不哭，奶龍只是把臉轉過去了。<','>你拒絕了奶龍。奶龍不哭，奶龍只是去頂樓吹了一下風，順便把你的段考成績吹走了。<'),
('>外觀致敬 奶龍大學 · 奶龍 24 小時在線，因為奶龍沒有家<','>外觀致敬 奶龍大學 · 奶龍 24 小時在線，因為奶龍沒有家，也沒有學籍<'),
(' 一週七天五天都在壞 ',' 一週七天五天都在壞 · 剩下兩天在補考 '),
(' 我是奶龍我才是奶龍 ',' 我是奶龍我才是奶龍 · 你是奶龍那我是誰 '),
]
for a,b in T: R(a,b,0)
# 載入/失敗/空：隨機雷霆台詞
lines_js=r"""
const LOADING=['奶龍正在用肚子翻公告，請勿催促…','正在連線學校伺服器…對方已讀不回','奶龍正在 Ctrl+F，請稍候','公告載入中，奶龍順便把便當吃完','重生系統載入中…⚡','奶龍正在跟教官借公文，教官說要簽三份'];
const FAIL=['奶龍滑倒了（奶龍沒事，伺服器有事）','學校伺服器被奶龍坐壞了，請稍後再試','連線失敗：對方拒絕了你，跟你的暗戀一樣','503：學校伺服器正在重生中'];
const EMPTY=['奶龍翻遍三界六道，查無此人','這裡原本有東西的，直到奶龍餓了','什麼都沒有，跟奶龍的腦袋一樣乾淨'];
const pickLine=a=>a[Math.random()*a.length|0];
"""
R("const $=s=>document.querySelector(s);","const $=s=>document.querySelector(s);")
s=s.replace("'奶龍正在用肚子翻公告，請勿催促…","pickLine(LOADING)+'")
s=s.replace("+'奶龍正在用肚子翻公告，請勿催促…","+pickLine(LOADING)+'")
s=s.replace("奶龍滑倒了，讀取失敗，請稍後再試（奶龍沒事，伺服器有事）","'+pickLine(FAIL)+'")
s=s.replace("+NL+'奶龍翻遍三界六道，查無此人","+NL+pickLine(EMPTY)+'")
s=s.replace("+NL+'這裡原本有東西的，直到奶龍餓了","+NL+pickLine(EMPTY)+'")
R("const H='https://www.hcvs.hc.edu.tw', P=H+'/ischool/publish_page/';",lines_js.strip()+"\nconst H='https://www.hcvs.hc.edu.tw', P=H+'/ischool/publish_page/';")
newlines=['我是奶龍！我才是奶龍！','我不是胖，我是被段考壓扁的','重生回到開學前，我發誓這次一定要讀書，然後我又睡著了',
 '別人重生奪權復仇，奶龍重生只想吃福利社','實習工場的焊槍，是我前世的愛人','一週就那七天，五天都在上課，兩天在補考',
 '教官的眼神，比我的未來還銳利','你點我一下，我就少一塊肉，但奶龍願意','我不懂電路學，但我懂你',
 '統測倒數？奶龍只會倒立','歐姆定律說 V=IR，奶龍說 V=我餓了','電阻是用來阻止電流的，我是用來阻止你讀書的',
 '老師說這題會考，奶龍說這題會烤','我的人生就像板金，一敲就凹','車床轉一圈，奶龍暈三天',
 '你以為我在笑？我是在哭，只是長這樣','福利社的麵包，是我活下去的唯一理由','這不是肥肉，這是我的散熱片',
 '摸我肚子，下次段考加十分（騙你的，加一分）','我要成為焊接王的男人！']
# 九個專業科的梗自然混進既有文案，不另開嘲笑專區
# 機械科：首頁主標
s=s.replace('這次我要讓焊槍記住我的名字','這次我要讓車床記住我的早餐')
# 板金科：快速入口（保留原本最自然的命運齒輪梗）
s=s.replace('點下去的那一刻，命運齒輪開始轉動，然後卡住，因為它是板金科做的','點下去的那一刻，命運齒輪開始轉動，然後卡住，因為它是板金科做的')
# 室設科：學校單位
s=s.replace('每個處室都是某個人的白月光，也是某個人的公文地獄','每個處室都是室設科的作業素材，最後都會渲染成豪宅')
# 製圖科：焦點專區
s=s.replace('榜單上沒有你的名字？沒關係，奶龍已經幫你在夢裡錄取台科了','榜單位置由製圖科標註，誤差正負三所國立科大')
# 資訊科：最新消息
s=s.replace('即時同步。奶龍比教官還早知道，比你媽還晚知道','即時同步。除非資訊科剛好把正式站當測試站')
# 化工科：相關連結
s=s.replace('連結很多，一口氣全點開的話，你的電腦會變成奶龍的形狀','連結很多，請勿混合點擊，化工科說會產生不明沉澱')
# 餐飲科：頁尾主標
# 九科統計：機械加工科獨立於機械科
s=s.replace('八科一心，互相甩鍋比你的感情還牢','九個專業科，電機科都接好了但保險絲還是你的未來')

# 電機科與九科補充梗藏進既有奶龍隨機台詞
newlines.extend([
 '電機科背熟歐姆定律，插座沒電還是先拍兩下。',
 '機械科說公差正負 0.01，奶龍的成績正負 60。',
 '板金科敲的是鐵，凹的是人生。',
 '製圖科 ctrl+z 按得回線條，按不回熬夜。',
 '室設科渲染的是豪宅，住的是電腦教室。',
 '資訊科第一支是 Hello World，最後一支只是換成 Python。',
 '化工科說物質守恆，奶龍說睡眠不守恆。',
 '餐飲科問幾分熟，奶龍說段考三分熟。',
 '機械加工科車銑鉋磨全都會，唯一加工不了的是早八的精神。',
])

s=re.sub(r"const LINES=\[[^\]]*\];","const LINES="+repr(newlines).replace("', '","','")+";",s,count=1)
s=s.replace("say(pb,'恭喜你，刷到了竹工奶龍，八十年才出一次')","say(pb,'恭喜你刷到竹工奶龍，八十年才出一次，不轉發段考全倒')")
# 右下角那隻互動
corner_js=r"""
  const CL=['你看什麼看','我只是路過，別管我','我是右下角的守護神','這個網站我說了算','我在監視你讀書','不要點我，點了也沒用','⚡雷霆⚡'];
  const cn=$('#corner'),cb=$('#cbub');let ci=0;
  if(cn)cn.onclick=e=>{cb.textContent=CL[ci++%CL.length];cn.classList.add('talk');clearTimeout(cn._t);cn._t=setTimeout(()=>cn.classList.remove('talk'),2200);burst(e.clientX,e.clientY);};
"""
R("  let pi=3;const pet0=pet.onclick;","  "+corner_js.strip()+"\n  let pi=3;const pet0=pet.onclick;")
s=s.replace("document.title","document.title")
s=s.replace('<title>國立新竹高級工業職業學校（非官方奶龍風重製）</title>','<title>國立新竹高級工業職業學校（非官方奶龍雷霆重製）</title>')
# 校名（UNITS 資料裡的單位名不動，只改顯示用）
s=s.replace('<title>國立新竹高級工業職業學校（','<title>國立新竹奶龍工業職業學校（')
s=s.replace('<b>國立新竹高級工業職業學校</b>','<b>國立新竹奶龍工業職業學校</b>')
s=s.replace('<h5>國立新竹高級工業職業學校</h5>','<h5>國立新竹奶龍工業職業學校</h5>')
s=s.replace('版權所有 @ 2018, 國立新竹高級工業職業學校.','版權所有 @ 2018, 國立新竹奶龍工業職業學校.')
s=s.replace('竹工雷霆捷報','奶龍工雷霆捷報')
# 右下角固定台詞
s=re.sub(r"const CL=\[[^\]]*\];","const CL=['喔哈哈哈哈哈哈'];",s,count=1)
# 已同意的回訪者：等整段 script 跑完（所有 const/let 都初始化）才進站，避免 TDZ
R("if(sessionStorage.getItem('hcvs-naiwa-ok')==='1') enter();","")
R("\n</script>\n</body>","\nif(sessionStorage.getItem('hcvs-naiwa-ok')==='1') enter();\n</script>\n</body>")
# ---------- 手機體驗修正 ----------
mobile_css="""
/* 通用：不准任何東西把頁面撐寬 */
html,body{max-width:100%;overflow-x:hidden}
#nl-bg{width:100vw;max-width:100%}
td.t{word-break:break-word;overflow-wrap:anywhere}
table{table-layout:fixed}
th.d,td.d{width:96px}
th.u,td.u{width:110px}
th.c,td.c{width:64px}
#modal .hd{gap:12px}
#modal .hd b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.35}
#modal .hd button{flex:0 0 auto}
@media(max-width:640px){
  .wrap{padding-left:14px;padding-right:14px}
  section{padding-top:44px;padding-bottom:44px}
  .board{padding:14px;border-radius:16px}
  /* 公告表：改卡片列，日期在上、標題在下 */
  .board table,.board tbody,.board tr,.board td{display:block;width:auto}
  .board thead{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px}
  .board thead tr{display:flex;gap:6px}
  .board th{display:inline-block!important;border:1px solid var(--border);border-radius:999px;padding:6px 12px;font-size:13px;width:auto!important}
  .board th.u,.board th.c{display:inline-block!important}
  .board tr{padding:12px 2px;border-bottom:1px solid #f1e6c8}
  .board td{border:0;padding:0}
  .board td.d{font-size:12px;width:auto;margin-bottom:4px}
  .board td.u,.board td.c{display:none}
  .board td.t a{font-size:15px;line-height:1.5}
  .filters{gap:10px}
  .filters .btn{flex:1}
  .tabs{flex-wrap:nowrap;overflow-x:auto;justify-content:flex-start;-webkit-overflow-scrolling:touch;scrollbar-width:none;margin-left:-14px;margin-right:-14px;padding:0 14px 4px}
  .tabs::-webkit-scrollbar{display:none}
  .tabs button{flex:0 0 auto;padding:9px 16px}
  .pager button{min-width:40px;height:40px}
  .pager .info{width:100%;text-align:center;margin-top:6px}
  .hero{min-height:0}
  .hero .wrap{padding-top:40px;padding-bottom:70px}
  .hero h1{font-size:27px;line-height:1.35;padding-right:110px}
  .hero .kicker{font-size:12px}
  .hero .cta{flex-wrap:wrap;gap:8px}
  .hero .cta .btn{flex:1 1 auto;text-align:center;padding:11px 14px}
  .hero .mascot{width:100px;top:18px}
  .stats .wrap{gap:10px}
  .stat small{font-size:12px}
  .band{padding:24px;border-radius:20px}
  .band .nl-big{width:150px;height:150px;right:-20px;bottom:-30px}
  .band .row .btn{flex:1 1 auto;text-align:center}
  /* 浮動角色縮小、不擋內容、不擋點擊 */
  #nl-pet{width:52px;height:52px;left:8px;bottom:10px}
  #corner{width:64px;right:4px}
  #nl-pet .bubble,#corner .bubble{font-size:12px;padding:6px 10px}
  #corner .bubble{right:90%}
  #nl-bg img{opacity:.08}
  /* 公告視窗：全螢幕 sheet */
  #modal{padding:0;align-items:flex-end}
  #modal .box{width:100%;max-height:92vh;height:92vh;border-radius:20px 20px 0 0}
  #modal .hd{padding:12px 14px}
  #modal .hd b{font-size:15px}
  #modal .hd button{width:40px;height:40px;font-size:18px}
  #modal .bd{padding:14px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
  .art-meta{font-size:12px;gap:4px 12px}
  .art-body{font-size:15px}
  .art-body iframe{min-height:50vh}
  .art-foot{text-align:center}
  .art-foot .btn{display:block}
  /* 選單 */
  .menu{top:64px;max-height:calc(100vh - 64px)}
  .menu>li>button{width:100%;text-align:left;padding:14px 4px;font-size:16px}
  .drop a{padding:10px 8px;display:block}
}
@media(max-width:380px){.hero h1{font-size:24px;padding-right:90px}.hero .mascot{width:84px}}
/* 視窗開著時鎖住背景捲動 */
body.modal-open{overflow:hidden}
"""
R("</style>",mobile_css+"</style>")
R("function modal(title,html){$('#mt').textContent=title;$('#mb').innerHTML=html;$('#modal').classList.add('on');}",
  "function modal(title,html){$('#mt').textContent=title;$('#mb').innerHTML=html;$('#modal').classList.add('on');document.body.classList.add('modal-open');}")
R("$('#mx').onclick=()=>{$('#modal').classList.remove('on');$('#mb').innerHTML='';};",
  "$('#mx').onclick=()=>{$('#modal').classList.remove('on');$('#mb').innerHTML='';document.body.classList.remove('modal-open');};")
# ---------- 單位頁 / 內容頁 站內顯示 ----------
import os as _os
_d=_os.path.dirname(_os.path.abspath(__file__))
pp_css=open(_os.path.join(_d,'pp_viewer.css'),encoding='utf-8').read()
pp_js=open(_os.path.join(_d,'pp_viewer.js'),encoding='utf-8').read()
ct_css=open(_os.path.join(_d,'ct_viewer.css'),encoding='utf-8').read()
ct_js=open(_os.path.join(_d,'ct_viewer.js'),encoding='utf-8').read()
public_css=open(_os.path.join(_d,'public_viewer.css'),encoding='utf-8').read()
public_js=open(_os.path.join(_d,'public_viewer.js'),encoding='utf-8').read()
cache_js=open(_os.path.join(_d,'cache.js'),encoding='utf-8').read()
R("</style>",pp_css+ct_css+public_css+"</style>")
i_s=s.rfind('<script>')
s=s[:i_s+8]+'\n'+cache_js+'\n'+s[i_s+8:]
R("\nif(sessionStorage.getItem('hcvs-naiwa-ok')==='1') enter();\n</script>","\n"+public_js+"\n"+pp_js+"\n"+ct_js+"\nif(sessionStorage.getItem('hcvs-naiwa-ok')==='1') enter();\n</script>")
# ---------- SEO：開放收錄（明示非官方，避免被當成學校官網）----------
SEO_HEAD = """<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="description" content="【非官方・玩梗站】奶龍風格重製的新竹高工官網外觀，資料即時取自學校公開網站。公告、單位頁、課表免登入查詢。所有內容請以學校官網 www.hcvs.hc.edu.tw 為準。">
<link rel="canonical" href="https://hcvs.gdtw.qzz.io/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="國立新竹奶龍工業職業學校（非官方）">
<meta property="og:title" content="國立新竹奶龍工業職業學校｜非官方玩梗站">
<meta property="og:description" content="奶龍風格重製的新竹高工官網外觀（非官方）。公告、單位頁、課表免登入。內容以學校官網為準。">
<meta property="og:url" content="https://hcvs.gdtw.qzz.io/">
<meta property="og:image" content="https://hcvs.gdtw.qzz.io/img/nl0.webp">
<meta property="og:locale" content="zh_TW">
<meta name="twitter:card" content="summary">
<script type="application/ld+json">""" + json.dumps({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "國立新竹奶龍工業職業學校（非官方玩梗站）",
  "alternateName": "奶龍工",
  "url": "https://hcvs.gdtw.qzz.io/",
  "inLanguage": "zh-Hant",
  "description": "非官方、純玩梗的新竹高工官網奶龍風格重製；資料來自學校公開網站，內容以學校官網為準。"
}, ensure_ascii=False) + """</script>"""
GSC_META = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gsc_meta.txt'), encoding='utf-8').read().strip()
s = s.replace('<meta name="robots" content="noindex,nofollow">', GSC_META + '\n' + SEO_HEAD, 1)
s = s.replace('<title>國立新竹奶龍工業職業學校（非官方奶龍雷霆重製）</title>',
              '<title>國立新竹奶龍工業職業學校｜非官方玩梗站（新竹高工奶龍重製）</title>', 1)
assert 'noindex' not in s, 'noindex still present'
open(dst,'w',encoding='utf-8').write(s)
print('ok', len(s))
