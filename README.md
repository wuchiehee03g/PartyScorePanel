# BetPanel · 現場互動預測積分平台

BetPanel 是給現場派對、團體活動與私人聚會使用的即時預測積分 SaaS。目前仍是 Demo／測試階段，沒有玩家錢包、儲值、點數移轉、兌換、提領或現金派彩功能。

## 產品模型

- 主辦方一次購買一個活動房間使用權：預計 NT$200／6 小時；付款只購買軟體使用時間。
- 不販售或預先分配參與者積分。參與者可為每次預測自行輸入風險分數。
- 新題目採「選項數正負淨分」：`N` 個選項，正確時顯示含原投入的總計 `NR`，帳本淨變動為 `+(N-1)R`；錯誤時總計 `0R`、帳本淨變動 `-R`。`R` 是該次風險分數。
- 積分可以為負數，但沒有台幣匯率，不可購買、轉讓、兌換、提領或折抵服務。
- 主持人可查看逐人正負積分、全體淨積分與不同結果模擬；平台不把全體淨分的相反數登記為主持人收益，也不建立應收、應付、收款或付款流程。
- 新題目沒有使用者可調整的賠率、抽水或現金派彩欄位；含投入總計只是活動積分的顯示拆解，正負帳本仍使用淨變動。
- 官方快速範本目前以猜歌、KTV 歡唱評分、猜拳與划拳、現場勝負預測、安全飲品挑戰及團體任務為主，不提供賭場、牌桌或骰局類官方範本；自訂題目仍須遵守禁止違法用途的使用條款。

新建 Demo 房間會記錄 `billingMode: single_room_6h_twd_200`、`scoringMode: option_count_net_v1`、`accessMode: demo`、`activatedAt` 與 `expiresAt`。到期後停止新預測、新題目與戰況，但仍可讀取資料，主持人也可截止預測、公布結果與封存。舊房沒有 `expiresAt`，會以 legacy 相容模式繼續運作，不會被回算為已到期；舊版固定賠率資料只保留讀取與完成既有生命週期的相容邏輯。

> 「測試啟用 6 小時」不代表已付款。目前沒有串接任何真實金流。

## 付款整合邊界

完整的付款、啟用、到期、斷線與跨裝置風險整理在 [PAYMENT_READINESS.md](PAYMENT_READINESS.md)。正式版本採「付款確認後建立房間並立即開始 6 小時」；關閉、重新整理或重新進入都不會重新起算或延長。

正式付款不能由瀏覽器成功頁直接啟用房間。建議流程：

1. 後端建立一筆固定 NT$200 的單場訂單，綁定主辦方 UID 與房間 ID。
2. 使用者跳轉第三方支付商的代管付款頁。
3. Cloud Functions 驗證支付商 webhook 的簽章、金額、幣別、付款狀態與重送冪等性。
4. 驗證成功後，由 Admin SDK 寫入不可由前端修改的 `roomAccess/{roomId}` 六小時授權。
5. 退款、拒付、人工補單與授權復原全部保留伺服器稽核紀錄。

`roomAccess` 與 `privatePayments` 已在 Firebase Rules 中設為前端不可讀寫；真正串接前仍需實作 Cloud Functions、訂單資料庫及[低摩擦房間復原機制](ROOM_RECOVERY_DESIGN.md)。正式版本不要求傳統帳號密碼：同瀏覽器自動恢復，另提供私人管理 QR／復原碼及選填 Email 備援。Anonymous Auth 若因清除網站資料而更換 UID，仍須由可信後端驗證私人權杖並核發原 `hostUid` 的 Custom Token，不能只靠公開活動代碼接管。

好友推廣不恢復舊版玩家儲值或兌換碼；[好友體驗碼](FRIEND_PROMO_DESIGN.md)只免除一次六小時軟體房間費用。同一組碼要限制每人一次時，僅兌換免費優惠者需要驗證 Email，由後端交易防止重複領取。

藍新金流官方雖允許自然人註冊，但其[商店管理規範](https://www.newebpay.com/website/Page/content/store_policy)把「賭場及博奕相關產業」列為禁止項目。BetPanel 在申請前應如實提供自訂風險分數、正負計分公式與主持人報表的完整流程，先取得藍新業務／法遵的書面可承作確認，並完成台灣法律專業評估；本次產品調整不構成核准或法律合規保證。

網站核准後仍可進行一般維護，但新增敏感範本、金流或改變服務定位應先取得藍新確認；不可用送審時暫時隱藏、核准後再恢復的方式規避審查。詳細原則見 [NEWEB_CONTENT_CHANGE_POLICY.md](NEWEB_CONTENT_CHANGE_POLICY.md)。

## 現有功能

- Firebase Anonymous Authentication
- 參與者掃碼／輸入代碼加入活動
- 自訂風險分數與送出前正負分預覽
- 依選項數固定的正負淨分規則
- 公開活動紀錄、個人紀錄與正負積分
- 主持人結果模擬、逐人積分報表、截止預測、不可逆結果公布、封存與審計紀錄
- 即時預測動態與主持人戰況推播
- 骰子、划拳、派對挑戰、國王大冒險等快速預測範本

地方遊戲規則可能不同，範本只描述常見玩法，均以本局主辦方事前說明為準。

## 資料與安全

- 主要資料：`betpanel/rooms/{roomId}/{config,markets,bets,updates,auditLogs}`。
- 參與者只能新增自己的預測；不能修改或刪除既有預測。
- 主辦方只能管理 `hostUid` 與登入 UID 相同的房間。
- 公布結果後不可撤銷或更換；封存保留所有題目、預測與審計資料。
- `updates` 與 `auditLogs` 只能追加，不能修改或刪除。
- 舊 `/hosts` 與 `/redeemCodes` 資料不會被本次改版刪除，但已停止前端使用，且 Rules 禁止公開讀取與前端寫入。
- 房間目前為公開讀取，因此 `config.pin` 仍可被讀到；PIN 只用於本機後台辨識，不是授權邊界，寫入權限由 Firebase Auth UID 與 Rules 保護。

## 主要檔案

```text
index.html                              玩家頁
banker.html                             主辦方後台
app.js                                 共用風險分數、正負計分與報表邏輯
style.css                              視覺樣式
database.rules.json                    正式 Realtime Database Rules
firebase.database.rules.example.json   同步的 Rules 範例
tests/                                 核心與 Rules 回歸測試
```

## 本機驗證

```powershell
npm install
npm run check
npm run test:rules
```

`npm run check` 會檢查 `app.js`、兩頁 inline script、核心測試及 Rules JSON。Rules 測試需要 Firebase Database Emulator 與 Java 21。

## 部署

- GitHub Pages 玩家頁：<https://wuchiehee03g.github.io/BetPanel/index.html>
- GitHub Pages 主辦方頁：<https://wuchiehee03g.github.io/BetPanel/banker.html>
- GitHub Pages 由 `main` branch 自動部署。
- Firebase Rules 只有在確認需求及測試通過後才執行：

```powershell
firebase.cmd deploy --only database --project betpanel-249dc
```

本次改版不會自動部署 Rules、提交 Git 或推送 GitHub。
