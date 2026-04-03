# Claude Code 交接提示（直接貼給 Claude Code 使用）

---

## 專案背景

這是光田綜合醫院行銷部門的整合分析工具，已完成 Phase 1（靜態 HTML 工具）。
需要繼續開發 Phase 2：**FB Excel 真正匯入解析功能**。

## 當前狀態

- 主程式：`kuangtien-marketing-hub.html`（單一檔案，約 1,400 行）
- 框架：Vanilla HTML/CSS/JS，無任何 framework
- 字體：Noto Sans TC（中文）+ Inter（數字）
- 資料存在 `localStorage['ktgh_marketing_v1']`
- 目前「匯入貼文數據」頁面的上傳功能是模擬狀態（只顯示檔名，不做解析）

## 最優先任務：實作 FB Excel 解析

### 任務說明
在 `kuangtien-marketing-hub.html` 裡找到 `handleFileUpload(input)` 函式，
目前內容是假的（只顯示訊息），請把它改成真正解析 xlsx 的邏輯。

### 技術要求
1. 用 SheetJS 解析（CDN 已可使用：`https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`）
2. FB 後台匯出的 Excel 欄位對應（見下方）
3. 解析後顯示「預覽 modal」，讓使用者確認後再匯入
4. 寫入 `store.posts`，並呼叫 `saveStore()` 持久化
5. 重複貼文去除（用發佈時間+標題前20字做 key）
6. 完成後呼叫 `renderOverview()` 刷新畫面

### FB Excel 欄位對應表
```
FB 欄位名稱                    → store.posts 欄位
─────────────────────────────────────────────
標題                           → title（取前60字，fallback 用「說明」）
發佈時間                       → date（格式化為 YYYY-MM-DD）
貼文類型                       → type（「相片」/「影片」）
觸及人數                       → reach（parseInt，去千分位逗號）
總點擊次數                     → click
心情、留言和分享次數            → engage
心情數                         → （不一定要存，但可存）
留言                           → （不一定要存）
分享                           → （不一定要存）
永久連結                       → url
發佈時間（月份部分）            → month（格式 YYYY-MM）
```

### autoTag 規則（已存在，可直接呼叫）
在 `getBuiltinPosts()` 附近，新增這個函式並在解析時呼叫：
```javascript
function autoTag(title) {
  const t = title || '';
  if (/案例|醫師|手術|治療|病患|康復|重獲|感謝函/.test(t)) return '案例類';
  if (/元旦|春節|聖誕|母親節|感恩|節慶|寶寶|不老騎士/.test(t)) return '品牌/節慶';
  if (/榮總|中山附醫|醫學中心|名醫|聯名|合作/.test(t)) return '地位建立';
  if (/講座|活動|報名|現場|系列/.test(t)) return '活動/講座';
  if (/招募|護理師|徵才|加入|阿長/.test(t)) return '招募類';
  if (/偏鄉|志工|公益|梨山|搜救犬/.test(t)) return '公益類';
  return '衛教類';
}
```

### 預覽 modal UI 規格
- 顯示「將匯入 N 篇 / 略過 M 篇重複」
- 顯示前 5 筆預覽（標題、觸及、類型）
- 兩個按鈕：「確認匯入」和「取消」
- 樣式沿用現有 CSS 變數（--brand, --surface, --border 等）

---

## 其他待開發項目（按優先度）

1. **月份篩選狀態同步**：`sec-fb-overview` 和 `sec-fb-posts` 的月份篩選各自獨立，切換時應同步
2. **Chart.js 圖表**：把靜態長條圖換成互動式（已在 CDN allowlist）
3. **Google Sheets 串接**：見 `scripts/apps-script-backend.gs`

---

## 重要設計規範
- CI 主色 `#006341`（深綠），不得改動
- Active dot 顏色 `#6EC300`（生命綠）
- 無任何黑色按鈕
- 數字字型 Inter，中文 Noto Sans TC
- 所有圖示為 inline SVG，無 emoji
- 完整 CI 色票見 `docs/CI-COLORS.md`
