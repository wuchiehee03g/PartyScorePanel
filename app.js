/**
 * BetPanel · 現場互動預測積分平台
 * 核心引擎 (Core Engine v4.0 - Signed Score Edition)
 * 包含：單場授權、自訂風險分數、選項數計分、參與者積分報表與 Web Audio 音效
 */

const firebaseConfig = {
  apiKey: "AIzaSyDfMIkPI9fdeYg5sVuL4fLHcbSxxtfVgPM",
  authDomain: "betpanel-249dc.firebaseapp.com",
  databaseURL: "https://betpanel-249dc-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "betpanel-249dc",
  appId: "1:833468168241:web:f8267242dd2ab7c1277d10",
  messagingSenderId: "833468168241",
};

const DB_PATH = 'betpanel';
const LEGACY_DEFAULT_ODDS = 2;
const DEFAULT_MAX_RISK_POINTS = 10000;
const QUICK_AMOUNTS = [100, 500, 1000, 5000];
const SESSION_PRICE_TWD = 200;
const SESSION_DURATION_MS = 6 * 60 * 60 * 1000;
const SCORE_MODE = 'option_count_net_v1';

const CATEGORIES = [
  { key: 'duel', label: '1v1 對決', hint: '兩人對決，預測誰勝出' },
  { key: 'multi', label: '多選一', hint: '選項愈多，正確淨分愈高' },
  { key: 'custom', label: '自訂題目', hint: '自由設定預測選項' },
];

// 現場活動／包廂熱門預測題目
const NIGHTLIFE_PRESETS = [
  { id:'dice_duel', group:'dice', title:'吹牛對決 (1v1)', desc:'輪流喊數並可質疑，依現場約定判定勝負', category:'duel', options:[{label:'選手 A'},{label:'選手 B'}] },
  { id:'niuniu', group:'dice', title:'妞妞（牛牛）', desc:'常見五張牌玩法：三張湊十的倍數，剩兩張比牛數；牌型以本局主持人說明為準', category:'duel', options:[{label:'玩家勝'},{label:'主持人方勝'}] },
  { id:'sicbo', group:'dice', title:'骰寶', desc:'常見為三顆骰子：總和 4–10 為小、11–17 為大，圍骰另計；以本局主持人說明為準', category:'custom', options:[{label:'大 (11-17)'},{label:'小 (4-10)'},{label:'圍骰／豹子 (三同數)'}] },
  { id:'blackjack', group:'dice', title:'21 點', desc:'常見玩法以接近 21 且不爆牌為目標；補牌與和局規則以本局主持人說明為準', category:'multi', options:[{label:'玩家勝'},{label:'主持人方勝'},{label:'和局'}] },
  { id:'eighteen', group:'dice', title:'十八啦', desc:'常見為四骰配對與剩餘點數計分，地方規則差異較大；以本局主持人說明為準', category:'duel', options:[{label:'玩家方勝'},{label:'主持人方勝'}] },







  { id:'singapore_punch', group:'punch', title:'新加坡拳', desc:'常見為拍手、猜拳決定攻守，再比上下左右；以本局主持人說明為準', category:'duel', options:[{label:'選手 A'},{label:'選手 B'}] },
  { id:'punch_5_10_15', group:'punch', title:'5／10／15 划拳', desc:'常見為雙手以 0／5 出拳並喊總數，不是局數；以本局主持人說明為準', category:'duel', options:[{label:'選手 A'},{label:'選手 B'}] },
  { id:'seaweed_punch', group:'punch', title:'海帶拳', desc:'常見使用「海帶呀海帶」口訣與手勢攻守輪替；以本局主持人說明為準', category:'duel', options:[{label:'選手 A'},{label:'選手 B'}] },
  { id:'drink_speed', group:'challenge', title:'飲品速度挑戰', desc:'同樣份量，預測誰先完成；請以安全、適量或無酒精飲品進行', category:'duel', options:[{label:'選手 A'},{label:'選手 B'}] },
  { id:'drink_volume', group:'challenge', title:'限時飲用量挑戰', desc:'同樣時間，預測誰完成更多；請以安全、適量或無酒精飲品進行', category:'duel', options:[{label:'選手 A'},{label:'選手 B'}] },
  { id:'drink_target', group:'challenge', title:'指定杯數挑戰', desc:'預測誰先完成指定杯數；請以安全、適量或無酒精飲品進行', category:'duel', options:[{label:'選手 A'},{label:'選手 B'}] },
  { id:'ktv_score', group:'challenge', title:'KTV 歡唱評分對決', desc:'預測下一首歌是否突破 90 分', category:'custom', options:[{label:'高分突破 (>=90)'},{label:'未達標準 (<90)'}] },
  { id:'king_mild', group:'king', title:'國王大冒險｜輕度', desc:'輕度互動挑戰，請先取得參與者同意', category:'multi', options:[{label:'指定唱歌'},{label:'趣味問答'},{label:'模仿動作'},{label:'分享故事'}] },
  { id:'king_medium', group:'king', title:'國王大冒險｜中度', desc:'中度互動挑戰，請先取得參與者同意', category:'multi', options:[{label:'即興表演'},{label:'指定舞步'},{label:'真心話'},{label:'團體任務'}] },
  { id:'king_extreme', group:'king', title:'國王大冒險｜高強度', desc:'高強度活動僅作展示，禁止危險、羞辱或強迫飲酒', category:'multi', options:[{label:'高難度表演'},{label:'團體接力'},{label:'即興挑戰'},{label:'安全替代任務'}] }
];

/* =========================================
 * 1. 基礎工具 (Utility)
 * ========================================= */

function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmt(n) {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('en-US');
}

function roundPoints(n) {
  const value = Number(n);
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function uid() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

/* =========================================
 * 2. 音效引擎 (Web Audio API Sound Engine)
 * ========================================= */

const SoundEngine = {
  ctx: null,
  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) this.ctx = new AudioContextClass();
    }
  },
  isMuted() {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('bp_sfx_muted') === 'true';
  },
  toggleMute() {
    const muted = !this.isMuted();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('bp_sfx_muted', muted ? 'true' : 'false');
    }
    return muted;
  },
  playTone(freq, type, duration, gainVal = 0.1) {
    if (this.isMuted()) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  },
  playChip() {
    this.playTone(1200, 'sine', 0.08, 0.12);
  },
  playBet() {
    if (this.isMuted()) return;
    this.playTone(523.25, 'triangle', 0.1, 0.15);
    setTimeout(() => this.playTone(659.25, 'triangle', 0.15, 0.15), 70);
  },
  playWin() {
    if (this.isMuted()) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.2, 0.2), idx * 90);
    });
  },
  playLock() {
    this.playTone(220, 'sawtooth', 0.15, 0.15);
  },
  playError() {
    this.playTone(180, 'square', 0.2, 0.15);
  }
};

/* =========================================
 * 3. 主持人工作階段識別 (Host Session Identity)
 * ========================================= */

function createHostProfile(hostName, hostId = null) {
  const id = hostId || 'host_' + Math.random().toString(36).substring(2, 9);
  return {
    hostId: id,
    hostName: hostName || '活動主持人',
    createdAt: Date.now()
  };
}

/* =========================================
 * 4. 包廂管理 (Room Management)
 * ========================================= */

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < 6; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

function generateRoomPin() {
  let res = '';
  for (let i = 0; i < 4; i++) {
    res += Math.floor(Math.random() * 10).toString();
  }
  return res;
}

function createRoom(hostName, roomTitle = '', maxRiskPoints = DEFAULT_MAX_RISK_POINTS, hostId = null, activatedAt = Date.now()) {
  return {
    code: generateRoomCode(),
    hostName: hostName || '活動主持人',
    hostId: hostId || 'host_anon',
    roomTitle: roomTitle || '現場互動活動',
    hostPin: generateRoomPin(),
    status: 'active',
    accessMode: 'demo',
    billingMode: 'single_room_6h_twd_200',
    scoringMode: SCORE_MODE,
    sessionPriceTwd: SESSION_PRICE_TWD,
    activatedAt,
    expiresAt: activatedAt + SESSION_DURATION_MS,
    createdAt: activatedAt,
    maxRiskPoints: Number(maxRiskPoints),
    markets: {},
    bets: {}
  };
}

function roomDbPath(roomCode) {
  return `${DB_PATH}/rooms/${roomCode.toUpperCase()}`;
}

function isSessionExpired(state, at = Date.now()) {
  const expiresAt = Number(state && state.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > 0 && at >= expiresAt;
}

function isSessionActive(state, at = Date.now()) {
  return !!state && state.status !== 'archived' && !isSessionExpired(state, at);
}

function sessionTimeParts(state, at = Date.now()) {
  const expiresAt = Number(state && state.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
    return { legacy: true, expired: false, totalMinutes: null, hours: 0, minutes: 0 };
  }

  const remaining = expiresAt - at;
  if (remaining <= 0) {
    return { legacy: false, expired: true, totalMinutes: 0, hours: 0, minutes: 0 };
  }

  const totalMinutes = Math.ceil(remaining / 60000);
  return {
    legacy: false,
    expired: false,
    totalMinutes,
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60
  };
}

/* =========================================
 * 5. 資料正規化 (Data Normalization)
 * ========================================= */

function normalize(raw) {
  if (!raw) return { markets: [], bets: [], hostName: '活動主持人', roomTitle: '現場互動活動' };
  
  const config = raw.config || {};
  const state = {
    hostName: config.hostName || raw.hostName || '活動主持人',
    hostId: config.hostId || raw.hostId || '',
    hostUid: config.hostUid || raw.hostUid || '',
    roomTitle: config.roomTitle || raw.roomTitle || '現場互動活動',
    hostPin: config.pin || raw.hostPin || '',
    status: config.status || raw.status || 'active',
    accessMode: config.accessMode || raw.accessMode || 'legacy',
    scoringMode: config.scoringMode || raw.scoringMode || 'legacy_fixed_odds',
    sessionPriceTwd: Number.isFinite(Number(config.sessionPriceTwd)) ? Number(config.sessionPriceTwd) : null,
    activatedAt: Number(config.activatedAt || raw.activatedAt || config.createdAt || raw.createdAt) || null,
    expiresAt: Number(config.expiresAt || raw.expiresAt) || null,
    archivedAt: config.archivedAt || raw.archivedAt || null,
    rakePercent: typeof config.rake === 'number' ? (config.rake / 100) : (typeof raw.rakePercent === 'number' ? raw.rakePercent : 0),
    createdAt: config.createdAt || raw.createdAt || Date.now(),
    maxRiskPoints: typeof config.maxRiskPoints === 'number'
      ? config.maxRiskPoints
      : (typeof config.maxBet === 'number' ? config.maxBet : (typeof raw.maxBet === 'number' ? raw.maxBet : DEFAULT_MAX_RISK_POINTS)),
    markets: [],
    bets: [],
    updates: []
  };

  if (raw.updates) {
    state.updates = Object.keys(raw.updates).map(uId => ({ ...raw.updates[uId], id: uId })).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  }

  if (raw.markets) {
    state.markets = Object.keys(raw.markets).map(mId => {
      const m = raw.markets[mId];
      const options = m.options 
        ? Object.keys(m.options).map(oId => ({ ...m.options[oId], id: oId })).sort((a, b) => (a.order || 0) - (b.order || 0))
        : [];
      return {
        ...m,
        id: mId,
        options,
        scoringMode: m.scoringMode || 'legacy_fixed_odds',
        optionCount: Number(m.optionCount) || options.length,
        maxRiskPoints: Number(m.maxRiskPoints) || Number(m.maxBet) || null
      };
    });
    state.markets.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  if (raw.bets) {
    state.bets = Object.keys(raw.bets).map(bId => {
      return { ...raw.bets[bId], id: bId };
    });
    state.bets.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  }

  return state;
}

/* =========================================
 * 6. 風險分數彙總 (Risk Point Totals)
 * ========================================= */

function buildPools(state) {
  const pools = {};
  if (!state || !state.bets) return pools;
  
  for (const bet of state.bets) {
    if (!pools[bet.marketId]) pools[bet.marketId] = {};
    if (!pools[bet.marketId][bet.optionId]) pools[bet.marketId][bet.optionId] = 0;
    pools[bet.marketId][bet.optionId] += riskPointsOf(bet);
  }
  return pools;
}

function poolOf(pools, marketId, optId) {
  if (!pools[marketId]) return 0;
  return pools[marketId][optId] || 0;
}

function marketTotal(pools, market) {
  if (!market || !pools[market.id]) return 0;
  return Object.values(pools[market.id]).reduce((a, b) => a + b, 0);
}

/* =========================================
 * 7. 選項數計分引擎 (Option-count Scoring)
 * ========================================= */

function isSignedScoreMarket(market) {
  return !!market && market.scoringMode === SCORE_MODE;
}

function marketOptionCount(market) {
  if (!market) return 0;
  const count = Number(market.optionCount);
  if (Number.isInteger(count) && count >= 2) return count;
  return Array.isArray(market.options) ? market.options.length : 0;
}

function riskPointsOf(prediction) {
  if (!prediction) return 0;
  const value = prediction.riskPoints != null ? prediction.riskPoints : prediction.amount;
  return Math.max(0, Number(value) || 0);
}

function betOdds(bet) {
  return Number(bet && bet.oddsAtBet) || 1.0;
}

// 僅供既有固定賠率房間讀取與完成不可逆結算；新題目不再建立賠率或抽水欄位。
function payoutForBet(bet, market) {
  const amount = riskPointsOf(bet);
  const grossProfit = Math.max(0, amount * betOdds(bet) - amount);
  const rake = Math.max(0, Math.min(1, Number(market && market.rakePercent) || 0));
  return roundPoints(amount + grossProfit * (1 - rake));
}

function scoreMultiplierForPrediction(prediction, market) {
  if (isSignedScoreMarket(market)) {
    const locked = Number(prediction && prediction.scoreMultiplierAtPrediction);
    return Number.isInteger(locked) && locked >= 1 ? locked : Math.max(1, marketOptionCount(market) - 1);
  }
  return Math.max(0, betOdds(prediction) - 1);
}

function correctScoreForPrediction(prediction, market) {
  const riskPoints = riskPointsOf(prediction);
  if (isSignedScoreMarket(market)) {
    return roundPoints(riskPoints * scoreMultiplierForPrediction(prediction, market));
  }
  return roundPoints(payoutForBet(prediction, market) - riskPoints);
}

// 顯示用的答對總計：包含原投入的風險分數；帳本仍以 correctScoreForPrediction 記錄淨變動。
function correctTotalForPrediction(prediction, market) {
  if (!prediction || !market) return 0;
  if (isSignedScoreMarket(market)) {
    return roundPoints(riskPointsOf(prediction) + correctScoreForPrediction(prediction, market));
  }
  return payoutForBet(prediction, market);
}

function scorePreview(riskPoints, market) {
  const normalizedRisk = Math.max(0, Number(riskPoints) || 0);
  const multiplier = Math.max(1, marketOptionCount(market) - 1);
  const correct = roundPoints(normalizedRisk * multiplier);
  return {
    correct,
    correctTotal: roundPoints(normalizedRisk + correct),
    incorrect: -normalizedRisk,
    multiplier,
    totalMultiplier: multiplier + 1,
    optionCount: marketOptionCount(market)
  };
}

/* =========================================
 * 8. 盤口建立 (Market Creation)
 * ========================================= */

function buildDuelMarket(opts) {
  const { nameA, nameB, maxRiskPoints } = opts;
  
  return {
    title: `${nameA} vs ${nameB}`,
    desc: '1v1 現場預測',
    category: 'duel',
    scoringMode: SCORE_MODE,
    optionCount: 2,
    maxRiskPoints: maxRiskPoints || null,
    locked: false,
    settled: false,
    winnerId: null,
    order: Date.now(),
    options: [
      { id: 'optA', label: nameA, order: 1 },
      { id: 'optB', label: nameB, order: 2 }
    ]
  };
}

function buildCustomMarket(opts) {
  const { title, desc, options, maxRiskPoints } = opts;
  
  const mOptions = options.map((opt, idx) => ({
    id: `opt${idx}`,
    label: typeof opt === 'string' ? opt : opt.label,
    order: idx
  }));
  
  return {
    title,
    desc,
    category: 'custom',
    scoringMode: SCORE_MODE,
    optionCount: mOptions.length,
    maxRiskPoints: maxRiskPoints || null,
    locked: false,
    settled: false,
    winnerId: null,
    order: Date.now(),
    options: mOptions
  };
}

/* =========================================
 * 9. 正負積分與結果結算 (Signed Score Settlement)
 * ========================================= */

function participantNetIfResult(state, market, winOptId) {
  if (!state || !market) return 0;
  return roundPoints(state.bets.reduce((total, prediction) => {
    if (prediction.marketId !== market.id) return total;
    return total + (prediction.optionId === winOptId
      ? correctScoreForPrediction(prediction, market)
      : -riskPointsOf(prediction));
  }, 0));
}

function resultScenario(state, market, winOptId) {
  let positivePoints = 0;
  let negativePoints = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  for (const prediction of state.bets) {
    if (prediction.marketId !== market.id) continue;
    if (prediction.optionId === winOptId) {
      positivePoints += correctScoreForPrediction(prediction, market);
      correctCount++;
    } else {
      negativePoints += riskPointsOf(prediction);
      incorrectCount++;
    }
  }
  return {
    positivePoints: roundPoints(positivePoints),
    negativePoints: roundPoints(negativePoints),
    netScore: roundPoints(positivePoints - negativePoints),
    correctCount,
    incorrectCount
  };
}

function settleInfo(state, pools, market) {
  if (!market) return null;
  
  const totalRisk = marketTotal(pools, market);
  if (totalRisk === 0) {
    return { totalRisk: 0, positivePoints: 0, negativePoints: 0, netScore: 0, winRisk: 0, empty: true };
  }
  
  if (!market.winnerId) return null;
  
  const scenario = resultScenario(state, market, market.winnerId);
  return {
    totalRisk,
    positivePoints: scenario.positivePoints,
    negativePoints: scenario.negativePoints,
    netScore: scenario.netScore,
    winRisk: poolOf(pools, market.id, market.winnerId),
    empty: false
  };
}

function betOutcome(state, pools, bet) {
  const market = state.markets.find(m => m.id === bet.marketId);
  if (!market || !market.settled || !market.winnerId) {
    return { status: 'pending', score: 0, profit: 0 };
  }
  
  if (bet.optionId === market.winnerId) {
    const score = correctScoreForPrediction(bet, market);
    return { status: 'win', score, profit: score };
  } else {
    const score = -riskPointsOf(bet);
    return { status: 'lose', score, profit: score };
  }
}

function effectiveMaxRiskPoints(state, market) {
  if (market && market.maxRiskPoints !== null && market.maxRiskPoints > 0) return market.maxRiskPoints;
  return state.maxRiskPoints || DEFAULT_MAX_RISK_POINTS;
}

function validateRiskPoints(rawPoints, maxRiskPoints) {
  const points = Number(rawPoints);
  if (isNaN(points) || points <= 0) return { ok: false, reason: '請輸入有效的風險分數' };
  if (!Number.isInteger(points)) return { ok: false, reason: '風險分數必須為整數' };
  if (points > maxRiskPoints) return { ok: false, reason: `單次風險分數不能超過 ${fmt(maxRiskPoints)} Pts` };
  return { ok: true };
}

function sameNickname(n1, n2) {
  if (!n1 || !n2) return false;
  return n1.trim().toLowerCase() === n2.trim().toLowerCase();
}

function betBelongsTo(bet, authUid, bettorId) {
  if (!bet) return false;
  if (bet.bettorUid) return !!authUid && bet.bettorUid === authUid;
  if (bet.bettorId) return !!bettorId && bet.bettorId === bettorId;
  return false;
}

function getRecentActivity(state, limit = 10) {
  if (!state || !state.bets) return [];
  const sorted = [...state.bets].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, limit);
  return sorted.map(b => {
    const market = state.markets.find(m => m.id === b.marketId);
    const opt = market ? market.options.find(o => o.id === b.optionId) : null;
    return {
      id: b.id,
      name: b.name || '神秘玩家',
      marketTitle: market ? market.title : '預測題目',
      optionLabel: opt ? opt.label : '選項',
      riskPoints: riskPointsOf(b),
      ts: b.ts || Date.now()
    };
  });
}

/* =========================================
 * 10. 參與者積分報表 (Participant Score Reports)
 * ========================================= */

function reportByBettor(state, pools) {
  const map = {};
  
  for (const bet of state.bets) {
    const identity = bet.bettorUid
      ? `uid:${bet.bettorUid}`
      : (bet.bettorId ? `id:${bet.bettorId}` : `legacy:${bet.name || 'unknown'}`);
    const displayName = bet.name || bet.bettorId || '神秘玩家';
    const key = identity;
    if (!map[key]) {
      map[key] = { identity, name: displayName, totalRisk: 0, winCount: 0, loseCount: 0, pendingCount: 0, score: 0, bets: 0 };
    }
    
    map[key].totalRisk += riskPointsOf(bet);
    map[key].bets++;
    
    const outcome = betOutcome(state, pools, bet);
    if (outcome.status === 'win') {
      map[key].winCount++;
      map[key].score += outcome.score;
    } else if (outcome.status === 'lose') {
      map[key].loseCount++;
      map[key].score += outcome.score;
    } else {
      map[key].pendingCount++;
    }
  }
  
  return Object.values(map).sort((a, b) => b.score - a.score);
}

function activityScoreSummary(state, pools) {
  let settledNetScore = 0;
  let totalRisk = 0;
  let pendingRisk = 0;
  let settledPositive = 0;
  let settledNegative = 0;
  
  for (const m of state.markets) {
    const mTotal = marketTotal(pools, m);
    totalRisk += mTotal;
    if (m.settled) {
      const info = settleInfo(state, pools, m);
      if (info) {
        settledNetScore += info.netScore;
        settledPositive += info.positivePoints;
        settledNegative += info.negativePoints;
      }
    } else {
      pendingRisk += mTotal;
    }
  }
  
  return {
    settledNetScore: roundPoints(settledNetScore),
    totalRisk: roundPoints(totalRisk),
    pendingRisk: roundPoints(pendingRisk),
    settledPositive: roundPoints(settledPositive),
    settledNegative: roundPoints(settledNegative)
  };
}

function roomSettlement(state, pools) {
  let participantNetScore = 0;
  let totalPositive = 0;
  let totalNegative = 0;
  const totalRisk = roundPoints((state.bets || []).reduce((sum, prediction) => sum + riskPointsOf(prediction), 0));

  for (const m of state.markets) {
    if (!m.settled) continue;
    
    const info = settleInfo(state, pools, m);
    if (!info) continue;
    
    participantNetScore += info.netScore;
    totalPositive += info.positivePoints;
    totalNegative += info.negativePoints;
  }

  const players = reportByBettor(state, pools).map(b => ({
      identity: b.identity,
      name: b.name,
      totalRisk: b.totalRisk,
      score: b.score,
      bets: b.bets
    }));

  return {
    players: players.sort((a, b) => b.score - a.score),
    participantNetScore: roundPoints(participantNetScore),
    totalPositive: roundPoints(totalPositive),
    totalNegative: roundPoints(totalNegative),
    totalRisk
  };
}

function generateFormattedBill(state, pools) {
  if (!state) return '';
  const res = roomSettlement(state, pools);
  const nowStr = new Date().toLocaleString('zh-TW');
  
  let bill = `┌────────────────────────────────────────┐\n`;
  bill += `│   ✨ BetPanel 活動積分報告 ✨          │\n`;
  bill += `├────────────────────────────────────────┤\n`;
  bill += `  活動名稱：${state.roomTitle || '現場互動活動'}\n`;
  bill += `  主持人：${state.hostName || '活動主持人'}\n`;
  bill += `  報告時間：${nowStr}\n`;
  bill += `  累計風險分數：${fmt(res.totalRisk)} Pts\n`;
  bill += `├────────────────────────────────────────┤\n`;
  bill += `  【活動積分彙總】\n`;
  bill += `  🟢 參與者正分：+${fmt(res.totalPositive)} Pts\n`;
  bill += `  🔴 參與者負分：-${fmt(res.totalNegative)} Pts\n`;
  bill += `  📊 全體淨積分：${res.participantNetScore >= 0 ? '+' : ''}${fmt(res.participantNetScore)} Pts\n`;
  bill += `├────────────────────────────────────────┤\n`;
  bill += `  【參與者積分明細 (+/−)】\n`;
  
  if (res.players.length === 0) {
    bill += `  (尚無已公布結果的參與紀錄)\n`;
  } else {
    res.players.forEach(p => {
      const sign = p.score > 0 ? '🟢 +' : (p.score < 0 ? '🔴 -' : '⚪  ');
      bill += `  • ${p.name.padEnd(10, ' ')} : ${sign}${fmt(Math.abs(p.score))} Pts\n`;
    });
  }
  bill += `└────────────────────────────────────────┘\n`;
  bill += ` 💡 積分不可購買、轉讓或兌換；本報告不建立任何應收、應付或主持人收益。`;
  return bill;
}

/* =========================================
 * 11. 離線 SVG QR Code 繪製 (Offline QR Code Engine)
 * ========================================= */

function generateQRCodeSVG(text, size = 200) {
  const encodedText = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedText}`;
}

/* =========================================
 * 12. 標籤與輔助 (Label Helpers)
 * ========================================= */

function optionLabel(state, market, optId) {
  if (!market || !market.options) return optId;
  const opt = market.options.find(o => o.id === optId);
  return opt ? opt.label : optId;
}

function categoryLabel(key) {
  const c = CATEGORIES.find(x => x.key === key);
  return c ? c.label : key;
}

/* =========================================
 * 13. 模組匯出 (Module Export)
 * ========================================= */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    firebaseConfig,
    DB_PATH,
    LEGACY_DEFAULT_ODDS,
    DEFAULT_MAX_RISK_POINTS,
    QUICK_AMOUNTS,
    SESSION_PRICE_TWD,
    SESSION_DURATION_MS,
    SCORE_MODE,
    CATEGORIES,
    NIGHTLIFE_PRESETS,
    SoundEngine,
    esc,
    fmt,
    roundPoints,
    uid,
    createHostProfile,
    generateRoomCode,
    generateRoomPin,
    createRoom,
    roomDbPath,
    isSessionExpired,
    isSessionActive,
    sessionTimeParts,
    normalize,
    buildPools,
    poolOf,
    marketTotal,
    isSignedScoreMarket,
    marketOptionCount,
    riskPointsOf,
    scoreMultiplierForPrediction,
    correctScoreForPrediction,
    correctTotalForPrediction,
    scorePreview,
    buildDuelMarket,
    buildCustomMarket,
    betOdds,
    payoutForBet,
    participantNetIfResult,
    resultScenario,
    settleInfo,
    betOutcome,
    effectiveMaxRiskPoints,
    validateRiskPoints,
    sameNickname,
    betBelongsTo,
    getRecentActivity,
    reportByBettor,
    activityScoreSummary,
    roomSettlement,
    generateFormattedBill,
    generateQRCodeSVG,
    optionLabel,
    categoryLabel
  };
}





