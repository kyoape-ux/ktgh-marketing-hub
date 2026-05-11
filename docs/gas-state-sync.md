# 完整資料雲端同步 — GAS 設定指南

讓**所有電腦透過 Google Drive 共用全部資料**（GA4 月度、SEO 文章、GSC 關鍵字、影片、門診表、OKR、待辦…）。一次設定，永久使用。

---

## 為什麼用 Drive 檔案而非 Sheets 儲存格

| 方案 | 容量上限 | 適合 |
|---|---|---|
| Sheets 儲存格 | 50 KB | ❌ GA4 月度資料就超過 |
| Drive JSON 檔 | 數 MB（實際無上限） | ✅ 完整資料同步 |
| Apps Script Properties | 9 KB / 屬性 | ❌ 太小 |

---

## 設定步驟（5 分鐘）

### 步驟 1：打開你現有的 GAS 專案

1. 進入 https://script.google.com
2. 找到你已部署的 GAS 專案（就是行銷中心「設定」頁填的 URL 對應的那一個）
3. 開啟 `Code.gs`

### 步驟 2：把下面的程式碼貼到 `Code.gs` 最下方

```javascript
// ═══════════════════════════════════════════
// 完整 state 雲端同步 (KTGH Marketing Hub)
// ═══════════════════════════════════════════

const STATE_FILE_NAME = 'ktgh_marketing_state.json';
const STATE_FOLDER_NAME = 'KTGH Marketing State';

// 取得或建立資料夾
function _getOrCreateStateFolder() {
  const folders = DriveApp.getFoldersByName(STATE_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(STATE_FOLDER_NAME);
}

// 取得 state 檔案（沒有則回傳 null）
function _getStateFile() {
  const folder = _getOrCreateStateFolder();
  const files = folder.getFilesByName(STATE_FILE_NAME);
  return files.hasNext() ? files.next() : null;
}

// loadState: 讀取 Drive 上的 JSON
function _action_loadState() {
  const file = _getStateFile();
  if (!file) return { ok: true, data: null };
  try {
    const json = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
    return { ok: true, data: json };
  } catch (err) {
    return { ok: false, error: '讀取失敗：' + err.message };
  }
}

// saveState: 寫入 Drive
// 接收 POST body 的 JSON 字串
function _action_saveState(e) {
  if (!e.postData || !e.postData.contents) {
    return { ok: false, error: '缺少 POST body' };
  }
  const folder = _getOrCreateStateFolder();
  const file = _getStateFile();
  if (file) {
    file.setContent(e.postData.contents);
  } else {
    folder.createFile(STATE_FILE_NAME, e.postData.contents, 'application/json');
  }
  return { ok: true };
}
```

### 步驟 3：修改 `doGet(e)` 和 `doPost(e)` 加入路由

找到你現有的 `doGet(e)` 函式（如果沒有就建立），確保它能處理 `loadState` 和 `saveState` action。範例：

```javascript
function doGet(e) {
  const action = (e.parameter || {}).action;
  try {
    if (action === 'loadState') {
      return _jsonResponse(_action_loadState());
    }
    // ... 你現有的其他 action ...
  } catch (err) {
    return _jsonResponse({ ok: false, error: err.message });
  }
}

function doPost(e) {
  const action = (e.parameter || {}).action;
  try {
    if (action === 'saveState') {
      return _jsonResponse(_action_saveState(e));
    }
    // ... 你現有的其他 POST action ...
  } catch (err) {
    return _jsonResponse({ ok: false, error: err.message });
  }
}

function _jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

> 如果你的 `doGet` / `doPost` 已經有現成的 router，把 `loadState` / `saveState` 對應加到 if-else 鏈裡即可。

### 步驟 4：重新部署為 Web App

1. GAS 編輯器右上角點「**部署**」→「**管理部署作業**」
2. 點當前部署的鉛筆圖示「**編輯**」
3. 版本選「**新版本**」
4. 「**執行身份**」=「**我**」
5. 「**誰可以存取**」=「**任何人**」（如果之前已是這樣就不用改）
6. 點「**部署**」

⚠️ Web App URL **不會變**，所以行銷中心「設定」頁的 GAS URL 不用改。

### 步驟 5：授權 Drive 權限（第一次執行時）

第一次有人按「推送完整資料至雲端」時，GAS 會跳出授權對話框（請求存取 Drive）。
- 是你本人的 Google 帳號 → 點「**允許**」
- 是團隊共用帳號 → 找擁有者授權

---

## 使用方式

### 在原電腦（資料源）

1. 進入「**設定**」頁
2. 找到「☁️ **完整資料雲端同步**」卡片
3. 點「**推送完整資料至雲端**」
4. 看到「✓ 推送成功」即完成

### 在新電腦

1. 打開 https://kyoape-ux.github.io/ktgh-marketing-hub/
2. 進入「設定」頁（GAS URL 已預設）
3. 點「**從雲端拉取完整資料**」
4. 確認 → 3 秒後自動重新載入
5. 看到完整資料 ✅

---

## 進階：定時自動推送（可選）

如果想要每天自動備份到雲端，在 GAS 加入：

```javascript
function dailyAutoBackup() {
  // 注意：這只是備份，不會從前端拉取資料
  // 真正的「自動推送」需要由前端定時觸發
  // 此 function 僅作為「資料版本快照」用途
  const file = _getStateFile();
  if (!file) return;
  const folder = _getOrCreateStateFolder();
  const today = new Date().toISOString().slice(0,10);
  const archive = folder.createFile('ktgh_state_archive_' + today + '.json', file.getBlob().getDataAsString(), 'application/json');
  Logger.log('已歸檔 ' + today);
}
```

然後在 GAS 編輯器 → 觸發條件 → 加入時間驅動器，每天執行一次。

---

## 疑難排解

| 錯誤訊息 | 可能原因 | 解法 |
|---|---|---|
| GAS 回傳非 JSON | doPost 沒有路由 saveState | 確認 step 3 已加入 |
| saveState fails | Drive 授權未通過 | 重新執行函式並授權 |
| 拉取後沒資料 | 雲端尚未推送 | 先在原電腦推送 |
| 速度很慢 (>10 秒) | JSON 太大 (>1 MB) | 正常，每次同步只需 1 次 |

---

## 為什麼推這個方案

| 需求 | 滿足程度 |
|---|---|
| 跨電腦共用全部資料 | ✅ 完全滿足 |
| 一鍵推送 / 一鍵拉取 | ✅ |
| 不需新帳號 / 不需額外服務 | ✅ 用既有 Google Drive |
| 支援大資料量 (>100 KB) | ✅ Drive 沒有實質上限 |
| 可離線後再同步 | ✅ 手動觸發即可 |
| 有版本快照（可回復） | ✅ 內建 takeSnapshot |
| 免費 | ✅ |
