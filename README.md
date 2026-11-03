# 新竹高工官網 · 奶龍雷霆重製（非官方）

> 此網頁非官方，純玩梗，所有內容請以[學校官網](https://www.hcvs.hc.edu.tw/home)爲準，本平臺不負任何責任。

外觀致敬「奶龍大學」，功能對應新竹高工官網：選單、快速入口、單位、焦點專區、消息公佈欄（搜尋／單位／類別／排序／分頁）。資料即時接學校 ischool 公開 API。

## 結構
- `public/index.html`：前端（由 `scripts/build_page.py` 產生）
- `api/[route].js`：Vercel serverless 代理（官方 API 無 CORS）
  - `/api/news` 公佈欄、`/api/tab` 焦點分頁、`/api/tabc` 分頁內文、`/api/carousel` 輪播
  - `/api/show?nid=` 公告內文（擷取 `show.php` 的標題／發佈資訊／附件／內文，前端站內原生顯示）
- `lib/units.js`：公佈欄單位清單

## 本機
```bash
node scripts/dev.mjs          # http://127.0.0.1:8787
python3 scripts/e2e.py        # Playwright 驗收
```

頁面設 noindex。奶龍圖片版權屬原作者，僅供玩梗。
