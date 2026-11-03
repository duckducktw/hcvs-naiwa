#!/usr/bin/env bash
set -euo pipefail
set -a; . ~/.hermes/.env; . ~/.hermes/vercel.env; set +a
A=4271b53c3234ddb894b24f5e18e2e1de
CF=https://api.cloudflare.com/client/v4
H=(-H "Authorization: Bearer $CF_API_TOKEN" -H "content-type: application/json")
V=(-H "Authorization: Bearer $VERCEL_TOKEN" -H "content-type: application/json")
ZONE=$(curl -s "${H[@]}" "$CF/zones?name=gdtw.qzz.io" | python3 -c "import sys,json;print(json.load(sys.stdin)['result'][0]['id'])")
ok(){ python3 -c "import sys,json;d=json.load(sys.stdin);print('$1', d.get('success', d))"; }

# 1) Vercel 驗證 TXT
curl -s "${H[@]}" -X POST "$CF/zones/$ZONE/dns_records" -d '{"type":"TXT","name":"_vercel","content":"\"vc-domain-verify=hcvs.gdtw.qzz.io,dd4c2aad6d69cdee6fae\"","ttl":60}' | ok "TXT add"
sleep 15
# 2) Vercel 驗證
curl -s "${V[@]}" -X POST "https://api.vercel.com/v9/projects/hcvs-naiwa/domains/hcvs.gdtw.qzz.io/verify" | python3 -c "import sys,json;d=json.load(sys.stdin);print('verify', d.get('verified'), (d.get('error') or {}).get('message',''))"
# 3) 拆 CF Worker custom domain（會一併移除它自動建的 AAAA 100::）
curl -s "${H[@]}" -X DELETE "$CF/accounts/$A/workers/domains/7834ecaef7e1f0bdebcf6164071a11a642a42712" -o /dev/null -w "worker domain delete %{http_code}\n"
sleep 3
# 殘留 AAAA 保險清掉
for id in $(curl -s "${H[@]}" "$CF/zones/$ZONE/dns_records?name=hcvs.gdtw.qzz.io" | python3 -c "import sys,json;print(' '.join(r['id'] for r in json.load(sys.stdin)['result']))"); do
  curl -s "${H[@]}" -X DELETE "$CF/zones/$ZONE/dns_records/$id" | ok "leftover delete"
done
# 4) CNAME → Vercel（DNS only，讓 Vercel 簽憑證）
curl -s "${H[@]}" -X POST "$CF/zones/$ZONE/dns_records" -d '{"type":"CNAME","name":"hcvs","content":"cname.vercel-dns.com","proxied":false,"ttl":60}' | ok "CNAME add"
