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
| 目前版本     | `v1.0`                                                      |

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
7. `#section-import` — FB Excel 匯入（UI 完成，解析邏輯待實作）

## 待辦

- [ ] FB Excel 匯入解析邏輯（`parseFBExcel()`）
- [ ] Google Sheets 後端串接（GAS Phase 2）
- [ ] Gemini API 自動標籤貼文類別

## 不要動的部分

- `window.BUILTIN_GA_MONTHLY`：內建 GA4 資料，格式固定
- `window.BUILTIN_POSTS`：91 篇內建貼文資料，不可刪減或改結構
- 匯出月報邏輯（`exportReport()`）：已驗證，不要重構
