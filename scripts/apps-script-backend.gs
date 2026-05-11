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
const SPREADSHEET_ID = '1MtKTbrcoxP7-YVUB0rILdYrM3vOh_O0JXqEWNdJFrKI'; // 光田醫院行銷資料庫

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
      // 資料缺漏催收 email
      case 'emailMissing':  return jsonResponse(emailMissing(e));
      case 'checkMissingNow': return jsonResponse(autoCheckAndEmailMissing());
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
    if (action === 'emailMissing') {
      if (e.parameter && e.parameter.data) {
        return jsonResponse(emailMissing({ postData: { contents: e.parameter.data }, parameter: e.parameter }));
      }
      return jsonResponse(emailMissing(e));
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

// ═══════════════════════════════════════════════════════
//  📋 資料缺漏催收 Email
// ═══════════════════════════════════════════════════════

// 從前端 emailMissing API 呼叫：寄催收 email
function emailMissing(e) {
  const toParam = (e && e.parameter && e.parameter.to) || '';
  const raw = (e && e.postData && e.postData.contents) || '';
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch(err) { throw new Error('payload 解析失敗：' + err.message); }
  const ymLabel = data.label || data.ym || '本月';
  const items = data.items || [];
  if (!toParam) throw new Error('缺少收件人 to');
  if (!items.length) throw new Error('沒有缺漏項目');

  const subject = '[光田行銷] ' + ymLabel + ' 資料缺漏催收（' + items.length + ' 項）';
  const baseUrl = 'https://kyoape-ux.github.io/ktgh-marketing-hub/';
  let body = '<div style="font-family:Arial,sans-serif;max-width:640px;">';
  body += '<h2 style="color:#1E40AF;margin-bottom:8px;">📋 ' + ymLabel + ' 資料缺漏催收</h2>';
  body += '<p style="color:#666;font-size:13px;">每月 10 號自動寄發。下列平台資料尚未到位，請各負責小組儘快補齊。</p>';
  body += '<table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:13px;">';
  body += '<thead><tr style="background:#F1F5F9;"><th style="padding:8px;text-align:left;border:1px solid #E5E7EB;">平台</th><th style="padding:8px;text-align:left;border:1px solid #E5E7EB;">負責小組</th><th style="padding:8px;text-align:left;border:1px solid #E5E7EB;">門檻</th></tr></thead><tbody>';
  items.forEach(function(it) {
    body += '<tr>'
      + '<td style="padding:8px;border:1px solid #E5E7EB;font-weight:600;">' + it.platform + '</td>'
      + '<td style="padding:8px;border:1px solid #E5E7EB;color:#666;">' + (it.owner||'未指派') + '</td>'
      + '<td style="padding:8px;border:1px solid #E5E7EB;color:#888;">至少 ' + (it.minCount||1) + ' 筆</td>'
      + '</tr>';
  });
  body += '</tbody></table>';
  body += '<p style="margin-top:18px;"><a href="' + baseUrl + '" style="background:#1E40AF;color:#fff;padding:10px 22px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:700;">前往行銷整合分析中心補資料 →</a></p>';
  body += '<p style="margin-top:14px;color:#999;font-size:11px;">本郵件由「行銷整合分析中心」GAS 排程自動發送。 設定變更請聯絡網管。</p>';
  body += '</div>';

  MailApp.sendEmail({ to: toParam, subject: subject, htmlBody: body });
  return { sent: toParam, count: items.length, ym: data.ym };
}

// 每月 10 號自動執行（請在 GAS 設定時間驅動觸發條件 → 月份 → 10 日 → 09:00）
// 觸發時自動從雲端 state 讀本月應有資料、計算缺漏、寄催收 email
function autoCheckAndEmailMissing() {
  const props = PropertiesService.getScriptProperties();
  const recipients = props.getProperty('MISSING_REPORT_TO');
  if (!recipients) {
    Logger.log('未設定 MISSING_REPORT_TO 屬性，跳過');
    return { skipped: true, reason: 'no recipients' };
  }
  // 載入雲端 state
  let state = loadState();
  if (!state) state = {};

  // 計算上個月 YYYY-MM
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const targetYm = prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2, '0');
  const ymLabel = prev.getFullYear() + ' 年 ' + (prev.getMonth() + 1) + ' 月';

  // 平台檢查規則（與前端 computeMonthlyDataMissing 一致）
  const checks = [
    { platform:'GA4 月度報表', minCount:1, owner:'網頁小組', test: () => !!(state.gaMonthly||{})[targetYm] },
    { platform:'GSC 關鍵字', minCount:5, owner:'網頁小組', test: () => (state.gscKeywords||[]).filter(function(k){return !k.deleted_at;}).length >= 5 },
    { platform:'FB 粉專貼文', minCount:8, owner:'社群小組', test: () => (state.posts||[]).filter(function(p){return !p.deleted_at && (p.month||(p.date||'').slice(0,7))===targetYm;}).length >= 8 },
    { platform:'LINE 推播', minCount:2, owner:'LINE 小組', test: () => (state.linePosts||[]).filter(function(p){return !p.deleted_at && (p.date||'').slice(0,7)===targetYm;}).length >= 2 },
    { platform:'YT/IG 影片', minCount:1, owner:'影音小組', test: () => (state.videoItems||[]).filter(function(v){return !v.deleted_at && (v.date||'').slice(0,7)===targetYm;}).length >= 1 },
    { platform:'SEO 文章', minCount:1, owner:'編輯小組', test: () => (state.seoArticles||[]).filter(function(a){return !a.deleted_at && (a.date||'')===targetYm;}).length >= 1 },
    { platform:'媒體曝光', minCount:1, owner:'公關小組', test: () => (state.media||[]).filter(function(m){return !m.deleted_at && (m.date||'').slice(0,7)===targetYm;}).length >= 1 },
    { platform:'活動/講座', minCount:1, owner:'各企劃', test: () => (state.events||[]).filter(function(e){return !e.deleted_at && (e.date||'').slice(0,7)===targetYm;}).length >= 1 },
    { platform:'門診表題材', minCount:1, owner:'門診企劃', test: () => (state.mediaItems||[]).filter(function(m){return !m.deleted_at && (m.month||'')===targetYm;}).length >= 1 },
  ];
  const missing = checks.filter(function(c){ return !c.test(); }).map(function(c){
    return { platform: c.platform, minCount: c.minCount, owner: c.owner };
  });
  if (!missing.length) {
    Logger.log('資料齊全，不寄催收');
    return { skipped: true, reason: 'all complete', ym: targetYm };
  }
  // 寄送
  return emailMissing({
    parameter: { to: recipients },
    postData: { contents: JSON.stringify({ ym: targetYm, label: ymLabel, items: missing }) }
  });
}

// ═══════════════════════════════════════════════════════
//  ⚙️ 一次性設定：建立每月 10 號 09:00 自動觸發條件
//  使用方式：在 GAS 編輯器手動執行 setupMonthlyTrigger() 一次
//  另外請到「專案設定 → 指令碼屬性」設定 MISSING_REPORT_TO=收件人,逗號分隔
// ═══════════════════════════════════════════════════════
function setupMonthlyTrigger() {
  // 移除既有同名觸發條件，避免重複
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'autoCheckAndEmailMissing') {
      ScriptApp.deleteTrigger(t);
    }
  });
  // 建立新觸發條件：每月 10 號 09:00
  ScriptApp.newTrigger('autoCheckAndEmailMissing')
    .timeBased()
    .onMonthDay(10)
    .atHour(9)
    .create();
  return '✓ 已建立每月 10 號 09:00 自動催收觸發條件';
}
