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

  // ---------- Данные ----------
  const RARITY = [
    { name: 'Обычный', color: '#c9c3e6', hp: 1, reward: 1, squad: 1 },
    { name: 'Редкий', color: '#7fd1ff', hp: 2, reward: 2.5, squad: 2.2 },
    { name: 'Эпический', color: '#d68cff', hp: 4, reward: 6, squad: 5 },
    { name: 'Легендарный', color: '#ffc94d', hp: 12, reward: 25, squad: 14 },
  ];
  const GHOSTS = {
    sheet: { name: 'Простынка', rarity: 0, body: '#f6f3ff', shape: 'sheet' },
    sock: { name: 'Носок-полтергейст', rarity: 1, body: '#ffd6e3', shape: 'sock' },
    fire: { name: 'Дух камина', rarity: 2, body: '#ffc08a', shape: 'fire' },
    washer: { name: 'Стиральная машина', rarity: 3, body: '#e3f1ff', shape: 'washer' },
  };
  const ROOMS_PER_HOUSE = 5;
  const GHOSTS_PER_ROOM = 8;
  const BOSS_TIME = 30;
  const MAX_STARS = 5;
  const SAVE_KEY = 'cat_exorcist_v1';

  // ---------- Состояние ----------
  const defaultState = () => ({
    house: 1, room: 1, cleared: 0,
    ecto: 0, crystals: 0, jars: 8,
    lvPower: 1, lvPull: 1, lvCollect: 1,
    inventory: [], // {id, type, stars}
    squad: [null, null, null, null], // id из inventory
    nextId: 1,
    bestiary: {},
    moonUntil: 0, moonReadyAt: 0,
    lastSeen: Date.now(),
  });
  let S = load() || defaultState();

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) { return null; }
  }
  function save() {
    S.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* приватный режим */ }
  }
  setInterval(save, 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  // ---------- Формулы ----------
  const stageIndex = () => (S.house - 1) * ROOMS_PER_HOUSE + (S.room - 1);
  const isBossRoom = () => S.room === ROOMS_PER_HOUSE;
  const moonActive = () => Date.now() < S.moonUntil;
  const moonMult = () => (moonActive() ? 2 : 1);
  const catDamage = () => 10 * Math.pow(1.16, S.lvPower - 1) * moonMult();
  const fireRate = () => Math.min(2 + 0.08 * (S.lvPull - 1), 9); // выстрелов в секунду
  const captureChance = () => Math.min(0.4 + 0.012 * (S.lvPull - 1), 0.95);
  const incomeMult = () => Math.pow(1.13, S.lvCollect - 1) * moonMult();
  const ghostHp = (rarity) => 22 * Math.pow(1.24, stageIndex()) * RARITY[rarity].hp;
  const ghostReward = (rarity) => 4 * Math.pow(1.2, stageIndex()) * RARITY[rarity].reward * incomeMult();
  const upgradeCost = (lv, base) => Math.floor(base * Math.pow(1.19, lv - 1));
  const squadDamage = (g) => catDamage() * 0.25 * RARITY[GHOSTS[g.type].rarity].squad * Math.pow(2.2, g.stars - 1);

  const UPGRADES = [
    { key: 'lvPower', name: 'Мощность', base: 10, color: '#ff7a9c', desc: () => fmt(catDamage()) + ' урон' },
    { key: 'lvPull', name: 'Тяга', base: 14, color: '#7fd1ff', desc: () => Math.round(captureChance() * 100) + '% поимка' },
    { key: 'lvCollect', name: 'Сборник', base: 12, color: '#8ee08a', desc: () => 'x' + fmt(incomeMult(), 2) + ' эктопл.' },
  ];

  // ---------- Форматирование больших чисел ----------
  const SUFFIX = ['', 'K', 'M', 'B', 'T'];
  function fmt(n, dec) {
    if (!isFinite(n)) return '∞';
    if (n < 1000) return dec !== undefined && n < 100 ? n.toFixed(dec).replace(/\.?0+$/, '') : String(Math.floor(n));
    let tier = Math.floor(Math.log10(n) / 3);
    let suf;
    if (tier < SUFFIX.length) suf = SUFFIX[tier];
    else {
      const k = tier - SUFFIX.length; // aa, ab, ...
      suf = String.fromCharCode(97 + Math.floor(k / 26) % 26) + String.fromCharCode(97 + (k % 26));
    }
    const v = n / Math.pow(1000, tier);
    return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v)) + suf;
  }

  // ---------- Мир ----------
  const cat = { x: 180, y: 392, aim: -Math.PI / 2, bob: 0, fireCd: 0, recoil: 0 };
  let ghosts = [], beams = [], floaters = [], particles = [], drops = [], orbiters = [];
  let spawnCd = 0.5, roomSpawned = 0, bossTimer = 0, bossSpawned = false;
  let panel = null; // 'squad' | 'offline' | null
  let selectedJar = null;
  let toast = null;
  let shake = 0;
  let time = 0;

  function resetRoom() {
    ghosts = []; roomSpawned = 0; S.cleared = 0; spawnCd = 0.6; bossSpawned = false; bossTimer = 0;
  }

  function pickRarity() {
    const r = Math.random();
    return r < 0.04 ? 'fire' : r < 0.19 ? 'sock' : 'sheet';
  }

  function spawnGhost(type) {
    const def = GHOSTS[type];
    const boss = type === 'washer';
    const hp = boss ? ghostHp(3) : ghostHp(def.rarity);
    ghosts.push({
      type, boss, hp, maxHp: hp,
      x: 40 + Math.random() * 280, y: boss ? 170 : 90 + Math.random() * 30,
      vx: (Math.random() - 0.5) * 30, vy: 12 + Math.random() * 10,
      r: boss ? 40 : def.rarity === 2 ? 22 : 19,
      phase: Math.random() * 6, hit: 0, alpha: 0, dying: 0, capturing: 0,
    });
  }

  function lowHp(g) { return g.hp > 0 && g.hp / g.maxHp <= 0.3; }

  // ---------- Бой ----------
  function nearestGhost(x, y) {
    let best = null, bd = Infinity;
    for (const g of ghosts) {
      if (g.hp <= 0 || g.capturing || g.alpha < 0.5) continue;
      const d = (g.x - x) ** 2 + (g.y - y) ** 2;
      if (d < bd) { bd = d; best = g; }
    }
    return best;
  }

  function damage(g, amount, crit) {
    if (g.hp <= 0) return;
    g.hp -= amount;
    g.hit = 0.12;
    floaters.push({ x: g.x + (Math.random() - 0.5) * 24, y: g.y - g.r, text: fmt(amount), life: 0.9, color: crit ? '#ffdd55' : '#ffffff', size: crit ? 17 : 13 });
    if (g.hp <= 0) killGhost(g, false);
  }

  function killGhost(g, captured) {
    g.hp = 0;
    const rar = g.boss ? 3 : GHOSTS[g.type].rarity;
    const reward = ghostReward(rar) * (g.boss ? 1 : 1);
    // эктоплазма летит в счётчик
    const n = g.boss ? 14 : 4;
    for (let i = 0; i < n; i++) {
      drops.push({ x: g.x, y: g.y, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 120, t: 0, value: reward / n });
    }
    burst(g.x, g.y, g.boss ? 40 : 14, GHOSTS[g.type].body);
    if (!captured) {
      // обычных призраков кот иногда ловит сам
      if (!g.boss && rar === 0 && S.jars > 0 && Math.random() < captureChance() * 0.2) {
        capture(g.type, g.x, g.y, true);
      }
      g.dying = 0.35;
    }
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
    S.bestiary[type] = (S.bestiary[type] || 0) + 1;
    floaters.push({ x, y: y - 30, text: auto ? 'Пойман!' : 'В банке!', life: 1.3, color: RARITY[GHOSTS[type].rarity].color, size: 16 });
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
      if (g.boss) {
        S.crystals += 10; shake = 0.5;
        showToast('Босс пойман! +10 💎');
        burst(cat.x, cat.y, 30, '#ffc94d');
        scheduleNextRoom();
      } else {
        S.cleared++;
      }
      const rar = g.boss ? 3 : GHOSTS[g.type].rarity;
      S.ecto += ghostReward(rar);
      g.hp = 0; g.dying = 0.01;
    } else {
      floaters.push({ x: g.x, y: g.y - g.r - 10, text: 'Вырвался!', life: 1, color: '#ff8a8a', size: 15 });
      if (g.boss) { g.hp = Math.max(g.hp, g.maxHp * 0.4); }
      else killGhost(g, false);
    }
  }

  let advancing = false;
  function scheduleNextRoom() {
    if (advancing) return;
    advancing = true;
    setTimeout(() => { advancing = false; nextRoom(); }, 900);
  }

  function nextRoom() {
    if (S.room === ROOMS_PER_HOUSE) { S.house++; S.room = 1; }
    else S.room++;
    S.jars += 2;
    resetRoom();
    save();
  }

  function burst(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 160;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.4, color, r: 2 + Math.random() * 3 });
    }
  }

  // ---------- Отряд ----------
  function itemPower(it) { return squadDamage(it); }
  function findItem(id) { return S.inventory.find((i) => i.id === id); }

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

  function mergeAll() {
    let merged = 0, changed = true;
    while (changed) {
      changed = false;
      const groups = {};
      for (const it of S.inventory) {
        if (it.stars >= MAX_STARS) continue;
        const k = it.type + ':' + it.stars;
        (groups[k] = groups[k] || []).push(it);
      }
      for (const k in groups) {
        const g = groups[k];
        while (g.length >= 3) {
          const [a, b, c] = g.splice(0, 3);
          S.inventory = S.inventory.filter((i) => i !== b && i !== c);
          a.stars++;
          S.jars += 2; // освободившиеся банки возвращаются
          merged++; changed = true;
        }
      }
    }
    const ids = new Set(S.inventory.map((i) => i.id));
    S.squad = S.squad.map((id) => (ids.has(id) ? id : null));
    bestSquad();
    showToast(merged ? 'Слито: ' + merged + ' ✨' : 'Нечего сливать (нужно 3 одинаковых)');
  }

  function releaseJar(id) {
    S.inventory = S.inventory.filter((i) => i.id !== id);
    S.squad = S.squad.map((x) => (x === id ? null : x));
    S.jars++;
    S.ecto += ghostReward(0) * 3;
    selectedJar = null;
  }

  // ---------- Покупки / буст ----------
  function buyUpgrade(u) {
    const cost = upgradeCost(S[u.key], u.base);
    if (S.ecto < cost) { showToast('Не хватает эктоплазмы'); return; }
    S.ecto -= cost; S[u.key]++;
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

  // ---------- Офлайн-доход ----------
  let offlineGain = 0;
  (function offline() {
    const secs = Math.min((Date.now() - (S.lastSeen || Date.now())) / 1000, 8 * 3600);
    if (secs > 60 && S.lvPower + S.lvCollect > 2) {
      offlineGain = ghostReward(0) * 0.35 * secs / moonMult();
      panel = 'offline';
    }
  })();

  // ---------- Ввод ----------
  const buttons = []; // пересобирается каждый кадр: {x,y,w,h,on}
  function btn(x, y, w, h, on) { buttons.push({ x, y, w, h, on }); }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / scale, y = (e.clientY - r.top) / scale;
    for (let i = buttons.length - 1; i >= 0; i--) {
      const b = buttons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.on(); return; }
    }
    if (panel) return;
    // тап по ослабленному призраку — поимка
    for (const g of ghosts) {
      if (g.hp > 0 && !g.capturing && lowHp(g) && Math.hypot(g.x - x, g.y - y) < g.r + 18) { tryCapture(g); return; }
    }
    // тап по полю — небольшой ручной урон
    const g = nearestGhost(x, y);
    if (g && Math.hypot(g.x - x, g.y - y) < g.r + 14) damage(g, catDamage() * 0.5, false);
  });

  // ---------- Обновление ----------
  function update(dt) {
    time += dt;
    cat.bob += dt * 4;
    cat.recoil = Math.max(0, cat.recoil - dt * 8);
    shake = Math.max(0, shake - dt);

    if (panel !== 'offline') {
      // спавн
      if (isBossRoom()) {
        if (!bossSpawned) { spawnCd -= dt; if (spawnCd <= 0) { spawnGhost('washer'); bossSpawned = true; bossTimer = BOSS_TIME; } }
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
          spawnGhost(pickRarity()); roomSpawned++; spawnCd = 0.7 + Math.random() * 0.6;
        }
        if (S.cleared >= GHOSTS_PER_ROOM && alive === 0) nextRoom();
      }

      // стрельба кота
      cat.fireCd -= dt;
      const target = nearestGhost(cat.x, cat.y);
      if (target) {
        const want = Math.atan2(target.y - (cat.y - 18), target.x - cat.x);
        cat.aim += (want - cat.aim) * Math.min(1, dt * 14);
        if (cat.fireCd <= 0) {
          cat.fireCd = 1 / fireRate();
          const crit = Math.random() < 0.1;
          const nz = nozzle();
          beams.push({ x1: nz.x, y1: nz.y, x2: target.x, y2: target.y, life: 0.09, color: '#9ff3ff', w: 5 });
          cat.recoil = 1;
          damage(target, catDamage() * (crit ? 3 : 1), crit);
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

    // призраки
    for (const g of ghosts) {
      g.alpha = Math.min(1, g.alpha + dt * 2.5);
      g.hit = Math.max(0, g.hit - dt);
      g.phase += dt * 3;
      if (g.capturing) {
        g.capturing = Math.max(0.0001, g.capturing - dt);
        if (g.capturing <= 0.0001) { finishCapture(g); continue; }
        const k = 1 - Math.max(0, g.capturing) / 0.6;
        const nz = nozzle();
        g.x = g.captureStart.x + (nz.x - g.captureStart.x) * (g.captureOk ? k : k * 0.5);
        g.y = g.captureStart.y + (nz.y - g.captureStart.y) * (g.captureOk ? k : k * 0.5);
        continue;
      }
      if (g.dying) { g.dying -= dt; continue; }
      const dx = cat.x - g.x, dy = cat.y - 80 - g.y;
      const d = Math.hypot(dx, dy);
      if (d > 70) { g.x += (dx / d) * g.vy * dt + g.vx * dt; g.y += (dy / d) * g.vy * dt; }
      g.x += Math.sin(g.phase * 0.7) * 12 * dt;
      if (g.x < 25 || g.x > 335) g.vx = -g.vx;
      g.x = Math.max(25, Math.min(335, g.x));
    }
    ghosts = ghosts.filter((g) => g.hp > 0 || (g.dying && g.dying > 0) || g.capturing > 0);

    for (const b of beams) b.life -= dt;
    beams = beams.filter((b) => b.life > 0);
    for (const f of floaters) { f.life -= dt; f.y -= 34 * dt; }
    floaters = floaters.filter((f) => f.life > 0);
    for (const p of particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.93; p.vy *= 0.93; }
    particles = particles.filter((p) => p.life > 0);
    // капли эктоплазмы: сначала разлетаются, потом летят в счётчик
    for (const d of drops) {
      d.t += dt;
      if (d.t < 0.35) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 300 * dt; }
      else {
        const tx = 300, ty = 22, k = Math.min(1, dt * 7);
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

  // ---------- Отрисовка ----------
  function rr(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function text(t, x, y, size, color, align, weight) {
    ctx.font = (weight || '800') + ' ' + size + 'px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    if (color !== '#2b2340') { // тёмный текст без обводки, иначе он сливается
      ctx.lineWidth = Math.max(2, size / 5); ctx.strokeStyle = '#2b2340'; ctx.lineJoin = 'round';
      ctx.strokeText(t, x, y);
    }
    ctx.fillStyle = color; ctx.fillText(t, x, y);
  }

  function drawRoom() {
    // обои
    const top = 70, bottom = 470;
    const hue = (S.house * 47) % 360;
    ctx.fillStyle = `hsl(${hue}, 35%, 82%)`; ctx.fillRect(0, top, W, 250);
    ctx.fillStyle = `hsl(${hue}, 35%, 77%)`;
    for (let x = 0; x < W; x += 36) ctx.fillRect(x, top, 14, 250);
    // окно с луной
    rr(240, top + 30, 80, 90, 10); ctx.fillStyle = '#3a2f5c'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#8a6a55'; ctx.stroke();
    ctx.fillStyle = moonActive() ? '#fff1a8' : '#f4ecd0';
    ctx.beginPath(); ctx.arc(282, top + 66, moonActive() ? 20 : 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a6a55'; ctx.fillRect(278, top + 30, 5, 90); ctx.fillRect(240, top + 72, 80, 5);
    // картина
    rr(36, top + 40, 64, 50, 6); ctx.fillStyle = '#fbe3c8'; ctx.fill(); ctx.strokeStyle = '#c99a5b'; ctx.stroke();
    ctx.fillStyle = '#b8d8a8'; ctx.beginPath(); ctx.moveTo(42, top + 84); ctx.lineTo(62, top + 58); ctx.lineTo(80, top + 84); ctx.fill();
    // пол
    ctx.fillStyle = '#c99a6b'; ctx.fillRect(0, top + 250, W, bottom - top - 250);
    ctx.fillStyle = '#b8875a';
    for (let y = top + 262; y < bottom; y += 22) ctx.fillRect(0, y, W, 3);
    // ковёр
    ctx.fillStyle = '#e88aa5'; ctx.beginPath(); ctx.ellipse(180, 410, 130, 34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f3b0c3'; ctx.beginPath(); ctx.ellipse(180, 410, 100, 24, 0, 0, Math.PI * 2); ctx.fill();
    if (moonActive()) { ctx.fillStyle = 'rgba(255,240,150,0.10)'; ctx.fillRect(0, top, W, bottom - top); }
  }

  function drawGhost(g) {
    const def = GHOSTS[g.type];
    ctx.save();
    let a = g.alpha;
    if (g.dying) a *= Math.max(0, g.dying / 0.35);
    ctx.globalAlpha = a;
    const bob = Math.sin(g.phase) * 4;
    let x = g.x, y = g.y + bob, r = g.r;
    if (g.capturing) { const k = Math.max(0, g.capturing) / 0.6; r *= g.captureOk ? 0.3 + 0.7 * k : 1; ctx.translate(x, y); ctx.rotate((1 - k) * 8); ctx.translate(-x, -y); }
    if (g.dying) r *= 1 + (0.35 - g.dying) * 2;
    const low = lowHp(g) && !g.capturing;
    // свечение у ослабленного
    if (low) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 10);
      ctx.fillStyle = `rgba(160,255,200,${0.25 + 0.3 * pulse})`;
      ctx.beginPath(); ctx.arc(x, y, r + 12 + pulse * 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = g.hit > 0 ? '#ffffff' : def.body;
    ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 3;
    if (def.shape === 'washer') {
      rr(x - r, y - r, r * 2, r * 2.1, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9fc6e8'; ctx.beginPath(); ctx.arc(x, y + 6, r * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(x - 7, y, r * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b2340'; ctx.fillRect(x - r + 8, y - r + 8, 12, 5); ctx.fillRect(x + r - 22, y - r + 8, 14, 5);
      // злые глазки
      ctx.beginPath(); ctx.arc(x - 12, y - r + 22, 4, 0, Math.PI * 2); ctx.arc(x + 12, y - r + 22, 4, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath();
      const h = def.shape === 'sock' ? r * 1.6 : r * 1.25;
      ctx.arc(x, y, r, Math.PI, 0);
      ctx.lineTo(x + r, y + h * 0.6);
      const waves = 4;
      for (let i = waves; i >= 0; i--) {
        const wx = x - r + (2 * r * i) / waves;
        const wy = y + h * 0.6 + (i % 2 ? 8 : 0) + Math.sin(g.phase * 2 + i) * 3;
        ctx.lineTo(wx, wy);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (def.shape === 'sock') { ctx.fillStyle = '#ff9fbf'; ctx.fillRect(x - r + 2, y - r * 0.2, r * 2 - 4, 6); }
      if (def.shape === 'fire') {
        ctx.fillStyle = '#ff7a3d';
        ctx.beginPath(); ctx.moveTo(x - 8, y - r + 2); ctx.quadraticCurveTo(x, y - r - 18 - Math.sin(time * 12) * 4, x + 8, y - r + 2); ctx.fill();
      }
      ctx.fillStyle = '#2b2340';
      ctx.beginPath(); ctx.arc(x - r * 0.35, y - 2, 3, 0, Math.PI * 2); ctx.arc(x + r * 0.35, y - 2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,120,150,0.55)';
      ctx.beginPath(); ctx.ellipse(x - r * 0.55, y + 6, 4, 2.5, 0, 0, Math.PI * 2); ctx.ellipse(x + r * 0.55, y + 6, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // полоска HP
    if (g.hp > 0 && !g.capturing && g.alpha > 0.5) {
      const w = g.boss ? 0 : r * 2;
      if (w) {
        rr(x - w / 2, g.y - r - 14, w, 5, 2); ctx.fillStyle = '#2b2340'; ctx.fill();
        rr(x - w / 2, g.y - r - 14, w * Math.max(0, g.hp / g.maxHp), 5, 2); ctx.fillStyle = low ? '#7dff9e' : '#ff6b8a'; ctx.fill();
      }
      if (low) text('ТАП!', x, g.y + r + 22, 12, '#7dff9e');
    }
  }

  function drawCat() {
    const x = cat.x, y = cat.y + Math.sin(cat.bob) * 1.5;
    ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 3;
    // тень
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x, cat.y + 26, 30, 8, 0, 0, Math.PI * 2); ctx.fill();
    // хвост
    ctx.strokeStyle = '#f2a65a'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 18, y + 14); ctx.quadraticCurveTo(x + 44, y + 4 + Math.sin(time * 3) * 6, x + 36, y - 16); ctx.stroke();
    ctx.lineCap = 'butt';
    // тело
    ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 3;
    ctx.fillStyle = '#f2a65a'; ctx.beginPath(); ctx.ellipse(x, y + 8, 24, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // рюкзак-пылесос
    rr(x - 34, y - 6, 16, 28, 6); ctx.fillStyle = '#8a7bd1'; ctx.fill(); ctx.stroke();
    // голова
    const hy = y - 22;
    ctx.fillStyle = '#f2a65a';
    ctx.beginPath(); ctx.moveTo(x - 22, hy - 6); ctx.lineTo(x - 18, hy - 30); ctx.lineTo(x - 4, hy - 16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 22, hy - 6); ctx.lineTo(x + 18, hy - 30); ctx.lineTo(x + 4, hy - 16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, hy, 26, 21, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d9853a'; ctx.fillRect(x - 3, hy - 20, 6, 8);
    // глаза, щёчки
    ctx.fillStyle = '#2b2340';
    ctx.beginPath(); ctx.arc(x - 9, hy - 1, 3.5, 0, Math.PI * 2); ctx.arc(x + 9, hy - 1, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,110,140,0.6)';
    ctx.beginPath(); ctx.ellipse(x - 16, hy + 7, 5, 3, 0, 0, Math.PI * 2); ctx.ellipse(x + 16, hy + 7, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 3, hy + 6); ctx.quadraticCurveTo(x, hy + 9, x, hy + 6); ctx.quadraticCurveTo(x, hy + 9, x + 3, hy + 6); ctx.stroke();
    // шланг и раструб пылесоса
    const nz = nozzle();
    ctx.strokeStyle = '#5b4e9e'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x - 26, y); ctx.quadraticCurveTo(x - 10, y + 22, (x + nz.x) / 2, (y - 18 + nz.y) / 2 + 6); ctx.stroke();
    ctx.save(); ctx.translate(x, y - 18); ctx.rotate(cat.aim);
    ctx.fillStyle = '#b9afe8'; ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 3;
    rr(4 - cat.recoil * 4, -5, 26, 10, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff7a9c'; rr(26 - cat.recoil * 4, -9, 10, 18, 3); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawOrbiter(o) {
    if (!o) return;
    const def = GHOSTS[o.it.type];
    const r = 11;
    ctx.save(); ctx.globalAlpha = 0.95;
    ctx.fillStyle = def.body; ctx.strokeStyle = RARITY[def.rarity].color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(o.x, o.y, r, Math.PI, 0); ctx.lineTo(o.x + r, o.y + 10); ctx.lineTo(o.x + 4, o.y + 6); ctx.lineTo(o.x - 4, o.y + 10); ctx.lineTo(o.x - r, o.y + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2b2340'; ctx.beginPath(); ctx.arc(o.x - 4, o.y - 1, 1.8, 0, 7); ctx.arc(o.x + 4, o.y - 1, 1.8, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawTopBar() {
    ctx.fillStyle = '#2b2340'; ctx.fillRect(0, 0, W, 70);
    text('Дом ' + S.house, 14, 20, 16, '#ffffff', 'left');
    text(isBossRoom() ? 'БОСС' : 'Комната ' + S.room + '/' + ROOMS_PER_HOUSE, 14, 44, 13, isBossRoom() ? '#ffc94d' : '#c9c3e6', 'left');
    // прогресс комнаты
    const p = isBossRoom() ? (bossSpawned ? Math.max(0, bossTimer / BOSS_TIME) : 1) : Math.min(1, S.cleared / GHOSTS_PER_ROOM);
    rr(110, 38, 130, 12, 6); ctx.fillStyle = '#4a3f66'; ctx.fill();
    rr(110, 38, 130 * p, 12, 6); ctx.fillStyle = isBossRoom() ? '#ffc94d' : '#7dff9e'; ctx.fill();
    if (isBossRoom() && bossSpawned) text(Math.ceil(bossTimer) + ' с', 175, 44, 10, '#2b2340', 'center', '700');
    // валюты
    ctx.fillStyle = '#7dff9e'; ctx.beginPath(); ctx.arc(300, 20, 7, 0, 7); ctx.fill();
    text(fmt(S.ecto), 290, 20, 15, '#ffffff', 'right');
    text('💎 ' + S.crystals, 346, 44, 13, '#9ff3ff', 'right');
    text('🫙 ' + S.jars, 290, 44, 13, '#ffe7b0', 'right');
    // босс HP
    const boss = ghosts.find((g) => g.boss && g.hp > 0);
    if (boss) {
      rr(30, 82, 300, 14, 7); ctx.fillStyle = '#2b2340'; ctx.fill();
      rr(30, 82, 300 * Math.max(0, boss.hp / boss.maxHp), 14, 7); ctx.fillStyle = lowHp(boss) ? '#7dff9e' : '#ff6b8a'; ctx.fill();
      text(GHOSTS.washer.name + ' · ' + fmt(boss.hp), 180, 89, 10, '#ffffff', 'center', '700');
    }
  }

  function drawBottom() {
    ctx.fillStyle = '#3a2f55'; ctx.fillRect(0, 470, W, 170);
    // три апгрейда
    UPGRADES.forEach((u, i) => {
      const x = 8 + i * 116, y = 480, w = 112, h = 92;
      const cost = upgradeCost(S[u.key], u.base);
      const can = S.ecto >= cost;
      rr(x, y, w, h, 12); ctx.fillStyle = can ? u.color : '#6b5f86'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#2b2340'; ctx.stroke();
      text(u.name, x + w / 2, y + 16, 14, '#ffffff');
      text('ур. ' + S[u.key], x + w / 2, y + 35, 11, '#2b2340', 'center', '700');
      ctx.fillStyle = '#2b2340'; ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(u.desc(), x + w / 2, y + 52);
      rr(x + 8, y + 62, w - 16, 22, 8); ctx.fillStyle = 'rgba(43,35,64,0.85)'; ctx.fill();
      text(fmt(cost), x + w / 2, y + 73, 13, can ? '#7dff9e' : '#ff9aa9');
      btn(x, y, w, h, () => buyUpgrade(u));
    });
    // нижняя панель: Отряд / Полнолуние
    const y = 582;
    rr(8, y, 168, 50, 12); ctx.fillStyle = '#8a7bd1'; ctx.fill(); ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 3; ctx.stroke();
    text('👻 Отряд', 92, y + 18, 15, '#ffffff');
    text(S.inventory.length + ' в банках', 92, y + 37, 10, '#2b2340', 'center', '700');
    btn(8, y, 168, 50, () => { panel = 'squad'; selectedJar = null; });

    const now = Date.now();
    const ready = !moonActive() && now >= S.moonReadyAt;
    rr(184, y, 168, 50, 12); ctx.fillStyle = moonActive() ? '#ffd76a' : ready ? '#ffc94d' : '#6b5f86'; ctx.fill(); ctx.stroke();
    text('🌕 Полнолуние', 268, y + 18, 15, '#ffffff');
    const sub = moonActive() ? 'x2 ещё ' + Math.ceil((S.moonUntil - now) / 1000) + ' с' : ready ? 'x2 на 60 с (реклама)' : 'через ' + Math.ceil((S.moonReadyAt - now) / 1000) + ' с';
    text(sub, 268, y + 37, 10, '#2b2340', 'center', '700');
    btn(184, y, 168, 50, activateMoon);
  }

  function drawJar(x, y, it, selected) {
    rr(x, y, 58, 66, 10); ctx.fillStyle = selected ? '#fff3c4' : 'rgba(220,240,255,0.9)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = it ? RARITY[GHOSTS[it.type].rarity].color : '#6b5f86'; ctx.stroke();
    ctx.fillStyle = '#8a6a55'; rr(x + 12, y - 4, 34, 9, 3); ctx.fill();
    if (!it) return;
    const def = GHOSTS[it.type];
    const cx = x + 29, cy = y + 30, r = 13;
    ctx.fillStyle = def.body; ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.lineTo(cx + r, cy + 12); ctx.lineTo(cx, cy + 8); ctx.lineTo(cx - r, cy + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2b2340'; ctx.beginPath(); ctx.arc(cx - 5, cy - 1, 2, 0, 7); ctx.arc(cx + 5, cy - 1, 2, 0, 7); ctx.fill();
    text('★'.repeat(it.stars), cx, y + 56, 9, '#ffc94d');
  }

  function drawSquadPanel() {
    ctx.fillStyle = 'rgba(20,14,32,0.75)'; ctx.fillRect(0, 0, W, H);
    btn(0, 0, W, H, () => {}); // блокируем клики под панелью
    rr(12, 60, 336, 540, 18); ctx.fillStyle = '#f7efe3'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#2b2340'; ctx.stroke();
    text('Отряд призраков', 180, 88, 18, '#ffffff');
    // закрыть
    rr(306, 70, 32, 32, 16); ctx.fillStyle = '#ff6b8a'; ctx.fill(); ctx.stroke(); text('✕', 322, 87, 15, '#ffffff');
    btn(306, 70, 32, 32, () => { panel = null; });

    // слоты
    S.squad.forEach((id, i) => {
      const x = 32 + i * 76, y = 110;
      drawJar(x, y, findItem(id), false);
      btn(x, y, 58, 66, () => {
        if (selectedJar) { S.squad = S.squad.map((s) => (s === selectedJar ? null : s)); S.squad[i] = selectedJar; selectedJar = null; }
        else if (id) S.squad[i] = null;
      });
    });
    const power = S.squad.reduce((s, id) => { const it = findItem(id); return s + (it ? squadDamage(it) : 0); }, 0);
    ctx.fillStyle = '#2b2340'; ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Урон отряда: ' + fmt(power) + ' / выстрел', 180, 194);

    // банки
    const cols = 5, sx = 24, sy = 212;
    const list = [...S.inventory].sort((a, b) => itemPower(b) - itemPower(a)).slice(0, 25);
    list.forEach((it, i) => {
      const x = sx + (i % cols) * 63, y = sy + Math.floor(i / cols) * 72;
      drawJar(x, y, it, selectedJar === it.id);
      if (S.squad.includes(it.id)) text('в отряде', x + 29, y + 46, 8, '#7dff9e');
      btn(x, y, 58, 66, () => { selectedJar = selectedJar === it.id ? null : it.id; });
    });
    if (!list.length) {
      ctx.fillStyle = '#6b5f86'; ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText('Пусто. Ослабь призрака и тапни по нему,', 180, 300);
      ctx.fillText('чтобы засосать его в банку.', 180, 318);
    }

    // инфо по выбранному
    const sel = selectedJar && findItem(selectedJar);
    if (sel) {
      const def = GHOSTS[sel.type];
      ctx.fillStyle = '#2b2340'; ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText(def.name + ' · ' + RARITY[def.rarity].name + ' · ' + sel.stars + '★ · ' + fmt(squadDamage(sel)) + ' урон', 180, 576 - 46);
      ctx.fillText('Тапни слот отряда, чтобы поставить', 180, 576 - 30);
    }

    // кнопки
    const by = 548;
    [['Слить всё', '#8ee08a', mergeAll], ['Лучший отряд', '#7fd1ff', () => { bestSquad(); showToast('Отряд собран'); }],
      ['Отпустить', '#ff9aa9', () => { if (sel) releaseJar(sel.id); else showToast('Выбери банку'); }]].forEach(([label, color, on], i) => {
      const x = 22 + i * 108;
      rr(x, by, 100, 40, 10); ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2b2340'; ctx.stroke();
      text(label, x + 50, by + 20, 12, '#ffffff');
      btn(x, by, 100, 40, on);
    });
  }

  function drawOfflinePanel() {
    ctx.fillStyle = 'rgba(20,14,32,0.75)'; ctx.fillRect(0, 0, W, H);
    btn(0, 0, W, H, () => {});
    rr(40, 200, 280, 220, 18); ctx.fillStyle = '#f7efe3'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#2b2340'; ctx.stroke();
    text('Пока тебя не было', 180, 232, 18, '#ffffff');
    ctx.fillStyle = '#2b2340'; ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Жильцы очищенных домов заплатили', 180, 268);
    text(fmt(offlineGain) + ' эктоплазмы', 180, 300, 20, '#7dff9e');
    const take = (mult) => () => { S.ecto += offlineGain * mult; offlineGain = 0; panel = null; };
    rr(58, 340, 116, 50, 12); ctx.fillStyle = '#8ee08a'; ctx.fill(); ctx.stroke(); text('Забрать', 116, 365, 15, '#ffffff');
    btn(58, 340, 116, 50, take(1));
    rr(186, 340, 116, 50, 12); ctx.fillStyle = '#ffc94d'; ctx.fill(); ctx.stroke(); text('x2 (реклама)', 244, 365, 13, '#ffffff');
    btn(186, 340, 116, 50, take(2));
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
    for (const b of beams) {
      ctx.globalAlpha = Math.min(1, b.life * 12);
      ctx.strokeStyle = b.color; ctx.lineWidth = b.w + 4; ctx.globalAlpha *= 0.35;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      ctx.globalAlpha = Math.min(1, b.life * 12); ctx.lineWidth = b.w; ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const p of particles) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (const f of floaters) { ctx.globalAlpha = Math.min(1, f.life * 2); text(f.text, f.x, f.y, f.size, f.color); }
    ctx.globalAlpha = 1;
    ctx.restore();
    for (const d of drops) { ctx.fillStyle = '#7dff9e'; ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(d.x, d.y, 4, 0, 7); ctx.fill(); ctx.stroke(); }
    drawTopBar();
    drawBottom();
    if (panel === 'squad') drawSquadPanel();
    if (panel === 'offline') drawOfflinePanel();
    if (toast) {
      ctx.globalAlpha = Math.min(1, toast.life * 3);
      ctx.font = '800 14px system-ui, sans-serif';
      const w = ctx.measureText(toast.text).width + 30;
      rr(180 - w / 2, 108, w, 34, 17); ctx.fillStyle = '#2b2340'; ctx.fill();
      text(toast.text, 180, 125, 14, '#ffffff');
      ctx.globalAlpha = 1;
    }
  }

  // ---------- Цикл ----------
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
  window.__game = { state: () => S, ghosts: () => ghosts, reset: () => { localStorage.removeItem(SAVE_KEY); S = defaultState(); resetRoom(); } };
})();
