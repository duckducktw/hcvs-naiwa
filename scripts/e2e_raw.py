import sys
from playwright.sync_api import sync_playwright
BASE=sys.argv[1]
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context();pg=ctx.new_page()
    pg.goto(BASE+'/?t=raw',wait_until='load');pg.click('#agree')
    pg.wait_for_selector('#nbody td.t a',timeout=30000)
    pg.locator('#nbody td.t a').first.click();pg.wait_for_selector('#mb .art',timeout=30000)
    print('modal opened, tabs',len(ctx.pages))
    with ctx.expect_page(timeout=10000) as np:
        pg.locator('.art-foot a').click()
    n=np.value;n.wait_for_load_state('domcontentloaded')
    print('raw link opened new tab:',n.url[:90])
    print('modal still on:',pg.locator('#modal.on').count())
    print('school name:',pg.inner_text('.brand b'))
    pg.click('#mx');pg.click('#corner',force=True);pg.wait_for_timeout(300);print('corner:',pg.inner_text('#cbub'))
    b.close()
