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
    { name: 'Кладбище котов', hue: 150, ghosts: ['skelecat', 'pumpkin', 'wisp'], boss: 'ninelives', set: 'x1.25 урона кота', feature: 'густая тьма' },
    { name: 'Ледяной замок', hue: 200, ghosts: ['snowman', 'icicle', 'aurora'], boss: 'frostqueen', set: 'x1.25 урона кота', feature: 'скользкий лёд' },
    { name: 'Безумная лаборатория', hue: 100, ghosts: ['slime', 'flask', 'spark'], boss: 'franken', set: 'x1.25 урона кота', feature: 'лужи кислоты' },
    { name: 'Лунный дворец', hue: 280, ghosts: ['moth', 'mirror', 'starling'], boss: 'moonking', set: 'x1.25 урона кота', feature: 'звездопад' },
  ];
  const HOUSES_PER_DISTRICT = 10;

  // shape: sheet | sock | fire | washer | king
  const GHOSTS = {
    sheet: { name: 'Простынка', rarity: 0, body: '#f6f3ff', shape: 'sheet', d: 0 },
    sock: { name: 'Носок-полтергейст', rarity: 1, body: '#ffd6e3', shape: 'sock', d: 0, beh: 'split' },
    fire: { name: 'Дух камина', rarity: 2, body: '#ffc08a', shape: 'fire', d: 0, beh: 'kite' },
    washer: { name: 'Стиральная машина', rarity: 3, body: '#e3f1ff', shape: 'washer', d: 0 },
    armor: { name: 'Пустые доспехи', rarity: 0, body: '#d9dde6', shape: 'sock', d: 1, beh: 'charge' },
    portrait: { name: 'Портрет-шептун', rarity: 1, body: '#f3e2b8', shape: 'sheet', d: 1, beh: 'blink' },
    candle: { name: 'Свечной дух', rarity: 2, body: '#fff0a8', shape: 'fire', d: 1, beh: 'heal' },
    headless: { name: 'Безголовый дворецкий', rarity: 3, body: '#cfc6ff', shape: 'king', d: 1 },
    drowned: { name: 'Утопленник', rarity: 0, body: '#bfe9e4', shape: 'sheet', d: 2 },
    jelly: { name: 'Медуза-призрак', rarity: 1, body: '#ffc6f0', shape: 'sock', d: 2, beh: 'split' },
    lantern: { name: 'Маячный огонёк', rarity: 2, body: '#ffe08a', shape: 'fire', d: 2, beh: 'kite' },
    ship: { name: 'Корабль-призрак', rarity: 3, body: '#b9d7f0', shape: 'king', d: 2 },
    mannequin: { name: 'Манекен', rarity: 0, body: '#f1d9cc', shape: 'sock', d: 3, beh: 'charge' },
    toy: { name: 'Плюшевый мишка', rarity: 1, body: '#e8c49a', shape: 'sheet', d: 3, beh: 'heal' },
    tv: { name: 'Телевизор-шипун', rarity: 2, body: '#c8f0ff', shape: 'fire', d: 3, beh: 'blink' },
    carousel: { name: 'Карусель-дух', rarity: 3, body: '#ffd1e8', shape: 'king', d: 3 },
    skelecat: { name: 'Кот-скелет', rarity: 0, body: '#eeeeee', shape: 'sheet', d: 4, beh: 'charge' },
    pumpkin: { name: 'Тыквенный дух', rarity: 1, body: '#ffb36b', shape: 'sock', d: 4, beh: 'bomber' },
    wisp: { name: 'Блуждающий огонёк', rarity: 2, body: '#a8ffcf', shape: 'fire', d: 4, beh: 'blink' },
    ninelives: { name: 'Король девяти жизней', rarity: 3, body: '#bda8ff', shape: 'king', d: 4 },
    snowman: { name: 'Снеговик-бука', rarity: 0, body: '#eef8ff', shape: 'sheet', d: 5 },
    icicle: { name: 'Сосулька-шептунья', rarity: 1, body: '#bfe6ff', shape: 'sock', d: 5, beh: 'charge' },
    aurora: { name: 'Дух северного сияния', rarity: 2, body: '#9fffe0', shape: 'fire', d: 5, beh: 'heal' },
    frostqueen: { name: 'Снежная королева', rarity: 3, body: '#cde8ff', shape: 'king', d: 5 },
    slime: { name: 'Слизень из колбы', rarity: 0, body: '#b6f5a0', shape: 'sheet', d: 6, beh: 'split' },
    flask: { name: 'Летучая колба', rarity: 1, body: '#d8ffb8', shape: 'sock', d: 6, beh: 'bomber' },
    spark: { name: 'Шаровая молния', rarity: 2, body: '#fff27a', shape: 'fire', d: 6, beh: 'kite' },
    franken: { name: 'Доктор Мяукенштейн', rarity: 3, body: '#a8e0a0', shape: 'king', d: 6 },
    moth: { name: 'Лунная моль', rarity: 0, body: '#e6d6ff', shape: 'sheet', d: 7 },
    mirror: { name: 'Зеркальный двойник', rarity: 1, body: '#d8e8ff', shape: 'sock', d: 7, beh: 'blink' },
    starling: { name: 'Падающая звезда', rarity: 2, body: '#fff0c0', shape: 'fire', d: 7, beh: 'bomber' },
    moonking: { name: 'Лунный король', rarity: 3, body: '#e0c8ff', shape: 'king', d: 7 },
  };

  // Достижения: у каждого несколько ступеней, за каждую кристаллы
  const ACHIEVEMENTS = [
    { id: 'kills', icon: '👻', name: 'Гроза призраков', unit: 'побед', val: () => S.stats.kills, tiers: [100, 1000, 10000, 100000, 1000000] },
    { id: 'captures', icon: '🫙', name: 'Коллекционер', unit: 'поимок', val: () => S.stats.captures, tiers: [10, 100, 500, 2500, 10000] },
    { id: 'bosses', icon: '👑', name: 'Охотник на боссов', unit: 'боссов', val: () => S.stats.bosses, tiers: [5, 25, 100, 300, 1000] },
    { id: 'house', icon: '🏚', name: 'Экзорцист города', unit: 'дом', val: () => S.maxHouse, tiers: [5, 15, 30, 50, 80] },
    { id: 'prestige', icon: '✨', name: 'Свет луны', unit: 'освящений', val: () => S.prestiges, tiers: [1, 5, 15, 40, 100] },
    { id: 'elites', icon: '⭐', name: 'Золотая лихорадка', unit: 'элит', val: () => S.stats.elites, tiers: [5, 50, 250, 1000] },
    { id: 'merges', icon: '🔁', name: 'Алхимик', unit: 'слияний', val: () => S.stats.merges, tiers: [5, 50, 250, 1000] },
    { id: 'summons', icon: '🧹', name: 'Мастер насадок', unit: 'призывов', val: () => S.stats.summons, tiers: [10, 100, 500, 2000] },
    { id: 'raid', icon: '⚔', name: 'Покоритель особняка', unit: 'этаж', val: () => S.stats.raidBest || 0, tiers: [5, 10, 20, 35, 50] },
    { id: 'upgrades', icon: '⚙', name: 'Инженер', unit: 'улучшений', val: () => S.stats.upgrades, tiers: [50, 500, 2500, 10000] },
    { id: 'bestiary', icon: '📖', name: 'Знаток нечисти', unit: 'видов', val: () => Object.keys(S.bestiary).length, tiers: [4, 12, 20, 32] },
    { id: 'skins', icon: '🎁', name: 'Модник', unit: 'скинов', val: () => S.skins.length, tiers: [2, 5, 10, 18] },
    { id: 'streak', icon: '🔥', name: 'Верный кот', unit: 'дней подряд', val: () => S.stats.bestStreak || S.streak.count, tiers: [3, 7, 14, 30, 60] },
    { id: 'spins', icon: '🎡', name: 'Везунчик', unit: 'вращений', val: () => S.stats.spins, tiers: [10, 50, 200] },
  ];
  const ACH_REWARD = [20, 50, 120, 300, 800];
  const achTier = (a) => S.ach[a.id] || 0;
  const achReady = (a) => achTier(a) < a.tiers.length && a.val() >= a.tiers[achTier(a)];
  const anyAchReady = () => ACHIEVEMENTS.some(achReady);
  function claimAch(a) {
    if (!achReady(a)) return;
    const cr = ACH_REWARD[achTier(a)];
    S.ach[a.id] = achTier(a) + 1; S.crystals += cr; addPassXp(30);
    SFX.play('reward'); showToast(a.name + ': +' + cr + ' 💎'); save();
  }

  // Особое поведение обычных призраков
  const BEHAVIORS = {
    split: { name: 'Делится', color: '#ff8fb8', hint: 'делится надвое, когда его победишь' },
    kite: { name: 'Стрелок', color: '#ffb35a', hint: 'держится подальше и чаще стреляет' },
    charge: { name: 'Таран', color: '#8a9bd1', hint: 'замирает и бросается по прямой: отойди с линии' },
    blink: { name: 'Прыгун', color: '#b48cff', hint: 'исчезает и появляется рядом с котом' },
    heal: { name: 'Лекарь', color: '#5fd38a', hint: 'лечит соседей: лови или бей его первым' },
    bomber: { name: 'Подрывник', color: '#ff6b5a', hint: 'подлетает и взрывается: беги из круга' },
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
  const RANK_WEIGHTS_HIGH = [0.575, 0.27, 0.1, 0.038, 0.012, 0.004, 0.001]; // с дома 30
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
  // Скины по уровням редкости. Бонусы всех купленных скинов складываются, даже если скин не надет.
  const TIERS = [
    { name: 'Обычные', one: 'ОБЫЧНЫЙ', short: 'Обыч.', color: '#8fa3b8' },
    { name: 'Редкие', one: 'РЕДКИЙ', short: 'Редк.', color: '#4d9bff' },
    { name: 'Эпические', one: 'ЭПИК', short: 'Эпик', color: '#a86bff' },
    { name: 'Легендарные', one: 'ЛЕГЕНДА', short: 'Леген.', color: '#ff9f1a' },
    { name: 'Мифические', one: 'МИФ', short: 'Миф.', color: '#ff4d8a' },
  ];
  const SKINS = {
    ginger: { tier: 0, name: 'Рыжик', body: '#f2a65a', dark: '#d9853a', pat: 'tabby', collar: '#e8304f', charm: 'bell', bonus: {}, text: 'Стартовый' },
    spotty: { tier: 0, name: 'Пятнышко', body: '#f4efe6', dark: '#8a5a3c', pat: 'spots', collar: '#4d9bff', charm: 'bell', eyes: ['#8ad05a', '#8ad05a'], bonus: { income: 1.08 }, text: '+8% эктоплазмы', crystals: 150 },
    tabby: { tier: 0, name: 'Полосатик', body: '#a8a4b4', dark: '#6e6a7c', pat: 'tabby', hat: 'beanie', hatC: '#ff5c5c', bonus: { dmg: 1.08 }, text: '+8% урона', crystals: 250 },
    peach: { tier: 0, name: 'Персик', body: '#ffe6cc', dark: '#f29a5a', pat: 'calico', hat: 'flower', eyes: ['#5fa8ff', '#5fa8ff'], collar: '#8ee08a', charm: 'heart', bonus: { rate: 1.06 }, text: '+6% скорости', crystals: 300 },
    black: { tier: 1, name: 'Уголёк', body: '#5d566e', dark: '#3f3a4f', pat: 'tuxedo', eyes: ['#d6f25a', '#d6f25a'], slit: true, ear: '#a77fb3', collar: '#8a5ad6', charm: 'star', tail: 'white', bonus: { rate: 1.15 }, text: '+15% скорости', crystals: 600 },
    white: { tier: 1, name: 'Снежок', body: '#f4f1ea', dark: '#d8d2c4', pat: 'fluffy', eyes: ['#6ec3ff', '#ffc94d'], scarf: '#6ec3ff', tail: 'fluff', bonus: { income: 1.2 }, text: '+20% эктоплазмы', crystals: 700 },
    siam: { tier: 1, name: 'Сапфир', body: '#f3e6d2', dark: '#5a4038', pat: 'points', eyes: ['#4d9bff', '#4d9bff'], hat: 'headphones', hatC: '#ff8fb1', bonus: { dmg: 1.15 }, text: '+15% урона', crystals: 800 },
    pirate: { tier: 1, name: 'Капитан Мяу', body: '#c98a5a', dark: '#8a5a36', pat: 'tabby', hat: 'pirate', patch: true, collar: '#e8304f', charm: 'gem', tank: '#8a5a36', bonus: { dmg: 1.1, income: 1.1 }, text: '+10% урон и доход', crystals: 900 },
    ninja: { tier: 2, name: 'Ниндзя', body: '#8a8fa8', dark: '#5c6078', pat: 'tabby', mask: true, tail: 'ribbon', tank: '#3f3a4f', bonus: { dmg: 1.2, rate: 1.1 }, text: '+20% урон, +10% скорость', crystals: 1200, req: 10 },
    wizard: { tier: 2, name: 'Мурлин', body: '#9fb0ee', dark: '#6577cc', pat: 'none', hat: 'wizard', hatC: '#5a3fb0', eyes: ['#ffd24d', '#ffd24d'], sparkle: '#fff3a6', tank: '#5a3fb0', liquid: '#c9a0ff', bonus: { dmg: 1.3 }, text: '+30% урона', crystals: 1500, req: 15 },
    chef: { tier: 2, name: 'Пирожок', body: '#f7d9a8', dark: '#e0b070', pat: 'tabby', hat: 'chef', scarf: '#ff5c5c', bonus: { income: 1.35 }, text: '+35% эктоплазмы', crystals: 1600, req: 20 },
    astro: { tier: 2, name: 'Космокот', body: '#c8c4d8', dark: '#8a86a0', pat: 'none', helmet: true, tank: '#e8e8f0', eyes: ['#3ddc97', '#3ddc97'], bonus: { dmg: 1.15, rate: 1.15 }, text: '+15% урон и скорость', crystals: 2000, req: 25 },
    vampire: { tier: 3, name: 'Граф Мурракула', body: '#c7b3e6', dark: '#8f6fc4', pat: 'none', cape: true, fangs: true, eyes: ['#ff4d6d', '#ff4d6d'], slit: true, tail: 'heart', tank: '#6a2a50', liquid: '#ff5c7a', bonus: { dmg: 1.35 }, text: '+35% урона', usd: '$2.99' },
    devil: { tier: 3, name: 'Чертёнок', body: '#ff7b7b', dark: '#c43c4c', pat: 'none', hat: 'horns', eyes: ['#ffd24d', '#ffd24d'], slit: true, fangs: true, tail: 'arrow', aura: '255,90,60', tank: '#3f2a3a', liquid: '#ff9a3d', bonus: { dmg: 1.4 }, text: '+40% урона', usd: '$3.99' },
    angel: { tier: 3, name: 'Пушинка', body: '#fffaf0', dark: '#e8dcc4', pat: 'fluffy', hat: 'halo', wings: true, eyes: ['#7fd1ff', '#7fd1ff'], tail: 'fluff', aura: '255,240,180', tank: '#f2e6c4', liquid: '#fff3a6', bonus: { income: 1.4 }, text: '+40% эктоплазмы', usd: '$3.99' },
    santa: { tier: 3, name: 'Дед Мурмороз', body: '#e8e4ee', dark: '#b8b4c8', pat: 'fluffy', hat: 'santa', beard: true, tank: '#e8304f', bonus: { dmg: 1.25, income: 1.25 }, text: '+25% урон и доход', usd: '$4.99' },
    golden: { tier: 4, name: 'Золотой кот', body: '#ffd24d', dark: '#e0a91f', pat: 'none', metal: true, hat: 'crown', gem: true, pearls: true, eyes: ['#3ddc97', '#3ddc97'], ear: '#ff9f5a', aura: '255,220,90', sparkle: '#fff6c0', tank: '#ffc94d', bonus: { dmg: 1.5, income: 1.5 }, text: '+50% урон и доход', usd: '$9.99' },
    reaper: { tier: 4, name: 'Кот-Жнец', body: '#6a6286', dark: '#433c58', pat: 'none', hat: 'wizard', hatC: '#2a2638', cape: true, eyes: ['#9dff7a', '#9dff7a'], slit: true, aura: '150,255,140', sparkle: '#c8ffb8', tank: '#2a2638', liquid: '#9dff7a', bonus: { dmg: 1.5, income: 1.3 }, text: '+50% урон, +30% доход', pass: true },
    phantom: { tier: 4, name: 'Фантом', body: '#a8f0ff', dark: '#5fc8e0', pat: 'none', ghost: true, eyes: ['#ffffff', '#ffffff'], aura: '120,240,255', sparkle: '#d6fbff', tank: '#5fc8e0', liquid: '#ffffff', bonus: { dmg: 1.6, rate: 1.2 }, text: '+60% урон, +20% скорость', usd: '$12.99' },
  };

  const CRYSTAL_PACKS = [
    { amount: 100, price: '$0.99' }, { amount: 550, price: '$4.99', extra: '+10%' }, { amount: 1200, price: '$9.99', extra: '+20%' },
    { amount: 2600, price: '$19.99', extra: '+30%' }, { amount: 7000, price: '$49.99', extra: '+40%' },
  ];

  const DAILY = [
    { label: '20 💎', icon: 'gem', apply: () => { S.crystals += 20; } },
    { label: '5 банок', icon: 'jar', apply: () => { S.jars += 5; } },
    { label: '50 💎', icon: 'gem', apply: () => { S.crystals += 50; } },
    { label: 'Насадка B', icon: 'attach', apply: () => giveAttach(2) },
    { label: '100 💎', icon: 'gem', apply: () => { S.crystals += 100; } },
    { label: 'Эпик-дух', icon: 'ghost', apply: () => giveGhost(district().ghosts[2]) },
    { label: '300 💎 + корона', icon: 'crown', apply: () => { S.crystals += 300; } },
  ];

  const WHEEL = [
    { label: '50 💎', icon: 'gem', val: '50', color: '#5fc8f0', w: 2, apply: () => { S.crystals += 50; } },
    { label: '5 банок', icon: 'jar', val: '5', color: '#f0b85a', w: 3, apply: () => { S.jars += 5; } },
    { label: 'Полнолуние', icon: 'moon', val: 'x2', color: '#e8c840', w: 2, apply: () => { S.moonUntil = Date.now() + 60000; } },
    { label: '200 💎', icon: 'gem', val: '200', color: '#4d7cff', w: 0.5, apply: () => { S.crystals += 200; } },
    { label: 'Насадка', icon: 'attach', val: 'D–S', color: '#a86bff', w: 1, apply: () => giveAttach(rollRank()) },
    { label: '15 💎', icon: 'gem', val: '15', color: '#7fd8e8', w: 3, apply: () => { S.crystals += 15; } },
    { label: 'Эктоплазма', icon: 'ecto', val: 'x60', color: '#5fc86a', w: 3, apply: () => { S.ecto += ghostReward(0) * 60; } },
    { label: 'Эпик-дух', icon: 'ghost', val: 'ЭПИК', color: '#ff6b9a', w: 0.5, apply: () => giveGhost(district().ghosts[2]) },
  ];

  const RAID_TIME = 30;
  const ROOMS_PER_HOUSE = 5;
  const GHOSTS_PER_ROOM = 22;
  const MAX_ALIVE = 14;
  const PRESTIGE_HOUSE = 10;
  const SAVE_KEY = 'cat_exorcist_v1';
  const VERSION = '0.9.0';
  const CIRCLE = HOUSES_PER_DISTRICT * DISTRICTS.length; // 80 домов, дальше «Круг 2»

  // Путь открытий: что даёт рекорд по домам
  // room — комната внутри дома (по умолчанию 1); открытие засчитывается по рекорду комнат
  const UNLOCKS = [
    { house: 1, room: 2, id: 'pull', icon: '🧲', name: 'Прокачка «Тяга»', text: 'Выше шанс поймать ослабленного призрака' },
    { house: 1, room: 2, id: 'squad', icon: '👻', name: 'Отряд призраков', text: 'Пойманные духи сражаются рядом с котом' },
    { house: 1, room: 3, id: 'collect', icon: '💚', name: 'Прокачка «Сборник»', text: 'Больше эктоплазмы с каждого призрака' },
    { house: 1, room: 4, id: 'quests', icon: '📜', name: 'Задания', text: 'Задания дня, пропуск и Путь открытий' },
    { house: 2, id: 'moon', icon: '🌕', name: 'Полнолуние', text: 'x2 урона и дохода на 60 секунд' },
    { house: 2, id: 'daily', icon: '🎁', name: 'Награды за вход', text: 'Подарок каждый день, неделя по кругу' },
    { house: 2, room: 3, id: 'attach', icon: '🧹', name: 'Насадки пылесоса', text: 'Призыв насадок за кристаллы с боссов' },
    { house: 3, id: 'shop', icon: '🛒', name: 'Магазин', text: 'Скины, наборы и кристаллы' },
    { house: 3, room: 3, id: 'auto', icon: '⚙', name: 'Автопрокачка и автослияние', text: 'Кнопки справа: качают и сливают сами' },
    { house: 4, id: 'bestiary', icon: '📖', name: 'Бестиарий', text: 'Вехи поимок дают кристаллы и +3% урона' },
    { house: 3, id: 'wheel', icon: '🎡', name: 'Колесо удачи', text: 'Бесплатное вращение каждый день' },
    { house: 5, id: 'raid', icon: '🏚', name: 'Рейды', text: '3 билета в день на Призрачный особняк' },
    { house: PRESTIGE_HOUSE, id: 'prestige', icon: '✨', name: 'Освящение и Лунный алтарь', text: 'Лунные камни и вечные таланты' },
    { house: 15, id: 'squad5', icon: '👻', name: '5-й слот отряда', text: 'Ещё один дух бьётся рядом с котом' },
    { house: 20, id: 'elite', icon: '👑', name: 'Элитные призраки', text: 'Золотые призраки: x6 эктоплазмы и кристаллы' },
    { house: 25, id: 'slot4', icon: '🧹', name: '4-й слот насадок', text: 'Ещё одна насадка на пылесосе' },
    { house: 30, id: 'ranks', icon: '💠', name: 'Ранги SS и SSS', text: 'Призыв и слияние до ранга SSS' },
    { house: 40, id: 'stars', icon: '⭐', name: '6 и 7 звёзд', text: 'Духов можно сливать до 7★' },
    { house: 51, id: 'ice', icon: '❄', name: 'Ледяной замок', text: 'Новый район и 4 новых призрака' },
    { house: 61, id: 'lab', icon: '🧪', name: 'Безумная лаборатория', text: 'Новый район и 4 новых призрака' },
    { house: 71, id: 'palace', icon: '🌙', name: 'Лунный дворец', text: 'Новый район и 4 новых призрака' },
    { house: CIRCLE + 1, id: 'circle2', icon: '🔁', name: 'Круг 2', text: 'Город заново: сильнее призраки, x2 💎 с боссов' },
  ];
  UNLOCKS.forEach((u) => { u.stage = (u.house - 1) * 5 + ((u.room || 1) - 1); });
  UNLOCKS.sort((a, b) => a.stage - b.stage);
  const UNLOCK = Object.fromEntries(UNLOCKS.map((u) => [u.id, u]));
  const ROAD_PER_PAGE = 12;
  const unlockWhere = (u) => 'Дом ' + u.house + (u.room > 1 ? ', комн. ' + u.room : '');

  // Лунный алтарь: таланты за лунные камни
  const ALTAR = {
    might: { name: 'Мощь луны', icon: '⚔', color: '#ff7a9c', max: 60, cost: (l) => Math.ceil(2 * Math.pow(1.6, l)), desc: (l) => 'урон x' + fmt(Math.pow(1.25, l), 2) + ' (+25% за уровень)' },
    harvest: { name: 'Лунный урожай', icon: '🌿', color: '#8ee08a', max: 60, cost: (l) => Math.ceil(2 * Math.pow(1.6, l)), desc: (l) => 'эктоплазма x' + fmt(Math.pow(1.25, l), 2) + ' (+25% за уровень)' },
    memory: { name: 'Лунная память', icon: '🧠', color: '#7fd1ff', max: 5, cost: (l) => Math.ceil(6 * Math.pow(1.6, l)), desc: (l) => (l * 10) + '% уровней и старт до ' + (l * 12) + '% рекорда' },
    night: { name: 'Ночная смена', icon: '🌃', color: '#a88bff', max: 4, cost: (l) => Math.ceil(4 * Math.pow(1.8, l)), desc: (l) => 'офлайн-доход копится ' + (4 + l) + ' ч вместо 4' },
    luck: { name: 'Кошачья удача', icon: '🍀', color: '#ffc94d', max: 5, cost: (l) => Math.ceil(5 * Math.pow(1.7, l)), desc: (l) => '+' + (3 * l) + '% поимки, +' + (20 * l) + '% 💎 с боссов' },
    hourglass: { name: 'Песочные часы', icon: '⏳', color: '#ff9f5a', max: 4, cost: (l) => Math.ceil(5 * Math.pow(1.8, l)), desc: (l) => 'на босса ' + (30 + 5 * l) + ' с вместо 30' },
  };

  // Ежедневные задания: 5 случайных каждый день + сундук за все
  const DAILY_MISSIONS = {
    kills: { text: (n) => 'Победи ' + n + ' призраков', goal: 250 },
    captures: { text: (n) => 'Поймай ' + n + ' призраков', goal: 15 },
    rooms: { text: (n) => 'Очисти ' + n + ' комнат', goal: 12 },
    bosses: { text: (n) => 'Победи ' + n + ' боссов', goal: 3 },
    upgrades: { text: (n) => 'Купи ' + n + ' улучшений', goal: 30 },
    summons: { text: (n) => 'Призови ' + n + ' насадок', goal: 5 },
    merges: { text: (n) => 'Сделай ' + n + ' слияния', goal: 3 },
    ads: { text: (n) => 'Посмотри ' + n + ' рекламы', goal: 2 },
    spins: { text: (n) => 'Покрути колесо ' + n + ' раза', goal: 2, need: 'wheel' },
    raids: { text: (n) => 'Сходи в рейд ' + n + ' раза', goal: 2, need: 'raid' },
    elites: { text: (n) => 'Победи ' + n + ' элитных призраков', goal: 3, need: 'elite' },
  };
  const MISSION_GEMS = 15, MISSION_XP = 60, CHEST_XP = 150;

  // Призрачный пропуск: 30 уровней, сезон 28 дней
  const PASS_LEVELS = 30, PASS_XP = 500, PASS_DAYS = 28, PASS_PRICE = '$4.99', PASS_SKIP = 100;
  const gemR = (n) => ({ icon: 'gem', val: String(n), label: n + ' 💎', apply: () => { S.crystals += n; } });
  const jarR = (n) => ({ icon: 'jar', val: String(n), label: n + ' банок', apply: () => { S.jars += n; } });
  const attR = (r) => ({ icon: 'attach', val: RANKS[r], label: 'Насадка ' + RANKS[r], apply: () => giveAttach(r) });
  const stoneR = (n) => ({ icon: 'moon', val: String(n), label: n + ' лунных камней', apply: () => { S.stones += n; } });
  const ghostR = (st) => ({ icon: 'ghost', val: st + '★', label: 'Эпик-дух ' + st + '★', apply: () => giveGhost(district().ghosts[2], st) });
  const PASS_FREE = Array.from({ length: PASS_LEVELS }, (_, k) => {
    const l = k + 1;
    if (l % 10 === 0) return stoneR(l / 5);
    if (l % 5 === 0) return attR(l >= 15 ? 3 : 2);
    if (l % 3 === 0) return jarR(10);
    return gemR(20 + 2 * l);
  });
  const PASS_PREM = Array.from({ length: PASS_LEVELS }, (_, k) => {
    const l = k + 1;
    if (l === PASS_LEVELS) return { icon: 'crown', val: 'СКИН', label: 'Скин «Кот-Жнец»', apply: () => { if (!S.skins.includes('reaper')) S.skins.push('reaper'); S.skin = 'reaper'; } };
    if (l % 10 === 0) return stoneR(l / 2);
    if (l % 5 === 0) return l >= 15 ? attR(4) : ghostR(2);
    if (l % 4 === 0) return stoneR(2);
    if (l % 2 === 0) return gemR(60 + 5 * l);
    return jarR(15);
  });

  // =====================================================================
  // Состояние
  // =====================================================================
  const defaultState = () => ({
    house: 1, room: 1, cleared: 0,
    settings: { music: true, sfx: true, vibro: true, numbers: true, shake: true },
    ach: {},
    ecto: 0, crystals: 60, jars: 8,
    lvPower: 1, lvPull: 1, lvCollect: 1,
    inventory: [], squad: [null, null, null, null],
    attach: [], equipped: [null, null, null],
    nextId: 1,
    bestiary: {}, bestClaimed: {},
    stats: { kills: 0, captures: 0, upgrades: 0, rooms: 0, summons: 0, merges: 0, bosses: 0, ads: 0, spins: 0, raids: 0, elites: 0, raidBest: 0, bestStreak: 0 },
    quests: [], questLevel: 0,
    stones: 0, prestiges: 0, auto: true,
    stonesSpent: 0, altar: {}, boostPrest: 0, seenUnlocks: [], maxStage: 0, fresh: [], tut: 0,
    dm: { day: '', list: [], chest: false }, streak: { count: 0, last: '' },
    pass: { season: -1, xp: 0, premium: false, free: [], prem: [] },
    skins: ['ginger'], skin: 'ginger', maxHouse: 1,
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
      const parsed = JSON.parse(raw);
      const s = Object.assign(defaultState(), parsed);
      if (parsed.tut === undefined && ((parsed.maxStage || 0) > 0 || (parsed.house || 1) > 1 || ((parsed.stats || {}).captures || 0) > 0)) s.tut = 9; // старым игрокам обучение не нужно
      s.stats = Object.assign(defaultState().stats, s.stats);
      ['daily', 'wheel', 'raid', 'settings', 'dm', 'streak', 'pass', 'ach'].forEach((k) => { s[k] = Object.assign(defaultState()[k], s[k]); });
      s.maxHouse = Math.max(s.maxHouse || 1, s.house);
      s.maxStage = Math.max(s.maxStage || 0, (s.maxHouse - 1) * 5 + (s.house === s.maxHouse ? s.room - 1 : 4));
      // старые сохранения: всё, что уже пройдено, считается открытым без окон
      UNLOCKS.forEach((u) => { if (s.maxStage >= u.stage && !s.seenUnlocks.includes(u.id)) s.seenUnlocks.push(u.id); });
      s.skins = s.skins.filter((k) => SKINS[k]); if (!SKINS[s.skin]) s.skin = 'ginger';
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
  const skinMult = (kind) => 1 + S.skins.reduce((m, k) => m + ((SKINS[k] && SKINS[k].bonus[kind]) || 1) - 1, 0);
  const unlocked = (id) => (S.maxStage || 0) >= UNLOCK[id].stage;
  const talent = (k) => S.altar[k] || 0;
  const stonesFree = () => Math.max(0, S.stones - S.stonesSpent);
  const attachSlots = () => 3 + (unlocked('slot4') ? 1 : 0) + (vipActive() ? 1 : 0);
  const squadSlots = () => 4 + (unlocked('squad5') ? 1 : 0) + (S.starter ? 1 : 0);
  const maxStars = () => (unlocked('stars') ? 7 : 5);
  const maxRank = () => (unlocked('ranks') ? RANKS.length - 1 : 4);
  const bossTime = () => 30 + 5 * talent('hourglass');
  const circle = (house) => Math.floor(((house || S.house) - 1) / CIRCLE);
  const offlineHours = () => 4 + talent('night') + (vipActive() ? 4 : 0);
  const today = () => new Date().toDateString();
  // Лунные камни: пассивный бонус от всех заработанных камней (тратятся они в алтаре без потери бонуса)
  const stoneDmg = () => (1 + 0.05 * S.stones) * Math.pow(1.25, talent('might'));
  const stoneInc = () => (1 + 0.02 * S.stones) * Math.pow(1.25, talent('harvest'));
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

  const catDamage = () => 10 * Math.pow(1.15, S.lvPower - 1) * moonMult() * stoneDmg() * bestiaryMult() * attachMult() * setMult() * skinMult('dmg');
  const fireRate = () => Math.min((3 + 0.06 * (S.lvPull - 1)) * skinMult('rate'), 12);
  const captureChance = () => Math.min(0.4 + 0.012 * (S.lvPull - 1) + 0.03 * talent('luck'), 0.95);
  const critChance = () => 0.1 + Math.min(0.5, 0.04 * kindPower('brush'));
  const critMult = () => 3 + 0.25 * kindPower('brush');
  const incomeMult = () => Math.pow(1.08, S.lvCollect - 1) * moonMult() * stoneInc() * skinMult('income');
  // Баланс (см. docs/BALANCE.md): здоровье растёт быстрее награды, поэтому без освящения рост упирается в стену около дома 15
  const hpAt = (stage, rarity) => 22 * Math.pow(1.26, stage) * RARITY[rarity].hp;
  const ghostHp = (rarity) => hpAt(stageIndex(), rarity);
  const ghostReward = (rarity) => 4 * Math.pow(1.15, stageIndex()) * RARITY[rarity].reward * incomeMult();
  const upgradeCost = (lv, base) => Math.floor(base * Math.pow(1.22, lv - 1));
  function squadDamage(g) {
    const d = GHOSTS[g.type].d;
    const syn = (squadDistrictCounts()[d] || 0) >= 2 ? 1.2 : 1;
    return catDamage() * 0.25 * RARITY[GHOSTS[g.type].rarity].squad * Math.pow(2.2, g.stars - 1) * syn;
  }
  const stonesBase = (house) => (house < PRESTIGE_HOUSE ? 0 : Math.floor(0.5 * Math.pow(house - 4, 1.5)));
  const stonesFor = (house) => stonesBase(house) * (S.boostPrest > 0 ? 2 : 1);

  const UPGRADES = [
    { key: 'lvPower', name: 'Мощность', base: 10, color: '#ff7a9c', desc: () => fmt(catDamage()) + ' урон' },
    { key: 'lvPull', lock: 'pull', name: 'Тяга', base: 14, color: '#7fd1ff', desc: () => Math.round(captureChance() * 100) + '% поимка' },
    { key: 'lvCollect', lock: 'collect', name: 'Сборник', base: 12, color: '#8ee08a', desc: () => 'x' + fmt(incomeMult(), 2) + ' эктопл.' },
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
  let behIntro = null, behQueue = [], iconSheet = false; // знакомство с новым типом призрака
  let zones = [], featureCd = 6; // опасные зоны на полу: {x, y, r, tele, life, kind, dmg, color}
  let ghosts = [], beams = [], floaters = [], particles = [], drops = [], orbiters = [], rings = [];
  let spawnCd = 0.5, roomSpawned = 0, bossTimer = 0, bossSpawned = false;
  let panel = null; // squad | attach | bestiary | quests | prestige | offline
  let selectedJar = null, selectedAttach = null, bestPage = 0, dayCheck = 5, roadPage = -1, questTab = 'daily', prestTab = 'main', passPage = -1;
  let toast = null, shake = 0, time = 0, roomToken = 0, press = null, skinTier = 0;
  let modal = null; // {title, lines, buttons} или {ad: {t, cb}}
  let shopTab = 'offers';
  let gold = null, goldCd = 40 + Math.random() * 30;
  let raid = null; // {t, floor}
  let wheelRot = 0, wheelSpin = null, wheelWin = null;
  let bossContinued = false, jarOfferCd = 0;
  let splash = { t: 0, out: 0 }; // титульная заставка при запуске

  function resetRoom() {
    ghosts = []; shots = []; shards = []; zones = []; featureCd = 6; roomSpawned = 0; S.cleared = 0; cat.hp = CAT_MAX_HP; bossContinued = false; buildMap(); spawnCd = 0.6; bossSpawned = false; bossTimer = 0; roomToken++;
  }

  function pickType() {
    const g = district().ghosts;
    const r = Math.random();
    return r < 0.04 ? g[2] : r < 0.19 ? g[1] : g[0];
  }

  function spawnGhost(type, o) {
    o = o || {};
    const def = GHOSTS[type];
    const boss = def.rarity === 3;
    const elite = !boss && !o.small && unlocked('elite') && Math.random() < 0.04;
    const hp = ghostHp(def.rarity) * (elite ? 6 : 1) * (o.small ? 0.3 : 1);
    if (def.beh && !o.small && !raid) {
      S.seenBeh = S.seenBeh || {};
      if (!S.seenBeh[def.beh] && S.tut >= 9) { S.seenBeh[def.beh] = 1; behQueue.push({ kind: def.beh, type, life: 5 }); }
    }
    ghosts.push({
      type, boss, elite, hp, maxHp: hp, beh: def.beh || null, bt: 2 + Math.random() * 2, small: !!o.small,
      ...(o.x !== undefined ? { x: o.x, y: o.y } : spawnPoint(boss ? 300 : 430)),
      vx: (Math.random() - 0.5) * 30, vy: (boss ? 0.6 : 1) * (28 + Math.random() * 14),
      r: (boss ? 40 : elite ? 26 : def.rarity === 2 ? 22 : 19) * (o.small ? 0.7 : 1),
      phase: Math.random() * 6, hit: 0, alpha: o.small ? 0.7 : 0, dying: 0, capturing: 0,
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
  // Звук и музыка: всё синтезируется Web Audio, без файлов
  // =====================================================================
  const SFX = (() => {
    let ac = null, sfxGain, musGain, noiseBuf;
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    function init() {
      if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      const master = ac.createGain(); master.gain.value = 0.9;
      sfxGain = ac.createGain(); musGain = ac.createGain();
      sfxGain.connect(comp); musGain.connect(comp); comp.connect(master); master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      apply();
      setInterval(musicTick, 50);
    }
    function apply() {
      if (!ac) return;
      sfxGain.gain.setTargetAtTime(S.settings.sfx ? 0.7 : 0, ac.currentTime, 0.05);
      musGain.gain.setTargetAtTime(S.settings.music ? 0.38 : 0, ac.currentTime, 0.2);
    }
    function env(g, t, vol, attack, dur) {
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }
    function tone(freq, dur, o) {
      o = o || {};
      const t = (o.at || ac.currentTime) + (o.delay || 0);
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * o.slide), t + dur);
      if (o.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5.5; lg.gain.value = freq * o.vib; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05); }
      env(g, t, o.vol || 0.2, o.attack || 0.005, dur);
      let node = osc;
      if (o.lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f; }
      node.connect(g); g.connect(o.dest || sfxGain);
      osc.start(t); osc.stop(t + dur + 0.05);
    }
    function noise(dur, o) {
      o = o || {};
      const t = (o.at || ac.currentTime) + (o.delay || 0);
      const src = ac.createBufferSource(); src.buffer = noiseBuf;
      const f = ac.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.freq || 2000, t); f.Q.value = o.q || 1;
      if (o.slide) f.frequency.exponentialRampToValueAtTime(o.freq * o.slide, t + dur);
      const g = ac.createGain(); env(g, t, o.vol || 0.1, o.attack || 0.003, dur);
      src.connect(f); f.connect(g); g.connect(o.dest || sfxGain);
      src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
    }
    const arp = (notes, step, type, vol, len) => notes.forEach((f, i) => tone(f, len || step * 2.2, { type, vol, delay: i * step }));
    const P = {
      shoot: () => { tone(900 + Math.random() * 200, 0.07, { type: 'square', vol: 0.035, slide: 0.45, lp: 3000 }); noise(0.05, { vol: 0.03, freq: 5000 }); },
      hit: () => tone(240 + Math.random() * 80, 0.06, { type: 'triangle', vol: 0.07, slide: 0.6 }),
      crit: () => { tone(1100, 0.08, { type: 'square', vol: 0.05, slide: 1.6, lp: 4000 }); tone(1760, 0.14, { type: 'sine', vol: 0.06, delay: 0.03 }); },
      pop: () => { tone(420 + Math.random() * 80, 0.16, { type: 'sine', vol: 0.16, slide: 2.4 }); noise(0.08, { vol: 0.05, freq: 1400 }); },
      bossDown: () => { noise(0.9, { vol: 0.18, freq: 300, type: 'lowpass', slide: 0.3 }); tone(150, 0.8, { type: 'sawtooth', vol: 0.1, slide: 0.3, lp: 900 }); arp([523, 659, 784, 1047, 1319], 0.09, 'square', 0.06); },
      suck: () => { noise(0.6, { vol: 0.12, freq: 300, slide: 8, q: 4 }); tone(160, 0.6, { type: 'sawtooth', vol: 0.03, slide: 4, lp: 1200 }); },
      caught: () => arp([784, 988, 1175, 1568], 0.06, 'triangle', 0.13),
      escape: () => { tone(500, 0.3, { type: 'sawtooth', vol: 0.05, slide: 0.35, lp: 1500 }); tone(380, 0.3, { type: 'sine', vol: 0.08, slide: 0.5, delay: 0.08 }); },
      ecto: () => tone(1300 + Math.random() * 500, 0.06, { type: 'sine', vol: 0.045 }),
      crystal: () => { tone(1568, 0.18, { type: 'triangle', vol: 0.1 }); tone(2349, 0.25, { type: 'sine', vol: 0.07, delay: 0.06 }); },
      click: () => tone(700, 0.05, { type: 'triangle', vol: 0.1, slide: 1.4 }),
      deny: () => { tone(220, 0.1, { type: 'square', vol: 0.05, lp: 1200 }); tone(196, 0.14, { type: 'square', vol: 0.05, delay: 0.08, lp: 1200 }); },
      upgrade: () => arp([523, 659, 784, 1047], 0.04, 'square', 0.045),
      merge: () => { arp([523, 659, 784, 1047, 1319, 1568], 0.055, 'triangle', 0.11); noise(0.5, { vol: 0.05, freq: 7000, type: 'highpass' }); },
      summon: () => { noise(0.5, { vol: 0.08, freq: 600, slide: 6, q: 2 }); arp([392, 523, 659, 784, 1047], 0.08, 'triangle', 0.1); },
      hurt: () => { tone(330, 0.2, { type: 'sawtooth', vol: 0.08, slide: 0.5, lp: 1800 }); },
      enemyShot: () => tone(260, 0.2, { type: 'sine', vol: 0.06, slide: 0.55, vib: 0.03 }),
      spawn: () => tone(200, 0.35, { type: 'sine', vol: 0.03, slide: 2.2, vib: 0.04 }),
      boss: () => { tone(98, 1.4, { type: 'sawtooth', vol: 0.12, slide: 0.75, lp: 700 }); tone(104, 1.4, { type: 'sawtooth', vol: 0.1, slide: 0.75, lp: 700 }); noise(1.2, { vol: 0.08, freq: 180, type: 'lowpass' }); tone(392, 1.2, { type: 'sine', vol: 0.05, vib: 0.06, delay: 0.3 }); },
      clear: () => { arp([523, 659, 784], 0.08, 'square', 0.06); tone(1047, 0.45, { type: 'triangle', vol: 0.12, delay: 0.24 }); },
      reward: () => { arp([659, 784, 1047, 1319], 0.07, 'triangle', 0.11); noise(0.3, { vol: 0.04, freq: 8000, type: 'highpass', delay: 0.2 }); },
      tick: () => tone(1500, 0.025, { type: 'square', vol: 0.035 }),
      goldAppear: () => arp([1319, 1568, 1976, 2637], 0.05, 'sine', 0.06),
      gold: () => { arp([1047, 1319, 1568, 2093, 2637], 0.04, 'triangle', 0.1); noise(0.4, { vol: 0.05, freq: 9000, type: 'highpass' }); },
      moon: () => { [523, 659, 784, 988].forEach((f) => tone(f, 1.4, { type: 'sine', vol: 0.06, attack: 0.15, vib: 0.01 })); },
      fail: () => arp([392, 330, 262, 196], 0.14, 'triangle', 0.1, 0.3),
    };
    const LIMIT = { shoot: 0.06, hit: 0.05, crit: 0.08, ecto: 0.035, spawn: 0.4, hurt: 0.3, enemyShot: 0.15, pop: 0.05, tick: 0.03 };
    const last = {};
    function play(name) {
      if (!ac || !S.settings.sfx || ac.state !== 'running') return;
      const now = ac.currentTime;
      if (last[name] && now - last[name] < (LIMIT[name] || 0.02)) return;
      last[name] = now;
      P[name]();
    }

    // ---- Музыка: генеративный секвенсор, у каждого района своя тема
    const SC = { minor: [0, 2, 3, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11], dorian: [0, 2, 3, 5, 7, 9, 10], major: [0, 2, 4, 5, 7, 9, 11] };
    const SONGS = {
      d0: { root: 57, sc: 'minor', bpm: 100, prog: [0, 5, 2, 6], lead: 'sine', box: true, drums: 1 },     // спальный: музыкальная шкатулка
      d1: { root: 55, sc: 'dorian', bpm: 94, prog: [0, 3, 6, 4], lead: 'triangle', drums: 1 },           // старый город
      d2: { root: 53, sc: 'dorian', bpm: 112, prog: [0, 6, 5, 6], lead: 'square', drums: 1, swing: true }, // порт: шанти
      d3: { root: 60, sc: 'major', bpm: 116, prog: [0, 5, 3, 4], lead: 'triangle', box: true, drums: 1 }, // универмаг
      d4: { root: 52, sc: 'harm', bpm: 86, prog: [0, 5, 3, 4], lead: 'sine', drums: 0, pad: true },      // кладбище
      d5: { root: 62, sc: 'minor', bpm: 92, prog: [0, 3, 5, 4], lead: 'sine', box: true, drums: 0, pad: true }, // ледяной замок
      d6: { root: 55, sc: 'harm', bpm: 124, prog: [0, 1, 5, 4], lead: 'square', drums: 2 },               // лаборатория
      d7: { root: 58, sc: 'major', bpm: 96, prog: [0, 4, 5, 3], lead: 'triangle', drums: 1, pad: true },   // лунный дворец
      boss: { root: 50, sc: 'harm', bpm: 138, prog: [0, 0, 5, 4], lead: 'square', drums: 2, pad: true },
      title: { root: 57, sc: 'harm', bpm: 104, prog: [0, 5, 3, 4], lead: 'triangle', box: true, drums: 1, pad: true }, // заставка
      raid: { root: 57, sc: 'harm', bpm: 130, prog: [0, 5, 6, 4], lead: 'sawtooth', drums: 2 },
    };
    const deg = (song, d) => { const s = SC[song.sc], o = Math.floor(d / 7); return song.root + s[((d % 7) + 7) % 7] + 12 * o; };
    function build(key) {
      const song = Object.assign({ key }, SONGS[key]);
      let seed = 0; for (const ch of key) seed = seed * 31 + ch.charCodeAt(0);
      song.mel = [];
      for (let sec = 0; sec < 2; sec++) {
        const R = rng(seed + sec * 977);
        let prev = 7;
        for (let b = 0; b < 4; b++) {
          const c = song.prog[b], bar = new Array(16).fill(null);
          for (let st = 0; st < 16;) {
            const strong = st % 4 === 0;
            if (st === 0 || R() < (strong ? 0.75 : 0.35)) {
              const tones = strong ? [c, c + 2, c + 4, c + 7] : [c, c + 1, c + 2, c + 3, c + 4, c + 5, c + 7];
              let best = tones[0], bd = 99;
              for (const t of tones) { const tt = t + 7 * Math.round((prev - t) / 7); const dd = Math.abs(tt - prev) + R() * 3; if (dd < bd) { bd = dd; best = tt; } }
              prev = Math.max(4, Math.min(14, best));
              const len = R() < 0.3 ? 4 : 2;
              bar[st] = { d: prev, len }; st += len;
            } else st += 2;
          }
          if (b === 3 && sec === 1) { bar.fill(null); bar[0] = { d: c + 7, len: 8 }; }
          song.mel.push(bar);
        }
      }
      return song;
    }
    const mus = { next: 0, step: 0, song: null, key: '' };
    function musicKey() { return splash ? 'title' : raid ? 'raid' : (isBossRoom() && bossSpawned) ? 'boss' : 'd' + districtIndex(); }
    function step(song, i, t) {
      const st = i % 16, bar = Math.floor(i / 16) % 8, c = song.prog[bar % 4];
      const s16 = 60 / song.bpm / 4;
      const D = musGain;
      // бас
      if (st === 0 || st === 8 || (song.drums === 2 && st % 4 === 2) || (song.swing && st === 6)) tone(mtof(deg(song, c) - 12), s16 * (song.drums === 2 ? 1.8 : 3.5), { type: 'triangle', vol: 0.2, at: t, dest: D, lp: 600 });
      // арпеджио аккорда
      if (st % 2 === 0) { const ch = [c, c + 2, c + 4, c + 2]; tone(mtof(deg(song, ch[(st / 2) % 4]) + 12), s16 * 2, { type: song.box ? 'sine' : 'triangle', vol: 0.045, at: t, dest: D }); }
      // пэд на весь такт
      if (song.pad && st === 0) [c, c + 2, c + 4].forEach((d) => tone(mtof(deg(song, d)), s16 * 16, { type: 'sawtooth', vol: 0.018, attack: 0.4, at: t, dest: D, lp: 700 }));
      // мелодия
      const n = song.mel[bar][st];
      if (n) {
        const f = mtof(deg(song, n.d) + 12);
        tone(f, s16 * n.len * (song.box ? 1.6 : 0.95), { type: song.lead, vol: song.lead === 'square' || song.lead === 'sawtooth' ? 0.04 : 0.08, at: t, dest: D, lp: 2600, vib: song.box ? 0 : 0.006 });
        if (song.box) tone(f * 2, s16 * n.len, { type: 'sine', vol: 0.025, at: t, dest: D });
      }
      // ударные
      if (song.drums) {
        if (st === 0 || (song.drums === 2 && st === 8) || (st === 10 && song.drums === 1)) tone(130, 0.14, { type: 'sine', vol: 0.22, slide: 0.35, at: t, dest: D });
        if (st % 4 === 2) noise(0.035, { vol: 0.035, freq: 8000, type: 'highpass', at: t, dest: D });
        if (song.drums === 2 && (st === 4 || st === 12)) noise(0.12, { vol: 0.09, freq: 1800, at: t, dest: D });
      } else if (st === 0 && bar % 2 === 0) tone(mtof(deg(song, c) + 24), 2.5, { type: 'sine', vol: 0.03, vib: 0.02, attack: 0.3, at: t, dest: D }); // колокол
    }
    function musicTick() {
      if (!ac || ac.state !== 'running' || !S.settings.music) return;
      const key = musicKey();
      if (mus.key !== key && mus.step % 16 === 0) { mus.key = key; mus.song = build(key); mus.step = 0; }
      if (!mus.song) return;
      const s16 = 60 / mus.song.bpm / 4;
      if (mus.next < ac.currentTime) mus.next = ac.currentTime + 0.05;
      while (mus.next < ac.currentTime + 0.25) {
        step(mus.song, mus.step, mus.next + (mus.song.swing && mus.step % 2 ? s16 * 0.18 : 0));
        mus.next += s16; mus.step++;
        if (mus.key !== musicKey() && mus.step % 16 === 0) break;
      }
    }
    document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else ac.resume(); });
    return { init, play, apply, debug: () => ({ state: ac && ac.state, song: mus.key, step: mus.step }) };
  })();

  // =====================================================================
  // Бой
  // =====================================================================
  function nearestGhost(x, y, except) {
    let best = null, bd = Infinity;
    for (const g of ghosts) {
      if (!targetable(g) || g === except) continue;
      if (S.tut === 0 && lowHp(g) && !raid) continue; // в обучении ослабленных оставляем для поимки
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
      SFX.play(crit ? 'crit' : 'hit');
      if (g.hp <= 0) {
        raid.floor++; SFX.play('clear');
        g.maxHp *= 1.3; g.hp = g.maxHp;
        burst(g.x, g.y, 30, '#c9b8ff'); shake = 0.3;
        floaters.push({ x: g.x, y: g.y - 60, text: 'Этаж ' + raid.floor + '!', life: 1.4, color: '#ffc94d', size: 20 });
      }
      return;
    }
    g.hp -= amount;
    g.hit = 0.12;
    SFX.play(crit ? 'crit' : 'hit');
    if (!g.boss) { const kx = g.x - cat.x, ky = g.y - cat.y, kd = Math.hypot(kx, ky) || 1; g.x += (kx / kd) * 5; g.y += (ky / kd) * 5; }
    if (opt('numbers')) floaters.push({ x: g.x + (Math.random() - 0.5) * 24, y: g.y - g.r, text: fmt(amount), life: 0.9, color: crit ? '#ffdd55' : '#ffffff', size: crit ? 17 : 13 });
    if (g.hp <= 0) killGhost(g);
  }

  function killGhost(g) {
    g.hp = 0;
    const rar = GHOSTS[g.type].rarity;
    const reward = ghostReward(rar) * (g.boss ? 1 : 0.45) * (g.elite ? 6 : 1) * (g.small ? 0.4 : 1);
    cancelFuse(g);
    if (g.beh === 'split' && !g.small) for (const sd of [-1, 1]) spawnGhost(g.type, { small: true, x: g.x + sd * 20, y: g.y + (Math.random() - 0.5) * 10 });
    if (g.elite) { S.crystals += 2; S.stats.elites++; floaters.push({ x: g.x, y: g.y - 40, text: 'Элита! +2 💎', life: 1.4, color: '#ffd84d', size: 15 }); }
    const n = g.boss ? 14 : 3;
    for (let i = 0; i < n; i++) {
      const sp = toScreen(g.x, g.y);
      drops.push({ x: sp.x, y: sp.y, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 120, t: 0, value: reward / n });
    }
    burst(g.x, g.y, g.boss ? 40 : 14, GHOSTS[g.type].body);
    SFX.play(g.boss ? 'bossDown' : 'pop');
    S.stats.kills++;
    if (Math.random() < (g.boss ? 1 : 0.08)) {
      const n = g.boss ? 3 : 1;
      for (let i = 0; i < n; i++) shards.push({ x: Math.max(FIELD.x1, Math.min(FIELD.x2, g.x + (Math.random() - 0.5) * 80)), y: Math.max(FIELD.y1, Math.min(FIELD.y2, g.y + (Math.random() - 0.5) * 80)), life: 12 });
    }
    // обычных призраков кот иногда ловит сам
    if (!g.boss && rar === 0 && S.jars > 0 && Math.random() < captureChance() * 0.2) capture(g.type, g.x, g.y, true);
    g.dying = 0.35;
    if (g.boss) {
      const cr = bossGems();
      S.crystals += cr; bossDown();
      showToast('Дом ' + S.house + ' очищен! +' + cr + ' 💎');
      shake = 0.5;
      scheduleNextRoom();
    } else if (!g.small) {
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

  function cancelFuse(g) { if (g.zone) { zones = zones.filter((z) => z !== g.zone); g.zone = null; g.fuse = 0; } }

  // Поведение обычных призраков. true — движение уже сделано
  function behave(g, dt) {
    const dx = cat.x - g.x, dy = cat.y - 10 - g.y, d = Math.hypot(dx, dy) || 1;
    g.bt -= dt;
    switch (g.beh) {
      case 'kite': { // держит дистанцию и кружит вокруг кота
        const want = 190, sp = g.vy * 1.2;
        const k = d < want - 30 ? -1 : d > want + 40 ? 1 : 0;
        const side = Math.sin(g.phase * 0.25) > 0 ? 1 : -1;
        g.x += ((dx / d) * k * sp + (-dy / d) * side * sp * 0.6) * dt;
        g.y += ((dy / d) * k * sp + (dx / d) * side * sp * 0.6) * dt;
        return true;
      }
      case 'charge': { // замирает, показывает линию и бросается
        if (g.windup) {
          g.windup.t -= dt;
          if (g.windup.t <= 0) { const a = g.windup.line.a; g.windup = null; g.dash = { vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, t: 0.5, hit: false, dmg: 16 }; g.bt = 3.5 + Math.random() * 2; }
          return true;
        }
        if (g.bt <= 0 && d < 300 && !g.dash) { g.windup = { t: 0.75, line: { a: Math.atan2(dy, dx), len: 210 } }; return true; }
        return false;
      }
      case 'blink': { // исчезает и появляется рядом с котом
        if (g.blink) {
          g.blink -= dt; g.alpha = Math.max(0, g.blink / 0.4);
          if (g.blink <= 0) {
            g.blink = 0; burst(g.x, g.y, 8, GHOSTS[g.type].body);
            const a = Math.random() * Math.PI * 2, r = 130 + Math.random() * 60;
            g.x = Math.max(FIELD.x1, Math.min(FIELD.x2, cat.x + Math.cos(a) * r)); g.y = Math.max(FIELD.y1, Math.min(FIELD.y2, cat.y + Math.sin(a) * r));
            g.alpha = 0; g.trail = []; g.bt = 3.5 + Math.random() * 2;
          }
          return true;
        }
        if (g.bt <= 0 && !lowHp(g)) { g.blink = 0.4; return true; }
        return false;
      }
      case 'heal': { // лечит соседей
        if (g.bt <= 0) {
          g.bt = 4 + Math.random() * 1.5;
          let healed = 0;
          for (const o of ghosts) if (o !== g && !o.boss && !o.raid && o.hp > 0 && !o.capturing && !o.dying && Math.hypot(o.x - g.x, o.y - g.y) < 140 && o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.3); healed++; floaters.push({ x: o.x, y: o.y - o.r, text: '+', life: 0.8, color: '#5fd38a', size: 18 }); }
          if (healed) { rings.push({ x: g.x, y: g.y, r: 10, max: 140, life: 0.45, color: '#5fd38a' }); SFX.play('crystal'); }
        }
        if (d < 150) { g.x -= (dx / d) * g.vy * 0.5 * dt; g.y -= (dy / d) * g.vy * 0.5 * dt; g.x += Math.sin(g.phase * 0.7) * 12 * dt; return true; }
        return false;
      }
      case 'bomber': { // подлетает и взрывается
        if (g.fuse) {
          g.fuse -= dt;
          if (g.fuse <= 0) { g.zone = null; g.fuse = 0; g.hp = 0; g.dying = 0.2; burst(g.x, g.y, 18, '#ff9a3a'); if (!g.small) S.cleared++; }
          return true;
        }
        if (d < 75 && !lowHp(g)) { g.fuse = 0.9; g.zone = { x: g.x, y: g.y, r: 64, tele: 0.9, life: 0.35, kind: 'blast', dmg: 22, color: '#ff8a3a', max: 0.9 }; zones.push(g.zone); SFX.play('spawn'); return true; }
        if (d > g.r + 14) { g.x += (dx / d) * g.vy * 1.5 * dt; g.y += (dy / d) * g.vy * 1.5 * dt; }
        return true;
      }
    }
    return false;
  }

  function tryCapture(g) {
    if (S.jars <= 0) { offerJars(); return; }
    const rar = GHOSTS[g.type].rarity;
    const chance = g.boss ? captureChance() * 0.45 : captureChance() * (1 - rar * 0.12);
    g.capturing = 0.6; cancelFuse(g);
    SFX.play('suck');
    g.captureOk = (S.tut === 0 && !g.boss) || Math.random() < chance;
    g.captureStart = { x: g.x, y: g.y };
  }

  function finishCapture(g) {
    g.capturing = 0;
    if (g.captureOk) {
      SFX.play('caught');
      capture(g.type, cat.x, cat.y - 20, false);
      S.ecto += ghostReward(GHOSTS[g.type].rarity);
      if (g.boss) {
        const cr = bossGems();
        S.crystals += cr; shake = 0.5; bossDown();
        showToast('Босс пойман! +' + cr + ' 💎');
        burst(cat.x, cat.y, 30, '#ffc94d');
        scheduleNextRoom();
      } else if (!g.small) {
        S.cleared++;
      }
      g.hp = 0; g.dying = 0.01;
    } else {
      floaters.push({ x: g.x, y: g.y - g.r - 10, text: 'Вырвался!', life: 1, color: '#ff8a8a', size: 15 });
      SFX.play('escape');
      if (g.boss) g.hp = Math.max(g.hp, g.maxHp * 0.4);
      else killGhost(g);
    }
  }

  // =====================================================================
  // Атаки боссов: у каждого района своя, с предупреждением на полу
  // =====================================================================
  const BOSS_SKILLS = { washer: 'spin', headless: 'dash', ship: 'cannon', carousel: 'spiral', ninelives: 'summon', frostqueen: 'frost', franken: 'lightning', moonking: 'stars' };
  const SKILL_NAMES = { spin: 'Отжим!', dash: 'Рывок!', cannon: 'Залп!', spiral: 'Карусель!', summon: 'Девять жизней!', frost: 'Метель!', lightning: 'Молния!', stars: 'Звездопад!' };
  const near = (r) => ({ x: Math.max(FIELD.x1, Math.min(FIELD.x2, cat.x + (Math.random() - 0.5) * 2 * r)), y: Math.max(FIELD.y1, Math.min(FIELD.y2, cat.y + (Math.random() - 0.5) * 2 * r)) });
  function addZone(z) { zones.push(Object.assign({ r: 40, tele: 1, life: 0.35, kind: 'blast', dmg: 25, color: '#ff6b8a' }, z, { max: z.tele || 1 })); }
  function radial(g, n, speed, dmg, off) { for (let i = 0; i < n; i++) { const a = (off || 0) + (i / n) * Math.PI * 2; shots.push({ x: g.x, y: g.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg, life: 5 }); } SFX.play('enemyShot'); }
  function bossSkill(g, dt) {
    const sk = BOSS_SKILLS[g.type]; if (!sk) return;
    if (g.skillCd === undefined) g.skillCd = 3;
    if (g.spiral) {
      g.spiral.t -= dt; g.spiral.cd -= dt;
      if (g.spiral.cd <= 0) { g.spiral.cd = 0.12; g.spiral.a += 0.42; radial(g, 3, 105, 12, g.spiral.a); }
      if (g.spiral.t <= 0) g.spiral = null;
    }
    if (g.windup) { g.windup.t -= dt; if (g.windup.t <= 0) { const f = g.windup.fire; g.windup = null; f(); } return; }
    if (g.dash || g.spiral) return;
    g.skillCd -= dt; if (g.skillCd > 0) return;
    g.skillCd = 4.5 + Math.random() * 1.5;
    floaters.push({ x: g.x, y: g.y - g.r - 26, text: SKILL_NAMES[sk], life: 1.3, color: '#ffd84d', size: 17 });
    SFX.play('spawn');
    if (sk === 'spin') g.windup = { t: 0.7, fire: () => { radial(g, 14, 120, 14, Math.random()); radial(g, 14, 80, 14, Math.random()); } };
    else if (sk === 'dash') {
      const a = Math.atan2(cat.y - 10 - g.y, cat.x - g.x), len = Math.min(520, Math.hypot(cat.x - g.x, cat.y - g.y) + 120);
      g.windup = { t: 0.9, line: { a, len }, fire: () => { g.dash = { vx: Math.cos(a) * len / 0.45, vy: Math.sin(a) * len / 0.45, t: 0.45, hit: false }; } };
    } else if (sk === 'cannon') { for (let i = 0; i < 3; i++) addZone(Object.assign(i ? near(80) : { x: cat.x, y: cat.y }, { r: 50, tele: 1.1 + i * 0.25, dmg: 28, color: '#ff8a3d' })); }
    else if (sk === 'spiral') g.windup = { t: 0.4, fire: () => { g.spiral = { t: 1.8, cd: 0, a: Math.random() * 6 }; } };
    else if (sk === 'summon') g.windup = { t: 0.6, fire: () => {
      const minions = ghosts.filter((m) => m.minion && m.hp > 0).length;
      for (let i = 0; i < Math.min(3, 6 - minions); i++) { spawnGhost(district().ghosts[0]); const m = ghosts[ghosts.length - 1]; m.minion = true; m.elite = false; m.x = g.x + (Math.random() - 0.5) * 120; m.y = g.y + (Math.random() - 0.5) * 120; m.hp = m.maxHp = ghostHp(0) * 3; }
      burst(g.x, g.y, 24, '#bda8ff');
    } };
    else if (sk === 'frost') { for (let i = 0; i < 4; i++) addZone(Object.assign(i ? near(110) : { x: cat.x, y: cat.y }, { kind: 'ice', r: 46, tele: 0.9, life: 5, dmg: 8, color: '#7fd1ff' })); }
    else if (sk === 'lightning') {
      const a = Math.atan2(cat.y - g.y, cat.x - g.x), d0 = Math.hypot(cat.x - g.x, cat.y - g.y);
      for (let i = 0; i < 5; i++) { const dd = d0 - 120 + i * 70; addZone({ x: g.x + Math.cos(a) * dd, y: g.y + Math.sin(a) * dd, r: 36, tele: 0.7 + i * 0.12, dmg: 26, color: '#ffe14d' }); }
    } else if (sk === 'stars') { for (let i = 0; i < 6; i++) addZone(Object.assign(i ? near(150) : { x: cat.x, y: cat.y }, { r: 38, tele: 1.0 + i * 0.15, dmg: 22, color: '#d68cff' })); radial(g, 8, 90, 12); }
  }
  function updateZones(dt) {
    cat.slow = 1;
    for (const z of zones) {
      const inside = Math.hypot(cat.x - z.x, cat.y - z.y) < z.r + 8;
      if (z.tele > 0) {
        z.tele -= dt;
        if (z.tele <= 0) {
          if (z.kind === 'blast') { if (inside) hurtCat(z.dmg); burst(z.x, z.y, 16, z.color); shake = Math.max(shake, 0.15); SFX.play('pop'); }
          else if (z.kind === 'ice' && inside) hurtCat(z.dmg);
        }
      } else {
        z.life -= dt;
        if (z.kind === 'ice' && inside) cat.slow = 0.5;
        if (z.kind === 'acid' && inside) { cat.hp -= 12 * dt; cat.safeFor = 1; if (cat.hp <= 0) hurtCat(1); }
      }
    }
    zones = zones.filter((z) => z.tele > 0 || z.life > 0);
    // особенности районов
    if (raid) return;
    const d = districtIndex();
    featureCd -= dt;
    if (featureCd <= 0) {
      if (d === 6) { addZone(Object.assign(near(90), { kind: 'acid', r: 42, tele: 0.8, life: 6, dmg: 0, color: '#7dff5a' })); featureCd = 6 + Math.random() * 3; }
      else if (d === 7) { for (let i = 0; i < 2; i++) addZone(Object.assign(near(120), { r: 34, tele: 1.3, dmg: 16, color: '#ffd84d' })); featureCd = 5 + Math.random() * 3; }
      else featureCd = 5;
    }
  }
  function drawZones() {
    for (const g of ghosts) if (g.windup && g.windup.line) { // линия рывка
      const L = g.windup.line;
      ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(L.a);
      ctx.fillStyle = `rgba(255,80,110,${0.18 + 0.12 * Math.sin(time * 20)})`; ctx.fillRect(0, -g.r * 0.8, L.len, g.r * 1.6);
      ctx.strokeStyle = 'rgba(255,80,110,0.8)'; ctx.setLineDash([10, 8]); ctx.lineWidth = 3; ctx.strokeRect(0, -g.r * 0.8, L.len, g.r * 1.6); ctx.setLineDash([]);
      ctx.restore();
    }
    for (const z of zones) {
      if (z.tele > 0) {
        const k = 1 - z.tele / z.max;
        ctx.fillStyle = alpha(z.color, 0.16); ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.fill();
        ctx.fillStyle = alpha(z.color, 0.35); ctx.beginPath(); ctx.arc(z.x, z.y, z.r * k, 0, 7); ctx.fill();
        ctx.strokeStyle = z.color; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(z.x, z.y, z.r, time * 2, time * 2 + 7); ctx.stroke(); ctx.setLineDash([]);
        if (z.kind === 'blast') text('!', z.x, z.y, 18, z.color);
      } else if (z.kind === 'blast') {
        const k = 1 - z.life / 0.35;
        ctx.globalAlpha = Math.max(0, 1 - k); ctx.strokeStyle = z.color; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (0.6 + k * 0.7), 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
      } else {
        const a = Math.min(1, z.life);
        ctx.globalAlpha = a;
        const gg = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r); gg.addColorStop(0, alpha(z.color, z.kind === 'ice' ? 0.7 : 0.6)); gg.addColorStop(1, alpha(z.color, 0.15));
        ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.8, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = shade(z.color, -0.3); ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        if (z.kind === 'ice') { for (let i = 0; i < 4; i++) { const an = i * 1.7 + z.x; ctx.fillRect(z.x + Math.cos(an) * z.r * 0.5 - 1, z.y + Math.sin(an) * z.r * 0.4 - 4, 2, 8); ctx.fillRect(z.x + Math.cos(an) * z.r * 0.5 - 4, z.y + Math.sin(an) * z.r * 0.4 - 1, 8, 2); } }
        else { for (let i = 0; i < 3; i++) { const ph = (time * 0.8 + i / 3) % 1; ctx.beginPath(); ctx.arc(z.x + Math.cos(i * 2.1 + z.y) * z.r * 0.4, z.y + Math.sin(i * 2.1) * z.r * 0.3 - ph * 6, 2 + ph * 4, 0, 7); ctx.fill(); } }
        ctx.globalAlpha = 1;
      }
    }
  }

  const bossGems = () => Math.round(10 * (1 + circle()) * (1 + 0.2 * talent('luck')));
  function bossDown() { S.stats.bosses++; addPassXp(15); vibrate([40, 40, 80]); }
  const opt = (k) => S.settings[k] !== false;
  function vibrate(p) { if (opt('vibro') && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* не везде доступно */ } }

  function scheduleNextRoom() {
    const tok = roomToken;
    setTimeout(() => { if (tok === roomToken) nextRoom(); }, 900);
  }

  function nextRoom() {
    const prevDistrict = districtIndex();
    if (S.room === ROOMS_PER_HOUSE) { S.house++; S.room = 1; S.maxHouse = Math.max(S.maxHouse || 1, S.house); }
    else S.room++;
    S.maxStage = Math.max(S.maxStage || 0, stageIndex());
    checkUnlocks();
    S.jars += 2;
    S.stats.rooms++;
    resetRoom();
    SFX.play('clear');
    if (districtIndex() !== prevDistrict) showToast('Новый район: ' + district().name + (district().feature ? ' · ' + district().feature : '') + '!');
    save();
  }

  // Новые открытия по рекорду домов
  function checkUnlocks() {
    const fresh = UNLOCKS.filter((u) => S.maxStage >= u.stage && !S.seenUnlocks.includes(u.id));
    if (!fresh.length) return;
    fresh.forEach((u) => { S.seenUnlocks.push(u.id); S.fresh.push(u.id); });
    syncSlots();
    const u = fresh[fresh.length - 1];
    SFX.play('reward'); burst(cat.x, cat.y - 20, 50, '#ffd84d');
    const more = fresh.slice(0, -1).map((f) => '+ ' + f.name);
    ask('Открыто!', [u.icon + ' ' + u.name, u.text].concat(more.slice(0, 2)), [
      { label: 'Ура!', color: '#8ee08a', on: closeModal },
    ].concat(unlocked('quests') ? [{ label: 'Путь открытий', color: '#ffc94d', on: () => { closeModal(); openPanel('quests'); questTab = 'road'; roadPage = Math.floor(UNLOCKS.indexOf(u) / ROAD_PER_PAGE); } }] : []));
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
    SFX.play('shoot');
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
  const squadMergeable = () => canMerge(S.inventory, (i) => i.type + ':' + i.stars, (i) => i.stars >= maxStars());
  const attachMergeable = () => canMerge(S.attach, (a) => a.kind + ':' + a.rank, (a) => a.rank >= maxRank());

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
    const n = mergeList('inventory', (i) => i.type + ':' + i.stars, (i) => i.stars >= maxStars(), (a) => a.stars++, () => { S.jars += 2; });
    const ids = new Set(S.inventory.map((i) => i.id));
    S.squad = S.squad.map((id) => (ids.has(id) ? id : null));
    bestSquad();
    if (n) SFX.play('merge');
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
    const wts = unlocked('ranks') ? RANK_WEIGHTS_HIGH : RANK_WEIGHTS;
    for (let i = 0; i < wts.length; i++) { if (r < wts[i]) return i; r -= wts[i]; }
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
    SFX.play('summon');
    autoEquipAttach();
    showToast((count > 1 ? 'Лучшая: ' : 'Получено: ') + ATTACH[best.kind].name + ' [' + RANKS[best.rank] + ']');
  }

  function autoEquipAttach() {
    const sorted = [...S.attach].sort((a, b) => b.rank - a.rank);
    S.equipped = S.equipped.map((_, i) => (sorted[i] ? sorted[i].id : null));
  }

  function mergeAttach(silent) {
    const n = mergeList('attach', (a) => a.kind + ':' + a.rank, (a) => a.rank >= maxRank(), (a) => a.rank++);
    autoEquipAttach();
    selectedAttach = null;
    if (n) SFX.play('merge');
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
        for (const u of UPGRADES) { if (u.lock && !unlocked(u.lock)) continue; const c = upgradeCost(S[u.key], u.base); if (c < bc) { bc = c; best = u; } }
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
    const lines = ['Дома, эктоплазма и прокачка сбросятся.', 'Получишь: +' + gain + ' лунных камней' + (S.boostPrest > 0 ? ' (x2 ускоритель)' : '')];
    if (talent('memory')) lines.push('Лунная память: старт с дома ' + prestigeStart().house);
    ask('Освятить город?', lines, [
      { label: 'Освятить', color: '#ffc94d', on: () => { closeModal(); doPrestige(1); } },
      { label: '🎬 +50% камней', color: '#8ee08a', on: () => { closeModal(); showAd('+50% лунных камней', () => doPrestige(1.5)); } },
      { label: 'Отмена', color: '#ff9aa9', on: closeModal },
    ]);
  }
  // Лунная память: сохраняет часть уровней и стартует с дальнего дома, где босс падает за ~12 с
  function prestigeStart() {
    const keep = 0.1 * talent('memory');
    const lv = { lvPower: Math.max(1, Math.floor(S.lvPower * keep)), lvPull: Math.max(1, Math.floor(S.lvPull * keep)), lvCollect: Math.max(1, Math.floor(S.lvCollect * keep)) };
    const cap = Math.floor(S.maxHouse * 0.12 * talent('memory'));
    const save_ = { p: S.lvPower, r: S.lvPull }; S.lvPower = lv.lvPower; S.lvPull = lv.lvPull;
    const dps = catDamage() / moonMult() * fireRate() * 1.6;
    S.lvPower = save_.p; S.lvPull = save_.r;
    let house = 1;
    for (let h = 2; h <= cap; h++) if (hpAt(h * ROOMS_PER_HOUSE - 1, 3) / dps <= 12) house = h;
    return { house, lv };
  }
  function doPrestige(mult) {
    const gain = Math.ceil(stonesFor(S.house) * mult);
    if (gain <= 0) return;
    const st = prestigeStart();
    S.stones += gain; S.prestiges++;
    if (S.boostPrest > 0) S.boostPrest--;
    S.house = st.house; S.room = 1; S.ecto = 0;
    Object.assign(S, st.lv);
    resetRoom();
    panel = null;
    burst(cat.x, cat.y - 20, 60, '#fff1a8');
    SFX.play('moon');
    showToast('Освящение! +' + gain + ' лунных камней');
    save();
  }
  function buyTalent(k) {
    const t = ALTAR[k], l = talent(k);
    if (l >= t.max) return;
    const c = t.cost(l);
    if (stonesFree() < c) { showToast('Нужно ' + c + ' 🌙'); SFX.play('deny'); return; }
    S.stonesSpent += c; S.altar[k] = l + 1;
    SFX.play('upgrade'); showToast(t.name + ' · уровень ' + (l + 1));
  }
  const altarAffordable = () => Object.keys(ALTAR).some((k) => talent(k) < ALTAR[k].max && stonesFree() >= ALTAR[k].cost(talent(k)));
  function buyBoost() { purchase('Лунный ускоритель: x2 камней на 3 освящения', '$2.99', () => { S.boostPrest += 3; }); }

  // =====================================================================
  // Ежедневные задания, серия входов, пропуск
  // =====================================================================
  const dayNum = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
  const streakMult = () => 1 + 0.1 * Math.min(10, Math.max(0, S.streak.count - 1));
  function newMissions() {
    const kinds = Object.keys(DAILY_MISSIONS).filter((k) => !DAILY_MISSIONS[k].need || unlocked(DAILY_MISSIONS[k].need));
    const list = [];
    while (list.length < 5 && kinds.length) { const k = kinds.splice(Math.floor(Math.random() * kinds.length), 1)[0]; list.push({ kind: k, base: S.stats[k] || 0, goal: DAILY_MISSIONS[k].goal, claimed: false }); }
    S.dm = { day: today(), list, chest: false };
  }
  const missionProg = (m) => Math.min(m.goal, (S.stats[m.kind] || 0) - m.base);
  const missionReady = (m) => !m.claimed && missionProg(m) >= m.goal;
  const chestReady = () => !S.dm.chest && S.dm.list.length && S.dm.list.every((m) => m.claimed);
  function claimMission(i) {
    const m = S.dm.list[i];
    if (!missionReady(m)) return;
    m.claimed = true;
    const g = Math.round(MISSION_GEMS * streakMult());
    S.crystals += g; addPassXp(MISSION_XP);
    SFX.play('reward'); showToast('+' + g + ' 💎 · +' + MISSION_XP + ' опыта пропуска');
  }
  function claimChest(double) {
    if (!chestReady()) return;
    S.dm.chest = true;
    const k = streakMult() * (double ? 2 : 1), g = Math.round(50 * k), j = Math.round(5 * k);
    S.crystals += g; S.jars += j; giveAttach(S.streak.count >= 7 ? 3 : 2); addPassXp(CHEST_XP);
    SFX.play('reward'); burst(cat.x, cat.y - 20, 40, '#ffd84d');
    showToast('Сундук дня: +' + g + ' 💎, +' + j + ' 🫙 и насадка');
  }
  // Пропуск
  const passSeason = () => Math.floor(dayNum() / PASS_DAYS);
  const passDaysLeft = () => PASS_DAYS - (dayNum() % PASS_DAYS);
  const passLevel = () => Math.min(PASS_LEVELS, Math.floor(S.pass.xp / PASS_XP));
  function addPassXp(n) { S.pass.xp += Math.round(n * (vipActive() ? 1.5 : 1)); }
  const passCanFree = (l) => l <= passLevel() && !S.pass.free.includes(l);
  const passCanPrem = (l) => S.pass.premium && l <= passLevel() && !S.pass.prem.includes(l);
  const passClaimable = () => { for (let l = 1; l <= passLevel(); l++) if (passCanFree(l) || passCanPrem(l)) return true; return false; };
  function claimPass(l, prem) {
    if (prem ? !passCanPrem(l) : !passCanFree(l)) return;
    (prem ? S.pass.prem : S.pass.free).push(l);
    const r = (prem ? PASS_PREM : PASS_FREE)[l - 1];
    r.apply(); SFX.play('reward'); showToast('Пропуск: ' + r.label);
  }
  function buyPass() { purchase('Призрачный пропуск (сезон)', PASS_PRICE, () => { S.pass.premium = true; }); }
  function skipPassLevel() {
    if (passLevel() >= PASS_LEVELS) return;
    if (S.crystals < PASS_SKIP) { showToast('Нужно ' + PASS_SKIP + ' 💎'); return; }
    S.crystals -= PASS_SKIP; S.pass.xp = (passLevel() + 1) * PASS_XP; showToast('Уровень пропуска ' + passLevel());
  }

  // =====================================================================
  // Покупки / буст
  // =====================================================================
  function buyUpgrade(u) {
    if (u.lock && !unlocked(u.lock)) { lockedToast(u.lock); return; }
    if (u.lock) S.fresh = S.fresh.filter((f) => f !== u.lock);
    const cost = upgradeCost(S[u.key], u.base);
    if (S.ecto < cost) { showToast('Не хватает эктоплазмы'); SFX.play('deny'); return; }
    S.ecto -= cost; S[u.key]++; S.stats.upgrades++;
    SFX.play('upgrade');
  }

  function activateMoon() {
    const now = Date.now();
    if (moonActive()) return;
    if (now < S.moonReadyAt) { showToast('Полнолуние через ' + Math.ceil((S.moonReadyAt - now) / 1000) + ' с'); return; }
    showAd('Полнолуние x2 на 60 с', () => {
      S.moonUntil = Date.now() + 60000; S.moonReadyAt = Date.now() + 180000; SFX.play('moon');
      showToast('Полнолуние! x2 урон и доход на 60 с');
    });
  }

  function lockedToast(id) { const u = UNLOCK[id]; showToast(u.name + ': ' + unlockWhere(u).toLowerCase()); SFX.play('deny'); }
  // Открыть вкладку и снять с неё метку NEW
  function openPanel(id) { panel = id; S.fresh = S.fresh.filter((f) => f !== id); }
  function showToast(text) { toast = { text, life: 2.2 }; }

  // =====================================================================
  // Реклама (заглушка) и покупки (тестовый режим)
  // =====================================================================
  function ask(title, lines, buttons) { modal = { title, lines, buttons }; }
  function closeModal() { modal = null; }

  // Rewarded-реклама: в релизе здесь вызов SDK (AdMob / AppLovin / Unity Ads).
  function showAd(label, cb) {
    S.stats.ads++;
    if (S.noAds || vipActive()) { cb(); showToast('Награда без рекламы ✓'); return; }
    modal = { ad: { t: 2.5, total: 2.5, cb }, title: 'Реклама', lines: [label] };
  }

  // Покупка: в релизе здесь Google Play Billing / App Store IAP.
  function purchase(name, price, apply) {
    ask('Покупка', [name, 'Цена: ' + price, 'Тестовый режим: деньги не списываются'], [
      { label: 'Купить', color: '#8ee08a', on: () => { closeModal(); apply(); S.purchases++; SFX.play('reward'); showToast('Куплено: ' + name); save(); } },
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
    if (S.streak.last !== d) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      S.streak.count = S.streak.last === y.toDateString() ? S.streak.count + 1 : 1; S.streak.last = d; S.stats.bestStreak = Math.max(S.stats.bestStreak || 0, S.streak.count);
    }
    if (S.dm.day !== d) newMissions();
    if (S.pass.season !== passSeason()) S.pass = { season: passSeason(), xp: 0, premium: false, free: [], prem: [] };
    if (S.raid.day !== d) { S.raid.day = d; S.raid.tickets = 3; S.raid.adUsed = false; }
    if (S.wheel.day !== d) { S.wheel.day = d; S.wheel.free = 1; S.wheel.ads = 3; }
  }
  dailyReset();
  const dailyReady = () => S.daily.last !== today();
  function claimDaily(double) {
    if (!dailyReady()) return;
    const r = DAILY[S.daily.count % DAILY.length];
    r.apply(); if (double) r.apply(); SFX.play('reward');
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
      S.stats.spins++; addPassXp(10);
    };
    if (viaAd) { S.wheel.ads--; showAd('Вращение колеса', go); }
    else { S.wheel.free--; go(); }
  }

  // Рейд: 30 секунд бьёшь особняк, каждый «этаж» — награда
  function startRaid() {
    if (S.raid.tickets <= 0) { showToast('Билеты закончились'); return; }
    S.raid.tickets--; S.stats.raids++;
    panel = null;
    ghosts = []; shots = []; cat.hp = CAT_MAX_HP; roomToken++;
    raid = { t: RAID_TIME, floor: 0 };
    const hp = ghostHp(3) * 1.5;
    ghosts.push({ type: 'mansion', boss: false, raid: true, hp, maxHp: hp, ...spawnPoint(220), vx: 20, vy: 14, r: 46, phase: 0, hit: 0, alpha: 0, dying: 0, capturing: 0, shootCd: 2 });
    showToast('Рейд! Пробей как можно больше этажей');
  }
  function endRaid() {
    const f = raid.floor;
    S.stats.raidBest = Math.max(S.stats.raidBest || 0, f);
    raid = null; ghosts = []; shots = [];
    resetRoom();
    const cr = 10 + 15 * f, jars = f, att = Math.floor(f / 3);
    addPassXp(40 + 5 * f);
    const apply = (m) => { S.crystals += cr * m; S.jars += jars * m; for (let i = 0; i < att * m; i++) giveAttach(rollRank()); };
    ask('Рейд завершён', ['Этажей пробито: ' + f, 'Награда: ' + cr + ' 💎, ' + jars + ' 🫙' + (att ? ', насадок: ' + att : '')], [
      { label: 'Забрать', color: '#8ee08a', on: () => { closeModal(); apply(1); } },
      { label: '🎬 x2', color: '#ffc94d', on: () => { closeModal(); showAd('Удвоение награды рейда', () => apply(2)); } },
    ]);
  }

  // Магазин
  function buyStarter() {
    purchase('Стартовый набор', '$1.99', () => {
      S.starter = true; syncSlots();
      S.crystals += 300; giveAttach(3); giveGhost(DISTRICTS[0].ghosts[2], 2);
    });
  }
  function buyVip() { purchase('VIP на 7 дней', '$6.99', () => { S.vipUntil = Math.max(Date.now(), S.vipUntil) + 7 * 864e5; syncSlots(); }); }
  function buyNoAds() { purchase('Без рекламы', '$4.99', () => { S.noAds = true; }); }
  function buyWeekly() { purchase('Набор недели', '$14.99', () => { S.weekly = true; S.crystals += 500; S.jars += 20; giveAttach(4); }); }
  function buySkin(k) {
    const sk = SKINS[k];
    if (S.skins.includes(k)) { S.skin = k; showToast('Надет скин: ' + sk.name); return; }
    if (sk.req && (S.maxHouse || 1) < sk.req) { showToast('Откроется на доме ' + sk.req); SFX.play('deny'); return; }
    if (sk.pass) { showToast('Награда 30-го уровня Призрачного пропуска'); panel = 'quests'; questTab = 'pass'; passPage = 5; return; }
    if (sk.crystals) {
      if (S.crystals < sk.crystals) { showToast('Нужно ' + sk.crystals + ' 💎'); return; }
      S.crystals -= sk.crystals; S.skins.push(k); S.skin = k; showToast('Новый скин: ' + sk.name); SFX.play('reward');
    } else purchase('Скин «' + sk.name + '»', sk.usd, () => { S.skins.push(k); S.skin = k; });
  }
  function syncSlots() {
    const a = S.equipped.length, q = S.squad.length;
    while (S.equipped.length < attachSlots()) S.equipped.push(null);
    while (S.equipped.length > attachSlots()) S.equipped.pop();
    while (S.squad.length < squadSlots()) S.squad.push(null);
    while (S.squad.length > squadSlots()) S.squad.pop();
    if (q !== S.squad.length && S.inventory.length) bestSquad();
    if (a !== S.equipped.length) autoEquipAttach();
  }
  syncSlots();

  // Офлайн-доход
  let offlineGain = 0;
  (function offline() {
    const secs = Math.min((Date.now() - (S.lastSeen || Date.now())) / 1000, offlineHours() * 3600);
    if (secs > 60 && S.lvPower + S.lvCollect > 2) {
      offlineGain = ghostReward(0) * 0.35 * secs / moonMult();
      panel = 'offline';
    }
  })();

  // =====================================================================
  // Ввод
  // =====================================================================
  const buttons = []; // пересобирается каждый кадр
  // Прокручиваемые списки: области пересобираются каждый кадр, смещение хранится между кадрами
  const scrollAreas = [], scrollY = {};
  let drag = null; // {area, sy, start, btn, moved}
  function scrollArea(id, x, y, w, h, contentH) {
    const max = Math.max(0, contentH - h);
    scrollY[id] = Math.max(0, Math.min(max, scrollY[id] || 0));
    const a = { id, x, y, w, h, max, off: scrollY[id] };
    scrollAreas.push(a);
    return a;
  }
  // Кнопка внутри списка: срабатывает по отпусканию, если палец не тянул список
  function sbtn(a, x, y, w, h, on) {
    const y1 = Math.max(y, a.y), y2 = Math.min(y + h, a.y + a.h);
    if (y2 > y1) buttons.push({ x, y: y1, w, h: y2 - y1, on, scroll: a.id });
  }
  function scrollBar(a) {
    if (a.max <= 0) return;
    const th = Math.max(30, (a.h * a.h) / (a.h + a.max)), ty = a.y + ((a.h - th) * a.off) / a.max;
    rr(a.x + a.w - 5, a.y, 5, a.h, 2.5); ctx.fillStyle = 'rgba(107,95,134,0.18)'; ctx.fill();
    rr(a.x + a.w - 5, ty, 5, th, 2.5); ctx.fillStyle = '#8a7bd1'; ctx.fill();
    // мягкое затухание у краёв, если там ещё есть содержимое
    const fade = (y0, y1, up) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, up ? 'rgba(250,244,234,0.95)' : 'rgba(240,229,213,0)'); g.addColorStop(1, up ? 'rgba(250,244,234,0)' : 'rgba(240,229,213,0.95)'); ctx.fillStyle = g; ctx.fillRect(a.x, y0, a.w - 7, y1 - y0); };
    if (a.off > 1) fade(a.y, a.y + 14, true);
    if (a.off < a.max - 1) fade(a.y + a.h - 14, a.y + a.h, false);
  }
  function btn(x, y, w, h, on) { buttons.push({ x, y, w, h, on }); }

  function toGame(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const { x, y } = toGame(e);
    SFX.init();
    if (splash) { if (!splash.out && splash.t > 0.4) { splash.out = 0.6; SFX.play('reward'); } return; }
    press = { x, y, t: time };
    if (!modal) {
      const a = scrollAreas.find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
      if (a) {
        const b = buttons.slice().reverse().find((q) => q.scroll === a.id && x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
        drag = { area: a.id, sy: y, start: scrollY[a.id] || 0, btn: b, moved: false, id: e.pointerId };
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* старые браузеры */ }
        return;
      }
    }
    for (let i = buttons.length - 1; i >= 0; i--) {
      const b = buttons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { if (b.w < W - 1) SFX.play('click'); b.on(); return; }
    }
    if (panel || y < VIEW.y || y > VIEW.y + VIEW.h) return;
    // в боевой зоне: либо тап (поимка/удар), либо свайп-джойстик
    joy = { sx: x, sy: y, x, y, id: e.pointerId, drag: false };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* старые браузеры */ }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (drag && e.pointerId === drag.id) {
      const { y } = toGame(e);
      if (Math.abs(y - drag.sy) > 6) drag.moved = true;
      if (drag.moved) { scrollY[drag.area] = drag.start - (y - drag.sy); press = null; }
      return;
    }
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
  window.addEventListener('pointerup', (e) => {
    press = null;
    if (drag && e.pointerId === drag.id) { const d = drag; drag = null; if (!d.moved && d.btn) { SFX.play('click'); d.btn.on(); } }
  });
  window.addEventListener('pointercancel', () => { press = null; drag = null; });
  // колесо мыши на компьютере
  canvas.addEventListener('wheel', (e) => {
    const { x, y } = toGame(e);
    const a = scrollAreas.find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
    if (a) { e.preventDefault(); scrollY[a.id] = (scrollY[a.id] || 0) + e.deltaY * 0.6; }
  }, { passive: false });
  canvas.addEventListener('pointerup', endJoy);
  canvas.addEventListener('pointercancel', endJoy);

  function tapField(sx, sy) {
    const { x, y } = toWorld(sx, sy);
    if (gold && Math.hypot(gold.x - x, gold.y + Math.sin(gold.t * 3) * 14 - y) < 34) {
      const reward = ghostReward(0) * 40;
      SFX.play('gold');
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
      for (const z of zones) {
        if (z.kind === 'blast' && z.tele <= 0) continue;
        const d = Math.hypot(cat.x - z.x, cat.y - z.y) || 1;
        if (d < z.r + 34) { ax += ((cat.x - z.x) / d) * 2.5; ay += ((cat.y - z.y) / d) * 2.5; }
      }
      for (const g of ghosts) if (g.windup && g.windup.line) { // уйти с линии рывка вбок
        const L = g.windup.line, px = cat.x - g.x, py = cat.y - g.y, along = px * Math.cos(L.a) + py * Math.sin(L.a), side = -px * Math.sin(L.a) + py * Math.cos(L.a);
        if (along > 0 && along < L.len + 30 && Math.abs(side) < g.r + 40) { const sg = side >= 0 ? 1 : -1; ax += -Math.sin(L.a) * sg * 3; ay += Math.cos(L.a) * sg * 3; }
      }
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
    speed *= cat.slow || 1;
    // на льду кот скользит: скорость меняется плавно
    const tvx = dx * speed, tvy = dy * speed, slip = districtIndex() === 5 && !raid ? Math.min(1, dt * 2.2) : 1;
    cat.vx = (cat.vx || 0) + (tvx - (cat.vx || 0)) * slip; cat.vy = (cat.vy || 0) + (tvy - (cat.vy || 0)) * slip;
    cat.x = Math.max(FIELD.x1, Math.min(FIELD.x2, cat.x + cat.vx * dt));
    cat.y = Math.max(FIELD.y1, Math.min(FIELD.y2, cat.y + cat.vy * dt));
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
    if (amount >= 5) vibrate(25);
    cat.hp -= amount; cat.hurt = 0.25; cat.safeFor = 2;
    SFX.play('hurt');
    if (cat.hp <= 0) {
      SFX.play('fail');
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
    if (splash) { splash.t += dt; if (splash.out) { splash.out -= dt; if (splash.out <= 0) splash = null; } if (splash && !splash.out) return; }
    cat.bob += dt * 4;
    cat.recoil = Math.max(0, cat.recoil - dt * 8);
    shake = Math.max(0, shake - dt);
    dayCheck -= dt; if (dayCheck <= 0) { dayCheck = 5; dailyReset(); syncSlots(); }
    jarOfferCd = Math.max(0, jarOfferCd - dt);
    if (modal && modal.ad) {
      modal.ad.t -= dt;
      if (modal.ad.t <= 0) { const cb = modal.ad.cb; modal = null; S.adsWatched++; cb(); SFX.play('reward'); }
    }
    if (wheelSpin) {
      wheelSpin.t += dt;
      const k = Math.min(1, wheelSpin.t / wheelSpin.dur), e = 1 - Math.pow(1 - k, 3);
      const segN = Math.floor(wheelRot / ((Math.PI * 2) / WHEEL.length));
      wheelRot = wheelSpin.from + (wheelSpin.to - wheelSpin.from) * e;
      if (Math.floor(wheelRot / ((Math.PI * 2) / WHEEL.length)) !== segN) SFX.play('tick');
      if (k >= 1) { SFX.play('reward'); const w = WHEEL[wheelSpin.idx]; wheelWin = { idx: wheelSpin.idx, t: time }; wheelSpin = null; w.apply(); showToast('Выпало: ' + w.label); }
    }
    if (Math.floor(time) % 5 === 0) dailyReset();

    if (!modal && panel !== 'offline') {
      // золотой призрак пролетает раз в 1–2 минуты
      if (!raid) {
        goldCd -= dt;
        if (!gold && goldCd <= 0) SFX.play('goldAppear');
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
        if (!bossSpawned) { spawnCd -= dt; if (spawnCd <= 0) { spawnGhost(district().boss); bossSpawned = true; bossTimer = bossTime(); SFX.play('boss'); } }
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
      tutorialTick(dt);
      moveCat(dt);
      // смелость кота: урон от касаний и снарядов, восстановление
      cat.hurt = Math.max(0, cat.hurt - dt);
      cat.safeFor = Math.max(0, cat.safeFor - dt);
      if (cat.safeFor <= 0) cat.hp = Math.min(CAT_MAX_HP, cat.hp + 12 * dt);
      for (const g of ghosts) {
        if (!targetable(g)) continue;
        if (g.beh !== 'bomber' && Math.hypot(g.x - cat.x, g.y - (cat.y - 10)) < g.r + 18) hurtCat((g.boss ? 25 : 8) * dt);
        // редкие и сильнее стреляют сгустками эктоплазмы
        if (GHOSTS[g.type].rarity >= 1) {
          g.shootCd -= dt;
          if (g.shootCd <= 0) {
            g.shootCd = g.boss || g.raid ? 1.6 : g.beh === 'kite' ? 2 : 3.2;
            const a = Math.atan2(cat.y - 10 - g.y, cat.x - g.x);
            const big = g.boss || g.raid;
            const spread = big ? [-0.3, 0, 0.3] : [0];
            SFX.play('enemyShot');
            for (const sp of spread) shots.push({ x: g.x, y: g.y, vx: Math.cos(a + sp) * 115, vy: Math.sin(a + sp) * 115, dmg: big ? 22 : 14, life: 5 });
          }
        }
        if (g.boss) bossSkill(g, dt);
      }
      updateZones(dt);
      for (const p of shots) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (Math.hypot(p.x - cat.x, p.y - (cat.y - 8)) < 20) { hurtCat(p.dmg); p.life = 0; burst(p.x, p.y, 6, '#b48cff'); }
      }
      shots = shots.filter((p) => p.life > 0 && p.x > 0 && p.x < MAP_W && p.y > 0 && p.y < MAP_H);
      for (const sh of shards) {
        sh.life -= dt;
        if (Math.hypot(sh.x - cat.x, sh.y - cat.y) < 28) { sh.life = 0; S.crystals++; SFX.play('crystal'); floaters.push({ x: sh.x, y: sh.y - 10, text: '+1 💎', life: 1, color: '#9ff3ff', size: 14 }); }
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
      if (g.beh && !modal && behave(g, dt)) { g.x = Math.max(WALL, Math.min(MAP_W - WALL, g.x)); g.y = Math.max(WALL, Math.min(MAP_H - WALL, g.y)); continue; }
      if (g.windup && !modal) continue; // замах: босс замирает
      if (g.dash) {
        if (!modal) {
          g.x += g.dash.vx * dt; g.y += g.dash.vy * dt; g.dash.t -= dt;
          if (Math.random() < 0.6) particles.push({ x: g.x, y: g.y, vx: 0, vy: 0, life: 0.4, color: GHOSTS[g.type].body, r: 6 });
          if (!g.dash.hit && Math.hypot(g.x - cat.x, g.y - cat.y) < g.r + 20) { g.dash.hit = true; hurtCat(g.dash.dmg || 32); }
          if (g.dash.t <= 0) g.dash = null;
        }
        g.x = Math.max(WALL, Math.min(MAP_W - WALL, g.x)); g.y = Math.max(WALL, Math.min(MAP_H - WALL, g.y));
        continue;
      }
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
        if (Math.hypot(tx - d.x, ty - d.y) < 10) { S.ecto += d.value; d.done = true; SFX.play('ecto'); }
      }
    }
    drops = drops.filter((d) => !d.done);
    if (toast) { toast.life -= dt; if (toast.life <= 0) toast = null; }
    if (!behIntro && behQueue.length) behIntro = behQueue.shift();
    if (behIntro && !panel && !modal) { behIntro.life -= dt; if (behIntro.life <= 0) behIntro = null; }
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
  // Нарисованные иконки (эмодзи на разных устройствах выглядят по-разному или не отображаются)
  function drawIcon(kind, x, y, s) {
    const r = s / 2;
    ctx.save(); ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, s / 12);
    if (kind === 'jar') {
      rr(x - r * 0.62, y - r * 0.55, r * 1.24, r * 1.45, r * 0.35);
      const g = ctx.createLinearGradient(x - r, 0, x + r, 0); g.addColorStop(0, '#bfe6ff'); g.addColorStop(0.4, '#eaf7ff'); g.addColorStop(1, '#9fd0f0');
      ctx.fillStyle = g; ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(125,255,158,0.75)'; ctx.beginPath(); ctx.arc(x, y + r * 0.3, r * 0.32, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x - r * 0.42, y - r * 0.3, r * 0.14, r * 0.8);
      rr(x - r * 0.72, y - r * 0.9, r * 1.44, r * 0.42, r * 0.12); ctx.fillStyle = '#b07a4f'; ctx.fill(); ctx.stroke();
    } else if (kind === 'gem') {
      ctx.beginPath(); ctx.moveTo(x - r * 0.85, y - r * 0.3); ctx.lineTo(x - r * 0.45, y - r * 0.75); ctx.lineTo(x + r * 0.45, y - r * 0.75); ctx.lineTo(x + r * 0.85, y - r * 0.3); ctx.lineTo(x, y + r * 0.85); ctx.closePath();
      const g = ctx.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, '#d6fbff'); g.addColorStop(1, '#3fb8e8'); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(43,35,64,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - r * 0.85, y - r * 0.3); ctx.lineTo(x + r * 0.85, y - r * 0.3); ctx.moveTo(x - r * 0.3, y - r * 0.3); ctx.lineTo(x, y + r * 0.85); ctx.lineTo(x + r * 0.3, y - r * 0.3); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r * 0.62); ctx.lineTo(x - r * 0.1, y - r * 0.62); ctx.lineTo(x - r * 0.35, y - r * 0.38); ctx.closePath(); ctx.fill();
    } else if (kind === 'moon') {
      // полумесяц: дуга большого круга минус дуга малого
      const R1 = r * 0.85, R2 = r * 0.72, dx = r * 0.45, dy = -r * 0.28, d = Math.hypot(dx, dy);
      const aa = (R1 * R1 - R2 * R2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, R1 * R1 - aa * aa));
      const mx = (aa * dx) / d, my = (aa * dy) / d;
      const p1 = [mx + (hh * dy) / d, my - (hh * dx) / d], p2 = [mx - (hh * dy) / d, my + (hh * dx) / d];
      const A = (p) => Math.atan2(p[1], p[0]), B = (p) => Math.atan2(p[1] - dy, p[0] - dx);
      ctx.beginPath(); ctx.arc(x, y, R1, A(p1), A(p2), true); ctx.arc(x + dx, y + dy, R2, B(p2), B(p1), false); ctx.closePath();
      const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.2, 1, x, y, r); g.addColorStop(0, '#fff8d0'); g.addColorStop(1, '#ffc94d'); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
    } else if (kind === 'attach') {
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.7);
      rr(-r * 0.9, -r * 0.18, r * 1.3, r * 0.36, r * 0.15); ctx.fillStyle = '#b9afe8'; ctx.fill(); ctx.stroke();
      rr(r * 0.35, -r * 0.55, r * 0.45, r * 1.1, r * 0.15); ctx.fillStyle = '#ff7a9c'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-r * 0.75, -r * 0.1, r * 0.9, r * 0.08);
      ctx.restore();
    } else if (kind === 'ecto') {
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r * 0.8); g.addColorStop(0, '#e6ffe9'); g.addColorStop(0.5, '#7dff9e'); g.addColorStop(1, '#2fbf5e');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, 7); ctx.fill(); ctx.stroke();
    } else if (kind === 'crown') {
      ctx.beginPath(); ctx.moveTo(x - r * 0.85, y + r * 0.5); ctx.lineTo(x - r * 0.9, y - r * 0.5); ctx.lineTo(x - r * 0.45, y - r * 0.05); ctx.lineTo(x, y - r * 0.75); ctx.lineTo(x + r * 0.45, y - r * 0.05); ctx.lineTo(x + r * 0.9, y - r * 0.5); ctx.lineTo(x + r * 0.85, y + r * 0.5); ctx.closePath();
      const g = ctx.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, '#fff1a8'); g.addColorStop(1, '#f0a81f'); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(x, y + r * 0.15, r * 0.16, 0, 7); ctx.fill(); ctx.fillStyle = '#7fd1ff'; ctx.beginPath(); ctx.arc(x - r * 0.48, y + r * 0.22, r * 0.12, 0, 7); ctx.arc(x + r * 0.48, y + r * 0.22, r * 0.12, 0, 7); ctx.fill();
    } else if (kind === 'ticket') {
      ctx.beginPath(); ctx.moveTo(x - r, y - r * 0.55); ctx.lineTo(x + r, y - r * 0.55); ctx.lineTo(x + r, y - r * 0.15); ctx.arc(x + r, y, r * 0.15, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(x + r, y + r * 0.55); ctx.lineTo(x - r, y + r * 0.55); ctx.lineTo(x - r, y + r * 0.15); ctx.arc(x - r, y, r * 0.15, Math.PI / 2, -Math.PI / 2, true); ctx.closePath();
      const g = ctx.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, '#e6b8ff'); g.addColorStop(1, '#a86bff'); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
      ctx.setLineDash([2, 2]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + r * 0.4, y - r * 0.5); ctx.lineTo(x + r * 0.4, y + r * 0.5); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff'; ctx.font = '900 ' + (r * 0.6) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', x - r * 0.25, y + 1);
    } else if (kind === 'clock') {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r * 0.5); ctx.moveTo(x, y); ctx.lineTo(x + r * 0.35, y + r * 0.1); ctx.stroke();
    } else if (kind === 'chest') {
      rr(x - r * 0.9, y - r * 0.15, r * 1.8, r * 0.95, r * 0.12);
      const g = ctx.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, '#d9915a'); g.addColorStop(1, '#9a5a2e'); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - r * 0.9, y - r * 0.15); ctx.quadraticCurveTo(x, y - r * 1.05, x + r * 0.9, y - r * 0.15); ctx.closePath(); ctx.fillStyle = '#c47a45'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd84d'; ctx.fillRect(x - r * 0.9, y - r * 0.2, r * 1.8, r * 0.18); ctx.strokeRect(x - r * 0.9, y - r * 0.2, r * 1.8, r * 0.18);
      rr(x - r * 0.18, y - r * 0.25, r * 0.36, r * 0.42, r * 0.08); ctx.fillStyle = '#ffd84d'; ctx.fill(); ctx.stroke();
    } else if (kind === 'ghost') {
      ctx.restore(); ghostSprite('sheet', x, y - r * 0.1, r * 0.62, { phase: time * 3 }); return;
    } else drawIcon2(kind, x, y, r);
    ctx.restore();
  }
  const grad = (y0, y1, a, b) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const fs = (fill) => { ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
  function star5(x, y, R, r0) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r0 : R; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); }
  // Остальные иконки интерфейса (рисуются внутри save/restore из drawIcon)
  function drawIcon2(kind, x, y, r) {
    const P = (pts) => { ctx.beginPath(); pts.forEach(([a, b], i) => (i ? ctx.lineTo(x + a * r, y + b * r) : ctx.moveTo(x + a * r, y + b * r))); ctx.closePath(); };
    if (kind === 'ad') { // хлопушка с кнопкой «плей»
      rr(x - r * 0.9, y - r * 0.35, r * 1.8, r * 1.15, r * 0.15); fs(grad(y - r, y + r, '#5b4a86', '#2b2340'));
      P([[-0.9, -0.38], [0.85, -0.78], [0.95, -0.42], [-0.8, -0.02]]); fs('#ffffff');
      ctx.fillStyle = INK; for (let i = 0; i < 3; i++) P([[-0.55 + i * 0.55, -0.48], [-0.3 + i * 0.55, -0.56], [-0.42 + i * 0.55, -0.17], [-0.67 + i * 0.55, -0.09]]), ctx.fill();
      P([[-0.22, 0.02], [0.4, 0.23], [-0.22, 0.48]]); ctx.fillStyle = '#ffc94d'; ctx.fill();
    } else if (kind === 'lock') {
      ctx.lineWidth = Math.max(1.5, r * 0.28); ctx.beginPath(); ctx.arc(x, y - r * 0.2, r * 0.42, Math.PI, 0); ctx.stroke();
      ctx.lineWidth = Math.max(1.2, r / 6); rr(x - r * 0.7, y - r * 0.25, r * 1.4, r * 1.05, r * 0.2); fs(grad(y - r, y + r, '#ffe27a', '#e8a520'));
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y + r * 0.15, r * 0.14, 0, 7); ctx.fill(); ctx.fillRect(x - r * 0.06, y + r * 0.15, r * 0.12, r * 0.3);
    } else if (kind === 'sparkle') {
      const st = (cx, cy, R) => { ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.quadraticCurveTo(cx, cy, cx + R, cy); ctx.quadraticCurveTo(cx, cy, cx, cy + R); ctx.quadraticCurveTo(cx, cy, cx - R, cy); ctx.quadraticCurveTo(cx, cy, cx, cy - R); fs('#fff1a8'); };
      st(x - r * 0.15, y + r * 0.1, r * 0.8); ctx.lineWidth = 1; st(x + r * 0.6, y - r * 0.55, r * 0.35); st(x + r * 0.55, y + r * 0.6, r * 0.25);
    } else if (kind === 'scroll') {
      rr(x - r * 0.65, y - r * 0.75, r * 1.3, r * 1.5, r * 0.1); fs('#fff3d6');
      ctx.fillStyle = '#e8cfa0'; for (const sy of [-0.75, 0.75]) { rr(x - r * 0.85, y + sy * r - r * 0.18, r * 1.7, r * 0.36, r * 0.18); fs('#e8cfa0'); }
      ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(x - r * 0.4, y - r * 0.28 + i * r * 0.28); ctx.lineTo(x + r * 0.4, y - r * 0.28 + i * r * 0.28); } ctx.stroke();
    } else if (kind === 'fullmoon') {
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r); g.addColorStop(0, '#fffbe0'); g.addColorStop(1, '#ffd25a');
      ctx.beginPath(); ctx.arc(x, y, r * 0.85, 0, 7); fs(g);
      ctx.fillStyle = 'rgba(200,150,40,0.35)'; for (const [a, b, c] of [[-0.3, -0.2, 0.18], [0.3, 0.25, 0.22], [0.1, -0.45, 0.1]]) { ctx.beginPath(); ctx.arc(x + a * r, y + b * r, c * r, 0, 7); ctx.fill(); }
    } else if (kind === 'gift') {
      rr(x - r * 0.75, y - r * 0.2, r * 1.5, r * 1.0, r * 0.12); fs(grad(y - r, y + r, '#ff8fb0', '#e8507a'));
      rr(x - r * 0.88, y - r * 0.5, r * 1.76, r * 0.36, r * 0.1); fs('#ff9fbd');
      ctx.fillStyle = '#ffd84d'; ctx.fillRect(x - r * 0.14, y - r * 0.5, r * 0.28, r * 1.3);
      ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.66, r * 0.3, r * 0.17, -0.4, 0, 7); ctx.ellipse(x + r * 0.3, y - r * 0.66, r * 0.3, r * 0.17, 0.4, 0, 7); fs('#ffd84d');
    } else if (kind === 'cart') {
      ctx.lineWidth = Math.max(1.5, r / 5); ctx.beginPath(); ctx.moveTo(x - r * 0.95, y - r * 0.7); ctx.lineTo(x - r * 0.65, y - r * 0.7); ctx.lineTo(x - r * 0.4, y + r * 0.3); ctx.lineTo(x + r * 0.7, y + r * 0.3); ctx.stroke();
      ctx.lineWidth = Math.max(1.2, r / 7); P([[-0.6, -0.5], [0.9, -0.5], [0.7, 0.15], [-0.45, 0.15]]); fs('#8ee08a');
      ctx.fillStyle = INK; for (const cx of [-0.3, 0.55]) { ctx.beginPath(); ctx.arc(x + cx * r, y + r * 0.6, r * 0.17, 0, 7); ctx.fill(); }
    } else if (kind === 'gear') {
      ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, q = i % 2 ? 0.62 : 0.88; ctx.lineTo(x + Math.cos(a) * q * r, y + Math.sin(a) * q * r); } ctx.closePath(); fs(grad(y - r, y + r, '#e4e8f2', '#9aa3bd'));
      ctx.beginPath(); ctx.arc(x, y, r * 0.28, 0, 7); fs('#5b4a86');
    } else if (kind === 'book') {
      P([[0, -0.5], [-0.9, -0.75], [-0.9, 0.6], [0, 0.82]]); fs('#fff6e6'); P([[0, -0.5], [0.9, -0.75], [0.9, 0.6], [0, 0.82]]); fs('#f3e6cc');
      ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(-0.7 * r + x, y - r * 0.35 + i * r * 0.3); ctx.lineTo(x - r * 0.18, y - r * 0.2 + i * r * 0.3); } ctx.stroke();
      ctx.fillStyle = '#a86bff'; ctx.beginPath(); ctx.arc(x + r * 0.45, y + r * 0.05, r * 0.22, 0, 7); ctx.fill();
    } else if (kind === 'wheel') {
      const cols = ['#ff8fb0', '#ffd84d', '#7fd1ff', '#8ee08a', '#c9a7ff', '#ffb35a'];
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r * 0.85, (i / 6) * Math.PI * 2, ((i + 1) / 6) * Math.PI * 2); ctx.closePath(); ctx.fillStyle = cols[i]; ctx.fill(); }
      ctx.beginPath(); ctx.arc(x, y, r * 0.85, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, r * 0.18, 0, 7); fs('#ffffff');
      P([[-0.18, -1], [0.18, -1], [0, -0.68]]); fs('#ff4d6d');
    } else if (kind === 'house') {
      P([[-0.75, -0.05], [0, -0.85], [0.75, -0.05], [0.75, 0.8], [-0.75, 0.8]]); fs(grad(y - r, y + r, '#a89bd8', '#5b4a86'));
      P([[-0.95, 0.02], [0, -0.95], [0.95, 0.02]]); ctx.stroke();
      rr(x - r * 0.2, y + r * 0.25, r * 0.4, r * 0.55, r * 0.15); fs('#2b2340');
      ctx.fillStyle = '#ffe680'; ctx.fillRect(x - r * 0.55, y + r * 0.0, r * 0.25, r * 0.25); ctx.fillRect(x + r * 0.3, y + r * 0.0, r * 0.25, r * 0.25);
    } else if (kind === 'loop') {
      ctx.lineWidth = Math.max(2, r * 0.3); ctx.strokeStyle = '#7dd99a'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y, r * 0.6, -Math.PI * 0.9, Math.PI * 0.05); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, r * 0.6, Math.PI * 0.1, Math.PI * 1.05); ctx.stroke();
      ctx.fillStyle = '#7dd99a'; P([[0.35, 0.05], [0.95, 0.05], [0.65, 0.45]]); ctx.fill(); P([[-0.35, -0.05], [-0.95, -0.05], [-0.65, -0.45]]); ctx.fill();
    } else if (kind === 'swords') {
      for (const sg of [-1, 1]) { ctx.save(); ctx.translate(x, y); ctx.rotate(sg * 0.78); rr(-r * 0.11, -r * 0.95, r * 0.22, r * 1.25, r * 0.08); fs(grad(-r, r, '#ffffff', '#b9c3d8')); rr(-r * 0.35, r * 0.28, r * 0.7, r * 0.15, r * 0.06); fs('#ffd84d'); rr(-r * 0.09, r * 0.42, r * 0.18, r * 0.42, r * 0.06); fs('#8a5a3a'); ctx.restore(); }
    } else if (kind === 'magnet') {
      const U = () => { ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.45); ctx.lineTo(x - r * 0.5, y + r * 0.05); ctx.arc(x, y + r * 0.05, r * 0.5, Math.PI, 0, true); ctx.lineTo(x + r * 0.5, y - r * 0.45); };
      ctx.lineCap = 'butt'; ctx.lineWidth = r * 0.5 + 3; ctx.strokeStyle = INK; U(); ctx.stroke();
      ctx.lineWidth = r * 0.5 - 1; ctx.strokeStyle = '#ff5c7a'; U(); ctx.stroke();
      ctx.lineWidth = Math.max(1.2, r / 7); ctx.strokeStyle = INK; for (const sx of [-0.5, 0.5]) { rr(x + sx * r - r * 0.27, y - r * 0.85, r * 0.54, r * 0.4, 1); fs('#e4e8f2'); }
    } else if (kind === 'rank') {
      P([[0, -0.9], [0.85, 0], [0, 0.9], [-0.85, 0]]); fs(grad(y - r, y + r, '#ffe0f6', '#ff6bd0'));
      ctx.fillStyle = '#ffffff'; ctx.font = '900 ' + (r * 0.8) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('S', x, y + 1);
    } else if (kind === 'star') {
      star5(x, y + r * 0.05, r * 0.92, r * 0.42); fs(grad(y - r, y + r, '#fff3a6', '#ffb020'));
    } else if (kind === 'snow') {
      ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2, r * 0.22); ctx.strokeStyle = '#7fd1ff';
      ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI; ctx.moveTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85); ctx.lineTo(x - Math.cos(a) * r * 0.85, y - Math.sin(a) * r * 0.85); } ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r * 0.2, 0, 7); ctx.fill();
    } else if (kind === 'flask') {
      P([[-0.2, -0.85], [0.2, -0.85], [0.2, -0.3], [0.75, 0.75], [-0.75, 0.75], [-0.2, -0.3]]); fs('#eaf7ff');
      P([[-0.45, 0.2], [0.45, 0.2], [0.75, 0.75], [-0.75, 0.75]]); fs('#7dff5a');
    } else if (kind === 'leaf') {
      ctx.beginPath(); ctx.moveTo(x - r * 0.75, y + r * 0.75); ctx.quadraticCurveTo(x - r * 0.8, y - r * 0.7, x + r * 0.8, y - r * 0.8); ctx.quadraticCurveTo(x + r * 0.6, y + r * 0.7, x - r * 0.75, y + r * 0.75); fs(grad(y - r, y + r, '#b9f5a0', '#4fbf5e'));
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - r * 0.6, y + r * 0.6); ctx.lineTo(x + r * 0.5, y - r * 0.5); ctx.stroke();
    } else if (kind === 'brain') {
      ctx.beginPath(); for (const [a, b] of [[-0.4, -0.25], [0.15, -0.4], [0.5, 0], [0.15, 0.35], [-0.4, 0.25]]) ctx.arc(x + a * r, y + b * r, r * 0.42, 0, 7); ctx.fillStyle = INK; ctx.fill();
      ctx.beginPath(); for (const [a, b] of [[-0.4, -0.25], [0.15, -0.4], [0.5, 0], [0.15, 0.35], [-0.4, 0.25]]) { ctx.moveTo(x + a * r + r * 0.32, y + b * r); ctx.arc(x + a * r, y + b * r, r * 0.32, 0, 7); } ctx.fillStyle = '#ffb3d0'; ctx.fill();
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - r * 0.05, y - r * 0.6); ctx.lineTo(x - r * 0.05, y + r * 0.55); ctx.stroke();
    } else if (kind === 'night') {
      rr(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8, r * 0.3); fs(grad(y - r, y + r, '#3d3160', '#6b5aa8'));
      ctx.fillStyle = '#2b2340'; ctx.fillRect(x - r * 0.75, y + r * 0.1, r * 0.4, r * 0.7); ctx.fillRect(x - r * 0.3, y - r * 0.2, r * 0.45, r * 1.0); ctx.fillRect(x + r * 0.2, y + r * 0.25, r * 0.55, r * 0.55);
      ctx.fillStyle = '#ffe680'; ctx.fillRect(x - r * 0.18, y, r * 0.12, r * 0.12); ctx.fillRect(x + r * 0.35, y + r * 0.4, r * 0.12, r * 0.12); ctx.beginPath(); ctx.arc(x + r * 0.45, y - r * 0.5, r * 0.2, 0, 7); ctx.fill();
    } else if (kind === 'clover') {
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.38, y - r * 0.1 + Math.sin(a) * r * 0.38, r * 0.36, 0, 7); fs('#6fd36a'); }
      ctx.lineWidth = Math.max(1.5, r / 6); ctx.beginPath(); ctx.moveTo(x, y + r * 0.1); ctx.quadraticCurveTo(x + r * 0.1, y + r * 0.6, x + r * 0.4, y + r * 0.9); ctx.stroke();
    } else if (kind === 'hourglass') {
      P([[-0.55, -0.75], [0.55, -0.75], [0.1, 0], [0.55, 0.75], [-0.55, 0.75], [-0.1, 0]]); fs('#eaf7ff');
      P([[-0.3, 0.75], [0.3, 0.75], [0, 0.35]]); ctx.fillStyle = '#ffc94d'; ctx.fill(); P([[-0.3, -0.5], [0.3, -0.5], [0, -0.15]]); ctx.fill();
      for (const sy of [-0.85, 0.85]) { rr(x - r * 0.7, y + sy * r - r * 0.1, r * 1.4, r * 0.2, r * 0.08); fs('#b07a4f'); }
    } else if (kind === 'skull') {
      ctx.beginPath(); ctx.arc(x, y - r * 0.15, r * 0.7, Math.PI * 0.85, Math.PI * 0.15); ctx.lineTo(x + r * 0.4, y + r * 0.75); ctx.lineTo(x - r * 0.4, y + r * 0.75); ctx.closePath(); fs('#ffffff');
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x - r * 0.28, y - r * 0.1, r * 0.18, 0, 7); ctx.arc(x + r * 0.28, y - r * 0.1, r * 0.18, 0, 7); ctx.fill();
    } else if (kind === 'note') {
      ctx.lineWidth = Math.max(1.5, r / 5); ctx.beginPath(); ctx.moveTo(x + r * 0.35, y + r * 0.45); ctx.lineTo(x + r * 0.35, y - r * 0.8); ctx.quadraticCurveTo(x + r * 0.8, y - r * 0.5, x + r * 0.75, y - r * 0.1); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.5, r * 0.4, r * 0.3, -0.4, 0, 7); fs(ctx.strokeStyle === INK ? '#ffffff' : '#ffffff');
    } else if (kind === 'speaker') {
      P([[-0.85, -0.3], [-0.4, -0.3], [0.15, -0.8], [0.15, 0.8], [-0.4, 0.3], [-0.85, 0.3]]); fs('#ffffff');
      ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.5, r / 6); for (const q of [0.45, 0.75]) { ctx.beginPath(); ctx.arc(x + r * 0.15, y, q * r, -0.8, 0.8); ctx.stroke(); }
    } else if (kind === 'phone') {
      rr(x - r * 0.42, y - r * 0.8, r * 0.84, r * 1.6, r * 0.18); fs('#ffffff');
      ctx.fillStyle = '#9fd0f0'; ctx.fillRect(x - r * 0.28, y - r * 0.6, r * 0.56, r * 1.05);
      ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.2, r / 7);
      for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sg * r * 0.62, y - r * 0.35); ctx.lineTo(x + sg * r * 0.78, y - r * 0.15); ctx.lineTo(x + sg * r * 0.62, y + r * 0.05); ctx.lineTo(x + sg * r * 0.78, y + r * 0.25); ctx.stroke(); }
    } else if (kind === 'boom') {
      ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, q = i % 2 ? 0.48 : 0.92; ctx.lineTo(x + Math.cos(a) * q * r, y + Math.sin(a) * q * r); } ctx.closePath(); fs(grad(y - r, y + r, '#ffe680', '#ff6a3a'));
      ctx.beginPath(); ctx.arc(x, y, r * 0.28, 0, 7); ctx.fillStyle = '#fff6c0'; ctx.fill();
    } else if (kind === 'pumpkin') {
      for (const [ox, w] of [[-0.42, 0.42], [0.42, 0.42], [0, 0.48]]) { ctx.beginPath(); ctx.ellipse(x + ox * r, y + r * 0.15, w * r, r * 0.68, 0, 0, 7); fs(grad(y - r, y + r, '#ffb35a', '#e8701f')); }
      rr(x - r * 0.1, y - r * 0.85, r * 0.2, r * 0.35, r * 0.06); fs('#5fa04e');
      ctx.fillStyle = INK; P([[-0.45, -0.05], [-0.2, -0.05], [-0.32, -0.3]]); ctx.fill(); P([[0.45, -0.05], [0.2, -0.05], [0.32, -0.3]]); ctx.fill();
      P([[-0.4, 0.3], [0.4, 0.3], [0.25, 0.55], [0, 0.42], [-0.25, 0.55]]); ctx.fill();
    } else if (kind === 'candy') {
      for (const sg of [-1, 1]) { P([[sg * 0.4, 0], [sg * 0.95, -0.4], [sg * 0.95, 0.4]]); fs('#ffd84d'); }
      ctx.beginPath(); ctx.arc(x, y, r * 0.48, 0, 7); fs('#ff6b9a');
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.2, r * 0.14); ctx.beginPath(); ctx.arc(x, y, r * 0.26, 0.3, 4); ctx.stroke();
    } else if (kind === 'trophy') {
      ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.8); ctx.lineTo(x + r * 0.6, y - r * 0.8); ctx.quadraticCurveTo(x + r * 0.6, y + r * 0.2, x, y + r * 0.25); ctx.quadraticCurveTo(x - r * 0.6, y + r * 0.2, x - r * 0.6, y - r * 0.8); fs(grad(y - r, y + r, '#fff1a8', '#f0a81f'));
      ctx.lineWidth = Math.max(1.2, r / 6); for (const sg of [-1, 1]) { ctx.beginPath(); ctx.arc(x + sg * r * 0.62, y - r * 0.45, r * 0.25, sg > 0 ? -Math.PI / 2 : Math.PI / 2, sg > 0 ? Math.PI / 2 : Math.PI * 1.5); ctx.stroke(); }
      ctx.fillStyle = '#f0a81f'; ctx.fillRect(x - r * 0.1, y + r * 0.25, r * 0.2, r * 0.3); rr(x - r * 0.45, y + r * 0.55, r * 0.9, r * 0.3, r * 0.08); fs('#b07a4f');
    } else if (kind === 'flame') {
      ctx.beginPath(); ctx.moveTo(x, y + r * 0.9); ctx.bezierCurveTo(x - r * 0.95, y + r * 0.8, x - r * 0.75, y - r * 0.2, x - r * 0.1, y - r * 0.95); ctx.bezierCurveTo(x, y - r * 0.4, x + r * 0.3, y - r * 0.4, x + r * 0.4, y - r * 0.6); ctx.bezierCurveTo(x + r * 0.95, y, x + r * 0.8, y + r * 0.8, x, y + r * 0.9); fs(grad(y - r, y + r, '#ffe680', '#ff6a3a'));
      ctx.beginPath(); ctx.moveTo(x, y + r * 0.8); ctx.bezierCurveTo(x - r * 0.45, y + r * 0.6, x - r * 0.25, y + r * 0.1, x, y - r * 0.15); ctx.bezierCurveTo(x + r * 0.35, y + r * 0.2, x + r * 0.4, y + r * 0.65, x, y + r * 0.8); ctx.fillStyle = '#fff6c0'; ctx.fill();
    }
  }
  // Текст со встроенными нарисованными иконками вместо капризных эмодзи
  const INLINE_ICONS = { '💎': 'gem', '🎬': 'ad', '🫙': 'jar', '🔒': 'lock', '🌙': 'moon', '✨': 'sparkle', '👻': 'ghost', '🧹': 'attach', '👑': 'crown', '📜': 'scroll', '🌕': 'fullmoon', '🎁': 'gift', '🛒': 'cart', '⚙': 'gear', '📖': 'book', '🎡': 'wheel', '🏚': 'house', '🔁': 'loop', '⚔': 'swords', '🧲': 'magnet', '💚': 'ecto', '💠': 'rank', '⭐': 'star', '❄': 'snow', '🧪': 'flask', '🌿': 'leaf', '🧠': 'brain', '🌃': 'night', '🍀': 'clover', '⏳': 'hourglass', '💀': 'skull', '🎵': 'note', '🔊': 'speaker', '🔥': 'flame', '🎃': 'pumpkin', '📳': 'phone', '💥': 'boom', '🍬': 'candy', '🏆': 'trophy' };
  const ICON_RE = new RegExp('(' + Object.keys(INLINE_ICONS).join('|') + ')');
  function text(t, x, y, size, color, align, weight) {
    t = String(t).replace(/\uFE0F/g, '');
    if (ICON_RE.test(t)) {
      const parts = t.split(ICON_RE).filter(Boolean);
      ctx.font = (weight || '800') + ' ' + size + 'px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
      const ws = parts.map((p) => (INLINE_ICONS[p] ? size * 1.05 : ctx.measureText(p).width));
      const total = ws.reduce((a, b) => a + b, 0);
      let cx = align === 'left' ? x : align === 'right' ? x - total : x - total / 2;
      parts.forEach((p, i) => {
        if (INLINE_ICONS[p]) drawIcon(INLINE_ICONS[p], cx + ws[i] / 2, y, size * 0.95);
        else plainText(p, cx, y, size, color, 'left', weight);
        cx += ws[i];
      });
      return;
    }
    plainText(t, x, y, size, color, align, weight);
  }
  function plainText(t, x, y, size, color, align, weight) {
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
  // ---- UI: объёмные «конфетные» плашки, нажатие, карточки, полоски
  const pressOff = (x, y, w, h) => (press && time - press.t < 0.25 && press.x >= x && press.x <= x + w && press.y >= y && press.y <= y + h ? 2 : 0);
  function plate(x, y, w, h, r, color, o) {
    o = o || {};
    if (!o.noShadow) { rr(x, y + 3, w, h, r); ctx.fillStyle = 'rgba(15,8,30,0.35)'; ctx.fill(); }
    rr(x, y, w, h, r);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, shade(color, 0.28)); g.addColorStop(0.55, color); g.addColorStop(1, shade(color, -0.18));
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = shade(color, -0.32); ctx.fillRect(x, y + h - Math.min(5, h * 0.15), w, 6);
    rr(x + 4, y + 3, w - 8, Math.min(h * 0.4, 14), Math.max(2, r * 0.6)); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();
    ctx.restore();
    rr(x, y, w, h, r); ctx.lineWidth = o.lw || 3; ctx.strokeStyle = INK; ctx.stroke();
  }
  function orb(cx, cy, rad, color) {
    ctx.fillStyle = 'rgba(15,8,30,0.35)'; ctx.beginPath(); ctx.arc(cx, cy + 3, rad, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(cx - rad * 0.35, cy - rad * 0.45, rad * 0.1, cx, cy, rad);
    g.addColorStop(0, shade(color, 0.45)); g.addColorStop(0.6, color); g.addColorStop(1, shade(color, -0.25));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(cx - rad * 0.3, cy - rad * 0.5, rad * 0.45, rad * 0.22, -0.3, 0, 7); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7); ctx.stroke();
  }
  function card(x, y, w, h, r, border) {
    rr(x + 1, y + 4, w, h, r); ctx.fillStyle = 'rgba(43,35,64,0.18)'; ctx.fill();
    rr(x, y, w, h, r);
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#f1ebfa');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = alpha(border.startsWith('#') && border.length === 7 ? border : '#8a7bd1', 0.18); ctx.fillRect(x, y, 6, h); ctx.restore();
    rr(x, y, w, h, r); ctx.lineWidth = 3; ctx.strokeStyle = border; ctx.stroke();
  }
  function bar(x, y, w, h, p, color, track) {
    rr(x, y, w, h, h / 2); ctx.fillStyle = track || 'rgba(15,8,30,0.75)'; ctx.fill();
    const fw = Math.max(0, Math.min(1, p)) * (w - 4);
    if (fw > 2) {
      rr(x + 2, y + 2, fw, h - 4, (h - 4) / 2);
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, shade(color, 0.35)); g.addColorStop(1, shade(color, -0.15));
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      for (let sx = x - h + ((time * 30) % 16); sx < x + fw; sx += 16) { ctx.beginPath(); ctx.moveTo(sx, y + h); ctx.lineTo(sx + 6, y + h); ctx.lineTo(sx + 6 + h, y); ctx.lineTo(sx + h, y); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 2, y + 2, fw, (h - 4) * 0.35);
      ctx.restore();
    }
    rr(x, y, w, h, h / 2); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
  }
  function button(x, y, w, h, label, color, on, size, enabled) {
    const en = enabled === undefined ? true : enabled;
    const dn = pressOff(x, y, w, h);
    ctx.save(); ctx.translate(0, dn);
    plate(x, y, w, h, Math.min(12, h / 2.6), en ? color : '#9b93b3', { noShadow: dn > 0 });
    text(label, x + w / 2, y + h / 2, size || 12, '#ffffff');
    ctx.restore();
    btn(x, y, w, h, on);
  }
  function badge(x, y) {
    const k = 1 + Math.sin(time * 6) * 0.12;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, 7); g.addColorStop(0, '#ff9aae'); g.addColorStop(1, '#e8304f');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, 7); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.restore();
  }
  // Пилюля ресурса в верхней панели
  function pill(x, y, w, h, icon, value, color) {
    rr(x, y, w, h, h / 2); ctx.fillStyle = 'rgba(10,6,22,0.55)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.stroke();
    if (icon === 'ecto') orb(x + h / 2, y + h / 2, h / 2 - 1, '#7dff9e');
    else text(icon, x + h / 2, y + h / 2 + 1, h * 0.7, '#ffffff');
    text(value, x + w - 8, y + h / 2 + 1, h * 0.62, color, 'right');
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
      ctx.fillStyle = ({ 5: '#5fe0ff', 6: '#c8ff3d', 7: '#ffd84d' })[def.d] || '#ff7a3d';
      ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r + 2); ctx.quadraticCurveTo(x, y - r * 1.9 - Math.sin(time * 12) * 3, x + r * 0.4, y - r + 2); ctx.fill();
    }
    if (def.shape === 'king') {
      ctx.fillStyle = '#ffc94d'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.85); ctx.lineTo(x - r * 0.5, y - r * 1.3); ctx.lineTo(x - r * 0.25, y - r * 1.05);
      ctx.lineTo(x, y - r * 1.4); ctx.lineTo(x + r * 0.25, y - r * 1.05); ctx.lineTo(x + r * 0.5, y - r * 1.3); ctx.lineTo(x + r * 0.5, y - r * 0.85); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // аксессуары призраков новых районов
    if (def.d >= 5 && def.shape !== 'fire' && def.shape !== 'king') {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      if (def.d === 5) { // вязаная шапочка
        ctx.fillStyle = '#5f9bff'; ctx.beginPath(); ctx.arc(x, y - r * 0.55, r * 0.62, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y - r * 1.2, r * 0.16, 0, 7); ctx.fill(); ctx.stroke();
      } else if (def.d === 6) { // очки-гогглы на лбу
        ctx.fillStyle = '#4e5a66'; ctx.fillRect(x - r * 0.95, y - r * 0.62, r * 1.9, r * 0.14);
        ctx.fillStyle = '#c8ffd0'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.55, r * 0.22, 0, 7); ctx.arc(x + r * 0.3, y - r * 0.55, r * 0.22, 0, 7); ctx.fill(); ctx.stroke();
      } else { // полумесяц на лбу
        ctx.fillStyle = '#ffd84d'; ctx.beginPath(); ctx.arc(x, y - r * 0.6, r * 0.22, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = def.body; ctx.beginPath(); ctx.arc(x + r * 0.1, y - r * 0.66, r * 0.18, 0, 7); ctx.fill();
      }
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
    { base: '#d6ecf7', line: '#bcdcec', wall: '#6f9fc0', style: 'ice' },      // ледяной замок
    { base: '#b9c4cc', line: '#a3afb8', wall: '#4e5a66', style: 'lab' },      // лаборатория
    { base: '#e6dcf5', line: '#d3c4ec', wall: '#2a2350', style: 'marble' },   // лунный дворец
  ];
  const DECOR = [
    ['rug', 'bed', 'table', 'plant', 'box', 'lamp', 'sofa', 'yarn'],
    ['rug', 'table', 'armor', 'plant', 'lamp', 'shelf', 'chest'],
    ['barrel', 'box', 'rope', 'net', 'lamp', 'barrel', 'anchor', 'buoy'],
    ['rack', 'rug', 'box', 'plant', 'lamp', 'rack', 'table', 'mannequin'],
    ['grave', 'grave', 'tree', 'pumpkin', 'lamp', 'grave', 'bush', 'candles'],
    ['crystal', 'snowman', 'rug', 'lamp', 'chest', 'crystal', 'armor', 'snowman'],
    ['vat', 'flasks', 'box', 'lamp', 'barrel', 'vat', 'shelf', 'flasks'],
    ['pillar', 'mirror', 'rug', 'candles', 'chest', 'pillar', 'plant', 'mirror'],
  ];
  const SOLID = { bed: 1, table: 1, box: 1, sofa: 1, shelf: 1, armor: 1, barrel: 1, rack: 1, grave: 1, tree: 1, anchor: 1, chest: 1, mannequin: 1, crystal: 1, snowman: 1, vat: 1, flasks: 1, pillar: 1, mirror: 1 };

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
    } else if (F.style === 'ice') { // ледяные плиты с трещинами и сугробами
      const t = 90;
      for (let y = 0; y < MAP_H; y += t) for (let x = 0; x < MAP_W; x += t) { if (((x + y) / t) % 2 === 0) c.fillRect(x, y, t, t); }
      c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2;
      for (let i = 0; i < 60; i++) { let x = R() * MAP_W, y = R() * MAP_H; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (R() - 0.5) * 50; y += (R() - 0.5) * 50; c.lineTo(x, y); } c.stroke(); }
      for (let i = 0; i < 14; i++) { c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.ellipse(R() * MAP_W, R() * MAP_H, 40 + R() * 70, 18 + R() * 20, R() * 3, 0, 7); c.fill(); }
      c.fillStyle = '#ffffff'; for (let i = 0; i < 260; i++) { const x = R() * MAP_W, y = R() * MAP_H; c.fillRect(x - 3, y, 7, 1.5); c.fillRect(x, y - 3, 1.5, 7); }
    } else if (F.style === 'lab') { // металлические плиты с заклёпками
      const t = 80;
      for (let y = 0; y < MAP_H; y += t) for (let x = 0; x < MAP_W; x += t) {
        c.fillStyle = F.line; c.fillRect(x, y, t, 3); c.fillRect(x, y, 3, t);
        c.fillStyle = '#8c98a3'; for (const [dx, dy] of [[10, 10], [t - 10, 10], [10, t - 10], [t - 10, t - 10]]) { c.beginPath(); c.arc(x + dx, y + dy, 3, 0, 7); c.fill(); }
        if (R() < 0.12) { c.fillStyle = 'rgba(120,255,140,0.35)'; c.beginPath(); c.ellipse(x + t / 2, y + t / 2, 18 + R() * 16, 10 + R() * 8, R() * 3, 0, 7); c.fill(); }
      }
      for (let i = 0; i < 5; i++) { const x = 140 + R() * (MAP_W - 380), y = 140 + R() * (MAP_H - 320); c.save(); c.beginPath(); c.rect(x, y, 120, 22); c.clip(); for (let k = -30; k < 150; k += 22) { c.fillStyle = '#ffd84d'; c.beginPath(); c.moveTo(x + k, y + 22); c.lineTo(x + k + 11, y + 22); c.lineTo(x + k + 33, y); c.lineTo(x + k + 22, y); c.closePath(); c.fill(); c.fillStyle = '#2b2340'; c.beginPath(); c.moveTo(x + k + 11, y + 22); c.lineTo(x + k + 22, y + 22); c.lineTo(x + k + 44, y); c.lineTo(x + k + 33, y); c.closePath(); c.fill(); } c.restore(); }
    } else if (F.style === 'marble') { // мрамор с ромбами и золотыми звёздами
      const t = 70;
      for (let y = 0; y < MAP_H + t; y += t) for (let x = 0; x < MAP_W + t; x += t) { c.beginPath(); c.moveTo(x, y - t / 2); c.lineTo(x + t / 2, y); c.lineTo(x, y + t / 2); c.lineTo(x - t / 2, y); c.closePath(); c.fill(); }
      c.strokeStyle = 'rgba(160,140,200,0.35)'; c.lineWidth = 1.5;
      for (let i = 0; i < 40; i++) { let x = R() * MAP_W, y = R() * MAP_H; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (R() - 0.3) * 40; y += (R() - 0.5) * 30; c.lineTo(x, y); } c.stroke(); }
      for (let y = 0; y < MAP_H; y += t) for (let x = 0; x < MAP_W; x += t) { if (R() < 0.18) { const px = x + t / 2, py = y + t / 2; c.fillStyle = '#ffd84d'; c.beginPath(); for (let k = 0; k < 10; k++) { const an = -Math.PI / 2 + k * Math.PI / 5, rr_ = k % 2 ? 3 : 7; c.lineTo(px + Math.cos(an) * rr_, py + Math.sin(an) * rr_); } c.closePath(); c.fill(); } }
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
    for (let i = 0; i < 90; i++) {
      const kind = kinds[Math.floor(R() * kinds.length)];
      const big = kind === 'rug' || kind === 'net' || kind === 'bed' || kind === 'sofa' || kind === 'tree';
      const w = big ? 100 + R() * 50 : 42 + R() * 24, h = big ? 70 + R() * 40 : 42 + R() * 20;
      const x = WALL + 30 + R() * (MAP_W - WALL * 2 - 60 - w), y = WALL + 30 + R() * (MAP_H - WALL * 2 - 60 - h);
      if (Math.hypot(x + w / 2 - MAP_W / 2, y + h / 2 - MAP_H / 2) < 140) continue; // центр свободен для старта
      if (placed.length >= 30 || placed.some((p) => x < p.x + p.w + 56 && x + w + 56 > p.x && y < p.y + p.h + 56 && y + h + 56 > p.y)) continue;
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
    } else if (d === 5) { // ледяные блоки
      for (let y = 0, row = 0; y < MAP_H; y += 30, row++) for (let x = (row % 2) * -30; x < MAP_W; x += 60) {
        c.fillStyle = ['#a8d8f0', '#9ccdea', '#b8e2f5'][Math.floor(R() * 3)]; c.beginPath(); c.roundRect(x + 2, y + 2, 56, 26, 4); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(x + 6, y + 5, 22, 3);
      }
      c.fillStyle = '#ffffff'; for (let i = 0; i < 300; i++) { c.beginPath(); c.arc(R() * MAP_W, R() * MAP_H, 1 + R() * 2, 0, 7); c.fill(); }
    } else if (d === 6) { // стальные панели и трубы
      c.fillStyle = '#5c6874'; c.fillRect(0, 0, MAP_W, MAP_H);
      for (let y = 0; y < MAP_H; y += 60) for (let x = 0; x < MAP_W; x += 60) { c.fillStyle = (x + y) % 120 ? '#66727e' : '#58646f'; c.fillRect(x + 2, y + 2, 56, 56); c.fillStyle = '#8c98a3'; c.beginPath(); c.arc(x + 8, y + 8, 2.5, 0, 7); c.arc(x + 52, y + 52, 2.5, 0, 7); c.fill(); }
      c.strokeStyle = '#a0784a'; c.lineWidth = 10; c.beginPath(); c.moveTo(0, 30); c.lineTo(MAP_W, 30); c.moveTo(0, MAP_H - 30); c.lineTo(MAP_W, MAP_H - 30); c.moveTo(30, 0); c.lineTo(30, MAP_H); c.moveTo(MAP_W - 30, 0); c.lineTo(MAP_W - 30, MAP_H); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 3; c.stroke();
    } else if (d === 7) { // ночное небо с облаками: дворец на луне
      const sk = c.createLinearGradient(0, 0, 0, MAP_H); sk.addColorStop(0, '#1d1640'); sk.addColorStop(0.5, '#33286a'); sk.addColorStop(1, '#1d1640'); c.fillStyle = sk; c.fillRect(0, 0, MAP_W, MAP_H);
      for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(255,255,255,${0.4 + R() * 0.6})`; c.fillRect(R() * MAP_W, R() * MAP_H, 2, 2); }
      for (let i = 0; i < 60; i++) { const x = R() * MAP_W, y = R() * MAP_H; c.fillStyle = 'rgba(200,180,255,0.35)'; c.beginPath(); c.arc(x, y, 16, 0, 7); c.arc(x + 18, y - 6, 20, 0, 7); c.arc(x + 38, y, 15, 0, 7); c.fill(); }
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
    const trim = ['#f3e2c8', '#9d93b8', '#a7713f', '#f2c6d6', '#2f2a3a', '#eaf7ff', '#d9a441', '#ffd84d'][d];
    c.fillStyle = trim; c.fillRect(W - 8, W - 8, IW + 16, 8); c.fillRect(W - 8, MAP_H - W, IW + 16, 8); c.fillRect(W - 8, W - 8, 8, IH + 16); c.fillRect(MAP_W - W, W - 8, 8, IH + 16);
    c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(W, W, IW, IH); c.strokeRect(1.5, 1.5, MAP_W - 3, MAP_H - 3);
    if (d === 2) { // причал: столбики вдоль края
      for (let x = W; x <= MAP_W - W; x += 80) for (const y of [W - 4, MAP_H - W + 4]) post(x, y, '#8a5a36');
      for (let y = W + 80; y <= MAP_H - W - 40; y += 80) for (const x of [W - 4, MAP_W - W + 4]) post(x, y, '#8a5a36');
    }
    if (d === 5) { // сосульки по верхнему краю
      c.fillStyle = '#e8f6ff'; c.strokeStyle = INK; c.lineWidth = 1.5;
      for (let x = W; x < MAP_W - W; x += 18 + R() * 14) { const l = 10 + R() * 22; c.beginPath(); c.moveTo(x, W); c.lineTo(x + 5, W + l); c.lineTo(x + 10, W); c.closePath(); c.fill(); c.stroke(); }
    }
    if (d === 7) { // золотая балюстрада
      for (let x = W + 6; x <= MAP_W - W - 6; x += 22) for (const y of [W - 10, MAP_H - W + 2]) { c.fillStyle = '#ffe08a'; c.beginPath(); c.roundRect(x - 4, y, 8, 8, 3); c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke(); }
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
      else if (d === 6) { // светящиеся колбы на стене
        for (let k = 0; k < 3; k++) { const tx = x - 30 + k * 30, ty = 14; c.fillStyle = 'rgba(120,255,140,0.35)'; c.beginPath(); c.arc(tx + 7, ty + 30, 26, 0, 7); c.fill(); c.fillStyle = '#c8ffd0'; c.beginPath(); c.roundRect(tx, ty, 14, W - 30, 7); c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke(); c.fillStyle = '#5fe07a'; c.beginPath(); c.roundRect(tx + 2, ty + (W - 30) * 0.4, 10, (W - 30) * 0.6 - 2, 5); c.fill(); }
      } else if (d === 7) { // луна в арке
        const ax = x, ay = 14; c.fillStyle = '#ffd84d'; c.beginPath(); c.roundRect(ax - 34, ay - 4, 68, W - 14, [34, 34, 4, 4]); c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
        c.fillStyle = '#2b3a6b'; c.beginPath(); c.roundRect(ax - 28, ay + 2, 56, W - 26, [28, 28, 2, 2]); c.fill();
        c.fillStyle = '#fff4c2'; c.beginPath(); c.arc(ax, ay + 30, 13, 0, 7); c.fill(); c.fillStyle = '#2b3a6b'; c.beginPath(); c.arc(ax + 6, ay + 26, 11, 0, 7); c.fill();
      }
      else { lamp(x + 40, W - 4); }
    }
    // колонны по углам
    const col = ['#8a6450', '#585070', '#7a5636', '#9a6a82', '#5c5868', '#7fb0d0', '#6a5a48', '#4a3a80'][d];
    for (const [x, y] of [[0, 0], [MAP_W - W - 10, 0], [0, MAP_H - W - 10], [MAP_W - W - 10, MAP_H - W - 10]]) {
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 6, y + 8, W + 10, W + 10);
      c.fillStyle = col; c.fillRect(x, y, W + 10, W + 10); c.lineWidth = 3; c.strokeStyle = INK; c.strokeRect(x + 1.5, y + 1.5, W + 7, W + 7);
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x + 8, y + 8, W - 6, W - 6);
      c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(x + 16, y + 16, W - 22, W - 22);
    }
  }

  function drawDecor(c, kind, x, y, w, h, R, F) {
    const ink = INK, cx = x + w / 2, cy = y + h / 2, PI = Math.PI;
    const path = (px, py, pw, ph, r) => { c.beginPath(); c.roundRect(px, py, pw, ph, r); };
    const fs = (fill, lw) => { c.fillStyle = fill; c.fill(); c.lineWidth = lw || 3; c.strokeStyle = ink; c.stroke(); };
    const vg = (y0, y1, a, b) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
    const hg = (x0, x1, stops) => { const g = c.createLinearGradient(x0, 0, x1, 0); stops.forEach(([k, col]) => g.addColorStop(k, col)); return g; };
    const rg = (px, py, r, a, b) => { const g = c.createRadialGradient(px - r * 0.35, py - r * 0.4, r * 0.1, px, py, r); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
    const shadow = (rad) => { c.fillStyle = 'rgba(30,15,50,0.2)'; path(x + 4, y + 7, w, h, rad || 10); c.fill(); };
    const ell = (px, py, rx, ry) => { c.beginPath(); c.ellipse(px, py, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, 7); };
    const glow = (px, py, r, col) => { const g = c.createRadialGradient(px, py, 2, px, py, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,230,150,0)'); c.fillStyle = g; c.beginPath(); c.arc(px, py, r, 0, 7); c.fill(); };
    const block = (top, front, d, rad) => { // ящик в перспективе 3/4: верх и передняя грань
      shadow(rad); path(x, y, w, h, rad); fs(front);
      path(x, y, w, h - d, rad); c.fillStyle = vg(y, y + h - d, shade(top, 0.18), shade(top, -0.06)); c.fill(); c.lineWidth = 2.5; c.strokeStyle = ink; c.stroke();
    };
    const leaf = (px, py, a, len, wid, col) => {
      c.save(); c.translate(px, py); c.rotate(a);
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -wid, len, 0); c.quadraticCurveTo(len * 0.5, wid, 0, 0);
      c.fillStyle = col; c.fill(); c.lineWidth = 2; c.strokeStyle = ink; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(len * 0.1, 0); c.lineTo(len * 0.85, 0); c.stroke();
      c.restore();
    };
    switch (kind) {
      case 'rug': {
        const cols = [['#e88aa5', '#f6c1d0', '#c95f80'], ['#8fb8e8', '#c8dcf5', '#5f88c9'], ['#f0c46b', '#fae3ad', '#c99a3c'], ['#a98fe0', '#d6c8f5', '#7a5fc4']][Math.floor(R() * 4)];
        c.strokeStyle = cols[2]; c.lineWidth = 2.5;
        for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(x - 7, cy + i * 6); c.lineTo(x + 6, cy + i * 6); c.moveTo(x + w - 6, cy + i * 6); c.lineTo(x + w + 7, cy + i * 6); c.stroke(); }
        ell(cx, cy, w / 2, h / 2); fs(cols[0], 2.5);
        ell(cx, cy, w / 2 - 7, h / 2 - 6); c.fillStyle = cols[1]; c.fill();
        ell(cx, cy, w / 2 - 14, h / 2 - 11); c.fillStyle = cols[0]; c.fill();
        ell(cx, cy, w / 5, h / 5); c.fillStyle = cols[2]; c.fill();
        c.fillStyle = cols[1];
        for (let i = 0; i < 14; i++) { const a = (i / 14) * PI * 2; c.beginPath(); c.arc(cx + Math.cos(a) * (w / 2 - 20), cy + Math.sin(a) * (h / 2 - 16), 2.5, 0, 7); c.fill(); }
        c.fillStyle = cols[2]; for (let i = 0; i < 4; i++) { const a = (i / 4) * PI * 2 + PI / 4; c.save(); c.translate(cx + Math.cos(a) * w / 6, cy + Math.sin(a) * h / 6); c.rotate(PI / 4); c.fillRect(-3, -3, 6, 6); c.restore(); }
        break;
      }
      case 'net': {
        c.strokeStyle = 'rgba(70,60,80,0.55)'; c.lineWidth = 1.6;
        for (let i = 0; i <= w; i += 11) { c.beginPath(); c.moveTo(x + i, y); c.quadraticCurveTo(x + i + 4, cy, x + i, y + h); c.stroke(); }
        for (let i = 0; i <= h; i += 11) { c.beginPath(); c.moveTo(x, y + i); c.quadraticCurveTo(cx, y + i + 4, x + w, y + i); c.stroke(); }
        c.fillStyle = 'rgba(70,60,80,0.6)'; for (let i = 0; i <= w; i += 11) for (let j = 0; j <= h; j += 11) c.fillRect(x + i - 1, y + j - 1, 2.5, 2.5);
        c.strokeStyle = '#c9a26b'; c.lineWidth = 3; c.strokeRect(x, y, w, h);
        for (let i = 0; i < 5; i++) { const px = x + (w / 4) * i, py = i % 2 ? y : y + h; ell(px, py, 6, 6); fs(i % 2 ? '#ffffff' : '#ff5c5c', 2); }
        break;
      }
      case 'bed': {
        shadow(10);
        path(x, y, w, h, 10); fs('#8a5a36');
        path(x, y, w, h * 0.24, 9); c.fillStyle = vg(y, y + h * 0.24, '#d29a64', '#9a6640'); c.fill(); c.lineWidth = 2.5; c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x + 8, y + 4, w - 16, 3);
        path(x + 5, y + h * 0.2, w - 10, h * 0.76, 8); fs('#f7f3ff', 2);
        const pw = (w - 26) / 2;
        for (let i = 0; i < 2; i++) { path(x + 9 + i * (pw + 8), y + h * 0.25, pw, h * 0.2, 8); fs(vg(y + h * 0.25, y + h * 0.45, '#ffffff', '#e2dcf2'), 2); }
        const qy = y + h * 0.5, qh = h * 0.46, qc = ['#9fb4e8', '#ffb3c6', '#a8dcb0'][Math.floor(R() * 3)];
        path(x + 5, qy, w - 10, qh, 7); c.fillStyle = qc; c.fill();
        c.save(); path(x + 5, qy, w - 10, qh, 7); c.clip();
        const sq = 14; for (let i = 0; i * sq < w; i++) for (let j = 0; j * sq < qh; j++) if ((i + j) % 2) { c.fillStyle = shade(qc, 0.3); c.fillRect(x + 5 + i * sq, qy + 8 + j * sq, sq, sq); }
        c.fillStyle = shade(qc, 0.45); c.fillRect(x + 5, qy, w - 10, 8);
        c.strokeStyle = 'rgba(255,255,255,0.6)'; c.setLineDash([3, 3]); c.lineWidth = 1; c.beginPath(); c.moveTo(x + 5, qy + 9); c.lineTo(x + w - 5, qy + 9); c.stroke(); c.setLineDash([]);
        c.restore();
        path(x + 5, qy, w - 10, qh, 7); c.lineWidth = 2; c.strokeStyle = ink; c.stroke();
        break;
      }
      case 'sofa': {
        const col = ['#c98fb0', '#8fb8a8', '#e0a86b'][Math.floor(R() * 3)];
        shadow(14); path(x, y, w, h, 14); fs(shade(col, -0.25));
        path(x + 3, y + 2, w - 6, h * 0.42, 11); c.fillStyle = vg(y, y + h * 0.42, shade(col, 0.25), shade(col, -0.05)); c.fill(); c.lineWidth = 2.5; c.stroke();
        for (const ax of [x, x + w - 15]) { path(ax, y + h * 0.22, 15, h * 0.78, 7); fs(vg(y, y + h, shade(col, 0.15), shade(col, -0.15)), 2.5); }
        const n = w > 110 ? 3 : 2, cw = (w - 30) / n;
        for (let i = 0; i < n; i++) { path(x + 15 + i * cw + 1, y + h * 0.4, cw - 2, h * 0.52, 7); fs(vg(y + h * 0.4, y + h * 0.92, shade(col, 0.32), col), 2); c.fillStyle = shade(col, -0.25); c.beginPath(); c.arc(x + 15 + i * cw + cw / 2, y + h * 0.66, 2, 0, 7); c.fill(); }
        c.save(); c.translate(x + 24, y + h * 0.36); c.rotate(-0.3); path(-9, -9, 18, 18, 5); fs('#fff1a8', 2); c.restore();
        break;
      }
      case 'table': {
        shadow(w / 2);
        ell(cx, cy + 6, w / 2, h / 2 - 2); fs('#6e4428');
        ell(cx, cy, w / 2, h / 2 - 4); c.fillStyle = vg(y, y + h, '#d9a46c', '#a8703f'); c.fill(); c.lineWidth = 2.5; c.strokeStyle = ink; c.stroke();
        c.strokeStyle = 'rgba(90,50,20,0.25)'; c.lineWidth = 1.2;
        for (let r = 0.25; r < 0.9; r += 0.22) { ell(cx + 3, cy + 1, (w / 2) * r, (h / 2 - 4) * r); c.stroke(); }
        c.fillStyle = 'rgba(255,255,255,0.25)'; ell(cx - w * 0.18, cy - h * 0.18, w * 0.16, h * 0.07); c.fill();
        if (F.style === 'tiles') { // витрина: стопки коробочек
          for (let i = 0; i < 3; i++) { path(cx - 18 + i * 13, cy - 8, 11, 14, 2); fs(['#ff8fb1', '#7fd1ff', '#ffd36b'][i], 1.5); }
        } else {
          ell(cx - w * 0.15, cy + 1, 10, 7); fs('#ffffff', 2);
          c.fillStyle = '#ff9a5a'; ell(cx - w * 0.15, cy + 1, 5, 2.5); c.fill(); c.beginPath(); c.moveTo(cx - w * 0.15 + 4, cy + 1); c.lineTo(cx - w * 0.15 + 8, cy - 2); c.lineTo(cx - w * 0.15 + 8, cy + 4); c.fill();
          ell(cx + w * 0.17, cy - 1, 6, 6); fs('#ffffff', 2); ell(cx + w * 0.17, cy - 1, 3.5, 3.5); c.fillStyle = '#8a5a36'; c.fill();
          c.lineWidth = 2; c.strokeStyle = ink; c.beginPath(); c.arc(cx + w * 0.17 + 7, cy - 1, 3, -1.2, 1.2); c.stroke();
        }
        break;
      }
      case 'box': {
        if (F.style === 'deck') { // деревянный ящик
          block('#c99a5e', '#94693b', h * 0.3, 3);
          c.strokeStyle = 'rgba(70,40,20,0.5)'; c.lineWidth = 1.5;
          for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x + 2, y + ((h * 0.7) / 4) * i); c.lineTo(x + w - 2, y + ((h * 0.7) / 4) * i); c.stroke(); }
          c.fillStyle = '#5b4e3e'; for (const [px, py] of [[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h * 0.7 - 5], [x + w - 5, y + h * 0.7 - 5]]) { c.beginPath(); c.arc(px, py, 1.8, 0, 7); c.fill(); }
          c.font = '900 9px system-ui'; c.textAlign = 'center'; c.fillStyle = 'rgba(70,40,20,0.6)'; c.fillText('FISH', cx, y + h * 0.88);
        } else {
          block('#e3b071', '#b9844a', h * 0.28, 3);
          c.fillStyle = '#f3dcae'; c.fillRect(cx - 4, y + 1.5, 8, h * 0.72 - 3);
          c.strokeStyle = 'rgba(120,80,40,0.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 3, cy - h * 0.14); c.lineTo(x + w - 3, cy - h * 0.14); c.stroke();
          if (R() < 0.5) { c.fillStyle = '#ff5c7a'; c.font = '900 8px system-ui'; c.textAlign = 'center'; c.fillText('♥', x + w * 0.78, y + h * 0.9); }
          if (R() < 0.4) { ell(x + w * 0.25, y + h * 0.25, 6, 5); fs('#ff8fb1', 1.5); c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.beginPath(); c.arc(x + w * 0.25, y + h * 0.25, 3, 0.5, 4); c.stroke(); }
        }
        break;
      }
      case 'shelf': {
        block('#7a5640', '#5c3f2e', h * 0.62, 4);
        const fy = y + h * 0.38 + 3, fh = h * 0.62 - 7, n = Math.floor((w - 6) / 7);
        for (let i = 0; i < n; i++) { const bh = fh * (0.7 + R() * 0.3); c.fillStyle = ['#ff8fb1', '#7fd1ff', '#8ee08a', '#ffd36b', '#c9a0ff', '#ff9a5a'][Math.floor(R() * 6)]; c.fillRect(x + 4 + i * 7, fy + fh - bh, 6, bh); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x + 5 + i * 7, fy + fh - bh + 3, 4, 2); }
        c.strokeStyle = ink; c.lineWidth = 2; c.strokeRect(x + 3, fy, w - 6, fh);
        break;
      }
      case 'rack': {
        c.fillStyle = 'rgba(30,15,50,0.18)'; ell(cx + 4, y + h - 2, w / 2, 7); c.fill();
        c.strokeStyle = ink; c.lineWidth = 6; c.beginPath(); c.moveTo(x + 4, y + 10); c.lineTo(x + w - 4, y + 10); c.stroke();
        c.strokeStyle = '#d8dce8'; c.lineWidth = 3; c.stroke();
        for (const px of [x + 6, x + w - 6]) { c.strokeStyle = ink; c.lineWidth = 5; c.beginPath(); c.moveTo(px, y + 10); c.lineTo(px, y + h - 2); c.stroke(); c.strokeStyle = '#c0c4d4'; c.lineWidth = 2.5; c.stroke(); }
        const n = Math.max(2, Math.floor((w - 14) / 13));
        for (let i = 0; i < n; i++) {
          const px = x + 10 + i * ((w - 20) / (n - 1 || 1)), col = ['#ff8fb1', '#7fd1ff', '#ffd36b', '#8ee08a', '#c9a0ff'][Math.floor(R() * 5)], sh = h * 0.62;
          c.strokeStyle = ink; c.lineWidth = 1.5; c.beginPath(); c.arc(px, y + 8, 3, PI, 0); c.stroke();
          c.beginPath(); c.moveTo(px - 7, y + 12); c.lineTo(px - 11, y + 18); c.lineTo(px - 7, y + 20); c.lineTo(px - 6, y + 12 + sh); c.lineTo(px + 6, y + 12 + sh); c.lineTo(px + 7, y + 20); c.lineTo(px + 11, y + 18); c.lineTo(px + 7, y + 12); c.closePath();
          c.fillStyle = vg(y, y + sh, shade(col, 0.2), shade(col, -0.15)); c.fill(); c.lineWidth = 2; c.stroke();
        }
        break;
      }
      case 'armor': {
        c.fillStyle = 'rgba(30,15,50,0.22)'; ell(cx + 4, y + h - 4, w / 2, h * 0.18); c.fill();
        ell(cx, y + h - 7, w / 2 - 2, h * 0.16); fs('#6e6488', 2.5);
        path(cx - w * 0.3, cy - h * 0.12, w * 0.6, h * 0.55, 10); fs(hg(cx - w * 0.3, cx + w * 0.3, [[0, '#9aa0b4'], [0.35, '#f4f6fb'], [1, '#8a90a6']]));
        c.strokeStyle = 'rgba(43,35,64,0.4)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx, cy - h * 0.1); c.lineTo(cx, cy + h * 0.4); c.stroke();
        ell(cx, cy - h * 0.25, w * 0.26, h * 0.24); c.fillStyle = rg(cx, cy - h * 0.25, w * 0.3, '#ffffff', '#9aa0b4'); c.fill(); c.lineWidth = 2.5; c.strokeStyle = ink; c.stroke();
        c.fillStyle = ink; c.fillRect(cx - w * 0.18, cy - h * 0.27, w * 0.36, 3);
        c.fillStyle = '#ff4d6d'; c.beginPath(); c.moveTo(cx, cy - h * 0.48); c.quadraticCurveTo(cx + w * 0.4, cy - h * 0.6, cx + w * 0.3, cy - h * 0.2); c.quadraticCurveTo(cx + w * 0.15, cy - h * 0.4, cx, cy - h * 0.42); c.closePath(); c.fill(); c.lineWidth = 2; c.stroke();
        break;
      }
      case 'barrel': {
        c.fillStyle = 'rgba(30,15,50,0.2)'; ell(cx + 4, y + h * 0.85, w / 2, h * 0.16); c.fill();
        const ty = y + h * 0.22, by = y + h * 0.8, ry = h * 0.17;
        c.beginPath(); c.moveTo(x, ty); c.lineTo(x, by); c.ellipse(cx, by, w / 2, ry, 0, PI, 0, true); c.lineTo(x + w, ty); c.closePath();
        c.fillStyle = hg(x, x + w, [[0, '#7a4e2e'], [0.35, '#d29a64'], [0.7, '#a8703f'], [1, '#6e4428']]); c.fill(); c.lineWidth = 3; c.strokeStyle = ink; c.stroke();
        c.strokeStyle = 'rgba(70,40,20,0.35)'; c.lineWidth = 1.2; for (let i = 1; i < 5; i++) { const px = x + (w / 5) * i; c.beginPath(); c.moveTo(px, ty); c.lineTo(px, by + ry * Math.sin(Math.acos(Math.min(1, Math.abs(px - cx) / (w / 2))))); c.stroke(); }
        for (const ky of [ty + (by - ty) * 0.25, ty + (by - ty) * 0.8]) { c.strokeStyle = '#4a4458'; c.lineWidth = 3.5; c.beginPath(); c.ellipse(cx, ky, w / 2, ry, 0, 0, PI); c.stroke(); }
        ell(cx, ty, w / 2, ry); c.fillStyle = vg(ty - ry, ty + ry, '#e6b47a', '#b9844a'); c.fill(); c.lineWidth = 3; c.strokeStyle = ink; c.stroke();
        c.strokeStyle = 'rgba(70,40,20,0.35)'; c.lineWidth = 1.2; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x + 4, ty + i * ry * 0.5); c.lineTo(x + w - 4, ty + i * ry * 0.5); c.stroke(); }
        break;
      }
      case 'anchor': {
        const draw = () => { c.beginPath(); c.moveTo(cx, y + 8); c.lineTo(cx, y + h - 4); c.moveTo(x + 3, cy + 4); c.quadraticCurveTo(cx, y + h + 10, x + w - 3, cy + 4); c.moveTo(cx - w * 0.25, y + h * 0.3); c.lineTo(cx + w * 0.25, y + h * 0.3); c.stroke(); };
        c.lineCap = 'round'; c.strokeStyle = ink; c.lineWidth = 10; draw(); c.strokeStyle = '#7a8496'; c.lineWidth = 6; draw(); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 1.5, y + 12); c.lineTo(cx - 1.5, y + h - 8); c.stroke(); c.lineCap = 'butt';
        c.beginPath(); c.arc(cx, y + 6, 5, 0, 7); c.lineWidth = 5; c.strokeStyle = ink; c.stroke(); c.lineWidth = 2.5; c.strokeStyle = '#9aa4b6'; c.stroke();
        for (const ax of [x + 3, x + w - 3]) { c.fillStyle = '#7a8496'; c.beginPath(); c.moveTo(ax, cy - 3); c.lineTo(ax + (ax < cx ? -4 : 4), cy + 8); c.lineTo(ax + (ax < cx ? 6 : -6), cy + 6); c.closePath(); c.fill(); c.lineWidth = 2; c.strokeStyle = ink; c.stroke(); }
        break;
      }
      case 'rope': {
        c.lineCap = 'round';
        const spiral = () => { c.beginPath(); for (let t = 0; t < PI * 6; t += 0.15) { const r = 3 + t * 1.25; const px = cx + Math.cos(t) * r, py = cy + Math.sin(t) * r * 0.8; if (t) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke(); };
        c.strokeStyle = ink; c.lineWidth = 7; spiral(); c.strokeStyle = '#d6b07a'; c.lineWidth = 4; spiral();
        c.setLineDash([2, 4]); c.strokeStyle = '#a07a46'; c.lineWidth = 2; spiral(); c.setLineDash([]); c.lineCap = 'butt';
        break;
      }
      case 'buoy': {
        c.fillStyle = 'rgba(30,15,50,0.2)'; ell(cx + 4, cy + 6, w / 2 - 2, h / 2 - 4); c.fill();
        ell(cx, cy, w / 2 - 2, h / 2 - 4); fs('#ffffff', 3);
        c.save(); ell(cx, cy, w / 2 - 2, h / 2 - 4); c.clip(); c.fillStyle = '#ff5c5c';
        for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, w, (i / 2) * PI + 0.4, (i / 2) * PI + 0.4 + PI / 4); c.closePath(); c.fill(); }
        c.restore();
        ell(cx, cy, w / 4 - 1, h / 4 - 2); fs(F.base, 2.5);
        c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2; c.beginPath(); c.ellipse(cx, cy, w / 2 - 7, h / 2 - 9, 0, PI * 1.1, PI * 1.5); c.stroke();
        break;
      }
      case 'plant': case 'bush': {
        if (kind === 'plant') {
          c.fillStyle = 'rgba(30,15,50,0.2)'; ell(cx + 4, cy + h * 0.3, w * 0.32, h * 0.12); c.fill();
          path(cx - w * 0.22, cy, w * 0.44, h * 0.38, 5); fs(vg(cy, cy + h * 0.38, '#e0835a', '#a8543a'), 2.5);
          ell(cx, cy + 1, w * 0.22, h * 0.07); fs('#6b4a33', 2);
          const n = 7; for (let i = 0; i < n; i++) leaf(cx, cy, -PI / 2 + (i - (n - 1) / 2) * 0.45, w * (0.42 + R() * 0.12), w * 0.11, i % 2 ? '#6fbf6a' : '#8ad884');
        } else {
          c.fillStyle = 'rgba(30,15,50,0.22)'; ell(cx + 5, cy + 6, w / 2, h / 2.4); c.fill();
          const blobs = []; for (let i = 0; i < 6; i++) { const a = i * 1.05 + R(); blobs.push([cx + Math.cos(a) * w * 0.2, cy + Math.sin(a) * h * 0.16, w * (0.22 + R() * 0.08)]); }
          blobs.push([cx, cy, w * 0.3]);
          c.fillStyle = ink; for (const [px, py, r] of blobs) { c.beginPath(); c.arc(px, py, r + 2.5, 0, 7); c.fill(); }
          for (const [px, py, r] of blobs) { c.fillStyle = rg(px, py, r, '#8fd187', '#4d8a48'); c.beginPath(); c.arc(px, py, r, 0, 7); c.fill(); }
          c.fillStyle = '#ff5c7a'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(cx + (R() - 0.5) * w * 0.6, cy + (R() - 0.5) * h * 0.5, 2.5, 0, 7); c.fill(); }
        }
        break;
      }
      case 'tree': {
        c.fillStyle = 'rgba(30,15,50,0.25)'; ell(cx + 10, cy + 12, w / 2, h / 2); c.fill();
        path(cx - 6, cy + h * 0.15, 12, h * 0.4, 4); fs('#7a5236', 2.5);
        const blobs = []; for (let i = 0; i < 7; i++) { const a = (i / 7) * PI * 2 + R() * 0.5; blobs.push([cx + Math.cos(a) * w * 0.28, cy - h * 0.05 + Math.sin(a) * h * 0.26, Math.min(w, h) * (0.22 + R() * 0.08)]); }
        blobs.push([cx, cy - h * 0.05, Math.min(w, h) * 0.35]);
        c.fillStyle = ink; for (const [px, py, r] of blobs) { c.beginPath(); c.arc(px, py, r + 3, 0, 7); c.fill(); }
        for (const [px, py, r] of blobs) { c.fillStyle = rg(px, py, r, '#7fbf75', '#3f6e3c'); c.beginPath(); c.arc(px, py, r, 0, 7); c.fill(); }
        c.fillStyle = 'rgba(255,255,255,0.18)'; for (const [px, py, r] of blobs.slice(0, 4)) { c.beginPath(); c.arc(px - r * 0.3, py - r * 0.35, r * 0.35, 0, 7); c.fill(); }
        break;
      }
      case 'grave': {
        c.fillStyle = '#6b5a45'; ell(cx, y + h - 6, w / 2 + 4, h * 0.16); c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(43,35,64,0.5)'; c.stroke();
        c.fillStyle = 'rgba(30,15,50,0.22)'; ell(cx + 6, y + h - 4, w / 2, h * 0.12); c.fill();
        const cross = R() < 0.3, top = y + 2, bot = y + h - 8;
        c.beginPath();
        if (cross) { const t = w * 0.18; c.moveTo(cx - t, bot); c.lineTo(cx - t, top + h * 0.32); c.lineTo(x + 2, top + h * 0.32); c.lineTo(x + 2, top + h * 0.12); c.lineTo(cx - t, top + h * 0.12); c.lineTo(cx - t, top); c.lineTo(cx + t, top); c.lineTo(cx + t, top + h * 0.12); c.lineTo(x + w - 2, top + h * 0.12); c.lineTo(x + w - 2, top + h * 0.32); c.lineTo(cx + t, top + h * 0.32); c.lineTo(cx + t, bot); c.closePath(); }
        else { c.moveTo(x + 2, bot); c.lineTo(x + 2, top + w / 2); c.arc(cx, top + w / 2, w / 2 - 2, PI, 0); c.lineTo(x + w - 2, bot); c.closePath(); }
        c.fillStyle = hg(x, x + w, [[0, '#9a96aa'], [0.3, '#d6d2e2'], [1, '#8a8698']]); c.fill(); c.lineWidth = 3; c.strokeStyle = ink; c.stroke();
        if (!cross) {
          c.fillStyle = 'rgba(43,35,64,0.35)'; c.fillRect(cx - 1.5, top + w * 0.35, 3, h * 0.28); c.fillRect(cx - 6, top + w * 0.45, 12, 3);
          c.fillRect(x + 8, bot - h * 0.2, w - 16, 2); c.fillRect(x + 10, bot - h * 0.14, w - 20, 2);
        }
        c.strokeStyle = 'rgba(43,35,64,0.45)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + w * 0.7, top + h * 0.2); c.lineTo(x + w * 0.62, top + h * 0.35); c.lineTo(x + w * 0.72, top + h * 0.45); c.stroke();
        c.fillStyle = 'rgba(111,170,98,0.75)'; ell(x + w * 0.22, bot - 4, 6, 3.5); c.fill(); ell(x + w * 0.3, bot - 2, 4, 2.5); c.fill();
        if (R() < 0.5) { for (let i = 0; i < 3; i++) { const fx = cx - 8 + i * 8; c.strokeStyle = '#4d8a48'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(fx, bot + 6); c.lineTo(fx, bot + 1); c.stroke(); c.fillStyle = ['#ff8fb1', '#fff3a6', '#c9a0ff'][i]; c.beginPath(); c.arc(fx, bot, 2.5, 0, 7); c.fill(); } }
        break;
      }
      case 'pumpkin': {
        c.fillStyle = 'rgba(30,15,50,0.22)'; ell(cx + 4, cy + h * 0.3, w / 2.2, h / 6); c.fill();
        const rx = w / 2.2, ry = h / 2.6;
        c.fillStyle = ink; ell(cx, cy, rx + 2.5, ry + 2.5); c.fill();
        for (const [ox, k] of [[-0.55, 0.55], [0.55, 0.55], [-0.25, 0.75], [0.25, 0.75], [0, 0.6]]) { ell(cx + ox * rx * 0.75, cy, rx * k, ry); c.fillStyle = rg(cx + ox * rx * 0.75, cy, rx * k, '#ffc078', '#e8742a'); c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(140,60,20,0.5)'; c.stroke(); }
        c.fillStyle = '#5a8f5a'; path(cx - 2.5, cy - ry - 6, 5, 9, 2); c.fill(); c.lineWidth = 2; c.strokeStyle = ink; c.stroke();
        leaf(cx + 2, cy - ry - 2, -0.3, 12, 4, '#6fae62');
        if (R() < 0.5) { glow(cx, cy, rx * 1.4, 'rgba(255,200,80,0.35)'); c.fillStyle = '#ffe28a'; c.beginPath(); c.moveTo(cx - rx * 0.5, cy - 3); c.lineTo(cx - rx * 0.3, cy - ry * 0.5); c.lineTo(cx - rx * 0.1, cy - 3); c.closePath(); c.moveTo(cx + rx * 0.5, cy - 3); c.lineTo(cx + rx * 0.3, cy - ry * 0.5); c.lineTo(cx + rx * 0.1, cy - 3); c.closePath(); c.fill(); c.beginPath(); c.moveTo(cx - rx * 0.5, cy + ry * 0.2); c.quadraticCurveTo(cx, cy + ry * 0.75, cx + rx * 0.5, cy + ry * 0.2); c.quadraticCurveTo(cx, cy + ry * 0.45, cx - rx * 0.5, cy + ry * 0.2); c.fill(); }
        break;
      }
      case 'lamp': {
        if (F.style === 'checker') { // канделябр
          glow(cx, cy, 52, 'rgba(255,220,130,0.45)');
          ell(cx, cy + 6, 14, 6); fs('#c9a24d', 2);
          for (const ox of [-10, 0, 10]) { path(cx + ox - 3, cy - 10 - (ox ? 0 : 5), 6, 14 + (ox ? 0 : 5), 2); fs('#fff7e6', 1.5); c.fillStyle = '#ffb347'; c.beginPath(); c.ellipse(cx + ox, cy - 14 - (ox ? 0 : 5), 3, 5, 0, 0, 7); c.fill(); c.fillStyle = '#fff3a6'; c.beginPath(); c.arc(cx + ox, cy - 12 - (ox ? 0 : 5), 1.5, 0, 7); c.fill(); }
        } else if (F.style === 'deck' || F.style === 'grass') { // фонарь на столбе
          glow(cx, cy - 6, 58, 'rgba(255,220,130,0.45)');
          c.fillStyle = 'rgba(30,15,50,0.2)'; ell(cx + 4, cy + 14, 9, 4); c.fill();
          path(cx - 2.5, cy - 4, 5, 20, 2); fs('#3f3a4f', 2);
          path(cx - 8, cy - 18, 16, 16, 4); fs('#ffe28a', 2.5);
          c.strokeStyle = ink; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx, cy - 18); c.lineTo(cx, cy - 2); c.moveTo(cx - 8, cy - 10); c.lineTo(cx + 8, cy - 10); c.stroke();
          c.fillStyle = '#3f3a4f'; c.beginPath(); c.moveTo(cx - 10, cy - 18); c.lineTo(cx, cy - 25); c.lineTo(cx + 10, cy - 18); c.closePath(); c.fill(); c.lineWidth = 2; c.stroke();
        } else { // торшер
          glow(cx, cy, 50, 'rgba(255,235,160,0.45)');
          c.fillStyle = 'rgba(30,15,50,0.2)'; ell(cx + 4, cy + 4, 15, 13); c.fill();
          ell(cx, cy, 15, 13); c.fillStyle = rg(cx, cy, 15, '#fff6d0', F.style === 'tiles' ? '#ffb3c6' : '#f0c46b'); c.fill(); c.lineWidth = 2.5; c.strokeStyle = ink; c.stroke();
          ell(cx, cy, 5, 4.5); c.fillStyle = '#fffbe8'; c.fill(); c.lineWidth = 1.5; c.stroke();
        }
        break;
      }
      case 'yarn': {
        c.fillStyle = 'rgba(30,15,50,0.2)'; ell(cx + 3, cy + 6, w * 0.3, h * 0.12); c.fill();
        const col = ['#ff8fb1', '#7fd1ff', '#c9a0ff'][Math.floor(R() * 3)], r = Math.min(w, h) * 0.3;
        c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fillStyle = rg(cx, cy, r, shade(col, 0.4), shade(col, -0.15)); c.fill(); c.lineWidth = 2.5; c.strokeStyle = ink; c.stroke();
        c.save(); c.beginPath(); c.arc(cx, cy, r, 0, 7); c.clip(); c.strokeStyle = shade(col, -0.3); c.lineWidth = 1.3;
        c.beginPath(); c.ellipse(cx, cy, r * 1.1, r * 0.35, 0.7, 0, 7); c.stroke();
        for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(cx - r, cy + i * 4); c.quadraticCurveTo(cx, cy + i * 4 - 6, cx + r, cy + i * 4); c.stroke(); }
        c.restore();
        c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(cx + r * 0.7, cy + r * 0.6); c.bezierCurveTo(cx + r * 1.6, cy + r, cx + r * 0.6, cy + r * 1.8, cx + r * 1.8, cy + r * 1.6); c.stroke();
        break;
      }
      case 'chest': {
        block('#b07a4f', '#7a4e2e', h * 0.42, 5);
        c.fillStyle = '#e0b54d'; for (const px of [x + 6, x + w - 12]) { c.fillRect(px, y + 1.5, 6, h - 3); }
        c.strokeStyle = ink; c.lineWidth = 1.5; for (const px of [x + 6, x + w - 12]) c.strokeRect(px, y + 1.5, 6, h - 3);
        path(cx - 5, y + h * 0.5, 10, 12, 2); fs('#ffd24d', 2); c.fillStyle = ink; c.fillRect(cx - 1, y + h * 0.5 + 5, 2, 4);
        c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x + 14, y + 4, w - 28, 3);
        break;
      }
      case 'mannequin': {
        c.fillStyle = 'rgba(30,15,50,0.22)'; ell(cx + 4, y + h - 4, w * 0.35, h * 0.1); c.fill();
        ell(cx, y + h - 6, w * 0.3, h * 0.08); fs('#6b5f86', 2);
        c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(cx, y + h - 8); c.lineTo(cx, cy + h * 0.15); c.stroke();
        const col = ['#ff8fb1', '#7fd1ff', '#ffd36b', '#c9a0ff'][Math.floor(R() * 4)];
        c.beginPath(); c.moveTo(cx - w * 0.3, cy - h * 0.15); c.quadraticCurveTo(cx, cy - h * 0.25, cx + w * 0.3, cy - h * 0.15); c.lineTo(cx + w * 0.36, cy + h * 0.22); c.lineTo(cx - w * 0.36, cy + h * 0.22); c.closePath();
        c.fillStyle = vg(cy - h * 0.2, cy + h * 0.22, shade(col, 0.25), shade(col, -0.15)); c.fill(); c.lineWidth = 2.5; c.stroke();
        c.beginPath(); c.arc(cx, cy - h * 0.3, Math.min(w, h) * 0.13, 0, 7); c.fillStyle = rg(cx, cy - h * 0.3, 8, '#fff3e6', '#e0c8b0'); c.fill(); c.lineWidth = 2; c.stroke();
        break;
      }
      case 'crystal': { // ледяной кристалл
        glow(cx, cy, 50, 'rgba(170,230,255,0.45)');
        c.fillStyle = 'rgba(30,15,50,0.2)'; ell(cx + 4, y + h - 2, w * 0.4, h * 0.12); c.fill();
        [[-0.25, 0.75, -0.25], [0.22, 0.6, 0.3], [0, 1, 0]].forEach(([ox, k, rot]) => {
          c.save(); c.translate(cx + ox * w, y + h - 4); c.rotate(rot);
          const hh = h * k, ww = w * 0.22;
          c.beginPath(); c.moveTo(-ww, 0); c.lineTo(-ww, -hh * 0.7); c.lineTo(0, -hh); c.lineTo(ww, -hh * 0.7); c.lineTo(ww, 0); c.closePath();
          c.fillStyle = hg(-ww, ww, [[0, '#e8fbff'], [0.5, '#9fdcff'], [1, '#5fb0e0']]); c.fill(); c.lineWidth = 2.5; c.strokeStyle = ink; c.stroke();
          c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(-ww * 0.6, -hh * 0.65, ww * 0.3, hh * 0.5);
          c.restore();
        });
        break;
      }
      case 'snowman': {
        c.fillStyle = 'rgba(30,15,50,0.2)'; ell(cx + 4, y + h - 3, w * 0.38, h * 0.12); c.fill();
        const r1 = Math.min(w, h) * 0.3, r2 = r1 * 0.7;
        c.beginPath(); c.arc(cx, y + h - r1 - 2, r1, 0, 7); c.fillStyle = rg(cx, y + h - r1 - 2, r1, '#ffffff', '#cfe6f5'); c.fill(); c.lineWidth = 2.5; c.strokeStyle = ink; c.stroke();
        c.beginPath(); c.arc(cx, y + h - r1 * 2 - r2 + 2, r2, 0, 7); c.fillStyle = rg(cx, y + h - r1 * 2 - r2, r2, '#ffffff', '#cfe6f5'); c.fill(); c.stroke();
        const hy = y + h - r1 * 2 - r2 + 2;
        c.fillStyle = ink; c.beginPath(); c.arc(cx - r2 * 0.35, hy - r2 * 0.15, 2, 0, 7); c.arc(cx + r2 * 0.35, hy - r2 * 0.15, 2, 0, 7); c.fill();
        c.fillStyle = '#ff9f1a'; c.beginPath(); c.moveTo(cx, hy); c.lineTo(cx + r2 * 0.8, hy + 2); c.lineTo(cx, hy + 4); c.closePath(); c.fill();
        c.fillStyle = '#e8304f'; c.fillRect(cx - r2, hy + r2 * 0.6, r2 * 2, 5);
        break;
      }
      case 'vat': { // колба-бак с зелёной жидкостью
        glow(cx, cy, 56, 'rgba(120,255,140,0.4)');
        shadow(w * 0.4);
        path(x + 4, y + 4, w - 8, h - 8, w * 0.4); c.fillStyle = 'rgba(220,255,230,0.75)'; c.fill(); c.lineWidth = 3; c.strokeStyle = ink; c.stroke();
        c.save(); path(x + 4, y + 4, w - 8, h - 8, w * 0.4); c.clip(); c.fillStyle = vg(cy - 4, y + h, '#7dff9e', '#2fbf5e'); c.fillRect(x, cy - 4, w, h); 
        c.fillStyle = 'rgba(255,255,255,0.6)'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x + 10 + R() * (w - 20), cy + R() * (h / 2 - 8), 2 + R() * 3, 0, 7); c.fill(); }
        c.restore();
        path(x + 2, y + h - 12, w - 4, 10, 4); fs('#6b7884', 2.5);
        c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(x + 10, y + 12, 4, h * 0.4);
        break;
      }
      case 'flasks': { // стол с колбами
        shadow(8); path(x, y + h * 0.35, w, h * 0.65, 8); fs(vg(y + h * 0.35, y + h, '#a0abb5', '#77838e'));
        const cols = ['#7dff9e', '#ff7a9c', '#7fd1ff', '#ffd84d'];
        for (let i = 0; i < 3; i++) { const fx = x + w * (0.2 + i * 0.3), col = cols[Math.floor(R() * cols.length)]; glow(fx, y + h * 0.3, 18, alpha(col, 0.5)); c.beginPath(); c.moveTo(fx - 3, y + h * 0.05); c.lineTo(fx - 3, y + h * 0.2); c.lineTo(fx - 10, y + h * 0.42); c.lineTo(fx + 10, y + h * 0.42); c.lineTo(fx + 3, y + h * 0.2); c.lineTo(fx + 3, y + h * 0.05); c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 2; c.strokeStyle = ink; c.stroke(); }
        break;
      }
      case 'pillar': { // колонна дворца
        c.fillStyle = 'rgba(30,15,50,0.22)'; ell(cx + 5, y + h - 2, w * 0.42, h * 0.12); c.fill();
        path(x + w * 0.2, y + 8, w * 0.6, h - 14, 4); fs(hg(x + w * 0.2, x + w * 0.8, [[0, '#d8ccf0'], [0.4, '#ffffff'], [1, '#b8a8e0']]));
        c.strokeStyle = 'rgba(120,100,170,0.4)'; c.lineWidth = 1.5; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x + w * (0.2 + k * 0.15), y + 12); c.lineTo(x + w * (0.2 + k * 0.15), y + h - 10); c.stroke(); }
        path(x + w * 0.08, y, w * 0.84, 12, 3); fs('#ffd84d', 2.5);
        path(x + w * 0.08, y + h - 10, w * 0.84, 10, 3); fs('#ffd84d', 2.5);
        break;
      }
      case 'mirror': { // волшебное зеркало
        glow(cx, cy, 48, 'rgba(200,170,255,0.4)');
        c.fillStyle = 'rgba(30,15,50,0.2)'; ell(cx + 4, y + h - 2, w * 0.36, h * 0.1); c.fill();
        ell(cx, cy, w * 0.36, h * 0.46); c.fillStyle = '#ffd84d'; c.fill(); c.lineWidth = 3; c.strokeStyle = ink; c.stroke();
        ell(cx, cy, w * 0.27, h * 0.37); c.fillStyle = vg(y, y + h, '#e6f0ff', '#a8b8f0'); c.fill(); c.lineWidth = 2; c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx - w * 0.12, cy - h * 0.15); c.lineTo(cx - w * 0.02, cy - h * 0.25); c.stroke();
        break;
      }
      case 'candles': {
        glow(cx, cy, 44, 'rgba(255,210,120,0.4)');
        for (let i = 0; i < 4; i++) { const px = x + 6 + R() * (w - 12), py = y + 8 + R() * (h - 12), ch = 8 + R() * 10; path(px - 3, py - ch, 6, ch, 2); fs('#fff7e6', 1.5); c.fillStyle = '#ffb347'; c.beginPath(); c.ellipse(px, py - ch - 4, 2.5, 4.5, 0, 0, 7); c.fill(); c.fillStyle = '#fff3a6'; c.beginPath(); c.arc(px, py - ch - 3, 1.2, 0, 7); c.fill(); }
        break;
      }
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
    const x = g.x + (g.windup || g.fuse ? Math.sin(time * 50) * 2.5 : 0), y = g.y + Math.sin(g.phase) * 4;
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
    if (g.elite && !g.dying) { // элита: золотое сияние и вращающиеся искры
      const eg = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 1.9);
      eg.addColorStop(0, 'rgba(255,215,80,0.55)'); eg.addColorStop(1, 'rgba(255,215,80,0)');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, 7); ctx.fill();
      for (let i = 0; i < 4; i++) { const an = time * 2.5 + i * Math.PI / 2; ctx.fillStyle = '#fff3a6'; ctx.beginPath(); ctx.arc(x + Math.cos(an) * r * 1.35, y + Math.sin(an) * r * 0.9, 3, 0, 7); ctx.fill(); }
    }
    if (g.fuse) { const f = 0.5 + 0.5 * Math.sin(time * 30); ctx.fillStyle = `rgba(255,90,60,${0.25 + 0.35 * f})`; ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, 7); ctx.fill(); }
    if (g.beh === 'heal' && !g.dying && g.bt < 1) { ctx.fillStyle = `rgba(95,211,138,${0.35 * (1 - g.bt)})`; ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, 7); ctx.fill(); }
    const dx = cat.x - g.x, dy = cat.y - g.y, dl = Math.hypot(dx, dy) || 1;
    ghostSprite(g.type, x, y, r, { hit: g.hit > 0 || (g.fuse && Math.sin(time * 30) > 0), phase: g.phase, lookX: dx / dl, lookY: dy / dl });
    if (g.elite && !g.dying) { // корона
      ctx.save(); ctx.translate(x, y - r * 1.05);
      ctx.beginPath(); ctx.moveTo(-10, 4); ctx.lineTo(-11, -6); ctx.lineTo(-5, -1); ctx.lineTo(0, -9); ctx.lineTo(5, -1); ctx.lineTo(11, -6); ctx.lineTo(10, 4); ctx.closePath();
      ctx.fillStyle = '#ffd84d'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = '#ff5c8a'; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    if (g.hp > 0 && !g.capturing && g.alpha > 0.5) {
      if (!g.boss) {
        const w = r * 2;
        rr(x - w / 2, g.y - r - 14, w, 5, 2); ctx.fillStyle = INK; ctx.fill();
        rr(x - w / 2, g.y - r - 14, w * Math.max(0, g.hp / g.maxHp), 5, 2); ctx.fillStyle = low ? '#7dff9e' : '#ff6b8a'; ctx.fill();
        if (g.beh) behIcon(g.beh, x - w / 2 - 8, g.y - r - 11.5, 6.5);
      }
      if (low) text('ТАП!', x, g.y + r + 22, 12, '#7dff9e');
    }
  }

  // Значок поведения призрака: кружок цвета поведения и рисунок внутри
  function behIcon(kind, x, y, s) {
    const c = BEHAVIORS[kind].color;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = c; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, s * 0.25);
    ctx.beginPath(); ctx.arc(0, 0, s, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.2, s * 0.22); ctx.lineCap = 'round';
    const k = s * 0.55;
    ctx.beginPath();
    if (kind === 'split') { ctx.arc(-k * 0.5, 0, k * 0.42, 0, 7); ctx.moveTo(k * 0.92, 0); ctx.arc(k * 0.5, 0, k * 0.42, 0, 7); ctx.fill(); }
    else if (kind === 'kite') { ctx.arc(0, 0, k * 0.7, 0, 7); ctx.moveTo(-k, 0); ctx.lineTo(k, 0); ctx.moveTo(0, -k); ctx.lineTo(0, k); ctx.stroke(); }
    else if (kind === 'charge') { ctx.moveTo(-k, -k * 0.7); ctx.lineTo(0, 0); ctx.lineTo(-k, k * 0.7); ctx.moveTo(-k * 0.1, -k * 0.7); ctx.lineTo(k * 0.9, 0); ctx.lineTo(-k * 0.1, k * 0.7); ctx.stroke(); }
    else if (kind === 'blink') { for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * k, Math.sin(a) * k); } ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, k * 0.3, 0, 7); ctx.fill(); }
    else if (kind === 'heal') { ctx.fillRect(-k * 0.25, -k * 0.8, k * 0.5, k * 1.6); ctx.fillRect(-k * 0.8, -k * 0.25, k * 1.6, k * 0.5); }
    else if (kind === 'bomber') { ctx.arc(-k * 0.1, k * 0.15, k * 0.6, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(k * 0.3, -k * 0.3); ctx.lineTo(k * 0.75, -k * 0.8); ctx.stroke(); }
    ctx.restore();
  }

  // Спрайт кота со скинами: используется в бою и в магазине
  function catSprite(x, gy, o) {
    const k = SKINS[o.skin] ? o.skin : 'ginger', SK = SKINS[k];
    const walk = o.walk || 0, y = gy + (o.bobY || 0), aim = o.aim === undefined ? -Math.PI / 2 : o.aim, rec = o.recoil || 0;
    const PI = Math.PI, pat = SK.pat || 'none', metal = !!SK.metal, ghost = !!SK.ghost;
    const fur = (cx, cy, rad) => {
      const g = ctx.createRadialGradient(cx - rad * 0.35, cy - rad * 0.45, rad * 0.1, cx, cy, rad * 1.3);
      g.addColorStop(0, shade(SK.body, metal ? 0.7 : 0.4)); g.addColorStop(metal ? 0.4 : 0.55, SK.body); g.addColorStop(1, shade(SK.body, metal ? -0.35 : -0.25)); return g;
    };
    const tri = (ax, ay, bx, by, cx, cy) => { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.closePath(); };
    const star = (sx, sy, s, col) => { ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.35 : s, a = -PI / 2 + (i * PI) / 4; ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); };
    const hy = y - 22;
    const light = pat === 'tuxedo' || pat === 'points';
    // тень
    ctx.fillStyle = 'rgba(30,15,50,0.25)'; ctx.beginPath(); ctx.ellipse(x, gy + 28, (ghost ? 22 : 30) - Math.abs(walk) * 3, 8, 0, 0, PI * 2); ctx.fill();
    // аура
    if (SK.aura) {
      const ar = 50 + Math.sin(time * 3) * 4, ag = ctx.createRadialGradient(x, y - 8, 10, x, y - 8, ar);
      ag.addColorStop(0, `rgba(${SK.aura},0.45)`); ag.addColorStop(1, `rgba(${SK.aura},0)`); ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(x, y - 8, ar, 0, 7); ctx.fill();
    }
    if (ghost) { ctx.save(); ctx.globalAlpha = 0.82 + Math.sin(time * 4) * 0.08; }
    // крылья ангела
    if (SK.wings) {
      const fl = Math.sin(time * 6) * 0.15;
      for (const sx of [-1, 1]) {
        ctx.save(); ctx.translate(x + sx * 14, y - 4); ctx.rotate(sx * (-0.3 + fl)); ctx.scale(sx, 1);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(22, -26, 34, -14); ctx.quadraticCurveTo(30, -8, 34, -2); ctx.quadraticCurveTo(26, 2, 28, 8); ctx.quadraticCurveTo(14, 10, 0, 6); ctx.closePath();
        ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
        ctx.strokeStyle = '#d8e4f5'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(6, 2); ctx.quadraticCurveTo(18, -6, 28, -6); ctx.stroke();
        ctx.restore();
      }
    }
    // плащ сзади
    if (SK.cape) {
      const fl = Math.sin(time * 3) * 3;
      ctx.beginPath(); ctx.moveTo(x - 18, y - 10); ctx.quadraticCurveTo(x - 36, y + 10, x - 34 - fl, y + 32);
      for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(x - 34 + i * 17 + 8.5, y + 24 + (i % 2) * 2, x - 34 + (i + 1) * 17 + (i === 3 ? fl : 0), y + 32);
      ctx.quadraticCurveTo(x + 36, y + 10, x + 18, y - 10); ctx.closePath();
      const cg = ctx.createLinearGradient(0, y - 10, 0, y + 32); cg.addColorStop(0, '#5a2346'); cg.addColorStop(1, '#2e1028'); ctx.fillStyle = cg; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = '#c2264b'; ctx.beginPath(); ctx.moveTo(x - 14, y - 6); ctx.quadraticCurveTo(x - 26, y + 12, x - 24, y + 26); ctx.lineTo(x + 24, y + 26); ctx.quadraticCurveTo(x + 26, y + 12, x + 14, y - 6); ctx.closePath(); ctx.fill();
    }
    // хвост
    const tw = Math.sin(time * 3) * 6;
    const tail = () => { ctx.beginPath(); ctx.moveTo(x + 18, y + 14); ctx.quadraticCurveTo(x + 44, y + 4 + tw, x + 36, y - 16); ctx.stroke(); };
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 12; tail();
    ctx.strokeStyle = SK.body; ctx.lineWidth = 7; tail();
    if (pat === 'tabby') { ctx.setLineDash([4, 6]); ctx.strokeStyle = SK.dark; ctx.lineWidth = 7; tail(); ctx.setLineDash([]); }
    if (pat === 'points') { ctx.setLineDash([0, 26, 40]); ctx.strokeStyle = SK.dark; ctx.lineWidth = 7; tail(); ctx.setLineDash([]); }
    if (metal) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; tail(); }
    ctx.lineCap = 'butt';
    const tipX = x + 36, tipY = y - 16, TT = SK.tail;
    if (TT === 'white') { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(tipX, tipY, 4.5, 0, 7); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); }
    if (TT === 'fluff') { ctx.fillStyle = SK.body; for (const [dx, dy] of [[0, 0], [-4, 3], [4, 2], [0, -4]]) { ctx.beginPath(); ctx.arc(tipX + dx, tipY + dy, 4.5, 0, 7); ctx.fill(); } }
    if (TT === 'ribbon') { ctx.fillStyle = '#ff4d6d'; tri(tipX - 1, tipY + 6, tipX - 9, tipY + 1, tipX - 9, tipY + 11); ctx.fill(); tri(tipX - 1, tipY + 6, tipX + 7, tipY + 1, tipX + 7, tipY + 11); ctx.fill(); }
    if (TT === 'heart') { ctx.fillStyle = '#c2264b'; ctx.beginPath(); ctx.moveTo(tipX, tipY + 4); ctx.bezierCurveTo(tipX - 9, tipY - 4, tipX - 3, tipY - 10, tipX, tipY - 5); ctx.bezierCurveTo(tipX + 3, tipY - 10, tipX + 9, tipY - 4, tipX, tipY + 4); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); }
    if (TT === 'arrow') { ctx.fillStyle = SK.dark; tri(tipX, tipY - 10, tipX - 7, tipY + 3, tipX + 7, tipY + 3); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); }
    // лапки (у призрака вместо них волнистый низ)
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    if (ghost) {
      ctx.fillStyle = fur(x, y + 18, 22); ctx.beginPath(); ctx.moveTo(x - 22, y + 12);
      for (let i = 0; i <= 6; i++) ctx.lineTo(x - 22 + i * 7.3, gy + 24 + (i % 2 ? 6 : 0) + Math.sin(time * 6 + i) * 2);
      ctx.lineTo(x + 22, y + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      for (const [fx, ph] of [[-11, 1], [11, -1]]) {
        ctx.fillStyle = pat === 'tuxedo' ? '#ffffff' : pat === 'points' ? SK.dark : shade(SK.body, -0.1);
        ctx.beginPath(); ctx.ellipse(x + fx, gy + 25 + walk * ph * 3, 8, 5, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,150,170,0.7)'; ctx.beginPath(); ctx.arc(x + fx, gy + 26 + walk * ph * 3, 1.8, 0, 7); ctx.fill();
      }
    }
    // тело
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.fillStyle = fur(x, y + 8, 24); ctx.beginPath(); ctx.ellipse(x, y + 8, 24, 20, 0, 0, PI * 2); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y + 8, 23, 19, 0, 0, PI * 2); ctx.clip();
    if (pat === 'spots') { ctx.fillStyle = SK.dark; for (const [dx, dy, r] of [[-14, 0, 5], [10, -4, 4], [-6, 18, 4], [16, 12, 5]]) { ctx.beginPath(); ctx.ellipse(x + dx, y + 8 + dy, r, r * 0.8, 0.4, 0, 7); ctx.fill(); } }
    if (pat === 'calico') { ctx.fillStyle = SK.dark; ctx.beginPath(); ctx.ellipse(x - 14, y + 4, 10, 8, 0.3, 0, 7); ctx.fill(); ctx.fillStyle = '#5a4a48'; ctx.beginPath(); ctx.ellipse(x + 15, y + 16, 8, 6, -0.3, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = light || pat === 'spots' ? '#fbf7ef' : shade(SK.body, 0.5); ctx.beginPath(); ctx.ellipse(x + 3, y + 13, pat === 'tuxedo' ? 9 : 12, pat === 'tuxedo' ? 8 : 10, 0, 0, 7); ctx.fill();
    if (pat === 'fluffy') { ctx.fillStyle = '#ffffff'; ctx.beginPath(); for (let i = 0; i <= 6; i++) ctx.lineTo(x - 9 + i * 3, y + 2 + (i % 2 ? 6 : 0)); ctx.lineTo(x + 9, y + 14); ctx.lineTo(x - 9, y + 14); ctx.closePath(); ctx.fill(); }
    if (pat === 'tabby') {
      ctx.strokeStyle = SK.dark; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(x + sx * 22, y + 2 + i * 8); ctx.lineTo(x + sx * 15, y + 4 + i * 8); ctx.stroke(); }
      ctx.lineCap = 'butt';
    }
    if (SK.mask) { ctx.fillStyle = '#2b2340'; ctx.fillRect(x - 23, y + 10, 46, 6); ctx.fillStyle = '#ff4d6d'; ctx.fillRect(x + 6, y + 9, 7, 8); }
    if (SK.cape) {
      ctx.fillStyle = '#2e1028'; tri(x - 15, y - 2, x - 2, y - 2, x - 2, y + 24); ctx.fill(); tri(x + 15, y - 2, x + 2, y - 2, x + 2, y + 24); ctx.fill();
      ctx.fillStyle = '#ffd24d'; for (const by of [y + 6, y + 13]) { ctx.beginPath(); ctx.arc(x, by, 1.8, 0, 7); ctx.fill(); }
    }
    if (SK.hat === 'chef') { ctx.fillStyle = '#ffffff'; rr(x - 12, y - 2, 24, 26, 6); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); ctx.fillStyle = '#ff5c5c'; for (const by of [y + 6, y + 14]) { ctx.beginPath(); ctx.arc(x - 5, by, 1.6, 0, 7); ctx.arc(x + 5, by, 1.6, 0, 7); ctx.fill(); } }
    if (metal) { ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(x - 10, y, 5, 9, 0.5, 0, 7); ctx.fill(); }
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    // бак-ловушка с эктоплазмой
    if (o.tool !== false) {
      rr(x - 35, y - 7, 18, 30, 6); ctx.fillStyle = o.rocket ? ATTACH.rocket.color : (SK.tank || '#8a7bd1'); ctx.fill(); ctx.stroke();
      rr(x - 31, y - 2, 10, 20, 4); ctx.fillStyle = '#243042'; ctx.fill();
      const lvl = 0.55 + Math.sin(time * 2) * 0.08;
      rr(x - 31, y - 2 + 20 * (1 - lvl), 10, 20 * lvl, 4); ctx.fillStyle = SK.liquid || '#7dff9e'; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(x - 26, y + 14 - ((time * 18) % 12), 1.6, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - 30, y, 2, 15);
      rr(x - 31, y - 2, 10, 20, 4); ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 3;
    }
    if (SK.cape) {
      ctx.fillStyle = '#2e1028'; tri(x - 12, hy + 14, x - 34, hy - 18, x - 22, hy + 18); ctx.fill(); ctx.stroke(); tri(x + 12, hy + 14, x + 34, hy - 18, x + 22, hy + 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c2264b'; tri(x - 14, hy + 12, x - 30, hy - 12, x - 22, hy + 14); ctx.fill(); tri(x + 14, hy + 12, x + 30, hy - 12, x + 22, hy + 14); ctx.fill();
    }
    if (pat === 'fluffy') { ctx.fillStyle = SK.body; for (const sx of [-1, 1]) { tri(x + sx * 22, hy - 2, x + sx * 31, hy + 6, x + sx * 21, hy + 10); ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke(); tri(x + sx * 22, hy + 6, x + sx * 29, hy + 14, x + sx * 18, hy + 15); ctx.fill(); ctx.stroke(); } }
    // уши
    ctx.lineWidth = 3; ctx.fillStyle = pat === 'points' ? SK.dark : SK.body;
    tri(x - 22, hy - 6, x - 18, hy - 30, x - 4, hy - 16); ctx.fill(); ctx.stroke();
    tri(x + 22, hy - 6, x + 18, hy - 30, x + 4, hy - 16); ctx.fill(); ctx.stroke();
    if (pat === 'calico') { ctx.fillStyle = SK.dark; tri(x - 21, hy - 7, x - 18, hy - 29, x - 8, hy - 15); ctx.fill(); }
    ctx.fillStyle = SK.ear || '#ffb3c6';
    tri(x - 18, hy - 10, x - 17, hy - 24, x - 9, hy - 16); ctx.fill(); tri(x + 18, hy - 10, x + 17, hy - 24, x + 9, hy - 16); ctx.fill();
    if (pat === 'fluffy') { ctx.fillStyle = '#ffffff'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(x + sx * 14, hy - 15, 2.5, 0, 7); ctx.fill(); } }
    // голова
    ctx.fillStyle = fur(x, hy, 26); ctx.beginPath(); ctx.ellipse(x, hy, 26, 21, 0, 0, PI * 2); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, hy, 25, 20, 0, 0, PI * 2); ctx.clip();
    if (pat === 'points') { const mg = ctx.createRadialGradient(x, hy + 5, 4, x, hy + 5, 20); mg.addColorStop(0, alpha(SK.dark, 0.95)); mg.addColorStop(1, alpha(SK.dark, 0)); ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(x, hy + 5, 20, 0, 7); ctx.fill(); }
    if (pat === 'calico') { ctx.fillStyle = SK.dark; ctx.beginPath(); ctx.ellipse(x - 14, hy - 10, 13, 10, 0.4, 0, 7); ctx.fill(); ctx.fillStyle = '#5a4a48'; ctx.beginPath(); ctx.ellipse(x + 16, hy - 12, 9, 8, -0.3, 0, 7); ctx.fill(); }
    if (pat === 'spots') { ctx.fillStyle = SK.dark; ctx.beginPath(); ctx.ellipse(x + 12, hy - 8, 7, 9, 0.3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x - 16, hy - 12, 3.5, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = pat === 'tuxedo' ? '#6e6680' : pat === 'points' ? 'rgba(0,0,0,0)' : shade(SK.body, 0.45); ctx.beginPath(); ctx.ellipse(x, hy + 8, 13, 8, 0, 0, 7); ctx.fill();
    if (metal) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(x - 13, hy - 10, 6, 3, -0.6, 0, 7); ctx.fill(); }
    // рисунок на лбу
    ctx.fillStyle = SK.dark;
    if (pat === 'tabby') { ctx.fillRect(x - 3, hy - 20, 6, 8); ctx.fillRect(x - 11, hy - 18, 4, 6); ctx.fillRect(x + 7, hy - 18, 4, 6); }
    if (SK.cape) { ctx.beginPath(); ctx.moveTo(x - 16, hy - 17); ctx.quadraticCurveTo(x - 6, hy - 14, x, hy - 6); ctx.quadraticCurveTo(x + 6, hy - 14, x + 16, hy - 17); ctx.quadraticCurveTo(x, hy - 24, x - 16, hy - 17); ctx.fill(); }
    if (SK.gem) { ctx.fillStyle = '#ff4d6d'; tri(x, hy - 19, x - 4, hy - 13, x + 4, hy - 13); ctx.fill(); tri(x - 4, hy - 13, x + 4, hy - 13, x, hy - 8); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(x, hy - 19); ctx.lineTo(x - 4, hy - 13); ctx.lineTo(x, hy - 8); ctx.lineTo(x + 4, hy - 13); ctx.closePath(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(x - 2, hy - 15, 1.5, 2); }
    if (SK.mask) {
      ctx.fillStyle = '#2b2340'; ctx.beginPath(); ctx.ellipse(x, hy - 1, 25, 7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff4d6d'; ctx.fillRect(x - 25, hy - 13, 50, 5);
      const fl = Math.sin(time * 8);
      ctx.beginPath(); ctx.moveTo(x + 23, hy - 12); ctx.quadraticCurveTo(x + 38, hy - 16 + fl * 4, x + 48, hy - 8 + fl * 5); ctx.lineTo(x + 46, hy - 4 + fl * 5); ctx.quadraticCurveTo(x + 36, hy - 10 + fl * 3, x + 23, hy - 8); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 23, hy - 10); ctx.quadraticCurveTo(x + 34, hy - 4 - fl * 3, x + 42, hy + 4 - fl * 4); ctx.lineTo(x + 39, hy + 6 - fl * 4); ctx.quadraticCurveTo(x + 32, hy - 2, x + 23, hy - 8); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.strokeRect(x - 25, hy - 13, 50, 5);
    }
    // глаза
    const elx = Math.cos(aim) * 1.6, ely = Math.sin(aim) * 1.2;
    const blink = Math.sin(time * 0.9 + (o.blinkSeed || 0)) > 0.99;
    for (const [i, ex] of [[0, x - 9], [1, x + 9]]) {
      const px = ex + elx, py = hy - 1 + ely;
      if (SK.patch && i === 0) {
        ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(ex, hy - 1, 6, 5.5, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ex - 5, hy - 4); ctx.lineTo(x + 22, hy - 14); ctx.moveTo(ex - 5, hy + 2); ctx.lineTo(x - 25, hy + 4); ctx.stroke();
        continue;
      }
      if (blink) { ctx.fillStyle = SK.mask ? '#ffffff' : INK; ctx.fillRect(ex - 4, hy - 1, 8, 2.5); continue; }
      if (SK.mask) {
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(px, py, 4.5, 3.6, 0, 0, 7); ctx.fill();
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(px + elx * 0.5, py, 2, 0, 7); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex - (i ? -6 : 6), hy - 7); ctx.lineTo(ex + (i ? -2 : 2), hy - 5); ctx.stroke();
        continue;
      }
      if (SK.eyes) {
        ctx.fillStyle = SK.eyes[i]; ctx.beginPath(); ctx.ellipse(px, py, 4.6, 5.2, 0, 0, 7); ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.stroke();
        ctx.fillStyle = ghost ? '#5fc8e0' : INK;
        if (SK.slit) { ctx.beginPath(); ctx.ellipse(px, py, 1.4, 4.2, 0, 0, 7); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(px, py + 0.5, 2.6, 0, 7); ctx.fill(); }
      } else { ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(px, py, 4, 4.8, 0, 0, PI * 2); ctx.fill(); }
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px - 1.5, py - 2, 1.6, 0, 7); ctx.fill();
      if (metal || ghost) { ctx.beginPath(); ctx.arc(px + 1.5, py + 2, 0.9, 0, 7); ctx.fill(); }
    }
    // нос, усы, щёки, рот
    ctx.fillStyle = pat === 'tuxedo' ? '#c48aa0' : pat === 'points' ? '#3a2a28' : '#ff8fa8'; tri(x - 3, hy + 3, x + 3, hy + 3, x, hy + 6); ctx.fill();
    ctx.strokeStyle = light ? 'rgba(255,255,255,0.6)' : 'rgba(43,35,64,0.55)'; ctx.lineWidth = 1.3;
    for (const sx of [-1, 1]) for (const dy of [-2, 2]) { ctx.beginPath(); ctx.moveTo(x + sx * 14, hy + 5 + dy * 0.5); ctx.lineTo(x + sx * 33, hy + 3 + dy * 2); ctx.stroke(); }
    if (!SK.mask) { ctx.fillStyle = 'rgba(255,110,140,0.55)'; ctx.beginPath(); ctx.ellipse(x - 16, hy + 7, 5, 3, 0, 0, PI * 2); ctx.ellipse(x + 16, hy + 7, 5, 3, 0, 0, PI * 2); ctx.fill(); }
    if (SK.beard) {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - 16, hy + 5);
      for (let i = 0; i <= 6; i++) ctx.quadraticCurveTo(x - 16 + i * 5.3 - 2.6, hy + 22 + (i === 3 ? 4 : 0), x - 16 + i * 5.3, hy + 16 + (i % 2 ? 0 : 3));
      ctx.lineTo(x + 16, hy + 5); ctx.quadraticCurveTo(x, hy + 10, x - 16, hy + 5); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x - 5, hy + 6, 6, 3, 0.3, 0, 7); ctx.ellipse(x + 5, hy + 6, 6, 3, -0.3, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff8fa8'; tri(x - 3, hy + 2, x + 3, hy + 2, x, hy + 5); ctx.fill();
    } else {
      ctx.strokeStyle = pat === 'tuxedo' ? '#f4f1ea' : INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 3, hy + 6); ctx.quadraticCurveTo(x, hy + 9, x, hy + 6); ctx.quadraticCurveTo(x, hy + 9, x + 3, hy + 6); ctx.stroke();
    }
    if (SK.fangs) { ctx.fillStyle = '#ffffff'; tri(x - 3, hy + 7, x - 1, hy + 7, x - 2, hy + 11); ctx.fill(); tri(x + 1, hy + 7, x + 3, hy + 7, x + 2, hy + 11); ctx.fill(); }
    // ошейник, шарф, жемчуг
    if (SK.collar) {
      ctx.strokeStyle = SK.collar; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, hy + 18, 15, 4, 0, 0.15, PI - 0.15); ctx.stroke();
      const cx2 = x, cy2 = hy + 24;
      if (SK.charm === 'bell') { ctx.fillStyle = '#ffd24d'; ctx.beginPath(); ctx.arc(cx2, cy2 - 1, 4, 0, 7); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke(); ctx.fillStyle = INK; ctx.fillRect(cx2 - 0.7, cy2 - 1, 1.4, 3); }
      if (SK.charm === 'star') { star(cx2, cy2, 4.5, '#ffd24d'); ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke(); }
      if (SK.charm === 'heart') { ctx.fillStyle = '#ff5c8a'; ctx.beginPath(); ctx.moveTo(cx2, cy2 + 3); ctx.bezierCurveTo(cx2 - 6, cy2 - 2, cx2 - 2, cy2 - 6, cx2, cy2 - 2); ctx.bezierCurveTo(cx2 + 2, cy2 - 6, cx2 + 6, cy2 - 2, cx2, cy2 + 3); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke(); }
      if (SK.charm === 'gem') { ctx.fillStyle = '#ffd24d'; tri(cx2 - 4, cy2 - 3, cx2 + 4, cy2 - 3, cx2, cy2 + 4); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke(); }
    }
    if (SK.scarf) {
      ctx.fillStyle = SK.scarf; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(x, hy + 19, 18, 5.5, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 8, hy + 20); ctx.lineTo(x + 14, hy + 36 + Math.sin(time * 3) * 2); ctx.lineTo(x + 6, hy + 37); ctx.lineTo(x + 3, hy + 21); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; for (let i = -12; i <= 12; i += 6) { ctx.beginPath(); ctx.moveTo(x + i, hy + 16); ctx.lineTo(x + i, hy + 22); ctx.stroke(); }
    }
    if (SK.pearls) { ctx.fillStyle = '#ffffff'; for (let i = -4; i <= 4; i++) { const a = PI / 2 + i * 0.28; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 15, hy + 16 + Math.sin(a) * 5, 2, 0, 7); ctx.fill(); } }
    // головные уборы
    const H = SK.hat, hc = SK.hatC;
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    if (H === 'crown') {
      ctx.fillStyle = '#ffd24d';
      ctx.beginPath(); ctx.moveTo(x - 12, hy - 18); ctx.lineTo(x - 13, hy - 31); ctx.lineTo(x - 6, hy - 24); ctx.lineTo(x, hy - 34); ctx.lineTo(x + 6, hy - 24); ctx.lineTo(x + 13, hy - 31); ctx.lineTo(x + 12, hy - 18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7fd1ff'; ctx.beginPath(); ctx.arc(x, hy - 22, 2.5, 0, 7); ctx.fill(); ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(x - 7, hy - 21, 1.8, 0, 7); ctx.arc(x + 7, hy - 21, 1.8, 0, 7); ctx.fill();
    }
    if (H === 'beanie') {
      ctx.fillStyle = hc; ctx.beginPath(); ctx.moveTo(x - 20, hy - 10); ctx.quadraticCurveTo(x - 20, hy - 32, x, hy - 32); ctx.quadraticCurveTo(x + 20, hy - 32, x + 20, hy - 10); ctx.closePath(); ctx.fill(); ctx.stroke();
      rr(x - 22, hy - 14, 44, 8, 4); ctx.fillStyle = shade(hc, -0.2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, hy - 34, 5, 0, 7); ctx.fill(); ctx.stroke();
    }
    if (H === 'flower') {
      for (let i = 0; i < 5; i++) { const a = (i / 5) * PI * 2; ctx.fillStyle = '#ff8fb1'; ctx.beginPath(); ctx.arc(x + 15 + Math.cos(a) * 4.5, hy - 18 + Math.sin(a) * 4.5, 3.6, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#ffd24d'; ctx.beginPath(); ctx.arc(x + 15, hy - 18, 2.6, 0, 7); ctx.fill();
    }
    if (H === 'headphones') {
      ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, hy - 2, 24, PI * 1.1, PI * 1.9); ctx.stroke();
      ctx.strokeStyle = hc; ctx.lineWidth = 3; ctx.stroke();
      for (const sx of [-1, 1]) { rr(x + sx * 26 - 5, hy - 8, 10, 15, 4); ctx.fillStyle = hc; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); }
    }
    if (H === 'pirate') {
      ctx.fillStyle = '#2b2340'; ctx.beginPath(); ctx.moveTo(x - 30, hy - 14); ctx.quadraticCurveTo(x, hy - 22, x + 30, hy - 14); ctx.quadraticCurveTo(x + 20, hy - 40, x, hy - 38); ctx.quadraticCurveTo(x - 20, hy - 40, x - 30, hy - 14); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#ffd24d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 26, hy - 16); ctx.quadraticCurveTo(x, hy - 23, x + 26, hy - 16); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, hy - 29, 4, 0, 7); ctx.fill(); ctx.fillStyle = INK; ctx.fillRect(x - 2.5, hy - 30, 1.6, 1.6); ctx.fillRect(x + 1, hy - 30, 1.6, 1.6);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 5, hy - 22); ctx.lineTo(x + 5, hy - 25); ctx.moveTo(x + 5, hy - 22); ctx.lineTo(x - 5, hy - 25); ctx.stroke();
    }
    if (H === 'wizard') {
      const sw = Math.sin(time * 2) * 3;
      ctx.fillStyle = hc; ctx.beginPath(); ctx.moveTo(x - 20, hy - 14); ctx.quadraticCurveTo(x - 4, hy - 30, x + 8 + sw, hy - 54); ctx.quadraticCurveTo(x + 6, hy - 30, x + 20, hy - 14); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, hy - 14, 26, 6, 0, 0, 7); ctx.fillStyle = shade(hc, -0.2); ctx.fill(); ctx.stroke();
      star(x - 4, hy - 28, 4, '#ffd24d'); star(x + 5, hy - 38, 3, '#ffd24d'); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + 8 + sw, hy - 54, 3, 0, 7); ctx.fill();
    }
    if (H === 'chef') {
      ctx.fillStyle = '#ffffff';
      for (const [dx, dy, r] of [[-10, -32, 9], [0, -37, 10], [10, -32, 9]]) { ctx.beginPath(); ctx.arc(x + dx, hy + dy, r, 0, 7); ctx.fill(); ctx.stroke(); }
      rr(x - 15, hy - 30, 30, 14, 3); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 13, hy - 33, 26, 6);
    }
    if (H === 'horns') {
      for (const sx of [-1, 1]) { ctx.fillStyle = '#3f2a3a'; ctx.beginPath(); ctx.moveTo(x + sx * 8, hy - 17); ctx.quadraticCurveTo(x + sx * 12, hy - 34, x + sx * 6, hy - 38); ctx.quadraticCurveTo(x + sx * 18, hy - 32, x + sx * 16, hy - 16); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }
    if (H === 'halo') { const hy2 = hy - 34 + Math.sin(time * 3) * 2; ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(x, hy2, 16, 5, 0, 0, 7); ctx.stroke(); ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 3.5; ctx.stroke(); }
    if (H === 'santa') {
      ctx.fillStyle = '#e8304f'; ctx.beginPath(); ctx.moveTo(x - 22, hy - 12); ctx.quadraticCurveTo(x - 6, hy - 40, x + 18, hy - 36 + Math.sin(time * 3) * 2); ctx.quadraticCurveTo(x + 12, hy - 24, x + 22, hy - 12); ctx.closePath(); ctx.fill(); ctx.stroke();
      rr(x - 24, hy - 16, 48, 9, 4.5); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + 20, hy - 36 + Math.sin(time * 3) * 2, 5, 0, 7); ctx.fill(); ctx.stroke();
    }
    if (SK.helmet) {
      const g = ctx.createRadialGradient(x - 10, hy - 14, 4, x, hy - 2, 34); g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(170,220,255,0.18)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, hy - 4, 33, 0, 7); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, hy - 4, 27, PI * 1.15, PI * 1.45); ctx.stroke();
      rr(x - 22, hy + 22, 44, 8, 4); ctx.fillStyle = '#e8e8f0'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = '#ff5c5c'; ctx.beginPath(); ctx.arc(x - 12, hy + 26, 2, 0, 7); ctx.fill(); ctx.fillStyle = '#3ddc97'; ctx.beginPath(); ctx.arc(x - 6, hy + 26, 2, 0, 7); ctx.fill();
    }
    // искры
    if (SK.sparkle) for (let i = 0; i < 3; i++) { const a = time * 2 + (i * PI * 2) / 3, sx = x + Math.cos(a) * 34, sy = y - 10 + Math.sin(a) * 26, s = 2 + Math.sin(time * 6 + i) * 1.5; star(sx, sy, s * 2, SK.sparkle); }
    if (ghost) ctx.restore();
    // нимб за Освящения
    if (o.halo && H !== 'halo') { ctx.strokeStyle = '#fff1a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, hy - (H ? 46 : 30), 14, 4, 0, 0, PI * 2); ctx.stroke(); }
    // пылесос
    if (o.tool !== false) {
      const len = 30 - rec * 4, nx = x + Math.cos(aim) * len, ny = y - 18 + Math.sin(aim) * len;
      ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.lineCap = 'round';
      const hose = () => { ctx.beginPath(); ctx.moveTo(x - 26, y); ctx.quadraticCurveTo(x - 10, y + 22, (x + nx) / 2, (y - 18 + ny) / 2 + 6); ctx.stroke(); };
      hose(); ctx.strokeStyle = '#6b5fb8'; ctx.lineWidth = 5; hose(); ctx.lineCap = 'butt';
      ctx.save(); ctx.translate(x, y - 18); ctx.rotate(aim);
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      rr(4 - rec * 4, -5, 26, 10, 4); ctx.fillStyle = metal ? '#ffd24d' : '#b9afe8'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(8 - rec * 4, -3, 18, 2.5);
      ctx.fillStyle = o.eqColor || '#ff7a9c';
      const wide = o.wide ? 6 : 0;
      rr(26 - rec * 4, -9 - wide / 2, 10, 18 + wide, 3); ctx.fill(); ctx.stroke();
      if (rec > 0.2) {
        ctx.globalCompositeOperation = 'lighter';
        const mg = ctx.createRadialGradient(40, 0, 1, 40, 0, 18 * rec + 6);
        mg.addColorStop(0, 'rgba(255,255,255,0.9)'); mg.addColorStop(0.4, alpha(o.eqColor || '#ff7a9c', 0.6)); mg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(40, 0, 18 * rec + 6, 0, 7); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
    }
  }

  function drawCat() {
    const walk = cat.moving ? Math.sin(cat.bob * 3) : 0;
    if (cat.hurt > 0 && Math.sin(time * 60) > 0) return;
    // тёплое пятно света под котом
    const lg = ctx.createRadialGradient(cat.x, cat.y + 20, 10, cat.x, cat.y + 20, 90);
    lg.addColorStop(0, 'rgba(255,240,190,0.28)'); lg.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(cat.x, cat.y + 20, 90, 0, 7); ctx.fill();
    const eq = equippedItems();
    catSprite(cat.x, cat.y, {
      skin: S.skin, walk, bobY: cat.moving ? -Math.abs(walk) * 3 : Math.sin(cat.bob) * 1.5, aim: cat.aim, recoil: cat.recoil,
      eqColor: eq.length ? ATTACH[eq[0].kind].color : '#ff7a9c', wide: kindPower('wide') > 0, rocket: kindPower('rocket') > 0, halo: S.prestiges > 0,
    });
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
    {
      const g = ctx.createLinearGradient(0, 0, 0, 70); g.addColorStop(0, '#41346a'); g.addColorStop(1, '#271e40');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, 70);
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; for (let i = -70; i < W; i += 22) { ctx.beginPath(); ctx.moveTo(i, 70); ctx.lineTo(i + 10, 70); ctx.lineTo(i + 80, 0); ctx.lineTo(i + 70, 0); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, 68, W, 2);
      const sg = ctx.createLinearGradient(0, 70, 0, 80); sg.addColorStop(0, 'rgba(10,5,25,0.45)'); sg.addColorStop(1, 'rgba(10,5,25,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 70, W, 10);
    }
    text('Дом ' + S.house, 14, 18, 16, '#ffffff', 'left');
    fitText((circle() ? 'Круг ' + (circle() + 1) + ' · ' : '') + district().name, 14, 38, 100, 10, circle() ? '#ffd84d' : '#c9c3e6', 'left', '700');
    if (raid) text('РЕЙД · ' + Math.ceil(raid.t) + ' с', 14, 55, 11, '#d68cff', 'left');
    else text(isBossRoom() ? 'БОСС' : 'Комната ' + S.room + '/' + ROOMS_PER_HOUSE, 14, 55, 11, isBossRoom() ? '#ffc94d' : '#c9c3e6', 'left');
    const p = isBossRoom() ? (bossSpawned ? Math.max(0, bossTimer / bossTime()) : 1) : Math.min(1, S.cleared / GHOSTS_PER_ROOM);
    bar(118, 46, 124, 14, p, isBossRoom() ? '#ffc94d' : '#7dff9e');
    for (let i = 1; i < ROOMS_PER_HOUSE; i++) { const px = 118 + (124 * i) / ROOMS_PER_HOUSE; const done = S.room > i; ctx.fillStyle = done ? '#ffc94d' : '#6b5f86'; ctx.beginPath(); ctx.arc(px, 42, 3, 0, 7); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke(); }
    if (isBossRoom() && bossSpawned) text(Math.ceil(bossTimer) + ' с', 180, 53, 10, '#ffffff', 'center', '800');
    pill(246, 6, 108, 24, 'ecto', fmt(S.ecto), '#ffffff');
    pill(246, 34, 52, 18, '🫙', String(S.jars), '#ffe7b0');
    pill(302, 34, 52, 18, '💎', String(S.crystals), '#9ff3ff');
    if (S.stones > 0) pill(302, 55, 52, 13, '🌙', String(S.stones), '#fff1a8');
    const rb = ghosts.find((g) => g.raid);
    if (rb) {
      bar(30, 80, 300, 18, rb.hp / rb.maxHp, '#d68cff');
      text('Призрачный особняк · этаж ' + (raid.floor + 1), 180, 89, 10, '#ffffff', 'center', '800');
    }
    const boss = ghosts.find((g) => g.boss && g.hp > 0);
    if (boss) {
      bar(30, 80, 300, 18, boss.hp / boss.maxHp, lowHp(boss) ? '#7dff9e' : '#ff6b8a');
      orb(30, 89, 12, '#ffc94d'); text('💀', 30, 90, 12, '#ffffff');
      text(GHOSTS[boss.type].name + ' · ' + fmt(boss.hp), 180, 89, 10, '#ffffff', 'center', '800');
    }
    // кнопка Полнолуния в углу боевой зоны
    const now = Date.now();
    if (unlocked('moon')) {
    const ready = !moonActive() && now >= S.moonReadyAt;
    if (ready || moonActive()) { const gg = ctx.createRadialGradient(330, 128, 16, 330, 128, 36); gg.addColorStop(0, 'rgba(255,220,120,0.55)'); gg.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(330, 128, 36, 0, 7); ctx.fill(); }
    orb(330, 128, 22, moonActive() ? '#fff1a8' : ready ? '#ffc94d' : '#6b5f86');
    text('🌕', 330, 127, 18, '#ffffff');
    const sub = moonActive() ? Math.ceil((S.moonUntil - now) / 1000) + 'с' : ready ? 'x2' : Math.ceil((S.moonReadyAt - now) / 1000) + 'с';
    text(sub, 330, 158, 11, '#ffffff');
    if (ready) badge(346, 110);
    btn(304, 102, 52, 66, () => { S.fresh = S.fresh.filter((f) => f !== 'moon'); activateMoon(); });
    if (S.fresh.includes('moon')) newTag(330, 98);
    }
    // автопрокачка и автослияние
    if (unlocked('auto')) ['up', 'merge'].forEach((k, i) => {
      const a = AUTO[k], x = 306, y = 176 + i * 58;
      const avail = autoAvailable(k), run = autoRunning(k);
      plate(x, y, 48, 50, 12, run ? '#8ee08a' : avail ? '#9b93b3' : '#8a7bd1');
      ctx.save(); ctx.translate(x + 24, y + 18); if (run) ctx.rotate(time * 2); text(a.icon, 0, 0, 16, '#ffffff'); ctx.restore();
      let sub;
      if (autoOwned(k)) sub = run ? '∞' : 'пауза';
      else if (avail) { const ms = S[a.until] - Date.now(); sub = run ? Math.floor(ms / 60000) + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0') : 'пауза'; }
      else sub = '🎬';
      text(sub, x + 24, y + 39, 10, '#ffffff');
      btn(x, y, 48, 50, () => { S.fresh = S.fresh.filter((f) => f !== 'auto'); autoButton(k); });
      if (i === 0 && S.fresh.includes('auto')) newTag(x + 24, y - 4);
    });
    // переключатель автопилота
    plate(132, 8, 92, 28, 14, S.auto ? '#6fd36a' : '#6b5f86');
    orb(S.auto ? 210 : 146, 22, 10, '#ffffff');
    text('АВТО', S.auto ? 172 : 186, 22, 11, '#ffffff');
    btn(128, 4, 100, 36, () => { S.auto = !S.auto; showToast(S.auto ? 'Автопилот включён' : 'Веди кота свайпом по экрану'); });
    if (vipActive()) { plate(86, 9, 34, 18, 9, '#ffc94d', { lw: 2 }); text('VIP', 103, 18, 10, '#ffffff'); }
    // боковые кнопки: рейд, колесо, награды дня
    if (!raid) {
      [
        { icon: '🏚', label: 'Рейд', id: 'raid', b: S.raid.tickets > 0, lock: 'raid' },
        { icon: '🎡', label: 'Колесо', id: 'wheel', b: S.wheel.free > 0, lock: 'wheel' },
        { icon: '🎁', label: 'Награды', id: 'daily', b: dailyReady(), lock: 'daily' },
      ].forEach((f, i) => {
        const x = 6, y = 104 + i * 56;
        const lockU = f.lock && !unlocked(f.lock) && UNLOCK[f.lock];
        const dn = pressOff(x, y, 46, 48);
        ctx.save(); ctx.translate(0, dn);
        plate(x, y, 46, 48, 12, lockU ? '#6b5f86' : '#8a7bd1');
        ctx.globalAlpha = lockU ? 0.45 : 1; text(f.icon, x + 23, y + 18, 17, '#ffffff'); ctx.globalAlpha = 1;
        text(lockU ? 'Дом ' + lockU.house : f.label, x + 23, y + 39, 8, '#ffffff');
        if (lockU) text('🔒', x + 34, y + 10, 10, '#ffffff');
        ctx.restore();
        if (f.b && !lockU) badge(x + 42, y + 4);
        if (S.fresh.includes(f.lock)) newTag(x + 23, y - 2);
        btn(x, y, 46, 48, () => { if (lockU) lockedToast(f.lock); else { S.fresh = S.fresh.filter((q) => q !== f.lock); panel = f.id; } });
      });
    }
    // настройки и достижения
    const cy = raid ? 116 : 284;
    orb(17, cy, 11, '#8a7bd1'); text('⚙', 17, cy + 1, 13, '#ffffff');
    btn(4, cy - 13, 26, 26, () => { panel = 'settings'; });
    if (!raid && unlocked('quests')) {
      orb(43, cy, 11, '#8a7bd1'); text('🏆', 43, cy + 1, 13, '#ffffff');
      if (anyAchReady()) badge(52, cy - 10);
      btn(30, cy - 13, 26, 26, () => { panel = 'achievements'; });
    }
  }

  const TABS = [
    { id: 'squad', lock: 'squad', icon: '👻', name: 'Отряд', badge: () => squadMergeable() },
    { id: 'attach', lock: 'attach', icon: '🧹', name: 'Насадки', badge: () => S.crystals >= SUMMON_COST || attachMergeable() },
    { id: 'bestiary', lock: 'bestiary', icon: '📖', name: 'Бестиарий', badge: () => anyBestClaimable() },
    { id: 'quests', lock: 'quests', icon: '📜', name: 'Задания', badge: () => anyQuestDone() || S.dm.list.some(missionReady) || chestReady() || passClaimable() },
    { id: 'prestige', lock: 'prestige', icon: '✨', name: 'Освящение', badge: () => stonesFor(S.house) > 0 || altarAffordable() },
    { id: 'shop', lock: 'shop', icon: '🛒', name: 'Магазин', badge: () => Date.now() >= S.adCrystalsAt || !S.starter },
  ];

  // =====================================================================
  // Обучение первых минут: пузырь с подсказкой и рука
  // =====================================================================
  let tutT = 0;
  function tutorialTick(dt) {
    if (S.tut >= 9 || raid) return;
    tutT += dt;
    const next = () => { S.tut++; tutT = 0; SFX.play('reward'); };
    if (S.tut === 0 && S.stats.captures >= 1) next();
    else if (S.tut === 1 && S.stats.upgrades >= 1) next();
    else if (S.tut === 2 && ((joy && joy.drag) || tutT > 7)) next();
    else if (S.tut === 3 && (panel === 'squad' || (unlocked('squad') && !S.inventory.length && tutT > 3))) { S.tut = 9; save(); }
  }
  function drawHand(x, y, k) {
    ctx.save(); ctx.translate(x, y + (k || 0) * 6); ctx.rotate(-0.35);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    rr(-6, 0, 12, 30, 6); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.stroke();
    rr(-9, 18, 30, 28, 10); ctx.fill(); ctx.stroke();
    for (const fx of [6, 14]) { rr(fx - 4, 14, 9, 14, 4.5); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(-10, 30, 6, 9, -0.5, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,1)'; ctx.fillRect(-4, 20, 8, 10);
    ctx.restore();
  }
  function tapRipple(x, y) { const ph = (time * 1.6) % 1; ctx.strokeStyle = `rgba(255,255,255,${1 - ph})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 8 + ph * 26, 0, 7); ctx.stroke(); }
  function tutBubble(msg, y) {
    ctx.font = '800 13px system-ui, sans-serif';
    const w = Math.min(330, ctx.measureText(msg).width + 64), x = 180 - w / 2;
    rr(x, y + 4, w, 40, 14); ctx.fillStyle = 'rgba(10,5,25,0.4)'; ctx.fill();
    plate(x, y, w, 40, 14, '#fffaf2', { lw: 3 });
    ctx.save(); ctx.translate(x + 22, y + 22); ctx.scale(0.36, 0.36); catSprite(0, 0, { skin: S.skin, aim: -0.6, blinkSeed: 2, eqColor: '#9ff3ff' }); ctx.restore();
    fitText(msg, x + 42, y + 20, w - 52, 13, INK, 'left', '800');
  }
  function drawTutorial() {
    if (S.tut >= 9 || panel || modal || raid || splash) return;
    const press = Math.abs(Math.sin(time * 3.5));
    if (S.tut === 0) {
      const onView = (q) => { const p = toScreen(q.x, q.y); return p.x > 20 && p.x < 340 && p.y > VIEW.y + 40 && p.y < VIEW.y + VIEW.h - 70; };
      const g = ghosts.filter((q) => lowHp(q) && targetable(q) && onView(q)).sort((a, b) => Math.hypot(a.x - cat.x, a.y - cat.y) - Math.hypot(b.x - cat.x, b.y - cat.y))[0];
      if (g) { const p = toScreen(g.x, g.y); tapRipple(p.x, p.y); drawHand(p.x + 4, p.y + 6, press); tutBubble('Призрак светится! Тапни, чтобы поймать', 452); }
      else tutBubble('Кот стреляет сам. Жди, пока призрак засветится', 452);
    } else if (S.tut === 1) {
      if (S.ecto >= upgradeCost(S.lvPower, UPGRADES[0].base)) { tapRipple(64, 546); drawHand(70, 548, press); tutBubble('Прокачай Мощность: кот станет сильнее', 452); }
      else tutBubble('Собирай эктоплазму с призраков', 452);
    } else if (S.tut === 2) {
      const k = (time * 0.7) % 1, hx = 120 + k * 120;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(120, 340); ctx.lineTo(hx, 340); ctx.stroke(); ctx.lineCap = 'butt';
      drawHand(hx, 344, 0);
      tutBubble('Веди кота пальцем, чтобы уворачиваться', 452);
    } else if (S.tut === 3 && unlocked('squad') && S.inventory.length) {
      tapRipple(32, 606); drawHand(38, 610, press);
      tutBubble('Пойманные духи бьются за тебя. Открой Отряд', 452);
    }
  }

  // Закрытая кнопка: тёмная плашка, полупрозрачная иконка, замок и где откроется
  function lockedPlate(x, y, w, h, title, where, icon) {
    plate(x, y, w, h, 12, '#4a4068', { lw: 2.5 });
    ctx.save(); rr(x, y, w, h, 12); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let k = -h; k < w; k += 10) { ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + 4, y + h); ctx.lineTo(x + k + 4 + h, y); ctx.lineTo(x + k + h, y); ctx.closePath(); ctx.fill(); } ctx.restore();
    if (icon) { ctx.globalAlpha = 0.3; text(icon, x + w / 2, y + 20, 18, '#ffffff'); ctx.globalAlpha = 1; text('🔒', x + w / 2 + 12, y + 12, 10, '#ffffff'); fitText(where, x + w / 2, y + 42, w - 6, 8, '#c9c3e6', 'center', '800'); }
    else { text(title, x + w / 2, y + h / 2 - 8, 12, '#c9c3e6'); fitText(where, x + w / 2, y + h / 2 + 10, w - 10, 9, '#9b93b3', 'center', '800'); }
  }
  // Метка NEW над только что открытой кнопкой
  function newTag(cx, y) {
    const k = 1 + Math.sin(time * 6) * 0.08;
    ctx.save(); ctx.translate(cx, y); ctx.scale(k, k);
    rr(-17, -8, 34, 15, 7.5); ctx.fillStyle = '#ff4d6d'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    text('NEW', 0, 0, 9, '#ffffff', 'center', '900');
    ctx.restore();
  }
  // Появление: кнопка «выпрыгивает» и светится, пока её не откроют
  const appearAt = {};
  function popIn(x, y, w, h, id) {
    if (!id || !S.fresh.includes(id)) return;
    if (appearAt[id] === undefined) appearAt[id] = time;
    const age = time - appearAt[id];
    if (age >= 0.6) return;
    const k = 1 - Math.pow(1 - age / 0.6, 3) * Math.cos((age / 0.6) * 10) * 0.9;
    ctx.translate(x + w / 2, y + h / 2); ctx.scale(k, k); ctx.translate(-x - w / 2, -y - h / 2);
  }
  function appear(x, y, w, h, id) {
    if (appearAt[id] === undefined) appearAt[id] = time;
    const age = time - appearAt[id];
    const gg = ctx.createRadialGradient(x + w / 2, y + h / 2, 8, x + w / 2, y + h / 2, w * 0.9);
    gg.addColorStop(0, `rgba(255,220,110,${0.35 + 0.2 * Math.sin(time * 5)})`); gg.addColorStop(1, 'rgba(255,220,110,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gg; ctx.fillRect(x - w * 0.4, y - h * 0.4, w * 1.8, h * 1.8); ctx.restore();
    if (age < 0.8) { // кольцо-вспышка
      ctx.strokeStyle = `rgba(255,240,170,${1 - age / 0.8})`; ctx.lineWidth = 4;
      rr(x - age * 30, y - age * 30, w + age * 60, h + age * 60, 14 + age * 20); ctx.stroke();
    }
  }

  function drawBottom() {
    {
      const g = ctx.createLinearGradient(0, 512, 0, 640); g.addColorStop(0, '#41346a'); g.addColorStop(1, '#221a38');
      ctx.fillStyle = g; ctx.fillRect(0, 512, W, 128);
      const sg = ctx.createLinearGradient(0, 502, 0, 512); sg.addColorStop(0, 'rgba(10,5,25,0)'); sg.addColorStop(1, 'rgba(10,5,25,0.45)'); ctx.fillStyle = sg; ctx.fillRect(0, 502, W, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(0, 512, W, 2);
    }
    UPGRADES.forEach((u, i) => {
      const x = 8 + i * 116, y = 517, w = 112, h = 58;
      if (u.lock && !unlocked(u.lock)) { lockedPlate(x, y, w, h, '🔒 ' + u.name, unlockWhere(UNLOCK[u.lock])); btn(x, y, w, h, () => lockedToast(u.lock)); return; }
      const cost = upgradeCost(S[u.key], u.base);
      const can = S.ecto >= cost;
      const dn = pressOff(x, y, w, h);
      ctx.save(); ctx.translate(0, dn); popIn(x, y, w, h, u.lock);
      plate(x, y, w, h, 12, can ? u.color : '#6b5f86', { noShadow: dn > 0 });
      text(u.name + ' ' + S[u.key], x + w / 2, y + 12, 12, '#ffffff');
      text(u.desc(), x + w / 2, y + 27, 10, INK, 'center', '700');
      rr(x + 8, y + 35, w - 16, 18, 9); ctx.fillStyle = 'rgba(25,18,45,0.85)'; ctx.fill();
      orb(x + 18, y + 44, 6, '#7dff9e');
      text(fmt(cost), x + w / 2 + 6, y + 44, 12, can ? '#7dff9e' : '#ff9aa9');
      if (can && Math.sin(time * 4 + i) > 0.7) { ctx.save(); rr(x, y, w, h, 12); ctx.clip(); const sx = x - 30 + ((time * 120 + i * 40) % (w + 60)); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.moveTo(sx, y + h); ctx.lineTo(sx + 14, y + h); ctx.lineTo(sx + 34, y); ctx.lineTo(sx + 20, y); ctx.closePath(); ctx.fill(); ctx.restore(); }
      ctx.restore();
      btn(x, y, w, h, () => buyUpgrade(u));
      if (u.lock && S.fresh.includes(u.lock)) { appear(x, y, w, h, u.lock); newTag(x + w / 2, y - 2); }
    });
    TABS.forEach((t, i) => {
      const x = 4 + i * 59, y = 580, w = 56, h = 54;
      if (!unlocked(t.lock)) { lockedPlate(x, y, w, h, '🔒', unlockWhere(UNLOCK[t.lock]).replace('Дом ', 'Д').replace(', комн. ', '·к'), t.icon); btn(x, y, w, h, () => lockedToast(t.lock)); return; }
      const active = panel === t.id;
      const dn = active ? -3 : pressOff(x, y, w, h);
      ctx.save(); ctx.translate(0, dn); popIn(x, y, w, h, t.lock);
      if (active) { const gg = ctx.createRadialGradient(x + w / 2, y + h / 2, 10, x + w / 2, y + h / 2, 44); gg.addColorStop(0, 'rgba(255,210,100,0.5)'); gg.addColorStop(1, 'rgba(255,210,100,0)'); ctx.fillStyle = gg; ctx.fillRect(x - 20, y - 20, w + 40, h + 40); }
      plate(x, y, w, h, 12, active ? '#ffc94d' : '#8a7bd1');
      text(t.icon, x + w / 2, y + 20, active ? 20 : 18, '#ffffff');
      text(t.name, x + w / 2, y + 42, 8, '#ffffff', 'center', '800');
      ctx.restore();
      if (t.badge()) badge(x + w - 6, y + 6);
      if (S.fresh.includes(t.lock)) { appear(x, y, w, h, t.lock); newTag(x + w / 2, y - 2); }
      btn(x, y, w, h, () => { if (panel === t.id) panel = null; else openPanel(t.id); selectedJar = null; selectedAttach = null; });
    });
  }

  // =====================================================================
  // Отрисовка: панели
  // =====================================================================
  function panelFrame(title) {
    ctx.fillStyle = 'rgba(20,14,32,0.75)'; ctx.fillRect(0, 0, W, 574);
    btn(0, 0, W, 574, () => {});
    window_(12, 56, 336, 516, title);
    orb(322, 74, 16, '#ff6b8a'); text('✕', 322, 74, 15, '#ffffff');
    btn(302, 54, 40, 40, () => { panel = null; });
  }

  // Окно: кремовое тело с рамкой и лентой-заголовком
  function window_(x, y, w, h, title) {
    rr(x, y + 6, w, h, 20); ctx.fillStyle = 'rgba(10,5,25,0.45)'; ctx.fill();
    rr(x, y, w, h, 20); ctx.fillStyle = '#8a7bd1'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    rr(x + 6, y + 6, w - 12, h - 12, 15);
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fffaf2'); g.addColorStop(1, '#efe3d2');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(43,35,64,0.35)'; ctx.stroke();
    ctx.save(); rr(x + 6, y + 6, w - 12, h - 12, 15); ctx.clip();
    ctx.fillStyle = 'rgba(138,123,209,0.06)'; for (let yy = y + 20; yy < y + h; yy += 26) for (let xx = x + 16 + ((yy / 26) % 2) * 13; xx < x + w; xx += 26) { ctx.beginPath(); ctx.arc(xx, yy, 4, 0, 7); ctx.fill(); }
    ctx.restore();
    if (title) {
      ctx.font = '800 17px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
      const mw = ctx.measureText(title).width, tw = Math.min(w - 124, mw + 40), fs = Math.min(17, Math.floor(17 * (tw - 26) / mw)), tx = x + w / 2 - tw / 2, ty = y - 12;
      ctx.fillStyle = shade('#ff8fb1', -0.3);
      ctx.beginPath(); ctx.moveTo(tx - 14, ty + 10); ctx.lineTo(tx + 6, ty + 10); ctx.lineTo(tx + 6, ty + 38); ctx.lineTo(tx - 14, ty + 38); ctx.lineTo(tx - 6, ty + 24); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx + tw + 14, ty + 10); ctx.lineTo(tx + tw - 6, ty + 10); ctx.lineTo(tx + tw - 6, ty + 38); ctx.lineTo(tx + tw + 14, ty + 38); ctx.lineTo(tx + tw + 6, ty + 24); ctx.closePath(); ctx.fill(); ctx.stroke();
      plate(tx, ty, tw, 34, 10, '#ff8fb1');
      text(title, x + w / 2, ty + 17, fs, '#ffffff');
    }
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
      const n = S.squad.length, k = n > 5 ? 0.86 : 1, step = n > 5 ? 54 : n > 4 ? 64 : 76;
      const x = 180 - ((n - 1) * step + 58 * k) / 2 + i * step, y = 106;
      ctx.save(); ctx.translate(x, y); ctx.scale(k, k); drawJar(0, 0, findItem(id), false); ctx.restore();
      btn(x, y, 58 * k, 66 * k, () => {
        if (selectedJar) { S.squad = S.squad.map((s) => (s === selectedJar ? null : s)); S.squad[i] = selectedJar; selectedJar = null; }
        else if (id) S.squad[i] = null;
      });
    });
    const power = S.squad.reduce((s, id) => { const it = findItem(id); return s + (it ? squadDamage(it) : 0); }, 0);
    text('Урон отряда: ' + fmt(power) + ' / выстрел', 180, 186, 12, INK, 'center', '700');
    const counts = squadDistrictCounts();
    const syn = Object.keys(counts).filter((d) => counts[d] >= 2).map((d) => DISTRICTS[d].name + (counts[d] >= 4 ? ' (сет!)' : ''));
    text(syn.length ? 'Синергия: ' + syn.join(', ') : 'Синергия: 2 духа из одного района +20%, 4 = сет', 180, 204, 10, syn.length ? '#2f8f4e' : '#6b5f86', 'center', '700');

    const cols = 5, sx = 22;
    const list = [...S.inventory].sort((a, b) => itemPower(b) - itemPower(a));
    const area = scrollArea('squad', 18, 214, 324, 288, Math.ceil(list.length / cols) * 72 + 6);
    ctx.save(); ctx.beginPath(); ctx.rect(area.x, area.y, area.w, area.h); ctx.clip();
    list.forEach((it, i) => {
      const x = sx + (i % cols) * 63, y = area.y + 8 + Math.floor(i / cols) * 72 - area.off;
      if (y > area.y + area.h || y + 66 < area.y) return;
      drawJar(x, y, it, selectedJar === it.id);
      if (S.squad.includes(it.id)) text('в отряде', x + 29, y + 46, 8, '#2f8f4e');
      sbtn(area, x, y, 58, 66, () => { selectedJar = selectedJar === it.id ? null : it.id; });
    });
    ctx.restore(); scrollBar(area);
    if (!list.length) {
      text('Пусто. Ослабь призрака и тапни по нему,', 180, 300, 13, INK, 'center', '600');
      text('чтобы засосать его в банку.', 180, 318, 13, INK, 'center', '600');
    }
    const sel = selectedJar && findItem(selectedJar);
    if (sel) {
      const def = GHOSTS[sel.type];
      text(def.name + ' · ' + RARITY[def.rarity].name + ' · ' + sel.stars + '★ · ' + fmt(squadDamage(sel)), 180, 512, 11, INK, 'center', '700');
      text('Тапни слот отряда, чтобы поставить', 180, 527, 10, '#6b5f86', 'center', '700');
    } else if (list.length) text('Духов в банках: ' + list.length + (area.max > 0 ? ' · листай список пальцем' : ''), 180, 518, 10, '#6b5f86', 'center', '700');
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
    ctx.font = '800 8px system-ui, sans-serif';
    text(k.name, cx, y + h - 10, Math.min(8, (8 * (w - 6)) / ctx.measureText(k.name).width), INK, 'center', '800');
  }

  function drawAttachPanel() {
    panelFrame('Насадки пылесоса');
    const eqItems = S.equipped.map((id) => S.attach.find((a) => a.id === id));
    eqItems.forEach((a, i) => {
      const n = eqItems.length, cw = n > 4 ? 58 : n > 3 ? 70 : 92, step = cw + (n > 4 ? 6 : 8);
      const x = 180 - ((n - 1) * step + cw) / 2 + i * step, y = 104;
      drawAttachCard(x, y, cw, 80, a, false);
      btn(x, y, cw, 80, () => {
        if (selectedAttach) { S.equipped = S.equipped.map((s) => (s === selectedAttach ? null : s)); S.equipped[i] = selectedAttach; selectedAttach = null; }
      });
    });
    text('Урон x' + fmt(attachMult(), 2) + ' · крит ' + Math.round(critChance() * 100) + '% x' + fmt(critMult(), 1), 180, 196, 11, INK, 'center', '700');

    const list = [...S.attach].sort((a, b) => b.rank - a.rank || a.kind.localeCompare(b.kind));
    const area = scrollArea('attach', 18, 206, 324, 200, Math.ceil(list.length / 5) * 66 + 8);
    ctx.save(); ctx.beginPath(); ctx.rect(area.x, area.y, area.w, area.h); ctx.clip();
    list.forEach((a, i) => {
      const x = 22 + (i % 5) * 63, y = area.y + 6 + Math.floor(i / 5) * 66 - area.off;
      if (y > area.y + area.h || y + 60 < area.y) return;
      drawAttachCard(x, y, 58, 60, a, selectedAttach === a.id);
      if (S.equipped.includes(a.id)) { ctx.fillStyle = '#2f8f4e'; ctx.beginPath(); ctx.arc(x + 50, y + 9, 5, 0, 7); ctx.fill(); }
      sbtn(area, x, y, 58, 60, () => { selectedAttach = selectedAttach === a.id ? null : a.id; });
    });
    ctx.restore(); scrollBar(area);
    if (!list.length) {
      text('Насадок пока нет.', 180, 300, 13, INK, 'center', '600');
      text('Призови первую за кристаллы.', 180, 318, 13, INK, 'center', '600');
    }
    const sel = selectedAttach && S.attach.find((a) => a.id === selectedAttach);
    if (sel) {
      text(ATTACH[sel.kind].name + ' [' + RANKS[sel.rank] + ']: ' + ATTACH[sel.kind].desc, 180, 418, 11, INK, 'center', '700');
      text('Тапни верхний слот, чтобы надеть', 180, 433, 10, '#6b5f86', 'center', '700');
    } else {
      fitText('Шансы: ' + (unlocked('ranks') ? RANK_WEIGHTS_HIGH : RANK_WEIGHTS).map((w, i) => RANKS[i] + ' ' + Math.round(w * 1000) / 10 + '%').join(' · '), 180, 425, 300, 10, '#6b5f86', 'center', '700');
    }
    const freeReady = Date.now() >= S.adSummonAt;
    button(70, 448, 220, 30, freeReady ? '🎬 Бесплатный призыв' : 'Бесплатно через ' + Math.ceil((S.adSummonAt - Date.now()) / 60000) + ' мин', '#ffc94d',
      () => { if (freeReady) showAd('Бесплатный призыв насадки', () => { S.adSummonAt = Date.now() + 4 * 3600e3; S.crystals += SUMMON_COST; summon(1); }); }, 12, freeReady);
    text('Насадок: ' + S.attach.length + (vipActive() ? '' : ' · +1 слот насадок в VIP'), 180, 494, 10, '#6b5f86', 'center', '700');
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
      card(x, y, 152, 174, 12, RARITY[def.rarity].color);
      ghostSprite(type, x + 76, y + 48, 24, { silhouette: n === 0, phase: time * 2 });
      if (def.beh && n) { const b = BEHAVIORS[def.beh]; behIcon(def.beh, x + 16, y + 16, 8); text(b.name, x + 28, y + 17, 9, b.color === '#5fd38a' ? '#2f8f4e' : INK, 'left', '800'); }
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

  // Настройки
  function drawSettingsPanel() {
    panelFrame('Настройки');
    const rows = [['music', '🎵', 'Музыка'], ['sfx', '🔊', 'Звуки'], ['vibro', '📳', 'Вибрация'], ['numbers', '✨', 'Цифры урона'], ['shake', '💥', 'Тряска экрана']];
    rows.forEach(([k, icon, name], i) => {
      const y = 108 + i * 50, on = opt(k);
      card(28, y, 304, 42, 12, '#d9cff0');
      orb(52, y + 21, 13, '#8a7bd1'); text(icon, 52, y + 22, 13, '#ffffff');
      text(name, 76, y + 21, 13, INK, 'left', '800');
      // переключатель
      rr(258, y + 9, 56, 24, 12); ctx.fillStyle = on ? '#7dd99a' : '#c9c0dc'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(on ? 302 : 270, y + 21, 9, 0, 7); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.stroke();
      btn(28, y, 304, 42, () => { S.settings[k] = !on; if (k === 'music' || k === 'sfx') SFX.apply(); if (k === 'vibro' && !on) vibrate(40); save(); });
    });
    text('Прогресс сохраняется на этом устройстве', 180, 372, 10, '#6b5f86', 'center', '700');
    button(40, 388, 280, 40, 'Политика конфиденциальности', '#8a7bd1', () => showToast('Ссылка появится в релизе'), 12);
    button(40, 436, 280, 40, 'Сбросить прогресс', '#ff6b8a', () => ask('Сбросить прогресс?', ['Пропадут дома, духи, насадки, камни и скины.', 'Покупки восстановятся через магазин.'], [
      { label: 'Отмена', color: '#8a7bd1', on: closeModal },
      { label: 'Сбросить', color: '#ff6b8a', on: () => { closeModal(); panel = null; localStorage.removeItem(SAVE_KEY); S = defaultState(); ensureQuests(); dailyReset(); syncSlots(); resetRoom(); splash = { t: 0, out: 0 }; } },
    ]), 12);
    text('Кот-экзорцист · версия ' + VERSION, 180, 498, 10, '#6b5f86', 'center', '700');
    text('Вся графика и музыка нарисованы кодом', 180, 514, 9, '#9a8fb5', 'center', '700');
  }

  // Достижения
  function drawAchievementsPanel() {
    panelFrame('Достижения');
    const done = ACHIEVEMENTS.reduce((n, a) => n + achTier(a), 0), total = ACHIEVEMENTS.reduce((n, a) => n + a.tiers.length, 0);
    text('Пройдено ступеней: ' + done + ' из ' + total, 180, 108, 12, INK, 'center', '800');
    const list = [...ACHIEVEMENTS].sort((a, b) => (achReady(b) - achReady(a)) || ((achTier(a) >= a.tiers.length) - (achTier(b) >= b.tiers.length)));
    const area = scrollArea('ach', 22, 122, 316, 440, list.length * 70 + 4);
    ctx.save(); ctx.beginPath(); ctx.rect(area.x, area.y, area.w, area.h); ctx.clip();
    list.forEach((a, i) => {
      const y = area.y + 2 + i * 70 - area.off;
      if (y > area.y + area.h || y + 64 < area.y) return;
      const t = achTier(a), max = t >= a.tiers.length, ready = achReady(a), goal = a.tiers[Math.min(t, a.tiers.length - 1)];
      card(26, y, 300, 64, 12, ready ? '#ffc94d' : max ? '#7dd99a' : '#d9cff0');
      orb(52, y + 26, 17, max ? '#7dd99a' : '#8a7bd1'); text(a.icon, 52, y + 27, 17, '#ffffff');
      for (let k = 0; k < a.tiers.length; k++) text('★', 40 + k * 6, y + 52, 7, k < t ? '#ffc94d' : '#d9cff0');
      fitText(a.name, 78, y + 16, 140, 13, INK, 'left', '800');
      const v = Math.min(a.val(), goal);
      text(max ? 'Пройдено полностью' : fmt(v) + ' / ' + fmt(goal) + ' ' + a.unit, 78, y + 33, 10, '#6b5f86', 'left', '700');
      rr(78, y + 44, 150, 7, 3.5); ctx.fillStyle = '#e4ddf3'; ctx.fill();
      rr(78, y + 44, 150 * (max ? 1 : Math.min(1, a.val() / goal)), 7, 3.5); ctx.fillStyle = max ? '#7dd99a' : '#ffc94d'; ctx.fill();
      if (ready) { button(238, y + 14, 80, 36, '+' + ACH_REWARD[t] + ' 💎', '#8ee08a', null, 12); buttons.pop(); sbtn(area, 238, y + 14, 80, 36, () => claimAch(a)); }
      else if (!max) text(ACH_REWARD[t] + ' 💎', 278, y + 32, 12, '#6b5f86', 'center', '800');
      else text('✓', 278, y + 32, 20, '#2f8f4e', 'center', '900');
    });
    ctx.restore(); scrollBar(area);
  }

  // Вкладки внутри панели
  function subTabs(list, cur, set) {
    const n = list.length, w = (304 - (n - 1) * 6) / n;
    list.forEach(([id, label, b], i) => {
      const x = 28 + i * (w + 6);
      button(x, 100, w, 30, label, cur === id ? '#ffc94d' : '#8a7bd1', () => set(id), n > 3 ? 10.5 : 12);
      if (b) badge(x + w - 4, 102);
    });
  }
  // Текст, ужатый по ширине
  function fitText(t, x, y, maxW, size, color, align, weight) {
    ctx.font = (weight || '800') + ' ' + size + 'px system-ui, sans-serif';
    const w = ctx.measureText(t).width;
    text(t, x, y, w > maxW ? Math.max(6, (size * maxW) / w) : size, color, align, weight);
  }

  function drawQuestsPanel() {
    panelFrame(questTab === 'pass' ? 'Призрачный пропуск' : questTab === 'road' ? 'Путь открытий' : 'Задания');
    subTabs([['daily', 'Ежедневные', S.dm.list.some(missionReady) || chestReady()], ['pass', 'Пропуск', passClaimable()], ['quests', 'Задания', anyQuestDone()], ['road', 'Путь', false]], questTab, (id) => { questTab = id; if (id === 'road') roadPage = -1; });
    if (questTab === 'daily') drawDailyMissions();
    else if (questTab === 'pass') drawPass();
    else if (questTab === 'road') drawRoad();
    else drawStoryQuests();
  }

  function drawStoryQuests() {
    ensureQuests();
    S.quests.forEach((q, i) => {
      const x = 28, y = 144 + i * 110, w = 304, h = 100;
      const done = questDone(q), prog = questProgress(q);
      rr(x, y, w, h, 12); ctx.fillStyle = done ? '#eafbe9' : '#ffffff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = done ? '#7dd99a' : '#c9c3e6'; ctx.stroke();
      text(QUEST_TYPES[q.kind].text(q.goal), x + 16, y + 22, 14, INK, 'left', '800');
      bar(x + 16, y + 38, w - 32, 14, prog / q.goal, '#7dd99a', '#e4ddf3');
      text(prog + ' / ' + q.goal, x + w / 2, y + 45, 10, INK, 'center', '800');
      text('Награда: ' + q.reward + ' 💎', x + 16, y + 78, 12, '#6b5f86', 'left', '700');
      if (done) button(x + w - 128, y + 62, 112, 30, 'Забрать', '#8ee08a', () => claimQuest(i), 13);
    });
    text('Выполненное задание сразу заменяется новым, чуть сложнее.', 180, 486, 10, '#6b5f86', 'center', '700');
    text('Кристаллы тратятся на призыв насадок.', 180, 502, 10, '#6b5f86', 'center', '700');
  }

  function drawDailyMissions() {
    const m1 = streakMult();
    card(24, 138, 312, 44, 12, '#ff9f5a');
    const fl = 1 + Math.sin(time * 6) * 0.06;
    ctx.save(); ctx.translate(46, 160); ctx.scale(fl, fl); text('🔥', 0, 0, 22, '#ffffff'); ctx.restore();
    text('Серия входов: ' + S.streak.count + ' дн.', 66, 152, 13, INK, 'left', '800');
    text('Награды x' + fmt(m1, 1) + (S.streak.count < 11 ? ' · завтра x' + fmt(1 + 0.1 * Math.min(10, S.streak.count), 1) : ' · максимум!'), 66, 170, 10, '#6b5f86', 'left', '700');
    // 7 огоньков до насадки A в сундуке
    for (let i = 0; i < 7; i++) { const on = i < S.streak.count; orb(236 + i * 13, 154, 5.5, on ? '#ff9f5a' : '#d6cfe8'); }
    text(S.streak.count >= 7 ? 'насадка A в сундуке ✓' : 'до насадки A: ' + (7 - S.streak.count) + ' дн.', 275, 170, 8, S.streak.count >= 7 ? '#2f8f4e' : '#6b5f86', 'center', '800');
    S.dm.list.forEach((m, i) => {
      const y = 190 + i * 54, prog = missionProg(m), ready = missionReady(m);
      rr(24, y, 312, 48, 10); ctx.fillStyle = m.claimed ? '#eafbe9' : ready ? '#fffbe6' : '#ffffff'; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = m.claimed || ready ? '#7dd99a' : '#c9c3e6'; ctx.stroke();
      fitText(DAILY_MISSIONS[m.kind].text(m.goal), 36, y + 15, 190, 12, INK, 'left', '800');
      bar(36, y + 27, 180, 13, prog / m.goal, '#7dd99a', '#e4ddf3');
      text(prog + ' / ' + m.goal, 126, y + 33.5, 8, INK, 'center', '800');
      if (m.claimed) text('✓ Готово', 281, y + 24, 12, '#2f8f4e', 'center', '800');
      else if (ready) button(236, y + 9, 90, 30, 'Забрать', '#8ee08a', () => claimMission(i), 12);
      else { text(Math.round(MISSION_GEMS * m1) + ' 💎', 281, y + 16, 12, '#2b6fb3', 'center', '800'); text('+' + MISSION_XP + ' опыта', 281, y + 33, 9, '#6b5f86', 'center', '700'); }
    });
    // сундук дня
    const ready = chestReady(), done = S.dm.list.filter((m) => m.claimed).length;
    if (ready) { const gg = ctx.createRadialGradient(60, 499, 6, 60, 499, 50); gg.addColorStop(0, `rgba(255,210,100,${0.5 + 0.2 * Math.sin(time * 5)})`); gg.addColorStop(1, 'rgba(255,210,100,0)'); ctx.fillStyle = gg; ctx.fillRect(10, 450, 100, 100); }
    card(24, 464, 312, 70, 12, '#ffc94d');
    ctx.save(); if (ready) { ctx.translate(60, 499); ctx.rotate(Math.sin(time * 9) * 0.08); ctx.translate(-60, -499); }
    drawIcon('chest', 60, 501, 44); ctx.restore();
    text('Сундук дня', 92, 481, 13, INK, 'left', '800');
    fitText(Math.round(50 * m1) + ' 💎 · ' + Math.round(5 * m1) + ' 🫙 · насадка ' + (S.streak.count >= 7 ? 'A' : 'B') + ' · ' + CHEST_XP + ' опыта', 92, 499, 140, 10, '#6b5f86', 'left', '700');
    if (S.dm.chest) text('Открыт ✓', 281, 499, 13, '#2f8f4e', 'center', '800');
    else if (ready) {
      button(240, 470, 86, 27, 'Открыть', '#8ee08a', () => claimChest(false), 12);
      button(240, 501, 86, 27, '🎬 x2', '#ffc94d', () => showAd('Удвоение сундука дня', () => claimChest(true)), 12);
    } else { bar(92, 512, 140, 12, done / 5, '#ffc94d', '#e4ddf3'); text(done + ' / 5', 162, 518, 8, INK, 'center', '800'); text('выполни все', 281, 499, 10, '#6b5f86', 'center', '700'); }
    text('Новые задания через ' + untilMidnight() + ' · пропустишь день — серия сгорит', 180, 550, 9, '#6b5f86', 'center', '700');
  }

  function drawPassCell(x, y, r, l, prem) {
    const can = prem ? passCanPrem(l) : passCanFree(l), got = (prem ? S.pass.prem : S.pass.free).includes(l);
    const locked = prem && !S.pass.premium, reached = l <= passLevel();
    rr(x, y, 128, 52, 10);
    ctx.fillStyle = got ? '#e6f5e4' : can ? '#fff3c4' : reached && !locked ? '#ffffff' : prem ? '#efe4ff' : '#f4f0fa'; ctx.fill();
    ctx.lineWidth = can ? 3 : 2; ctx.strokeStyle = can ? '#ffb02e' : prem ? '#c9a0ff' : '#c9c3e6'; ctx.stroke();
    if (can) { ctx.save(); rr(x, y, 128, 52, 10); ctx.clip(); const sx = x - 30 + ((time * 90 + l * 20) % 190); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.moveTo(sx, y + 52); ctx.lineTo(sx + 12, y + 52); ctx.lineTo(sx + 30, y); ctx.lineTo(sx + 18, y); ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.globalAlpha = got ? 0.45 : 1;
    if (r.icon === 'crown') { ctx.save(); ctx.beginPath(); ctx.rect(x + 2, y + 2, 48, 48); ctx.clip(); ctx.translate(x + 26, y + 44); ctx.scale(0.42, 0.42); catSprite(0, 0, { skin: 'reaper', aim: 0.35, bobY: Math.sin(time * 2) * 1.5, blinkSeed: 3, eqColor: '#9dff7a' }); ctx.restore(); }
    else drawIcon(r.icon, x + 26, y + 24, 30);
    text(r.val, x + 26, y + 44, 9, INK, 'center', '900');
    ctx.globalAlpha = 1;
    fitText(r.label, x + 88, y + 18, 70, 10, INK, 'center', '800');
    if (got) text('✓ Получено', x + 88, y + 36, 9, '#2f8f4e', 'center', '800');
    else if (can) text('ЗАБРАТЬ', x + 88, y + 36, 10, '#e07a00', 'center', '900');
    else if (locked) text('🔒 Премиум', x + 88, y + 36, 9, '#8a5ad6', 'center', '800');
    else text('Ур. ' + l, x + 88, y + 36, 9, '#9b93b3', 'center', '800');
    if (can) btn(x, y, 128, 52, () => claimPass(l, prem));
    else if (locked) btn(x, y, 128, 52, buyPass);
  }

  function drawPass() {
    const lvl = passLevel();
    if (passPage < 0) { let f = 1; while (f < lvl && !passCanFree(f) && !passCanPrem(f)) f++; passPage = Math.min(5, Math.floor((f - 1) / 5)); }
    card(24, 138, 312, 62, 12, '#a86bff');
    text('Уровень ' + lvl + ' / ' + PASS_LEVELS, 36, 154, 14, INK, 'left', '900');
    text('Сезон кончится через ' + passDaysLeft() + ' дн.', 36, 171, 10, '#6b5f86', 'left', '700');
    const xpIn = lvl >= PASS_LEVELS ? PASS_XP : S.pass.xp % PASS_XP;
    bar(36, 180, 168, 13, xpIn / PASS_XP, '#a86bff', '#e4ddf3');
    text(lvl >= PASS_LEVELS ? 'МАКС' : xpIn + ' / ' + PASS_XP, 120, 186.5, 8, INK, 'center', '800');
    if (!S.pass.premium) button(212, 146, 114, 46, '👑 Премиум ' + PASS_PRICE, '#ffc94d', buyPass, 11);
    else { plate(212, 150, 114, 38, 12, '#3ddc97'); text('👑 Премиум ✓', 269, 169, 12, '#ffffff'); }
    text('Бесплатно', 92, 214, 10, '#6b5f86', 'center', '800');
    text('Премиум', 268, 214, 10, '#8a5ad6', 'center', '800');
    // линия уровней
    ctx.fillStyle = '#d6cfe8'; ctx.fillRect(177, 224, 6, 286);
    for (let j = 0; j < 5; j++) {
      const l = passPage * 5 + j + 1, y = 224 + j * 58;
      if (l <= lvl) { ctx.fillStyle = '#a86bff'; ctx.fillRect(177, y, 6, j < 4 ? 58 : 52); }
      drawPassCell(28, y, PASS_FREE[l - 1], l, false);
      drawPassCell(204, y, PASS_PREM[l - 1], l, true);
      orb(180, y + 26, 13, l <= lvl ? '#a86bff' : '#b9afe8');
      text(String(l), 180, y + 27, 11, '#ffffff');
    }
    button(28, 516, 40, 28, '‹', '#8a7bd1', () => { passPage = Math.max(0, passPage - 1); }, 16, passPage > 0);
    button(292, 516, 40, 28, '›', '#8a7bd1', () => { passPage = Math.min(5, passPage + 1); }, 16, passPage < 5);
    button(76, 516, 208, 28, '+1 уровень за ' + PASS_SKIP + ' 💎', '#7fd1ff', skipPassLevel, 11, lvl < PASS_LEVELS);
    text('Опыт: задания и сундук дня, боссы, рейды, колесо · VIP +50%', 180, 556, 8.5, '#6b5f86', 'center', '700');
  }

  function drawRoad() {
    const next = UNLOCKS.find((u) => S.maxStage < u.stage);
    const pages = Math.ceil(UNLOCKS.length / ROAD_PER_PAGE);
    if (roadPage < 0) roadPage = Math.min(pages - 1, Math.floor(Math.max(0, UNLOCKS.indexOf(next)) / ROAD_PER_PAGE));
    const done = UNLOCKS.filter((u) => S.maxStage >= u.stage).length;
    text('Открыто ' + done + ' из ' + UNLOCKS.length + (next ? ' · дальше: ' + unlockWhere(next).toLowerCase() : ' · всё открыто!'), 180, 146, 11, INK, 'center', '800');
    UNLOCKS.slice(roadPage * ROAD_PER_PAGE, (roadPage + 1) * ROAD_PER_PAGE).forEach((u, i) => {
      const y = 158 + i * 31, open = S.maxStage >= u.stage, isNext = u === next;
      rr(24, y, 312, 27, 9); ctx.fillStyle = open ? '#eafbe9' : isNext ? '#fff3c4' : 'rgba(255,255,255,0.6)'; ctx.fill();
      ctx.lineWidth = isNext ? 2.5 : 1.5; ctx.strokeStyle = open ? '#7dd99a' : isNext ? '#ffb02e' : '#d6cfe8'; ctx.stroke();
      orb(40, y + 13.5, 10, open ? '#3ddc97' : isNext ? '#ffc94d' : '#9b93b3');
      text(open || isNext ? u.icon : '🔒', 40, y + 14.5, open || isNext ? 10 : 8, '#ffffff');
      fitText(u.name, 57, y + 9, 196, 10.5, open || isNext ? INK : '#6b5f86', 'left', '800');
      fitText(u.text, 57, y + 20, 196, 8, '#6b5f86', 'left', '700');
      if (isNext) bar(262, y + 17, 64, 7, Math.max(0, S.maxStage) / u.stage, '#ffc94d', '#e4ddf3');
      fitText(unlockWhere(u), 326, isNext ? y + 8 : y + 13.5, 72, 9.5, open ? '#2f8f4e' : INK, 'right', '800');
    });
    button(28, 534, 40, 24, '‹', '#8a7bd1', () => { roadPage = Math.max(0, roadPage - 1); }, 14, roadPage > 0);
    button(292, 534, 40, 24, '›', '#8a7bd1', () => { roadPage = Math.min(pages - 1, roadPage + 1); }, 14, roadPage < pages - 1);
    text('Страница ' + (roadPage + 1) + ' из ' + pages, 180, 546, 10, '#6b5f86', 'center', '700');
  }

  function drawPrestigePanel() {
    panelFrame(prestTab === 'altar' ? 'Лунный алтарь' : 'Освящение');
    subTabs([['main', 'Освящение', stonesFor(S.house) > 0], ['altar', 'Лунный алтарь', altarAffordable()]], prestTab, (id) => { prestTab = id; });
    if (prestTab === 'altar') { drawAltar(); return; }
    const gain = stonesFor(S.house);
    const mg = ctx.createRadialGradient(180, 178, 20, 180, 178, 70); mg.addColorStop(0, 'rgba(255,240,170,0.55)'); mg.addColorStop(1, 'rgba(255,240,170,0)'); ctx.fillStyle = mg; ctx.fillRect(100, 108, 160, 140);
    drawIcon('moon', 180, 180, 76);
    const lines = [
      'Освяти город: дома, эктоплазма и прокачка',
      'сбросятся, а ты получишь лунные камни.',
      'Каждый камень навсегда: +5% урона и +2% дохода.',
      'Камни тратятся в Алтаре, но бонус остаётся.',
    ];
    lines.forEach((l, i) => text(l, 180, 232 + i * 17, 11, INK, 'center', '600'));
    text('Камней: ' + S.stones + ' · свободно для Алтаря: ' + stonesFree(), 180, 310, 12, INK, 'center', '800');
    text('Урон x' + fmt(stoneDmg(), 2) + ' · доход x' + fmt(stoneInc(), 2) + ' (камни + таланты)', 180, 328, 10, '#2f8f4e', 'center', '800');
    text('Освящений: ' + S.prestiges + ' · рекорд: дом ' + S.maxHouse, 180, 344, 10, '#6b5f86', 'center', '700');
    if (gain > 0) {
      text('Получишь: +' + gain + ' 🌙', 180, 370, 18, '#ffc94d');
      text('дом ' + (S.house + 5) + ' дал бы ' + stonesFor(S.house + 5) + ' · дом ' + (S.house + 10) + ' — ' + stonesFor(S.house + 10), 180, 392, 10, '#6b5f86', 'center', '700');
    } else text('Откроется на доме ' + PRESTIGE_HOUSE + ' (сейчас ' + S.house + ')', 180, 378, 14, '#6b5f86', 'center', '800');
    button(80, 406, 200, 50, '✨ Освятить', '#ffc94d', prestige, 15, gain > 0);
    card(24, 468, 312, 74, 12, '#a86bff');
    text('Лунный ускоритель', 38, 486, 13, INK, 'left', '800');
    wrapText(S.boostPrest > 0 ? 'Активен: x2 камней ещё на ' + S.boostPrest + ' освящ. Можно продлить.' : 'x2 лунных камней на 3 следующих освящения', 38, 504, 196, 10, '#6b5f86', 13);
    rr(250, 474, 72, 18, 9); ctx.fillStyle = '#ff4d6d'; ctx.fill(); text('x2 🌙', 286, 483, 10, '#ffffff');
    button(246, 500, 80, 32, '$2.99', '#d68cff', buyBoost, 13);
  }

  function drawAltar() {
    text('Свободно камней: ' + stonesFree() + ' 🌙', 180, 147, 14, INK, 'center', '900');
    Object.keys(ALTAR).forEach((k, i) => {
      const t = ALTAR[k], l = talent(k), y = 162 + i * 62, max = l >= t.max, c = t.cost(l), can = !max && stonesFree() >= c;
      card(24, y, 312, 56, 12, t.color);
      orb(50, y + 28, 18, t.color); text(t.icon, 50, y + 29, 16, '#ffffff');
      text(t.name + ' · ур. ' + l + (t.max < 20 ? '/' + t.max : ''), 76, y + 18, 12, INK, 'left', '800');
      fitText((max || l === 0 ? '' : 'след. ур.: ') + t.desc(max ? l : l + 1), 76, y + 37, 164, 9.5, l ? '#2f8f4e' : '#6b5f86', 'left', '700');
      button(248, y + 12, 78, 32, max ? 'МАКС' : c + ' 🌙', can ? '#ffc94d' : '#b9afe8', () => buyTalent(k), 12, !max);
    });
    text('Таланты не сбрасываются при освящении', 180, 548, 10, '#6b5f86', 'center', '700');
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
      offers.push({ t: vipActive() ? 'VIP активен: ' + Math.ceil((S.vipUntil - now) / 864e5) + ' дн.' : 'VIP на 7 дней', d: 'x2 всегда, авто, +1 слот насадок, без рекламы, +100 💎/день, +50% опыта пропуска, +4 ч офлайна', p: '$6.99', c: '#ffc94d', on: buyVip });
      if (!S.pass.premium) offers.push({ t: 'Призрачный пропуск', d: 'Премиум-награды сезона: камни, насадки S, скин «Кот-Жнец»', p: PASS_PRICE, c: '#a86bff', on: buyPass, hot: 'Сезон' });
      if (unlocked('prestige')) offers.push({ t: 'Лунный ускоритель', d: S.boostPrest > 0 ? 'Активен ещё на ' + S.boostPrest + ' освящ. Продлить на 3' : 'x2 лунных камней на 3 освящения', p: '$2.99', c: '#d68cff', on: buyBoost });
      if (!S.noAds) offers.push({ t: 'Без рекламы', d: 'Все награды за рекламу выдаются сразу', p: '$4.99', c: '#7fd1ff', on: buyNoAds });
      if (!(S.autoUpForever && S.autoMergeForever)) offers.push({ t: 'Автоматизация', d: 'Автопрокачка и автослияние навсегда', p: '$4.99', c: '#8ee08a', on: buyAutoBundle, hot: 'Удобно' });
      if (!S.weekly && offers.length < 6) offers.push({ t: 'Набор недели', d: 'Насадка S, 500 💎, 20 банок', p: '$14.99', c: '#d68cff', on: buyWeekly, hot: 'Ограничено' });
      offers.push({ t: '20 банок', d: 'Больше места для пойманных духов', p: '50 💎', c: '#8ee08a', on: () => { if (S.crystals >= 50) { S.crystals -= 50; S.jars += 20; showToast('+20 🫙'); } else showToast('Нужно 50 💎'); } });
      offers.slice(0, 6).forEach((o, i) => {
        const y = 140 + i * 71;
        card(24, y, 312, 65, 12, o.c);
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
        card(x, y, 152, 128, 12, '#7fd1ff');
        text('💎'.repeat(Math.min(3, 1 + Math.floor(i / 2))), x + 76, y + 30, 22, '#ffffff');
        text(String(c.amount), x + 76, y + 62, 18, INK, 'center', '800');
        if (c.extra) { rr(x + 98, y + 6, 48, 18, 9); ctx.fillStyle = '#ff4d6d'; ctx.fill(); text(c.extra, x + 122, y + 15, 10, '#ffffff'); }
        const on = c.free
          ? () => { if (freeReady) showAd('Бесплатные кристаллы', () => { S.crystals += 20; S.adCrystalsAt = Date.now() + 3600e3; }); }
          : () => purchase(c.amount + ' кристаллов', c.price, () => { S.crystals += c.amount; });
        button(x + 16, y + 84, 120, 32, c.price, c.free ? '#ffc94d' : '#8ee08a', on, 13, !c.free || freeReady);
      });
    } else {
      // вкладки по уровням редкости
      TIERS.forEach((t, ti) => {
        const keys = Object.keys(SKINS).filter((kk) => SKINS[kk].tier === ti), have = keys.filter((kk) => S.skins.includes(kk)).length;
        const bx = 24 + ti * 63, sel = skinTier === ti;
        const dn = pressOff(bx, 138, 59, 30);
        ctx.save(); ctx.translate(0, sel ? -2 : dn);
        plate(bx, 138, 59, 30, 10, sel ? t.color : shade(t.color, -0.35), { lw: 2.5 });
        text(t.short, bx + 29.5, 148, 10, '#ffffff'); text(have + '/' + keys.length, bx + 29.5, 160, 8, '#ffffff', 'center', '700');
        ctx.restore();
        btn(bx, 138, 59, 30, () => { skinTier = ti; });
      });
      const tier = TIERS[skinTier];
      Object.keys(SKINS).filter((kk) => SKINS[kk].tier === skinTier).forEach((k, i) => {
        const sk = SKINS[k];
        const x = 24 + (i % 2) * 160, y = 176 + Math.floor(i / 2) * 136;
        const owned = S.skins.includes(k), locked = !owned && sk.req && (S.maxHouse || 1) < sk.req;
        card(x, y, 152, 128, 12, tier.color);
        if (S.skin === k) { rr(x + 3, y + 3, 146, 122, 10); ctx.fillStyle = 'rgba(255,230,150,0.35)'; ctx.fill(); }
        // кот целиком в этом скине
        if (S.skin === k || skinTier >= 3) { const gg = ctx.createRadialGradient(x + 42, y + 50, 6, x + 42, y + 50, 48); gg.addColorStop(0, alpha(tier.color, 0.45)); gg.addColorStop(1, alpha(tier.color, 0)); ctx.fillStyle = gg; ctx.fillRect(x + 2, y + 4, 84, 84); }
        ctx.save(); ctx.beginPath(); ctx.rect(x + 3, y + 3, 84, 82); ctx.clip();
        ctx.translate(x + 40, y + 60); ctx.scale(0.66, 0.66);
        if (locked) ctx.globalAlpha = 0.45;
        catSprite(0, 0, { skin: k, aim: 0.35, bobY: Math.sin(time * 2 + i) * 1.5, blinkSeed: i * 1.7, eqColor: '#ff7a9c' });
        ctx.restore();
        ctx.font = '800 10px system-ui, sans-serif';
        text(sk.name, x + 116, y + 18, ctx.measureText(sk.name).width > 62 ? 8 : 10, INK, 'center', '800');
        rr(x + 92, y + 27, 48, 13, 6.5); ctx.fillStyle = tier.color; ctx.fill();
        text(tier.one, x + 116, y + 34, 7, '#ffffff', 'center', '800');
        { // бонус в 1–3 строки справа от кота
          ctx.font = '700 9px system-ui, sans-serif';
          const lines = []; let line = '';
          for (const wd of sk.text.split(' ')) { const t = line ? line + ' ' + wd : wd; if (ctx.measureText(t).width > 60 && line) { lines.push(line); line = wd; } else line = t; }
          lines.push(line);
          lines.forEach((l, j) => text(l, x + 116, y + 50 + j * 11, Math.min(9, (9 * 56) / ctx.measureText(l).width), '#2f8f4e', 'center', '700'));
        }
        if (locked) { orb(x + 18, y + 18, 11, '#6b5f86'); text('🔒', x + 18, y + 19, 10, '#ffffff'); }
        const label = owned ? (S.skin === k ? 'Надето' : 'Надеть') : locked ? '🔒 Дом ' + sk.req + ' · ' + sk.crystals + '💎' : sk.pass ? 'Пропуск, ур. 30' : sk.crystals ? sk.crystals + ' 💎' : sk.usd;
        button(x + 16, y + 92, 120, 28, label, owned ? '#7fd1ff' : sk.pass ? '#a86bff' : sk.usd ? '#ffc94d' : '#8ee08a', () => buySkin(k), locked || sk.pass ? 10 : 12, !(owned && S.skin === k) && !locked);
      });
      const TIER_INFO = ['150–300 💎, бонус +6–8%', '600–900 💎, бонус +10–20%', '1200–2000 💎, открываются на домах 10–25', 'донат $2.99–4.99, бонус +25–40%', 'донат $9.99–12.99 или Пропуск, бонус +50–60%'];
      text(tier.name + ': ' + TIER_INFO[skinTier], 180, 456, 9, '#6b5f86', 'center', '700');
      const pc = (kd) => Math.round((skinMult(kd) - 1) * 100);
      text('Собрано ' + S.skins.length + ' из ' + Object.keys(SKINS).length + ' · урон +' + pc('dmg') + '% · скорость +' + pc('rate') + '% · доход +' + pc('income') + '%', 180, 476, 9, '#2f8f4e', 'center', '800');
      text('Бонусы всех купленных скинов складываются, даже если скин не надет', 180, 496, 8.5, '#6b5f86', 'center', '700');
    }
  }

  function drawRaidPanel() {
    panelFrame('Рейд: Призрачный особняк');
    // сцена: ночное небо, холм, особняк
    const sx = 28, sy = 104, sw = 304, sh = 170;
    ctx.save(); rr(sx, sy, sw, sh, 14); ctx.clip();
    const sky = ctx.createLinearGradient(0, sy, 0, sy + sh); sky.addColorStop(0, '#1d1640'); sky.addColorStop(1, '#5a3f8a'); ctx.fillStyle = sky; ctx.fillRect(sx, sy, sw, sh);
    for (let i = 0; i < 26; i++) { const px = sx + ((i * 97) % sw), py = sy + ((i * 53) % 90), tw = 0.4 + 0.6 * Math.abs(Math.sin(time * 2 + i)); ctx.fillStyle = `rgba(255,255,255,${tw})`; ctx.fillRect(px, py, 2, 2); }
    const mg = ctx.createRadialGradient(sx + 250, sy + 38, 6, sx + 250, sy + 38, 50); mg.addColorStop(0, 'rgba(255,240,180,0.5)'); mg.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = mg; ctx.fillRect(sx + 190, sy, 114, 100);
    ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(sx + 250, sy + 38, 18, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(200,190,150,0.5)'; ctx.beginPath(); ctx.arc(sx + 244, sy + 34, 4, 0, 7); ctx.arc(sx + 256, sy + 44, 3, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a2048'; ctx.beginPath(); ctx.moveTo(sx, sy + sh); ctx.quadraticCurveTo(sx + 150, sy + 100, sx + sw, sy + sh); ctx.fill();
    // особняк
    const mx = sx + 110, my = sy + 70;
    ctx.fillStyle = '#3d2f63'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.fillRect(mx, my + 20, 90, 62); ctx.strokeRect(mx, my + 20, 90, 62);
    ctx.beginPath(); ctx.moveTo(mx - 8, my + 22); ctx.lineTo(mx + 45, my - 6); ctx.lineTo(mx + 98, my + 22); ctx.closePath(); ctx.fillStyle = '#2b2048'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4a3a75'; ctx.fillRect(mx + 66, my - 14, 22, 40); ctx.strokeRect(mx + 66, my - 14, 22, 40);
    ctx.beginPath(); ctx.moveTo(mx + 62, my - 12); ctx.lineTo(mx + 77, my - 40); ctx.lineTo(mx + 92, my - 12); ctx.closePath(); ctx.fillStyle = '#2b2048'; ctx.fill(); ctx.stroke();
    const win = (wx, wy, w, h, k) => { const f = 0.6 + 0.4 * Math.abs(Math.sin(time * 3 + k)); ctx.fillStyle = k % 3 === 0 ? `rgba(200,140,255,${f})` : `rgba(255,220,120,${f})`; ctx.fillRect(wx, wy, w, h); ctx.lineWidth = 2; ctx.strokeRect(wx, wy, w, h); };
    win(mx + 10, my + 32, 14, 16, 1); win(mx + 36, my + 32, 14, 16, 2); win(mx + 72, my - 4, 10, 12, 3); win(mx + 10, my + 58, 14, 16, 4);
    ctx.fillStyle = '#1d1640'; rr(mx + 56, my + 56, 18, 26, 8); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
    // летучие мыши
    ctx.strokeStyle = '#1d1640'; ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) { const bx = sx + ((time * 30 + i * 110) % (sw + 40)) - 20, by = sy + 30 + i * 16 + Math.sin(time * 4 + i) * 6, f = Math.sin(time * 14 + i) * 4; ctx.beginPath(); ctx.moveTo(bx - 7, by - f); ctx.quadraticCurveTo(bx - 3, by, bx, by + 2); ctx.quadraticCurveTo(bx + 3, by, bx + 7, by - f); ctx.stroke(); }
    ghostSprite('mansion', sx + 58, sy + 92 + Math.sin(time * 2) * 6, 30, { phase: time * 2 });
    ctx.restore();
    rr(sx, sy, sw, sh, 14); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    // что даёт рейд
    const rows = [['clock', '30 секунд бьёшь огромный особняк'], ['gem', '+15 за каждый пробитый этаж'], ['jar', '+1 банка за каждый этаж'], ['attach', 'Насадка за каждые 3 этажа']];
    rows.forEach(([ic, t], i) => {
      const ry = 286 + i * 30;
      rr(40, ry, 280, 26, 13); ctx.fillStyle = i % 2 ? 'rgba(138,123,209,0.10)' : 'rgba(138,123,209,0.18)'; ctx.fill();
      drawIcon(ic, 58, ry + 13, 18);
      text(t, 76, ry + 13, 11, INK, 'left', '700');
    });
    text('Особняк стреляет, уворачивайся!', 180, 414, 10, '#c43c4c', 'center', '800');
    // билеты
    text('Билеты на сегодня', 120, 440, 12, INK, 'center', '800');
    for (let i = 0; i < 3; i++) { ctx.globalAlpha = i < S.raid.tickets ? 1 : 0.3; drawIcon('ticket', 212 + i * 34, 440, 28); ctx.globalAlpha = 1; }
    if (S.raid.tickets > 0) button(80, 466, 200, 50, '⚔ В бой', '#d68cff', startRaid, 16);
    else if (!S.raid.adUsed) button(80, 466, 200, 50, '🎬 +1 билет', '#ffc94d', () => showAd('Дополнительный билет рейда', () => { S.raid.adUsed = true; S.raid.tickets++; }), 15);
    else text('Новые билеты через ' + untilMidnight(), 180, 491, 13, '#6b5f86', 'center', '800');
  }
  function untilMidnight() {
    const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0);
    const s = Math.max(0, Math.floor((m - n) / 1000));
    return Math.floor(s / 3600) + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function drawWheelPanel() {
    panelFrame('Колесо удачи');
    const cx = 180, cy = 270, R = 112, seg = (Math.PI * 2) / WHEEL.length;
    // лучи за колесом
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(time * 0.3);
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = 'rgba(255,210,100,0.16)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-18, -170); ctx.lineTo(18, -170); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // подставка
    ctx.fillStyle = '#6b4fb0'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 26, cy + 40); ctx.lineTo(cx + 26, cy + 40); ctx.lineTo(cx + 54, cy + R + 44); ctx.lineTo(cx - 54, cy + R + 44); ctx.closePath(); ctx.fill(); ctx.stroke();
    plate(cx - 74, cy + R + 36, 148, 18, 9, '#8a7bd1');
    // обод с лампочками
    ctx.fillStyle = 'rgba(15,8,30,0.35)'; ctx.beginPath(); ctx.arc(cx, cy + 5, R + 16, 0, 7); ctx.fill();
    const rim = ctx.createLinearGradient(0, cy - R, 0, cy + R); rim.addColorStop(0, '#b49cff'); rim.addColorStop(1, '#5a3fb0');
    ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(cx, cy, R + 16, 0, 7); ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, bx = cx + Math.cos(a) * (R + 8), by = cy + Math.sin(a) * (R + 8);
      const on = (Math.floor(time * (wheelSpin ? 10 : 3)) + i) % 2 === 0;
      if (on) { const g = ctx.createRadialGradient(bx, by, 1, bx, by, 9); g.addColorStop(0, 'rgba(255,240,150,0.9)'); g.addColorStop(1, 'rgba(255,240,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, 9, 0, 7); ctx.fill(); }
      ctx.fillStyle = on ? '#fff6c0' : '#c9a24d'; ctx.beginPath(); ctx.arc(bx, by, 4, 0, 7); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
    }
    // сектора
    WHEEL.forEach((w, i) => {
      const a0 = wheelRot + i * seg - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a0 + seg); ctx.closePath();
      const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, R); g.addColorStop(0, shade(w.color, 0.55)); g.addColorStop(1, w.color);
      ctx.fillStyle = g; ctx.fill();
      if (wheelWin && wheelWin.idx === i && time - wheelWin.t < 2.5) { ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.3 * Math.sin(time * 12)})`; ctx.fill(); }
      ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      const am = a0 + seg / 2, ix = cx + Math.cos(am) * R * 0.64, iy = cy + Math.sin(am) * R * 0.64;
      drawIcon(w.icon, ix, iy - 6, 22);
      text(w.val, ix, iy + 13, 10, '#ffffff', 'center', '900');
    });
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R - 3, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    orb(cx, cy, 20, '#ffc94d');
    ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = '#ffffff'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 9, a = -Math.PI / 2 + (i * Math.PI) / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.restore();
    // стрелка с покачиванием на каждом секторе
    const frac = ((wheelRot / seg) % 1 + 1) % 1, wob = wheelSpin ? Math.max(0, 0.35 - frac) * 0.9 : 0;
    ctx.save(); ctx.translate(cx, cy - R - 14); ctx.rotate(-wob);
    ctx.fillStyle = 'rgba(15,8,30,0.35)'; ctx.beginPath(); ctx.moveTo(-13, 3); ctx.lineTo(13, 3); ctx.lineTo(0, 33); ctx.closePath(); ctx.fill();
    const pg = ctx.createLinearGradient(-13, 0, 13, 0); pg.addColorStop(0, '#ff8fa8'); pg.addColorStop(1, '#e8304f');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(-13, -4); ctx.quadraticCurveTo(0, -12, 13, -4); ctx.lineTo(0, 28); ctx.closePath(); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 2, 3.5, 0, 7); ctx.fill();
    ctx.restore();
    // кнопки
    if (wheelSpin) text('Крутится...', 180, 446, 14, INK, 'center', '800');
    else if (S.wheel.free > 0) button(80, 424, 200, 46, 'Крутить бесплатно', '#8ee08a', () => spinWheel(false), 14);
    else if (S.wheel.ads > 0) button(80, 424, 200, 46, '🎬 Крутить (' + S.wheel.ads + '/3)', '#ffc94d', () => spinWheel(true), 14);
    else text('Новые вращения через ' + untilMidnight(), 180, 446, 12, '#6b5f86', 'center', '800');
    if (wheelWin && !wheelSpin && time - wheelWin.t < 4) text('Выпало: ' + WHEEL[wheelWin.idx].label, 180, 492, 13, '#ff8fb1');
    text('1 бесплатно в день + 3 за рекламу', 180, 520, 10, '#6b5f86', 'center', '700');
  }

  function drawDailyPanel() {
    panelFrame('Награды за вход');
    const cur = S.daily.count % DAILY.length, ready = dailyReady();
    DAILY.forEach((d, i) => {
      const big = i === 6;
      const x = i < 4 ? 26 + i * 78 : 47 + (i - 4) * 78, y = i < 4 ? 106 : 216, w = big ? 110 : 70, h = 100;
      const claimed = i < cur, isToday = i === cur;
      const col = claimed ? '#8ee08a' : isToday ? '#ffc94d' : big ? '#ff8fb1' : '#b9afe8';
      if (isToday && ready) { const gg = ctx.createRadialGradient(x + w / 2, y + h / 2, 10, x + w / 2, y + h / 2, 70); gg.addColorStop(0, `rgba(255,210,100,${0.45 + 0.2 * Math.sin(time * 4)})`); gg.addColorStop(1, 'rgba(255,210,100,0)'); ctx.fillStyle = gg; ctx.fillRect(x - 30, y - 30, w + 60, h + 60); }
      ctx.save();
      if (isToday && ready) { const k = 1 + Math.sin(time * 4) * 0.03; ctx.translate(x + w / 2, y + h / 2); ctx.scale(k, k); ctx.translate(-x - w / 2, -y - h / 2); }
      rr(x, y + 3, w, h, 14); ctx.fillStyle = 'rgba(15,8,30,0.25)'; ctx.fill();
      rr(x, y, w, h, 14); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, shade(col, 0.55)); g.addColorStop(1, shade(col, 0.15)); ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      rr(x, y, w, 22, 14); ctx.save(); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(x, y, w, 22); ctx.restore();
      text('День ' + (i + 1), x + w / 2, y + 12, 10, '#ffffff', 'center', '900');
      if (big) { ctx.save(); ctx.translate(x + w / 2, y + 52); ctx.rotate(time * 0.8); for (let r = 0; r < 8; r++) { ctx.rotate(Math.PI / 4); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-5, -32); ctx.lineTo(5, -32); ctx.closePath(); ctx.fill(); } ctx.restore(); }
      ctx.globalAlpha = claimed ? 0.45 : 1;
      drawIcon(d.icon, x + w / 2, y + 50, big ? 40 : 32);
      ctx.globalAlpha = 1;
      text(d.label, x + w / 2, y + 85, 10, INK, 'center', '800');
      if (claimed) { orb(x + w / 2, y + 50, 14, '#3ddc97'); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + w / 2 - 6, y + 50); ctx.lineTo(x + w / 2 - 1, y + 55); ctx.lineTo(x + w / 2 + 7, y + 45); ctx.stroke(); ctx.lineCap = 'butt'; }
      if (isToday && ready) { rr(x + w / 2 - 28, y + h - 8, 56, 15, 7.5); ctx.fillStyle = '#ff4d6d'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); text('СЕГОДНЯ', x + w / 2, y + h - 0.5, 7.5, '#ffffff', 'center', '900'); }
      ctx.restore();
    });
    // прогресс недели
    text('Прогресс недели', 180, 338, 10, '#6b5f86', 'center', '800');
    for (let i = 0; i < 7; i++) {
      const px = 72 + i * 36;
      if (i < 6) { ctx.fillStyle = i < cur ? '#3ddc97' : '#d6cfe8'; ctx.fillRect(px, 354, 36, 5); }
      orb(px, 356, 8, i < cur ? '#3ddc97' : i === cur ? '#ffc94d' : '#c9c3e6');
    }
    if (ready) {
      button(40, 380, 136, 48, 'Забрать', '#8ee08a', () => claimDaily(false), 15);
      button(184, 380, 136, 48, '🎬 Забрать x2', '#ffc94d', () => showAd('Удвоение награды дня', () => claimDaily(true)), 14);
    } else {
      text('Следующая награда через', 180, 394, 11, '#6b5f86', 'center', '800');
      text(untilMidnight(), 180, 416, 18, '#ff8fb1');
    }
    text('Цикл из 7 дней повторяется. С VIP +100 💎 каждый день.', 180, 450, 10, '#6b5f86', 'center', '700');
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
    window_(30, y0, 300, h, modal.title);
    modal.lines.forEach((l, i) => fitText(l, 180, y0 + 60 + i * 20, 268, 12, INK, 'center', '700'));
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

  // =====================================================================
  // Заставка: ночной город, луна, призраки, кот с пылесосом и логотип
  // =====================================================================
  const SKYLINE = (() => {
    const R = rng(4242), list = [];
    for (let x = -10; x < W + 20;) { const w = 34 + R() * 40, h = 60 + R() * 90; list.push({ x, w, h, roof: R() < 0.5, wins: Array.from({ length: 6 }, () => R()) }); x += w - 4; }
    return list;
  })();
  const SPLASH_GHOSTS = [
    { type: 'sheet', x: 0.16, y: 290, r: 20, sp: 0.6 }, { type: 'fire', x: 0.62, y: 270, r: 16, sp: 0.8 },
    { type: 'sock', x: 0.12, y: 380, r: 16, sp: 1.1 }, { type: 'aurora', x: 0.9, y: 240, r: 15, sp: 0.9 },
    { type: 'pumpkin', x: 0.9, y: 450, r: 17, sp: 0.7 }, { type: 'moth', x: 0.08, y: 200, r: 13, sp: 1.2 },
  ];
  function drawSplash(a) {
    const t = splash ? splash.t : 0;
    ctx.save(); ctx.globalAlpha = a;
    // небо
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#120c2e'); sky.addColorStop(0.55, '#3b2a74'); sky.addColorStop(1, '#6a4a9a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) { const sx = (i * 97.3) % W, sy = (i * 53.7) % 420, tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + i)); ctx.fillStyle = `rgba(255,255,255,${tw * a})`; ctx.fillRect(sx, sy, i % 5 ? 1.5 : 2.5, i % 5 ? 1.5 : 2.5); }
    // луна
    const mx = 270, my = 120;
    const mg = ctx.createRadialGradient(mx, my, 20, mx, my, 150); mg.addColorStop(0, 'rgba(255,240,180,0.5)'); mg.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = mg; ctx.fillRect(mx - 150, my - 150, 300, 300);
    const mf = ctx.createRadialGradient(mx - 14, my - 14, 6, mx, my, 52); mf.addColorStop(0, '#fffbe6'); mf.addColorStop(1, '#ffe08a');
    ctx.fillStyle = mf; ctx.beginPath(); ctx.arc(mx, my, 52, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(220,190,120,0.45)'; [[-16, -10, 9], [14, 12, 12], [18, -20, 6], [-10, 22, 7]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(mx + dx, my + dy, r, 0, 7); ctx.fill(); });
    // облака
    for (let i = 0; i < 4; i++) { const cx = ((i * 120 + t * (8 + i * 3)) % (W + 160)) - 80, cy = 70 + i * 55; ctx.fillStyle = 'rgba(160,140,220,0.25)'; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, 7); ctx.arc(cx + 22, cy - 8, 24, 0, 7); ctx.arc(cx + 48, cy, 17, 0, 7); ctx.fill(); }
    // силуэт города с окнами
    const base = 520;
    for (const b of SKYLINE) {
      ctx.fillStyle = '#231a45'; ctx.fillRect(b.x, base - b.h, b.w, b.h + 130);
      if (b.roof) { ctx.beginPath(); ctx.moveTo(b.x - 4, base - b.h); ctx.lineTo(b.x + b.w / 2, base - b.h - 22); ctx.lineTo(b.x + b.w + 4, base - b.h); ctx.closePath(); ctx.fill(); }
      b.wins.forEach((r, k) => { const wx = b.x + 7 + (k % 2) * (b.w / 2 - 2), wy = base - b.h + 14 + Math.floor(k / 2) * 26; if (wy > base - 12 || r < 0.35) return; const f = 0.55 + 0.45 * Math.abs(Math.sin(t * 2 + r * 9)); ctx.fillStyle = r > 0.85 ? `rgba(190,140,255,${f})` : `rgba(255,214,120,${f})`; ctx.fillRect(wx, wy, 9, 11); });
    }
    const hill = ctx.createLinearGradient(0, 500, 0, H); hill.addColorStop(0, '#2b2152'); hill.addColorStop(1, '#170f30');
    ctx.fillStyle = hill; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, 540); ctx.quadraticCurveTo(180, 480, W, 540); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    // призраки вокруг
    SPLASH_GHOSTS.forEach((g, i) => {
      const gx = g.x * W + Math.sin(t * g.sp + i) * 18, gy = g.y + Math.cos(t * g.sp * 1.3 + i * 2) * 14;
      const gg = ctx.createRadialGradient(gx, gy, g.r * 0.5, gx, gy, g.r * 2.2); gg.addColorStop(0, alpha(GHOSTS[g.type].body, 0.35)); gg.addColorStop(1, alpha(GHOSTS[g.type].body, 0));
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(gx, gy, g.r * 2.2, 0, 7); ctx.fill();
      ghostSprite(g.type, gx, gy, g.r, { phase: t * 3 + i, lookX: (180 - gx) / 200, lookY: 0.3 });
    });
    // кот засасывает призрака: воронка луча
    const cx = 150, cy = 492 + (1 - Math.min(1, t / 0.7)) * 160;
    const tx = 276 + Math.sin(t * 2) * 10, ty = 330 + Math.cos(t * 2.5) * 8;
    const aim = Math.atan2(ty - (cy - 30), tx - cx);
    const nx = cx + Math.cos(aim) * 52, ny = cy - 28 + Math.sin(aim) * 52;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const len = Math.hypot(tx - nx, ty - ny);
    ctx.translate(nx, ny); ctx.rotate(Math.atan2(ty - ny, tx - nx));
    const cone = ctx.createLinearGradient(0, 0, len, 0); cone.addColorStop(0, 'rgba(160,255,240,0.55)'); cone.addColorStop(1, 'rgba(160,255,240,0.05)');
    ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(len, -26); ctx.lineTo(len, 26); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) { const u = ((t * 1.4 + k / 4) % 1), px = len * (1 - u); ctx.beginPath(); ctx.ellipse(px, 0, 3, 6 + 18 * (1 - u), 0, 0, 7); ctx.stroke(); }
    ctx.restore();
    ghostSprite('sheet', tx, ty, 15 + Math.sin(t * 6) * 1.5, { phase: t * 8, hit: Math.sin(t * 10) > 0.6, lookX: -1, lookY: 1 });
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1.55, 1.55);
    catSprite(0, 0, { skin: S.skin, aim, bobY: Math.sin(t * 3) * 2, blinkSeed: 1, eqColor: '#9ff3ff' });
    ctx.restore();
    // логотип падает сверху с пружинкой
    const k = Math.min(1, t / 0.9), drop = 1 - Math.pow(1 - k, 3) * Math.cos(k * 9);
    const ly = -120 + drop * 230;
    ctx.save(); ctx.translate(180, ly); ctx.rotate(Math.sin(t * 1.6) * 0.025);
    const logo = (str, y, size, c1, c2) => {
      ctx.font = '900 ' + size + 'px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(str).width, sz = w > 320 ? (size * 320) / w : size;
      ctx.font = '900 ' + sz + 'px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.lineJoin = 'round';
      ctx.fillStyle = 'rgba(10,5,25,0.6)'; ctx.fillText(str, 0, y + 6);
      ctx.strokeStyle = INK; ctx.lineWidth = 11; ctx.strokeText(str, 0, y);
      const g = ctx.createLinearGradient(0, y - sz / 2, 0, y + sz / 2); g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g; ctx.fillText(str, 0, y);
      ctx.save(); ctx.beginPath(); ctx.rect(-180, y - sz / 2, 360, sz * 0.38); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillText(str, 0, y); ctx.restore();
    };
    logo('КОТ-', -34, 54, '#fff3b0', '#ffb02e');
    logo('ЭКЗОРЦИСТ', 22, 50, '#d6fbff', '#7f8cff');
    ctx.restore();
    // лента-подзаголовок
    if (t > 0.6) {
      ctx.save(); ctx.globalAlpha = a * Math.min(1, (t - 0.6) * 3);
      const ry = ly + 70, rw = 230, rx = 180 - rw / 2;
      ctx.fillStyle = shade('#ff8fb1', -0.3); ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(rx - 14, ry + 4); ctx.lineTo(rx + 6, ry + 4); ctx.lineTo(rx + 6, ry + 30); ctx.lineTo(rx - 14, ry + 30); ctx.lineTo(rx - 6, ry + 17); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx + rw + 14, ry + 4); ctx.lineTo(rx + rw - 6, ry + 4); ctx.lineTo(rx + rw - 6, ry + 30); ctx.lineTo(rx + rw + 14, ry + 30); ctx.lineTo(rx + rw + 6, ry + 17); ctx.closePath(); ctx.fill(); ctx.stroke();
      plate(rx, ry - 2, rw, 30, 10, '#ff8fb1');
      text('Лови призраков пылесосом!', 180, ry + 13, 13, '#ffffff');
      ctx.restore();
    }
    // нижняя часть
    if (t > 1) {
      const p = 0.6 + 0.4 * Math.abs(Math.sin(t * 2.5));
      ctx.save(); ctx.globalAlpha = a * p;
      text('Нажми, чтобы начать', 180, 586, 18, '#ffffff');
      ctx.restore();
      if (S.maxHouse > 1) text('Рекорд: дом ' + S.maxHouse + (S.prestiges ? ' · освящений: ' + S.prestiges : ''), 180, 612, 11, '#c9c3e6', 'center', '700');
    }
    text('прототип', 180, 632, 9, 'rgba(201,195,230,0.6)', 'center', '700');
    ctx.restore();
  }

  function draw() {
    buttons.length = 0; scrollAreas.length = 0;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    if (splash && !splash.out) { drawSplash(1); return; }
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1d1729'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath(); ctx.rect(VIEW.x, VIEW.y, VIEW.w, VIEW.h); ctx.clip();
    if (shake > 0 && opt('shake')) ctx.translate((Math.random() - 0.5) * 8 * shake, (Math.random() - 0.5) * 8 * shake);
    ctx.translate(VIEW_CX, VIEW_CY); ctx.scale(ZOOM, ZOOM); ctx.translate(-cam.x, -cam.y);
    drawMap();
    drawZones();
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
      ctx.globalAlpha = Math.min(1, Math.max(0, rg.life / 0.3));
      ctx.strokeStyle = rg.color || '#ffcf8a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r, 0, 7); ctx.stroke();
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
      const dark = moonActive() ? 0.12 : districtIndex() === 4 && !raid ? 0.58 : 0.3;
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
    drawTutorial();
    if (behIntro && !panel && !modal && !splash) {
      const b = BEHAVIORS[behIntro.kind], k = Math.min(1, behIntro.life * 2, (5 - behIntro.life) * 4);
      ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 20);
      rr(14, 448, 332, 52, 16); ctx.fillStyle = 'rgba(10,5,25,0.4)'; ctx.fill();
      plate(14, 444, 332, 52, 16, '#fffaf2', { lw: 3 });
      ghostSprite(behIntro.type, 44, 470, 15, { phase: time * 2 });
      behIcon(behIntro.kind, 58, 458, 7);
      fitText('Новый враг: ' + GHOSTS[behIntro.type].name + ' · ' + b.name, 72, 461, 264, 12, INK, 'left', '800');
      fitText(b.hint[0].toUpperCase() + b.hint.slice(1), 72, 479, 264, 11, '#6b5f86', 'left', '700');
      ctx.restore();
    }
    if (panel === 'squad') drawSquadPanel();
    else if (panel === 'attach') drawAttachPanel();
    else if (panel === 'bestiary') drawBestiaryPanel();
    else if (panel === 'settings') drawSettingsPanel();
    else if (panel === 'achievements') drawAchievementsPanel();
    else if (panel === 'quests') drawQuestsPanel();
    else if (panel === 'prestige') drawPrestigePanel();
    else if (panel === 'shop') drawShopPanel();
    else if (panel === 'raid') drawRaidPanel();
    else if (panel === 'wheel') drawWheelPanel();
    else if (panel === 'daily') drawDailyPanel();
    else if (panel === 'offline') drawOfflinePanel();
    if (modal) drawModal();
    if (splash && splash.out) { buttons.length = 0; drawSplash(splash.out / 0.6); }
    if (toast) {
      ctx.globalAlpha = Math.min(1, toast.life * 3);
      ctx.font = '800 14px system-ui, sans-serif';
      const w = ctx.measureText(toast.text).width + 30;
      plate(180 - w / 2, panel ? 592 : 108, w, 34, 17, '#3d3160');
      text(toast.text, 180, (panel ? 592 : 108) + 17, 14, '#ffffff');
      ctx.globalAlpha = 1;
    }
    if (iconSheet) { // отладка: все нарисованные иконки
      ctx.fillStyle = '#fffaf2'; ctx.fillRect(0, 0, 360, 640);
      Object.keys(INLINE_ICONS).forEach((e, i) => { const x = 30 + (i % 6) * 60, y = 40 + Math.floor(i / 6) * 70; drawIcon(INLINE_ICONS[e], x, y, 34); text(INLINE_ICONS[e], x, y + 28, 9, INK); text(e + ' 12', x, y + 44, 12, INK); });
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
  window.__game = { icons: () => { iconSheet = !iconSheet; }, spawn: (t, o) => spawnGhost(t, o), behIntro: () => behIntro,
    state: () => S, sfx: SFX, mapImage: () => mapCanvas.toDataURL(), ghosts: () => ghosts, cat: () => cat, cam: () => cam, resetRoom: () => resetRoom(), open: (p) => { panel = p; }, gold: () => { goldCd = 0; }, goldObj: () => gold, toScreen,
    splash: () => { splash = { t: 0, out: 0 }; },
    tut: (n) => { S.tut = n; },
    zones: () => zones,
    reset: () => { localStorage.removeItem(SAVE_KEY); S = defaultState(); ensureQuests(); dailyReset(); syncSlots(); resetRoom(); },
    close: () => { modal = null; },
    tab: (q, pr, pp) => { if (q) questTab = q; if (pr) prestTab = pr; if (pp !== undefined) passPage = pp; },
    go: (h, room) => { S.house = h; S.room = room || 1; S.maxHouse = Math.max(S.maxHouse, h); S.maxStage = Math.max(S.maxStage, stageIndex()); checkUnlocks(); resetRoom(); },
    info: () => ({ dmg: catDamage(), rate: fireRate(), inc: incomeMult(), hp: ghostHp(0), bossHp: ghostHp(3), slots: [S.squad.length, S.equipped.length], stars: maxStars(), rank: maxRank(), offline: offlineHours(), stonesFor: stonesFor(S.house), start: prestigeStart() }),
  };
})();
