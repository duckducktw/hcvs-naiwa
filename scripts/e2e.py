import sys
from playwright.sync_api import sync_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8787'
OUT='/home/user/Data/Dev/cf/hcvs-naiwa-vercel/shots'
import os; os.makedirs(OUT,exist_ok=True)
with sync_playwright() as p:
    b=p.chromium.launch()
    for name,vp in [('desktop',{'width':1440,'height':900}),('mobile',{'width':390,'height':844})]:
        pg=b.new_page(viewport=vp);errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
        pg.goto(BASE+'/?t=1',wait_until='load');pg.click('#agree')
        pg.wait_for_selector('#nbody tr td.d',timeout=30000)
        pg.wait_for_function("document.querySelector('#fimg img')",timeout=30000)
        fsrc=pg.get_attribute('#fimg img','src') or ''
        rows=pg.locator('#nbody tr').count()
        corner=pg.evaluate("(()=>{const i=document.querySelector('#corner img');return i&&i.complete&&i.naturalWidth})()")
        broken=pg.evaluate("[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&i.src.includes(location.host)).map(i=>i.src)")
        if name=='desktop':
            pg.screenshot(path=f'{OUT}/hero.png')
            pg.locator('#feat').scroll_into_view_if_needed();pg.wait_for_timeout(800);pg.locator('#feat').screenshot(path=f'{OUT}/feat.png')
            # 公告點擊 → 原生 modal
            pg.locator('#news').scroll_into_view_if_needed()
            first=pg.locator('#nbody td.t a').first;title=first.inner_text()
            with pg.expect_popup(timeout=1500) if False else open(os.devnull) as _: pass
            pages_before=len(b.contexts[0].pages) if b.contexts else 0
            first.click();pg.wait_for_selector('#mb .art',timeout=30000)
            mt=pg.inner_text('#mt');meta=pg.inner_text('.art-meta');blen=len(pg.inner_text('.art-body'))
            pg.screenshot(path=f'{OUT}/modal.png')
            pages_after=len(pg.context.pages)
            print('MODAL title=',mt[:40],'| meta=',meta.replace('\n',' '),'| bodylen',blen,'| new tabs',pages_after-1)
            pg.click('#mx')
            # 附件公告
            pg.evaluate("openNews('24730','test','https://x')");pg.wait_for_selector('#mb .art-files',timeout=30000)
            print('ATTACH',pg.locator('.art-files a').count(),pg.locator('.art-files a').first.get_attribute('href'))
            pg.click('#mx')
            # 榜單 tab 的 a
            pg.locator('#feat').scroll_into_view_if_needed();pg.locator('#flist a').first.click();pg.wait_for_selector('#mb .art',timeout=30000)
            print('FEAT modal',pg.inner_text('#mt')[:40],'table rows',pg.locator('.art-body tr').count())
            pg.click('#mx')
            pg.click('#corner',force=True);pg.wait_for_timeout(300);print('corner says',pg.inner_text('#cbub'))
            pg.evaluate("window.scrollTo(0,document.body.scrollHeight)");pg.wait_for_timeout(1200);pg.screenshot(path=f'{OUT}/bottom.png')
        else:
            pg.screenshot(path=f'{OUT}/mobile.png',full_page=False)
        print(name,'errs',errs[:5],'rows',rows,'featimg default?', 'default.jpeg' in fsrc, fsrc[:40],'corner w',corner,'broken',broken)
        pg.close()
    b.close()
