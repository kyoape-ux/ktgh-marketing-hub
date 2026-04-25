# 光田綜合醫院｜開發規範（全域）

> 這份規範適用於 kyoape-ux 底下所有工具網站。
> 每次開始新專案前請確認已讀取本檔，並在 repo 內放置專案層 CLAUDE.md。

---

## 身份背景

這是光田綜合醫院行銷部門的內部工具生態系，所有工具皆為：
- 純前端靜態網頁（HTML + CSS + Vanilla JS）
- 部署在 GitHub Pages（`kyoape-ux.github.io`）
- 無後端伺服器，資料儲存用 `localStorage` 或 Google Sheets（透過 GAS）
- 使用者為醫院內部人員，非公開對外服務

---

## CI 色票（絕對遵守）

| 名稱     | HEX       | 用途                          |
|----------|-----------|-------------------------------|
| 深綠     | `#006341` | 側欄底色、主按鈕、品牌錨點    |
| 生命綠   | `#6EC300` | Active 點綴、高亮             |
| 寬廣藍   | `#00AAC8` | KPI 互動指標、連結色          |
| 寧靜靛   | `#14286E` | 備用（睡眠/骨科類別）         |
| 陽光黃   | `#FFB900` | 備用（活動/社區/中醫類別）    |
| 大地棕   | `#AA7D5F` | 備用（癌症/失智/骨鬆類別）    |
| 降飽和紅 | `#C0313D` | 醫美中心                      |

**禁用**：純黑按鈕、純紫色系、高飽和螢光色。

---

## CSS 標準變數（每個新專案的 `:root` 必須包含）

```css
:root {
  --brand:       #006341;
  --brand-light: #007D53;
  --brand-bg:    #EAF5EE;
  --brand-bd:    #B3D9C5;
  --ci-green:    #6EC300;
  --ci-blue:     #00AAC8;
  --bg:          #F3F9F6;
  --border:      #DDE8E3;
  --text:        #1A2820;
  --text-sub:    #5A7A6A;
  --text-muted:  #90A89E;
}
```

---

## 字體

| 用途       | 字體          | 載入方式              |
|------------|---------------|-----------------------|
| 中文介面   | Noto Sans TC  | Google Fonts          |
| 數字/英文  | Inter         | Google Fonts          |
| 程式碼區塊 | 系統等寬      | system-ui fallback    |

Google Fonts 載入範本：
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
```

---

## 技術堆疊規範

### 必須遵守
- **純 Vanilla JS**，不引入 React / Vue / Angular
- **無打包工具**（無 Webpack / Vite）；可直接在瀏覽器開啟 `.html`
- **CSS 變數驅動**主題，不用 inline style 覆蓋色彩
- **localStorage** key 格式：`ktgh_{工具縮寫}_v{版本號}`（例：`ktgh_pm_v1`）

### 可使用的外部 CDN 函式庫
- Chart.js（圖表）
- SheetJS / xlsx（Excel 讀寫）
- html2canvas（截圖匯出）
- jsPDF（PDF 匯出）
- Google Fonts（字體）

### 禁止
- 不引入 jQuery（原生 JS 就夠）
- 不使用 `eval()`
- 不把 API 金鑰硬寫在前端 JS 中

---

## 專案檔案結構（標準樣板）

```
{repo-name}/
├── index.html          ← 主程式（單一 HTML，CSS/JS 內嵌或分離皆可）
├── CLAUDE.md           ← 本專案規範（從模板複製後修改）
├── README.md           ← 給 GitHub 看的說明
├── docs/
│   ├── ARCHITECTURE.md ← 系統架構說明
│   └── ROADMAP.md      ← 功能開發路線圖
├── assets/
│   ├── icons/
│   └── images/
└── scripts/            ← 若有 GAS 或獨立 JS
    └── apps-script.gs
```

---

## 命名規則

| 對象         | 規則                          | 範例                        |
|--------------|-------------------------------|-----------------------------|
| GitHub repo  | `kebab-case`，以功能命名      | `kuangtien-poster-generator` |
| HTML id      | `kebab-case`                  | `#section-overview`         |
| JS 變數      | `camelCase`                   | `postList`, `renderChart`   |
| CSS class    | `kebab-case`                  | `.card-header`, `.btn-primary` |
| localStorage | `ktgh_{tool}_v{n}`            | `ktgh_youtube_v1`           |
| 版本標示     | 頁面右下角顯示 `v{major}.{minor}` | `v1.2`                  |

---

## Icon 規範（絕對遵守）

### 規則
- **一律使用單色 SVG**，禁止使用彩色 icon、PNG icon、emoji 當 icon
- **Inline SVG**（直接寫在 HTML 中），不用 `<img src="icon.png">`，才能用 CSS 控制顏色
- **顏色使用 `currentColor`**，讓父層 `color` 屬性自動繼承，不在 SVG 內寫死色碼
- **線條風格（stroke）為主**，`fill="none" stroke="currentColor"`，不用純填色風格
- **推薦來源**：Lucide Icons（https://lucide.dev）— 複製 SVG 原始碼 inline 使用

### 標準尺寸

| 使用情境         | 尺寸        | 屬性                          |
|------------------|-------------|-------------------------------|
| 側欄導覽項目     | 18×18px     | `width="18" height="18"`      |
| 卡片標題旁       | 20×20px     | `width="20" height="20"`      |
| 按鈕內           | 16×16px     | `width="16" height="16"`      |
| 頁面大標題旁     | 24×24px     | `width="24" height="24"`      |
| KPI 卡數字旁     | 32×32px     | `width="32" height="32"`      |

### 標準寫法範例
```html
<!-- ✅ 正確：inline SVG + currentColor -->
<svg width="20" height="20" viewBox="0 0 24 24"
     fill="none" stroke="currentColor"
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
</svg>

<!-- ❌ 禁止：img 引入 / emoji / 色碼硬寫 -->
<img src="icon.png">
📊
<svg><path fill="#006341" .../></svg>
```

### CSS 讓 icon 與文字對齊
```css
.icon { display: inline-block; vertical-align: middle; flex-shrink: 0; }
```

---

## UI 元件慣例

### 卡片（Card）— 四種規格

#### 1. 基礎卡片（通用）
```css
.card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
```

#### 2. KPI 數字卡（Dashboard 指標）
```html
<div class="card kpi-card">
  <div class="kpi-header">
    <!-- 單色 SVG icon (32px) -->
    <span class="kpi-label">觸及人數</span>
  </div>
  <div class="kpi-value">12,450</div>
  <div class="kpi-delta positive">↑ 8.3% 較上月</div>
</div>
```
```css
.kpi-card        { padding: 20px 24px; min-width: 160px; }
.kpi-header      { display: flex; align-items: center; gap: 8px;
                   color: var(--text-sub); font-size: 13px; margin-bottom: 8px; }
.kpi-value       { font-size: 28px; font-weight: 700; font-family: 'Inter', sans-serif;
                   color: var(--text); line-height: 1.2; }
.kpi-delta       { font-size: 12px; margin-top: 4px; }
.kpi-delta.positive { color: #16a34a; }
.kpi-delta.negative { color: #dc2626; }
.kpi-delta.neutral  { color: var(--text-muted); }
```

#### 3. 列表卡片（有標題列 + 內容區）
```html
<div class="card list-card">
  <div class="card-header">
    <!-- SVG icon (20px) -->
    <h3 class="card-title">貼文列表</h3>
    <div class="card-actions"><!-- 按鈕區 --></div>
  </div>
  <div class="card-body"><!-- 內容 --></div>
</div>
```
```css
.card-header  { display: flex; align-items: center; gap: 8px;
                margin-bottom: 16px; padding-bottom: 12px;
                border-bottom: 1px solid var(--border); }
.card-title   { font-size: 15px; font-weight: 600; color: var(--text);
                margin: 0; flex: 1; }
.card-actions { display: flex; gap: 8px; margin-left: auto; }
```

#### 4. 狀態強調卡（左側帶色邊框）
```css
.card.accent-green  { border-left: 4px solid var(--ci-green); }
.card.accent-blue   { border-left: 4px solid var(--ci-blue); }
.card.accent-yellow { border-left: 4px solid #FFB900; }
.card.accent-red    { border-left: 4px solid #C0313D; }
```

### 主按鈕
```css
.btn-primary {
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;       /* icon + 文字間距 */
}
.btn-primary:hover { background: var(--brand-light); }
```

### 次要按鈕
```css
.btn-secondary {
  background: var(--brand-bg);
  color: var(--brand);
  border: 1px solid var(--brand-bd);
  border-radius: 8px;
  padding: 9px 20px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn-secondary:hover { background: var(--brand-bd); }
```

### 側欄導覽
- 底色：`var(--brand)`（深綠）
- Active 項目：左側 3px 生命綠實線 + 文字白色加粗
- 寬度：220–240px，固定不隨內容捲動
- 每個導覽項目：icon (18px) + 文字，`gap: 10px`

---

## 行銷分析用詞規範（統一標準）

> 以下為所有工具的 UI 標籤、JS 變數、欄位名稱的唯一標準。
> 不可自行使用同義詞（例如不能用「到達人數」代替「觸及人數」）。

### Facebook 貼文指標

| 標準中文顯示 | JS 變數名   | 說明                              | 單位 |
|--------------|-------------|-----------------------------------|------|
| 觸及人數     | `reach`     | 看到貼文的不重複用戶數            | 人   |
| 總點擊次數   | `click`     | 所有點擊行為（含圖片、連結、更多）| 次   |
| 互動次數     | `engage`    | 心情 + 留言 + 分享 的總和         | 次   |
| 心情數       | `likes`     | 按讚 + 愛心 + 哈 + 哇 + 嗚 + 怒  | 次   |
| 留言數       | `comments`  | 貼文留言次數                      | 則   |
| 分享數       | `shares`    | 分享貼文次數                      | 次   |
| 互動率       | `engageRate`| `engage / reach × 100`            | %    |
| 點擊率       | `ctr`       | `click / reach × 100`             | %    |

### 貼文分類

| 標準中文顯示 | JS 變數值          | 說明                  |
|--------------|--------------------|-----------------------|
| 貼文類型     | `post.type`        | `相片` 或 `影片`      |
| 內容分類     | `post.cat`         | 見下方分類表          |
| 標題類型     | `post.titleType`   | 問句式/數據式/情境式/公告式 |
| 圖片風格     | `post.imgType`     | 醫師個人照/病患情境/節慶場景/資訊圖解/活動現場 |
| 內容強度     | `post.strength`    | `高` / `中` / `低`    |

### 內容分類（`post.cat`）標準選項

| 顯示名稱   | 值           |
|------------|--------------|
| 案例類     | `案例類`     |
| 衛教類     | `衛教類`     |
| 品牌/節慶  | `品牌/節慶`  |
| 地位建立   | `地位建立`   |
| 活動/講座  | `活動/講座`  |
| 影片類     | `影片類`     |
| 招募類     | `招募類`     |
| 公益類     | `公益類`     |
| 待優化     | `待優化`     |

### Google Analytics 4 指標

| 標準中文顯示   | JS 變數名        | GA4 對應事件/維度        |
|----------------|------------------|--------------------------|
| 活躍使用者     | `activeUsers`    | `active_users`           |
| 新使用者       | `newUsers`       | `new_users`              |
| 新使用者占比   | `newUserRate`    | `new_users / active_users` |
| 工作階段數     | `sessions`       | `sessions`               |
| 頁面瀏覽數     | `pageViews`      | `screen_page_views`      |
| 平均互動時間   | `avgEngageTime`  | `user_engagement_duration / active_users` |
| 流量來源       | `sourceUsers`    | `session_source / medium` |

### 流量來源標準標籤

| 顯示名稱       | 對應來源值           |
|----------------|----------------------|
| Google 自然流量 | `google/自然流量`   |
| 直接流量        | `直接流量`          |
| Facebook 貼文   | `FB/post`           |
| Facebook 導入   | `FB/導入流量`       |
| Yahoo 自然流量  | `yahoo/自然流量`    |
| Yahoo 導入流量  | `yahoo/導入流量`    |
| Bing 自然流量   | `bing/自然流量`     |

### 活動記錄指標

| 標準中文顯示 | JS 變數名   | 說明              |
|--------------|-------------|-------------------|
| 報名人數     | `reg`       | 活動報名人數      |
| 出席人數     | `attend`    | 實際出席人數      |
| 出席率       | `attendRate`| `attend / reg × 100` |
| 滿意度       | `sat`       | 1–5 分制          |
| 觸及人數     | `reach`     | 活動相關FB觸及    |

### 媒體曝光指標

| 標準中文顯示 | JS 變數名   | 說明                           |
|--------------|-------------|--------------------------------|
| 媒體名稱     | `mediaName` | 媒體機構名稱                   |
| 媒體類型     | `mediaType` | 電視/報紙/雜誌/網路媒體/廣播   |
| 報導版面     | `section`   | 健康版/頭版/社會版 等          |
| 報導性質     | `nature`    | 正面報導/中性報導/業配置入     |
| 預估觸及     | `reach`     | 該媒體預估觸及讀者數           |

### 月報相關

| 標準中文顯示   | 說明                      |
|----------------|---------------------------|
| 月報           | 每月成效彙整報告          |
| 觀察期         | 本次分析的時間範圍（月份）|
| 最佳貼文       | 當月觸及最高的 TOP 3 貼文 |
| 建議優化方向   | 下月行動建議              |

---

## 頁面標準 `<head>`

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{工具名稱}｜光田綜合醫院</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
  <!-- 其他 CDN -->
</head>
```

---

## 功能開發原則

1. **先完成核心功能**，再做匯出、動畫等錦上添花功能
2. **localStorage 資料結構**定義在頂部常數，方便未來升版遷移
3. **匯出功能**優先支援 `.txt` 月報，再考慮 Excel / PDF
4. **無網路可用**：工具必須能在無網路環境下運作（CDN 除外）
5. **響應式**：至少支援 1280px 以上桌機，不強求手機版

---

## 各工具清單（持續更新）

| 工具名稱           | GitHub Pages URL                                      | Repo                              |
|--------------------|-------------------------------------------------------|-----------------------------------|
| 視覺多媒體設計工具站 | https://kyoape-ux.github.io/                          | kyoape-ux/kyoape-ux.github.io     |
| 美編小助手          | https://kyoape-ux.github.io/kuangtien-poster-generator/ | kuangtien-poster-generator      |
| 影音小助手          | https://kyoape-ux.github.io/media-toolkit.html        | （待確認 repo）                   |
| 工作進度控管系統    | https://kyoape-ux.github.io/kuangtien-pm/             | kuangtien-pm                      |
| 影片發布資訊管理    | https://kyoape-ux.github.io/youtube-manager.html      | （待確認 repo）                   |
| 行銷整合分析中心    | https://kyoape-ux.github.io/ktgh-marketing-hub/       | ktgh-marketing-hub                |
