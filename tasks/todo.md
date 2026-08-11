# BetPanel 修復計畫

- [x] 統一派彩預覽與實際結算計算
- [x] 修正玩家身份分組與房間代碼驗證
- [x] 修正房間／盤口封存與結算終態
- [x] 強化下注、審計與戰況 Firebase Rules
- [x] 當時先保留前端儲值、兌換與推薦功能（後續已由單次場次方案取代）
- [x] 更新快取版本與 README
- [x] 完成 JavaScript、HTML inline script、JSON 與規則驗證

## Review

- `npm run check`：6 項核心測試通過，兩頁 inline script 均通過 `node --check`。
- `npm run test:rules`：4 組 Firebase Database Emulator 權限測試通過。
- 正式與範例 Rules 保持完全一致。
- 未部署 Firebase Rules、未推送 Git。
- 此段為前一階段修復紀錄；最新產品決策已移除前端儲值、兌換與推薦流程。

## 單次場次 SaaS 改版

- [x] 盤點儲值、推薦、房間建立與期限相關程式
- [x] 移除錢包／儲值／兌換／推薦產品流程，保留無餘額活動點數
- [x] 加入 NT$200／6 小時單場 Demo 授權與舊房相容期限
- [x] 強化 Firebase Rules 的場次狀態、期限與盤口選項不可變限制
- [x] 更新玩家／莊家文案、README 與快取版本
- [x] 增補核心與 Rules 回歸測試
- [x] 同步至正式工作區並驗證檔案一致

### Review

- `npm run check`：9 項核心／靜態測試通過，兩頁 inline script 通過 `node --check`。
- `npm run test:rules`：7 組 Firebase Database Emulator 測試通過。
- 驗證新場次固定 6 小時、不可延長；到期後阻擋新活動但允許封盤、結算、盤口與房間封存。
- 驗證既有盤口選項／賠率不可修改或刪除，舊房仍可依既有生命週期運作。
- 尚未串接或模擬藍新付款成功；正式付款須由後端 webhook 核發 `roomAccess`。
- 未部署 Firebase Rules、未提交或推送 Git。

## 正負風險積分模式

- [x] 將固定賠率與抽水模型改為選項數決定的正負淨分模型
- [x] 保留玩家自訂風險分數、即時動態、截止、結果公布與逐局紀錄
- [x] 將莊家後台改為主持人控制台與完整參與者積分報表
- [x] 移除主持人盈虧、應收應付、抽水、本金返還及派彩語意
- [x] 保留舊房與既有下注資料的唯讀／結算相容
- [x] 更新 Database Rules、README、快取版本與回歸測試
- [x] 完成 JavaScript、inline script、JSON、核心及 Rules Emulator 驗證

### Review

- 完整固定賠率／零錢包版本已建立復原 commit：`2f18d29`。
- 新題目寫入 `scoringMode: option_count_net_v1`，玩家自行輸入 `riskPoints`；N 選一答對 `+(N-1)R`、答錯 `-R`。
- 主持人仍可查看逐人正負積分、全體淨積分及每個可能結果的模擬，但不建立主持人盈虧或收付帳。
- 舊題目保留原始 `amount`／`oddsAtBet` 相容讀取及完成既有生命週期；新題目不得再建立固定賠率模式。
- `npm.cmd run check`：11 項核心／靜態測試通過，兩頁 inline script 通過 `node --check`。
- `npm.cmd run test:rules`：7 組 Realtime Database Emulator 測試通過。
- 本機瀏覽器實測玩家入口與主持人建立頁，無 console error，桌面版面顯示正常。
- 尚未部署 Firebase Rules、尚未推送 GitHub；正式金流仍須由可信後端 webhook 核發場次授權。

## 上線與藍新送審準備

- [x] 確認 `main`、復原提交、遠端與部署目標
- [x] 依藍新官方規範補齊公開服務資訊與政策入口
- [x] 在專案外建立不公開的藍新送審資料夾與待填清單
- [x] 重跑程式、HTML inline script、JSON 與 Rules Emulator 測試
- [x] 部署 Realtime Database Rules 至 `betpanel-249dc`
- [x] 推送 `main` 並確認 GitHub Pages 已更新
- [x] 保存正式頁面截圖與完成送件前缺項盤點

### Review

- `npm.cmd run check`：11 項核心／靜態測試通過，兩頁 inline script 通過 `node --check`。
- `npm.cmd run test:rules`：7 組 Realtime Database Emulator 測試通過。
- `firebase.cmd deploy --only database --project betpanel-249dc`：正式 Rules 語法檢查與發布成功。
- GitHub `main` 已推送，正式參與者頁、主持人頁與服務政策頁均顯示新版內容。
- 正式頁面重新載入後 Firebase Anonymous Auth 連線成功，三頁未出現新的 console error。
- 專案外 `BetPanel-藍新送審資料` 已建立 11 份說明／範本／檢查文件與 3 張正式畫面證明；送件前仍須補真實客服與申請人資料，並取得藍新書面可承作回覆。

## 正式玩家提交失敗修復

- [x] 在正式環境建立新房、發布題目並完成玩家提交回歸
- [x] 使用者重新整理後確認原頁面可正常提交
- [x] 將權限、身份、離線與暫時連線錯誤改為不同提示
- [x] 增加錯誤提示靜態回歸測試
- [x] 隨含投入總計版本完成測試與 GitHub Pages 更新

### Review

- 正式測試房 `2WM47A` 已成功寫入 100 Pts 預測；沒有重現 Rules 拒絕，原問題較符合頁面更新／短暫連線狀態。
- 不修改或放寬 Firebase Rules；前端不再將所有失敗統稱為網路錯誤。
- `npm.cmd run check` 已通過 12 項測試；正式玩家頁重新驗證連線與資料顯示正常。

## 含投入總計顯示

- [x] 確認總計與淨積分不可重複計算
- [x] 增加答對 `NR`／答錯 `0R` 的含投入總計函式
- [x] 玩家選項、預覽、公開紀錄及個人紀錄改為總計／淨分雙層顯示
- [x] 主持人題目摘要與公開服務說明同步公式
- [x] 更新回歸測試、快取版本並完成上線驗證

### Review

- 採「二選一總計 2R（含投入；淨 +1R）」文字，不使用 `x2.00` 或賠率標示；底層結果與既有資料不變。
- `npm.cmd run check`：12 項核心／靜態測試與兩頁 inline script 全數通過。
- `npm.cmd run test:rules`：7 組 Realtime Database Rules 測試全數通過；本次未修改或重新部署 Rules。
- GitHub Pages 已載入 `app.js?v=gross-score1`；390×844 手機驗證顯示 1,000 Pts 的答對總計 2,000（淨 +1,000）、答錯總計 0（淨 −1,000），無 console error。
