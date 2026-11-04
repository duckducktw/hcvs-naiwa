import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8787'
OUT = '/home/user/Data/Dev/cf/hcvs-naiwa-vercel/shots'


def setup(pg):
    pg.goto(BASE + '/?t=pp', wait_until='domcontentloaded')
    pg.click('#gate .btn-y')
    pg.wait_for_selector('#nbody tr td.d', timeout=30000)


def modal_state(pg):
    return pg.evaluate("""()=>({on:document.querySelector('#modal').classList.contains('on'),
      title:document.querySelector('#mt').textContent,
      menu:document.querySelectorAll('.pp-menu a').length,
      subs:document.querySelectorAll('.pp-subs a').length,
      body:(document.querySelector('#mb .art-body')||{innerText:''}).innerText.length,
      news:document.querySelectorAll('.pp-nlist li').length,
      loading:!!document.querySelector('#mb .loading')})""")


def close(pg):
    pg.evaluate("document.querySelector('#mx').click()")


def click_href(pg, frag):
    # 用 JS 觸發真實 click 事件（同捕獲階段攔截路徑），避免選單 hover 狀態影響
    ok = pg.evaluate("""f=>{const a=[...document.querySelectorAll('a[href]')].find(x=>x.href.includes(f));
      if(!a)return false;a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0}));return true;}""", frag)
    return ok


def wait_done(pg):
    pg.wait_for_function("()=>document.querySelector('#modal.on')&&!document.querySelector('#mb > .loading')&&!document.querySelector('#ppnews > .loading')", timeout=30000)
    pg.wait_for_timeout(600)


def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        for label, vp, mob in [('desktop', {'width': 1440, 'height': 900}, False), ('mobile', {'width': 390, 'height': 844}, True)]:
            ctx = b.new_context(viewport=vp, is_mobile=mob, has_touch=mob, device_scale_factor=2 if mob else 1)
            pg = ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            setup(pg)
            pages_before = len(ctx.pages)
            for frag in ['publish_page/2', 'publish_page/14/?cid=433', 'publish_page/6', 'publish_page/87/?cid=1589', 'home?cid=1531']:
                if not click_href(pg, frag):
                    print(label, frag, 'NOT FOUND'); continue
                wait_done(pg)
                print(label, frag, modal_state(pg))
                if frag == 'publish_page/2':
                    # 側欄點「校長簡介」→ 同視窗換頁
                    pg.evaluate("document.querySelector('.pp-menu a[data-cid=\"3\"]').click()")
                    wait_done(pg)
                    print(label, '  -> 校長簡介', modal_state(pg))
                    pg.screenshot(path=f'{OUT}/pp-{label}.png')
                if frag == 'publish_page/14/?cid=433':
                    pg.evaluate("document.querySelector('.pp-subs a[data-pp]').click()")
                    wait_done(pg)
                    print(label, '  -> 子頁', modal_state(pg))
                close(pg)
            print(label, 'new tabs opened:', len(ctx.pages) - pages_before, 'errors:', errs)
            ctx.close()
        b.close()


main()


def files_test():
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 1440, 'height': 900})
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        setup(pg)
        before = len(ctx.pages)
        # 公告附件 → 站內 PDF 預覽
        pg.evaluate("openNews(24730,'附件測試','https://www.hcvs.hc.edu.tw/ischool/public/news_view/show.php?nid=24730')")
        pg.wait_for_selector('.art-files a', timeout=30000)
        pg.evaluate("document.querySelector('.art-files a').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))")
        pg.wait_for_function("()=>document.querySelector('.pdfv iframe, .pdfv img, #mb .loading .btn')", timeout=30000)
        st = pg.evaluate("()=>({pdf:!!document.querySelector('.pdfv iframe'),src:(document.querySelector('.pdfv iframe')||{}).src||'',title:document.querySelector('#mt').textContent})")
        print('ATTACH->', st['pdf'], st['src'][:20], st['title'][:30])
        pg.screenshot(path=f'{OUT}/pdf.png')
        print('files new tabs:', len(ctx.pages) - before, 'errors:', errs)
        b.close()


files_test()
