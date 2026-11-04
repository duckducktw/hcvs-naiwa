import sys
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8787'
expect=['機械科','板金科','製圖科','室內空間設計科','電機科','資訊科','化工科','餐飲服務科']
with sync_playwright() as p:
 for label,vp in [('desktop',{'width':1440,'height':900}),('mobile',{'width':390,'height':844})]:
  b=p.chromium.launch();ctx=b.new_context(viewport=vp);pg=ctx.new_page();errs=[];ctx.on('page',lambda x:None);pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto(B+'/?roast='+label,wait_until='domcontentloaded');pg.click('#gate .btn-y');pg.wait_for_selector('.roast-card')
  cards=pg.locator('.roast-card');names=cards.locator('b').all_inner_texts();texts=cards.locator('span').all_inner_texts()
  print(label,'count',cards.count(),'names',names,'docW',pg.evaluate('document.documentElement.scrollWidth'),'W',pg.evaluate('innerWidth'),'errs',errs)
  assert names==expect and len(set(texts))==8 and pg.evaluate('document.documentElement.scrollWidth')==vp['width']
  tabs=len(ctx.pages);cards.nth(5).click();pg.wait_for_selector('#modal.on');pg.wait_for_timeout(500)
  print(label,'資訊科站內',pg.inner_text('#mt'),'tabs',len(ctx.pages)-tabs)
  assert len(ctx.pages)==tabs
  b.close()
