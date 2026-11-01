// Кот-экзорцист — играбельный прототип (HTML5 Canvas, без зависимостей).
// Логическое разрешение 360x640, масштабируется под экран.
(() => {
  'use strict';

  const W = 360, H = 640;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let scale = 1, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    canvas.style.width = Math.floor(W * scale) + 'px';
    canvas.style.height = Math.floor(H * scale) + 'px';
    canvas.width = Math.floor(W * scale * dpr);
    canvas.height = Math.floor(H * scale * dpr);
  }
  window.addEventListener('resize', resize);
  resize();

  // =====================================================================
  // Данные
  // =====================================================================
  const RARITY = [
    { name: 'Обычный', color: '#c9c3e6', hp: 1, reward: 1, squad: 1 },
    { name: 'Редкий', color: '#7fd1ff', hp: 2, reward: 2.5, squad: 2.2 },
    { name: 'Эпический', color: '#d68cff', hp: 4, reward: 6, squad: 5 },
    { name: 'Легендарный', color: '#ffc94d', hp: 12, reward: 25, squad: 14 },
  ];

  const DISTRICTS = [
    { name: 'Спальный квартал', hue: 38, ghosts: ['sheet', 'sock', 'fire'], boss: 'washer', set: 'x1.25 урона кота' },
    { name: 'Старый город', hue: 260, ghosts: ['armor', 'portrait', 'candle'], boss: 'headless', set: 'x1.25 урона кота' },
    { name: 'Порт', hue: 195, ghosts: ['drowned', 'jelly', 'lantern'], boss: 'ship', set: 'x1.25 урона кота' },
    { name: 'Универмаг', hue: 330, ghosts: ['mannequin', 'toy', 'tv'], boss: 'carousel', set: 'x1.25 урона кота' },
    { name: 'Кладбище котов', hue: 150, ghosts: ['skelecat', 'pumpkin', 'wisp'], boss: 'ninelives', set: 'x1.25 урона кота' },
  ];
  const HOUSES_PER_DISTRICT = 10;

  // shape: sheet | sock | fire | washer | king
  const GHOSTS = {
    sheet: { name: 'Простынка', rarity: 0, body: '#f6f3ff', shape: 'sheet', d: 0 },
    sock: { name: 'Носок-полтергейст', rarity: 1, body: '#ffd6e3', shape: 'sock', d: 0 },
    fire: { name: 'Дух камина', rarity: 2, body: '#ffc08a', shape: 'fire', d: 0 },
    washer: { name: 'Стиральная машина', rarity: 3, body: '#e3f1ff', shape: 'washer', d: 0 },
    armor: { name: 'Пустые доспехи', rarity: 0, body: '#d9dde6', shape: 'sock', d: 1 },
    portrait: { name: 'Портрет-шептун', rarity: 1, body: '#f3e2b8', shape: 'sheet', d: 1 },
    candle: { name: 'Свечной дух', rarity: 2, body: '#fff0a8', shape: 'fire', d: 1 },
    headless: { name: 'Безголовый дворецкий', rarity: 3, body: '#cfc6ff', shape: 'king', d: 1 },
    drowned: { name: 'Утопленник', rarity: 0, body: '#bfe9e4', shape: 'sheet', d: 2 },
    jelly: { name: 'Медуза-призрак', rarity: 1, body: '#ffc6f0', shape: 'sock', d: 2 },
    lantern: { name: 'Маячный огонёк', rarity: 2, body: '#ffe08a', shape: 'fire', d: 2 },
    ship: { name: 'Корабль-призрак', rarity: 3, body: '#b9d7f0', shape: 'king', d: 2 },
    mannequin: { name: 'Манекен', rarity: 0, body: '#f1d9cc', shape: 'sock', d: 3 },
    toy: { name: 'Плюшевый мишка', rarity: 1, body: '#e8c49a', shape: 'sheet', d: 3 },
    tv: { name: 'Телевизор-шипун', rarity: 2, body: '#c8f0ff', shape: 'fire', d: 3 },
    carousel: { name: 'Карусель-дух', rarity: 3, body: '#ffd1e8', shape: 'king', d: 3 },
    skelecat: { name: 'Кот-скелет', rarity: 0, body: '#eeeeee', shape: 'sheet', d: 4 },
    pumpkin: { name: 'Тыквенный дух', rarity: 1, body: '#ffb36b', shape: 'sock', d: 4 },
    wisp: { name: 'Блуждающий огонёк', rarity: 2, body: '#a8ffcf', shape: 'fire', d: 4 },
    ninelives: { name: 'Король девяти жизней', rarity: 3, body: '#bda8ff', shape: 'king', d: 4 },
  };

  // Насадки пылесоса
  const ATTACH = {
    narrow: { name: 'Узкая', color: '#7fd1ff', desc: 'пробивает ещё одну цель' },
    wide: { name: 'Широкая', color: '#8ee08a', desc: 'задевает призраков рядом' },
    turbo: { name: 'Турбо', color: '#ff9f5a', desc: 'каждый 5-й выстрел взрывается' },
    brush: { name: 'Лазерная щётка', color: '#ff7a9c', desc: 'шанс и сила крита' },
    rocket: { name: 'Пылевые ракеты', color: '#d68cff', desc: 'самонаводящиеся ракеты' },
  };
  const ATTACH_KINDS = Object.keys(ATTACH);
  const RANKS = ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
  const RANK_COLORS = ['#b8b8c8', '#8ee08a', '#7fd1ff', '#d68cff', '#ffc94d', '#ff7a7a', '#ff5cf0'];
  const RANK_WEIGHTS = [0.6, 0.27, 0.1, 0.025, 0.005];
  const SUMMON_COST = 30;
  const rankPower = (r) => Math.pow(1.7, r);

  // Бестиарий
  const BEST_MILESTONES = [1, 10, 50, 200];
  const BEST_REWARDS = [10, 20, 50, 120];
  const BEST_BONUS = 0.03; // +3% урона за каждую полученную веху

  // Задания
  const QUEST_TYPES = {
    kills: { text: (n) => 'Победи ' + n + ' призраков', goal: 40 },
    captures: { text: (n) => 'Поймай ' + n + ' призраков', goal: 6 },
    upgrades: { text: (n) => 'Купи ' + n + ' улучшений', goal: 10 },
    rooms: { text: (n) => 'Очисти ' + n + ' комнат', goal: 6 },
    summons: { text: (n) => 'Призови ' + n + ' насадок', goal: 3 },
    merges: { text: (n) => 'Слей ' + n + ' раз', goal: 2 },
  };

  // Особые призраки вне районов
  GHOSTS.golden = { name: 'Золотой призрак', rarity: 3, body: '#ffd84d', shape: 'sheet', d: -1 };
  GHOSTS.mansion = { name: 'Призрачный особняк', rarity: 3, body: '#c9b8ff', shape: 'king', d: -1 };

  // Скины: бонус действует, пока скин есть в коллекции (даже если не надет)
  const SKINS = {
    ginger: { name: 'Рыжик', body: '#f2a65a', dark: '#d9853a', bonus: {}, text: 'Стартовый' },
    black: { name: 'Уголёк', body: '#5d566e', dark: '#3f3a4f', bonus: { rate: 1.15 }, text: '+15% скорострельность', crystals: 300 },
    white: { name: 'Снежок', body: '#f4f1ea', dark: '#d8d2c4', bonus: { income: 1.25 }, text: '+25% эктоплазмы', crystals: 500 },
    ninja: { name: 'Ниндзя', body: '#8a8fa8', dark: '#5c6078', mask: true, bonus: { dmg: 1.2, rate: 1.1 }, text: '+20% урон, +10% скорость', crystals: 1200 },
    vampire: { name: 'Граф Мурракула', body: '#c7b3e6', dark: '#8f6fc4', cape: true, bonus: { dmg: 1.35 }, text: '+35% урона', usd: '$2.99' },
    golden: { name: 'Золотой кот', body: '#ffd24d', dark: '#e0a91f', sparkle: true, bonus: { dmg: 1.5, income: 1.5 }, text: '+50% урон и доход', usd: '$9.99' },
  };

  const CRYSTAL_PACKS = [
    { amount: 100, price: '$0.99' }, { amount: 550, price: '$4.99', extra: '+10%' }, { amount: 1200, price: '$9.99', extra: '+20%' },
    { amount: 2600, price: '$19.99', extra: '+30%' }, { amount: 7000, price: '$49.99', extra: '+40%' },
  ];

  const DAILY = [
    { label: '20 💎', apply: () => { S.crystals += 20; } },
    { label: '5 🫙', apply: () => { S.jars += 5; } },
    { label: '50 💎', apply: () => { S.crystals += 50; } },
    { label: 'Насадка B', apply: () => giveAttach(2) },
    { label: '100 💎', apply: () => { S.crystals += 100; } },
    { label: 'Эпик-дух', apply: () => giveGhost(district().ghosts[2]) },
    { label: '300 💎', apply: () => { S.crystals += 300; } },
  ];

  const WHEEL = [
    { label: '50 💎', color: '#9ff3ff', w: 2, apply: () => { S.crystals += 50; } },
    { label: '5 🫙', color: '#ffe7b0', w: 3, apply: () => { S.jars += 5; } },
    { label: 'Луна', color: '#fff1a8', w: 2, apply: () => { S.moonUntil = Date.now() + 60000; } },
    { label: '200 💎', color: '#7fd1ff', w: 0.5, apply: () => { S.crystals += 200; } },
    { label: 'Насадка', color: '#d68cff', w: 1, apply: () => giveAttach(rollRank()) },
    { label: '15 💎', color: '#c9f7ff', w: 3, apply: () => { S.crystals += 15; } },
    { label: 'Эктопл.', color: '#8ee08a', w: 3, apply: () => { S.ecto += ghostReward(0) * 60; } },
    { label: 'Эпик', color: '#ff9fbf', w: 0.5, apply: () => giveGhost(district().ghosts[2]) },
  ];

  const RAID_TIME = 30;
  const ROOMS_PER_HOUSE = 5;
  const GHOSTS_PER_ROOM = 22;
  const MAX_ALIVE = 14;
  const BOSS_TIME = 30;
  const MAX_STARS = 5;
  const PRESTIGE_HOUSE = 10;
  const SAVE_KEY = 'cat_exorcist_v1';

  // =====================================================================
  // Состояние
  // =====================================================================
  const defaultState = () => ({
    house: 1, room: 1, cleared: 0,
    ecto: 0, crystals: 60, jars: 8,
    lvPower: 1, lvPull: 1, lvCollect: 1,
    inventory: [], squad: [null, null, null, null],
    attach: [], equipped: [null, null, null],
    nextId: 1,
    bestiary: {}, bestClaimed: {},
    stats: { kills: 0, captures: 0, upgrades: 0, rooms: 0, summons: 0, merges: 0 },
    quests: [], questLevel: 0,
    stones: 0, prestiges: 0, auto: true,
    skins: ['ginger'], skin: 'ginger',
    vipUntil: 0, noAds: false, starter: false, weekly: false,
    daily: { count: 0, last: '' },
    wheel: { day: '', free: 1, ads: 3 },
    raid: { day: '', tickets: 3, adUsed: false },
    adSummonAt: 0, adCrystalsAt: 0, purchases: 0, adsWatched: 0,
    autoUpUntil: 0, autoMergeUntil: 0, autoUpForever: false, autoMergeForever: false, autoUpOn: true, autoMergeOn: true,
    moonUntil: 0, moonReadyAt: 0,
    lastSeen: Date.now(),
  });
  let S = load() || defaultState();

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = Object.assign(defaultState(), JSON.parse(raw));
      s.stats = Object.assign(defaultState().stats, s.stats);
      ['daily', 'wheel', 'raid'].forEach((k) => { s[k] = Object.assign(defaultState()[k], s[k]); });
      return s;
    } catch (e) { return null; }
  }
  function save() {
    S.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* приватный режим */ }
  }
  setInterval(save, 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  // =====================================================================
  // Формулы
  // =====================================================================
  const stageIndex = () => (S.house - 1) * ROOMS_PER_HOUSE + (S.room - 1);
  const districtIndex = (house) => Math.floor(((house || S.house) - 1) / HOUSES_PER_DISTRICT) % DISTRICTS.length;
  const district = () => DISTRICTS[districtIndex()];
  const isBossRoom = () => S.room === ROOMS_PER_HOUSE;
  const moonActive = () => Date.now() < S.moonUntil;
  const vipActive = () => Date.now() < S.vipUntil;
  const moonMult = () => (moonActive() || vipActive() ? 2 : 1);
  const skinMult = (kind) => S.skins.reduce((m, k) => m * (SKINS[k].bonus[kind] || 1), 1);
  const attachSlots = () => (vipActive() ? 4 : 3);
  const today = () => new Date().toDateString();
  const stoneMult = () => 1 + 0.1 * S.stones;
  const bestiaryClaimedTotal = () => Object.values(S.bestClaimed).reduce((a, b) => a + b, 0);
  const bestiaryMult = () => 1 + BEST_BONUS * bestiaryClaimedTotal();

  function equippedItems() { return S.equipped.map((id) => S.attach.find((a) => a.id === id)).filter(Boolean); }
  function kindPower(kind) { return equippedItems().filter((a) => a.kind === kind).reduce((s, a) => s + rankPower(a.rank), 0); }
  const attachMult = () => 1 + equippedItems().reduce((s, a) => s + 0.2 * rankPower(a.rank), 0);

  function squadDistrictCounts() {
    const c = {};
    S.squad.forEach((id) => { const it = findItem(id); if (it) { const d = GHOSTS[it.type].d; c[d] = (c[d] || 0) + 1; } });
    return c;
  }
  const setMult = () => (Object.values(squadDistrictCounts()).some((n) => n >= 4) ? 1.25 : 1);

  const catDamage = () => 10 * Math.pow(1.16, S.lvPower - 1) * moonMult() * stoneMult() * bestiaryMult() * attachMult() * setMult() * skinMult('dmg');
  const fireRate = () => Math.min((3 + 0.08 * (S.lvPull - 1)) * skinMult('rate'), 12);
  const captureChance = () => Math.min(0.4 + 0.012 * (S.lvPull - 1), 0.95);
  const critChance = () => 0.1 + Math.min(0.5, 0.04 * kindPower('brush'));
  const critMult = () => 3 + 0.25 * kindPower('brush');
  const incomeMult = () => Math.pow(1.13, S.lvCollect - 1) * moonMult() * stoneMult() * skinMult('income');
  const ghostHp = (rarity) => 22 * Math.pow(1.24, stageIndex()) * RARITY[rarity].hp;
  const ghostReward = (rarity) => 4 * Math.pow(1.2, stageIndex()) * RARITY[rarity].reward * incomeMult();
  const upgradeCost = (lv, base) => Math.floor(base * Math.pow(1.19, lv - 1));
  function squadDamage(g) {
    const d = GHOSTS[g.type].d;
    const syn = (squadDistrictCounts()[d] || 0) >= 2 ? 1.2 : 1;
    return catDamage() * 0.25 * RARITY[GHOSTS[g.type].rarity].squad * Math.pow(2.2, g.stars - 1) * syn;
  }
  const stonesFor = (house) => (house < PRESTIGE_HOUSE ? 0 : Math.floor(3 * Math.pow(house / PRESTIGE_HOUSE, 1.7)));

  const UPGRADES = [
    { key: 'lvPower', name: 'Мощность', base: 10, color: '#ff7a9c', desc: () => fmt(catDamage()) + ' урон' },
    { key: 'lvPull', name: 'Тяга', base: 14, color: '#7fd1ff', desc: () => Math.round(captureChance() * 100) + '% поимка' },
    { key: 'lvCollect', name: 'Сборник', base: 12, color: '#8ee08a', desc: () => 'x' + fmt(incomeMult(), 2) + ' эктопл.' },
  ];

  // Форматирование больших чисел: K, M, B, T, затем aa, ab, ...
  const SUFFIX = ['', 'K', 'M', 'B', 'T'];
  function fmt(n, dec) {
    if (!isFinite(n)) return '∞';
    if (n < 1000) return dec !== undefined && n < 100 ? n.toFixed(dec).replace(/\.?0+$/, '') : String(Math.floor(n));
    const tier = Math.floor(Math.log10(n) / 3);
    let suf;
    if (tier < SUFFIX.length) suf = SUFFIX[tier];
    else {
      const k = tier - SUFFIX.length;
      suf = String.fromCharCode(97 + Math.floor(k / 26) % 26) + String.fromCharCode(97 + (k % 26));
    }
    const v = n / Math.pow(1000, tier);
    return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v)) + suf;
  }

  // =====================================================================
  // Мир
  // =====================================================================
  // Карта больше экрана, вид сверху, камера следует за котом
  const MAP_W = 1100, MAP_H = 1300, WALL = 90;
  const VIEW = { x: 0, y: 70, w: 360, h: 442 };
  const VIEW_CX = VIEW.w / 2, VIEW_CY = VIEW.y + VIEW.h / 2;
  const ZOOM = 0.72; // камера отдалена, чтобы видеть больше карты
  const HALF_W = VIEW.w / 2 / ZOOM, HALF_H = VIEW.h / 2 / ZOOM;
  const cam = { x: MAP_W / 2, y: MAP_H / 2 };
  const toScreen = (x, y) => ({ x: (x - cam.x) * ZOOM + VIEW_CX, y: (y - cam.y) * ZOOM + VIEW_CY });
  const toWorld = (x, y) => ({ x: (x - VIEW_CX) / ZOOM + cam.x, y: (y - VIEW_CY) / ZOOM + cam.y });
  let mapCanvas = null, mapKey = '', solids = [];

  const cat = { x: MAP_W / 2, y: MAP_H / 2, aim: -Math.PI / 2, bob: 0, fireCd: 0, recoil: 0, shots: 0, rocketCd: 1, hp: 100, hurt: 0, safeFor: 0, moving: 0, face: 1 };
  const CAT_MAX_HP = 100;
  const FIELD = { x1: WALL + 20, x2: MAP_W - WALL - 20, y1: WALL + 30, y2: MAP_H - WALL - 20 }; // где может ходить кот
  let shots = [], shards = [];
  let joy = null; // {sx, sy, x, y, id, drag}
  let manualUntil = 0;
  const motes = Array.from({ length: 26 }, () => ({ x: Math.random() * 1000, y: Math.random() * 1000, vx: (Math.random() - 0.5) * 12, vy: -4 - Math.random() * 10, r: 1 + Math.random() * 1.8 }));
  let ghosts = [], beams = [], floaters = [], particles = [], drops = [], orbiters = [], rings = [];
  let spawnCd = 0.5, roomSpawned = 0, bossTimer = 0, bossSpawned = false;
  let panel = null; // squad | attach | bestiary | quests | prestige | offline
  let selectedJar = null, selectedAttach = null, bestPage = 0, prestigeConfirm = 0;
  let toast = null, shake = 0, time = 0, roomToken = 0;
  let modal = null; // {title, lines, buttons} или {ad: {t, cb}}
  let shopTab = 'offers';
  let gold = null, goldCd = 40 + Math.random() * 30;
  let raid = null; // {t, floor}
  let wheelRot = 0, wheelSpin = null;
  let bossContinued = false, jarOfferCd = 0;

  function resetRoom() {
    ghosts = []; shots = []; shards = []; roomSpawned = 0; S.cleared = 0; cat.hp = CAT_MAX_HP; bossContinued = false; buildMap(); spawnCd = 0.6; bossSpawned = false; bossTimer = 0; roomToken++;
  }

  function pickType() {
    const g = district().ghosts;
    const r = Math.random();
    return r < 0.04 ? g[2] : r < 0.19 ? g[1] : g[0];
  }

  function spawnGhost(type) {
    const def = GHOSTS[type];
    const boss = def.rarity === 3;
    const hp = ghostHp(def.rarity);
    ghosts.push({
      type, boss, hp, maxHp: hp,
      ...spawnPoint(boss ? 300 : 430),
      vx: (Math.random() - 0.5) * 30, vy: (boss ? 0.6 : 1) * (28 + Math.random() * 14),
      r: boss ? 40 : def.rarity === 2 ? 22 : 19,
      phase: Math.random() * 6, hit: 0, alpha: 0, dying: 0, capturing: 0,
      shootCd: 2 + Math.random() * 2,
    });
  }

  function spawnPoint(dist) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const x = cat.x + Math.cos(a) * dist, y = cat.y + Math.sin(a) * dist;
      if (x > WALL + 20 && x < MAP_W - WALL - 20 && y > WALL + 20 && y < MAP_H - WALL - 20) return { x, y };
    }
    return { x: Math.max(WALL + 20, Math.min(MAP_W - WALL - 20, cat.x + (Math.random() - 0.5) * 600)), y: Math.max(WALL + 20, Math.min(MAP_H - WALL - 20, cat.y - 300)) };
  }

  const lowHp = (g) => !g.raid && g.hp > 0 && g.hp / g.maxHp <= 0.3;
  const targetable = (g) => g.hp > 0 && !g.capturing && g.alpha >= 0.5;

  // =====================================================================
  // Бой
  // =====================================================================
  function nearestGhost(x, y, except) {
    let best = null, bd = Infinity;
    for (const g of ghosts) {
      if (!targetable(g) || g === except) continue;
      const d = (g.x - x) ** 2 + (g.y - y) ** 2;
      if (d < bd) { bd = d; best = g; }
    }
    return best;
  }

  function damage(g, amount, crit) {
    if (g.hp <= 0 || g.capturing) return;
    if (g.raid) {
      g.hp -= amount; g.hit = 0.12;
      floaters.push({ x: g.x + (Math.random() - 0.5) * 40, y: g.y - g.r, text: fmt(amount), life: 0.9, color: crit ? '#ffdd55' : '#ffffff', size: crit ? 17 : 13 });
      if (g.hp <= 0) {
        raid.floor++;
        g.maxHp *= 1.3; g.hp = g.maxHp;
        burst(g.x, g.y, 30, '#c9b8ff'); shake = 0.3;
        floaters.push({ x: g.x, y: g.y - 60, text: 'Этаж ' + raid.floor + '!', life: 1.4, color: '#ffc94d', size: 20 });
      }
      return;
    }
    g.hp -= amount;
    g.hit = 0.12;
    if (!g.boss) { const kx = g.x - cat.x, ky = g.y - cat.y, kd = Math.hypot(kx, ky) || 1; g.x += (kx / kd) * 5; g.y += (ky / kd) * 5; }
    floaters.push({ x: g.x + (Math.random() - 0.5) * 24, y: g.y - g.r, text: fmt(amount), life: 0.9, color: crit ? '#ffdd55' : '#ffffff', size: crit ? 17 : 13 });
    if (g.hp <= 0) killGhost(g);
  }

  function killGhost(g) {
    g.hp = 0;
    const rar = GHOSTS[g.type].rarity;
    const reward = ghostReward(rar) * (g.boss ? 1 : 0.45);
    const n = g.boss ? 14 : 3;
    for (let i = 0; i < n; i++) {
      const sp = toScreen(g.x, g.y);
      drops.push({ x: sp.x, y: sp.y, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 120, t: 0, value: reward / n });
    }
    burst(g.x, g.y, g.boss ? 40 : 14, GHOSTS[g.type].body);
    S.stats.kills++;
    if (Math.random() < (g.boss ? 1 : 0.08)) {
      const n = g.boss ? 3 : 1;
      for (let i = 0; i < n; i++) shards.push({ x: Math.max(FIELD.x1, Math.min(FIELD.x2, g.x + (Math.random() - 0.5) * 80)), y: Math.max(FIELD.y1, Math.min(FIELD.y2, g.y + (Math.random() - 0.5) * 80)), life: 12 });
    }
    // обычных призраков кот иногда ловит сам
    if (!g.boss && rar === 0 && S.jars > 0 && Math.random() < captureChance() * 0.2) capture(g.type, g.x, g.y, true);
    g.dying = 0.35;
    if (g.boss) {
      S.crystals += 10;
      showToast('Дом ' + S.house + ' очищен! +10 💎');
      shake = 0.5;
      scheduleNextRoom();
    } else {
      S.cleared++;
    }
  }

  function capture(type, x, y, auto) {
    if (S.jars <= 0) { offerJars(); return false; }
    S.jars--;
    const item = { id: S.nextId++, type, stars: 1 };
    S.inventory.push(item);
    const before = S.bestiary[type] || 0;
    S.bestiary[type] = before + 1;
    S.stats.captures++;
    floaters.push({ x, y: y - 30, text: before === 0 ? 'Новый призрак!' : auto ? 'Пойман!' : 'В банке!', life: 1.4, color: RARITY[GHOSTS[type].rarity].color, size: 16 });
    autoEquip(item);
    return true;
  }

  function tryCapture(g) {
    if (S.jars <= 0) { offerJars(); return; }
    const rar = GHOSTS[g.type].rarity;
    const chance = g.boss ? captureChance() * 0.45 : captureChance() * (1 - rar * 0.12);
    g.capturing = 0.6;
    g.captureOk = Math.random() < chance;
    g.captureStart = { x: g.x, y: g.y };
  }

  function finishCapture(g) {
    g.capturing = 0;
    if (g.captureOk) {
      capture(g.type, cat.x, cat.y - 20, false);
      S.ecto += ghostReward(GHOSTS[g.type].rarity);
      if (g.boss) {
        S.crystals += 10; shake = 0.5;
        showToast('Босс пойман! +10 💎');
        burst(cat.x, cat.y, 30, '#ffc94d');
        scheduleNextRoom();
      } else {
        S.cleared++;
      }
      g.hp = 0; g.dying = 0.01;
    } else {
      floaters.push({ x: g.x, y: g.y - g.r - 10, text: 'Вырвался!', life: 1, color: '#ff8a8a', size: 15 });
      if (g.boss) g.hp = Math.max(g.hp, g.maxHp * 0.4);
      else killGhost(g);
    }
  }

  function scheduleNextRoom() {
    const tok = roomToken;
    setTimeout(() => { if (tok === roomToken) nextRoom(); }, 900);
  }

  function nextRoom() {
    const prevDistrict = districtIndex();
    if (S.room === ROOMS_PER_HOUSE) { S.house++; S.room = 1; }
    else S.room++;
    S.jars += 2;
    S.stats.rooms++;
    resetRoom();
    if (districtIndex() !== prevDistrict) showToast('Новый район: ' + district().name + '!');
    if (S.house === PRESTIGE_HOUSE && S.room === 1 && S.prestiges === 0) showToast('Открыто Освящение ✨');
    save();
  }

  function burst(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 160;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.4, color, r: 2 + Math.random() * 3 });
    }
  }

  // Выстрел кота с эффектами насадок
  function catShoot(target) {
    cat.shots++;
    const crit = Math.random() < critChance();
    const dmg = catDamage() * (crit ? critMult() : 1);
    const nz = nozzle();
    const color = equippedItems().length ? ATTACH[equippedItems()[0].kind].color : '#9ff3ff';
    beams.push({ x1: nz.x, y1: nz.y, x2: target.x, y2: target.y, life: 0.09, color, w: 5 });
    cat.recoil = 1;
    const tx = target.x, ty = target.y;
    damage(target, dmg, crit);

    const pNarrow = kindPower('narrow');
    if (pNarrow > 0) {
      const second = nearestGhost(tx, ty, target);
      if (second) {
        beams.push({ x1: tx, y1: ty, x2: second.x, y2: second.y, life: 0.09, color: ATTACH.narrow.color, w: 3 });
        damage(second, dmg * Math.min(1, 0.3 + 0.1 * pNarrow), crit);
      }
    }
    const pWide = kindPower('wide');
    if (pWide > 0) {
      for (const g of ghosts) {
        if (g !== target && targetable(g) && Math.hypot(g.x - tx, g.y - ty) < 60) damage(g, dmg * Math.min(1, 0.25 + 0.08 * pWide), false);
      }
    }
    const pTurbo = kindPower('turbo');
    if (pTurbo > 0 && cat.shots % 5 === 0) {
      rings.push({ x: tx, y: ty, r: 10, max: 85, life: 0.3 });
      burst(tx, ty, 18, '#ffcf8a');
      shake = Math.max(shake, 0.15);
      for (const g of ghosts) if (targetable(g) && Math.hypot(g.x - tx, g.y - ty) < 85) damage(g, catDamage() * (1 + 0.5 * pTurbo), false);
    }
  }

  // =====================================================================
  // Отряд
  // =====================================================================
  const itemPower = (it) => squadDamage(it);
  const findItem = (id) => S.inventory.find((i) => i.id === id);

  function autoEquip(item) {
    const empty = S.squad.indexOf(null);
    if (empty >= 0) { S.squad[empty] = item.id; return; }
    let worst = -1, wp = Infinity;
    S.squad.forEach((id, i) => { const it = findItem(id); const p = it ? itemPower(it) : -1; if (p < wp) { wp = p; worst = i; } });
    if (itemPower(item) > wp) S.squad[worst] = item.id;
  }

  function bestSquad() {
    const sorted = [...S.inventory].sort((a, b) => itemPower(b) - itemPower(a));
    S.squad = S.squad.map((_, i) => (sorted[i] ? sorted[i].id : null));
  }

  function canMerge(list, keyFn, maxed) {
    const c = {};
    for (const it of list) { if (maxed(it)) continue; const k = keyFn(it); c[k] = (c[k] || 0) + 1; if (c[k] >= 3) return true; }
    return false;
  }
  const squadMergeable = () => canMerge(S.inventory, (i) => i.type + ':' + i.stars, (i) => i.stars >= MAX_STARS);
  const attachMergeable = () => canMerge(S.attach, (a) => a.kind + ':' + a.rank, (a) => a.rank >= RANKS.length - 1);

  // Слияние 3 одинаковых в одного уровнем выше. Возвращает число слияний.
  function mergeList(listName, keyFn, maxed, levelUp, onMerge) {
    let merged = 0, changed = true;
    while (changed) {
      changed = false;
      const groups = {};
      for (const it of S[listName]) { if (maxed(it)) continue; const k = keyFn(it); (groups[k] = groups[k] || []).push(it); }
      for (const k in groups) {
        const g = groups[k];
        while (g.length >= 3) {
          const [a, b, c] = g.splice(0, 3);
          S[listName] = S[listName].filter((i) => i !== b && i !== c);
          levelUp(a); onMerge && onMerge();
          merged++; changed = true;
        }
      }
    }
    if (merged) S.stats.merges += merged;
    return merged;
  }

  function mergeSquad(silent) {
    const n = mergeList('inventory', (i) => i.type + ':' + i.stars, (i) => i.stars >= MAX_STARS, (a) => a.stars++, () => { S.jars += 2; });
    const ids = new Set(S.inventory.map((i) => i.id));
    S.squad = S.squad.map((id) => (ids.has(id) ? id : null));
    bestSquad();
    if (!silent) showToast(n ? 'Слито: ' + n + ' ✨' : 'Нужно 3 одинаковых призрака');
    return n;
  }

  function releaseJar(id) {
    S.inventory = S.inventory.filter((i) => i.id !== id);
    S.squad = S.squad.map((x) => (x === id ? null : x));
    S.jars++;
    S.ecto += ghostReward(0) * 3;
    selectedJar = null;
  }

  // =====================================================================
  // Насадки
  // =====================================================================
  function rollRank() {
    let r = Math.random();
    for (let i = 0; i < RANK_WEIGHTS.length; i++) { if (r < RANK_WEIGHTS[i]) return i; r -= RANK_WEIGHTS[i]; }
    return 0;
  }

  function summon(count) {
    const cost = count === 10 ? SUMMON_COST * 9 : SUMMON_COST * count;
    if (S.crystals < cost) { showToast('Нужно ' + cost + ' 💎'); return; }
    S.crystals -= cost;
    let best = null;
    for (let i = 0; i < count; i++) {
      const a = { id: S.nextId++, kind: ATTACH_KINDS[Math.floor(Math.random() * ATTACH_KINDS.length)], rank: rollRank() };
      S.attach.push(a);
      if (!best || a.rank > best.rank) best = a;
    }
    S.stats.summons += count;
    autoEquipAttach();
    showToast((count > 1 ? 'Лучшая: ' : 'Получено: ') + ATTACH[best.kind].name + ' [' + RANKS[best.rank] + ']');
  }

  function autoEquipAttach() {
    const sorted = [...S.attach].sort((a, b) => b.rank - a.rank);
    S.equipped = S.equipped.map((_, i) => (sorted[i] ? sorted[i].id : null));
  }

  function mergeAttach(silent) {
    const n = mergeList('attach', (a) => a.kind + ':' + a.rank, (a) => a.rank >= RANKS.length - 1, (a) => a.rank++);
    autoEquipAttach();
    selectedAttach = null;
    if (!silent) showToast(n ? 'Слито насадок: ' + n + ' ✨' : 'Нужно 3 одинаковые насадки одного ранга');
    return n;
  }

  // =====================================================================
  // Автоматизация: 10 минут за рекламу, навсегда за донат, входит в VIP
  // =====================================================================
  const AUTO = {
    up: { name: 'Автопрокачка', icon: '⚙', until: 'autoUpUntil', forever: 'autoUpForever', on: 'autoUpOn', price: '$2.99', desc: 'сама покупает самое дешёвое улучшение' },
    merge: { name: 'Автослияние', icon: '🔁', until: 'autoMergeUntil', forever: 'autoMergeForever', on: 'autoMergeOn', price: '$2.99', desc: 'сама сливает духов и насадки' },
  };
  const autoOwned = (k) => S[AUTO[k].forever] || vipActive();
  const autoAvailable = (k) => autoOwned(k) || Date.now() < S[AUTO[k].until];
  const autoRunning = (k) => autoAvailable(k) && S[AUTO[k].on];
  let autoUpCd = 0, autoMergeCd = 0;

  function autoTick(dt) {
    autoUpCd -= dt; autoMergeCd -= dt;
    if (autoUpCd <= 0 && autoRunning('up')) {
      autoUpCd = 0.25;
      for (let n = 0; n < 25; n++) {
        let best = null, bc = Infinity;
        for (const u of UPGRADES) { const c = upgradeCost(S[u.key], u.base); if (c < bc) { bc = c; best = u; } }
        if (!best || S.ecto < bc) break;
        S.ecto -= bc; S[best.key]++; S.stats.upgrades++;
      }
    }
    if (autoMergeCd <= 0 && autoRunning('merge')) {
      autoMergeCd = 2;
      let n = 0;
      if (squadMergeable()) n += mergeSquad(true);
      if (attachMergeable()) n += mergeAttach(true);
      if (n) floaters.push({ x: cat.x, y: cat.y - 60, text: 'Авто-слияние ✨', life: 1.2, color: '#8ee08a', size: 13 });
    }
  }

  function autoButton(k) {
    const a = AUTO[k];
    if (autoAvailable(k)) { S[a.on] = !S[a.on]; showToast(a.name + (S[a.on] ? ' включена' : ' на паузе')); return; }
    ask(a.name, ['Она ' + a.desc + '.', '10 минут за рекламу или навсегда.', 'В VIP включена всегда.'], [
      { label: '🎬 10 мин', color: '#ffc94d', on: () => { closeModal(); showAd(a.name + ' на 10 минут', () => { S[a.until] = Math.max(Date.now(), S[a.until]) + 10 * 60000; S[a.on] = true; showToast(a.name + ' на 10 минут'); }); } },
      { label: 'Навсегда ' + a.price, color: '#8ee08a', on: () => { closeModal(); purchase(a.name + ' навсегда', a.price, () => { S[a.forever] = true; S[a.on] = true; }); } },
      { label: 'Закрыть', color: '#ff9aa9', on: closeModal },
    ]);
  }
  function buyAutoBundle() { purchase('Автоматизация навсегда', '$4.99', () => { S.autoUpForever = true; S.autoMergeForever = true; S.autoUpOn = true; S.autoMergeOn = true; }); }

  // =====================================================================
  // Бестиарий и задания
  // =====================================================================
  function bestClaimable(type) {
    const got = S.bestClaimed[type] || 0;
    return got < BEST_MILESTONES.length && (S.bestiary[type] || 0) >= BEST_MILESTONES[got];
  }
  const anyBestClaimable = () => Object.keys(GHOSTS).some(bestClaimable);
  function claimBest(type) {
    const got = S.bestClaimed[type] || 0;
    S.crystals += BEST_REWARDS[got];
    S.bestClaimed[type] = got + 1;
    showToast('+' + BEST_REWARDS[got] + ' 💎 и +3% урона');
  }

  function newQuest(exclude) {
    const kinds = Object.keys(QUEST_TYPES).filter((k) => !exclude.includes(k));
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const lvl = S.questLevel;
    return { kind, base: S.stats[kind], goal: Math.ceil(QUEST_TYPES[kind].goal * (1 + 0.35 * lvl)), reward: 20 + 5 * lvl };
  }
  function ensureQuests() {
    while (S.quests.length < 3) S.quests.push(newQuest(S.quests.map((q) => q.kind)));
  }
  const questProgress = (q) => Math.min(q.goal, S.stats[q.kind] - q.base);
  const questDone = (q) => questProgress(q) >= q.goal;
  const anyQuestDone = () => S.quests.some(questDone);
  function claimQuest(i) {
    const q = S.quests[i];
    S.crystals += q.reward;
    S.questLevel++;
    S.quests.splice(i, 1);
    S.quests.splice(i, 0, newQuest(S.quests.map((x) => x.kind).concat(q.kind)));
    showToast('+' + q.reward + ' 💎');
  }
  ensureQuests();

  // =====================================================================
  // Освящение (престиж)
  // =====================================================================
  function prestige() {
    const gain = stonesFor(S.house);
    if (gain <= 0) { showToast('Доступно с дома ' + PRESTIGE_HOUSE); return; }
    if (prestigeConfirm <= 0) { prestigeConfirm = 3; showToast('Нажми ещё раз для подтверждения'); return; }
    prestigeConfirm = 0;
    S.stones += gain; S.prestiges++;
    S.house = 1; S.room = 1; S.ecto = 0;
    S.lvPower = 1; S.lvPull = 1; S.lvCollect = 1;
    resetRoom();
    panel = null;
    burst(cat.x, cat.y - 20, 60, '#fff1a8');
    showToast('Освящение! +' + gain + ' лунных камней');
    save();
  }

  // =====================================================================
  // Покупки / буст
  // =====================================================================
  function buyUpgrade(u) {
    const cost = upgradeCost(S[u.key], u.base);
    if (S.ecto < cost) { showToast('Не хватает эктоплазмы'); return; }
    S.ecto -= cost; S[u.key]++; S.stats.upgrades++;
  }

  function activateMoon() {
    const now = Date.now();
    if (moonActive()) return;
    if (now < S.moonReadyAt) { showToast('Полнолуние через ' + Math.ceil((S.moonReadyAt - now) / 1000) + ' с'); return; }
    showAd('Полнолуние x2 на 60 с', () => {
      S.moonUntil = Date.now() + 60000; S.moonReadyAt = Date.now() + 180000;
      showToast('Полнолуние! x2 урон и доход на 60 с');
    });
  }

  function showToast(text) { toast = { text, life: 2.2 }; }

  // =====================================================================
  // Реклама (заглушка) и покупки (тестовый режим)
  // =====================================================================
  function ask(title, lines, buttons) { modal = { title, lines, buttons }; }
  function closeModal() { modal = null; }

  // Rewarded-реклама: в релизе здесь вызов SDK (AdMob / AppLovin / Unity Ads).
  function showAd(label, cb) {
    if (S.noAds || vipActive()) { cb(); showToast('Награда без рекламы ✓'); return; }
    modal = { ad: { t: 2.5, total: 2.5, cb }, title: 'Реклама', lines: [label] };
  }

  // Покупка: в релизе здесь Google Play Billing / App Store IAP.
  function purchase(name, price, apply) {
    ask('Покупка', [name, 'Цена: ' + price, 'Тестовый режим: деньги не списываются'], [
      { label: 'Купить', color: '#8ee08a', on: () => { closeModal(); apply(); S.purchases++; showToast('Куплено: ' + name); save(); } },
      { label: 'Отмена', color: '#ff9aa9', on: closeModal },
    ]);
  }

  function giveAttach(rank, kind) {
    const a = { id: S.nextId++, kind: kind || ATTACH_KINDS[Math.floor(Math.random() * ATTACH_KINDS.length)], rank };
    S.attach.push(a); autoEquipAttach();
    showToast('Насадка: ' + ATTACH[a.kind].name + ' [' + RANKS[a.rank] + ']');
  }
  function giveGhost(type, stars) {
    const it = { id: S.nextId++, type, stars: stars || 1 };
    S.inventory.push(it); S.bestiary[type] = (S.bestiary[type] || 0) + 1; autoEquip(it);
    showToast('Новый дух: ' + GHOSTS[type].name);
  }

  function offerJars() {
    if (jarOfferCd > 0) { showToast('Нет пустых банок!'); return; }
    jarOfferCd = 40;
    ask('Банки закончились', ['Слей или отпусти духов в отряде,', 'или возьми ещё банок.'], [
      { label: '🎬 +5 банок', color: '#ffc94d', on: () => { closeModal(); showAd('+5 банок', () => { S.jars += 5; }); } },
      { label: '20 за 50 💎', color: '#7fd1ff', on: () => { closeModal(); if (S.crystals >= 50) { S.crystals -= 50; S.jars += 20; } else showToast('Нужно 50 💎'); } },
      { label: 'Закрыть', color: '#ff9aa9', on: closeModal },
    ]);
  }

  // Второй шанс в бою с боссом
  function bossFail(reason) {
    if (!bossContinued) {
      bossContinued = true;
      ask(reason, ['Посмотри рекламу: +15 секунд', 'и полная смелость кота.'], [
        { label: '🎬 Продолжить', color: '#ffc94d', on: () => { closeModal(); showAd('Продолжение боя с боссом', () => { bossTimer = Math.max(bossTimer, 0) + 15; cat.hp = CAT_MAX_HP; }); } },
        { label: 'Отступить', color: '#ff9aa9', on: () => { closeModal(); S.room = ROOMS_PER_HOUSE - 1; resetRoom(); } },
      ]);
    } else {
      showToast(reason + ' Прокачайся и попробуй снова');
      S.room = ROOMS_PER_HOUSE - 1; resetRoom();
    }
  }

  // Ежедневные сбросы
  function dailyReset() {
    const d = today();
    if (S.raid.day !== d) { S.raid.day = d; S.raid.tickets = 3; S.raid.adUsed = false; }
    if (S.wheel.day !== d) { S.wheel.day = d; S.wheel.free = 1; S.wheel.ads = 3; }
  }
  dailyReset();
  const dailyReady = () => S.daily.last !== today();
  function claimDaily(double) {
    if (!dailyReady()) return;
    const r = DAILY[S.daily.count % DAILY.length];
    r.apply(); if (double) r.apply();
    if (vipActive()) S.crystals += 100;
    S.daily.count++; S.daily.last = today();
    showToast('Награда дня: ' + r.label + (double ? ' x2' : '') + (vipActive() ? ' +100 💎 VIP' : ''));
  }

  // Колесо удачи
  function spinWheel(viaAd) {
    if (wheelSpin) return;
    const go = () => {
      const total = WHEEL.reduce((s, w) => s + w.w, 0);
      let r = Math.random() * total, idx = 0;
      for (let i = 0; i < WHEEL.length; i++) { if (r < WHEEL[i].w) { idx = i; break; } r -= WHEEL[i].w; }
      const seg = (Math.PI * 2) / WHEEL.length;
      const from = wheelRot % (Math.PI * 2);
      const to = -(idx + 0.5) * seg - Math.PI * 2 * 5 + (Math.random() - 0.5) * seg * 0.6;
      wheelSpin = { t: 0, dur: 2.6, from, to, idx };
    };
    if (viaAd) { S.wheel.ads--; showAd('Вращение колеса', go); }
    else { S.wheel.free--; go(); }
  }

  // Рейд: 30 секунд бьёшь особняк, каждый «этаж» — награда
  function startRaid() {
    if (S.raid.tickets <= 0) { showToast('Билеты закончились'); return; }
    S.raid.tickets--;
    panel = null;
    ghosts = []; shots = []; cat.hp = CAT_MAX_HP; roomToken++;
    raid = { t: RAID_TIME, floor: 0 };
    const hp = ghostHp(3) * 1.5;
    ghosts.push({ type: 'mansion', boss: false, raid: true, hp, maxHp: hp, ...spawnPoint(220), vx: 20, vy: 14, r: 46, phase: 0, hit: 0, alpha: 0, dying: 0, capturing: 0, shootCd: 2 });
    showToast('Рейд! Пробей как можно больше этажей');
  }
  function endRaid() {
    const f = raid.floor;
    raid = null; ghosts = []; shots = [];
    resetRoom();
    const cr = 10 + 15 * f, jars = f, att = Math.floor(f / 3);
    const apply = (m) => { S.crystals += cr * m; S.jars += jars * m; for (let i = 0; i < att * m; i++) giveAttach(rollRank()); };
    ask('Рейд завершён', ['Этажей пробито: ' + f, 'Награда: ' + cr + ' 💎, ' + jars + ' 🫙' + (att ? ', насадок: ' + att : '')], [
      { label: 'Забрать', color: '#8ee08a', on: () => { closeModal(); apply(1); } },
      { label: '🎬 x2', color: '#ffc94d', on: () => { closeModal(); showAd('Удвоение награды рейда', () => apply(2)); } },
    ]);
  }

  // Магазин
  function buyStarter() {
    purchase('Стартовый набор', '$1.99', () => {
      S.starter = true;
      if (S.squad.length < 5) S.squad.push(null);
      S.crystals += 300; giveAttach(3); giveGhost(DISTRICTS[0].ghosts[2], 2);
    });
  }
  function buyVip() { purchase('VIP на 7 дней', '$6.99', () => { S.vipUntil = Math.max(Date.now(), S.vipUntil) + 7 * 864e5; syncSlots(); }); }
  function buyNoAds() { purchase('Без рекламы', '$4.99', () => { S.noAds = true; }); }
  function buyWeekly() { purchase('Набор недели', '$14.99', () => { S.weekly = true; S.crystals += 500; S.jars += 20; giveAttach(4); }); }
  function buySkin(k) {
    const sk = SKINS[k];
    if (S.skins.includes(k)) { S.skin = k; showToast('Надет скин: ' + sk.name); return; }
    if (sk.crystals) {
      if (S.crystals < sk.crystals) { showToast('Нужно ' + sk.crystals + ' 💎'); return; }
      S.crystals -= sk.crystals; S.skins.push(k); S.skin = k; showToast('Новый скин: ' + sk.name);
    } else purchase('Скин «' + sk.name + '»', sk.usd, () => { S.skins.push(k); S.skin = k; });
  }
  function syncSlots() {
    while (S.equipped.length < attachSlots()) S.equipped.push(null);
    while (S.equipped.length > attachSlots()) S.equipped.pop();
  }
  syncSlots();

  // Офлайн-доход
  let offlineGain = 0;
  (function offline() {
    const secs = Math.min((Date.now() - (S.lastSeen || Date.now())) / 1000, 8 * 3600);
    if (secs > 60 && S.lvPower + S.lvCollect > 2) {
      offlineGain = ghostReward(0) * 0.35 * secs / moonMult();
      panel = 'offline';
    }
  })();

  // =====================================================================
  // Ввод
  // =====================================================================
  const buttons = []; // пересобирается каждый кадр
  function btn(x, y, w, h, on) { buttons.push({ x, y, w, h, on }); }

  function toGame(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const { x, y } = toGame(e);
    for (let i = buttons.length - 1; i >= 0; i--) {
      const b = buttons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.on(); return; }
    }
    if (panel || y < VIEW.y || y > VIEW.y + VIEW.h) return;
    // в боевой зоне: либо тап (поимка/удар), либо свайп-джойстик
    joy = { sx: x, sy: y, x, y, id: e.pointerId, drag: false };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* старые браузеры */ }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!joy || e.pointerId !== joy.id) return;
    const { x, y } = toGame(e);
    joy.x = x; joy.y = y;
    if (!joy.drag && Math.hypot(x - joy.sx, y - joy.sy) > 10) joy.drag = true;
  });

  function endJoy(e) {
    if (!joy || e.pointerId !== joy.id) return;
    if (!joy.drag) tapField(joy.sx, joy.sy);
    else manualUntil = time + 2;
    joy = null;
  }
  canvas.addEventListener('pointerup', endJoy);
  canvas.addEventListener('pointercancel', endJoy);

  function tapField(sx, sy) {
    const { x, y } = toWorld(sx, sy);
    if (gold && Math.hypot(gold.x - x, gold.y + Math.sin(gold.t * 3) * 14 - y) < 34) {
      const reward = ghostReward(0) * 40;
      burst(gold.x, gold.y, 30, '#ffd84d');
      gold = null; goldCd = 60 + Math.random() * 60;
      ask('Золотой призрак!', ['Он рассыпался на ' + fmt(reward) + ' эктоплазмы.', 'Посмотри рекламу, чтобы утроить.'], [
        { label: 'Забрать', color: '#8ee08a', on: () => { closeModal(); S.ecto += reward; } },
        { label: '🎬 x3', color: '#ffc94d', on: () => { closeModal(); showAd('Утроение награды', () => { S.ecto += reward * 3; }); } },
      ]);
      return;
    }
    for (const g of ghosts) {
      if (g.hp > 0 && !g.capturing && lowHp(g) && Math.hypot(g.x - x, g.y - y) < g.r + 18) { tryCapture(g); return; }
    }
    const g = nearestGhost(x, y);
    if (g && Math.hypot(g.x - x, g.y - y) < g.r + 14) damage(g, catDamage() * 0.5, false);
  }

  // Движение кота: джойстик игрока или автопилот
  function moveCat(dt) {
    let dx = 0, dy = 0, speed = 0;
    if (joy && joy.drag) {
      const vx = joy.x - joy.sx, vy = joy.y - joy.sy, len = Math.hypot(vx, vy);
      if (len > 4) { dx = vx / len; dy = vy / len; speed = 175 * Math.min(1, len / 45); }
    } else if (S.auto && time > manualUntil) {
      // автопилот: уворот от снарядов > дистанция до призраков > сбор осколков
      let ax = 0, ay = 0;
      for (const p of shots) {
        const d = Math.hypot(p.x - cat.x, p.y - cat.y);
        if (d < 70) { const side = (cat.x - p.x) * p.vy - (cat.y - p.y) * p.vx > 0 ? 1 : -1; ax += -p.vy * side / 110 * 1.4; ay += p.vx * side / 110 * 1.4; }
      }
      for (const g of ghosts) {
        if (g.hp <= 0 || g.capturing) continue;
        const d = Math.hypot(g.x - cat.x, g.y - cat.y);
        if (d < 110) { ax += (cat.x - g.x) / d; ay += (cat.y - g.y) / d; }
      }
      if (!ax && !ay) {
        const sh = shards[0];
        if (sh) { ax = sh.x - cat.x; ay = sh.y - cat.y; }
        else {
          const t = nearestGhost(cat.x, cat.y);
          if (t && Math.hypot(t.x - cat.x, t.y - cat.y) > 260) { ax = (t.x - cat.x) * 0.01; ay = (t.y - cat.y) * 0.01; }
          else if (!t) { ax = (MAP_W / 2 - cat.x) * 0.004; ay = (MAP_H / 2 - cat.y) * 0.004; }
        }
      }
      const len = Math.hypot(ax, ay);
      if (len > 0.05) { dx = ax / len; dy = ay / len; speed = 110 * Math.min(1, len); }
    }
    cat.x = Math.max(FIELD.x1, Math.min(FIELD.x2, cat.x + dx * speed * dt));
    cat.y = Math.max(FIELD.y1, Math.min(FIELD.y2, cat.y + dy * speed * dt));
    for (const o of solids) {
      const nx = Math.max(o.x, Math.min(o.x + o.w, cat.x)), ny = Math.max(o.y, Math.min(o.y + o.h, cat.y));
      const ddx = cat.x - nx, ddy = cat.y - ny, dd = Math.hypot(ddx, ddy);
      if (dd < 18) {
        if (dd > 0.01) { cat.x = nx + (ddx / dd) * 18; cat.y = ny + (ddy / dd) * 18; }
        else cat.y = o.y - 18;
      }
    }
    cat.moving = speed > 10 ? 1 : 0;
    if (Math.abs(dx) > 0.2) cat.face = dx > 0 ? 1 : -1;
  }

  function hurtCat(amount) {
    cat.hp -= amount; cat.hurt = 0.25; cat.safeFor = 2;
    if (cat.hp <= 0) {
      burst(cat.x, cat.y, 20, '#ff9aa9');
      if (raid) { cat.hp = CAT_MAX_HP; endRaid(); return; }
      if (isBossRoom()) { cat.hp = 1; bossFail('Мурзик испугался!'); return; }
      showToast('Мурзик испугался! Попробуй увернуться');
      resetRoom();
    }
  }

  // =====================================================================
  // Обновление
  // =====================================================================
  function update(dt) {
    time += dt;
    cat.bob += dt * 4;
    cat.recoil = Math.max(0, cat.recoil - dt * 8);
    shake = Math.max(0, shake - dt);
    prestigeConfirm = Math.max(0, prestigeConfirm - dt);
    jarOfferCd = Math.max(0, jarOfferCd - dt);
    if (modal && modal.ad) {
      modal.ad.t -= dt;
      if (modal.ad.t <= 0) { const cb = modal.ad.cb; modal = null; S.adsWatched++; cb(); }
    }
    if (wheelSpin) {
      wheelSpin.t += dt;
      const k = Math.min(1, wheelSpin.t / wheelSpin.dur), e = 1 - Math.pow(1 - k, 3);
      wheelRot = wheelSpin.from + (wheelSpin.to - wheelSpin.from) * e;
      if (k >= 1) { const w = WHEEL[wheelSpin.idx]; wheelSpin = null; w.apply(); showToast('Выпало: ' + w.label); }
    }
    if (Math.floor(time) % 5 === 0) dailyReset();

    if (!modal && panel !== 'offline') {
      // золотой призрак пролетает раз в 1–2 минуты
      if (!raid) {
        goldCd -= dt;
        if (!gold && goldCd <= 0) gold = { x: cam.x - HALF_W - 30, y: cam.y - HALF_H * 0.6 + Math.random() * HALF_H, t: 0 };
      }
      if (gold) {
        gold.t += dt; gold.x += 62 * dt;
        if (Math.random() < 0.3) particles.push({ x: gold.x, y: gold.y + Math.sin(gold.t * 3) * 14, vx: 0, vy: 20, life: 0.6, color: '#ffe680', r: 2.5 });
        if (gold.x > cam.x + HALF_W + 40) { gold = null; goldCd = 60 + Math.random() * 60; }
      }

      if (raid) {
        raid.t -= dt;
        if (raid.t <= 0) { endRaid(); return; }
      } else if (isBossRoom()) {
        if (!bossSpawned) { spawnCd -= dt; if (spawnCd <= 0) { spawnGhost(district().boss); bossSpawned = true; bossTimer = BOSS_TIME; } }
        else if (ghosts.some((g) => g.boss && g.hp > 0)) {
          bossTimer -= dt;
          if (bossTimer <= 0) { bossTimer = 0; bossFail('Время вышло!'); }
        }
      } else {
        spawnCd -= dt;
        const alive = ghosts.filter((g) => g.hp > 0).length;
        if (spawnCd <= 0 && roomSpawned < GHOSTS_PER_ROOM && alive < MAX_ALIVE) {
          spawnGhost(pickType()); roomSpawned++; spawnCd = 0.5 + Math.random() * 0.5;
          if (Math.random() < 0.3 && roomSpawned < GHOSTS_PER_ROOM) { spawnGhost(pickType()); roomSpawned++; } // иногда парой
        }
        if (S.cleared >= GHOSTS_PER_ROOM && alive === 0) nextRoom();
      }

      autoTick(dt);
      moveCat(dt);
      // смелость кота: урон от касаний и снарядов, восстановление
      cat.hurt = Math.max(0, cat.hurt - dt);
      cat.safeFor = Math.max(0, cat.safeFor - dt);
      if (cat.safeFor <= 0) cat.hp = Math.min(CAT_MAX_HP, cat.hp + 12 * dt);
      for (const g of ghosts) {
        if (!targetable(g)) continue;
        if (Math.hypot(g.x - cat.x, g.y - (cat.y - 10)) < g.r + 18) hurtCat((g.boss ? 25 : 8) * dt);
        // редкие и сильнее стреляют сгустками эктоплазмы
        if (GHOSTS[g.type].rarity >= 1) {
          g.shootCd -= dt;
          if (g.shootCd <= 0) {
            g.shootCd = g.boss || g.raid ? 1.6 : 3.2;
            const a = Math.atan2(cat.y - 10 - g.y, cat.x - g.x);
            const big = g.boss || g.raid;
            const spread = big ? [-0.3, 0, 0.3] : [0];
            for (const sp of spread) shots.push({ x: g.x, y: g.y, vx: Math.cos(a + sp) * 115, vy: Math.sin(a + sp) * 115, dmg: big ? 22 : 14, life: 5 });
          }
        }
      }
      for (const p of shots) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (Math.hypot(p.x - cat.x, p.y - (cat.y - 8)) < 20) { hurtCat(p.dmg); p.life = 0; burst(p.x, p.y, 6, '#b48cff'); }
      }
      shots = shots.filter((p) => p.life > 0 && p.x > 0 && p.x < MAP_W && p.y > 0 && p.y < MAP_H);
      for (const sh of shards) {
        sh.life -= dt;
        if (Math.hypot(sh.x - cat.x, sh.y - cat.y) < 28) { sh.life = 0; S.crystals++; floaters.push({ x: sh.x, y: sh.y - 10, text: '+1 💎', life: 1, color: '#9ff3ff', size: 14 }); }
      }
      shards = shards.filter((sh) => sh.life > 0);

      // кот
      cat.fireCd -= dt;
      const target = nearestGhost(cat.x, cat.y);
      if (target) {
        const want = Math.atan2(target.y - (cat.y - 18), target.x - cat.x);
        cat.aim += (want - cat.aim) * Math.min(1, dt * 14);
        if (cat.fireCd <= 0 && Math.hypot(target.x - cat.x, target.y - cat.y) < 400) { cat.fireCd = 1 / fireRate(); catShoot(target); }
      }
      // ракеты
      const pRocket = kindPower('rocket');
      if (pRocket > 0) {
        cat.rocketCd -= dt;
        if (cat.rocketCd <= 0) {
          const alive = ghosts.filter((g) => targetable(g) && Math.hypot(g.x - cat.x, g.y - cat.y) < 420);
          if (alive.length) {
            const t = alive[Math.floor(Math.random() * alive.length)];
            cat.rocketCd = Math.max(0.4, 1.5 / (1 + 0.3 * pRocket));
            beams.push({ x1: cat.x - 26, y1: cat.y - 6, x2: t.x, y2: t.y, life: 0.12, color: ATTACH.rocket.color, w: 4, curve: true });
            damage(t, catDamage() * (0.5 + 0.3 * pRocket), false);
          }
        }
      }

      // отряд
      orbiters = S.squad.map((id, i) => {
        const it = findItem(id); if (!it) return null;
        const a = time * 1.3 + (i * Math.PI * 2) / S.squad.length;
        const o = orbiters[i] && orbiters[i].id === id ? orbiters[i] : { id, cd: 0.3 * i };
        o.it = it; o.x = cat.x + Math.cos(a) * 58; o.y = cat.y - 10 + Math.sin(a) * 26;
        o.cd -= dt;
        if (o.cd <= 0) {
          const t = nearestGhost(o.x, o.y);
          if (t && Math.hypot(t.x - o.x, t.y - o.y) < 340) {
            o.cd = 0.9;
            beams.push({ x1: o.x, y1: o.y, x2: t.x, y2: t.y, life: 0.08, color: RARITY[GHOSTS[it.type].rarity].color, w: 3 });
            damage(t, squadDamage(it), false);
          }
        }
        return o;
      });
    }

    for (const g of ghosts) {
      g.alpha = Math.min(1, g.alpha + dt * 2.5);
      g.hit = Math.max(0, g.hit - dt);
      g.phase += dt * 3;
      if (g.capturing) {
        g.capturing = Math.max(0.0001, g.capturing - dt);
        if (g.capturing <= 0.0001) { finishCapture(g); continue; }
        const k = 1 - g.capturing / 0.6;
        const nz = nozzle();
        const kk = g.captureOk ? k : k * 0.5;
        g.x = g.captureStart.x + (nz.x - g.captureStart.x) * kk;
        g.y = g.captureStart.y + (nz.y - g.captureStart.y) * kk;
        continue;
      }
      if (g.dying) { g.dying -= dt; continue; }
      const dx = cat.x - g.x, dy = cat.y - 10 - g.y;
      const d = Math.hypot(dx, dy);
      if (d > g.r + 14) { g.x += (dx / d) * g.vy * dt + g.vx * dt; g.y += (dy / d) * g.vy * dt; }
      g.x += Math.sin(g.phase * 0.7) * 12 * dt;
      g.x = Math.max(WALL, Math.min(MAP_W - WALL, g.x));
      g.y = Math.max(WALL, Math.min(MAP_H - WALL, g.y));
    }
    // призраки расталкивают друг друга, чтобы не слипаться в одну точку
    for (let i = 0; i < ghosts.length; i++) {
      const a = ghosts[i]; if (a.capturing || a.dying) continue;
      for (let j = i + 1; j < ghosts.length; j++) {
        const b = ghosts[j]; if (b.capturing || b.dying) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = (a.r + b.r) * 0.8;
        if (d > 0.01 && d < min) { const push = (min - d) / 2 / d; a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push; }
      }
    }
    // камера мягко следует за котом
    cam.x += (cat.x - cam.x) * Math.min(1, dt * 6);
    cam.y += (cat.y - cam.y) * Math.min(1, dt * 6);
    cam.x = Math.max(HALF_W, Math.min(MAP_W - HALF_W, cam.x));
    cam.y = Math.max(HALF_H, Math.min(MAP_H - HALF_H, cam.y));
    ghosts = ghosts.filter((g) => g.hp > 0 || (g.dying && g.dying > 0) || g.capturing > 0);

    for (const b of beams) b.life -= dt;
    beams = beams.filter((b) => b.life > 0);
    for (const rg of rings) { rg.life -= dt; rg.r += (rg.max - rg.r) * Math.min(1, dt * 14); }
    rings = rings.filter((rg) => rg.life > 0);
    for (const f of floaters) { f.life -= dt; f.y -= 34 * dt; }
    floaters = floaters.filter((f) => f.life > 0);
    for (const p of particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.93; p.vy *= 0.93; }
    particles = particles.filter((p) => p.life > 0);
    for (const d of drops) {
      d.t += dt;
      if (d.t < 0.35) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 300 * dt; }
      else {
        const tx = 300, ty = 20, k = Math.min(1, dt * 7);
        d.x += (tx - d.x) * k; d.y += (ty - d.y) * k;
        if (Math.hypot(tx - d.x, ty - d.y) < 10) { S.ecto += d.value; d.done = true; }
      }
    }
    drops = drops.filter((d) => !d.done);
    if (toast) { toast.life -= dt; if (toast.life <= 0) toast = null; }
  }

  function nozzle() {
    const len = 30 - cat.recoil * 4;
    return { x: cat.x + Math.cos(cat.aim) * len, y: cat.y - 18 + Math.sin(cat.aim) * len };
  }

  // =====================================================================
  // Отрисовка: базовые функции
  // =====================================================================
  const INK = '#2b2340';
  const DARK = new Set([INK, '#6b5f86', '#2f8f4e', '#9b93b3']);
  // Цветовые помощники для объёма: светлее/темнее и прозрачность
  const _shade = new Map();
  function shade(hex, k) {
    const key = hex + k; let v = _shade.get(key); if (v) return v;
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
    const n = parseInt(hex.slice(1), 16), t = k > 0 ? 255 : 0, a = Math.abs(k);
    const ch = (c) => Math.round(c + (t - c) * a);
    v = `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`; _shade.set(key, v); return v;
  }
  function alpha(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  function rr(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function text(t, x, y, size, color, align, weight) {
    ctx.font = (weight || '800') + ' ' + size + 'px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    if (!DARK.has(color)) { // тёмный текст рисуем без обводки
      ctx.lineWidth = Math.max(2, size / 5); ctx.strokeStyle = INK; ctx.lineJoin = 'round';
      ctx.strokeText(t, x, y);
    }
    ctx.fillStyle = color; ctx.fillText(t, x, y);
  }
  function wrapText(t, x, y, maxW, size, color, lh) {
    ctx.font = '700 ' + size + 'px system-ui, sans-serif';
    let line = '', yy = y;
    for (const word of t.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) { text(line, x, yy, size, color, 'left', '700'); line = word; yy += lh; }
      else line = test;
    }
    if (line) text(line, x, yy, size, color, 'left', '700');
  }
  function button(x, y, w, h, label, color, on, size, enabled) {
    const en = enabled === undefined ? true : enabled;
    rr(x, y, w, h, 10); ctx.fillStyle = en ? color : '#9b93b3'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    text(label, x + w / 2, y + h / 2, size || 12, '#ffffff');
    btn(x, y, w, h, on);
  }
  function badge(x, y) {
    ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
  }

  // Спрайт призрака: используется в бою, в банках и в бестиарии.
  function ghostSprite(type, x, y, r, o) {
    o = o || {};
    const def = GHOSTS[type];
    const phase = o.phase || 0;
    if (o.silhouette) ctx.fillStyle = '#6b5f86';
    else { const gr = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.1, x, y + r * 0.2, r * 1.7); gr.addColorStop(0, shade(def.body, 0.6)); gr.addColorStop(0.45, def.body); gr.addColorStop(1, shade(def.body, -0.3)); ctx.fillStyle = gr; }
    ctx.strokeStyle = INK; ctx.lineWidth = r > 15 ? 3 : 2;
    const hitFlash = () => { if (o.hit) { ctx.save(); ctx.globalAlpha = 0.75; ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore(); } };
    if (def.shape === 'washer') {
      rr(x - r, y - r, r * 2, r * 2.1, r * 0.3); ctx.fill(); ctx.stroke();
      if (o.silhouette) return;
      hitFlash();
      ctx.fillStyle = '#9fc6e8'; ctx.beginPath(); ctx.arc(x, y + r * 0.15, r * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(x - r * 0.18, y, r * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = INK; ctx.fillRect(x - r * 0.8, y - r * 0.8, r * 0.3, r * 0.12); ctx.fillRect(x + r * 0.45, y - r * 0.8, r * 0.35, r * 0.12);
      ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.45, r * 0.1, 0, Math.PI * 2); ctx.arc(x + r * 0.3, y - r * 0.45, r * 0.1, 0, Math.PI * 2); ctx.fill();
      return;
    }
    const h = def.shape === 'sock' ? r * 1.6 : r * 1.25;
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI, 0);
    ctx.lineTo(x + r, y + h * 0.6);
    const waves = 4;
    for (let i = waves; i >= 0; i--) {
      ctx.lineTo(x - r + (2 * r * i) / waves, y + h * 0.6 + (i % 2 ? r * 0.4 : 0) + Math.sin(phase * 2 + i) * r * 0.15);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (o.silhouette) { text('?', x, y + 2, r, '#ffffff'); return; }
    hitFlash();
    // блик
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.48, y - r * 0.55, r * 0.22, r * 0.12, -0.7, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.22, y - r * 0.78, r * 0.06, 0, 7); ctx.fill();
    if (def.shape === 'sock') { ctx.fillStyle = 'rgba(255,120,160,0.6)'; ctx.fillRect(x - r + 2, y - r * 0.2, r * 2 - 4, r * 0.3); }
    if (def.shape === 'fire') {
      ctx.fillStyle = '#ff7a3d';
      ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r + 2); ctx.quadraticCurveTo(x, y - r * 1.9 - Math.sin(time * 12) * 3, x + r * 0.4, y - r + 2); ctx.fill();
    }
    if (def.shape === 'king') {
      ctx.fillStyle = '#ffc94d'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.85); ctx.lineTo(x - r * 0.5, y - r * 1.3); ctx.lineTo(x - r * 0.25, y - r * 1.05);
      ctx.lineTo(x, y - r * 1.4); ctx.lineTo(x + r * 0.25, y - r * 1.05); ctx.lineTo(x + r * 0.5, y - r * 1.3); ctx.lineTo(x + r * 0.5, y - r * 0.85); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    const lx = (o.lookX || 0) * r * 0.1, ly = (o.lookY || 0) * r * 0.07;
    const er = Math.max(1.8, r * 0.17), blink = Math.sin(phase * 0.7 + x) > 0.985;
    ctx.fillStyle = INK;
    if (blink) { ctx.fillRect(x - r * 0.35 + lx - er, y - 2 + ly - 1, er * 2, 2); ctx.fillRect(x + r * 0.35 + lx - er, y - 2 + ly - 1, er * 2, 2); }
    else {
      ctx.beginPath(); ctx.ellipse(x - r * 0.35 + lx, y - 2 + ly, er, er * 1.15, 0, 0, 7); ctx.ellipse(x + r * 0.35 + lx, y - 2 + ly, er, er * 1.15, 0, 0, 7); ctx.fill();
      if (r > 9) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x - r * 0.35 + lx - er * 0.35, y - 2 + ly - er * 0.45, er * 0.4, 0, 7); ctx.arc(x + r * 0.35 + lx - er * 0.35, y - 2 + ly - er * 0.45, er * 0.4, 0, 7); ctx.fill(); }
    }
    if (r > 12) { ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x + lx, y + r * 0.3 + ly, r * 0.08, r * 0.11 + Math.sin(phase * 3) * r * 0.02, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,120,150,0.55)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.55, y + r * 0.3, r * 0.2, r * 0.13, 0, 0, Math.PI * 2); ctx.ellipse(x + r * 0.55, y + r * 0.3, r * 0.2, r * 0.13, 0, 0, Math.PI * 2); ctx.fill();
  }

  // =====================================================================
  // Отрисовка: сцена
  // =====================================================================
  // Детерминированный генератор, чтобы планировка дома не менялась при перезаходе
  function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

  const FLOORS = [
    { base: '#d9a877', line: '#c49364', wall: '#7a5a48', style: 'planks' },   // спальный квартал
    { base: '#b7a9cf', line: '#a597bf', wall: '#4e4466', style: 'checker' },  // старый город
    { base: '#9cc3cf', line: '#86afbd', wall: '#3f5f73', style: 'deck' },     // порт
    { base: '#f2d4df', line: '#e4c0ce', wall: '#8a5a72', style: 'tiles' },    // универмаг
    { base: '#9fcf92', line: '#8bbd7e', wall: '#4d6b4a', style: 'grass' },    // кладбище
  ];
  const DECOR = [
    ['rug', 'bed', 'table', 'plant', 'box', 'lamp', 'sofa'],
    ['rug', 'table', 'armor', 'plant', 'lamp', 'shelf', 'box'],
    ['barrel', 'box', 'rope', 'net', 'lamp', 'barrel', 'anchor'],
    ['rack', 'rug', 'box', 'plant', 'lamp', 'rack', 'table'],
    ['grave', 'grave', 'tree', 'pumpkin', 'lamp', 'grave', 'bush'],
  ];
  const SOLID = { bed: 1, table: 1, box: 1, sofa: 1, shelf: 1, armor: 1, barrel: 1, rack: 1, grave: 1, tree: 1, anchor: 1 };

  function buildMap() {
    const key = S.house + ':' + districtIndex();
    if (key === mapKey) return;
    mapKey = key;
    const d = districtIndex(), F = FLOORS[d];
    const R = rng(S.house * 7919 + 13);
    const k = 2; // рисуем в 2x для чёткости
    mapCanvas = mapCanvas || document.createElement('canvas');
    mapCanvas.width = MAP_W * k; mapCanvas.height = MAP_H * k;
    const c = mapCanvas.getContext('2d');
    c.setTransform(k, 0, 0, k, 0, 0);
    // пол
    c.fillStyle = F.base; c.fillRect(0, 0, MAP_W, MAP_H);
    c.fillStyle = F.line;
    if (F.style === 'planks' || F.style === 'deck') {
      const h = F.style === 'deck' ? 34 : 26;
      for (let y = 0; y < MAP_H; y += h) { c.fillRect(0, y, MAP_W, 3); for (let x = ((y / h) % 2) * 60; x < MAP_W; x += 120) c.fillRect(x, y, 3, h); }
    } else if (F.style === 'checker' || F.style === 'tiles') {
      const t = F.style === 'tiles' ? 50 : 64;
      for (let y = 0; y < MAP_H; y += t) for (let x = 0; x < MAP_W; x += t) if (((x + y) / t) % 2 === 0) c.fillRect(x, y, t, t);
      if (F.style === 'tiles') { c.fillStyle = 'rgba(255,255,255,0.35)'; for (let y = 0; y < MAP_H; y += t) for (let x = 0; x < MAP_W; x += t) c.fillRect(x + 6, y + 6, 10, 4); }
    } else {
      for (let i = 0; i < 900; i++) { const x = R() * MAP_W, y = R() * MAP_H; c.fillRect(x, y, 3, 8); c.fillRect(x + 4, y + 2, 3, 6); }
      c.fillStyle = '#c9b48a';
      for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(R() * MAP_W, R() * MAP_H, 60 + R() * 60, 30 + R() * 20, R() * 3, 0, 7); c.fill(); }
    }
    // неоднородность пола: пятна света и тени, мелкие крапинки
    for (let i = 0; i < 40; i++) {
      const x = R() * MAP_W, y = R() * MAP_H, rad = 60 + R() * 140, light = R() < 0.5;
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, light ? 'rgba(255,255,255,0.10)' : 'rgba(40,20,60,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    c.fillStyle = 'rgba(40,20,60,0.10)';
    for (let i = 0; i < 700; i++) c.fillRect(R() * MAP_W, R() * MAP_H, 2, 2);
    // стены по краю
    drawBorder(c, d, F, R);
    // мебель
    solids = [];
    const kinds = DECOR[d];
    const placed = [];
    for (let i = 0; i < 34; i++) {
      const kind = kinds[Math.floor(R() * kinds.length)];
      const big = kind === 'rug' || kind === 'net' || kind === 'bed' || kind === 'sofa' || kind === 'tree';
      const w = big ? 90 + R() * 50 : 34 + R() * 24, h = big ? 60 + R() * 40 : 34 + R() * 20;
      const x = WALL + 30 + R() * (MAP_W - WALL * 2 - 60 - w), y = WALL + 30 + R() * (MAP_H - WALL * 2 - 60 - h);
      if (Math.hypot(x + w / 2 - MAP_W / 2, y + h / 2 - MAP_H / 2) < 140) continue; // центр свободен для старта
      if (placed.some((p) => x < p.x + p.w + 30 && x + w + 30 > p.x && y < p.y + p.h + 30 && y + h + 30 > p.y)) continue;
      placed.push({ x, y, w, h });
      drawDecor(c, kind, x, y, w, h, R, F);
      if (SOLID[kind]) solids.push({ x: x + 4, y: y + 4, w: w - 8, h: h - 8 });
    }
    cat.x = MAP_W / 2; cat.y = MAP_H / 2; cam.x = cat.x; cam.y = cat.y;
  }

  // Края карты: у каждого района своя текстура стены и детали
  function drawBorder(c, d, F, R) {
    const W = WALL, IW = MAP_W - W * 2, IH = MAP_H - W * 2;
    // мягкая тень от стен на полу
    const sh = 22;
    const grads = [[W, W, IW, sh, 0, W, 0, W + sh], [W, MAP_H - W - sh, IW, sh, 0, MAP_H - W, 0, MAP_H - W - sh], [W, W, sh, IH, W, 0, W + sh, 0], [MAP_W - W - sh, W, sh, IH, MAP_W - W, 0, MAP_W - W - sh, 0]];
    for (const [x, y, w, h, x0, y0, x1, y1] of grads) { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(0,0,0,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x, y, w, h); }
    // паутина в углах
    const web = (x, y, sx, sy) => {
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.5;
      for (let i = 0; i <= 4; i++) { const a = (i / 4) * Math.PI / 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + sx * Math.cos(a) * 70, y + sy * Math.sin(a) * 70); c.stroke(); }
      for (let r = 18; r <= 66; r += 16) { c.beginPath(); for (let i = 0; i <= 4; i++) { const a = (i / 4) * Math.PI / 2, px = x + sx * Math.cos(a) * r, py = y + sy * Math.sin(a) * r; if (i) c.quadraticCurveTo(x + sx * Math.cos(a - 0.2) * r * 0.85, y + sy * Math.sin(a - 0.2) * r * 0.85, px, py); else c.moveTo(px, py); } c.stroke(); }
    };
    web(W, W, 1, 1); web(MAP_W - W, W, -1, 1); web(W, MAP_H - W, 1, -1); web(MAP_W - W, MAP_H - W, -1, -1);

    c.save();
    c.beginPath(); c.rect(0, 0, MAP_W, MAP_H); c.rect(W, W, IW, IH); c.clip('evenodd');
    c.fillStyle = F.wall; c.fillRect(0, 0, MAP_W, MAP_H);
    if (d === 0) { // кирпич
      for (let y = 0, row = 0; y < MAP_H; y += 16, row++) for (let x = (row % 2) * -16; x < MAP_W; x += 32) {
        c.fillStyle = ['#b8674f', '#a95c46', '#c2735a'][Math.floor(R() * 3)]; c.fillRect(x + 2, y + 2, 28, 12);
      }
    } else if (d === 1) { // каменная кладка
      for (let y = 0, row = 0; y < MAP_H; y += 26, row++) for (let x = (row % 2) * -22; x < MAP_W; x += 44) {
        c.fillStyle = ['#6e6488', '#62597b', '#7a7094'][Math.floor(R() * 3)]; c.beginPath(); c.roundRect(x + 2, y + 2, 40, 22, 5); c.fill();
        if (R() < 0.12) { c.fillStyle = '#6f9a5e'; c.beginPath(); c.arc(x + 8 + R() * 26, y + 20, 4 + R() * 4, 0, 7); c.fill(); }
      }
    } else if (d === 2) { // вода
      c.fillStyle = '#4f9fc0'; c.fillRect(0, 0, MAP_W, MAP_H);
      c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 2;
      for (let i = 0; i < 260; i++) { const x = R() * MAP_W, y = R() * MAP_H; c.beginPath(); c.arc(x, y, 6, Math.PI * 1.1, Math.PI * 1.9); c.arc(x + 10, y, 6, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    } else if (d === 3) { // витрины универмага
      c.fillStyle = '#7a4d64'; c.fillRect(0, 0, MAP_W, MAP_H);
      const items = ['#ff8fb1', '#7fd1ff', '#ffd36b', '#8ee08a', '#c9a0ff'];
      for (let y = 6; y < MAP_H; y += 58) for (let x = 6; x < MAP_W; x += 58) {
        c.fillStyle = '#f7e6ee'; c.fillRect(x, y, 52, 52);
        c.fillStyle = '#d9b9c8'; c.fillRect(x, y + 24, 52, 3); c.fillRect(x, y + 48, 52, 3);
        for (let k = 0; k < 3; k++) { c.fillStyle = items[Math.floor(R() * items.length)]; c.fillRect(x + 4 + k * 16, y + 8, 12, 15); c.fillStyle = items[Math.floor(R() * items.length)]; c.fillRect(x + 4 + k * 16, y + 33, 12, 15); }
      }
    } else { // живая изгородь
      c.fillStyle = '#3f5e3c'; c.fillRect(0, 0, MAP_W, MAP_H);
      for (let i = 0; i < 2400; i++) { const x = R() * MAP_W, y = R() * MAP_H; c.fillStyle = ['#4d7349', '#5b8656', '#36522f', '#6a9a62'][Math.floor(R() * 4)]; c.beginPath(); c.arc(x, y, 7 + R() * 9, 0, 7); c.fill(); }
      for (let i = 0; i < 160; i++) { c.fillStyle = ['#ffd1e0', '#fff3a6', '#ffffff'][Math.floor(R() * 3)]; c.beginPath(); c.arc(R() * MAP_W, R() * MAP_H, 3, 0, 7); c.fill(); }
    }
    // затемнение к внешнему краю, будто стена уходит вверх
    const fade = [[0, 0, MAP_W, W, 0, 0, 0, W], [0, MAP_H - W, MAP_W, W, 0, MAP_H, 0, MAP_H - W], [0, 0, W, MAP_H, 0, 0, W, 0], [MAP_W - W, 0, W, MAP_H, MAP_W, 0, MAP_W - W, 0]];
    for (const [x, y, w, h, x0, y0, x1, y1] of fade) { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(20,10,30,0.45)'); g.addColorStop(1, 'rgba(20,10,30,0)'); c.fillStyle = g; c.fillRect(x, y, w, h); }
    c.restore();

    // внутренний бортик
    const trim = ['#f3e2c8', '#9d93b8', '#a7713f', '#f2c6d6', '#2f2a3a'][d];
    c.fillStyle = trim; c.fillRect(W - 8, W - 8, IW + 16, 8); c.fillRect(W - 8, MAP_H - W, IW + 16, 8); c.fillRect(W - 8, W - 8, 8, IH + 16); c.fillRect(MAP_W - W, W - 8, 8, IH + 16);
    c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(W, W, IW, IH); c.strokeRect(1.5, 1.5, MAP_W - 3, MAP_H - 3);
    if (d === 2) { // причал: столбики вдоль края
      for (let x = W; x <= MAP_W - W; x += 80) for (const y of [W - 4, MAP_H - W + 4]) post(x, y, '#8a5a36');
      for (let y = W + 80; y <= MAP_H - W - 40; y += 80) for (const x of [W - 4, MAP_W - W + 4]) post(x, y, '#8a5a36');
    }
    if (d === 4) { // кованая ограда
      c.strokeStyle = '#2a2433'; c.lineWidth = 3;
      for (let x = W; x <= MAP_W - W; x += 12) { c.beginPath(); c.moveTo(x, W - 16); c.lineTo(x, W); c.stroke(); c.beginPath(); c.moveTo(x, MAP_H - W); c.lineTo(x, MAP_H - W + 16); c.stroke(); }
      for (let y = W; y <= MAP_H - W; y += 12) { c.beginPath(); c.moveTo(W - 16, y); c.lineTo(W, y); c.stroke(); c.beginPath(); c.moveTo(MAP_W - W, y); c.lineTo(MAP_W - W + 16, y); c.stroke(); }
    }
    function post(x, y, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.arc(x - 2, y - 2, 4, 0, 7); c.fill(); }

    // детали на верхней и нижней стенах: окна, фонари, вывески
    const lamp = (x, y) => { c.fillStyle = 'rgba(255,230,140,0.30)'; c.beginPath(); c.arc(x, y + 10, 46, 0, 7); c.fill(); c.fillStyle = '#ffe28a'; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke(); };
    for (let x = 150; x < MAP_W - 100; x += 260) {
      if (d === 0 || d === 1) { // окно с луной
        const wx = x - 34, wy = 10, ww = 68, wh = W - 22;
        c.fillStyle = d === 0 ? '#f3e2c8' : '#9d93b8'; c.fillRect(wx - 5, wy - 5, ww + 10, wh + 10);
        c.fillStyle = '#2b3a6b'; c.fillRect(wx, wy, ww, wh);
        c.fillStyle = '#fff4c2'; c.beginPath(); c.arc(wx + ww - 16, wy + 13, 7, 0, 7); c.fill();
        c.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) c.fillRect(wx + 6 + R() * (ww - 12), wy + 6 + R() * (wh - 12), 2, 2);
        c.strokeStyle = INK; c.lineWidth = 2.5; c.strokeRect(wx, wy, ww, wh); c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.moveTo(wx, wy + wh / 2); c.lineTo(wx + ww, wy + wh / 2); c.stroke();
        lamp(x + 130, W - 2);
      } else if (d === 3) { // вывеска SALE
        c.fillStyle = '#ff5c8a'; c.beginPath(); c.roundRect(x - 40, 14, 80, 30, 8); c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
        c.fillStyle = '#fff'; c.font = '900 16px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SALE', x, 30);
      } else if (d === 4) { lamp(x, W - 4); lamp(x + 130, MAP_H - W + 4); }
      else { lamp(x + 40, W - 4); }
    }
    // колонны по углам
    const col = ['#8a6450', '#585070', '#7a5636', '#9a6a82', '#5c5868'][d];
    for (const [x, y] of [[0, 0], [MAP_W - W - 10, 0], [0, MAP_H - W - 10], [MAP_W - W - 10, MAP_H - W - 10]]) {
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 6, y + 8, W + 10, W + 10);
      c.fillStyle = col; c.fillRect(x, y, W + 10, W + 10); c.lineWidth = 3; c.strokeStyle = INK; c.strokeRect(x + 1.5, y + 1.5, W + 7, W + 7);
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x + 8, y + 8, W - 6, W - 6);
      c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(x + 16, y + 16, W - 22, W - 22);
    }
  }

  function drawDecor(c, kind, x, y, w, h, R, F) {
    const ink = INK;
    const box = (fill, rad) => { c.beginPath(); c.moveTo(x + rad, y); c.arcTo(x + w, y, x + w, y + h, rad); c.arcTo(x + w, y + h, x, y + h, rad); c.arcTo(x, y + h, x, y, rad); c.arcTo(x, y, x + w, y, rad); c.closePath(); c.fillStyle = fill; c.fill(); c.lineWidth = 3; c.strokeStyle = ink; c.stroke(); };
    const shadow = () => { c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(x + 5, y + 6, w, h); };
    const cx = x + w / 2, cy = y + h / 2;
    switch (kind) {
      case 'rug': c.fillStyle = ['#e88aa5', '#8fb8e8', '#f0c46b'][Math.floor(R() * 3)]; c.beginPath(); c.ellipse(cx, cy, w / 2, h / 2, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(cx, cy, w / 3, h / 3, 0, 0, 7); c.fill(); break;
      case 'net': c.strokeStyle = 'rgba(60,60,80,0.5)'; c.lineWidth = 2; for (let i = 0; i <= w; i += 12) { c.beginPath(); c.moveTo(x + i, y); c.lineTo(x + i, y + h); c.stroke(); } for (let i = 0; i <= h; i += 12) { c.beginPath(); c.moveTo(x, y + i); c.lineTo(x + w, y + i); c.stroke(); } break;
      case 'bed': shadow(); box('#f7f3ff', 10); c.fillStyle = '#9fb4e8'; c.fillRect(x + 3, y + h * 0.35, w - 6, h * 0.65 - 3); c.fillStyle = '#ffffff'; c.fillRect(x + 8, y + 6, w * 0.35, h * 0.22); c.fillRect(x + w * 0.55, y + 6, w * 0.35, h * 0.22); break;
      case 'sofa': shadow(); box('#c98fb0', 12); c.fillStyle = '#e0a9c6'; c.fillRect(x + 8, y + 12, w - 16, h - 20); break;
      case 'table': shadow(); box('#b07a4f', 8); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(cx - 6, cy, 5, 0, 7); c.fill(); c.fillStyle = '#ff9a5a'; c.beginPath(); c.arc(cx + 8, cy + 2, 4, 0, 7); c.fill(); break;
      case 'box': shadow(); box('#d9a35f', 4); c.strokeStyle = '#a8763c'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y + h); c.moveTo(x + w, y); c.lineTo(x, y + h); c.stroke(); break;
      case 'shelf': case 'rack': shadow(); box(kind === 'rack' ? '#c9c3e6' : '#8a6a55', 4); for (let i = 1; i < 4; i++) { c.fillStyle = ['#ff9fbf', '#7fd1ff', '#8ee08a'][i - 1]; c.fillRect(x + 6 + (i - 1) * (w - 12) / 3, y + 6, (w - 12) / 3 - 4, h - 12); } break;
      case 'armor': shadow(); box('#d9dde6', 12); c.fillStyle = INK; c.fillRect(cx - 8, cy - 2, 16, 4); break;
      case 'barrel': c.fillStyle = 'rgba(0,0,0,0.15)'; c.beginPath(); c.arc(cx + 4, cy + 5, w / 2, 0, 7); c.fill(); c.fillStyle = '#b07a4f'; c.beginPath(); c.arc(cx, cy, w / 2, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = ink; c.stroke(); c.beginPath(); c.arc(cx, cy, w / 3, 0, 7); c.stroke(); break;
      case 'anchor': c.strokeStyle = '#5b6578'; c.lineWidth = 6; c.beginPath(); c.moveTo(cx, y); c.lineTo(cx, y + h); c.moveTo(x, cy + 6); c.quadraticCurveTo(cx, y + h + 10, x + w, cy + 6); c.stroke(); break;
      case 'rope': c.strokeStyle = '#c9a26b'; c.lineWidth = 5; c.beginPath(); for (let i = 0; i < 3; i++) c.arc(cx, cy, 6 + i * 6, 0, 7); c.stroke(); break;
      case 'plant': case 'bush': c.fillStyle = 'rgba(0,0,0,0.15)'; c.beginPath(); c.arc(cx + 4, cy + 5, w / 2, 0, 7); c.fill(); c.fillStyle = kind === 'bush' ? '#6fae62' : '#7cc47a'; for (let i = 0; i < 5; i++) { const a = i * 1.25; c.beginPath(); c.arc(cx + Math.cos(a) * w / 5, cy + Math.sin(a) * w / 5, w / 3.2, 0, 7); c.fill(); } c.lineWidth = 2; c.strokeStyle = ink; c.beginPath(); c.arc(cx, cy, w / 2.2, 0, 7); c.stroke(); break;
      case 'tree': c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(cx + 8, cy + 10, w / 2, h / 2, 0, 0, 7); c.fill(); c.fillStyle = '#5a8f5a'; c.beginPath(); c.ellipse(cx, cy, w / 2, h / 2, 0, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = ink; c.stroke(); c.fillStyle = '#6fa86b'; c.beginPath(); c.ellipse(cx - 8, cy - 8, w / 4, h / 4, 0, 0, 7); c.fill(); break;
      case 'grave': shadow(); c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + w / 2); c.arc(cx, y + w / 2, w / 2, Math.PI, 0); c.lineTo(x + w, y + h); c.closePath(); c.fillStyle = '#b8b4c4'; c.fill(); c.lineWidth = 3; c.strokeStyle = ink; c.stroke(); c.fillStyle = '#8a8698'; c.fillRect(cx - 2, y + w / 2 - 8, 4, 16); c.fillRect(cx - 7, y + w / 2 - 3, 14, 4); break;
      case 'pumpkin': c.fillStyle = '#ff9a3d'; c.beginPath(); c.ellipse(cx, cy, w / 2.2, h / 2.6, 0, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = ink; c.stroke(); c.fillStyle = '#5a8f5a'; c.fillRect(cx - 2, cy - h / 2.6 - 5, 4, 8); break;
      case 'lamp': c.fillStyle = 'rgba(255,240,170,0.35)'; c.beginPath(); c.arc(cx, cy, 40, 0, 7); c.fill(); c.fillStyle = '#ffe9a0'; c.beginPath(); c.arc(cx, cy, 10, 0, 7); c.fill(); c.lineWidth = 2; c.strokeStyle = ink; c.stroke(); break;
    }
  }

  function drawMap() {
    if (!mapCanvas) buildMap();
    ctx.drawImage(mapCanvas, 0, 0, MAP_W, MAP_H);
    if (moonActive()) { ctx.fillStyle = 'rgba(255,240,150,0.10)'; ctx.fillRect(0, 0, MAP_W, MAP_H); }
  }

  // Стрелки к важным целям за пределами экрана
  function drawOffscreenArrows() {
    const targets = [];
    for (const g of ghosts) if ((g.boss || g.raid) && g.hp > 0) targets.push({ x: g.x, y: g.y, color: '#ffc94d' });
    if (gold) targets.push({ x: gold.x, y: gold.y, color: '#ffd84d' });
    for (const sh of shards) targets.push({ x: sh.x, y: sh.y, color: '#9ff3ff', small: true });
    for (const t of targets) {
      const p = toScreen(t.x, t.y);
      if (p.x > 10 && p.x < VIEW.w - 10 && p.y > VIEW.y + 10 && p.y < VIEW.y + VIEW.h - 10) continue;
      const a = Math.atan2(p.y - VIEW_CY, p.x - VIEW_CX);
      const ex = Math.max(18, Math.min(VIEW.w - 18, VIEW_CX + Math.cos(a) * 400));
      const ey = Math.max(VIEW.y + 18, Math.min(VIEW.y + VIEW.h - 18, VIEW_CY + Math.sin(a) * 400));
      const r = t.small ? 7 : 11;
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
      ctx.fillStyle = t.color; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r, -r * 0.8); ctx.lineTo(-r * 0.4, 0); ctx.lineTo(-r, r * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  function drawGhost(g) {
    const def = GHOSTS[g.type];
    const by = g.y + Math.sin(g.phase) * 4;
    // тень на полу
    if (!g.capturing) {
      const sk = 1 - Math.sin(g.phase) * 0.08;
      ctx.fillStyle = `rgba(30,15,50,${0.22 * Math.min(1, g.alpha)})`; ctx.beginPath(); ctx.ellipse(g.x, g.y + g.r * 1.35 + 6, g.r * 0.8 * sk, g.r * 0.25 * sk, 0, 0, 7); ctx.fill();
    }
    // портал при появлении
    if (g.alpha < 1 && !g.dying) {
      const k = 1 - g.alpha;
      ctx.strokeStyle = `rgba(190,150,255,${k})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(g.x, g.y + g.r * 1.35 + 6, g.r * (1.7 - k * 0.5), g.r * (0.55 - k * 0.15), 0, 0, 7); ctx.stroke();
      ctx.fillStyle = `rgba(120,80,200,${k * 0.35})`; ctx.fill();
    }
    // шлейф и свечение
    if (!g.capturing && !g.dying) {
      g.trail = g.trail || [];
      g.trail.push(g.x, by); if (g.trail.length > 14) g.trail.splice(0, 2);
      const n = g.trail.length / 2;
      for (let i = 0; i < n - 1; i++) { const k = i / n; ctx.fillStyle = alpha(def.body, 0.18 * k * g.alpha); ctx.beginPath(); ctx.arc(g.trail[i * 2], g.trail[i * 2 + 1] + g.r * 0.6, g.r * (0.3 + 0.4 * k), 0, 7); ctx.fill(); }
      const ag = ctx.createRadialGradient(g.x, by, g.r * 0.6, g.x, by, g.r * 2.1);
      ag.addColorStop(0, alpha(def.body, 0.32 * g.alpha)); ag.addColorStop(1, alpha(def.body, 0));
      ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(g.x, by, g.r * 2.1, 0, 7); ctx.fill();
    }
    ctx.save();
    let a = g.alpha;
    if (g.dying) a *= Math.max(0, g.dying / 0.35);
    ctx.globalAlpha = a;
    const x = g.x, y = g.y + Math.sin(g.phase) * 4;
    let r = g.r;
    if (g.capturing) {
      const k = g.capturing / 0.6;
      if (g.captureOk) r *= 0.3 + 0.7 * k;
      ctx.translate(x, y); ctx.rotate((1 - k) * 8); ctx.translate(-x, -y);
    }
    if (g.dying) r *= 1 + (0.35 - g.dying) * 2;
    const low = lowHp(g) && !g.capturing;
    if (low) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 10);
      ctx.fillStyle = `rgba(160,255,200,${0.25 + 0.3 * pulse})`;
      ctx.beginPath(); ctx.arc(x, y, r + 12 + pulse * 4, 0, Math.PI * 2); ctx.fill();
    }
    const dx = cat.x - g.x, dy = cat.y - g.y, dl = Math.hypot(dx, dy) || 1;
    ghostSprite(g.type, x, y, r, { hit: g.hit > 0, phase: g.phase, lookX: dx / dl, lookY: dy / dl });
    ctx.restore();
    if (g.hp > 0 && !g.capturing && g.alpha > 0.5) {
      if (!g.boss) {
        const w = r * 2;
        rr(x - w / 2, g.y - r - 14, w, 5, 2); ctx.fillStyle = INK; ctx.fill();
        rr(x - w / 2, g.y - r - 14, w * Math.max(0, g.hp / g.maxHp), 5, 2); ctx.fillStyle = low ? '#7dff9e' : '#ff6b8a'; ctx.fill();
      }
      if (low) text('ТАП!', x, g.y + r + 22, 12, '#7dff9e');
    }
  }

  function drawCat() {
    const walk = cat.moving ? Math.sin(cat.bob * 3) : 0;
    const x = cat.x, y = cat.y + (cat.moving ? -Math.abs(walk) * 3 : Math.sin(cat.bob) * 1.5);
    if (cat.hurt > 0 && Math.sin(time * 60) > 0) return;
    // тёплое пятно света под котом
    const lg = ctx.createRadialGradient(cat.x, cat.y + 20, 10, cat.x, cat.y + 20, 90);
    lg.addColorStop(0, 'rgba(255,240,190,0.28)'); lg.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(cat.x, cat.y + 20, 90, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(30,15,50,0.25)'; ctx.beginPath(); ctx.ellipse(x, cat.y + 28, 30 - Math.abs(walk) * 3, 8, 0, 0, Math.PI * 2); ctx.fill();
    const SK = SKINS[S.skin] || SKINS.ginger;
    const fur = (cx, cy, rad) => { const g = ctx.createRadialGradient(cx - rad * 0.35, cy - rad * 0.45, rad * 0.1, cx, cy, rad * 1.3); g.addColorStop(0, shade(SK.body, 0.4)); g.addColorStop(0.55, SK.body); g.addColorStop(1, shade(SK.body, -0.25)); return g; };
    // лапки
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    for (const [fx, ph] of [[-11, 1], [11, -1]]) { ctx.fillStyle = shade(SK.body, -0.1); ctx.beginPath(); ctx.ellipse(x + fx, cat.y + 25 + walk * ph * 3, 8, 5, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.strokeStyle = SK.body; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 18, y + 14); ctx.quadraticCurveTo(x + 44, y + 4 + Math.sin(time * 3) * 6, x + 36, y - 16); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    if (SK.cape) { ctx.fillStyle = '#7a2340'; ctx.beginPath(); ctx.moveTo(x - 20, y - 6); ctx.lineTo(x + 20, y - 6); ctx.lineTo(x + 30, y + 30); ctx.lineTo(x - 30, y + 30); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = fur(x, y + 8, 24); ctx.beginPath(); ctx.ellipse(x, y + 8, 24, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = shade(SK.body, 0.5); ctx.beginPath(); ctx.ellipse(x + 3, y + 13, 12, 10, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = SK.dark; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(x + sx * 22, y + 2 + i * 8); ctx.lineTo(x + sx * 15, y + 4 + i * 8); ctx.stroke(); }
    ctx.lineCap = 'butt'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    // бак-ловушка с эктоплазмой
    rr(x - 35, y - 7, 18, 30, 6); ctx.fillStyle = kindPower('rocket') > 0 ? ATTACH.rocket.color : '#8a7bd1'; ctx.fill(); ctx.stroke();
    rr(x - 31, y - 2, 10, 20, 4); ctx.fillStyle = '#243042'; ctx.fill();
    const lvl = 0.55 + Math.sin(time * 2) * 0.08;
    rr(x - 31, y - 2 + 20 * (1 - lvl), 10, 20 * lvl, 4); ctx.fillStyle = '#7dff9e'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(x - 26, y + 14 - ((time * 18) % 12), 1.6, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - 30, y, 2, 15);
    rr(x - 31, y - 2, 10, 20, 4); ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 3;
    const hy = y - 22;
    ctx.fillStyle = SK.body;
    ctx.beginPath(); ctx.moveTo(x - 22, hy - 6); ctx.lineTo(x - 18, hy - 30); ctx.lineTo(x - 4, hy - 16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 22, hy - 6); ctx.lineTo(x + 18, hy - 30); ctx.lineTo(x + 4, hy - 16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffb3c6'; ctx.beginPath(); ctx.moveTo(x - 18, hy - 10); ctx.lineTo(x - 17, hy - 24); ctx.lineTo(x - 9, hy - 16); ctx.closePath(); ctx.moveTo(x + 18, hy - 10); ctx.lineTo(x + 17, hy - 24); ctx.lineTo(x + 9, hy - 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = fur(x, hy, 26); ctx.beginPath(); ctx.ellipse(x, hy, 26, 21, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = shade(SK.body, 0.45); ctx.beginPath(); ctx.ellipse(x, hy + 8, 13, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = SK.dark; ctx.fillRect(x - 3, hy - 20, 6, 8); ctx.fillRect(x - 11, hy - 18, 4, 6); ctx.fillRect(x + 7, hy - 18, 4, 6);
    if (SK.mask) { ctx.fillStyle = '#2b2340'; ctx.fillRect(x - 25, hy - 7, 50, 11); ctx.fillStyle = '#ff5c7a'; ctx.fillRect(x + 22, hy - 6, 10, 4); }
    if (SK.sparkle && Math.sin(time * 5) > 0.6) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + 14, hy - 12, 2.5, 0, 7); ctx.fill(); }
    const elx = Math.cos(cat.aim) * 1.6, ely = Math.sin(cat.aim) * 1.2;
    const blinkC = Math.sin(time * 0.9) > 0.99;
    ctx.fillStyle = SK.mask ? '#ffffff' : INK;
    if (blinkC) { ctx.fillRect(x - 13, hy - 1, 8, 2.5); ctx.fillRect(x + 5, hy - 1, 8, 2.5); }
    else {
      ctx.beginPath(); ctx.ellipse(x - 9 + elx, hy - 1 + ely, 4, 4.8, 0, 0, Math.PI * 2); ctx.ellipse(x + 9 + elx, hy - 1 + ely, 4, 4.8, 0, 0, Math.PI * 2); ctx.fill();
      if (!SK.mask) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x - 10.5 + elx, hy - 3 + ely, 1.6, 0, 7); ctx.arc(x + 7.5 + elx, hy - 3 + ely, 1.6, 0, 7); ctx.fill(); }
    }
    ctx.fillStyle = '#ff8fa8'; ctx.beginPath(); ctx.moveTo(x - 3, hy + 3); ctx.lineTo(x + 3, hy + 3); ctx.lineTo(x, hy + 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(43,35,64,0.55)'; ctx.lineWidth = 1.3;
    for (const sx of [-1, 1]) for (const dy of [-2, 2]) { ctx.beginPath(); ctx.moveTo(x + sx * 14, hy + 5 + dy * 0.5); ctx.lineTo(x + sx * 33, hy + 3 + dy * 2); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,110,140,0.6)';
    ctx.beginPath(); ctx.ellipse(x - 16, hy + 7, 5, 3, 0, 0, Math.PI * 2); ctx.ellipse(x + 16, hy + 7, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 3, hy + 6); ctx.quadraticCurveTo(x, hy + 9, x, hy + 6); ctx.quadraticCurveTo(x, hy + 9, x + 3, hy + 6); ctx.stroke();
    // корона за Освящения
    if (S.prestiges > 0) {
      ctx.fillStyle = '#fff1a8'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, hy - 28, 14, 4, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const nz = nozzle();
    ctx.strokeStyle = '#5b4e9e'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x - 26, y); ctx.quadraticCurveTo(x - 10, y + 22, (x + nz.x) / 2, (y - 18 + nz.y) / 2 + 6); ctx.stroke();
    const eq = equippedItems();
    ctx.save(); ctx.translate(x, y - 18); ctx.rotate(cat.aim);
    ctx.fillStyle = '#b9afe8'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    rr(4 - cat.recoil * 4, -5, 26, 10, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = eq.length ? ATTACH[eq[0].kind].color : '#ff7a9c';
    const wide = kindPower('wide') > 0 ? 6 : 0;
    rr(26 - cat.recoil * 4, -9 - wide / 2, 10, 18 + wide, 3); ctx.fill(); ctx.stroke();
    if (cat.recoil > 0.2) { // вспышка на сопле
      ctx.globalCompositeOperation = 'lighter';
      const mg = ctx.createRadialGradient(40, 0, 1, 40, 0, 18 * cat.recoil + 6);
      mg.addColorStop(0, 'rgba(255,255,255,0.9)'); mg.addColorStop(0.4, alpha(eq.length ? ATTACH[eq[0].kind].color : '#ff7a9c', 0.6)); mg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(40, 0, 18 * cat.recoil + 6, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  function drawHazards() {
    for (const sh of shards) {
      const a = sh.life < 2 ? 0.5 + 0.5 * Math.sin(time * 20) : 1;
      ctx.globalAlpha = a;
      const y = sh.y + Math.sin(time * 4 + sh.x) * 3;
      ctx.fillStyle = '#9ff3ff'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sh.x, y - 10); ctx.lineTo(sh.x + 8, y); ctx.lineTo(sh.x, y + 10); ctx.lineTo(sh.x - 8, y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const p of shots) {
      ctx.fillStyle = 'rgba(180,140,255,0.35)'; ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, 7); ctx.fill();
      ctx.fillStyle = '#b48cff'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, 7); ctx.fill(); ctx.stroke();
    }
    // полоска смелости под котом
    if (cat.hp < CAT_MAX_HP) {
      rr(cat.x - 26, cat.y + 34, 52, 7, 3); ctx.fillStyle = INK; ctx.fill();
      rr(cat.x - 26, cat.y + 34, 52 * Math.max(0, cat.hp / CAT_MAX_HP), 7, 3); ctx.fillStyle = cat.hp < 35 ? '#ff6b8a' : '#ffc94d'; ctx.fill();
    }
  }

  function drawJoystick() {
    if (!joy || !joy.drag || panel) return;
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(joy.sx, joy.sy, 45, 0, 7); ctx.stroke();
    const vx = joy.x - joy.sx, vy = joy.y - joy.sy, len = Math.hypot(vx, vy), k = len > 45 ? 45 / len : 1;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(joy.sx + vx * k, joy.sy + vy * k, 18, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawOrbiter(o) {
    if (!o) return;
    ctx.save(); ctx.globalAlpha = 0.95;
    ghostSprite(o.it.type, o.x, o.y, 11, { phase: time * 3 });
    ctx.restore();
  }

  function drawTopBar() {
    ctx.fillStyle = INK; ctx.fillRect(0, 0, W, 70);
    text('Дом ' + S.house, 14, 18, 16, '#ffffff', 'left');
    text(district().name, 14, 38, 10, '#c9c3e6', 'left', '700');
    if (raid) text('РЕЙД · ' + Math.ceil(raid.t) + ' с', 14, 55, 11, '#d68cff', 'left');
    else text(isBossRoom() ? 'БОСС' : 'Комната ' + S.room + '/' + ROOMS_PER_HOUSE, 14, 55, 11, isBossRoom() ? '#ffc94d' : '#c9c3e6', 'left');
    const p = isBossRoom() ? (bossSpawned ? Math.max(0, bossTimer / BOSS_TIME) : 1) : Math.min(1, S.cleared / GHOSTS_PER_ROOM);
    rr(120, 48, 120, 12, 6); ctx.fillStyle = '#4a3f66'; ctx.fill();
    rr(120, 48, 120 * p, 12, 6); ctx.fillStyle = isBossRoom() ? '#ffc94d' : '#7dff9e'; ctx.fill();
    if (isBossRoom() && bossSpawned) text(Math.ceil(bossTimer) + ' с', 180, 54, 10, INK, 'center', '700');
    ctx.fillStyle = '#7dff9e'; ctx.beginPath(); ctx.arc(302, 18, 7, 0, 7); ctx.fill();
    text(fmt(S.ecto), 290, 18, 15, '#ffffff', 'right');
    text('💎 ' + S.crystals, 346, 42, 12, '#9ff3ff', 'right');
    text('🫙 ' + S.jars, 286, 42, 12, '#ffe7b0', 'right');
    if (S.stones > 0) text('🌙 ' + S.stones, 346, 60, 11, '#fff1a8', 'right');
    const rb = ghosts.find((g) => g.raid);
    if (rb) {
      rr(30, 82, 300, 14, 7); ctx.fillStyle = INK; ctx.fill();
      rr(30, 82, 300 * Math.max(0, rb.hp / rb.maxHp), 14, 7); ctx.fillStyle = '#d68cff'; ctx.fill();
      text('Призрачный особняк · этаж ' + (raid.floor + 1), 180, 89, 10, '#ffffff', 'center', '700');
    }
    const boss = ghosts.find((g) => g.boss && g.hp > 0);
    if (boss) {
      rr(30, 82, 300, 14, 7); ctx.fillStyle = INK; ctx.fill();
      rr(30, 82, 300 * Math.max(0, boss.hp / boss.maxHp), 14, 7); ctx.fillStyle = lowHp(boss) ? '#7dff9e' : '#ff6b8a'; ctx.fill();
      text(GHOSTS[boss.type].name + ' · ' + fmt(boss.hp), 180, 89, 10, '#ffffff', 'center', '700');
    }
    // кнопка Полнолуния в углу боевой зоны
    const now = Date.now();
    const ready = !moonActive() && now >= S.moonReadyAt;
    ctx.fillStyle = moonActive() ? '#fff1a8' : ready ? '#ffc94d' : '#6b5f86';
    ctx.beginPath(); ctx.arc(330, 128, 22, 0, 7); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    text('🌕', 330, 126, 18, '#ffffff');
    const sub = moonActive() ? Math.ceil((S.moonUntil - now) / 1000) + 'с' : ready ? 'x2' : Math.ceil((S.moonReadyAt - now) / 1000) + 'с';
    text(sub, 330, 158, 11, '#ffffff');
    if (ready) badge(346, 110);
    btn(304, 102, 52, 66, activateMoon);
    // автопрокачка и автослияние
    ['up', 'merge'].forEach((k, i) => {
      const a = AUTO[k], x = 306, y = 176 + i * 58;
      const avail = autoAvailable(k), run = autoRunning(k);
      rr(x, y, 48, 50, 12); ctx.fillStyle = run ? '#8ee08a' : avail ? '#9b93b3' : '#8a7bd1'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      ctx.save(); ctx.translate(x + 24, y + 18); if (run) ctx.rotate(time * 2); text(a.icon, 0, 0, 16, '#ffffff'); ctx.restore();
      let sub;
      if (autoOwned(k)) sub = run ? '∞' : 'пауза';
      else if (avail) { const ms = S[a.until] - Date.now(); sub = run ? Math.floor(ms / 60000) + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0') : 'пауза'; }
      else sub = '🎬';
      text(sub, x + 24, y + 39, 10, '#ffffff');
      btn(x, y, 48, 50, () => autoButton(k));
    });
    // переключатель автопилота
    ctx.fillStyle = S.auto ? '#8ee08a' : '#6b5f86';
    rr(132, 8, 92, 28, 14); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    text('АВТО ' + (S.auto ? 'вкл' : 'выкл'), 178, 22, 11, '#ffffff');
    btn(128, 4, 100, 36, () => { S.auto = !S.auto; showToast(S.auto ? 'Автопилот включён' : 'Веди кота свайпом по экрану'); });
    if (vipActive()) text('VIP', 236, 22, 11, '#ffc94d', 'left');
    // боковые кнопки: рейд, колесо, награды дня
    if (!raid) {
      [
        { icon: '🏚', label: 'Рейд', id: 'raid', b: S.raid.tickets > 0 },
        { icon: '🎡', label: 'Колесо', id: 'wheel', b: S.wheel.free > 0 },
        { icon: '🎁', label: 'Награды', id: 'daily', b: dailyReady() },
      ].forEach((f, i) => {
        const x = 6, y = 104 + i * 56;
        rr(x, y, 46, 48, 12); ctx.fillStyle = '#8a7bd1'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
        text(f.icon, x + 23, y + 18, 17, '#ffffff');
        text(f.label, x + 23, y + 39, 8, '#ffffff');
        if (f.b) badge(x + 42, y + 4);
        btn(x, y, 46, 48, () => { panel = f.id; });
      });
    }
  }

  const TABS = [
    { id: 'squad', icon: '👻', name: 'Отряд', badge: () => squadMergeable() },
    { id: 'attach', icon: '🧹', name: 'Насадки', badge: () => S.crystals >= SUMMON_COST || attachMergeable() },
    { id: 'bestiary', icon: '📖', name: 'Бестиарий', badge: () => anyBestClaimable() },
    { id: 'quests', icon: '📜', name: 'Задания', badge: () => anyQuestDone() },
    { id: 'prestige', icon: '✨', name: 'Освящение', badge: () => stonesFor(S.house) > 0 },
    { id: 'shop', icon: '🛒', name: 'Магазин', badge: () => Date.now() >= S.adCrystalsAt || !S.starter },
  ];

  function drawBottom() {
    ctx.fillStyle = '#3a2f55'; ctx.fillRect(0, 512, W, 128);
    UPGRADES.forEach((u, i) => {
      const x = 8 + i * 116, y = 517, w = 112, h = 58;
      const cost = upgradeCost(S[u.key], u.base);
      const can = S.ecto >= cost;
      rr(x, y, w, h, 12); ctx.fillStyle = can ? u.color : '#6b5f86'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      text(u.name + ' ' + S[u.key], x + w / 2, y + 12, 12, '#ffffff');
      text(u.desc(), x + w / 2, y + 27, 10, INK, 'center', '700');
      rr(x + 8, y + 35, w - 16, 18, 7); ctx.fillStyle = 'rgba(43,35,64,0.85)'; ctx.fill();
      text(fmt(cost), x + w / 2, y + 44, 12, can ? '#7dff9e' : '#ff9aa9');
      btn(x, y, w, h, () => buyUpgrade(u));
    });
    TABS.forEach((t, i) => {
      const x = 4 + i * 59, y = 580, w = 56, h = 54;
      const active = panel === t.id;
      rr(x, y, w, h, 12); ctx.fillStyle = active ? '#ffc94d' : '#8a7bd1'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      text(t.icon, x + w / 2, y + 20, 18, '#ffffff');
      text(t.name, x + w / 2, y + 42, 8, '#ffffff', 'center', '800');
      if (t.badge()) badge(x + w - 6, y + 6);
      btn(x, y, w, h, () => { panel = panel === t.id ? null : t.id; selectedJar = null; selectedAttach = null; });
    });
  }

  // =====================================================================
  // Отрисовка: панели
  // =====================================================================
  function panelFrame(title) {
    ctx.fillStyle = 'rgba(20,14,32,0.75)'; ctx.fillRect(0, 0, W, 574);
    btn(0, 0, W, 574, () => {});
    rr(12, 56, 336, 516, 18); ctx.fillStyle = '#f7efe3'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    text(title, 180, 84, 18, '#ffffff');
    rr(306, 66, 32, 32, 16); ctx.fillStyle = '#ff6b8a'; ctx.fill(); ctx.stroke(); text('✕', 322, 83, 15, '#ffffff');
    btn(306, 66, 32, 32, () => { panel = null; });
  }

  function drawJar(x, y, it, selected) {
    rr(x, y, 58, 66, 10); ctx.fillStyle = selected ? '#fff3c4' : 'rgba(220,240,255,0.9)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = it ? RARITY[GHOSTS[it.type].rarity].color : '#6b5f86'; ctx.stroke();
    ctx.fillStyle = '#8a6a55'; rr(x + 12, y - 4, 34, 9, 3); ctx.fill();
    if (!it) return;
    ghostSprite(it.type, x + 29, y + 30, 13, { phase: 1 });
    text('★'.repeat(it.stars), x + 29, y + 57, 9, '#ffc94d');
  }

  function drawSquadPanel() {
    panelFrame('Отряд призраков');
    S.squad.forEach((id, i) => {
      const n = S.squad.length, step = n > 4 ? 64 : 76;
      const x = 180 - ((n - 1) * step + 58) / 2 + i * step, y = 106;
      drawJar(x, y, findItem(id), false);
      btn(x, y, 58, 66, () => {
        if (selectedJar) { S.squad = S.squad.map((s) => (s === selectedJar ? null : s)); S.squad[i] = selectedJar; selectedJar = null; }
        else if (id) S.squad[i] = null;
      });
    });
    const power = S.squad.reduce((s, id) => { const it = findItem(id); return s + (it ? squadDamage(it) : 0); }, 0);
    text('Урон отряда: ' + fmt(power) + ' / выстрел', 180, 186, 12, INK, 'center', '700');
    const counts = squadDistrictCounts();
    const syn = Object.keys(counts).filter((d) => counts[d] >= 2).map((d) => DISTRICTS[d].name + (counts[d] >= 4 ? ' (сет!)' : ''));
    text(syn.length ? 'Синергия: ' + syn.join(', ') : 'Синергия: 2 духа из одного района +20%, 4 = сет', 180, 204, 10, syn.length ? '#2f8f4e' : '#6b5f86', 'center', '700');

    const cols = 5, sx = 24, sy = 220;
    const list = [...S.inventory].sort((a, b) => itemPower(b) - itemPower(a)).slice(0, 20);
    list.forEach((it, i) => {
      const x = sx + (i % cols) * 63, y = sy + Math.floor(i / cols) * 72;
      drawJar(x, y, it, selectedJar === it.id);
      if (S.squad.includes(it.id)) text('в отряде', x + 29, y + 46, 8, '#7dff9e');
      btn(x, y, 58, 66, () => { selectedJar = selectedJar === it.id ? null : it.id; });
    });
    if (!list.length) {
      text('Пусто. Ослабь призрака и тапни по нему,', 180, 300, 13, INK, 'center', '600');
      text('чтобы засосать его в банку.', 180, 318, 13, INK, 'center', '600');
    }
    const sel = selectedJar && findItem(selectedJar);
    if (sel) {
      const def = GHOSTS[sel.type];
      text(def.name + ' · ' + RARITY[def.rarity].name + ' · ' + sel.stars + '★ · ' + fmt(squadDamage(sel)), 180, 512, 11, INK, 'center', '700');
      text('Тапни слот отряда, чтобы поставить', 180, 527, 10, '#6b5f86', 'center', '700');
    }
    button(22, 536, 100, 30, 'Слить всё', '#8ee08a', mergeSquad);
    button(130, 536, 100, 30, 'Лучший отряд', '#7fd1ff', () => { bestSquad(); showToast('Отряд собран'); });
    button(238, 536, 100, 30, 'Отпустить', '#ff9aa9', () => { if (sel) releaseJar(sel.id); else showToast('Выбери банку'); });
  }

  function drawAttachCard(x, y, w, h, a, selected) {
    rr(x, y, w, h, 10); ctx.fillStyle = selected ? '#fff3c4' : '#ffffff'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = a ? RANK_COLORS[a.rank] : '#c9c3e6'; ctx.stroke();
    if (!a) { text('пусто', x + w / 2, y + h / 2, 10, '#9b93b3', 'center', '700'); return; }
    const k = ATTACH[a.kind];
    const cx = x + w / 2, cy = y + h * 0.42;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.6);
    rr(-16, -4, 22, 8, 3); ctx.fillStyle = '#b9afe8'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    rr(4, -8, 10, 16, 3); ctx.fillStyle = k.color; ctx.fill(); ctx.stroke();
    ctx.restore();
    rr(x + 3, y + 3, 26, 15, 5); ctx.fillStyle = RANK_COLORS[a.rank]; ctx.fill();
    text(RANKS[a.rank], x + 16, y + 11, 10, '#ffffff');
    text(k.name, cx, y + h - 10, 8, INK, 'center', '800');
  }

  function drawAttachPanel() {
    panelFrame('Насадки пылесоса');
    const eqItems = S.equipped.map((id) => S.attach.find((a) => a.id === id));
    eqItems.forEach((a, i) => {
      const n = eqItems.length, cw = n > 3 ? 70 : 92, step = cw + 8;
      const x = 180 - ((n - 1) * step + cw) / 2 + i * step, y = 104;
      drawAttachCard(x, y, cw, 80, a, false);
      btn(x, y, cw, 80, () => {
        if (selectedAttach) { S.equipped = S.equipped.map((s) => (s === selectedAttach ? null : s)); S.equipped[i] = selectedAttach; selectedAttach = null; }
      });
    });
    text('Урон x' + fmt(attachMult(), 2) + ' · крит ' + Math.round(critChance() * 100) + '% x' + fmt(critMult(), 1), 180, 196, 11, INK, 'center', '700');

    const list = [...S.attach].sort((a, b) => b.rank - a.rank || a.kind.localeCompare(b.kind)).slice(0, 15);
    list.forEach((a, i) => {
      const x = 24 + (i % 5) * 63, y = 212 + Math.floor(i / 5) * 66;
      drawAttachCard(x, y, 58, 60, a, selectedAttach === a.id);
      if (S.equipped.includes(a.id)) { ctx.fillStyle = '#2f8f4e'; ctx.beginPath(); ctx.arc(x + 50, y + 9, 5, 0, 7); ctx.fill(); }
      btn(x, y, 58, 60, () => { selectedAttach = selectedAttach === a.id ? null : a.id; });
    });
    if (!list.length) {
      text('Насадок пока нет.', 180, 300, 13, INK, 'center', '600');
      text('Призови первую за кристаллы.', 180, 318, 13, INK, 'center', '600');
    }
    const sel = selectedAttach && S.attach.find((a) => a.id === selectedAttach);
    if (sel) {
      text(ATTACH[sel.kind].name + ' [' + RANKS[sel.rank] + ']: ' + ATTACH[sel.kind].desc, 180, 418, 11, INK, 'center', '700');
      text('Тапни верхний слот, чтобы надеть', 180, 433, 10, '#6b5f86', 'center', '700');
    } else {
      text('Шансы: D 60% · C 27% · B 10% · A 2.5% · S 0.5%', 180, 425, 10, '#6b5f86', 'center', '700');
    }
    const freeReady = Date.now() >= S.adSummonAt;
    button(70, 448, 220, 30, freeReady ? '🎬 Бесплатный призыв' : 'Бесплатно через ' + Math.ceil((S.adSummonAt - Date.now()) / 60000) + ' мин', '#ffc94d',
      () => { if (freeReady) showAd('Бесплатный призыв насадки', () => { S.adSummonAt = Date.now() + 4 * 3600e3; S.crystals += SUMMON_COST; summon(1); }); }, 12, freeReady);
    if (!vipActive()) text('4-й слот насадок — в VIP', 180, 494, 10, '#6b5f86', 'center', '700');
    button(22, 516, 100, 46, 'Призыв\n', '#d68cff', () => summon(1), 12, S.crystals >= SUMMON_COST);
    text(SUMMON_COST + ' 💎', 72, 550, 10, '#ffffff');
    button(130, 516, 100, 46, 'x10\n', '#ffc94d', () => summon(10), 12, S.crystals >= SUMMON_COST * 9);
    text(SUMMON_COST * 9 + ' 💎', 180, 550, 10, '#ffffff');
    button(238, 516, 100, 46, 'Слить всё', '#8ee08a', mergeAttach);
  }

  function drawBestiaryPanel() {
    panelFrame('Бестиарий');
    const d = DISTRICTS[bestPage];
    button(26, 104, 36, 30, '‹', '#8a7bd1', () => { bestPage = (bestPage + DISTRICTS.length - 1) % DISTRICTS.length; }, 18);
    button(298, 104, 36, 30, '›', '#8a7bd1', () => { bestPage = (bestPage + 1) % DISTRICTS.length; }, 18);
    text(d.name, 180, 113, 14, INK, 'center', '800');
    text('дома ' + (bestPage * HOUSES_PER_DISTRICT + 1) + '–' + ((bestPage + 1) * HOUSES_PER_DISTRICT), 180, 128, 10, '#6b5f86', 'center', '700');
    const types = d.ghosts.concat(d.boss);
    types.forEach((type, i) => {
      const x = 24 + (i % 2) * 160, y = 142 + Math.floor(i / 2) * 182;
      const def = GHOSTS[type];
      const n = S.bestiary[type] || 0;
      const got = S.bestClaimed[type] || 0;
      rr(x, y, 152, 174, 12); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = RARITY[def.rarity].color; ctx.stroke();
      ghostSprite(type, x + 76, y + 48, 24, { silhouette: n === 0, phase: time * 2 });
      text(n ? def.name : '???', x + 76, y + 96, 11, INK, 'center', '800');
      text(RARITY[def.rarity].name + ' · поймано ' + n, x + 76, y + 112, 9, '#6b5f86', 'center', '700');
      if (got < BEST_MILESTONES.length) {
        const goal = BEST_MILESTONES[got];
        rr(x + 12, y + 122, 128, 8, 4); ctx.fillStyle = '#e4ddf3'; ctx.fill();
        rr(x + 12, y + 122, 128 * Math.min(1, n / goal), 8, 4); ctx.fillStyle = '#7dd99a'; ctx.fill();
        if (bestClaimable(type)) button(x + 16, y + 136, 120, 30, 'Забрать ' + BEST_REWARDS[got] + ' 💎', '#8ee08a', () => claimBest(type), 11);
        else text('Цель: ' + goal + ' · ' + BEST_REWARDS[got] + ' 💎 +3%', x + 76, y + 150, 9, '#6b5f86', 'center', '700');
      } else {
        text('Изучен полностью ✓', x + 76, y + 145, 10, '#2f8f4e', 'center', '800');
      }
    });
    text('Бонус бестиария: +' + Math.round((bestiaryMult() - 1) * 100) + '% урона', 180, 512 + 46, 11, INK, 'center', '800');
  }

  function drawQuestsPanel() {
    panelFrame('Задания');
    ensureQuests();
    S.quests.forEach((q, i) => {
      const x = 28, y = 110 + i * 120, w = 304, h = 108;
      const done = questDone(q), prog = questProgress(q);
      rr(x, y, w, h, 12); ctx.fillStyle = done ? '#eafbe9' : '#ffffff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = done ? '#7dd99a' : '#c9c3e6'; ctx.stroke();
      text(QUEST_TYPES[q.kind].text(q.goal), x + 16, y + 22, 14, INK, 'left', '800');
      rr(x + 16, y + 42, w - 32, 14, 7); ctx.fillStyle = '#e4ddf3'; ctx.fill();
      rr(x + 16, y + 42, (w - 32) * (prog / q.goal), 14, 7); ctx.fillStyle = '#7dd99a'; ctx.fill();
      text(prog + ' / ' + q.goal, x + w / 2, y + 49, 10, INK, 'center', '800');
      text('Награда: ' + q.reward + ' 💎', x + 16, y + 82, 12, '#6b5f86', 'left', '700');
      if (done) button(x + w - 128, y + 66, 112, 32, 'Забрать', '#8ee08a', () => claimQuest(i), 13);
    });
    text('Выполненное задание сразу заменяется новым, чуть сложнее.', 180, 486, 10, '#6b5f86', 'center', '700');
    text('Кристаллы тратятся на призыв насадок.', 180, 502, 10, '#6b5f86', 'center', '700');
  }

  function drawPrestigePanel() {
    panelFrame('Освящение');
    const gain = stonesFor(S.house);
    ctx.fillStyle = '#fff1a8'; ctx.beginPath(); ctx.arc(180, 160, 38, 0, 7); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#f7efe3'; ctx.beginPath(); ctx.arc(196, 150, 30, 0, 7); ctx.fill();
    const lines = [
      'Освяти город: дома, эктоплазма и прокачка',
      'сбросятся, но ты получишь лунные камни.',
      'Каждый камень навсегда даёт +10% урона и дохода.',
      'Отряд, насадки, бестиарий и кристаллы остаются.',
    ];
    lines.forEach((l, i) => text(l, 180, 226 + i * 18, 11, INK, 'center', '600'));
    text('Камней сейчас: ' + S.stones + '  (бонус x' + fmt(stoneMult(), 1) + ')', 180, 318, 13, INK, 'center', '800');
    text('Освящений: ' + S.prestiges, 180, 338, 11, '#6b5f86', 'center', '700');
    if (gain > 0) {
      text('Получишь: +' + gain + ' 🌙', 180, 380, 18, '#ffc94d');
      text('дальше дом — больше камней (дом 20 даст ' + stonesFor(20) + ')', 180, 404, 10, '#6b5f86', 'center', '700');
    } else {
      text('Откроется на доме ' + PRESTIGE_HOUSE + ' (сейчас ' + S.house + ')', 180, 380, 14, '#6b5f86', 'center', '800');
    }
    button(80, 440, 200, 54, prestigeConfirm > 0 ? 'Точно? Нажми ещё раз' : '✨ Освятить', prestigeConfirm > 0 ? '#ff7a9c' : '#ffc94d', prestige, 15, gain > 0);
  }

  function drawShopPanel() {
    panelFrame('Магазин');
    [['offers', 'Акции'], ['crystals', 'Кристаллы'], ['skins', 'Скины']].forEach(([id, label], i) => {
      button(28 + i * 104, 102, 96, 30, label, shopTab === id ? '#ffc94d' : '#8a7bd1', () => { shopTab = id; }, 12);
    });
    const now = Date.now();
    if (shopTab === 'offers') {
      const offers = [];
      if (!S.starter) offers.push({ t: 'Стартовый набор', d: 'Эпик-дух ★★, 300 💎, насадка A, 5-й слот отряда', p: '$1.99', c: '#ff9fbf', on: buyStarter, hot: 'x10 выгода' });
      offers.push({ t: vipActive() ? 'VIP активен: ' + Math.ceil((S.vipUntil - now) / 864e5) + ' дн.' : 'VIP на 7 дней', d: 'Вечное x2, автоматизация, 4-й слот насадок, без рекламы, +100 💎/день', p: '$6.99', c: '#ffc94d', on: buyVip });
      if (!S.noAds) offers.push({ t: 'Без рекламы', d: 'Все награды за рекламу выдаются сразу', p: '$4.99', c: '#7fd1ff', on: buyNoAds });
      if (!(S.autoUpForever && S.autoMergeForever)) offers.push({ t: 'Автоматизация', d: 'Автопрокачка и автослияние навсегда', p: '$4.99', c: '#8ee08a', on: buyAutoBundle, hot: 'Удобно' });
      if (!S.weekly) offers.push({ t: 'Набор недели', d: 'Насадка S, 500 💎, 20 банок', p: '$14.99', c: '#d68cff', on: buyWeekly, hot: 'Ограничено' });
      offers.push({ t: '20 банок', d: 'Больше места для пойманных духов', p: '50 💎', c: '#8ee08a', on: () => { if (S.crystals >= 50) { S.crystals -= 50; S.jars += 20; showToast('+20 🫙'); } else showToast('Нужно 50 💎'); } });
      offers.slice(0, 6).forEach((o, i) => {
        const y = 140 + i * 71;
        rr(24, y, 312, 65, 12); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = o.c; ctx.stroke();
        text(o.t, 38, y + 17, 13, INK, 'left', '800');
        wrapText(o.d, 38, y + 35, 196, 9, '#6b5f86', 12);
        if (o.hot) { rr(250, y + 7, 72, 18, 9); ctx.fillStyle = '#ff4d6d'; ctx.fill(); text(o.hot, 286, y + 16, 9, '#ffffff'); }
        button(246, y + 31, 80, 26, o.p, o.c, o.on, 13);
      });
    } else if (shopTab === 'crystals') {
      const freeReady = now >= S.adCrystalsAt;
      const cards = [{ amount: 20, price: freeReady ? '🎬 Бесплатно' : Math.ceil((S.adCrystalsAt - now) / 60000) + ' мин', free: true }].concat(CRYSTAL_PACKS);
      cards.forEach((c, i) => {
        const x = 24 + (i % 2) * 160, y = 142 + Math.floor(i / 2) * 136;
        rr(x, y, 152, 128, 12); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#7fd1ff'; ctx.stroke();
        text('💎'.repeat(Math.min(3, 1 + Math.floor(i / 2))), x + 76, y + 30, 22, '#ffffff');
        text(String(c.amount), x + 76, y + 62, 18, INK, 'center', '800');
        if (c.extra) { rr(x + 98, y + 6, 48, 18, 9); ctx.fillStyle = '#ff4d6d'; ctx.fill(); text(c.extra, x + 122, y + 15, 10, '#ffffff'); }
        const on = c.free
          ? () => { if (freeReady) showAd('Бесплатные кристаллы', () => { S.crystals += 20; S.adCrystalsAt = Date.now() + 3600e3; }); }
          : () => purchase(c.amount + ' кристаллов', c.price, () => { S.crystals += c.amount; });
        button(x + 16, y + 84, 120, 32, c.price, c.free ? '#ffc94d' : '#8ee08a', on, 13, !c.free || freeReady);
      });
    } else {
      Object.keys(SKINS).forEach((k, i) => {
        const sk = SKINS[k];
        const x = 24 + (i % 2) * 160, y = 142 + Math.floor(i / 2) * 136;
        const owned = S.skins.includes(k);
        rr(x, y, 152, 128, 12); ctx.fillStyle = S.skin === k ? '#fff3c4' : '#ffffff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = sk.usd ? '#ffc94d' : '#c9c3e6'; ctx.stroke();
        // мордочка
        const cx = x + 40, cy = y + 40;
        ctx.fillStyle = sk.body; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - 17, cy - 4); ctx.lineTo(cx - 14, cy - 22); ctx.lineTo(cx - 3, cy - 12); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 17, cy - 4); ctx.lineTo(cx + 14, cy - 22); ctx.lineTo(cx + 3, cy - 12); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx, cy, 20, 16, 0, 0, 7); ctx.fill(); ctx.stroke();
        if (sk.mask) { ctx.fillStyle = INK; ctx.fillRect(cx - 19, cy - 5, 38, 8); }
        ctx.fillStyle = sk.mask ? '#ffffff' : INK; ctx.beginPath(); ctx.arc(cx - 7, cy - 1, 2.5, 0, 7); ctx.arc(cx + 7, cy - 1, 2.5, 0, 7); ctx.fill();
        text(sk.name, x + 104, y + 30, 10, INK, 'center', '800');
        text(owned ? 'есть' : sk.usd ? 'донат' : '', x + 104, y + 46, 9, '#6b5f86', 'center', '700');
        text(sk.text, x + 76, y + 74, 9, '#2f8f4e', 'center', '700');
        const label = owned ? (S.skin === k ? 'Надето' : 'Надеть') : sk.crystals ? sk.crystals + ' 💎' : sk.usd;
        button(x + 16, y + 88, 120, 30, label, owned ? '#7fd1ff' : sk.usd ? '#ffc94d' : '#8ee08a', () => buySkin(k), 12, !(owned && S.skin === k));
      });
      text('Бонусы скинов работают, даже если скин не надет', 180, 556, 9, '#6b5f86', 'center', '700');
    }
  }

  function drawRaidPanel() {
    panelFrame('Рейд: Призрачный особняк');
    ghostSprite('mansion', 180, 180, 46, { phase: time * 2 });
    const lines = ['30 секунд бьёшь огромный особняк.', 'Каждый пробитый этаж: +15 💎 и банка,', 'каждые 3 этажа: насадка.', 'Особняк стреляет, уворачивайся!'];
    lines.forEach((l, i) => text(l, 180, 262 + i * 18, 11, INK, 'center', '600'));
    text('Билеты на сегодня: ' + S.raid.tickets + ' / 3', 180, 350, 14, INK, 'center', '800');
    if (S.raid.tickets > 0) button(80, 380, 200, 50, '⚔ В бой', '#d68cff', startRaid, 16);
    else if (!S.raid.adUsed) button(80, 380, 200, 50, '🎬 +1 билет', '#ffc94d', () => showAd('Дополнительный билет рейда', () => { S.raid.adUsed = true; S.raid.tickets++; }), 15);
    else text('Новые билеты завтра', 180, 405, 13, '#6b5f86', 'center', '800');
  }

  function drawWheelPanel() {
    panelFrame('Колесо удачи');
    const cx = 180, cy = 290, R = 120, seg = (Math.PI * 2) / WHEEL.length;
    WHEEL.forEach((w, i) => {
      const a0 = wheelRot + i * seg - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a0 + seg); ctx.closePath();
      ctx.fillStyle = w.color; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a0 + seg / 2);
      text(w.label, R * 0.62, 0, 11, INK, 'center', '800');
      ctx.restore();
    });
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#ffc94d'; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, 7); ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.moveTo(cx - 12, cy - R - 16); ctx.lineTo(cx + 12, cy - R - 16); ctx.lineTo(cx, cy - R + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (wheelSpin) text('Крутится...', 180, 460, 14, INK, 'center', '800');
    else if (S.wheel.free > 0) button(80, 444, 200, 46, 'Крутить бесплатно', '#8ee08a', () => spinWheel(false), 14);
    else if (S.wheel.ads > 0) button(80, 444, 200, 46, '🎬 Крутить (' + S.wheel.ads + '/3)', '#ffc94d', () => spinWheel(true), 14);
    else text('Новые вращения завтра', 180, 466, 13, '#6b5f86', 'center', '800');
    text('1 бесплатно в день + 3 за рекламу', 180, 510, 10, '#6b5f86', 'center', '700');
  }

  function drawDailyPanel() {
    panelFrame('Награды за вход');
    const cur = S.daily.count % DAILY.length;
    DAILY.forEach((d, i) => {
      const x = i < 4 ? 26 + i * 78 : 65 + (i - 4) * 78, y = i < 4 ? 112 : 222;
      const claimed = i < cur || (i === cur && !dailyReady() && false);
      const isToday = i === cur;
      rr(x, y, 70, 98, 12); ctx.fillStyle = claimed ? '#e5f4e4' : isToday ? '#fff3c4' : '#ffffff'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = isToday ? '#ffc94d' : '#c9c3e6'; ctx.stroke();
      text('День ' + (i + 1), x + 35, y + 16, 10, INK, 'center', '800');
      text(i === 6 ? '👑' : i === 5 ? '👻' : i === 3 ? '🧹' : i === 1 ? '🫙' : '💎', x + 35, y + 46, 22, '#ffffff');
      text(d.label, x + 35, y + 78, 9, INK, 'center', '800');
      if (claimed) text('✓', x + 58, y + 14, 14, '#2f8f4e', 'center', '800');
    });
    if (dailyReady()) {
      button(40, 350, 136, 48, 'Забрать', '#8ee08a', () => claimDaily(false), 15);
      button(184, 350, 136, 48, '🎬 Забрать x2', '#ffc94d', () => showAd('Удвоение награды дня', () => claimDaily(true)), 14);
    } else text('Возвращайся завтра за наградой дня ' + (cur + 1), 180, 374, 12, '#6b5f86', 'center', '800');
    text('Цикл из 7 дней повторяется. С VIP +100 💎 каждый день.', 180, 430, 10, '#6b5f86', 'center', '700');
  }

  function drawModal() {
    ctx.fillStyle = 'rgba(20,14,32,0.8)'; ctx.fillRect(0, 0, W, H);
    btn(0, 0, W, H, () => {});
    if (modal.ad) {
      rr(30, 180, 300, 260, 18); ctx.fillStyle = '#111'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#444'; ctx.stroke();
      text('РЕКЛАМА', 180, 214, 16, '#ffffff');
      text(modal.lines[0], 180, 250, 12, '#c9c3e6', 'center', '700');
      text('Здесь будет видео из рекламной сети', 180, 300, 11, '#9b93b3', 'center', '600');
      const k = 1 - modal.ad.t / modal.ad.total;
      rr(60, 360, 240, 12, 6); ctx.fillStyle = '#333'; ctx.fill();
      rr(60, 360, 240 * k, 12, 6); ctx.fillStyle = '#ffc94d'; ctx.fill();
      text('Награда через ' + Math.ceil(modal.ad.t) + ' с', 180, 396, 12, '#ffffff');
      return;
    }
    const h = 110 + modal.lines.length * 20;
    const y0 = 320 - h / 2;
    rr(30, y0, 300, h, 18); ctx.fillStyle = '#f7efe3'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    text(modal.title, 180, y0 + 30, 17, '#ffffff');
    modal.lines.forEach((l, i) => text(l, 180, y0 + 60 + i * 20, 12, INK, 'center', '700'));
    const n = modal.buttons.length, bw = (264 - (n - 1) * 8) / n;
    modal.buttons.forEach((b, i) => button(48 + i * (bw + 8), y0 + h - 50, bw, 38, b.label, b.color, b.on, n > 2 ? 10 : 13));
  }

  function drawOfflinePanel() {
    ctx.fillStyle = 'rgba(20,14,32,0.75)'; ctx.fillRect(0, 0, W, H);
    btn(0, 0, W, H, () => {});
    rr(40, 200, 280, 220, 18); ctx.fillStyle = '#f7efe3'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    text('Пока тебя не было', 180, 232, 18, '#ffffff');
    text('Жильцы очищенных домов заплатили', 180, 268, 13, INK, 'center', '600');
    text(fmt(offlineGain) + ' эктоплазмы', 180, 300, 20, '#7dff9e');
    const take = (mult) => () => { S.ecto += offlineGain * mult; offlineGain = 0; panel = null; };
    button(58, 340, 116, 50, 'Забрать', '#8ee08a', take(1), 15);
    button(186, 340, 116, 50, '🎬 x2', '#ffc94d', () => { const g = offlineGain; offlineGain = 0; panel = null; showAd('Удвоение офлайн-дохода', () => { S.ecto += g * 2; }); }, 15);
  }

  function draw() {
    buttons.length = 0;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1d1729'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath(); ctx.rect(VIEW.x, VIEW.y, VIEW.w, VIEW.h); ctx.clip();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 8 * shake, (Math.random() - 0.5) * 8 * shake);
    ctx.translate(VIEW_CX, VIEW_CY); ctx.scale(ZOOM, ZOOM); ctx.translate(-cam.x, -cam.y);
    drawMap();
    const sorted = ghosts.slice().sort((a, b) => a.y - b.y);
    for (const g of sorted) if (g.y < cat.y) drawGhost(g);
    orbiters.forEach((o) => o && o.y < cat.y - 10 && drawOrbiter(o));
    drawCat();
    orbiters.forEach((o) => o && o.y >= cat.y - 10 && drawOrbiter(o));
    for (const g of sorted) if (g.y >= cat.y) drawGhost(g);
    drawHazards();
    if (gold) {
      const gy = gold.y + Math.sin(gold.t * 3) * 14;
      ctx.fillStyle = 'rgba(255,230,120,0.35)'; ctx.beginPath(); ctx.arc(gold.x, gy, 30, 0, 7); ctx.fill();
      ghostSprite('golden', gold.x, gy, 18, { phase: gold.t * 3 });
      text('ТАП!', gold.x, gy + 34, 11, '#ffd84d');
    }
    for (const rg of rings) {
      ctx.globalAlpha = Math.max(0, rg.life / 0.3);
      ctx.strokeStyle = '#ffcf8a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r, 0, 7); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const b of beams) {
      const a = Math.min(1, b.life * 12);
      const mx = (b.x1 + b.x2) / 2 + (b.curve ? -40 : 0), my = (b.y1 + b.y2) / 2 + (b.curve ? -30 : 0);
      const path = () => { ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.quadraticCurveTo(mx, my, b.x2, b.y2); ctx.stroke(); };
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = a * 0.18; ctx.lineWidth = b.w + 14; path();
      ctx.globalAlpha = a * 0.45; ctx.lineWidth = b.w + 5; path();
      ctx.globalAlpha = a; ctx.lineWidth = Math.max(2, b.w - 1); ctx.strokeStyle = '#ffffff'; path();
      // искры в точке попадания
      const ig = ctx.createRadialGradient(b.x2, b.y2, 1, b.x2, b.y2, 16);
      ig.addColorStop(0, 'rgba(255,255,255,0.9)'); ig.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = a * 0.8; ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(b.x2, b.y2, 16, 0, 7); ctx.fill();
    }
    ctx.lineCap = 'butt';
    for (const p of particles) {
      const a = Math.min(1, p.life * 2);
      ctx.globalAlpha = a * 0.35; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.2, 0, 7); ctx.fill();
      ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    // пылинки в воздухе
    ctx.fillStyle = '#ffffff';
    for (const m of motes) {
      const mx = cam.x - HALF_W + (((m.x + time * m.vx - cam.x + HALF_W) % (HALF_W * 2)) + HALF_W * 2) % (HALF_W * 2);
      const my = cam.y - HALF_H + (((m.y + time * m.vy - cam.y + HALF_H) % (HALF_H * 2)) + HALF_H * 2) % (HALF_H * 2);
      ctx.globalAlpha = 0.18 + 0.15 * Math.sin(time * 1.5 + m.x); ctx.beginPath(); ctx.arc(mx, my, m.r, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // освещение: полумрак дома с тёплым светом вокруг кота и виньеткой
    {
      ctx.save(); ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      const cp = toScreen(cat.x, cat.y);
      const dark = moonActive() ? 0.12 : 0.3;
      const lg = ctx.createRadialGradient(cp.x, cp.y, 70, cp.x, cp.y, 330);
      lg.addColorStop(0, 'rgba(20,10,45,0)'); lg.addColorStop(1, `rgba(20,10,45,${dark})`);
      ctx.fillStyle = lg; ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
      const vg = ctx.createRadialGradient(VIEW_CX, VIEW_CY, VIEW.h * 0.35, VIEW_CX, VIEW_CY, VIEW.h * 0.75);
      vg.addColorStop(0, 'rgba(10,5,25,0)'); vg.addColorStop(1, 'rgba(10,5,25,0.35)');
      ctx.fillStyle = vg; ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
      ctx.restore();
    }
    for (const f of floaters) {
      f.max = f.max || f.life;
      const age = f.max - f.life, pop = age < 0.12 ? 1 + (0.12 - age) / 0.12 * 0.6 : 1;
      ctx.globalAlpha = Math.min(1, f.life * 2); text(f.text, f.x, f.y, Math.round(f.size * pop), f.color);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    drawOffscreenArrows();
    for (const d of drops) { ctx.fillStyle = '#7dff9e'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(d.x, d.y, 4, 0, 7); ctx.fill(); ctx.stroke(); }
    drawJoystick();
    drawTopBar();
    drawBottom();
    if (panel === 'squad') drawSquadPanel();
    else if (panel === 'attach') drawAttachPanel();
    else if (panel === 'bestiary') drawBestiaryPanel();
    else if (panel === 'quests') drawQuestsPanel();
    else if (panel === 'prestige') drawPrestigePanel();
    else if (panel === 'shop') drawShopPanel();
    else if (panel === 'raid') drawRaidPanel();
    else if (panel === 'wheel') drawWheelPanel();
    else if (panel === 'daily') drawDailyPanel();
    else if (panel === 'offline') drawOfflinePanel();
    if (modal) drawModal();
    if (toast) {
      ctx.globalAlpha = Math.min(1, toast.life * 3);
      ctx.font = '800 14px system-ui, sans-serif';
      const w = ctx.measureText(toast.text).width + 30;
      rr(180 - w / 2, panel ? 20 : 108, w, 34, 17); ctx.fillStyle = INK; ctx.fill();
      text(toast.text, 180, (panel ? 20 : 108) + 17, 14, '#ffffff');
      ctx.globalAlpha = 1;
    }
  }

  // =====================================================================
  // Цикл
  // =====================================================================
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  resetRoom();
  requestAnimationFrame(frame);

  // Для отладки в консоли браузера.
  window.__game = {
    state: () => S, ghosts: () => ghosts, cat: () => cat, cam: () => cam, resetRoom: () => resetRoom(), open: (p) => { panel = p; }, gold: () => { goldCd = 0; }, goldObj: () => gold, toScreen,
    reset: () => { localStorage.removeItem(SAVE_KEY); S = defaultState(); ensureQuests(); resetRoom(); },
  };
})();
