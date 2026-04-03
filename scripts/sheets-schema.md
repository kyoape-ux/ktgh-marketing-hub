# Google Sheets 資料結構

## 工作表：processed_posts

| 欄位         | 類型   | 說明                        | 範例                    |
|--------------|--------|-----------------------------|-------------------------|
| id           | String | FB 貼文編號（唯一鍵）        | `1600600000000000`      |
| date         | Date   | 發佈日期                    | `2026-03-26`            |
| title        | String | 標題（前 60 字）             | `元宵節 Moomin 快閃送暖` |
| type         | String | 貼文類型                    | `相片` / `影片`          |
| cat          | String | 內容分類（自動標籤）          | `品牌/節慶`              |
| reach        | Number | 觸及人數                    | `13500`                 |
| click        | Number | 總點擊次數                  | `5225`                  |
| engage       | Number | 心情+留言+分享合計           | `347`                   |
| likes        | Number | 心情數                      | `320`                   |
| comments     | Number | 留言數                      | `12`                    |
| shares       | Number | 分享數                      | `15`                    |
| month        | String | 月份索引                    | `2026-03`               |
| url          | String | FB 永久連結                  | `https://...`           |
| import_at    | Date   | 匯入時間戳                  | `2026-04-01 10:23:00`   |

---

## 工作表：events

| 欄位     | 類型   | 說明       |
|----------|--------|------------|
| date     | Date   | 活動日期   |
| name     | String | 活動名稱   |
| type     | String | 活動類型   |
| campus   | String | 院區       |
| reg      | Number | 報名人數   |
| attend   | Number | 出席人數   |
| reach    | Number | FB 觸及    |
| sat      | Number | 滿意度 1-5 |
| speaker  | String | 主講者     |
| note     | String | 備註       |
| created_at | Date | 建立時間   |

---

## 工作表：media

| 欄位     | 類型   | 說明         |
|----------|--------|--------------|
| date     | Date   | 曝光日期     |
| name     | String | 媒體名稱     |
| type     | String | 媒體類型     |
| section  | String | 版位/欄目    |
| title    | String | 報導標題     |
| nature   | String | 曝光性質     |
| reach    | Number | 預估觸及     |
| url      | String | 連結         |
| note     | String | 備註         |
| created_at | Date | 建立時間     |

---

## 初始化 Sheets 的 Apps Script 指令
```javascript
function initSheets() {
  const ss = SpreadsheetApp.openById('YOUR_ID');

  const schemas = {
    'processed_posts': ['id','date','title','type','cat','reach','click','engage','likes','comments','shares','month','url','import_at'],
    'events':  ['date','name','type','campus','reg','attend','reach','sat','speaker','note','created_at'],
    'media':   ['date','name','type','section','title','nature','reach','url','note','created_at'],
  };

  Object.entries(schemas).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
         .setBackground('#006341').setFontColor('#ffffff').setFontWeight('bold');
  });
}
```
