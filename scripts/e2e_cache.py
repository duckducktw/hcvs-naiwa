import sys, time
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8787'


def run(pg, label):
    calls = []
    h = lambda r: calls.append(r.url.split('/api/')[1][:50]) if '/api/' in r.url else None
    pg.on('request', h)
    t = time.time()
    pg.goto(BASE + '/?t=c', wait_until='domcontentloaded')
    if pg.locator('#gate .btn-y').is_visible():
        pg.click('#gate .btn-y')
    pg.wait_for_selector('#nbody tr td.d', timeout=30000)
    t_news = time.time() - t
    # 公告內文
    pg.evaluate("openNews(24742,'t','https://www.hcvs.hc.edu.tw/ischool/public/news_view/show.php?nid=24742')")
    pg.wait_for_selector('#mb .art', timeout=30000); pg.evaluate("document.querySelector('#mx').click()")
    # 單位頁
    pg.evaluate("openPage(2,3,'t','x')")
    pg.wait_for_selector('#mb .pp', timeout=30000); pg.evaluate("document.querySelector('#mx').click()")
    # PDF
    pg.evaluate("openFile('https://www.hcvs.hc.edu.tw/ischool/news/attached/24730/1150007582.pdf','pdf')")
    pg.wait_for_selector('.pdfv iframe', timeout=30000); pg.evaluate("document.querySelector('#mx').click()")
    # 課表
    pg.evaluate("openClassTable('x')")
    pg.wait_for_function("()=>document.querySelectorAll('#ct-g option').length>0", timeout=30000)
    pg.select_option('#ct-g', '資訊科'); pg.select_option('#ct-q', 'G11')
    pg.wait_for_selector('.ct-head', timeout=30000); pg.evaluate("document.querySelector('#mx').click()")
    total = time.time() - t
    pg.remove_listener('request', h)
    print(f'{label}: 公告列表 {t_news:.2f}s, 全流程 {total:.2f}s, API 請求 {len(calls)} 次', calls[:12])


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    run(pg, '第一次（冷）')
    run(pg, '第二次（快取）')
    keys = pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('hcvs-naiwa-c1:')).length")
    files = pg.evaluate("caches.open('hcvs-naiwa-files').then(c=>c.keys()).then(k=>k.length)")
    print('localStorage 快取筆數', keys, '| 檔案快取', files, '| errors', errs)
    # 過期 → 先回舊資料、背景更新
    pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('hcvs-naiwa-c1:/api/news')).forEach(k=>{const v=JSON.parse(localStorage.getItem(k));v.t-=3600e3;localStorage.setItem(k,JSON.stringify(v))})")
    calls = []
    pg.on('request', lambda r: calls.append(r.url) if '/api/news' in r.url else None)
    t = time.time(); pg.reload(wait_until='domcontentloaded'); pg.wait_for_selector('#nbody tr td.d', timeout=30000)
    print(f'過期快取：{time.time()-t:.2f}s 就顯示，背景更新請求 {len(calls)} 次')
    b.close()
