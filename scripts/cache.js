/* ===== 全站 API 快取（瀏覽器端）=====
 * 所有 /api/* GET 一律經過這層：
 *  - 新鮮（未過 TTL）→ 直接回快取，不打網路
 *  - 過期但有舊資料 → 先回舊的（秒開），背景抓新的寫回快取
 *  - 沒快取 → 正常抓
 * 二進位檔（/api/file）走 Cache Storage，其餘 JSON/HTML 走 localStorage。 */
(()=>{
  const NS='hcvs-naiwa-c1:';
  // 各端點新鮮度（毫秒）：公告變動快，課表/單位頁慢
  const TTL=[[/^\/api\/news/,3*60e3],[/^\/api\/unews/,5*60e3],[/^\/api\/(tab|tabc|carousel)/,15*60e3],
             [/^\/api\/(show|page|mshow)/,30*60e3],[/^\/api\/ct/,6*3600e3],[/^\/api\/file/,24*3600e3]];
  const MAXAGE=7*24*3600e3; // 超過 7 天的舊資料不拿來先頂
  const ttlOf=p=>{for(const[r,t]of TTL)if(r.test(p))return t;return 0;};
  const orig=window.fetch.bind(window);
  const lsGet=k=>{try{return JSON.parse(localStorage.getItem(NS+k)||'null')}catch(e){return null}};
  const lsPut=(k,v)=>{const s=JSON.stringify(v);try{localStorage.setItem(NS+k,s)}catch(e){prune();try{localStorage.setItem(NS+k,s)}catch(e2){}}};
  function prune(){ // 滿了：刪最舊的一半
    const ks=Object.keys(localStorage).filter(k=>k.startsWith(NS)).map(k=>{let t=0;try{t=JSON.parse(localStorage.getItem(k)).t||0}catch(e){}return[k,t]}).sort((a,b)=>a[1]-b[1]);
    ks.slice(0,Math.max(1,ks.length>>1)).forEach(([k])=>localStorage.removeItem(k));
  }
  const mk=(c)=>new Response(c.b,{status:200,headers:{'content-type':c.ty,'x-naiwa-cache':'hit'}});
  const inflight=new Map(); // 同一個 key 同時只打一次
  function fill(url,key){
    if(inflight.has(key))return inflight.get(key).then(r=>r.clone());
    const p=fill0(url,key).finally(()=>inflight.delete(key));inflight.set(key,p);return p.then(r=>r.clone());
  }
  async function fill0(url,key){
    const r=await orig(url);
    if(r.ok){const ty=r.headers.get('content-type')||'';const b=await r.clone().text();const old=lsGet(key);lsPut(key,{t:Date.now(),ty,b});
      if(old&&old.b!==b)window.dispatchEvent(new CustomEvent('naiwa-fresh',{detail:{key,body:b}}));}
    return r;
  }
  // 二進位（PDF/圖片）：Cache Storage
  async function fileFetch(url,key,ttl){
    if(!('caches' in window))return orig(url);
    const c=await caches.open('hcvs-naiwa-files');const hit=await c.match(key);
    const age=hit?Date.now()-(+hit.headers.get('x-naiwa-t')||0):Infinity;
    const refresh=async()=>{const r=await orig(url);if(r.ok){const b=await r.clone().blob();
      await c.put(key,new Response(b,{headers:{'content-type':r.headers.get('content-type')||'','x-naiwa-t':String(Date.now())}}));}return r;};
    if(hit&&age<ttl)return hit;
    if(hit&&age<MAXAGE){refresh().catch(()=>{});return hit;}
    return refresh();
  }
  window.fetch=function(input,init){
    try{
      const url=typeof input==='string'?input:input.url;
      const method=(init&&init.method)||(typeof input!=='string'&&input.method)||'GET';
      const u=new URL(url,location.href);
      if(method!=='GET'||u.origin!==location.origin)return orig(input,init);
      const ttl=ttlOf(u.pathname);if(!ttl)return orig(input,init);
      const key=u.pathname+u.search;
      if(u.pathname==='/api/file')return fileFetch(u.href,key,ttl);
      const c=lsGet(key);
      if(c){
        const age=Date.now()-c.t;
        if(age<ttl)return Promise.resolve(mk(c));
        if(age<MAXAGE){fill(u.href,key).catch(()=>{});return Promise.resolve(mk(c));}
      }
      return fill(u.href,key);
    }catch(e){return orig(input,init);}
  };
  window.naiwaCacheClear=()=>{Object.keys(localStorage).filter(k=>k.startsWith(NS)).forEach(k=>localStorage.removeItem(k));if('caches' in window)caches.delete('hcvs-naiwa-files');};
})();
