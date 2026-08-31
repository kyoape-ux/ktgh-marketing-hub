# 行銷整合分析中心｜開發規範

> 本檔為專案層規範，全域 CI／技術規範（色票、字體、Icon、卡片、行銷用詞）詳見 `~/.claude/CLAUDE.md`。

## 專案基本資訊

| 欄位         | 內容                                                        |
|--------------|-------------------------------------------------------------|
| 工具名稱     | 行銷整合分析中心                                            |
| GitHub Repo  | `kyoape-ux/ktgh-marketing-hub`                              |
| GitHub Pages | `https://kyoape-ux.github.io/ktgh-marketing-hub/`          |
| 主要檔案     | `index.html`                                                |
| localStorage | `ktgh_marketing_v1`                                         |
| 目前版本     | `v4.0`（Drive JSON 主資料流）                               |

## 工具功能簡述

供光田行銷部門追蹤 Facebook 貼文成效、活動記錄、媒體曝光，並產出月報。
資料來源為人工輸入 + FB Excel 匯入，儲存於 localStorage。

## 受保護檔案（禁止在沒有明確需求時重構）

| 檔案 | 說明 |
|------|------|
| `index.html` | 主程式，含 91 篇內建資料，不可刪減 |
| `docs/CI-COLORS.md` | CI 色票規範 |
| `docs/ARCHITECTURE.md` | 系統架構說明 |

## 資料結構（localStorage: `ktgh_marketing_v1`）

```js
{
  posts: [{
    date, title, type, cat, reach, click, engage, month, url
    // 用詞標準見 ~/.claude/CLAUDE.md「行銷分析用詞規範」
  }],
  events: [{
    date, name, type, campus, reg, attend, reach, sat, speaker, note
  }],
  media: [{
    date, mediaName, mediaType, section, title, nature, reach, url, note
  }]
}
```

## 頁面區塊

1. `#section-overview` — 總覽 Dashboard（KPI 卡、趨勢圖）
2. `#section-posts` — 貼文成效列表
3. `#section-analysis` — 組合分析（交叉矩陣）
4. `#section-sop` — SOP 建議模板
5. `#section-events` — 活動記錄
6. `#section-media` — 媒體曝光
7. `#section-import` — FB Excel 匯入（解析已實作，欄位對應待做）

## 資料流（v4 起，勿改回舊架構）

Drive 上的 `ktgh_marketing_state.json` 是**唯一真實來源**，Google Sheets 是**唯讀鏡像**。

- 開頁 → `cloudBoot()` 從 Drive 載入；載不到就整站唯讀
- 任何 `saveStore()` → 排程 `runCloudSave()` 推 Drive（POST，無長度限制）
- `syncFromGAS()` 只補不刪，且**不可**再放進自動執行
- 寫入**不可**再走 `gasGet` 塞網址：中文編碼膨脹 9 倍，28 篇貼文就超過 8KB 上限
- 照片（base64）**不進 localStorage**，只存雲端 state

詳見 `docs/DEPLOY-v4.md`。

## 導覽與資料狀態

- `NAV_GATES` + `applyNavVisibility()`：沒資料的管道自動從側欄收起，有資料自動出現；
  側欄底部有「顯示全部項目」可強制展開。新增管道時在 `NAV_GATES` 加一行即可。
- `NAV_MERGED`：已併入別頁的入口，功能還在但不佔側欄一列，值是給 tooltip 的說明。
  目前有 7 項（4 個匯入、Campaign 看板、活動成效看板、總覽 Dashboard）。
  **合併時務必在原功能所屬頁面加一顆進入按鈕**，否則等於把功能藏起來。
- 門診表原本有自己的「標籤管理／標籤統計分析」，但寫的是**同一個 `store.mediaTags`**，
  只是兩個介面。已在 `switchSection()` 導向跨管道那套，側欄項目移除。
- `dataStatusBar(items, checks)`：在列表上方顯示各欄位完整度，避免「有列表 = 資料齊全」的誤會。

> ★ 內建資料**都是真的**，不是示範資料，不可清除：
> `BUILTIN_GA_MONTHLY`（2025 起實際 GA4 數字）、
> `BUILTIN_SEO_ARTICLES`（50 篇真實 ktgh.com.tw 文章，43 篇有排名）、
> `BUILTIN_GSC_KEYWORDS`（21 個真實關鍵字，10 個有搜尋量）。
> `sa_seed_` 這種 id 前綴只是種子命名，不代表是假資料。

## 指標定義（不要再搞混）

| 指標 | 算法 | 欄位 |
|---|---|---|
| 點擊率 | 總點擊 ÷ 觸及 | `click / reach` |
| 互動率 | （心情+留言+分享）÷ 觸及 | `engage / reach` |

> ★ 貼文成效列表與熱門貼文原本都只算點擊率卻標成「互動率」。
> 這兩個是不同的指標，而且實測顯示**點擊率才是內容差異最明顯的地方**
> （品牌類 19.73% vs 衛教類 3.25%），標錯會直接誤導決策。兩張表現在都並列顯示。

## 匯入（唯一入口：匯入中心）

> ★ **匯入只有一個入口 `warroom-quickimport`（匯入中心）。**
> 舊的「匯入貼文數據」`fb-upload` 已在 `switchSection()` 導向匯入中心，
> 頂部「匯入數據」按鈕與首頁卡片也都指到這裡。**不要再新增第二個匯入頁。**
> 拖曳區什麼格式都吃（已驗證 Meta 後台 xlsx 與 Metricool csv 都會自動辨識），
> 四張類型卡只是捷徑。

## 兩種來源格式

**Meta 後台匯出（xlsx，中文欄名）**——觸及完整，但沒有貼文連結以外的明細。
> ★ **時區依來源自動判斷**（`_analyzeRowsAndOpenMappingModal` 設 `_importTZ`）：
> 有「發佈時間」中文欄 = Meta 後台 → `pacific`（+15 小時）；
> 檔名是 `facebook-/instagram-/youtube-…` = Metricool → `taipei`（不換算）。
> **預設是 taipei**，只有確定是 Meta 後台才換算——判斷錯會讓整批日期差一天。
> `_serialToDateStr()` 在 taipei 模式必須直接取 UTC 牆上日期，
> **不可以再走 Intl 時區轉換**，否則會被 +8 小時推到隔天。
>
> ★ **Meta 後台的發佈時間是美西時區，不是台北時間。** 實測同一篇貼文 FB 後台寫 07-01 03:00、
> Metricool（台北）寫 07-01 18:00，固定差 15 小時。台北 00:00–15:00 發的貼文
> 直接取序號日期會少一天。`_serialToDateStr()` 負責換算，`_importTZ` 可切換。
> 讀 xlsx 時**不可用 `cellDates:true`**，那會先轉成瀏覽器本地時區的 Date，換算就套不上。

**Metricool 匯出（csv，英文欄名）**——有貼文連結、互動明細、廣告花費，
但**觸及只有 2026-06 之後才有**（實測 279 筆中 214 筆是 0）。
> ★ `Engagement` 欄是互動**率**(%)，不是次數。互動一律用 Reactions+Comments+Shared 相加。
> ★ 絕不可拿 Impressions 冒充 Reach。

欄位比對是**兩段式**：先讓完全相符的認領，再輪到部分相符。
否則「粉絲專頁名稱」會因為含有「名稱」而搶走 title。
一個系統欄位只能被一個來源欄位認領（先出現的贏），明細欄如
`Reactions - like`、`Reach (Organic)`、`日期`（值是「總期間」）會自動略過。

> ★ **Reels 從永久連結判定**：Meta 後台的「貼文類型」只有相片／影片，分不出 Reels，
> 但 `facebook.com/reel/` 的連結分得出來。實測七月 28 筆，
> 「連結含 /reel/」與「類型=影片」完全一致（28/28）。兩條匯入路徑都有做這個判定。
> ★ **FB Reels 歸「貼文」不歸「影片庫」**：`facebook-reels_*.csv` 判成 fb 類型，
> 存成 `type='影片'` + `img_type='Reels'`。影片庫留給 YT / IG / TikTok。
> ★ `typeBadge()` 沒有值時顯示「未標示」，**不可以 fallback 成「相片」**——
> 那會把 Reels 和影片謊報成相片。
> ★ **自動套用模板（`_tryAutoApplyTemplate`）那條路不會開對應視窗**，
> 所以 `_confirmMappingImport()` 移除 `#importMapModal` 前一定要判 null，
> 否則第二次匯入相同格式就會爆「Cannot read properties of null」。
> 同理，那條路也要自己呼叫 `_detectImportTZ()`，不然時區判斷會沿用上次的值。
> ★ `_openImportMappingModal()` 每次都要先 `document.querySelectorAll('#importMapModal').forEach(el=>el.remove())`，
> 否則一次拖多檔時 DOM 會有多組同 id 的 `impMap_N`，欄位對應整個錯位。

## 跨管道標籤

標籤庫 `store.mediaTags`（186 個詞、11 類）為所有管道共用，各管道資料的 `tags` 存**標籤名稱**
（門診表 `mediaItems` 例外，可能存 ID，比對時兩種都要認）。

- `suggestTags(text)`：用標籤庫＋`TAG_ALIASES` 做關鍵字比對。儀器類別名要**收緊**，
  放寬會互相誤標（例：「機械手臂」同時中達文西與 MAKO）。
- `openAutoTagModal()`：掃描全管道 → 預覽 → 一鍵套用，只新增不移除。
- `batchTagFiltered(chKey, getRows)`：以「目前列表篩選結果」為選取範圍批次上標籤。
- `quickTagRow(chKey, idx)` / `tagCellHtml()`：列表內直接改標籤。
- 跨管道統計支援**關鍵字模式**（同時比對標籤與標題），沒上標籤的資料也搜得到。
- **標籤條件可疊加**：`_ctTags` 存多個標籤，`ctMatchMode` 決定符合全部(AND)或任一(OR)。
  關鍵字與標籤條件之間永遠是 AND。查詢畫面與推廣報告**共用同一套比對邏輯**，
  改一邊就要改另一邊，否則畫面一套、報告另一套。
- 標籤類別有 **`doctor`（醫師）**。原本沒有這個類別，同事只能把醫師名字丟進「專案/議題」。
- `parseSpeakerNames()` / `openDoctorTagModal()`：從活動的 `speaker` 欄位解析醫師姓名。
  規則是**一定要有職稱**（醫師／主任／老師／個管師／PT…）才算人，先層層剝掉前面的單位
  （XX部／XX科／XX中心／XX基金會），再取職稱前的中文姓名；`DOC_STOP` 擋掉剝完剩下的通用詞。
  「心臟科、營養科」這種只有科別、「奇美代表」這種外部單位都不會被誤判成人名。

## 檔期（Campaign）與判讀引擎

**檔期主檔** `store.campaigns`。各筆資料沿用既有的 `campaign` 欄位（存**檔期名稱**），
所以既有的 Campaign 成果看板不必改就吃得到。改檔期名稱時 `saveCampaign()` 會一併搬移歸屬。
選檔期會透過 `inheritCampaignTags()` 自動帶入檔期標籤——這是減少重複填寫的核心。

**判讀引擎** `buildInsightFacts(kind, ym)` 產出事實表；所有數字都在這裡算完。

- 一律用**中位數**比較，平均會被爆款拉歪
- 組間差異用 `_permTestMedian()` 置換檢定（樣本小又偏態，不能用 t 檢定）
- `p < 0.05` 才標 `confirmed`，否則降級成 `observed`，**永遠不寫成結論**
- 之後接 AI 時，**AI 只讀事實表，不得自己算任何數字**——否則會生出不存在的數字

**投影片模型** `buildExecDeck(facts)` 產生一份模型，`renderDeckPreview()` 與 `deckToPptx()`
讀同一份，所以預覽看到什麼就是匯出什麼。

> ★ 新增任何 PPT 匯出都**必須設 `pptx.layout = 'LAYOUT_WIDE'`**。
> PptxGenJS 預設是 10 × 5.625 吋，但這裡所有座標都是照 13.333 × 7.5 吋排的，
> 沒設就會整個溢出畫布。這正是先前主管簡報與活動成果報告跑版的原因。

## 待辦

- [x] P0 止血：Drive JSON 主資料流、容量偵測、停用 GET 寫入（v4）
- [x] 跨管道標籤：關鍵字自動補標籤、批次上標籤、匯入帶標籤、關鍵字反查、標籤管理報表
- [x] 檔期主檔 + 主管簡報（自動判讀→一鍵 PPT）
- [x] P1 匯入改造：Metricool 與 Meta 後台兩種格式都可匯入，欄位對應＋時區換算
- [x] 架構精簡第一步：側欄依資料自動顯示、兩套標籤系統合併、誤導性空狀態修正
- [x] 架構精簡第二步：匯入中心、Campaign 看板／活動成效看板／總覽 Dashboard 併入所屬列表頁
- [ ] 架構精簡第三步：13 群組收成「登錄／看成效／交報告／設定」4 組
- [ ] 待決定：組合分析、內容日曆、A/B 分析、貼文預測、SOP 模板 是否收起（資料量撐不起來）
- [ ] 標籤待補：LINE 貼文表單改掉 6 個 prompt；KOL 納入跨管道統計
- [ ] P2 AI 大腦：`ktgh-hub-ai` Worker（沿用影音企劃中心的 `chat()` 轉接器，Gemini 免費層）

## 不要動的部分

- `window.BUILTIN_GA_MONTHLY`：內建 GA4 資料，格式固定
- `window.BUILTIN_POSTS`：91 篇內建貼文資料，不可刪減或改結構
- 匯出月報邏輯（`exportReport()`）：已驗證，不要重構
- 雲端主資料層（`cloudBoot` / `runCloudSave` / `_stateMeta`）：含衝突偵測與存檔確認，不要簡化

### 匯入：多檔佇列（2026-08 修）
- `_processQuickImportFile()` **必須等對應視窗確認/取消才 resolve**。它以前開完視窗就回傳，
  配上 `_openImportMappingModal()` 開頭的「移除舊視窗」，一次拖 7 個檔案時後面的檔案會把前面的
  視窗一個個蓋掉，最後只剩最後一個 — 使用者看到的就是「匯入了但沒反應」。
  改法：`_analyzeRowsAndOpenMappingModal(rows, filename, type, onDone)` 把 onDone 存進
  `window._importOnDone`，由 `_confirmMappingImport()` / `_cancelMappingImport()` 觸發。
  → **任何新的提前 return 路徑都要記得呼叫 `window._importOnDone`，否則整個佇列會卡死。**
- `window._importBatchTpl` = 同一批次內欄位組合相同的檔案自動沿用對應，每批開始時清空。
- **空欄要先剔除**：Excel 若被設成「表格」，`sheet_to_json` 會吐出到 16384 欄（欄1…欄16352）。
  照單全收 = 對應視窗畫上萬列下拉 = 瀏覽器凍住。`_analyzeRowsAndOpenMappingModal` 只保留
  前 50 列裡至少有一格有值的欄位。（實例：`2026年 06.xlsx`，32 個真欄位 + 16352 個空欄）
- `META_COL` 排除清單含 `廣告曝光次數 / 廣告 CPM / 收益估計值` — 這些是純廣告欄位，
  自然觸及的貼文一律空白，自動對應到「曝光」會讓整份報表看起來像壞掉。

### 粉專總覽的分析卡片（2026-08 改）
- 已移除「內容類型平均觸及 & 互動率」與「最強組合排行（貼文類型 × 內容）」。
  這兩張不可靠：用**平均**觸及（單篇爆文就拉高整組）、`cat` 大多沒填（實際都落在「其他」）、
  組合只要 2 篇就進榜（2 篇的平均是雜訊）。
- 換成兩張：**觸及水準與目標基準線**（中位數／Q3 達標線／Q1 警戒線，並點出平均比中位數高幾 %）
  與 **差異檢定**（`_permTestMedian` 5,000 次置換，判定「確有差異／方向性參考／看不出差異」，
  每組低於 5 篇一律標「樣本不足」）。
  → 新增比較請一律走 `addCmp()`，不要再自己算平均排名。
- `monthLabel()` 原本是寫死到 2026-03 的對照表，之後的月份會直接露出「2026-07」原始值，
  同一欄裡「12月」跟「2026-07」混著出現。已改成通用解析。
- 亮點貼文 Top 10 的月份欄改為 `fullDateCell(p.date)`（完整日期＋星期），欄寬要 `white-space:nowrap`。

### 側欄分組原則（2026-08 定案）
七組，順序就是使用流程：**登錄 → 看成效 → 各管道列表與統計 → 門診表題材 → 交報告 → 設定 → 進階/其他**
- **看成效** 只放「跨管道、不綁單一平台」的頁（總覽首頁、跨管道查詢）。
- **各管道列表與統計** 放每個管道自己的列表與數據（FB／LINE／影音／官網／SEO／活動／新聞）。
  儀表板與列表屬於同一管道就放一起，不要因為叫「儀表板」就丟去看成效。
- **門診表題材**（`clinic-items`）：門診表是傳達管道之一，所以歸在「各管道列表與統計」。
  原本的「題材列表」與「主題統計」是同一份 `store.mediaItems` 的兩個視圖，已合併成一頁：
  上方主題統計吃**已篩選**的結果，下方列表可切「卡片／表格」（`_clinicView`，存 `ktgh_clinic_view`）。
  `renderClinicMatrix()` 保留成 `renderClinicItems()` 的別名，既有呼叫點不必全改；
  月份一律讀 `clinicItemMonthFilter`（`''` = 全年），`clinicMatrixMonth` 已不存在。
- 新增頁面時先問「這頁綁定單一管道嗎」：綁 → 各管道；不綁且是給人看結論 → 看成效。
- `restoreNavState()` 的預設收合清單比對的是 **群組 data-key**（entry/perf/channel/clinic/report/config/adv），
  舊版寫成 warroom/fb/event 這種區塊名稱，永遠對不上，導致每一組都被收起來。已修，
  預設只收 `adv`。分組改動時記得升 `ktgh_nav_collapsed_vN` 的版號，否則舊的收合記錄會亂套。
- KOL 成效追蹤移入 `NAV_ADVANCED`（合作檔次少，不必每月看），要用時按「顯示全部項目」。
