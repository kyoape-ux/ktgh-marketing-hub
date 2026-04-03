/**
 * 光田醫院行銷分析系統 — Google Apps Script 後端 v2
 *
 * 部署方式：
 *   Apps Script → 部署 → 新增部署 → 類型：網路應用程式
 *   執行身分：我（你的 Google 帳號）
 *   存取權限：所有人（含匿名使用者）← 讓 GitHub Pages 能 fetch
 *
 * 全部使用 GET 請求，避免 CORS preflight 問題。
 *
 * Sheets 結構（同一個 Google Spreadsheet）：
 *   工作表: processed_posts, events, media
 */

// ── 設定 ──────────────────────────────────────────────
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // ← 換成你的試算表 ID

// ── 初始化工作表（第一次部署後手動執行一次）────────────
function initSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const schemas = {
    'processed_posts': ['id','date','title','type','cat','reach','click','engage','month','url','import_at'],
    'events':  ['date','name','type','campus','reg','attend','reach','sat','speaker','note','created_at'],
    'media':   ['date','name','type','section','title','nature','reach','url','note','created_at'],
    'kols':    ['date','name','platform','followers','content_type','reach','engage','campaign','url','note','created_at'],
  };
  Object.entries(schemas).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
           .setBackground('#006341').setFontColor('#ffffff').setFontWeight('bold');
    }
  });
  return 'Sheets initialized';
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
      case 'getPosts':      return jsonResponse(getPosts(e.parameter));
      case 'getEvents':     return jsonResponse(getEvents());
      case 'getMedia':      return jsonResponse(getMedia());
      case 'importPosts':   return jsonResponse(importPosts(data));
      case 'addEvent':      return jsonResponse(addEvent(data));
      case 'addMedia':      return jsonResponse(addMedia(data));
      case 'bulkAddEvents': return jsonResponse(bulkAddEvents(data));
      case 'bulkAddMedia':  return jsonResponse(bulkAddMedia(data));
      case 'getKols':       return jsonResponse(getKols());
      case 'addKol':        return jsonResponse(addKol(data));
      case 'bulkAddKols':   return jsonResponse(bulkAddKols(data));
      case 'initSheets':    return jsonResponse(initSheets());
      default:              return errResponse('Unknown action: ' + action);
    }
  } catch(err) {
    return errResponse(err.message);
  }
}

// doPost 保留，實際轉交 doGet 處理
function doPost(e) { return doGet(e); }

// ── 讀取貼文 ─────────────────────────────────────────
function getPosts(params) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('processed_posts');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];

  let posts = rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  }).filter(p => Number(p.reach) > 0);

  if (params && params.month && params.month !== 'all') {
    posts = posts.filter(p => p.month === params.month);
  }
  return posts;
}

// ── 匯入 FB 貼文（去重）──────────────────────────────
function importPosts(rows) {
  if (!rows || !rows.length) return { imported: 0, skipped: 0 };
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('processed_posts');

  // 建立去重 key (date + title前20字)
  const existing = new Set();
  if (sheet.getLastRow() > 1) {
    const allVals = sheet.getRange(2, 1, sheet.getLastRow()-1, sheet.getLastColumn()).getValues();
    const hdrs    = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const dIdx = hdrs.indexOf('date');
    const tIdx = hdrs.indexOf('title');
    allVals.forEach(r => existing.add((r[dIdx]||'') + '|' + String(r[tIdx]||'').slice(0,20)));
  }

  const newRows = [];
  rows.forEach(r => {
    const key = (r.date||'') + '|' + String(r.title||'').slice(0,20);
    if (existing.has(key)) return;
    existing.add(key);
    newRows.push([
      r.id || '', r.date, r.title, r.type || '相片',
      r.cat || autoTagRule(r.title),
      Number(r.reach)||0, Number(r.click)||0, Number(r.engage)||0,
      r.month || (r.date||'').slice(0,7), r.url || '',
      new Date()
    ]);
  });

  if (newRows.length) {
    sheet.getRange(sheet.getLastRow()+1, 1, newRows.length, newRows[0].length)
         .setValues(newRows);
  }
  return { imported: newRows.length, skipped: rows.length - newRows.length };
}

// ── 活動記錄 ─────────────────────────────────────────
function getEvents() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('events');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
}

function addEvent(event) {
  if (!event) return { ok: false };
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('events');
  sheet.appendRow([
    event.date, event.name, event.type, event.campus,
    Number(event.reg)||0, Number(event.attend)||0,
    Number(event.reach)||0, Number(event.sat)||0,
    event.speaker||'', event.note||'', new Date()
  ]);
  return { ok: true };
}

function bulkAddEvents(events) {
  if (!events || !events.length) return { added: 0 };
  events.forEach(ev => addEvent(ev));
  return { added: events.length };
}

// ── 媒體曝光 ─────────────────────────────────────────
function getMedia() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('media');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
}

function addMedia(media) {
  if (!media) return { ok: false };
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('media');
  sheet.appendRow([
    media.date, media.name, media.type, media.section||'',
    media.title, media.nature, Number(media.reach)||0,
    media.url||'', media.note||'', new Date()
  ]);
  return { ok: true };
}

function bulkAddMedia(mediaList) {
  if (!mediaList || !mediaList.length) return { added: 0 };
  mediaList.forEach(m => addMedia(m));
  return { added: mediaList.length };
}

// ── KOL 追蹤 ──────────────────────────────────────────────
function getKols() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('kols');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
}

function addKol(kol) {
  if (!kol) return { ok: false };
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('kols');
  sheet.appendRow([
    kol.date, kol.name, kol.platform, Number(kol.followers)||0,
    kol.content_type, Number(kol.reach)||0, Number(kol.engage)||0,
    kol.campaign||'', kol.url||'', kol.note||'', new Date()
  ]);
  return { ok: true };
}

function bulkAddKols(kols) {
  if (!kols || !kols.length) return { added: 0 };
  kols.forEach(k => addKol(k));
  return { added: kols.length };
}

// ── 自動標籤（規則型）────────────────────────────────
function autoTagRule(title) {
  const t = title || '';
  if (/案例|醫師|手術|治療|病患|康復|重獲|感謝函/.test(t)) return '案例類';
  if (/元旦|春節|聖誕|母親節|感恩|節慶|寶寶|不老騎士/.test(t)) return '品牌/節慶';
  if (/榮總|中山附醫|醫學中心|名醫|聯名|合作/.test(t))        return '地位建立';
  if (/講座|活動|報名|現場|系列/.test(t))                      return '活動/講座';
  if (/招募|護理師|徵才|加入|阿長/.test(t))                    return '招募類';
  if (/偏鄉|志工|公益|梨山|搜救犬/.test(t))                   return '公益類';
  return '衛教類';
}
