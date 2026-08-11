const fs = require('node:fs');
const path = require('node:path');
const { after, before, beforeEach, test } = require('node:test');
const { assertFails, assertSucceeds, initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { get, ref, serverTimestamp, set, update } = require('firebase/database');

const PROJECT_ID = 'demo-betpanel';
const ROOM_ID = 'ABC234';
const LEGACY_ROOM_ID = 'OLD234';
const HOST_UID = 'host-uid';
const PLAYER_UID = 'player-uid';
const OTHER_UID = 'other-uid';
const SCORE_MODE = 'option_count_net_v1';

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    database: { rules: fs.readFileSync(path.join(__dirname, '..', 'database.rules.json'), 'utf8') }
  });
});

after(async () => testEnv.cleanup());

beforeEach(async () => {
  await testEnv.clearDatabase();
  await testEnv.withSecurityRulesDisabled(async context => {
    await set(ref(context.database(), `betpanel/rooms/${ROOM_ID}`), scoreRoom());
    await set(ref(context.database(), `betpanel/rooms/${LEGACY_ROOM_ID}`), legacyRoom());
  });
});

test('only the room host can manage config, score topics, updates and audit logs', async () => {
  const hostDb = testEnv.authenticatedContext(HOST_UID).database();
  const otherDb = testEnv.authenticatedContext(OTHER_UID).database();

  await assertSucceeds(update(ref(hostDb, `betpanel/rooms/${ROOM_ID}/markets/m1`), { locked: true }));
  await assertFails(update(ref(hostDb, `betpanel/rooms/${ROOM_ID}/markets/m1`), { optionCount: 3 }));
  await assertFails(update(ref(hostDb, `betpanel/rooms/${ROOM_ID}/markets/m1/options/o1`), { label: '竄改選項' }));
  await assertFails(set(ref(hostDb, `betpanel/rooms/${ROOM_ID}/markets/m1/options/o1`), null));
  await assertFails(update(ref(otherDb, `betpanel/rooms/${ROOM_ID}/markets/m1`), { locked: false }));
  await assertFails(update(ref(otherDb, `betpanel/rooms/${ROOM_ID}/config`), { roomTitle: '竄改' }));

  await assertSucceeds(set(ref(hostDb, `betpanel/rooms/${ROOM_ID}/updates/u1`), {
    message: '即時戰況', type: 'live', actorUid: HOST_UID, ts: serverTimestamp()
  }));
  await assertFails(set(ref(otherDb, `betpanel/rooms/${ROOM_ID}/updates/u2`), {
    message: '偽造戰況', type: 'live', actorUid: OTHER_UID, ts: serverTimestamp()
  }));
  await assertSucceeds(set(ref(hostDb, `betpanel/rooms/${ROOM_ID}/auditLogs/a1`), {
    action: 'host_check', actorUid: HOST_UID, ts: serverTimestamp()
  }));
  await assertFails(set(ref(otherDb, `betpanel/rooms/${ROOM_ID}/auditLogs/a2`), {
    action: 'fake_log', actorUid: OTHER_UID, ts: serverTimestamp()
  }));
});

test('valid signed-score prediction succeeds and forged score variants fail', async () => {
  const playerDb = testEnv.authenticatedContext(PLAYER_UID).database();
  const otherDb = testEnv.authenticatedContext(OTHER_UID).database();

  await assertSucceeds(set(ref(playerDb, `betpanel/rooms/${ROOM_ID}/bets/p1`), prediction()));
  await assertFails(set(ref(otherDb, `betpanel/rooms/${ROOM_ID}/bets/p2`), prediction()));
  await assertFails(set(ref(playerDb, `betpanel/rooms/${ROOM_ID}/bets/p3`), prediction({ optionId: 'missing' })));
  await assertFails(set(ref(playerDb, `betpanel/rooms/${ROOM_ID}/bets/p4`), prediction({ scoreMultiplierAtPrediction: 99 })));
  await assertFails(set(ref(playerDb, `betpanel/rooms/${ROOM_ID}/bets/p5`), prediction({ riskPoints: 10.5 })));
  await assertFails(set(ref(playerDb, `betpanel/rooms/${ROOM_ID}/bets/p6`), prediction({ riskPoints: 1001 })));
  await assertFails(set(ref(playerDb, `betpanel/rooms/${ROOM_ID}/bets/p7`), prediction({ scoringMode: 'fixed_odds' })));
  await assertFails(set(ref(playerDb, `betpanel/rooms/${ROOM_ID}/bets/p8`), prediction({ ts: 1 })));
  await assertFails(update(ref(playerDb, `betpanel/rooms/${ROOM_ID}/bets/p1`), { riskPoints: 1 }));
  await assertFails(set(ref(playerDb, `betpanel/rooms/${ROOM_ID}/bets/p1`), null));
});

test('legacy fixed-odds data can finish its lifecycle but new topics must use score mode', async () => {
  const hostDb = testEnv.authenticatedContext(HOST_UID).database();
  const playerDb = testEnv.authenticatedContext(PLAYER_UID).database();

  await assertSucceeds(set(ref(playerDb, `betpanel/rooms/${LEGACY_ROOM_ID}/bets/legacy`), legacyBet()));
  await assertFails(set(ref(playerDb, `betpanel/rooms/${LEGACY_ROOM_ID}/bets/score-shaped`),
    prediction({ marketId: 'legacy', optionId: 'o1' })));
  await assertFails(set(ref(hostDb, `betpanel/rooms/${LEGACY_ROOM_ID}/markets/legacy-new`), legacyMarket()));
  await assertSucceeds(set(ref(hostDb, `betpanel/rooms/${LEGACY_ROOM_ID}/markets/score-new`), scoreMarket()));
  await assertSucceeds(set(ref(playerDb, `betpanel/rooms/${LEGACY_ROOM_ID}/bets/score-new-prediction`),
    prediction({ marketId: 'score-new', optionId: 'o1' })));
});

test('result publication is atomic, immutable, and topic archive is terminal', async () => {
  const hostDb = testEnv.authenticatedContext(HOST_UID).database();
  const playerDb = testEnv.authenticatedContext(PLAYER_UID).database();

  await assertSucceeds(update(ref(hostDb, `betpanel/rooms/${ROOM_ID}/markets/m1`), {
    locked: true, lockedAt: serverTimestamp(), lockedByUid: HOST_UID
  }));
  await assertSucceeds(update(ref(hostDb, `betpanel/rooms/${ROOM_ID}`), {
    'markets/m1/settled': true,
    'markets/m1/winnerId': 'o1',
    'markets/m1/resultLabel': '選項一',
    'markets/m1/settledAt': serverTimestamp(),
    'markets/m1/settledByUid': HOST_UID,
    'auditLogs/settled': { action: 'market_settled', actorUid: HOST_UID, ts: serverTimestamp() }
  }));

  await assertFails(update(ref(hostDb, `betpanel/rooms/${ROOM_ID}/markets/m1`), { winnerId: 'o2' }));
  await assertFails(update(ref(hostDb, `betpanel/rooms/${ROOM_ID}/markets/m1`), { settled: false }));
  await assertFails(set(ref(playerDb, `betpanel/rooms/${ROOM_ID}/bets/late`), prediction()));
  await assertSucceeds(update(ref(hostDb, `betpanel/rooms/${ROOM_ID}`), {
    'markets/m1/archived': true,
    'markets/m1/archivedAt': serverTimestamp(),
    'markets/m1/archivedByUid': HOST_UID,
    'auditLogs/archived': { action: 'market_archived', actorUid: HOST_UID, ts: serverTimestamp() }
  }));
  await assertFails(update(ref(hostDb, `betpanel/rooms/${ROOM_ID}/markets/m1`), { locked: false }));
});

test('room archive preserves score data and blocks future room activity', async () => {
  const hostDb = testEnv.authenticatedContext(HOST_UID).database();
  const playerDb = testEnv.authenticatedContext(PLAYER_UID).database();

  await assertSucceeds(update(ref(hostDb, `betpanel/rooms/${ROOM_ID}`), {
    'config/status': 'archived',
    'config/archivedAt': serverTimestamp(),
    'config/archivedByUid': HOST_UID,
    'auditLogs/room-archived': { action: 'room_archived', actorUid: HOST_UID, ts: serverTimestamp() }
  }));
  await assertFails(update(ref(hostDb, `betpanel/rooms/${ROOM_ID}/config`), { status: 'active' }));
  await assertFails(set(ref(hostDb, `betpanel/rooms/${ROOM_ID}/updates/late`), {
    message: '封存後訊息', type: 'notice', actorUid: HOST_UID, ts: serverTimestamp()
  }));
  await assertFails(set(ref(playerDb, `betpanel/rooms/${ROOM_ID}/bets/late`), prediction()));
  await assertSucceeds(get(ref(testEnv.unauthenticatedContext().database(), `betpanel/rooms/${ROOM_ID}`)));
});

test('new demo session requires signed scoring, fixed six-hour duration, and private paths stay hidden', async () => {
  const hostDb = testEnv.authenticatedContext(HOST_UID).database();
  const publicDb = testEnv.unauthenticatedContext().database();
  const activatedAt = Date.now();
  const config = demoConfig(activatedAt);

  await assertSucceeds(set(ref(hostDb, 'betpanel/rooms/NEW234/config'), config));
  await assertFails(set(ref(hostDb, 'betpanel/rooms/NOSCOR/config'), { ...config, scoringMode: null }));
  await assertFails(set(ref(hostDb, 'betpanel/rooms/LONG23/config'), {
    ...config, expiresAt: activatedAt + 7 * 60 * 60 * 1000
  }));
  await assertFails(update(ref(hostDb, 'betpanel/rooms/NEW234/config'), {
    expiresAt: activatedAt + 12 * 60 * 60 * 1000
  }));

  await assertSucceeds(get(ref(publicDb, 'betpanel/rooms/NEW234')));
  await assertFails(get(ref(publicDb, 'betpanel/hosts')));
  await assertFails(get(ref(publicDb, 'betpanel/redeemCodes')));
  await assertFails(get(ref(publicDb, 'betpanel/roomAccess')));
});

test('expired session blocks new activity but permits cutoff, result and archive cleanup', async () => {
  await testEnv.withSecurityRulesDisabled(async context => {
    await update(ref(context.database(), `betpanel/rooms/${ROOM_ID}/config`), {
      accessMode: 'demo', billingMode: 'single_room_6h_twd_200', scoringMode: SCORE_MODE,
      sessionPriceTwd: 200, maxRiskPoints: 1000,
      activatedAt: Date.now() - 7 * 60 * 60 * 1000,
      expiresAt: Date.now() - 60 * 60 * 1000
    });
  });

  const hostDb = testEnv.authenticatedContext(HOST_UID).database();
  const playerDb = testEnv.authenticatedContext(PLAYER_UID).database();
  await assertFails(set(ref(playerDb, `betpanel/rooms/${ROOM_ID}/bets/expired`), prediction()));
  await assertFails(set(ref(hostDb, `betpanel/rooms/${ROOM_ID}/updates/expired`), {
    message: '過期戰況', type: 'notice', actorUid: HOST_UID, ts: serverTimestamp()
  }));
  await assertFails(set(ref(hostDb, `betpanel/rooms/${ROOM_ID}/markets/new-market`), scoreMarket()));
  await assertSucceeds(update(ref(hostDb, `betpanel/rooms/${ROOM_ID}/markets/m1`), {
    locked: true, lockedAt: serverTimestamp(), lockedByUid: HOST_UID
  }));
  await assertFails(update(ref(hostDb, `betpanel/rooms/${ROOM_ID}/markets/m1`), { locked: false }));
  await assertSucceeds(update(ref(hostDb, `betpanel/rooms/${ROOM_ID}`), {
    'markets/m1/settled': true,
    'markets/m1/winnerId': 'o1',
    'markets/m1/resultLabel': '選項一',
    'markets/m1/settledAt': serverTimestamp(),
    'markets/m1/settledByUid': HOST_UID,
    'auditLogs/expired-settlement': { action: 'market_settled', actorUid: HOST_UID, ts: serverTimestamp() }
  }));
  await assertSucceeds(update(ref(hostDb, `betpanel/rooms/${ROOM_ID}`), {
    'markets/m1/archived': true,
    'markets/m1/archivedAt': serverTimestamp(),
    'markets/m1/archivedByUid': HOST_UID,
    'auditLogs/expired-market-archive': { action: 'market_archived', actorUid: HOST_UID, ts: serverTimestamp() }
  }));
  await assertSucceeds(update(ref(hostDb, `betpanel/rooms/${ROOM_ID}`), {
    'config/status': 'archived',
    'config/archivedAt': serverTimestamp(),
    'config/archivedByUid': HOST_UID,
    'auditLogs/expired-room-archive': { action: 'room_archived', actorUid: HOST_UID, ts: serverTimestamp() }
  }));
});

function demoConfig(activatedAt) {
  return {
    hostUid: HOST_UID,
    hostId: HOST_UID,
    hostName: '測試主持人',
    roomTitle: '單場測試',
    pin: '2345',
    status: 'active',
    accessMode: 'demo',
    billingMode: 'single_room_6h_twd_200',
    scoringMode: SCORE_MODE,
    sessionPriceTwd: 200,
    maxRiskPoints: 1000,
    activatedAt,
    expiresAt: activatedAt + 6 * 60 * 60 * 1000,
    createdAt: activatedAt
  };
}

function scoreRoom() {
  return {
    config: { hostUid: HOST_UID, hostName: '測試主持人', roomTitle: '測試活動', status: 'active', maxRiskPoints: 1000 },
    markets: { m1: scoreMarket() }
  };
}

function scoreMarket() {
  return {
    title: '測試預測',
    desc: '測試',
    scoringMode: SCORE_MODE,
    optionCount: 2,
    maxRiskPoints: 1000,
    options: { o1: { label: '選項一', order: 0 }, o2: { label: '選項二', order: 1 } },
    locked: false,
    settled: false
  };
}

function prediction(overrides = {}) {
  return {
    marketId: 'm1',
    optionId: 'o1',
    riskPoints: 100,
    scoringMode: SCORE_MODE,
    scoreMultiplierAtPrediction: 1,
    bettorUid: PLAYER_UID,
    bettorId: PLAYER_UID,
    name: '玩家',
    ts: serverTimestamp(),
    ...overrides
  };
}

function legacyRoom() {
  return {
    config: { hostUid: HOST_UID, hostName: '舊版主持人', roomTitle: '舊版房間', status: 'active', maxBet: 1000 },
    markets: { legacy: legacyMarket() }
  };
}

function legacyMarket() {
  return {
    title: '舊版題目',
    options: { o1: { label: '一', odds: 2 }, o2: { label: '二', odds: 2 } },
    rakePercent: 0,
    autoPrice: false,
    maxBet: 1000,
    locked: false,
    settled: false
  };
}

function legacyBet(overrides = {}) {
  return {
    marketId: 'legacy',
    optionId: 'o1',
    amount: 100,
    oddsAtBet: 2,
    bettorUid: PLAYER_UID,
    bettorId: PLAYER_UID,
    name: '玩家',
    ts: serverTimestamp(),
    ...overrides
  };
}
