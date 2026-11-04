import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8787'
OUT = '/home/user/Data/Dev/cf/hcvs-naiwa-vercel/shots'
with sync_playwright() as p:
    b = p.chromium.launch()
    for label, vp, mob in [('desktop', {'width': 1440, 'height': 900}, False), ('mobile', {'width': 390, 'height': 844}, True)]:
        ctx = b.new_context(viewport=vp, is_mobile=mob, has_touch=mob, device_scale_factor=2 if mob else 1)
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE + '/?t=ct', wait_until='domcontentloaded'); pg.click('#gate .btn-y')
        pg.wait_for_selector('#nbody tr td.d', timeout=30000)
        links = pg.eval_on_selector_all('a[href*="str=classtable"]', 'e=>e.map(a=>a.textContent.trim()+" @"+(a.closest("[id]")||{}).id)')
        print(label, 'classtable links:', links)
        before = len(ctx.pages)
        pg.evaluate("document.querySelector('a[href*=\"str=classtable\"]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))")
        pg.wait_for_selector('#ct-q', timeout=30000)
        pg.wait_for_function("()=>document.querySelectorAll('#ct-g option').length>0", timeout=30000)
        print(label, 'groups:', pg.eval_on_selector_all('#ct-g option', 'e=>e.map(o=>o.textContent)'))
        pg.select_option('#ct-g', '資訊科')
        print(label, 'items:', pg.eval_on_selector_all('#ct-q option', 'e=>e.map(o=>o.textContent)'))
        pg.select_option('#ct-q', 'G11')
        pg.wait_for_selector('.ct-t', timeout=30000); pg.wait_for_timeout(500)
        st = pg.evaluate("()=>({head:document.querySelector('.ct-head').innerText,rows:document.querySelectorAll('.ct-t tbody tr').length,cols:document.querySelectorAll('.ct-t thead th').length,cells:document.querySelectorAll('.ct-c').length,docW:document.documentElement.scrollWidth})")
        print(label, 'class table:', st)
        pg.screenshot(path=f'{OUT}/ct-{label}.png')
        # 教師
        pg.click('[data-ct-type="Teacher"]')
        pg.wait_for_function("()=>document.querySelectorAll('#ct-q option').length>1", timeout=30000)
        first = pg.evaluate("document.querySelectorAll('#ct-q option')[1].value")
        pg.select_option('#ct-q', first)
        pg.wait_for_function("()=>document.querySelector('.ct-head')||document.querySelector('#ct-out .pp-hint')", timeout=30000); pg.wait_for_timeout(800)
        print(label, 'teacher:', first, '->', pg.evaluate("(document.querySelector('.ct-head')||document.querySelector('#ct-out')).innerText.slice(0,40)"))
        # 教室
        pg.click('[data-ct-type="Classroom"]')
        pg.wait_for_function("()=>document.querySelectorAll('#ct-q option').length>1", timeout=30000)
        first = pg.evaluate("document.querySelectorAll('#ct-q option')[1].value")
        pg.select_option('#ct-q', first)
        pg.wait_for_function("()=>document.querySelector('.ct-head')||document.querySelector('#ct-out .pp-hint')", timeout=30000); pg.wait_for_timeout(800)
        print(label, 'room:', first, '->', pg.evaluate("(document.querySelector('.ct-head')||document.querySelector('#ct-out')).innerText.slice(0,40)"))
        # 記住上次
        pg.evaluate("document.querySelector('#mx').click()")
        pg.evaluate("document.querySelector('a[href*=\"str=classtable\"]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))")
        pg.wait_for_selector('.ct-head', timeout=30000)
        print(label, 'remembered:', pg.inner_text('.ct-head')[:30].replace('\n', ' '))
        # 快取：關掉再開，計時（第二次應該走 localStorage，不打網路）
        reqs = []
        pg.on('request', lambda r: reqs.append(r.url) if '/api/ct' in r.url else None)
        pg.evaluate("document.querySelector('#mx').click()")
        import time; t0 = time.time()
        pg.evaluate("document.querySelector('a[href*=\"str=classtable\"]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))")
        pg.wait_for_selector('.ct-head', timeout=30000)
        print(label, f'reopen {time.time()-t0:.2f}s api calls: {len(reqs)}', 'cache keys:', pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('hcvs-naiwa-c1:/api/ct')).length"))
        print(label, 'new tabs:', len(ctx.pages) - before, 'errors:', errs)
        ctx.close()
    b.close()
