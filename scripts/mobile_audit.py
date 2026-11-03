import sys,json
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8787'
OUT='/home/user/Data/Dev/cf/hcvs-naiwa-vercel/shots'
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True,user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148')
    pg=ctx.new_page();errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(B+'/',wait_until='load');pg.screenshot(path=f'{OUT}/m-gate.png')
    pg.tap('#agree');pg.wait_for_selector('#nbody td.d',timeout=30000);pg.wait_for_timeout(800)
    r=pg.evaluate("""()=>{
      const W=innerWidth,out=[];
      document.querySelectorAll('body *').forEach(e=>{const b=e.getBoundingClientRect();if(b.width&&b.right>W+2&&getComputedStyle(e).position!=='fixed'&&!e.closest('.marquee,#nl-bg,.slides'))out.push(e.tagName+'.'+e.className+' r='+Math.round(b.right))});
      const small=[...document.querySelectorAll('a,button,select,input')].filter(e=>{const b=e.getBoundingClientRect();return b.width&&b.height&&b.height<32&&!e.closest('.drop,.marquee')}).length;
      const fx=[...document.querySelectorAll('#nl-pet,#corner')].map(e=>{const b=e.getBoundingClientRect();return e.id+':'+Math.round(b.width)+'x'+Math.round(b.height)+'@'+Math.round(b.left)+','+Math.round(b.top)});
      const tbl=document.querySelector('.board table').getBoundingClientRect();
      return {docW:document.documentElement.scrollWidth,W,overflow:out.slice(0,15),smallTaps:small,fixed:fx,tableW:Math.round(tbl.width),
        heroH:Math.round(document.querySelector('.hero').getBoundingClientRect().height),h1:getComputedStyle(document.querySelector('.hero h1')).fontSize}
    }""")
    print(json.dumps(r,ensure_ascii=False,indent=1))
    pg.screenshot(path=f'{OUT}/m-top.png')
    pg.locator('#news').scroll_into_view_if_needed();pg.wait_for_timeout(500);pg.screenshot(path=f'{OUT}/m-news.png')
    pg.locator('#nbody td.t a').first.tap();pg.wait_for_selector('#mb .art',timeout=30000);pg.wait_for_timeout(500)
    mr=pg.evaluate("(()=>{const b=document.querySelector('#modal .box').getBoundingClientRect();return [Math.round(b.width),Math.round(b.height),document.querySelector('#mb').scrollWidth>document.querySelector('#mb').clientWidth+2]})()")
    print('modal box',mr);pg.screenshot(path=f'{OUT}/m-modal.png');pg.locator('#mx').tap()
    pg.tap('#hamb');pg.wait_for_timeout(400);pg.screenshot(path=f'{OUT}/m-menu.png')
    print('menu visible',pg.locator('#menu.show').count())
    print('errs',errs)
    b.close()
