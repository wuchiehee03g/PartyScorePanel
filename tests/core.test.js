const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const app = require('../app.js');

test('legacy fixed-odds records remain readable with their original calculation', () => {
  assert.equal(
    app.payoutForBet({ amount: 100, oddsAtBet: 2 }, { rakePercent: 0.05 }),
    195
  );
  assert.equal(
    app.payoutForBet({ amount: 125, oddsAtBet: 1.47 }, { rakePercent: 0.05 }),
    180.81
  );
});

test('option-count scoring exposes gross totals while preserving signed net points', () => {
  const twoOptions = { scoringMode: app.SCORE_MODE, optionCount: 2, options: [{ id: 'a' }, { id: 'b' }] };
  const threeOptions = { scoringMode: app.SCORE_MODE, optionCount: 3, options: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] };
  const fourOptions = { scoringMode: app.SCORE_MODE, optionCount: 4, options: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] };

  assert.deepEqual(app.scorePreview(100, twoOptions), { correct: 100, correctTotal: 200, incorrect: -100, multiplier: 1, totalMultiplier: 2, optionCount: 2 });
  assert.deepEqual(app.scorePreview(100, threeOptions), { correct: 200, correctTotal: 300, incorrect: -100, multiplier: 2, totalMultiplier: 3, optionCount: 3 });
  assert.deepEqual(app.scorePreview(100, fourOptions), { correct: 300, correctTotal: 400, incorrect: -100, multiplier: 3, totalMultiplier: 4, optionCount: 4 });
  assert.equal(app.correctTotalForPrediction({ riskPoints: 100, scoreMultiplierAtPrediction: 1 }, twoOptions), 200);
  assert.equal(app.correctTotalForPrediction({ riskPoints: 100, scoreMultiplierAtPrediction: 2 }, threeOptions), 300);
});

test('normalize preserves room ownership and archive state', () => {
  const state = app.normalize({
    config: {
      hostName: '主持人',
      hostUid: 'host-uid',
      status: 'archived',
      archivedAt: 123
    }
  });

  assert.equal(state.hostUid, 'host-uid');
  assert.equal(state.status, 'archived');
  assert.equal(state.archivedAt, 123);
});

test('single-session rooms last six hours while legacy rooms remain compatible', () => {
  const activatedAt = 1_000_000;
  const room = app.createRoom('主持人', '測試活動', 1000, 'host-1', activatedAt);
  assert.equal(room.billingMode, 'single_room_6h_twd_200');
  assert.equal(room.sessionPriceTwd, 200);
  assert.equal(room.scoringMode, app.SCORE_MODE);
  assert.equal(room.maxRiskPoints, 1000);
  assert.equal('rakePercent' in room, false);
  assert.equal(room.expiresAt - room.activatedAt, 6 * 60 * 60 * 1000);
  assert.equal(app.isSessionExpired(room, room.expiresAt - 1), false);
  assert.equal(app.isSessionExpired(room, room.expiresAt), true);
  assert.equal(app.isSessionActive(room, room.expiresAt), false);

  const legacy = app.normalize({ config: { hostUid: 'legacy-host', status: 'active' } });
  assert.equal(legacy.expiresAt, null);
  assert.equal(app.isSessionActive(legacy, Number.MAX_SAFE_INTEGER), true);
});

test('session countdown has an exact server-time boundary and never shows 60 minutes', () => {
  const state = { expiresAt: 6 * 60 * 60 * 1000 };
  assert.deepEqual(app.sessionTimeParts(state, 0), {
    legacy: false, expired: false, totalMinutes: 360, hours: 6, minutes: 0
  });
  assert.deepEqual(app.sessionTimeParts(state, 1000), {
    legacy: false, expired: false, totalMinutes: 360, hours: 6, minutes: 0
  });
  assert.deepEqual(app.sessionTimeParts(state, 60 * 1000), {
    legacy: false, expired: false, totalMinutes: 359, hours: 5, minutes: 59
  });
  assert.deepEqual(app.sessionTimeParts(state, state.expiresAt), {
    legacy: false, expired: true, totalMinutes: 0, hours: 0, minutes: 0
  });
  assert.equal(app.sessionTimeParts({}, Number.MAX_SAFE_INTEGER).legacy, true);
});

test('bet ownership never falls back to a matching nickname', () => {
  const bet = { bettorUid: 'user-a', bettorId: 'legacy-a', name: '同名' };
  assert.equal(app.betBelongsTo(bet, 'user-a', 'unused'), true);
  assert.equal(app.betBelongsTo(bet, 'user-b', 'legacy-a'), false);
  assert.equal(app.betBelongsTo({ bettorId: 'legacy-a', name: '同名' }, '', 'legacy-a'), true);
});

test('reports keep same-name users separate and do not exclude host-name collisions', () => {
  const market = {
    id: 'm1',
    settled: true,
    winnerId: 'win',
    scoringMode: app.SCORE_MODE,
    optionCount: 2,
    options: [{ id: 'win', label: '勝' }, { id: 'lose', label: '負' }]
  };
  const state = {
    hostName: '同名',
    markets: [market],
    bets: [
      { bettorUid: 'u1', name: '同名', marketId: 'm1', optionId: 'win', riskPoints: 100, scoreMultiplierAtPrediction: 1 },
      { bettorUid: 'u2', name: '同名', marketId: 'm1', optionId: 'lose', riskPoints: 100, scoreMultiplierAtPrediction: 1 }
    ]
  };
  const pools = app.buildPools(state);

  assert.equal(app.reportByBettor(state, pools).length, 2);
  const settlement = app.roomSettlement(state, pools);
  assert.equal(settlement.players.length, 2);
  assert.equal(settlement.participantNetScore, 0);
  assert.equal('hostNet' in settlement, false);
  assert.equal('hostRake' in settlement, false);
});

test('banker archive flow keeps market and bet records', () => {
  const banker = fs.readFileSync(path.join(__dirname, '..', 'banker.html'), 'utf8');
  assert.doesNotMatch(banker, /markets\s*:\s*null/);
  assert.doesNotMatch(banker, /bets\s*:\s*null/);
  assert.match(banker, /updates\['config\/status'\]\s*=\s*'archived'/);
  assert.match(banker, /lockedAt/);
  assert.match(banker, /settledAt/);
  assert.match(banker, /settledByUid/);
});

test('front end has no stored-value, redeem-code, or referral data writes', () => {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const banker = fs.readFileSync(path.join(__dirname, '..', 'banker.html'), 'utf8');
  assert.doesNotMatch(appSource, /ROOM_CREATION_COST|REFERRAL_REBATE_PERCENT|DEFAULT_REDEEM_CODES/);
  assert.doesNotMatch(banker, /betpanel\/hosts|betpanel\/redeemCodes|referralCode|btnRedeem|btnBindUpline/);
  assert.match(banker, /billingMode:\s*'single_room_6h_twd_200'/);
  assert.match(banker, /expiresAt:\s*activatedAt \+ SESSION_DURATION_MS/);
});

test('commercial UI uses signed risk scores without odds, rake, payout, or host accounting', () => {
  const player = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const banker = fs.readFileSync(path.join(__dirname, '..', 'banker.html'), 'utf8');
  assert.match(player, /riskPoints/);
  assert.match(player, /scoreMultiplierAtPrediction/);
  assert.match(banker, /scoringMode:\s*SCORE_MODE/);
  assert.match(banker, /optionCount:\s*optionsArr\.length/);
  for (const source of [player, banker]) {
    assert.doesNotMatch(source, /x\d+\.\d+|抽水率|結算派彩|主持人點數損益|莊家收益拆算/);
    assert.match(source, /app\.js\?v=plain-flow1/);
  }
});

test('player submission distinguishes permission, auth, and offline failures from network errors', () => {
  const player = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(player, /code\.includes\('permission'\)/);
  assert.match(player, /場次尚未到期、題目仍開放/);
  assert.match(player, /code\.includes\('auth'\)/);
  assert.match(player, /navigator\.onLine === false/);
  assert.doesNotMatch(player, /網路錯誤，預測提交失敗/);
});

test('both pages use Firebase server time for session expiry UI', () => {
  const player = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const banker = fs.readFileSync(path.join(__dirname, '..', 'banker.html'), 'utf8');
  assert.match(player, /\.info\/serverTimeOffset/);
  assert.match(banker, /\.info\/serverTimeOffset/);
  assert.match(player, /isSessionExpired\(state, serverNow\(\)\)/);
  assert.match(banker, /isSessionExpired\(state, serverNow\(\)\)/);
  assert.match(player, /visibilitychange/);
  assert.match(banker, /visibilitychange/);
  assert.match(player, /活動已封存 · 僅可查閱歷史與積分結果/);
  assert.match(banker, /已封存・僅可查閱紀錄/);
  assert.match(banker, /updateActivityWriteUI/);
  assert.match(banker, /control\.disabled = readOnly/);
});

test('public pages explain the activity in plain language', () => {
  const player = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const banker = fs.readFileSync(path.join(__dirname, '..', 'banker.html'), 'utf8');
  const service = fs.readFileSync(path.join(__dirname, '..', 'service-info.html'), 'utf8');
  assert.match(player, /30 秒看懂/);
  assert.match(player, /答對總計 200/);
  assert.match(banker, /主持人只要做 4 件事/);
  assert.match(service, /用手機就能加入的現場活動計分工具/);
  assert.match(service, /參與者免費加入/);
});

test('repository positioning avoids nightlife wording while keeping room and KTV use cases', () => {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const recovery = fs.readFileSync(path.join(__dirname, '..', 'ROOM_RECOVERY_DESIGN.md'), 'utf8');
  assert.doesNotMatch(appSource, new RegExp('\u591c\u5e97'));
  assert.match(appSource, /包廂/);
  assert.match(appSource, /KTV 歡唱評分對決/);
  assert.match(recovery, /活動代碼不能用來接管後台/);
  assert.match(recovery, /Custom Token/);
  assert.match(recovery, /Email 只是選填/);
});

test('formal and example rules stay byte-for-byte identical', () => {
  const formal = fs.readFileSync(path.join(__dirname, '..', 'database.rules.json'), 'utf8');
  const example = fs.readFileSync(path.join(__dirname, '..', 'firebase.database.rules.example.json'), 'utf8');
  assert.equal(formal, example);
  assert.doesNotThrow(() => JSON.parse(formal));
});
