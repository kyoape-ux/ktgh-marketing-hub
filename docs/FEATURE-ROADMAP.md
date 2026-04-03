# 功能開發路線圖

## Phase 1 — 靜態工具（✅ 已完成）

| 功能 | 狀態 | 說明 |
|------|------|------|
| Dashboard KPI 總覽 | ✅ | 觸及、互動、篇數、平均觸及 |
| 月份篩選切換 | ✅ | 全部 / 3月 / 2月 / 1月 / 12月 |
| 觸及趨勢長條圖 | ✅ | 4個月比較 |
| 貼文類型圓環圖 | ✅ | 相片 vs 影片 |
| 亮點貼文 Top 10 | ✅ | 依觸及排序，含互動率 |
| 內容類型分析 | ✅ | 平均觸及 + 組合強度 |
| 組合配方矩陣 | ✅ | 類別×類型×觸及交叉 |
| SOP 模板卡 | ✅ | 6種類型配方 |
| 貼文列表 + 搜尋 | ✅ | 關鍵字篩選 |
| 活動記錄表單 | ✅ | 新增 + 列表 + 出席率計算 |
| 媒體曝光表單 | ✅ | 新增 + 列表 |
| 月報匯出 | ✅ | .txt 格式下載 |
| localStorage 持久化 | ✅ | |
| CI 配色套用 | ✅ | 深綠 #006341 + 生命綠 #6EC300 |
| SVG 單色圖示 | ✅ | 無 emoji，全 inline SVG |
| Inter 數字字型 | ✅ | |

---

## Phase 2 — 資料串接（🔲 待開發優先）

### P2-1: FB Excel 自動解析（最高優先）
**目標**：拖拉 FB 後台 Excel → 自動解析填入資料庫

**開發項目**：
- [ ] 在前端用 `SheetJS (xlsx.js)` 解析上傳的 .xlsx
- [ ] 欄位自動識別（處理 FB 的欄位名稱多語言問題）
- [ ] 數值清洗（千分位逗號、日期格式統一）
- [ ] 解析後寫入 localStorage store
- [ ] 顯示解析預覽 modal（讓使用者確認後再匯入）
- [ ] 重複貼文去除（以貼文編號做 unique key）

**技術**：SheetJS 已在 HTML 引用清單中，直接使用
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
```

**解析邏輯骨架**：
```javascript
async function parseExcel(file) {
  const buf = await file.arrayBuffer();
  const wb  = XLSX.read(buf, { type: 'array', cellDates: true });
  const ws  = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  
  return rows
    .filter(r => r['觸及人數'] > 0)
    .map(r => ({
      date:   formatDate(r['發佈時間']),
      title:  (r['標題'] || r['說明'] || '').slice(0, 60),
      type:   r['貼文類型'] || '相片',
      reach:  cleanNum(r['觸及人數']),
      click:  cleanNum(r['總點擊次數']),
      engage: cleanNum(r['心情、留言和分享次數']),
      month:  toMonthKey(r['發佈時間']),
      url:    r['永久連結'] || '',
      cat:    autoTag(r['標題'] || r['說明'] || '')
    }));
}

function cleanNum(v) {
  return parseInt(String(v).replace(/,/g, '')) || 0;
}
```

---

### P2-2: 自動內容標籤（AI）
**目標**：上傳後自動判斷貼文類別

**方案 A（免費，瀏覽器端規則）**：
```javascript
function autoTag(title) {
  if (/案例|醫師|手術|治療|病患|康復|重獲/.test(title)) return '案例類';
  if (/元旦|春節|聖誕|母親節|感恩|節慶/.test(title)) return '品牌/節慶';
  if (/榮總|中山附醫|醫學中心|名醫/.test(title)) return '地位建立';
  if (/講座|活動|報名|現場/.test(title)) return '活動/講座';
  if (/招募|護理師|徵才|加入/.test(title)) return '招募類';
  if (/偏鄉|志工|公益|梨山/.test(title)) return '公益類';
  return '衛教類';
}
```

**方案 B（Gemini API，更精準）**：
見 `scripts/apps-script-backend.gs`

---

### P2-3: Google Sheets 雙向同步（進階）
**目標**：資料存在 Sheets，多人共用

- [ ] GAS Web App 建立（見 `scripts/apps-script-backend.gs`）
- [ ] 前端改為 fetch GAS API 取資料
- [ ] 寫入也透過 GAS API
- [ ] 離線 fallback 到 localStorage

---

## Phase 3 — 報表升級（🔲 未來）

| 功能 | 說明 |
|------|------|
| Chart.js 圖表 | 把靜態長條圖換成動態互動圖表 |
| 週報產生器 | LINE 風格 + 正式版兩種格式 |
| 跨月趨勢線 | 滾動 12 個月觸及趨勢 |
| 最佳發文時段 | 依發佈時間分析互動率 |
| 標籤雲 | 高觸及貼文關鍵字分佈 |
| PDF 月報匯出 | 取代現有 .txt |
| LINE Notify 自動通知 | 月報摘要自動推送 |

---

## 已知問題 / 技術債

| 問題 | 優先 | 說明 |
|------|------|------|
| 月份篩選按鈕 in 貼文列表 與 Overview 獨立狀態 | 低 | 切換 section 後狀態不同步 |
| localStorage 上限 5MB | 中 | 大量資料需改用 IndexedDB 或 Sheets |
| 匯入 Excel 功能為模擬狀態 | 高 | P2-1 要解決 |
| 無驗證/登入機制 | 低 | 院內網路使用可暫不處理 |
| 月報匯出格式為 .txt | 低 | Phase 3 改 PDF |
