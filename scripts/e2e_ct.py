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
        pg.wait_for_function("()=>/共 \\d+ 個/.test(document.querySelector('#ct-q').placeholder)", timeout=30000)
        print(label, 'placeholder:', pg.get_attribute('#ct-q', 'placeholder'))
        pg.fill('#ct-q', '資一甲'); pg.dispatch_event('#ct-q', 'change')
        pg.wait_for_selector('.ct-t', timeout=30000); pg.wait_for_timeout(500)
        st = pg.evaluate("()=>({head:document.querySelector('.ct-head').innerText,rows:document.querySelectorAll('.ct-t tbody tr').length,cols:document.querySelectorAll('.ct-t thead th').length,cells:document.querySelectorAll('.ct-c').length,docW:document.documentElement.scrollWidth})")
        print(label, 'class table:', st)
        pg.screenshot(path=f'{OUT}/ct-{label}.png')
        # 教師
        pg.click('[data-ct-type="Teacher"]')
        pg.wait_for_function("()=>/老師名稱/.test(document.querySelector('#ct-q').placeholder)", timeout=30000)
        first = pg.evaluate("document.querySelector('#ct-list option').value")
        pg.fill('#ct-q', first); pg.dispatch_event('#ct-q', 'change')
        pg.wait_for_function("()=>document.querySelector('.ct-head')||document.querySelector('#ct-out .pp-hint')", timeout=30000); pg.wait_for_timeout(800)
        print(label, 'teacher:', first, '->', pg.evaluate("(document.querySelector('.ct-head')||document.querySelector('#ct-out')).innerText.slice(0,40)"))
        # 教室
        pg.click('[data-ct-type="Classroom"]')
        pg.wait_for_function("()=>/教室名稱/.test(document.querySelector('#ct-q').placeholder)", timeout=30000)
        first = pg.evaluate("document.querySelector('#ct-list option').value")
        pg.fill('#ct-q', first); pg.dispatch_event('#ct-q', 'change')
        pg.wait_for_function("()=>document.querySelector('.ct-head')||document.querySelector('#ct-out .pp-hint')", timeout=30000); pg.wait_for_timeout(800)
        print(label, 'room:', first, '->', pg.evaluate("(document.querySelector('.ct-head')||document.querySelector('#ct-out')).innerText.slice(0,40)"))
        # 記住上次
        pg.evaluate("document.querySelector('#mx').click()")
        pg.evaluate("document.querySelector('a[href*=\"str=classtable\"]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))")
        pg.wait_for_selector('.ct-head', timeout=30000)
        print(label, 'remembered:', pg.inner_text('.ct-head')[:30].replace('\n', ' '))
        print(label, 'new tabs:', len(ctx.pages) - before, 'errors:', errs)
        ctx.close()
    b.close()
