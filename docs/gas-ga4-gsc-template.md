# GAS 後端範本：GA4 / GSC 自動拉取

在行銷整合分析中心的「匯入 GA4 / GSC 數據」頁面，有一個**自動化**區塊，可呼叫 GAS
後端拉取當月資料並直接寫入前端 store。本文件提供兩個 GAS action 的實作範本。

---

## 前置作業

### 1. 啟用 GA4 Data API

在 GCP Console：
1. 建立（或選擇）一個專案
2. 啟用 **Google Analytics Data API**
3. 建立 **Service Account**，下載 JSON 金鑰
4. 到 GA4 帳號 → 管理 → 帳戶存取權管理，把 Service Account 的 `client_email` 加入為**檢視者**

### 2. 啟用 Search Console API + OAuth

1. 在 GCP Console 啟用 **Search Console API**
2. 建立 OAuth 2.0 Client ID（桌面或 web 皆可）
3. 取得 refresh token（使用 `OAuth2 library for Apps Script`）

---

## GAS 程式碼

把下列程式碼貼到 GAS 專案的 `Code.gs`，並在「專案設定 → 指令碼屬性」中加入：

| Key | Value |
|---|---|
| `GA4_PROPERTY_ID` | 你的 GA4 property ID（例如 `308146651`） |
| `GA4_SERVICE_ACCOUNT_JSON` | Service Account JSON 金鑰（整串貼上） |
| `GSC_SITE_URL` | `https://www.ktgh.com.tw/`（含尾斜線，sc-domain 格式亦可） |
| `GSC_OAUTH_TOKEN` | Search Console API 的 refresh token（取得後自行交換 access token） |

```javascript
/**
 * doGet / doPost 的主要 router
 * 在既有的 sync 邏輯之外，加入 GA4 / GSC 拉取支援
 */
function doGet(e) {
  const action = (e.parameter || {}).action;
  try {
    if (action === 'pull_ga4_month') {
      const ym = e.parameter.ym;
      if (!ym) throw new Error('缺少 ym 參數');
      return jsonResponse({ ok: true, monthly: pullGa4Month(ym) });
    }
    if (action === 'pull_gsc_month') {
      const ym = e.parameter.ym;
      if (!ym) throw new Error('缺少 ym 參數');
      return jsonResponse({ ok: true, keywords: pullGscMonth(ym) });
    }
    // … 其他原本的 action
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message || String(err) });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * GA4：拉取指定月份的多項指標
 * 回傳結構對應 store.gaMonthly[ym]
 */
function pullGa4Month(ym) {
  const props = PropertiesService.getScriptProperties();
  const propertyId = props.getProperty('GA4_PROPERTY_ID');
  const saJson = props.getProperty('GA4_SERVICE_ACCOUNT_JSON');
  if (!propertyId || !saJson) throw new Error('GA4 設定未完成');

  const [y, m] = ym.split('-');
  const start = y + '-' + m + '-01';
  const lastDay = new Date(+y, +m, 0).getDate();
  const end = y + '-' + m + '-' + String(lastDay).padStart(2, '0');
  const token = getGa4AccessToken(saJson);

  const runReport = (body) => {
    const resp = UrlFetchApp.fetch(
      'https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':runReport',
      {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + token },
        payload: JSON.stringify(body),
        muteHttpExceptions: true,
      }
    );
    return JSON.parse(resp.getContentText());
  };

  const base = { dateRanges: [{ startDate: start, endDate: end }] };

  // 1. 使用者指標
  const users = runReport({
    ...base,
    metrics: [
      { name: 'activeUsers' },
      { name: 'newUsers' },
    ],
  });
  // 2. 裝置
  const devices = runReport({
    ...base,
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [{ name: 'activeUsers' }],
  });
  // 3. 流量來源 / 媒介
  const sources = runReport({
    ...base,
    dimensions: [{ name: 'sessionSourceMedium' }],
    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
  });
  // 4. 熱門頁面
  const pages = runReport({
    ...base,
    dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
    metrics: [{ name: 'screenPageViews' }],
    limit: 50,
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
  });
  // 5. 年齡性別
  const ageGender = runReport({
    ...base,
    dimensions: [{ name: 'userGender' }, { name: 'userAgeBracket' }],
    metrics: [{ name: 'activeUsers' }],
  });

  // 把 API 回傳轉成前端 store 格式
  const out = {};

  if (users.rows && users.rows.length) {
    const m = users.metricHeaders.map(h => h.name);
    const row = users.rows[0].metricValues.map(v => +v.value);
    out.users = {
      '活躍使用者': row[m.indexOf('activeUsers')] || 0,
      '新使用者':   row[m.indexOf('newUsers')]    || 0,
    };
  }

  if (devices.rows) {
    const map = { mobile: '手機', tablet: '平板', desktop: '電腦/筆電' };
    out.deviceUsers = {};
    let total = 0;
    devices.rows.forEach(r => {
      const key = map[r.dimensionValues[0].value] || r.dimensionValues[0].value;
      const v = +r.metricValues[0].value || 0;
      out.deviceUsers[key] = v;
      total += v;
    });
    out.deviceUsers['合計'] = total;
  }

  if (sources.rows) {
    out.sourceUsers = {};
    out.siteTraffic = { '全站統計': { '工作階段': 0 } };
    sources.rows.forEach(r => {
      const src = r.dimensionValues[0].value; // e.g. 'google / organic'
      const users = +r.metricValues[0].value || 0;
      const sess  = +r.metricValues[1].value || 0;
      out.sourceUsers[src] = users;
      out.siteTraffic['全站統計']['工作階段'] += sess;
    });
  }

  if (pages.rows) {
    out.pageViews = pages.rows.map(r => ({
      category: '',
      name: r.dimensionValues[1].value || r.dimensionValues[0].value,
      url: r.dimensionValues[0].value,
      views: +r.metricValues[0].value || 0,
    }));
  }

  if (ageGender.rows) {
    out.ageGender = {};
    let total = 0;
    ageGender.rows.forEach(r => {
      const gender = r.dimensionValues[0].value; // female / male / unknown
      const age = r.dimensionValues[1].value;
      const key = gender === 'female' ? '女性' : gender === 'male' ? '男性' : '無法判斷';
      const v = +r.metricValues[0].value || 0;
      out.ageGender[key] = (out.ageGender[key] || 0) + v;
      // 也可按年齡細分：out.ageGender[age] = v;
      total += v;
    });
    out.ageGender['合計'] = total;
  }

  return out;
}

/**
 * GSC：拉取指定月份的關鍵字資料
 */
function pullGscMonth(ym) {
  const props = PropertiesService.getScriptProperties();
  const siteUrl = props.getProperty('GSC_SITE_URL');
  const token = getGscAccessToken();

  const [y, m] = ym.split('-');
  const start = y + '-' + m + '-01';
  const lastDay = new Date(+y, +m, 0).getDate();
  const end = y + '-' + m + '-' + String(lastDay).padStart(2, '0');

  const resp = UrlFetchApp.fetch(
    'https://www.googleapis.com/webmasters/v3/sites/' +
      encodeURIComponent(siteUrl) + '/searchAnalytics/query',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({
        startDate: start,
        endDate: end,
        dimensions: ['query'],
        rowLimit: 1000,
      }),
      muteHttpExceptions: true,
    }
  );
  const data = JSON.parse(resp.getContentText());
  if (!data.rows) return [];

  return data.rows.map(r => ({
    topic: '',
    keyword: r.keys[0],
    avgSearchVolume: null,            // GSC API 不提供搜尋量
    difficulty: '',
    clicks: +r.clicks || 0,
    impressions: +r.impressions || 0,
    ctr: +r.ctr || 0,
    position: +r.position || 0,
  }));
}

/** 取得 GA4 Data API access token（JWT 簽章） */
function getGa4AccessToken(saJson) {
  const sa = JSON.parse(saJson);
  const header = Utilities.base64EncodeWebSafe(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const claim = Utilities.base64EncodeWebSafe(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signature = Utilities.base64EncodeWebSafe(
    Utilities.computeRsaSha256Signature(header + '.' + claim, sa.private_key)
  );
  const jwt = header + '.' + claim + '.' + signature;
  const resp = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    },
  });
  return JSON.parse(resp.getContentText()).access_token;
}

/** 取得 GSC access token — 先前已透過 OAuth2 library 儲存 refresh token */
function getGscAccessToken() {
  // 建議使用 https://github.com/googleworkspace/apps-script-oauth2
  // 或自行用 refresh token + client_id + client_secret 交換
  const props = PropertiesService.getScriptProperties();
  const refreshToken = props.getProperty('GSC_REFRESH_TOKEN');
  const clientId = props.getProperty('GSC_CLIENT_ID');
  const clientSecret = props.getProperty('GSC_CLIENT_SECRET');
  const resp = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    },
  });
  return JSON.parse(resp.getContentText()).access_token;
}
```

---

## 測試步驟

1. 在 GAS 部署為 Web App（存取權：「任何人」皆可執行）
2. 複製 Web App URL 貼入行銷中心的「設定」→ GAS URL
3. 前往「匯入 GA4 / GSC 數據」→ 自動化區塊，選擇月份，點「從 GA4 拉取」或「從 GSC 拉取」
4. 若成功會即時寫入 store.gaMonthly / store.gscKeywords

---

## 疑難排解

| 錯誤 | 原因 | 解法 |
|---|---|---|
| `GA4 設定未完成` | 指令碼屬性未填入 | GAS → 專案設定 → 指令碼屬性 |
| `401 Unauthorized` | Service Account 未加入 GA4 帳號 | GA4 管理 → 帳戶存取權管理 → 新增 |
| `403 Forbidden (GSC)` | OAuth token 過期或 siteUrl 不在驗證清單 | 重新授權 / 確認 Search Console 已驗證該網站 |
| 回應是空的 | 該月份無資料或時區問題 | 確認 GA4 property 的時區設定 |

---

## 進階：定時自動拉取

可以在 GAS 設定時間觸發器（每天 01:00）呼叫一個 wrapper function，自動拉取「上個月」
的資料並寫入 Google Sheets，行銷中心下次同步時自動取得。

```javascript
function dailyAutoPull() {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const ym = prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2, '0');
  const gaData = pullGa4Month(ym);
  const gscData = pullGscMonth(ym);
  // 寫入 Google Sheets...
  Logger.log('Pulled ' + ym);
}
```

