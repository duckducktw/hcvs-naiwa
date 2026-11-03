#!/usr/bin/env bash
# 把 hcvs.gdtw.qzz.io 從 CF Worker 移到 Vercel：加 Vercel 驗證 TXT、拆 Worker custom domain、建 CNAME(DNS only)
set -euo pipefail
set -a; . ~/.hermes/.env; . ~/.hermes/vercel.env; set +a
A=4271b53c3234ddb894b24f5e18e2e1de
CF=https://api.cloudflare.com/client/v4
H=(-H "Authorization: Bearer $CF_API_TOKEN" -H "content-type: application/json")
ZONE=$(curl -s "${H[@]}" "$CF/zones?name=gdtw.qzz.io" | python3 -c "import sys,json;print(json.load(sys.stdin)['result'][0]['id'])")
echo "zone ok"
echo "--- existing records for hcvs / _vercel:"
curl -s "${H[@]}" "$CF/zones/$ZONE/dns_records?per_page=500" | python3 -c "
import sys,json
for r in json.load(sys.stdin)['result']:
    if r['name'] in ('hcvs.gdtw.qzz.io','_vercel.gdtw.qzz.io'): print(r['id'],r['type'],r['name'],r['content'][:70],'proxied' if r.get('proxied') else 'dns-only')"
echo "--- worker custom domains:"
curl -s "${H[@]}" "$CF/accounts/$A/workers/domains" | python3 -c "
import sys,json
for d in json.load(sys.stdin)['result']:
    if d['hostname']=='hcvs.gdtw.qzz.io': print(d['id'],d['hostname'],d['service'])"
