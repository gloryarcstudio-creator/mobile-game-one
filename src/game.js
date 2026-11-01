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

  const ROOMS_PER_HOUSE = 5;
  const GHOSTS_PER_ROOM = 8;
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
  const moonMult = () => (moonActive() ? 2 : 1);
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

  const catDamage = () => 10 * Math.pow(1.16, S.lvPower - 1) * moonMult() * stoneMult() * bestiaryMult() * attachMult() * setMult();
  const fireRate = () => Math.min(2 + 0.08 * (S.lvPull - 1), 9);
  const captureChance = () => Math.min(0.4 + 0.012 * (S.lvPull - 1), 0.95);
  const critChance = () => 0.1 + Math.min(0.5, 0.04 * kindPower('brush'));
  const critMult = () => 3 + 0.25 * kindPower('brush');
  const incomeMult = () => Math.pow(1.13, S.lvCollect - 1) * moonMult() * stoneMult();
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
  const cat = { x: 180, y: 392, aim: -Math.PI / 2, bob: 0, fireCd: 0, recoil: 0, shots: 0, rocketCd: 1, hp: 100, hurt: 0, safeFor: 0, moving: 0, face: 1 };
  const CAT_MAX_HP = 100;
  const FIELD = { x1: 42, x2: 318, y1: 160, y2: 448 }; // где может ходить кот
  let shots = [], shards = [];
  let joy = null; // {sx, sy, x, y, id, drag}
  let manualUntil = 0;
  let ghosts = [], beams = [], floaters = [], particles = [], drops = [], orbiters = [], rings = [];
  let spawnCd = 0.5, roomSpawned = 0, bossTimer = 0, bossSpawned = false;
  let panel = null; // squad | attach | bestiary | quests | prestige | offline
  let selectedJar = null, selectedAttach = null, bestPage = 0, prestigeConfirm = 0;
  let toast = null, shake = 0, time = 0, roomToken = 0;

  function resetRoom() {
    ghosts = []; shots = []; roomSpawned = 0; S.cleared = 0; cat.hp = CAT_MAX_HP; spawnCd = 0.6; bossSpawned = false; bossTimer = 0; roomToken++;
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
      x: 40 + Math.random() * 280, y: boss ? 170 : 90 + Math.random() * 30,
      vx: (Math.random() - 0.5) * 30, vy: (boss ? 0.6 : 1) * (28 + Math.random() * 14),
      r: boss ? 40 : def.rarity === 2 ? 22 : 19,
      phase: Math.random() * 6, hit: 0, alpha: 0, dying: 0, capturing: 0,
      shootCd: 2 + Math.random() * 2,
    });
  }

  const lowHp = (g) => g.hp > 0 && g.hp / g.maxHp <= 0.3;
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
    g.hp -= amount;
    g.hit = 0.12;
    floaters.push({ x: g.x + (Math.random() - 0.5) * 24, y: g.y - g.r, text: fmt(amount), life: 0.9, color: crit ? '#ffdd55' : '#ffffff', size: crit ? 17 : 13 });
    if (g.hp <= 0) killGhost(g);
  }

  function killGhost(g) {
    g.hp = 0;
    const rar = GHOSTS[g.type].rarity;
    const reward = ghostReward(rar);
    const n = g.boss ? 14 : 4;
    for (let i = 0; i < n; i++) {
      drops.push({ x: g.x, y: g.y, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 120, t: 0, value: reward / n });
    }
    burst(g.x, g.y, g.boss ? 40 : 14, GHOSTS[g.type].body);
    S.stats.kills++;
    if (Math.random() < (g.boss ? 1 : 0.08)) {
      const n = g.boss ? 3 : 1;
      for (let i = 0; i < n; i++) shards.push({ x: Math.max(FIELD.x1, Math.min(FIELD.x2, g.x + (Math.random() - 0.5) * 60)), y: FIELD.y1 + 60 + Math.random() * (FIELD.y2 - FIELD.y1 - 60), life: 9 });
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
    if (S.jars <= 0) { showToast('Нет пустых банок!'); return false; }
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
    if (S.jars <= 0) { showToast('Нет пустых банок!'); return; }
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
    S.squad = [0, 1, 2, 3].map((i) => (sorted[i] ? sorted[i].id : null));
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

  function mergeSquad() {
    const n = mergeList('inventory', (i) => i.type + ':' + i.stars, (i) => i.stars >= MAX_STARS, (a) => a.stars++, () => { S.jars += 2; });
    const ids = new Set(S.inventory.map((i) => i.id));
    S.squad = S.squad.map((id) => (ids.has(id) ? id : null));
    bestSquad();
    showToast(n ? 'Слито: ' + n + ' ✨' : 'Нужно 3 одинаковых призрака');
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
    S.equipped = [0, 1, 2].map((i) => (sorted[i] ? sorted[i].id : null));
  }

  function mergeAttach() {
    const n = mergeList('attach', (a) => a.kind + ':' + a.rank, (a) => a.rank >= RANKS.length - 1, (a) => a.rank++);
    autoEquipAttach();
    selectedAttach = null;
    showToast(n ? 'Слито насадок: ' + n + ' ✨' : 'Нужно 3 одинаковые насадки одного ранга');
  }

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
    // В релизе здесь будет rewarded-реклама.
    S.moonUntil = now + 60000; S.moonReadyAt = now + 180000;
    showToast('Полнолуние! x2 урон и доход на 60 с');
  }

  function showToast(text) { toast = { text, life: 2.2 }; }

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
    if (panel || y < 70 || y > 470) return;
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

  function tapField(x, y) {
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
        else { ax = (180 - cat.x) * 0.02; ay = (392 - cat.y) * 0.02; }
      }
      const len = Math.hypot(ax, ay);
      if (len > 0.05) { dx = ax / len; dy = ay / len; speed = 110 * Math.min(1, len); }
    }
    cat.x = Math.max(FIELD.x1, Math.min(FIELD.x2, cat.x + dx * speed * dt));
    cat.y = Math.max(FIELD.y1, Math.min(FIELD.y2, cat.y + dy * speed * dt));
    cat.moving = speed > 10 ? 1 : 0;
    if (Math.abs(dx) > 0.2) cat.face = dx > 0 ? 1 : -1;
  }

  function hurtCat(amount) {
    cat.hp -= amount; cat.hurt = 0.25; cat.safeFor = 2;
    if (cat.hp <= 0) {
      showToast('Мурзик испугался! Попробуй увернуться');
      burst(cat.x, cat.y, 20, '#ff9aa9');
      if (isBossRoom()) S.room = ROOMS_PER_HOUSE - 1;
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

    if (panel !== 'offline') {
      if (isBossRoom()) {
        if (!bossSpawned) { spawnCd -= dt; if (spawnCd <= 0) { spawnGhost(district().boss); bossSpawned = true; bossTimer = BOSS_TIME; } }
        else if (ghosts.some((g) => g.boss && g.hp > 0)) {
          bossTimer -= dt;
          if (bossTimer <= 0) {
            showToast('Время вышло! Прокачайся и попробуй снова');
            S.room = ROOMS_PER_HOUSE - 1; resetRoom();
          }
        }
      } else {
        spawnCd -= dt;
        const alive = ghosts.filter((g) => g.hp > 0).length;
        if (spawnCd <= 0 && roomSpawned < GHOSTS_PER_ROOM && alive < 5) {
          spawnGhost(pickType()); roomSpawned++; spawnCd = 0.7 + Math.random() * 0.6;
        }
        if (S.cleared >= GHOSTS_PER_ROOM && alive === 0) nextRoom();
      }

      moveCat(dt);
      // смелость кота: урон от касаний и снарядов, восстановление
      cat.hurt = Math.max(0, cat.hurt - dt);
      cat.safeFor = Math.max(0, cat.safeFor - dt);
      if (cat.safeFor <= 0) cat.hp = Math.min(CAT_MAX_HP, cat.hp + 12 * dt);
      for (const g of ghosts) {
        if (!targetable(g)) continue;
        if (Math.hypot(g.x - cat.x, g.y - (cat.y - 10)) < g.r + 18) hurtCat((g.boss ? 30 : 14) * dt);
        // редкие и сильнее стреляют сгустками эктоплазмы
        if (GHOSTS[g.type].rarity >= 1) {
          g.shootCd -= dt;
          if (g.shootCd <= 0) {
            g.shootCd = g.boss ? 1.6 : 3.2;
            const a = Math.atan2(cat.y - 10 - g.y, cat.x - g.x);
            const spread = g.boss ? [-0.3, 0, 0.3] : [0];
            for (const sp of spread) shots.push({ x: g.x, y: g.y, vx: Math.cos(a + sp) * 115, vy: Math.sin(a + sp) * 115, dmg: g.boss ? 22 : 14, life: 5 });
          }
        }
      }
      for (const p of shots) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (Math.hypot(p.x - cat.x, p.y - (cat.y - 8)) < 20) { hurtCat(p.dmg); p.life = 0; burst(p.x, p.y, 6, '#b48cff'); }
      }
      shots = shots.filter((p) => p.life > 0 && p.y < 480 && p.y > 60 && p.x > -10 && p.x < 370);
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
        if (cat.fireCd <= 0) { cat.fireCd = 1 / fireRate(); catShoot(target); }
      }
      // ракеты
      const pRocket = kindPower('rocket');
      if (pRocket > 0) {
        cat.rocketCd -= dt;
        if (cat.rocketCd <= 0) {
          const alive = ghosts.filter(targetable);
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
        const a = time * 1.3 + (i * Math.PI) / 2;
        const o = orbiters[i] && orbiters[i].id === id ? orbiters[i] : { id, cd: 0.3 * i };
        o.it = it; o.x = cat.x + Math.cos(a) * 58; o.y = cat.y - 10 + Math.sin(a) * 26;
        o.cd -= dt;
        if (o.cd <= 0) {
          const t = nearestGhost(o.x, o.y);
          if (t) {
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
      if (g.x < 25 || g.x > 335) g.vx = -g.vx;
      g.x = Math.max(25, Math.min(335, g.x));
      g.y = Math.max(100, Math.min(450, g.y));
    }
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
    ctx.fillStyle = o.silhouette ? '#6b5f86' : o.hit ? '#ffffff' : def.body;
    ctx.strokeStyle = INK; ctx.lineWidth = r > 15 ? 3 : 2;
    if (def.shape === 'washer') {
      rr(x - r, y - r, r * 2, r * 2.1, r * 0.3); ctx.fill(); ctx.stroke();
      if (o.silhouette) return;
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
    ctx.fillStyle = INK;
    const er = Math.max(1.6, r * 0.15);
    ctx.beginPath(); ctx.arc(x - r * 0.35, y - 2, er, 0, Math.PI * 2); ctx.arc(x + r * 0.35, y - 2, er, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,120,150,0.55)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.55, y + r * 0.3, r * 0.2, r * 0.13, 0, 0, Math.PI * 2); ctx.ellipse(x + r * 0.55, y + r * 0.3, r * 0.2, r * 0.13, 0, 0, Math.PI * 2); ctx.fill();
  }

  // =====================================================================
  // Отрисовка: сцена
  // =====================================================================
  function drawRoom() {
    const top = 70, bottom = 470;
    const hue = district().hue + ((S.house % HOUSES_PER_DISTRICT) * 6);
    ctx.fillStyle = `hsl(${hue}, 35%, 82%)`; ctx.fillRect(0, top, W, 250);
    ctx.fillStyle = `hsl(${hue}, 35%, 77%)`;
    for (let x = 0; x < W; x += 36) ctx.fillRect(x, top, 14, 250);
    rr(240, top + 30, 80, 90, 10); ctx.fillStyle = '#3a2f5c'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#8a6a55'; ctx.stroke();
    ctx.fillStyle = moonActive() ? '#fff1a8' : '#f4ecd0';
    ctx.beginPath(); ctx.arc(282, top + 66, moonActive() ? 20 : 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a6a55'; ctx.fillRect(278, top + 30, 5, 90); ctx.fillRect(240, top + 72, 80, 5);
    rr(36, top + 40, 64, 50, 6); ctx.fillStyle = '#fbe3c8'; ctx.fill(); ctx.strokeStyle = '#c99a5b'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#b8d8a8'; ctx.beginPath(); ctx.moveTo(42, top + 84); ctx.lineTo(62, top + 58); ctx.lineTo(80, top + 84); ctx.fill();
    ctx.fillStyle = `hsl(${hue + 20}, 40%, 60%)`; ctx.fillRect(0, top + 250, W, bottom - top - 250);
    ctx.fillStyle = `hsl(${hue + 20}, 40%, 54%)`;
    for (let y = top + 262; y < bottom; y += 22) ctx.fillRect(0, y, W, 3);
    ctx.fillStyle = '#e88aa5'; ctx.beginPath(); ctx.ellipse(180, 410, 130, 34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f3b0c3'; ctx.beginPath(); ctx.ellipse(180, 410, 100, 24, 0, 0, Math.PI * 2); ctx.fill();
    if (moonActive()) { ctx.fillStyle = 'rgba(255,240,150,0.10)'; ctx.fillRect(0, top, W, bottom - top); }
  }

  function drawGhost(g) {
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
    ghostSprite(g.type, x, y, r, { hit: g.hit > 0, phase: g.phase });
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
    const x = cat.x, y = cat.y + Math.sin(cat.bob * (cat.moving ? 3 : 1)) * (cat.moving ? 3 : 1.5);
    if (cat.hurt > 0 && Math.sin(time * 60) > 0) return;
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x, cat.y + 26, 30, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f2a65a'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 18, y + 14); ctx.quadraticCurveTo(x + 44, y + 4 + Math.sin(time * 3) * 6, x + 36, y - 16); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.fillStyle = '#f2a65a'; ctx.beginPath(); ctx.ellipse(x, y + 8, 24, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    rr(x - 34, y - 6, 16, 28, 6); ctx.fillStyle = kindPower('rocket') > 0 ? ATTACH.rocket.color : '#8a7bd1'; ctx.fill(); ctx.stroke();
    const hy = y - 22;
    ctx.fillStyle = '#f2a65a';
    ctx.beginPath(); ctx.moveTo(x - 22, hy - 6); ctx.lineTo(x - 18, hy - 30); ctx.lineTo(x - 4, hy - 16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 22, hy - 6); ctx.lineTo(x + 18, hy - 30); ctx.lineTo(x + 4, hy - 16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, hy, 26, 21, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d9853a'; ctx.fillRect(x - 3, hy - 20, 6, 8);
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(x - 9, hy - 1, 3.5, 0, Math.PI * 2); ctx.arc(x + 9, hy - 1, 3.5, 0, Math.PI * 2); ctx.fill();
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
    text(isBossRoom() ? 'БОСС' : 'Комната ' + S.room + '/' + ROOMS_PER_HOUSE, 14, 55, 11, isBossRoom() ? '#ffc94d' : '#c9c3e6', 'left');
    const p = isBossRoom() ? (bossSpawned ? Math.max(0, bossTimer / BOSS_TIME) : 1) : Math.min(1, S.cleared / GHOSTS_PER_ROOM);
    rr(120, 48, 120, 12, 6); ctx.fillStyle = '#4a3f66'; ctx.fill();
    rr(120, 48, 120 * p, 12, 6); ctx.fillStyle = isBossRoom() ? '#ffc94d' : '#7dff9e'; ctx.fill();
    if (isBossRoom() && bossSpawned) text(Math.ceil(bossTimer) + ' с', 180, 54, 10, INK, 'center', '700');
    ctx.fillStyle = '#7dff9e'; ctx.beginPath(); ctx.arc(302, 18, 7, 0, 7); ctx.fill();
    text(fmt(S.ecto), 290, 18, 15, '#ffffff', 'right');
    text('💎 ' + S.crystals, 346, 42, 12, '#9ff3ff', 'right');
    text('🫙 ' + S.jars, 286, 42, 12, '#ffe7b0', 'right');
    if (S.stones > 0) text('🌙 ' + S.stones, 346, 60, 11, '#fff1a8', 'right');
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
    // переключатель автопилота
    ctx.fillStyle = S.auto ? '#8ee08a' : '#6b5f86';
    rr(132, 8, 92, 28, 14); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    text('АВТО ' + (S.auto ? 'вкл' : 'выкл'), 178, 22, 11, '#ffffff');
    btn(128, 4, 100, 36, () => { S.auto = !S.auto; showToast(S.auto ? 'Автопилот включён' : 'Веди кота свайпом по экрану'); });
  }

  const TABS = [
    { id: 'squad', icon: '👻', name: 'Отряд', badge: () => squadMergeable() },
    { id: 'attach', icon: '🧹', name: 'Насадки', badge: () => S.crystals >= SUMMON_COST || attachMergeable() },
    { id: 'bestiary', icon: '📖', name: 'Бестиарий', badge: () => anyBestClaimable() },
    { id: 'quests', icon: '📜', name: 'Задания', badge: () => anyQuestDone() },
    { id: 'prestige', icon: '✨', name: 'Освящение', badge: () => stonesFor(S.house) > 0 },
  ];

  function drawBottom() {
    ctx.fillStyle = '#3a2f55'; ctx.fillRect(0, 470, W, 170);
    UPGRADES.forEach((u, i) => {
      const x = 8 + i * 116, y = 478, w = 112, h = 92;
      const cost = upgradeCost(S[u.key], u.base);
      const can = S.ecto >= cost;
      rr(x, y, w, h, 12); ctx.fillStyle = can ? u.color : '#6b5f86'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      text(u.name, x + w / 2, y + 16, 14, '#ffffff');
      text('ур. ' + S[u.key], x + w / 2, y + 34, 11, INK, 'center', '700');
      text(u.desc(), x + w / 2, y + 50, 11, INK, 'center', '700');
      rr(x + 8, y + 62, w - 16, 22, 8); ctx.fillStyle = 'rgba(43,35,64,0.85)'; ctx.fill();
      text(fmt(cost), x + w / 2, y + 73, 13, can ? '#7dff9e' : '#ff9aa9');
      btn(x, y, w, h, () => buyUpgrade(u));
    });
    TABS.forEach((t, i) => {
      const x = 6 + i * 70, y = 580, w = 66, h = 54;
      const active = panel === t.id;
      rr(x, y, w, h, 12); ctx.fillStyle = active ? '#ffc94d' : '#8a7bd1'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      text(t.icon, x + w / 2, y + 20, 18, '#ffffff');
      text(t.name, x + w / 2, y + 42, 9, '#ffffff', 'center', '800');
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
      const x = 32 + i * 76, y = 106;
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
      const x = 34 + i * 100, y = 104;
      drawAttachCard(x, y, 92, 80, a, false);
      btn(x, y, 92, 80, () => {
        if (selectedAttach) { S.equipped = S.equipped.map((s) => (s === selectedAttach ? null : s)); S.equipped[i] = selectedAttach; selectedAttach = null; }
      });
    });
    text('Урон x' + fmt(attachMult(), 2) + ' · крит ' + Math.round(critChance() * 100) + '% x' + fmt(critMult(), 1), 180, 196, 11, INK, 'center', '700');

    const list = [...S.attach].sort((a, b) => b.rank - a.rank || a.kind.localeCompare(b.kind)).slice(0, 20);
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
      text(ATTACH[sel.kind].name + ' [' + RANKS[sel.rank] + ']: ' + ATTACH[sel.kind].desc, 180, 480, 11, INK, 'center', '700');
      text('Тапни верхний слот, чтобы надеть', 180, 495, 10, '#6b5f86', 'center', '700');
    } else {
      text('Шансы: D 60% · C 27% · B 10% · A 2.5% · S 0.5%', 180, 488, 10, '#6b5f86', 'center', '700');
    }
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

  function drawOfflinePanel() {
    ctx.fillStyle = 'rgba(20,14,32,0.75)'; ctx.fillRect(0, 0, W, H);
    btn(0, 0, W, H, () => {});
    rr(40, 200, 280, 220, 18); ctx.fillStyle = '#f7efe3'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    text('Пока тебя не было', 180, 232, 18, '#ffffff');
    text('Жильцы очищенных домов заплатили', 180, 268, 13, INK, 'center', '600');
    text(fmt(offlineGain) + ' эктоплазмы', 180, 300, 20, '#7dff9e');
    const take = (mult) => () => { S.ecto += offlineGain * mult; offlineGain = 0; panel = null; };
    button(58, 340, 116, 50, 'Забрать', '#8ee08a', take(1), 15);
    button(186, 340, 116, 50, 'x2 (реклама)', '#ffc94d', take(2), 13);
  }

  function draw() {
    buttons.length = 0;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 8 * shake, (Math.random() - 0.5) * 8 * shake);
    drawRoom();
    for (const g of ghosts) drawGhost(g);
    orbiters.forEach((o) => o && o.y < cat.y - 10 && drawOrbiter(o));
    drawCat();
    orbiters.forEach((o) => o && o.y >= cat.y - 10 && drawOrbiter(o));
    drawHazards();
    for (const rg of rings) {
      ctx.globalAlpha = Math.max(0, rg.life / 0.3);
      ctx.strokeStyle = '#ffcf8a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r, 0, 7); ctx.stroke();
    }
    for (const b of beams) {
      const a = Math.min(1, b.life * 12);
      const mx = (b.x1 + b.x2) / 2 + (b.curve ? -40 : 0), my = (b.y1 + b.y2) / 2 + (b.curve ? -30 : 0);
      ctx.strokeStyle = b.color; ctx.lineWidth = b.w + 4; ctx.globalAlpha = a * 0.35;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.quadraticCurveTo(mx, my, b.x2, b.y2); ctx.stroke();
      ctx.globalAlpha = a; ctx.lineWidth = b.w; ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.quadraticCurveTo(mx, my, b.x2, b.y2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const p of particles) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (const f of floaters) { ctx.globalAlpha = Math.min(1, f.life * 2); text(f.text, f.x, f.y, f.size, f.color); }
    ctx.globalAlpha = 1;
    ctx.restore();
    for (const d of drops) { ctx.fillStyle = '#7dff9e'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(d.x, d.y, 4, 0, 7); ctx.fill(); ctx.stroke(); }
    drawJoystick();
    drawTopBar();
    drawBottom();
    if (panel === 'squad') drawSquadPanel();
    else if (panel === 'attach') drawAttachPanel();
    else if (panel === 'bestiary') drawBestiaryPanel();
    else if (panel === 'quests') drawQuestsPanel();
    else if (panel === 'prestige') drawPrestigePanel();
    else if (panel === 'offline') drawOfflinePanel();
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
    state: () => S, ghosts: () => ghosts, open: (p) => { panel = p; },
    reset: () => { localStorage.removeItem(SAVE_KEY); S = defaultState(); ensureQuests(); resetRoom(); },
  };
})();
