// 免登入專頁資料：傑出校友、分機 PDF、行事曆
const ALUMNI_CB='https://script.google.com/macros/s/AKfycbzaskfvcZkDUUfFXj3vlphbsrJfbHTeWdQyFk94OtlPWcGaUeQaogx7dCeM-h19TcC9/callback?nocache_id=6';
const PHONE_PDF='https://drive.usercontent.google.com/download?id=15_oH9vr8bzVkgpbwyJz-kLWCjrYZAbrn&export=download&confirm=t';
const UA='Mozilla/5.0 (X11; Linux x86_64) hcvs-naiwa-mirror';

export async function alumni(){
 const body=new URLSearchParams({request:'["getData","[]",null,[0],null,null,1,0]'});
 const r=await fetch(ALUMNI_CB,{method:'POST',body,headers:{'User-Agent':UA,'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','X-Same-Domain':'1','Referer':'https://script.google.com/'}});
 if(!r.ok)throw new Error('alumni '+r.status);
 const s=await r.text();
 const outer=JSON.parse(s.slice(s.indexOf('\n')+1));
 const d=JSON.parse(outer[0][1][1]);
 return {headers:d.headers,data:d.data};
}

export async function phonePdf(){
 const r=await fetch(PHONE_PDF,{headers:{'User-Agent':UA}});
 if(!r.ok)throw new Error('phone '+r.status);
 return {type:'application/pdf',buf:Buffer.from(await r.arrayBuffer())};
}
