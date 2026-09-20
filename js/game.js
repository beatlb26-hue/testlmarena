/* ============================================================
   GAME — Engine simulator memancing (state, fisika, AI, render)
   ============================================================ */
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

function mixColor(c1, c2, t) {
  return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))];
}
function css(c, a = 1) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
function hexToRgb(h) {
  h = h.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const Game = {
  canvas: null, ctx: null, W: 0, H: 0,
  started: false, paused: false,
  state: 'idle', t: 0, shake: 0,
  holding: false, power: 0,
  bobber: { x: 0, y: 0, dip: 0, visible: false },
  castAnim: null, biter: null, fight: null,
  nextNibbleAt: 0, nibbleCount: 0, nibblesTotal: 2, nextNibbleEvent: 0, biteEndsAt: 0,
  particles: [], floaters: [], clouds: [], birds: [], stars: [], ambient: [],
  surfaceY: 0, angler: { x: 0, feetY: 0 }, rodTip: { x: 0, y: 0 }, rodBase: { x: 0, y: 0 },
  golden: false, nightF: 0, dayF: 1, duskF: 0,
  profile: null, uidSeq: 1,

  /* ---------------- SAVE / PROFILE ---------------- */
  saveKey: 'mancingManiaV1',
  newProfile() {
    return {
      coins: 100, xp: 0, level: 1,
      rod: 'bambu', bait: 'cacing', loc: 'kolam',
      rods: ['bambu'], baits: ['cacing'], locs: ['kolam'],
      inv: [], coll: {}, time: 8.0, muted: false,
      casts: 0, caughtTotal: 0,
    };
  },
  save() {
    try { localStorage.setItem(this.saveKey, JSON.stringify(this.profile)); } catch (e) {}
  },
  load() {
    try {
      const raw = localStorage.getItem(this.saveKey);
      if (!raw) return false;
      const p = JSON.parse(raw);
      if (!p || !p.rods) return false;
      this.profile = Object.assign(this.newProfile(), p);
      return true;
    } catch (e) { return false; }
  },
  resetSave() {
    try { localStorage.removeItem(this.saveKey); } catch (e) {}
    this.profile = this.newProfile();
    this.enterLocation(this.profile.loc, true);
    this.save();
  },

  /* ---------------- INIT ---------------- */
  init() {
    this.canvas = $('game');
    this.ctx = this.canvas.getContext('2d');
    if (!this.load()) this.profile = this.newProfile();
    this.uidSeq = Date.now() % 100000;
    AudioSys.muted = !!this.profile.muted;

    // bintang
    for (let i = 0; i < 90; i++) this.stars.push({ x: Math.random(), y: Math.random() * 0.5, s: rand(0.5, 1.8), tw: rand(0, TAU) });
    // awan
    for (let i = 0; i < 6; i++) this.clouds.push({ x: Math.random(), y: rand(0.04, 0.28), s: rand(0.6, 1.5), v: rand(0.004, 0.012) });
    // burung
    for (let i = 0; i < 3; i++) this.birds.push({ x: Math.random(), y: rand(0.1, 0.25), v: rand(0.02, 0.05), ph: rand(0, TAU) });

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.enterLocation(this.profile.loc, true);
    this.bindInput();
    requestAnimationFrame((ts) => this.loop(ts));
    setInterval(() => this.save(), 15000);
  },

  resize() {
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.canvas.width = this.W * (window.devicePixelRatio || 1);
    this.canvas.height = this.H * (window.devicePixelRatio || 1);
    this.canvas.style.width = this.W + 'px';
    this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    this.layout();
  },

  layout() {
    this.surfaceY = Math.round(this.H * (this.H < 600 ? 0.36 : 0.4));
    const feetY = this.surfaceY - 10;
    this.angler = { x: Math.round(this.W * 0.12), feetY };
    this.rodBase = { x: this.angler.x + 16, y: feetY - 72 };
    this.rodTip = { x: this.rodBase.x + 62, y: this.rodBase.y - 78 };
    if (this.bobber.visible) {
      this.bobber.x = clamp(this.bobber.x, this.W * 0.25, this.W * 0.98);
      this.bobber.y = this.surfaceY + 6;
    }
  },

  enterLocation(locId, instant = false) {
    this.profile.loc = locId;
    const loc = DATA.loc(locId);
    this.ambient = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const sp = this.pickSpecies(loc, 0, true);
      this.ambient.push({
        spec: sp, x: rand(0, this.W), y: rand(this.surfaceY + 60, this.H - 40),
        dir: Math.random() < 0.5 ? -1 : 1, speed: rand(18, 46),
        size: this.fishLen(sp), ph: rand(0, TAU), flee: 0,
      });
    }
    // reset status memancing saat pindah lokasi
    this.state = 'idle'; this.bobber.visible = false;
    this.biter = null; this.fight = null; this.castAnim = null; this.holding = false; this.power = 0;
    if (!instant) this.save();
  },

  fishLen(spec) {
    const base = clamp(34 + (spec.wMax * 1.6), 40, 150);
    return spec.long ? base * 1.35 : base;
  },

  /* ---------------- INPUT ---------------- */
  bindInput() {
    const btn = $('actionBtn');
    const pressStart = (e, src) => { if (e) e.preventDefault(); AudioSys.resume(); this.onPressStart(src); };
    const pressEnd = (e) => { if (e) e.preventDefault(); this.onPressEnd(); };

    btn.addEventListener('pointerdown', (e) => pressStart(e, 'btn'));
    window.addEventListener('pointerup', pressEnd);
    window.addEventListener('pointercancel', pressEnd);
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.paused || !this.started) return;
      pressStart(e, 'canvas');
    });
    this.canvas.addEventListener('pointerup', (e) => { pressEnd(e); });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowDown') {
        if (e.repeat) return;
        e.preventDefault();
        if (!this.started || this.paused) return;
        AudioSys.resume(); this.onPressStart('key');
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowDown') { e.preventDefault(); this.onPressEnd(); }
    });
  },

  onPressStart(src = 'canvas') {
    if (!this.started || this.paused) return;
    if (this.profile.inv.length >= DATA.config.invCap && this.state === 'idle') {
      UI.toast('🎒 Tas penuh! Jual ikan dulu sebelum memancing.', 'bad');
      AudioSys.error(); UI.openModal('sellModal'); return;
    }
    if (this.state === 'idle') {
      this.state = 'charging'; this.power = 0; this.holding = true;
      UI.refreshAction();
    } else if (this.state === 'charging') {
      this.holding = true; // lanjutkan mengisi jika sempat terputus
    } else if (this.state === 'bite') {
      this.strike();
    } else if (this.state === 'hooked') {
      this.holding = true;
    } else if (this.state === 'waiting') {
      if (src === 'btn') { this.reelIn(); UI.refreshAction(); }
      else this.floater(this.bobber.x, this.surfaceY - 60, 'Tunggu ⚡ STRIKE! ⚡', '#ffd93d', 15);
    }
  },

  onPressEnd() {
    if (!this.started) return;
    this.holding = false;
    if (this.state === 'charging' && !this.paused) this.cast();
  },

  /* ---------------- MELEMPAR ---------------- */
  cast() {
    const rod = DATA.rod(this.profile.rod);
    const minX = this.W * 0.3;
    const maxX = Math.min(this.W * 0.97, this.W * (0.55 + 0.42 * rod.power));
    const p = clamp(this.power, 0.08, 1);
    const tx = lerp(minX, maxX, 1 - Math.pow(1 - p, 1.6));
    const perfect = p >= 0.6 && p <= 0.8;
    this.castAnim = { t: 0, dur: 0.85, fx: this.rodTip.x, fy: this.rodTip.y, tx, perfect };
    this.state = 'flying';
    this.profile.casts++;
    AudioSys.cast();
    this.save();
    UI.refreshAction();
  },

  landBobber() {
    const { tx, perfect } = this.castAnim;
    this.bobber = { x: tx, y: this.surfaceY + 6, dip: 0, visible: true };
    this.castAnim = null;
    this.state = 'waiting';
    AudioSys.splash();
    this.splash(tx, this.surfaceY, 14);
    // ikan kecil kabur sesaat
    this.ambient.forEach(f => { if (Math.abs(f.x - tx) < 160) f.flee = 1.2; });
    const mult = this.biteMult();
    let delay = rand(1.6, 5.2) / mult;
    if (perfect) {
      delay *= 0.35;
      this.floater(tx, this.surfaceY - 70, '🎯 LEMPURAN SEMPURNA!', '#5ee87a', 18);
      this.sparkles(tx, this.surfaceY, 10, '#ffd93d');
    }
    this.nextNibbleAt = this.t + delay;
    this.biter = null;
    UI.refreshAction();
  },

  reelIn(silent = false) {
    this.state = 'idle';
    this.bobber.visible = false;
    this.biter = null;
    if (!silent) { AudioSys.click(); UI.refreshAction(); }
  },

  /* ---------------- SISTEM SAMBARAN ---------------- */
  biteMult() {
    const bait = DATA.bait(this.profile.bait);
    const loc = DATA.loc(this.profile.loc);
    let m = bait.bite * loc.activity;
    if (this.golden) m *= DATA.config.goldenBiteMult;
    else if (this.nightF > 0.6) m *= DATA.config.nightBiteMult;
    return m;
  },

  pickSpecies(loc, luckBonus = 0, ambientOnly = false) {
    const luck = DATA.bait(this.profile.bait).luck + luckBonus;
    const boost = { common: 1, uncommon: 1 + luck * 0.3, rare: 1 + luck * 0.7, epic: 1 + luck * 1.4, legendary: 1 + luck * 2.4 };
    let total = 0;
    const entries = loc.fish.map(e => {
      const sp = DATA.spec(e.sp);
      let w = e.w * (boost[sp.rarity] || 1);
      if (this.golden && sp.rarity !== 'common') w *= 1.5;
      if (ambientOnly && (sp.rarity === 'epic' || sp.rarity === 'legendary')) w *= 0.25;
      total += w;
      return { sp, w };
    });
    let r = Math.random() * total;
    for (const e of entries) { r -= e.w; if (r <= 0) return e.sp; }
    return entries[0].sp;
  },

  spawnBiter() {
    const loc = DATA.loc(this.profile.loc);
    const spec = this.pickSpecies(loc);
    const fromLeft = this.bobber.x > this.W * 0.55;
    this.biter = {
      spec, x: fromLeft ? -60 : this.W + 60, y: rand(this.surfaceY + 60, this.surfaceY + 160),
      phase: 'approach', size: this.fishLen(spec), ph: rand(0, TAU),
    };
  },

  startNibble() {
    this.biter.phase = 'nibble';
    this.nibbleCount = 0;
    this.nibblesTotal = randi(2, 3);
    this.nextNibbleEvent = this.t + 0.35;
  },

  doNibble() {
    this.nibbleCount++;
    this.bobber.dip = 10;
    AudioSys.plip();
    this.ring(this.bobber.x, this.surfaceY, 26);
    this.floater(this.bobber.x + rand(-20, 20), this.surfaceY - 46, '!', '#fff', 20);
    if (this.nibbleCount >= this.nibblesTotal) {
      if (Math.random() < 0.78) this.startBite();
      else {
        // ikan pergi
        this.floater(this.bobber.x, this.surfaceY - 60, '💨 Lepas...', '#b8c4cc', 14);
        this.biter.phase = 'flee';
        this.biter.fleeT = this.t;
        const biter = this.biter;
        setTimeout(() => { if (this.biter === biter) this.biter = null; }, 1200);
        this.nextNibbleAt = this.t + rand(2, 4.5) / this.biteMult();
      }
    } else {
      this.nextNibbleEvent = this.t + rand(0.35, 0.6);
    }
  },

  startBite() {
    this.state = 'bite';
    this.biteEndsAt = this.t + 1.15;
    this.bobber.dip = 20;
    AudioSys.bite();
    this.splash(this.bobber.x, this.surfaceY, 8);
    UI.refreshAction();
    UI.showStrike(true);
  },

  strike() {
    if (this.state !== 'bite' || !this.biter) return;
    UI.showStrike(false);
    const spec = this.biter.spec;
    const bait = DATA.bait(this.profile.bait);
    // berat (luck menggeser ke ukuran besar)
    const skew = 1 + bait.big + bait.luck * 0.15;
    const r = Math.pow(Math.random(), 1 / skew);
    const w = spec.wMin + (spec.wMax - spec.wMin) * r;
    const wNorm = (w - spec.wMin) / Math.max(0.001, (spec.wMax - spec.wMin));
    const price = Math.max(5, Math.round(spec.price * (0.7 + 0.8 * wNorm)));
    const xp = Math.round(spec.xp * (0.8 + 0.6 * wNorm));
    const dist = 9 + Math.pow(spec.strength, 1.3) * 2.0 + rand(0, 5);
    this.fight = {
      spec, weight: w, price, xp, dist, maxDist: dist,
      tension: 12, stam: 100, behavior: 'calm', behaviorT: 0,
      snapTimer: 0, fishX: this.bobber.x, fishY: this.surfaceY + 120,
      pullOff: 0, thrash: 0,
    };
    this.state = 'hooked';
    this.bobber.visible = false;
    this.biter = null;
    this.holding = false;
    AudioSys.hook();
    this.floater(this.fight.fishX, this.surfaceY - 80, `${spec.emoji} TERPANCING!`, '#ffd93d', 20);
    UI.refreshAction();
    UI.toast(`${spec.emoji} <b>${spec.name}</b> menyambar! Gulung dengan hati-hati!`);
  },

  missBite() {
    UI.showStrike(false);
    this.state = 'waiting';
    AudioSys.escape();
    this.floater(this.bobber.x, this.surfaceY - 60, '💨 Terlambat! Ikan lepas...', '#ff8a8a', 15);
    if (this.biter) { this.biter.phase = 'flee'; const b = this.biter; setTimeout(() => { if (this.biter === b) this.biter = null; }, 1200); }
    this.nextNibbleAt = this.t + rand(2, 4.5) / this.biteMult();
    UI.refreshAction();
  },

  /* ---------------- PERTARUNGAN ---------------- */
  updateFight(dt) {
    const F = this.fight;
    const rod = DATA.rod(this.profile.rod);
    // perilaku ikan
    F.behaviorT -= dt;
    if (F.behaviorT <= 0) {
      const stamF = F.stam / 100;
      const r = Math.random();
      if (r < 0.25 + stamF * 0.3) F.behavior = 'dash';
      else if (r < 0.45 + stamF * 0.2) F.behavior = 'run';
      else F.behavior = 'calm';
      F.behaviorT = F.behavior === 'calm' ? rand(0.8, 1.8) : rand(0.5, 1.1);
      F.pullDir = Math.random() < 0.5 ? -1 : 1;
      if (F.behavior === 'dash') { this.shake = Math.min(9, 3 + F.spec.strength * 0.6); }
    }
    const stamF = F.stam / 100;
    const pullNorm = (F.spec.strength / 10) * (F.behavior === 'dash' ? 1.9 : F.behavior === 'run' ? 1.25 : 0.5) * (0.35 + 0.65 * stamF);

    if (this.holding) {
      const slow = F.tension > 82 ? 0.35 : 1;
      F.dist -= 2.3 * rod.reel * slow * dt;
      F.tension += ((10 + 48 * pullNorm) / rod.line) * dt;
      AudioSys.reelTick(F.tension);
      if (Math.random() < dt * 6) this.bubble(F.fishX + rand(-20, 20), F.fishY);
    } else {
      F.tension -= 34 * dt;
    }
    // ikan berontak menambah jarak
    if (F.behavior === 'run') F.dist += 3.2 * (0.4 + 0.6 * stamF) * dt;
    else if (F.behavior === 'dash') F.dist += 1.3 * stamF * dt;

    // stamina
    if (F.tension > 30) F.stam -= (6 + F.tension * 0.24) * dt;
    else F.stam = Math.min(100, F.stam + 5 * dt);
    F.stam = Math.max(0, F.stam);

    // posisi visual ikan
    F.pullOff = lerp(F.pullOff, (F.behavior === 'calm' ? 0 : F.pullDir * 60), dt * 4);
    const targetX = clamp(this.W * 0.5 + Math.sin(this.t * 1.7) * 50 + F.pullOff, this.W * 0.25, this.W * 0.97);
    F.fishX = lerp(F.fishX, targetX, dt * 3);
    const depthF = clamp(F.dist / F.maxDist, 0, 1.3);
    const targetY = this.surfaceY + 46 + Math.min(1, depthF) * (this.H - this.surfaceY - 170);
    F.fishY = lerp(F.fishY, targetY, dt * 2.5);
    F.thrash = F.behavior === 'dash' ? 1 : Math.max(0, F.thrash - dt * 3);

    F.tension = clamp(F.tension, 0, 100);
    // senar putus?
    if (F.tension >= 100) {
      F.snapTimer += dt;
      this.shake = Math.max(this.shake, 4);
      if (F.snapTimer > 0.7) { this.lineSnap(); return; }
    } else F.snapTimer = Math.max(0, F.snapTimer - dt * 2);

    // ikan lepas?
    if (F.dist > F.maxDist * 1.6) { this.fishEscape(); return; }
    // dapat!
    if (F.dist <= 0) { this.catchFish(); return; }

    // cipratan saat ikan di permukaan & berontak
    if (F.fishY < this.surfaceY + 60 && F.behavior === 'dash' && Math.random() < dt * 8) {
      this.splash(F.fishX, this.surfaceY, 2);
    }
  },

  lineSnap() {
    AudioSys.snap();
    this.shake = 8;
    this.floater(this.fight.fishX, this.surfaceY - 80, '💥 SENAR PUTUS!', '#ff6b6b', 22);
    UI.toast('💥 Senar putus! Jangan menegang terlalu lama di zona merah.', 'bad');
    this.fight = null; this.state = 'idle';
    UI.refreshAction();
  },

  fishEscape() {
    AudioSys.escape();
    this.floater(this.fight.fishX, this.surfaceY - 80, '💨 Ikan lepas...', '#b8c4cc', 20);
    UI.toast('💨 Ikan lepas! Terus gulung agar tidak kabur.', 'bad');
    this.fight = null; this.state = 'idle';
    UI.refreshAction();
  },

  catchFish() {
    const F = this.fight;
    const spec = F.spec;
    this.state = 'caught';
    AudioSys.catchFanfare(spec.rarity);
    this.splash(F.fishX, this.surfaceY, 22);
    this.sparkles(F.fishX, this.surfaceY - 40, spec.rarity === 'legendary' ? 40 : 16, DATA.rarities[spec.rarity].color);
    this.shake = 5;
    this.profile.caughtTotal++;
    // siapkan data untuk modal (disimpan saat klik Simpan)
    this.pendingCatch = { spec, weight: F.weight, price: F.price, xp: F.xp };
    this.fight = null;
    this.save();
    UI.showCatch(this.pendingCatch);
  },

  keepCatch() {
    const c = this.pendingCatch;
    if (!c) return;
    this.pendingCatch = null;
    this.profile.inv.push({ uid: ++this.uidSeq, sp: c.spec.id, w: c.weight, price: c.price });
    const col = this.profile.coll[c.spec.id] || { n: 0, best: 0 };
    const isRecord = c.weight > col.best;
    col.n++; col.best = Math.max(col.best, c.weight);
    this.profile.coll[c.spec.id] = col;
    AudioSys.coin();
    this.gainXP(c.xp);
    this.state = 'idle';
    this.save();
    UI.refreshAll();
    return isRecord;
  },

  releaseCatch() {
    const c = this.pendingCatch;
    if (!c) return;
    this.pendingCatch = null;
    const bonusXP = Math.round(c.xp * 0.5);
    this.gainXP(bonusXP);
    UI.toast(`🌊 ${c.spec.name} dilepasliarkan. (+${bonusXP} XP)`);
    this.state = 'idle';
    this.save();
    UI.refreshAll();
  },

  gainXP(amount) {
    this.profile.xp += amount;
    let need = DATA.xpNeed(this.profile.level);
    while (this.profile.xp >= need) {
      this.profile.xp -= need;
      this.profile.level++;
      const reward = DATA.config.levelCoinReward * this.profile.level;
      this.profile.coins += reward;
      AudioSys.levelup();
      UI.toast(`🎖️ <b>NAIK LEVEL ${this.profile.level}!</b> Bonus 🪙 ${reward}`, 'gold');
      this.coinBurst(this.W / 2, this.H / 2);
      need = DATA.xpNeed(this.profile.level);
    }
  },

  /* ---------------- PARTIKEL & TEKS ---------------- */
  splash(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ type: 'drop', x, y: y - 4, vx: rand(-140, 140), vy: rand(-260, -60), g: 700, life: rand(0.4, 0.8), max: 0.8, size: rand(2, 4.5), color: '#bfe9ff' });
    }
    this.ring(x, y, 30);
  },
  ring(x, y, size) {
    this.particles.push({ type: 'ring', x, y, life: 0.7, max: 0.7, size });
  },
  bubble(x, y) {
    this.particles.push({ type: 'bubble', x, y, vx: rand(-10, 10), vy: rand(-60, -30), life: rand(0.8, 1.6), max: 1.6, size: rand(1.5, 4) });
  },
  sparkles(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ type: 'spark', x: x + rand(-30, 30), y: y + rand(-20, 20), vx: rand(-40, 40), vy: rand(-80, -10), g: 120, life: rand(0.6, 1.2), max: 1.2, size: rand(2, 4), color: color || '#ffd93d' });
    }
  },
  coinBurst(x, y) {
    for (let i = 0; i < 16; i++) {
      this.particles.push({ type: 'coin', x, y, vx: rand(-180, 180), vy: rand(-320, -120), g: 800, life: rand(0.7, 1.1), max: 1.1, size: rand(5, 8) });
    }
  },
  floater(x, y, text, color = '#fff', size = 16) {
    this.floaters.push({ x: clamp(x, 70, this.W - 70), y, text, color, size, life: 1.6, max: 1.6 });
  },

  /* ---------------- UPDATE ---------------- */
  loop(ts) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.05, (ts - (this._last || ts)) / 1000 || 0.016);
    this._last = ts;
    if (!this.paused) this.update(dt);
    this.render();
    if (typeof UI !== 'undefined' && UI.update) UI.update(dt);
  },

  update(dt) {
    this.t += dt;
    const P = this.profile;
    // waktu game
    P.time = (P.time + dt / DATA.config.hourLength) % 24;
    const h = P.time;
    const dayRaw = (h > 5.5 && h < 18.5) ? Math.sin(((h - 5.5) / 13) * Math.PI) : 0;
    this.dayF = clamp(dayRaw, 0, 1);
    this.duskF = clamp(Math.exp(-Math.pow(h - 6.3, 2) / 1.1) + Math.exp(-Math.pow(h - 17.7, 2) / 1.1), 0, 1);
    this.nightF = 1 - clamp(this.dayF + this.duskF * 0.55, 0, 1);
    this.golden = (h >= 5 && h < 7.5) || (h >= 16.5 && h < 19);

    // awan & burung
    for (const c of this.clouds) { c.x += c.v * dt; if (c.x > 1.2) { c.x = -0.2; c.y = rand(0.04, 0.28); } }
    for (const b of this.birds) { b.x += b.v * dt; if (b.x > 1.1) { b.x = -0.1; b.y = rand(0.08, 0.25); } b.ph += dt * 6; }

    // ikan ambient
    for (const f of this.ambient) {
      f.ph += dt * (2 + f.speed * 0.03);
      const sp = f.flee > 0 ? 3.2 : 1;
      f.flee = Math.max(0, f.flee - dt);
      f.x += f.dir * f.speed * sp * dt;
      f.y += Math.sin(f.ph * 0.7) * 8 * dt;
      f.y = clamp(f.y, this.surfaceY + 46, this.H - 30);
      if (f.x < -120) { f.x = -100; f.dir = 1; }
      if (f.x > this.W + 120) { f.x = this.W + 100; f.dir = -1; }
    }
    // gelembung acak
    if (Math.random() < dt * 2.5) this.bubble(rand(0, this.W), rand(this.surfaceY + 80, this.H - 20));

    // charging
    if (this.state === 'charging' && this.holding) {
      this.power = Math.min(1, this.power + dt / 1.25);
    }
    // terbang
    if (this.state === 'flying' && this.castAnim) {
      const c = this.castAnim;
      c.t += dt;
      if (c.t >= c.dur) this.landBobber();
    }
    // menunggu sambaran
    if (this.state === 'waiting') {
      this.bobber.dip = Math.max(0, this.bobber.dip - dt * 30);
      if (!this.biter && this.t >= this.nextNibbleAt - 2.2) this.spawnBiter();
      const b = this.biter;
      if (b) {
        b.ph += dt * 5;
        if (b.phase === 'approach') {
          const tx = this.bobber.x, ty = this.surfaceY + 34;
          const dx = tx - b.x, dy = ty - b.y;
          const d = Math.hypot(dx, dy);
          const sp = Math.max(120, d * 2.2);
          if (d > 6) { b.x += (dx / d) * sp * dt; b.y += (dy / d) * sp * dt; }
          if (this.t >= this.nextNibbleAt) this.startNibble();
        } else if (b.phase === 'nibble') {
          b.x = lerp(b.x, this.bobber.x + Math.sin(this.t * 3) * 8, dt * 5);
          b.y = lerp(b.y, this.surfaceY + 30, dt * 5);
          if (this.t >= this.nextNibbleEvent) this.doNibble();
        } else if (b.phase === 'flee') {
          b.x += (b.x < this.W / 2 ? -1 : 1) * 260 * dt;
          if (this.t - (b.fleeT || 0) > 1.1) this.biter = null;
        }
      }
    }
    // jendela hentak
    if (this.state === 'bite') {
      this.bobber.dip = 18 + Math.sin(this.t * 30) * 4;
      if (this.t >= this.biteEndsAt) this.missBite();
    }
    // lawan ikan
    if (this.state === 'hooked' && this.fight) this.updateFight(dt);

    // ujung joran mengikuti status
    this.updateRodTip(dt);

    // partikel
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      if (p.vx !== undefined) {
        p.vy += (p.g || 0) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
    }
    // teks melayang
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt; f.y -= 34 * dt;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
    this.shake = Math.max(0, this.shake - dt * 22);
  },

  updateRodTip(dt) {
    let tx = this.rodBase.x + 62, ty = this.rodBase.y - 78;
    if (this.state === 'charging') { tx -= this.power * 26; ty += this.power * 12; }
    else if (this.state === 'waiting' || this.state === 'bite') {
      tx = lerp(tx, this.bobber.x, 0.25); ty = lerp(ty, this.surfaceY - 60, 0.25);
    } else if (this.state === 'hooked' && this.fight) {
      const F = this.fight;
      const bend = F.tension / 100;
      tx = lerp(this.rodBase.x + 62, F.fishX, 0.12 + bend * 0.25);
      ty = lerp(this.rodBase.y - 78, this.surfaceY - 20, bend * 0.55);
    }
    const k = Math.min(1, dt * 8);
    this.rodTip.x = lerp(this.rodTip.x, tx, k);
    this.rodTip.y = lerp(this.rodTip.y, ty, k);
  },

  /* ---------------- RENDER ---------------- */
  render() {
    const { ctx, W, H } = this;
    ctx.save();
    if (this.shake > 0.2) ctx.translate(rand(-this.shake, this.shake) * 0.5, rand(-this.shake, this.shake) * 0.5);

    this.renderSky();
    this.renderDistant();
    this.renderWater();
    this.renderDockAndAngler();
    this.renderLineAndBobber();
    this.renderParticles();
    this.renderFloaters();

    // tint malam
    if (this.nightF > 0.02) {
      ctx.fillStyle = `rgba(3,8,30,${this.nightF * 0.34})`;
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }
    ctx.restore();
  },

  renderSky() {
    const { ctx, W, H } = this;
    const sy = this.surfaceY;
    const dayTop = [64, 168, 224], dayBot = [186, 234, 248];
    const nightTop = [4, 10, 34], nightBot = [16, 34, 70];
    const duskTop = [70, 60, 130], duskBot = [255, 150, 80];
    let top = mixColor(nightTop, dayTop, this.dayF);
    let bot = mixColor(nightBot, dayBot, this.dayF);
    top = mixColor(top, duskTop, this.duskF * 0.65);
    bot = mixColor(bot, duskBot, this.duskF * 0.8);
    const g = ctx.createLinearGradient(0, 0, 0, sy);
    g.addColorStop(0, css(top)); g.addColorStop(1, css(bot));
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, W + 40, sy + 20);

    // bintang
    if (this.nightF > 0.15) {
      for (const s of this.stars) {
        const a = this.nightF * (0.4 + 0.6 * Math.abs(Math.sin(this.t * 1.5 + s.tw)));
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
        ctx.fillRect(s.x * W, s.y * sy, s.s, s.s);
      }
    }
    // matahari / bulan
    const h = this.profile.time;
    if (h > 5.5 && h < 18.8) {
      const f = (h - 5.8) / 12.7;
      const sx = W * (0.08 + 0.84 * f);
      const syy = sy - 30 - Math.sin(f * Math.PI) * sy * 0.62;
      const sunR = 26 + this.duskF * 14;
      const glow = ctx.createRadialGradient(sx, syy, 4, sx, syy, sunR * 3.2);
      const sc = this.duskF > 0.4 ? '255,140,60' : '255,225,130';
      glow.addColorStop(0, `rgba(${sc},0.9)`); glow.addColorStop(1, `rgba(${sc},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(sx - sunR * 3.2, syy - sunR * 3.2, sunR * 6.4, sunR * 6.4);
      ctx.fillStyle = this.duskF > 0.4 ? '#ff9a3c' : '#ffef9e';
      ctx.beginPath(); ctx.arc(sx, syy, sunR, 0, TAU); ctx.fill();
    } else {
      const nh = h >= 18.8 ? h - 18.8 : h + 24 - 18.8;
      const f = nh / 10.7;
      const mx = W * (0.12 + 0.76 * f);
      const my = sy - 40 - Math.sin(f * Math.PI) * sy * 0.55;
      ctx.fillStyle = 'rgba(230,238,255,0.25)';
      ctx.beginPath(); ctx.arc(mx, my, 30, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8efff';
      ctx.beginPath(); ctx.arc(mx, my, 20, 0, TAU); ctx.fill();
      ctx.fillStyle = css(mixColor(nightTop, dayTop, 0.05));
      ctx.beginPath(); ctx.arc(mx + 8, my - 5, 16, 0, TAU); ctx.fill();
    }
    // awan
    for (const c of this.clouds) {
      const cx = c.x * W, cy = c.y * sy + 10;
      const bright = Math.round(lerp(40, 255, this.dayF));
      ctx.fillStyle = `rgba(${bright},${bright},${Math.min(255, bright + 10)},${0.5 + this.dayF * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 46 * c.s, 15 * c.s, 0, 0, TAU);
      ctx.ellipse(cx - 26 * c.s, cy + 5 * c.s, 26 * c.s, 11 * c.s, 0, 0, TAU);
      ctx.ellipse(cx + 28 * c.s, cy + 4 * c.s, 30 * c.s, 12 * c.s, 0, 0, TAU);
      ctx.fill();
    }
    // burung (siang)
    if (this.dayF > 0.3) {
      ctx.strokeStyle = `rgba(30,40,60,${this.dayF})`;
      ctx.lineWidth = 2;
      for (const b of this.birds) {
        const bx = b.x * W, by = b.y * sy;
        const w = 7 + Math.sin(b.ph) * 3;
        ctx.beginPath();
        ctx.moveTo(bx - w, by); ctx.quadraticCurveTo(bx - w / 2, by - 5, bx, by);
        ctx.quadraticCurveTo(bx + w / 2, by - 5, bx + w, by);
        ctx.stroke();
      }
    }
  },

  renderDistant() {
    const { ctx, W } = this;
    const sy = this.surfaceY;
    const deco = DATA.loc(this.profile.loc).deco;
    ctx.save();
    if (deco === 'danau') {
      ctx.fillStyle = css(mixColor([20, 32, 60], [110, 150, 180], this.dayF));
      ctx.beginPath();
      ctx.moveTo(W * 0.3, sy);
      ctx.lineTo(W * 0.52, sy - 130); ctx.lineTo(W * 0.62, sy - 60);
      ctx.lineTo(W * 0.76, sy - 150); ctx.lineTo(W * 0.95, sy - 40);
      ctx.lineTo(W, sy - 70); ctx.lineTo(W, sy); ctx.closePath(); ctx.fill();
      // salju
      ctx.fillStyle = `rgba(255,255,255,${0.3 + this.dayF * 0.6})`;
      ctx.beginPath();
      ctx.moveTo(W * 0.52, sy - 130); ctx.lineTo(W * 0.485, sy - 100); ctx.lineTo(W * 0.52, sy - 108);
      ctx.lineTo(W * 0.555, sy - 100); ctx.closePath(); ctx.fill();
      // pinus
      ctx.fillStyle = css(mixColor([10, 26, 26], [34, 90, 60], this.dayF));
      for (let i = 0; i < 7; i++) {
        const px = W * (0.34 + i * 0.09);
        ctx.beginPath();
        ctx.moveTo(px, sy - 34); ctx.lineTo(px - 10, sy); ctx.lineTo(px + 10, sy); ctx.closePath(); ctx.fill();
      }
    } else if (deco === 'pantai') {
      // pulau + palem
      ctx.fillStyle = css(mixColor([16, 30, 44], [240, 210, 140], this.dayF));
      ctx.beginPath(); ctx.ellipse(W * 0.78, sy + 2, 110, 18, 0, 0, TAU); ctx.fill();
      const px = W * 0.78, py = sy - 6;
      ctx.strokeStyle = css(mixColor([20, 24, 30], [120, 80, 40], this.dayF));
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 14, py - 46, px + 34, py - 64); ctx.stroke();
      ctx.strokeStyle = css(mixColor([14, 34, 26], [40, 140, 70], this.dayF));
      ctx.lineWidth = 4;
      for (let i = 0; i < 5; i++) {
        const a = -0.4 - i * 0.45;
        ctx.beginPath(); ctx.moveTo(px + 34, py - 64);
        ctx.quadraticCurveTo(px + 34 + Math.cos(a) * 34, py - 64 + Math.sin(a) * 22 - 8, px + 34 + Math.cos(a) * 52, py - 64 + Math.sin(a) * 34 + 6);
        ctx.stroke();
      }
    } else if (deco === 'laut') {
      // kapal jauh + karang
      const sx = W * 0.7 + Math.sin(this.t * 0.4) * 6;
      ctx.fillStyle = css(mixColor([8, 14, 26], [60, 70, 90], this.dayF));
      ctx.beginPath();
      ctx.moveTo(sx - 46, sy - 18); ctx.lineTo(sx + 46, sy - 18);
      ctx.lineTo(sx + 32, sy - 2); ctx.lineTo(sx - 32, sy - 2); ctx.closePath(); ctx.fill();
      ctx.fillRect(sx - 8, sy - 40, 22, 22);
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(sx - 30, sy - 18); ctx.lineTo(sx - 30, sy - 52); ctx.stroke();
    } else {
      // kolam: pagar + rumah + bambu
      ctx.fillStyle = css(mixColor([16, 24, 34], [150, 110, 70], this.dayF));
      for (let i = 0; i < 10; i++) ctx.fillRect(W * 0.42 + i * 22, sy - 26, 12, 26);
      ctx.fillRect(W * 0.42, sy - 24, 220, 6);
      // rumah
      const hx = W * 0.72;
      ctx.fillStyle = css(mixColor([18, 28, 40], [200, 150, 100], this.dayF));
      ctx.fillRect(hx, sy - 70, 90, 70);
      ctx.fillStyle = css(mixColor([24, 20, 30], [160, 70, 50], this.dayF));
      ctx.beginPath(); ctx.moveTo(hx - 12, sy - 70); ctx.lineTo(hx + 45, sy - 110); ctx.lineTo(hx + 102, sy - 70); ctx.closePath(); ctx.fill();
      if (this.nightF > 0.4) {
        ctx.fillStyle = 'rgba(255,220,130,0.9)';
        ctx.fillRect(hx + 34, sy - 46, 22, 26);
      }
    }
    ctx.restore();
  },

  renderWater() {
    const { ctx, W, H } = this;
    const sy = this.surfaceY;
    const loc = DATA.loc(this.profile.loc);
    const top = hexToRgb(loc.water[0]), bot = hexToRgb(loc.water[1]);
    const dk = this.nightF * 0.55;
    const topC = [top[0] * (1 - dk), top[1] * (1 - dk), top[2] * (1 - dk * 0.7)];
    const botC = [bot[0] * (1 - dk), bot[1] * (1 - dk), bot[2] * (1 - dk * 0.7)];
    const g = ctx.createLinearGradient(0, sy, 0, H);
    g.addColorStop(0, css(topC)); g.addColorStop(1, css(botC));
    ctx.fillStyle = g;
    ctx.fillRect(-20, sy, W + 40, H - sy + 20);

    // cahaya matahari menembus air
    if (this.dayF > 0.25) {
      ctx.save();
      ctx.globalAlpha = this.dayF * 0.14;
      ctx.fillStyle = '#eaf7ff';
      for (let i = 0; i < 4; i++) {
        const rx = W * (0.2 + i * 0.22) + Math.sin(this.t * 0.5 + i) * 20;
        ctx.beginPath();
        ctx.moveTo(rx, sy); ctx.lineTo(rx + 50, sy);
        ctx.lineTo(rx + 130, H); ctx.lineTo(rx + 40, H);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    // pasir dasar
    const sand = hexToRgb(loc.sand);
    ctx.fillStyle = css([sand[0] * (1 - dk), sand[1] * (1 - dk), sand[2] * (1 - dk)]);
    ctx.beginPath();
    ctx.moveTo(-20, H + 20);
    ctx.lineTo(-20, H - 46);
    for (let x = 0; x <= W + 40; x += 40) ctx.lineTo(x - 20, H - 46 + Math.sin(x * 0.02 + 1) * 8);
    ctx.lineTo(W + 20, H + 20); ctx.closePath(); ctx.fill();

    // rumput laut / karang
    const nSea = 9;
    for (let i = 0; i < nSea; i++) {
      const gx = (i + 0.5) * (W / nSea) + Math.sin(i * 7) * 20;
      const gy = H - 44;
      const gh = 26 + (i % 3) * 16;
      const sway = Math.sin(this.t * 1.4 + i * 1.3) * 8;
      ctx.strokeStyle = `rgba(${Math.round(30 * (1 - dk))},${Math.round(140 * (1 - dk))},${Math.round(90 * (1 - dk))},0.9)`;
      ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + sway, gy - gh * 0.6, gx + sway * 1.6, gy - gh);
      ctx.stroke();
    }
    // batu
    ctx.fillStyle = `rgba(90,100,115,${0.9 - dk})`;
    for (let i = 0; i < 6; i++) {
      const bx = (i * 197 + 60) % W;
      ctx.beginPath(); ctx.ellipse(bx, H - 40, 14 + (i % 3) * 6, 8, 0, 0, TAU); ctx.fill();
    }

    // ikan ambient
    for (const f of this.ambient) {
      const depthA = clamp(1 - (f.y - sy) / (H - sy) * 0.4, 0.55, 1);
      this.drawFish(f.spec, f.x, f.y, f.size, f.dir, f.ph, { alpha: depthA });
    }
    // ikan penggigit
    if (this.biter && this.biter.phase !== 'flee') {
      const b = this.biter;
      const dir = b.phase === 'approach' ? (this.bobber.x > b.x ? 1 : -1) : 1;
      this.drawFish(b.spec, b.x, b.y, b.size, dir, b.ph, {});
    }
    // ikan yang dilawan
    if (this.state === 'hooked' && this.fight) {
      const F = this.fight;
      const dir = F.pullOff >= 0 ? 1 : -1;
      this.drawFish(F.spec, F.fishX, F.fishY, this.fishLen(F.spec) * 1.05, dir, this.t * 7, { thrash: F.thrash });
    }

    // teratai (kolam)
    if (loc.deco === 'kolam') {
      for (let i = 0; i < 4; i++) {
        const lx = W * (0.3 + i * 0.16) + Math.sin(this.t * 0.8 + i * 2) * 6;
        const ly = sy + 14 + (i % 2) * 22;
        ctx.fillStyle = `rgba(46,125,60,${0.95 - dk})`;
        ctx.beginPath(); ctx.ellipse(lx, ly, 26, 9, 0, 0, TAU); ctx.fill();
        if (i === 1) {
          ctx.fillStyle = '#ff9ec7';
          ctx.beginPath(); ctx.arc(lx, ly - 6, 6, 0, TAU); ctx.fill();
          ctx.fillStyle = '#ffe3ef';
          ctx.beginPath(); ctx.arc(lx, ly - 6, 2.5, 0, TAU); ctx.fill();
        }
      }
    }

    // garis permukaan + ombak
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + this.dayF * 0.3})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 8) {
      const y = sy + Math.sin(x * 0.03 + this.t * 2.2) * 2.4 + Math.sin(x * 0.011 - this.t * 1.3) * 2;
      if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // buih kedua
    ctx.strokeStyle = `rgba(255,255,255,${0.14})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 10) {
      const y = sy + 8 + Math.sin(x * 0.025 - this.t * 1.6) * 3;
      if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  },

  renderDockAndAngler() {
    const { ctx, W } = this;
    const sy = this.surfaceY;
    const dockX = W * 0.22;
    const dk = this.nightF * 0.5;
    const wood = `rgb(${Math.round(139 * (1 - dk))},${Math.round(99 * (1 - dk))},${Math.round(58 * (1 - dk))})`;
    const woodD = `rgb(${Math.round(100 * (1 - dk))},${Math.round(70 * (1 - dk))},${Math.round(40 * (1 - dk))})`;
    // tiang
    ctx.fillStyle = woodD;
    ctx.fillRect(W * 0.03, sy - 8, 14, 70);
    ctx.fillRect(dockX - 14, sy - 8, 14, 70);
    // papan dermaga
    ctx.fillStyle = wood;
    ctx.fillRect(-20, sy - 14, dockX + 20, 10);
    ctx.fillStyle = woodD;
    for (let x = -10; x < dockX; x += 26) ctx.fillRect(x, sy - 14, 3, 10);
    // ember
    const bx = W * 0.05;
    ctx.fillStyle = '#b03a3a';
    ctx.beginPath();
    ctx.moveTo(bx - 12, sy - 14); ctx.lineTo(bx + 12, sy - 14);
    ctx.lineTo(bx + 8, sy - 40); ctx.lineTo(bx - 8, sy - 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a2828'; ctx.fillRect(bx - 8, sy - 40, 16, 5);

    // ---- pemancing ----
    const ax = this.angler.x, fy = this.angler.feetY;
    const lean = this.state === 'hooked' ? 6 : this.state === 'charging' ? -4 * this.power : 0;
    // kaki
    ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ax, fy - 34); ctx.lineTo(ax - 6, fy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax, fy - 34); ctx.lineTo(ax + 8, fy); ctx.stroke();
    // badan
    ctx.strokeStyle = '#0ea5c4'; ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(ax, fy - 34); ctx.lineTo(ax + lean, fy - 62); ctx.stroke();
    // kepala
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath(); ctx.arc(ax + lean, fy - 72, 9, 0, TAU); ctx.fill();
    // topi jerami
    ctx.fillStyle = '#e8c020';
    ctx.beginPath(); ctx.ellipse(ax + lean, fy - 78, 15, 5, 0, 0, TAU); ctx.fill();
    ctx.fillRect(ax + lean - 7, fy - 88, 14, 10);
    // lengan ke joran
    ctx.strokeStyle = '#0ea5c4'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(ax + lean, fy - 58); ctx.lineTo(this.rodBase.x, this.rodBase.y); ctx.stroke();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath(); ctx.arc(this.rodBase.x, this.rodBase.y, 5, 0, TAU); ctx.fill();

    // ---- joran ----
    const rod = DATA.rod(this.profile.rod);
    const tip = this.rodTip, base = this.rodBase;
    const bend = this.state === 'hooked' && this.fight ? this.fight.tension / 100 : 0;
    const mx = (base.x + tip.x) / 2, my = (base.y + tip.y) / 2 + bend * 26;
    ctx.strokeStyle = rod.color; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.quadraticCurveTo(mx, my, tip.x, tip.y); ctx.stroke();
    // gagang
    ctx.strokeStyle = '#4a2c14'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(base.x - 12, base.y + 10); ctx.lineTo(base.x + 4, base.y - 4); ctx.stroke();
    // reel
    ctx.fillStyle = '#c0c9d1';
    ctx.beginPath(); ctx.arc(base.x - 4, base.y + 12, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#39414a';
    ctx.beginPath(); ctx.arc(base.x - 4, base.y + 12, 3, 0, TAU); ctx.fill();
  },

  renderLineAndBobber() {
    const { ctx } = this;
    const tip = this.rodTip;
    ctx.strokeStyle = 'rgba(240,240,240,0.75)';
    ctx.lineWidth = 1.3;

    const drawLineTo = (x, y) => {
      const sag = 14 + Math.hypot(x - tip.x, y - tip.y) * 0.03;
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.quadraticCurveTo((tip.x + x) / 2, (tip.y + y) / 2 + sag, x, y);
      ctx.stroke();
    };

    if (this.state === 'flying' && this.castAnim) {
      const c = this.castAnim;
      const s = clamp(c.t / c.dur, 0, 1);
      const x = lerp(c.fx, c.tx, s);
      const y = lerp(c.fy, this.surfaceY, s) - Math.sin(s * Math.PI) * 130;
      drawLineTo(x, y);
      this.drawBobber(x, y, 0);
    } else if (this.bobber.visible && (this.state === 'waiting' || this.state === 'bite')) {
      const bobY = this.bobber.y + Math.sin(this.t * 2.4) * 2.5 + this.bobber.dip;
      drawLineTo(this.bobber.x, bobY);
      this.drawBobber(this.bobber.x, bobY, this.bobber.dip);
      // riak sekitar pelampung
      const rr = ((this.t * 26) % 34);
      ctx.strokeStyle = `rgba(255,255,255,${0.4 * (1 - rr / 34)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(this.bobber.x, this.surfaceY + 4, 10 + rr, 3.5 + rr * 0.16, 0, 0, TAU); ctx.stroke();
      if (this.state === 'bite') {
        ctx.fillStyle = '#ffd93d';
        ctx.font = '900 30px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('❗', this.bobber.x, this.surfaceY - 34 + Math.sin(this.t * 30) * 4);
      }
    } else if (this.state === 'hooked' && this.fight) {
      const F = this.fight;
      const tight = F.tension / 100;
      ctx.strokeStyle = F.tension > 82 ? `rgba(255,${Math.round(80 + (100 - F.tension) * 2)},60,0.95)` : 'rgba(240,240,240,0.85)';
      ctx.lineWidth = F.tension > 82 ? 2 : 1.4;
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.quadraticCurveTo((tip.x + F.fishX) / 2, (tip.y + F.fishY) / 2 + (1 - tight) * 30, F.fishX, F.fishY - 6);
      ctx.stroke();
    } else if (this.state === 'idle' || this.state === 'charging') {
      // senar menggantung pendek
      const hx = tip.x + 8, hy = tip.y + 34 + (this.state === 'charging' ? this.power * 10 : 0);
      drawLineTo(hx, hy);
      // kail + umpan
      const bait = DATA.bait(this.profile.bait);
      ctx.font = '14px serif'; ctx.textAlign = 'center';
      ctx.fillText(bait.emoji, hx, hy + 14);
    }
  },

  drawBobber(x, y, dip) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    // stik atas
    ctx.fillStyle = '#e63946';
    ctx.fillRect(-1.5, -16, 3, 10);
    // badan
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, 8, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#e63946';
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.stroke();
    if (dip > 12) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.ellipse(0, 8, 12, 4, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },

  renderParticles() {
    const { ctx } = this;
    for (const p of this.particles) {
      const a = clamp(p.life / p.max, 0, 1);
      if (p.type === 'drop' || p.type === 'spark') {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1;
      } else if (p.type === 'bubble') {
        ctx.globalAlpha = a * 0.7;
        ctx.strokeStyle = '#cfeeff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (p.type === 'ring') {
        const f = 1 - a;
        ctx.globalAlpha = a * 0.8;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, p.size * (0.3 + f), p.size * (0.1 + f * 0.3), 0, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (p.type === 'coin') {
        ctx.globalAlpha = a;
        ctx.fillStyle = '#ffd93d';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
        ctx.fillStyle = '#b97a00';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.55, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  },

  renderFloaters() {
    const { ctx } = this;
    ctx.textAlign = 'center';
    for (const f of this.floaters) {
      const a = clamp(f.life / f.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = `900 ${f.size}px Nunito, sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,20,35,0.7)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
  },

  /* ---------------- GAMBAR IKAN PROSEDURAL ---------------- */
  drawFish(spec, x, y, len, dir, time, opts = {}) {
    const { ctx } = this;
    const o = Object.assign({ alpha: 1, thrash: 0, silhouette: false }, opts);
    const slim = spec.long ? 0.26 : 0.36;
    const bh = len * slim;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir || 1, 1);
    ctx.globalAlpha = o.alpha;
    if (o.thrash > 0.3) ctx.rotate(Math.sin(time * 20) * 0.25 * o.thrash);

    let body = spec.colors.body, belly = spec.colors.belly, fin = spec.colors.fin;
    if (o.silhouette) { body = '#232f3d'; belly = '#232f3d'; fin = '#232f3d'; }
    const isGlow = spec.pattern === 'glow' && !o.silhouette;
    if (isGlow) { ctx.shadowColor = spec.rarity === 'legendary' ? '#ffd93d' : '#ffce54'; ctx.shadowBlur = 22; }

    const wag = Math.sin(time * (o.thrash > 0.3 ? 3 : 1) + 1) * len * 0.06;
    // ekor
    ctx.fillStyle = fin;
    ctx.beginPath();
    ctx.moveTo(-len * 0.42, 0);
    ctx.lineTo(-len * 0.62, -bh * 0.75 + wag);
    ctx.lineTo(-len * 0.54, wag);
    ctx.lineTo(-len * 0.62, bh * (spec.shark ? 0.35 : 0.75) + wag);
    ctx.closePath(); ctx.fill();
    if (spec.shark) {
      // sirip punggung hiu
      ctx.beginPath();
      ctx.moveTo(len * 0.05, -bh * 0.42);
      ctx.lineTo(len * 0.16, -bh * 1.15);
      ctx.lineTo(len * 0.26, -bh * 0.4);
      ctx.closePath(); ctx.fill();
    }
    // badan
    const g = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
    g.addColorStop(0, body); g.addColorStop(0.55, body); g.addColorStop(1, belly);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, len / 2, bh / 2, 0, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    // pola
    if (!o.silhouette && spec.pattern === 'stripes') {
      ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = Math.max(2, len * 0.03);
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * len * 0.16, -bh * 0.42);
        ctx.quadraticCurveTo(i * len * 0.16 + 6, 0, i * len * 0.16, bh * 0.42);
        ctx.stroke();
      }
    } else if (!o.silhouette && spec.pattern === 'spots') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      const spots = [[-0.25, -0.12], [-0.08, 0.14], [0.08, -0.16], [0.22, 0.1], [-0.02, -0.02]];
      for (const [sx, syy] of spots) {
        ctx.beginPath(); ctx.arc(sx * len, syy * bh, len * 0.028, 0, TAU); ctx.fill();
      }
    } else if (isGlow) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.ellipse(len * 0.05, -bh * 0.12, len * 0.32, bh * 0.2, -0.15, 0, TAU); ctx.fill();
    }
    // sirip punggung
    ctx.fillStyle = fin;
    ctx.beginPath();
    ctx.moveTo(-len * 0.15, -bh * 0.44);
    ctx.quadraticCurveTo(len * 0.02, -bh * 0.95, len * 0.16, -bh * 0.42);
    ctx.closePath(); ctx.fill();
    // sirip dada
    ctx.globalAlpha = o.alpha * 0.9;
    ctx.beginPath();
    ctx.moveTo(len * 0.05, bh * 0.1);
    ctx.quadraticCurveTo(len * 0.16, bh * 0.5 + wag * 0.5, len * 0.02, bh * 0.62);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = o.alpha;
    // paruh marlin
    if (spec.bill && !o.silhouette) {
      ctx.fillStyle = '#0e2566';
      ctx.beginPath();
      ctx.moveTo(len * 0.48, -2); ctx.lineTo(len * 0.72, 1); ctx.lineTo(len * 0.48, 5);
      ctx.closePath(); ctx.fill();
    }
    // kumis lele
    if (spec.whiskers) {
      ctx.strokeStyle = o.silhouette ? '#232f3d' : '#2b2b33'; ctx.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(len * 0.46, 4 + i * 2);
        ctx.quadraticCurveTo(len * 0.6, 8 + i * 4, len * 0.66, 14 + i * 5);
        ctx.stroke();
      }
    }
    // insang
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(len * 0.26, 0, bh * 0.3, -1.1, 1.1); ctx.stroke();
    // mata
    if (!o.silhouette) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(len * 0.34, -bh * 0.12, Math.max(2.5, len * 0.035), 0, TAU); ctx.fill();
      ctx.fillStyle = '#101418';
      ctx.beginPath(); ctx.arc(len * 0.355, -bh * 0.12, Math.max(1.2, len * 0.018), 0, TAU); ctx.fill();
    }
    ctx.restore();
  },

  // Ikon ikan untuk modal (canvas kecil)
  drawFishIcon(canvas, specId, silhouette = false) {
    const c = canvas.getContext('2d');
    const spec = DATA.spec(specId);
    c.clearRect(0, 0, canvas.width, canvas.height);
    const realCtx = this.ctx;
    this.ctx = c;
    const len = Math.min(canvas.width * 0.62, 220);
    this.drawFish(spec, canvas.width / 2, canvas.height / 2, len, 1, 1.4, { silhouette });
    this.ctx = realCtx;
  },

  /* ---------------- API TOKO & INVENTARIS ---------------- */
  buyRod(id) {
    const rod = DATA.rod(id), P = this.profile;
    if (P.rods.includes(id)) { P.rod = id; this.save(); return true; }
    if (P.coins < rod.price) { AudioSys.error(); return false; }
    P.coins -= rod.price; P.rods.push(id); P.rod = id;
    AudioSys.buy(); this.save(); return true;
  },
  buyBait(id) {
    const bait = DATA.bait(id), P = this.profile;
    if (P.baits.includes(id)) { P.bait = id; this.save(); return true; }
    if (P.coins < bait.price) { AudioSys.error(); return false; }
    P.coins -= bait.price; P.baits.push(id); P.bait = id;
    AudioSys.buy(); this.save(); return true;
  },
  buyLocation(id) {
    const loc = DATA.loc(id), P = this.profile;
    if (P.locs.includes(id)) { this.travel(id); return true; }
    if (P.coins < loc.price || P.level < loc.minLevel) { AudioSys.error(); return false; }
    P.coins -= loc.price; P.locs.push(id);
    AudioSys.buy(); this.travel(id); return true;
  },
  travel(id) {
    if (!this.profile.locs.includes(id)) return;
    this.enterLocation(id);
    AudioSys.splash();
    UI.toast(`${DATA.loc(id).emoji} Berangkat ke <b>${DATA.loc(id).name}</b>!`);
    this.save();
  },
  sellOne(uid) {
    const P = this.profile;
    const i = P.inv.findIndex(f => f.uid === uid);
    if (i < 0) return 0;
    const f = P.inv.splice(i, 1)[0];
    P.coins += f.price;
    AudioSys.coin();
    this.coinBurst(this.W / 2, this.H * 0.35);
    this.save();
    return f.price;
  },
  sellAll() {
    const P = this.profile;
    const total = P.inv.reduce((s, f) => s + f.price, 0);
    P.inv = [];
    if (total > 0) { P.coins += total; AudioSys.coin(); this.coinBurst(this.W / 2, this.H * 0.35); }
    this.save();
    return total;
  },
};

window.addEventListener('DOMContentLoaded', () => Game.init());
