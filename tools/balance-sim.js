// Симулятор прогрессии «Кота-экзорциста». Запуск: node tools/balance-sim.js '{"hpGrow":1.26}'
// Модель: 22 призрака в комнате, босс 30 с, жадная автопрокачка, цикл освящений с талантами алтаря.
const P = Object.assign({
  hpBase: 22, hpGrow: 1.26, rwBase: 4, rwGrow: 1.15, killK: 0.45,
  dmgGrow: 1.15, rateStep: 0.06, incGrow: 1.08, costGrow: 1.22,
  bases: [10, 14, 12], bossMul: 10, stoneDmg: 0.05, stoneInc: 0.02,
  sA: 0.5, sE: 1.5, minRoom: 14, talStep: 1.25, talCost: 2, talGrow: 1.6,
  hpKnee: 395, hpGrow2: 1.185, runs: 25,
}, JSON.parse(process.argv[2] || '{}'));
// здоровье на стадии: до hpKnee растёт на hpGrow, дальше мягче, на hpGrow2
const hpAt = (sg) => P.hpBase * Math.pow(P.hpGrow, Math.min(sg, P.hpKnee)) * Math.pow(P.hpGrow2, Math.max(0, sg - P.hpKnee));
const stonesFor = (h) => (h < 10 ? 0 : Math.floor(P.sA * Math.pow(h - 4, P.sE)));
const sumRw = (s0, inc) => { let s = 0; for (let i = 0; i < s0; i++) s += 22 * P.rwBase * Math.pow(P.rwGrow, i) * inc * 1.425 * P.killK; return s; };
function run(st, tal, startHouse, ext0, stopStuckMin, maxMin, keepLv) {
  let lv = keepLv ? keepLv.slice() : [1, 1, 1], t = 0;
  const sd = (1 + P.stoneDmg * st) * tal.d, si = (1 + P.stoneInc * st) * tal.i;
  // старт: самый дальний дом, где босс падает за 12 с с сохранёнными уровнями, но не дальше startHouse
  let sh = 1;
  for (let h = 1; h <= startHouse; h++) { const sg = h * 5 - 1; const dps = 10 * Math.pow(P.dmgGrow, lv[0] - 1) * sd * ext0 * Math.min(3 + P.rateStep * (lv[1] - 1), 12) * 1.2 * 1.6; if (hpAt(sg) * P.bossMul / dps <= 12) sh = h; }
  let stage = (sh - 1) * 5, best = stage, lastProg = 0;
  let ecto = 0;
  const log = {};
  const buy = () => { for (let n = 0; n < 500; n++) { let bi = -1, bc = Infinity; for (let i = 0; i < 3; i++) { const c = P.bases[i] * Math.pow(P.costGrow, lv[i] - 1); if (c < bc) { bc = c; bi = i; } } if (ecto < bc) break; ecto -= bc; lv[bi]++; } };
  buy();
  while (t < maxMin * 60) {
    const room = stage % 5 + 1;
    const hp = hpAt(stage);
    const ext = ext0 * (1 + Math.min(1, t / 3600));
    const dps = 10 * Math.pow(P.dmgGrow, lv[0] - 1) * sd * ext * Math.min(3 + P.rateStep * (lv[1] - 1), 12) * 1.2 * 1.6;
    const inc = Math.pow(P.incGrow, lv[2] - 1) * si;
    const rwAt = (s) => P.rwBase * Math.pow(P.rwGrow, s) * inc * 1.425 * P.killK;
    let dt;
    if (room === 5) {
      if (hp * P.bossMul / dps > 30) { const fhp = hpAt(stage - 1) * 1.425; dt = Math.max(P.minRoom, 22 * fhp / dps) + 2; ecto += 22 * rwAt(stage - 1); }
      else { dt = hp * P.bossMul / dps + 4; ecto += rwAt(stage) * 30; stage++; }
    } else { dt = Math.max(P.minRoom, 22 * hp * 1.425 / dps) + 2; ecto += 22 * rwAt(stage); stage++; }
    t += dt; buy();
    if (stage > best) { best = stage; lastProg = t; }
    const h = Math.floor(best / 5) + 1;
    if (!log[h]) log[h] = Math.round(t / 60);
    if (t - lastProg > stopStuckMin * 60) break;
  }
  return { house: Math.floor(best / 5) + 1, min: Math.round(t / 60), log, lv, sh };
}
const r1 = run(0, { d: 1, i: 1 }, 1, 1, 10, 240);
console.log('Забег 1: дом', r1.house, 'за', r1.min, 'мин', JSON.stringify(r1.log));
let stones = 0, spent = 0, L = { d: 0, i: 0, s: 0 }, total = r1.min, rec = r1.house, lastLv = r1.lv;
stones += stonesFor(r1.house);
for (let p = 1; p <= P.runs; p++) {
  // покупаем таланты по кругу, пока хватает
  const cost = (k) => (k === 's' && L.s >= 5 ? Infinity : Math.ceil(P.talCost * Math.pow(P.talGrow, L[k]) * (k === 's' ? 3 : 1)));
  for (let g = 0; g < 100; g++) { const k = ['d', 'i', 's'].sort((a, b) => cost(a) - cost(b))[0]; if (stones - spent < cost(k)) break; spent += cost(k); L[k]++; }
  const tal = { d: Math.pow(P.talStep, L.d), i: Math.pow(P.talStep, L.i) };
  const ext = 1 + p * 0.15;
  const keep = Math.min(0.5, 0.1 * L.s);
  const kl = lastLv.map((x) => Math.max(1, Math.floor(x * keep)));
  const r = run(stones, tal, Math.floor(rec * 0.6), ext, 10, 240, kl);
  const start = r.sh; lastLv = r.lv;
  total += r.min;
  const g = stonesFor(r.house);
  console.log(`Освящ. ${p}: камней ${stones}, таланты урон ${L.d} доход ${L.i} старт ${L.s} → старт дом ${start}, дошёл до ${r.house} за ${r.min} мин (+${g}), всего ${Math.round(total / 6) / 10} ч`);
  stones += g; rec = Math.max(rec, r.house);
}
