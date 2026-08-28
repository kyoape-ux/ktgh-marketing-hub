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

## 待辦

- [x] P0 止血：Drive JSON 主資料流、容量偵測、停用 GET 寫入（v4）
- [ ] P1 匯入改造：欄位對應彈窗 + Metricool preset + 互動數拆細
- [ ] P2 AI 大腦：`ktgh-hub-ai` Worker（沿用影音企劃中心的 `chat()` 轉接器，Gemini 免費層）

## 不要動的部分

- `window.BUILTIN_GA_MONTHLY`：內建 GA4 資料，格式固定
- `window.BUILTIN_POSTS`：91 篇內建貼文資料，不可刪減或改結構
- 匯出月報邏輯（`exportReport()`）：已驗證，不要重構
- 雲端主資料層（`cloudBoot` / `runCloudSave` / `_stateMeta`）：含衝突偵測與存檔確認，不要簡化
