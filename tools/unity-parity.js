// node tools/unity-parity.js — эталонные значения формул из src/game.js для проверки C#-порта (unity/DotnetCheck).
// Исполняет разделы «Данные» и «Формулы» веб-версии на случайных состояниях и пишет unity/DotnetCheck/parity.json.
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const lines = fs.readFileSync(path.join(root, 'src', 'game.js'), 'utf8').split('\n');
const lineOf = (re) => { const i = lines.findIndex((l) => re.test(l)); if (i < 0) throw new Error(String(re)); return i; };
const dataSrc = lines.slice(lineOf(/^\s*const RARITY = \[/), lineOf(/^\s*\/\/ Состояние$/)).join('\n');
const formulaSrc = lines.slice(lineOf(/^\s*const stageIndex = /), lineOf(/^\s*\/\/ Мир$/) - 1).join('\n');

const body = `
  let S = null;
  const showToast = () => {}, SFX = { play() {} }, save = () => {}, giveAttach = () => {}, giveGhost = () => {}, rollRank = () => 0, addPassXp = () => {};
  const cat = { x: 0, y: 0 };
  ${dataSrc}
  const findItem = (id) => S.inventory.find((i) => i.id === id);
  ${formulaSrc}
  return {
    set: (s) => { S = s; },
    eval: () => ({
      catDamage: catDamage(), fireRate: fireRate(), captureChance: captureChance(), pullPower: pullPower(), pullOver: pullOver(), doubleCatch: doubleCatch(),
      catch1: catchChance(1, false), catchBoss: catchChance(3, true), critChance: critChance(), critMult: critMult(), incomeMult: incomeMult(),
      hp0: ghostHp(0), hp3: ghostHp(3), reward0: ghostReward(0), reward2: ghostReward(2), stonesFor: stonesFor(S.house), attachMult: attachMult(), setMult: setMult(),
      squad0: S.inventory.length ? squadDamage(S.inventory[0]) : 0, range: catRange(), mainKind: mainKind(), skinDmg: skinMult('dmg'), skinIncome: skinMult('income'),
      cost: [upgradeCost(S.lvPower, 10), upgradeCost(S.lvPull, 14), upgradeCost(S.lvCollect, 12)], bossTime: bossTime(), slots: [attachSlots(), squadSlots()],
    }),
    fmt: (n, d) => fmt(n, d),
    keys: { ghosts: Object.keys(GHOSTS).filter((k) => GHOSTS[k].d >= 0 && !GHOSTS[k].event), skins: Object.keys(SKINS), attach: Object.keys(ATTACH) },
  };
`;
const G = new Function(body)();

// детерминированный генератор, чтобы файл не менялся от запуска к запуску
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = (a) => a[Math.floor(rnd() * a.length)];

const cases = [];
for (let n = 0; n < 60; n++) {
  const house = 1 + Math.floor(rnd() * 230);
  const inv = [], att = [];
  for (let i = 0; i < 6; i++) inv.push({ id: i + 1, type: pick(G.keys.ghosts), stars: 1 + Math.floor(rnd() * 5) });
  for (let i = 0; i < 4; i++) att.push({ id: 100 + i, kind: pick(G.keys.attach), rank: Math.floor(rnd() * 6) });
  const skins = ['ginger'].concat(G.keys.skins.filter(() => rnd() < 0.25));
  const altar = { might: Math.floor(rnd() * 12), harvest: Math.floor(rnd() * 12), luck: Math.floor(rnd() * 6), hourglass: Math.floor(rnd() * 5), night: Math.floor(rnd() * 5), memory: Math.floor(rnd() * 6) };
  const s = {
    house, room: 1 + Math.floor(rnd() * 5), maxHouse: house + Math.floor(rnd() * 20), maxStage: 0,
    lvPower: 1 + Math.floor(rnd() * 400), lvPull: 1 + Math.floor(rnd() * 200), lvCollect: 1 + Math.floor(rnd() * 300),
    stones: Math.floor(rnd() * 3000), altar, skins, inventory: inv, squad: [1, 2, 3, 4, rnd() < 0.5 ? 5 : null], attach: att, equipped: [100, 101, 102, rnd() < 0.5 ? 103 : null],
    bestClaimed: { sheet: Math.floor(rnd() * 4), sock: Math.floor(rnd() * 4) }, boostPrest: rnd() < 0.3 ? 2 : 0, starter: rnd() < 0.5,
    moonUntil: 0, vipUntil: 0,
  };
  s.maxStage = (s.maxHouse - 1) * 5 + 4;
  G.set(s);
  cases.push({ state: s, expect: G.eval() });
}
const fmts = [0, 5.5, 99.123, 999, 1000, 1234.5, 98765, 1.5e6, 2.25e9, 7e12, 3.3e15, 4.4e18, 1e40, 1e90].map((v) => [v, G.fmt(v), G.fmt(v, 2)]);
const out = path.join(root, 'unity', 'DotnetCheck', 'parity.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ cases, fmts }, null, 1) + '\n');
console.log('эталон: ' + cases.length + ' состояний -> ' + path.relative(root, out));
