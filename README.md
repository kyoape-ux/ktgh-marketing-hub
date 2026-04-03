# 光田綜合醫院｜行銷整合分析中心
**Kuang Tien General Hospital — Marketing Analytics Hub**

> 靜態網頁工具，部署於 GitHub Pages，無需後端伺服器

---

## 📁 專案結構

```
ktgh-marketing-hub/
├── kuangtien-marketing-hub.html   ← 主程式（單一 HTML 檔）
├── docs/
│   ├── ARCHITECTURE.md            ← 系統架構說明
│   ├── CI-COLORS.md               ← 光田 CI 色票規範
│   └── FEATURE-ROADMAP.md         ← 功能開發路線圖
├── scripts/
│   ├── apps-script-backend.gs     ← Google Apps Script 後端（待串接）
│   └── sheets-schema.md           ← Google Sheets 資料結構
└── assets/
    └── (圖片、icon 等靜態資源)
```

---

## 🚀 快速開始

### 本機預覽
直接用瀏覽器開啟 `kuangtien-marketing-hub.html` 即可。

### 部署至 GitHub Pages
```bash
git init
git add .
git commit -m "init: ktgh marketing hub"
git branch -M main
git remote add origin https://github.com/YOUR_ORG/ktgh-marketing-hub.git
git push -u origin main
# GitHub Pages → Settings → Pages → Source: main / root
```

---

## 🎨 設計規範

### CI 色票（官方）
| 名稱     | HEX       | 用途                     |
|----------|-----------|--------------------------|
| 深綠     | `#006341` | 側欄底色、主按鈕、品牌錨點 |
| 生命綠   | `#6EC300` | Active dot、高亮點綴      |
| 寬廣藍   | `#00AAC8` | 互動指標 KPI              |
| 寧靜靛   | `#14286E` | 備用（睡眠/骨科類別）      |
| 陽光黃   | `#FFB900` | 備用（活動/社區類別）      |
| 大地棕   | `#AA7D5F` | 備用（癌症/失智類別）      |

### 字體
| 用途       | 字體            | 來源              |
|------------|-----------------|-------------------|
| 中文介面   | Noto Sans TC    | Google Fonts      |
| 數字/英文  | Inter           | Google Fonts      |
| 程式碼     | 系統等寬字體    | system-ui fallback|

### CSS 主要變數（:root）
```css
--brand:      #006341;   /* 主色 */
--brand-light:#007D53;   /* hover */
--brand-bg:   #EAF5EE;   /* 淡底色 */
--brand-bd:   #B3D9C5;   /* 邊框 */
--ci-green:   #6EC300;   /* 生命綠 */
--ci-blue:    #00AAC8;   /* 寬廣藍 */
--bg:         #F3F9F6;   /* 頁面底色 */
--border:     #DDE8E3;   /* 邊框色 */
--text:       #1A2820;   /* 主文字 */
--text-sub:   #5A7A6A;   /* 次要文字 */
--text-muted: #90A89E;   /* 輔助文字 */
```

---

## 📊 現有功能（v1.0）

### ✅ 已完成
- [x] 側欄導覽（粉專追蹤 / 活動追蹤 / 媒體追蹤）
- [x] 總覽 Dashboard（KPI 卡、觸及趨勢長條圖、Donut 圓環圖）
- [x] 貼文成效列表（月份篩選、關鍵字搜尋、排序）
- [x] 組合分析（標題類型×圖片風格×觸及交叉矩陣）
- [x] SOP 建議模板（6種類型配方卡）
- [x] 活動/講座記錄（新增表單 + 列表）
- [x] 媒體曝光記錄（新增表單 + 列表）
- [x] 月報一鍵匯出（.txt 格式）
- [x] 資料持久化（localStorage）
- [x] 內建 2025/12 – 2026/03 真實貼文數據（91 篇）

### ⚠️ 模擬功能（未串接）
- [ ] FB Excel 匯入（UI 已完成，解析邏輯待實作）

---

## 🗺️ 開發路線圖

詳見 `docs/FEATURE-ROADMAP.md`

---

## 📋 資料結構

### 貼文物件 (Post)
```js
{
  date:   '2026-03-01',   // YYYY-MM-DD
  title:  '貼文標題',
  type:   '相片' | '影片',
  cat:    '案例類',        // 內容分類標籤
  reach:  13500,           // 觸及人數
  click:  5225,            // 總點擊次數
  engage: 347,             // 心情+留言+分享
  month:  '2026-03',      // 月份索引
  url:    'https://...'   // FB 永久連結
}
```

### 活動物件 (Event)
```js
{
  date:    '2026-03-11',
  name:    '活動名稱',
  type:    '健康講座',
  campus:  '向上院區',
  reg:     80,             // 報名人數
  attend:  65,             // 出席人數
  reach:   2616,           // FB 觸及
  sat:     4.5,            // 滿意度 1-5
  speaker: '廖志斌醫師',
  note:    '備註'
}
```

### 媒體物件 (Media)
```js
{
  date:    '2026-03-15',
  name:    '媒體名稱',
  type:    '網路媒體',
  section: '健康版',
  title:   '報導標題',
  nature:  '正面報導',
  reach:   50000,
  url:     'https://...',
  note:    '備註'
}
```

---

## 🔑 localStorage Key
```
ktgh_marketing_v1  →  { posts: [...], events: [...], media: [...] }
```
