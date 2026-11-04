"""Google Search Console 上線：Site Verification（META 法）→ 新增資源 → 提交 sitemap。
用法：
  python3 gsc_setup.py token     # 取得驗證 meta 內容，寫到 /tmp/naiwa/gsc_meta.txt
  python3 gsc_setup.py verify    # 驗證 + 加入 Search Console + 提交 sitemap + 查狀態
"""
import json, sys, urllib.request, urllib.parse, urllib.error
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

SITE = 'https://hcvs.gdtw.qzz.io/'
SITEMAP = SITE + 'sitemap.xml'
c = Credentials.from_authorized_user_file('/home/user/.hermes/google_token.json')
if not c.valid:
    c.refresh(Request())


def call(method, url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        'Authorization': 'Bearer ' + c.token, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            t = r.read().decode()
            return r.status, (json.loads(t) if t.strip() else {})
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:400]


enc = urllib.parse.quote(SITE, safe='')
if sys.argv[1] == 'token':
    st, d = call('POST', 'https://www.googleapis.com/siteVerification/v1/token',
                 {'site': {'type': 'SITE', 'identifier': SITE}, 'verificationMethod': 'META'})
    print('token', st)
    if st == 200:
        open('/tmp/naiwa/gsc_meta.txt', 'w').write(d['token'])
        print('meta saved')
    else:
        print(d)
elif sys.argv[1] == 'verify':
    st, d = call('POST', 'https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=META',
                 {'site': {'type': 'SITE', 'identifier': SITE}})
    print('verify', st, d if st != 200 else d.get('site'))
    st, d = call('PUT', f'https://www.googleapis.com/webmasters/v3/sites/{enc}')
    print('add site', st, d if st not in (200, 204) else '')
    st, d = call('PUT', f'https://www.googleapis.com/webmasters/v3/sites/{enc}/sitemaps/' + urllib.parse.quote(SITEMAP, safe=''))
    print('sitemap submit', st, d if st not in (200, 204) else '')
    st, d = call('GET', 'https://www.googleapis.com/webmasters/v3/sites')
    print('sites', [(x['siteUrl'], x['permissionLevel']) for x in d.get('siteEntry', [])] if st == 200 else d)
    st, d = call('GET', f'https://www.googleapis.com/webmasters/v3/sites/{enc}/sitemaps')
    print('sitemaps', st, json.dumps(d, ensure_ascii=False)[:500])
    st, d = call('POST', 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
                 {'inspectionUrl': SITE, 'siteUrl': SITE, 'languageCode': 'zh-TW'})
    if st == 200:
        r = d['inspectionResult']['indexStatusResult']
        print('inspect', {k: r.get(k) for k in ('verdict', 'coverageState', 'robotsTxtState', 'indexingState', 'pageFetchState', 'lastCrawlTime')})
    else:
        print('inspect', st, d)
