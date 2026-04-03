# 系統架構說明

## 技術堆疊

```
前端（已完成）               後端（待開發）
──────────────────           ──────────────────────────
HTML + CSS + Vanilla JS      Google Apps Script (GAS)
單一 .html 靜態檔案           部署為 Web App
GitHub Pages 託管             串接 Google Sheets 資料庫
localStorage 本地儲存          Gemini API 免費版 AI 分析
```

## 當前架構（Phase 1）

```
使用者瀏覽器
    │
    ├── kuangtien-marketing-hub.html
    │       ├── CSS（:root 變數 + component styles）
    │       ├── HTML（側欄 + 主內容區 6 個 section）
    │       └── JavaScript
    │               ├── store（資料層，讀寫 localStorage）
    │               ├── render 函式（renderOverview / renderPostsList / ...）
    │               ├── navigation（switchSection）
    │               └── export（exportReport → .txt 下載）
    │
    └── localStorage['ktgh_marketing_v1']
            ├── posts[]    ← 91 篇內建 + 匯入新增
            ├── events[]   ← 活動記錄
            └── media[]    ← 媒體曝光
```

## 目標架構（Phase 2，待開發）

```
Facebook 後台
    │
    │ 手動匯出 Excel/CSV
    ▼
Google Drive（上傳區）
    │
    │ trigger（每次上傳觸發）
    ▼
Google Apps Script (Web App)
    ├── parseFBExcel()       ← 解析 FB 匯出格式
    ├── cleanData()          ← 清洗千分位、日期格式
    ├── tagContent()         ← 呼叫 Gemini API 自動標籤
    ├── writeToSheets()      ← 寫入 Google Sheets
    └── notifyLine()         ← LINE Notify 通知（可選）
    │
    ▼
Google Sheets（資料庫）
    ├── raw_posts            ← FB 原始資料
    ├── processed_posts      ← 清洗後 + 標籤
    ├── events               ← 活動記錄
    ├── media                ← 媒體曝光
    └── monthly_summary      ← 月度彙整
    │
    ▼
前端 HTML（透過 fetch 讀取 GAS API）
    └── kuangtien-marketing-hub.html
```

## 關鍵技術細節

### FB Excel 欄位對應
FB 後台匯出的欄位名稱：
```
標題           → post.title
發佈時間        → post.date
貼文類型        → post.type  (相片/影片)
觸及人數        → post.reach
總點擊次數      → post.click
心情、留言和分享次數 → post.engage
心情數          → post.likes
留言            → post.comments
分享            → post.shares
永久連結        → post.url
```

### Gemini API 自動標籤 Prompt 範本
```
你是醫院社群行銷專家，請分析以下貼文標題並以 JSON 輸出：
{
  "cat": "案例類|衛教類|品牌/節慶|地位建立|招募類|活動/講座|公益類",
  "title_type": "問句式|數據式|情境式|公告式",
  "img_type": "醫師個人照|病患情境|節慶場景|資訊圖解|活動現場",
  "strength": "高|中|低"
}
貼文標題：{title}
```

### CORS 處理（GAS Web App）
```javascript
// Apps Script 需加這段才能讓前端 fetch
function doGet(e) {
  const result = getData(e.parameter);
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
```
