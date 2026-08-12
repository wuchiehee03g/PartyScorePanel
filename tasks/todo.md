# PartyScorePanel 修復計畫

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
- 專案外 `PartyScorePanel-藍新送審資料` 已建立說明／範本／檢查文件與正式畫面證明；送件前仍須補真實客服與申請人資料，並取得藍新書面可承作回覆。

## PartyScorePanel 品牌更名

- [x] 保留 Firebase Project ID、Database `betpanel` 根路徑與既有資料
- [x] 更新玩家頁、主持人頁、服務政策、展示頁及積分報告品牌
- [x] 更新 README、產品設計文件、套件名稱與測試
- [x] 將藍新送審資料包品牌與網址改為 PartyScorePanel
- [x] 重新命名 GitHub Repository 並更新本機 remote
- [ ] 驗證新 GitHub Pages 網址、Firebase 匿名登入與公開品牌
- [ ] 更新送審畫面證明

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

## 正式流程、時間邊界與白話說明

- [x] 盤點玩家、主持人與服務說明頁的完整操作及時間判定
- [x] 將參與方式、計分方式與單場收費改成一眼能懂的說明
- [x] 統一並測試 6 小時倒數、到期邊界與背景分頁恢復行為
- [x] 整理付款到啟用的時間流程與正式上線前必要條件
- [x] 執行核心、inline script、JSON 與 Rules Emulator 回歸測試
- [x] 在 GitHub Pages 實際走完建房、出題、參與、截止、公布、報表與封存
- [x] 推送正式版本並完成手機／桌面頁面驗證

### Review

- 正式房 `2WM47A` 完成實際端對端流程：三選一發布、250 Pts 提交、全部截止、結果公布、全場報告、題目封存與活動封存。
- 玩家端正確顯示答對總計 750 Pts、該題淨 +500 Pts；連同既有二選一結果，全場累計風險 350 Pts、淨積分 +600 Pts。
- 截止後玩家端立即移除提交表單；公布後結果不可撤回；封存後玩家與主持人只可查閱，題目、預測及積分紀錄仍保留。
- 端對端測試發現並修正「封存後仍顯示剩餘時間及可操作輸入」問題；正式頁現已顯示唯讀狀態並停用發布控制。
- `npm.cmd run check`：14 項核心／靜態測試與兩頁 inline script 全數通過。
- `npm.cmd run test:rules`：7 組 Realtime Database Rules Emulator 測試全數通過；本次未修改或部署 Rules。
- GitHub Pages 已載入 `plain-flow1`，參與者頁、主持人頁及服務說明頁均無 console error。
- 正式收款前仍須完成：支付 webhook 後端、付款確認後立即開房、私人管理權杖／跨裝置復原、冪等對帳及退款拒付流程；詳見 `PAYMENT_READINESS.md`。

## 低摩擦房間復原與送審內容原則

- [x] 定義同瀏覽器自動恢復、私人管理 QR／復原碼及選填 Email 備援流程
- [x] 設計不改 `hostUid` 的安全復原權杖與 Firebase Custom Token 邊界
- [x] 清理公開 Repository 的指定敏感註解，保留包廂及 KTV 內容
- [x] 補充送審後一般更新與重大服務變更的處理原則
- [x] 增補靜態回歸測試並完成 JavaScript、inline script 與 JSON 驗證

### Review

- 新增 `ROOM_RECOVERY_DESIGN.md`：同瀏覽器自動恢復、活動 QR 與私人管理 QR 分離、Email 選填、一次性 128-bit 權杖、雜湊保存、撤銷輪替及 Custom Token 原 UID 復原。
- 活動代碼、公開 QR、暱稱與既有 PIN 均不得接管主持人後台；Email 不得寫入公開房間 config。
- 復原功能尚未假裝放入正式 UI；需等支付 webhook、私有訂單資料庫、寄信服務及 Cloud Functions 一起實作。
- Repository 已移除指定敏感註解，保留包廂與 KTV 使用情境；高辨識度博弈類預設已於後續低敏感範本改版移除。
- 新增 `NEWEB_CONTENT_CHANGE_POLICY.md`：一般維護可持續進行，敏感範本或服務本質變更應先取得支付商書面確認，不採送審時隱藏、核准後恢復的方式。
- `npm.cmd run check`：15 項核心／靜態測試及兩頁 inline script 全數通過；正式與範例 Rules、`firebase.json` 均為合法 JSON，本次未修改 Rules。

## 低敏感活動範本與好友體驗碼

- [x] 移除高辨識度博弈類官方預設並更新快取版本
- [x] 將骰子分類改為派對對決，保留吹牛、KTV、猜歌方向與划拳活動
- [x] 將共用預設常數改為中性 `ACTIVITY_PRESETS`
- [x] 定義同一組體驗碼、每個已驗證 Email 免費一次的可信後端流程
- [x] 在公開 Repo 之外預留一組好友體驗碼
- [ ] 串接付款／寄信後端後，實作體驗碼驗證、原子兌換及六小時房間核發
- [ ] 部署並實際驗證好友體驗碼成功、重複、過期、停用與併發案例

### Review

- 高敏感預設已從新題目快速範本移除，既有房間及已建立題目不受影響。
- 好友體驗碼只對軟體房間費用提供一次免費，不建立玩家錢包、活動點數、返佣或多層推薦。
- 正式後端尚未存在，因此目前只完成安全資料模型、預留私密代碼與測試規格；Demo 目前本來就能免費建立房間。
- `npm.cmd run check` 共 16 項核心／靜態測試及兩頁 inline script 全數通過；正式與範例 Rules、`firebase.json` 均為合法 JSON，本次未修改 Rules。

## 正式送審一致性更新

- [x] 盤點公開網站、專案文件與藍新送審資料包的內容差異
- [x] 公開政策頁補充目前官方活動範本與內容管理邊界
- [x] 更新藍新產品說明、商店文案、預審信、技術說明與官方規範摘要
- [x] 新增目前完成度、不可送件項目與好友免費場次揭露文件
- [x] 依可驗證現況更新正式送件檢查表，不預先勾選尚未完成事項
- [ ] 完成玩家／主持人最終操作畫面證明（政策頁與證明說明已更新）
- [x] 執行程式、inline script、JSON 與內容一致性驗證
- [x] 提交並推送 GitHub Pages

### 原則

- 只描述目前實際功能或明確標示為「規劃中」的流程，不把尚未存在的付款、Email、房間復原或好友碼後端寫成已完成。
- 公開網站與送審資料長期維持一致；不採核准前隱藏、核准後恢復高敏感內容的方式。
- 本輪不改 Realtime Database Rules，不影響既有房間或歷史資料。

### Review

- 公開 `service-info.html` 已補充低敏感官方範本、自訂內容管理及好友優惠尚需可信後端的邊界，GitHub Pages 已確認載入 `review-ready1`。
- 藍新資料包新增 `10_目前完成度與送件缺口.md` 與 `11_好友免費場次送審說明.md`，並同步更新產品、流程、積分、商店文案、預審信、技術、規範與檢查表。
- `npm.cmd run check`：16 項核心／靜態測試及兩頁 inline script 全數通過；JSON 合法，敏感官方範本與好友碼明文未出現在公開前端。
- Firebase Database Emulator：7 組 Rules 測試全數通過；本輪未修改或部署 Rules。
- 正式政策頁畫面已更新；玩家／主持人自動擷取時仍處於匿名登入初始化，已在送審清單明確標為待用專用測試房間重拍，未誤列為完成。
