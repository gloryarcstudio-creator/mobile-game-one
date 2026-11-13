// node tools/export-unity.js — переносит данные, арт и переводы из веб-версии в Unity-проект (unity/).
// Источник правды остаётся src/game.js: таблицы (районы, призраки, скины, награды…) вычисляются из него,
// функции-награды прогоняются на заглушке состояния и превращаются в описания вида {gems: 20}.
// Арт: art/*.webp -> unity/Assets/CatExorcist/Resources/Art/<ключ>.png (нужен python3 с Pillow).
// Переводы: i18n/<lang>.json -> unity/Assets/CatExorcist/Resources/i18n/<lang>.json (ключи те же, FNV-1a от русского текста).
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'src', 'game.js'), 'utf8');
const lines = src.split('\n');
const OUT = path.join(root, 'unity', 'Assets', 'CatExorcist', 'Resources');
const args = new Set(process.argv.slice(2));

const lineOf = (re) => { const i = lines.findIndex((l) => re.test(l)); if (i < 0) throw new Error('не нашёл ' + re); return i; };
const slice = (fromRe, toRe) => lines.slice(lineOf(fromRe), lineOf(toRe)).join('\n');
const metaJson = (name) => { const m = src.match(new RegExp('const ' + name + ' = (\\{.*\\});')); if (!m) throw new Error(name); return JSON.parse(m[1]); };

// ---- 1. Таблицы данных: исполняем кусок game.js с заглушками
const dataSrc = slice(/^\s*const RARITY = \[/, /^\s*\/\/ Состояние$/);
const mapSrc = slice(/^\s*const FLOORS = \[/, /^\s*const mapKeyNow/);
const edgeSrc = slice(/^\s*const OWN_EDGE = \[/, /^\s*function drawBorder/);
let rec = null; // запись того, что делает функция-награда
const stubS = () => new Proxy({ crystals: 0, jars: 0, stones: 0, ecto: 0, moonUntil: 0, skins: [], skin: '' }, {});
const sandbox = `
  let S = __S();
  const giveAttach = (rank, kind) => __rec.attach = (__rec.attach || []).concat([{ rank: rank === '__ROLL__' ? -1 : rank }]);
  const giveGhost = (type, stars) => __rec.ghost = { type, stars: stars || 1 };
  const district = () => ({ ghosts: ['__D0', '__D1', '__EPIC'] });
  const rollRank = () => '__ROLL__';
  const ghostReward = () => 1;
  const fmt = (n, d) => String(n);
  const showToast = () => {}, SFX = { play() {} }, save = () => {}, showAd = () => {}, addPassXp = () => {}, unlocked = () => true;
  const floaters = [], ui = () => false, toScreen = () => ({});
  ${dataSrc}
  ${mapSrc}
  ${edgeSrc}
  return { RARITY, DISTRICTS, HOUSES_PER_DISTRICT, GHOSTS, EXPEDITIONS, EVENTS, ACHIEVEMENTS, ACH_REWARD, BEHAVIORS, ATTACH, RANKS, RANK_COLORS,
    RANK_WEIGHTS, RANK_WEIGHTS_HIGH, SUMMON_COST, BEST_MILESTONES, BEST_REWARDS, BEST_BONUS, QUEST_TYPES, TIERS, SKINS, CRYSTAL_PACKS, DAILY, WHEEL,
    RAID_TIME, ROOMS_PER_HOUSE, GHOSTS_PER_ROOM, MAX_ALIVE, PRESTIGE_HOUSE, VERSION, CIRCLE, UNLOCKS, ALTAR, DAILY_MISSIONS, MISSION_GEMS, MISSION_XP, CHEST_XP,
    PASS_LEVELS, PASS_XP, PASS_DAYS, PASS_PRICE, PASS_SKIP, PASS_FREE, PASS_PREM, FLOORS, DECOR, BIG_DECOR, SOLID, OWN_EDGE,
    setS: (v) => { S = v; }, getS: () => S };
`;
const env = new Function('__S', '__rec', 'window', 'document', sandbox);
const recBox = {};
const D = env(stubS, new Proxy({}, { get: (_, k) => recBox.cur && recBox.cur[k], set: (_, k, v) => { recBox.cur[k] = v; return true; } }), {}, {});

// Функция-награда -> описание. Сравниваем состояние до и после вызова.
function probe(fn) {
  const before = { crystals: 0, jars: 0, stones: 0, ecto: 0, moonUntil: 0, skins: [], skin: '' };
  D.setS(Object.assign({}, before, { skins: [] }));
  recBox.cur = {};
  const t0 = Date.now();
  fn();
  const S = D.getS(), r = {};
  if (S.crystals) r.gems = S.crystals;
  if (S.jars) r.jars = S.jars;
  if (S.stones) r.stones = S.stones;
  if (S.ecto) r.ectoRooms = S.ecto; // ghostReward(0) * N
  if (S.moonUntil) r.moonSec = Math.round((S.moonUntil - t0) / 1000);
  if (S.skin) r.skin = S.skin;
  if (recBox.cur.attach) r.attach = recBox.cur.attach.map((a) => a.rank);
  if (recBox.cur.ghost) r.ghost = { type: recBox.cur.ghost.type === '__EPIC' ? '@epic' : recBox.cur.ghost.type, stars: recBox.cur.ghost.stars };
  return r;
}
const strip = (o, drop) => { const r = {}; for (const k in o) if (typeof o[k] !== 'function' && !(drop || []).includes(k)) r[k] = o[k]; return r; };

const data = {
  version: D.VERSION,
  rarity: D.RARITY,
  districts: D.DISTRICTS,
  housesPerDistrict: D.HOUSES_PER_DISTRICT,
  ghosts: Object.fromEntries(Object.entries(D.GHOSTS).map(([k, g]) => [k, g])),
  expeditions: D.EXPEDITIONS,
  events: D.EVENTS,
  achievements: D.ACHIEVEMENTS.map((a) => strip(a)),
  achReward: D.ACH_REWARD,
  behaviors: D.BEHAVIORS,
  attach: D.ATTACH,
  ranks: D.RANKS, rankColors: D.RANK_COLORS, rankWeights: D.RANK_WEIGHTS, rankWeightsHigh: D.RANK_WEIGHTS_HIGH,
  summonCost: D.SUMMON_COST,
  bestMilestones: D.BEST_MILESTONES, bestRewards: D.BEST_REWARDS, bestBonus: D.BEST_BONUS,
  quests: Object.fromEntries(Object.entries(D.QUEST_TYPES).map(([k, q]) => [k, { goal: q.goal }])),
  tiers: D.TIERS,
  skins: D.SKINS,
  crystalPacks: D.CRYSTAL_PACKS,
  daily: D.DAILY.map((d) => Object.assign(strip(d), { reward: probe(d.apply) })),
  wheel: D.WHEEL.map((w) => Object.assign(strip(w), { reward: probe(w.apply) })),
  raidTime: D.RAID_TIME, roomsPerHouse: D.ROOMS_PER_HOUSE, ghostsPerRoom: D.GHOSTS_PER_ROOM, maxAlive: D.MAX_ALIVE, prestigeHouse: D.PRESTIGE_HOUSE, circle: D.CIRCLE,
  unlocks: D.UNLOCKS.map((u) => strip(u)),
  altar: Object.fromEntries(Object.entries(D.ALTAR).map(([k, t]) => [k, Object.assign(strip(t), { costs: Array.from({ length: t.max }, (_, l) => t.cost(l)) })])),
  dailyMissions: Object.fromEntries(Object.entries(D.DAILY_MISSIONS).map(([k, m]) => [k, strip(m)])),
  missionGems: D.MISSION_GEMS, missionXp: D.MISSION_XP, chestXp: D.CHEST_XP,
  pass: { levels: D.PASS_LEVELS, xp: D.PASS_XP, days: D.PASS_DAYS, price: D.PASS_PRICE, skip: D.PASS_SKIP,
    free: D.PASS_FREE.map((r) => Object.assign(strip(r), { reward: probe(r.apply) })),
    prem: D.PASS_PREM.map((r) => Object.assign(strip(r), { reward: probe(r.apply) })) },
  floors: D.FLOORS, decor: D.DECOR, bigDecor: Object.keys(D.BIG_DECOR), solid: Object.keys(D.SOLID),
  // районы со своим нарисованным полом (9–20): у них свой набор мебели, арт не перекрашивается
  ownArt: D.DISTRICTS.map((_, i) => i).filter((i) => fs.existsSync(path.join(root, 'art', 'dz-floor-d' + (i + 1) + '.webp')) || fs.existsSync(path.join(root, 'art', 'floor-d' + (i + 1) + '.webp')) || fs.existsSync(path.join(root, 'art', 'x-floor-d' + (i + 1) + '.webp'))),
  ownEdge: D.OWN_EDGE,
  uiSlice: metaJson('UI_SLICE'), uiIcons: metaJson('UI_ICONS'), extraBox: metaJson('EXTRA_BOX'),
  aspect: Object.assign({}, metaJson('ART_ASPECT'), metaJson('EXTRA_ASPECT'), metaJson('DIST_ASPECT')),
};
// подписи UI-строк, которые в игре собираются из кусочков, переносим как есть: перевод ищется по тем же ключам
fs.mkdirSync(path.join(OUT, 'Data'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'Data', 'game-data.json'), JSON.stringify(data, null, 1) + '\n');
console.log('данные: ' + Object.keys(data.ghosts).length + ' призраков, ' + Object.keys(data.skins).length + ' скинов, ' + data.unlocks.length + ' открытий');

// ---- 2. Переводы
const I18N_OUT = path.join(OUT, 'i18n');
fs.mkdirSync(I18N_OUT, { recursive: true });
// строки, которые есть только в Unity-версии (восстановление покупок, настройки конфиденциальности, уведомления…),
// лежат в tools/unity-strings.json { "русский текст": { "en": …, "de": … } } и добавляются к словарям веб-версии
const { id: locId } = require('./i18n');
const extra = JSON.parse(fs.readFileSync(path.join(__dirname, 'unity-strings.json'), 'utf8'));
let added = 0;
for (const f of fs.readdirSync(path.join(root, 'i18n'))) {
  if (!f.endsWith('.json')) continue;
  const lang = f.slice(0, -5), dict = JSON.parse(fs.readFileSync(path.join(root, 'i18n', f), 'utf8'));
  for (const [ru, tr] of Object.entries(extra)) {
    const k = locId(ru);
    if (dict[k] !== undefined) continue;
    if (lang === 'ru') dict[k] = ru;
    else if (tr[lang]) dict[k] = tr[lang];
    else throw new Error('unity-strings.json: нет перевода «' + ru + '» на ' + lang);
    added++;
  }
  fs.writeFileSync(path.join(I18N_OUT, f), JSON.stringify(dict) + '\n');
}
console.log('переводы: ' + fs.readdirSync(I18N_OUT).length + ' языков, строк только для Unity: ' + Object.keys(extra).length + ' (добавлено ' + added + ')');

// ---- 3. Арт: webp -> png (Unity не читает webp). Ключ = имя файла без «x-» и «dz-».
if (!args.has('--no-art')) {
  const ART_OUT = path.join(OUT, 'Art');
  fs.mkdirSync(ART_OUT, { recursive: true });
  const py = `
import sys, os
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
n = 0
for f in sorted(os.listdir(src)):
    if not f.endswith('.webp'): continue
    key = f[:-5]
    if key.startswith('x-'): key = key[2:]
    elif key.startswith('dz-'): key = key[3:]
    o = os.path.join(dst, key + '.png')
    if os.path.exists(o) and os.path.getmtime(o) >= os.path.getmtime(os.path.join(src, f)): continue
    Image.open(os.path.join(src, f)).save(o, optimize=True); n += 1
print('арт: обновлено', n)
`;
  console.log(execFileSync('python3', ['-I', '-c', py, path.join(root, 'art'), ART_OUT]).toString().trim());
  // иконка и заставка для настроек плеера
  const BR = path.join(root, 'unity', 'Assets', 'CatExorcist', 'Branding');
  fs.mkdirSync(BR, { recursive: true });
  for (const f of ['icon.png', 'splash.png']) fs.copyFileSync(path.join(root, 'assets', f), path.join(BR, f));
  fs.copyFileSync(path.join(root, 'assets', 'store', 'app-icon.png'), path.join(BR, 'app-icon.png'));
}
