import sys
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8787'
terms=['車床記住我的早餐','機械加工科也加工不了你的未來','板金科做的','室設科的作業素材','製圖科標註','電機科都接好了','資訊科剛好把正式站當測試站','化工科說會產生不明沉澱','餐飲科擺盤三小時']
with sync_playwright() as p:
 for label,vp in [('desktop',{'width':1440,'height':900}),('mobile',{'width':390,'height':844})]:
  b=p.chromium.launch();pg=b.new_page(viewport=vp);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto(B+'/?inline='+label,wait_until='domcontentloaded');pg.click('#gate .btn-y');pg.wait_for_selector('#nbody tr')
  txt=pg.inner_text('body');missing=[x for x in terms if x not in txt]
  print(label,'missing',missing,'roast section',pg.locator('#roast').count(),'docW',pg.evaluate('document.documentElement.scrollWidth'),'W',pg.evaluate('innerWidth'),'rows',pg.locator('#nbody tr').count(),'errs',errs)
  assert not missing and pg.locator('#roast').count()==0 and pg.evaluate('document.documentElement.scrollWidth')==vp['width'] and not errs
  b.close()
