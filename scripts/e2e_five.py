import sys
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8787'
items=['行事曆學期重要日程','處室分機聯絡各處室','入學資訊招生與入學','傑出校友校友榮耀','計畫專區各項計畫']
with sync_playwright() as p:
 b=p.chromium.launch()
 for label,vp,mob in [('desktop',{'width':1440,'height':900},False),('mobile',{'width':390,'height':844},True)]:
  ctx=b.new_context(viewport=vp,is_mobile=mob,has_touch=mob);pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto(B+'/?five=1',wait_until='domcontentloaded');pg.click('#gate .btn-y');pg.wait_for_selector('#nbody tr')
  for text in items:
   a=pg.locator('a',has_text=text).first;before=len(ctx.pages);a.click();pg.wait_for_selector('#modal.on');pg.wait_for_timeout(2500)
   st=pg.evaluate("()=>({t:mt.textContent,news:document.querySelectorAll('.pp-nlist li').length,subs:document.querySelectorAll('.pp-subs a').length,al:document.querySelectorAll('.al-card').length,pdf:(document.querySelector('.phonev img')||document.querySelector('#mb iframe')||{}).src||'',txt:mb.innerText.slice(0,80)})")
   print(label,text,'tabs',len(ctx.pages)-before,st)
   if '傑出' in text:
    pg.select_option('#al-y','107');pg.fill('#al-q','板金');pg.wait_for_timeout(200);print(label,' alumni filter',pg.locator('.al-card').count())
   pg.evaluate("mx.click()")
  print(label,'errors',errs,'docW',pg.evaluate('document.documentElement.scrollWidth'))
  ctx.close()
 b.close()
