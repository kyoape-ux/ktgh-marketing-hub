/**
 * 光田醫院行銷分析系統 — Google Apps Script 後端 v3
 *
 * 部署方式：
 *   1. 開啟 Google 試算表 → 擴充功能 → Apps Script
 *   2. 將此檔案內容全部貼上（取代預設的 Code.gs）
 *   3. 將下方 SPREADSHEET_ID 換成你的試算表 ID
 *   4. 先執行一次 initSheets()（建立工作表與標頭）
 *   5. 部署 → 新增部署 → 類型：網路應用程式
 *      執行身分：我 ／ 存取權限：所有人（含匿名）
 *   6. 複製 Web App URL 貼到前台「設定」頁
 *
 * ★ 工作人員可直接在 Google Sheets 編輯資料，
 *   前台「同步」時會自動讀取最新內容。
 *
 * Sheets 工作表：processed_posts, events, media, kols
 */

// ── 設定 ──────────────────────────────────────────────
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // ← 換成你的試算表 ID

// ── 欄位定義（與前台完全對應）──────────────────────────
const SCHEMAS = {
  'processed_posts': ['date','title','type','img_type','cat','reach','click','engage','month','url','phase','campaign'],
  'events':  ['date','name','type','campus','reg','attend','reach','sat','speaker','note','budget','expense'],
  'media':   ['date','name','type','section','title','nature','reach','url','note','campaign'],
  'kols':    ['date','name','platform','followers','content_type','reach','engage','campaign','url','note'],
};

// ── 初始化工作表（第一次部署後手動執行一次）────────────
function initSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Object.entries(SCHEMAS).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    // 永遠覆寫標頭確保最新欄位
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
         .setBackground('#006341').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  });
  return 'Sheets initialized with v3 schema (' + Object.keys(SCHEMAS).join(', ') + ')';
}

// ── 回應包裝 ──────────────────────────────────────────
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function errResponse(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 主路由（GET-only，避免 CORS preflight）────────────
function doGet(e) {
  try {
    const action = e.parameter.action || 'getPosts';
    const raw    = e.parameter.data;
    const data   = raw ? JSON.parse(raw) : null;

    switch (action) {
      // 讀取
      case 'getPosts':      return jsonResponse(readSheet('processed_posts'));
      case 'getEvents':     return jsonResponse(readSheet('events'));
      case 'getMedia':      return jsonResponse(readSheet('media'));
      case 'getKols':       return jsonResponse(readSheet('kols'));
      // 寫入（單筆）
      case 'addEvent':      return jsonResponse(addRow('events', data));
      case 'addMedia':      return jsonResponse(addRow('media', data));
      case 'addKol':        return jsonResponse(addRow('kols', data));
      // 批量寫入（去重）
      case 'importPosts':   return jsonResponse(bulkUpsert('processed_posts', data, r => (r.date||'')+'|'+(r.title||'')));
      case 'bulkAddEvents': return jsonResponse(bulkUpsert('events', data, r => (r.date||'')+'|'+(r.name||'')));
      case 'bulkAddMedia':  return jsonResponse(bulkUpsert('media', data, r => (r.date||'')+'|'+(r.name||'')));
      case 'bulkAddKols':   return jsonResponse(bulkUpsert('kols', data, r => (r.date||'')+'|'+(r.name||'')));
      // 管理
      case 'initSheets':    return jsonResponse(initSheets());
      // 完整資料雲端同步（儲存於 Google Drive JSON 檔）
      case 'loadState':     return jsonResponse(loadState());
      case 'saveState':     return jsonResponse(saveState(e));
      default:              return errResponse('Unknown action: ' + action);
    }
  } catch(err) {
    return errResponse(err.message);
  }
}

// doPost 處理大 JSON body（saveState 用 POST 避開 URL 長度限制）
// 支援兩種來源：(1) raw JSON 在 e.postData.contents (curl 風格)
//              (2) form field 'data' 在 e.parameter.data (iframe form POST 風格)
function doPost(e) {
  try {
    const action = (e.parameter || {}).action;
    if (action === 'saveState') {
      // 從 form field 取得 JSON
      if (e.parameter && e.parameter.data) {
        return jsonResponse(saveState({ postData: { contents: e.parameter.data } }));
      }
      // 從 raw body 取得 JSON
      return jsonResponse(saveState(e));
    }
    return doGet(e);
  } catch(err) {
    return errResponse(err.message);
  }
}

// ═══════════════════════════════════════════════════════
//  完整資料雲端同步 — KTGH Marketing Hub State Sync
// ═══════════════════════════════════════════════════════
const STATE_FILE_NAME = 'ktgh_marketing_state.json';
const STATE_FOLDER_NAME = 'KTGH Marketing State';

function _getOrCreateStateFolder() {
  const folders = DriveApp.getFoldersByName(STATE_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(STATE_FOLDER_NAME);
}

function _getStateFile() {
  const folder = _getOrCreateStateFolder();
  const files = folder.getFilesByName(STATE_FILE_NAME);
  return files.hasNext() ? files.next() : null;
}

function loadState() {
  const file = _getStateFile();
  if (!file) return null;
  try {
    return JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  } catch (err) {
    throw new Error('讀取雲端 state 失敗：' + err.message);
  }
}

function saveState(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('缺少 POST body（需用 POST 推送 JSON）');
  }
  const folder = _getOrCreateStateFolder();
  const file = _getStateFile();
  if (file) {
    file.setContent(e.postData.contents);
  } else {
    folder.createFile(STATE_FILE_NAME, e.postData.contents, 'application/json');
  }
  return { savedAt: new Date().toISOString(), bytes: e.postData.contents.length };
}

// ═══════════════════════════════════════════════════════
//  通用讀取：工作表 → JSON 陣列
// ═══════════════════════════════════════════════════════
function readSheet(sheetName) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  return rows.slice(1).filter(r => r.some(c => c !== '' && c !== null)).map(r => {
    const obj = {};
    headers.forEach((h, i) => {
      let v = r[i];
      // 日期格式化
      if (h === 'date' && v instanceof Date) {
        v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      // 數字欄位確保是數字
      if (['reach','click','engage','reg','attend','sat','budget','expense','followers'].includes(h)) {
        v = Number(v) || 0;
      }
      obj[h] = v;
    });
    return obj;
  });
}

// ═══════════════════════════════════════════════════════
//  通用寫入：單筆新增
// ═══════════════════════════════════════════════════════
function addRow(sheetName, data) {
  if (!data) return { ok: false, error: 'No data' };
  const ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet   = ss.getSheetByName(sheetName);
  const headers = SCHEMAS[sheetName];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return { ok: true };
}

// ═══════════════════════════════════════════════════════
//  通用批量寫入（去重 upsert）
//  ★ 核心：已存在的 row 會「更新」，不存在的才「新增」
//  ★ 工作人員在 Sheets 手動新增的資料也會保留
// ═══════════════════════════════════════════════════════
function bulkUpsert(sheetName, dataArr, keyFn) {
  if (!dataArr || !dataArr.length) return { added: 0, updated: 0, total: 0 };
  const ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet   = ss.getSheetByName(sheetName);
  const headers = SCHEMAS[sheetName];

  // 讀取現有資料，建立 key → rowIndex 對照
  const existingMap = new Map();
  if (sheet.getLastRow() > 1) {
    const allVals = sheet.getRange(2, 1, sheet.getLastRow()-1, headers.length).getValues();
    allVals.forEach((row, idx) => {
      const obj = {};
      headers.forEach((h, i) => {
        let v = row[i];
        if (h === 'date' && v instanceof Date) {
          v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
        obj[h] = v;
      });
      existingMap.set(keyFn(obj), idx + 2); // +2 因為 row 1 是標頭
    });
  }

  let added = 0, updated = 0;
  const newRows = [];

  dataArr.forEach(d => {
    const key = keyFn(d);
    const rowData = headers.map(h => d[h] !== undefined ? d[h] : '');
    const existingRowIdx = existingMap.get(key);

    if (existingRowIdx) {
      // 已存在 → 更新該列
      sheet.getRange(existingRowIdx, 1, 1, headers.length).setValues([rowData]);
      updated++;
    } else {
      // 不存在 → 加入待新增
      newRows.push(rowData);
      existingMap.set(key, true); // 防止同批次重複
      added++;
    }
  });

  // 批量新增（比逐列 append 快很多）
  if (newRows.length) {
    sheet.getRange(sheet.getLastRow()+1, 1, newRows.length, headers.length)
         .setValues(newRows);
  }

  return { added, updated, total: sheet.getLastRow() - 1 };
}
