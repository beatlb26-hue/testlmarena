/* ============================================================
   AUDIO — Semua efek suara dibuat prosedural via WebAudio API
   ============================================================ */
const AudioSys = {
  ctx: null,
  master: null,
  muted: false,
  ambientNodes: null,
  lastReelTick: 0,

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      this.startAmbient();
    } catch (e) { console.warn('Audio tidak tersedia:', e); }
  },

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  setMuted(m) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
    }
  },

  // Nada dasar dengan optional slide
  tone(freq, dur = 0.15, type = 'sine', vol = 0.25, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  },

  // Noise burst (cipratan, hempasan)
  noise(dur = 0.3, vol = 0.3, filterFreq = 1200, type = 'lowpass', delay = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(filterFreq, t0);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  },

  click()  { this.tone(650, 0.07, 'square', 0.12, 900); },
  cast()   { this.noise(0.35, 0.25, 600, 'bandpass', 0, 3500); this.tone(220, 0.25, 'sine', 0.15, 620); },
  splash() { this.noise(0.4, 0.4, 1600, 'lowpass', 0, 300); this.tone(320, 0.25, 'sine', 0.2, 90); },
  plip()   { this.tone(700 + Math.random() * 200, 0.09, 'sine', 0.22, 280); },
  bite()   {
    this.tone(880, 0.12, 'square', 0.2); this.tone(660, 0.12, 'square', 0.2, null, 0.12);
    this.tone(880, 0.16, 'square', 0.22, null, 0.24); this.splash();
  },
  hook()   { this.tone(300, 0.18, 'sawtooth', 0.2, 900); this.noise(0.15, 0.2, 2000); },
  snap()   { this.tone(800, 0.3, 'sawtooth', 0.25, 120); this.noise(0.25, 0.3, 3000, 'highpass'); },
  escape() { this.tone(500, 0.4, 'sine', 0.2, 150); },

  reelTick(tension) {
    const now = performance.now();
    if (now - this.lastReelTick < 90) return;
    this.lastReelTick = now;
    const f = 500 + tension * 6 + Math.random() * 60;
    this.tone(f, 0.05, 'square', 0.07);
  },

  coin() { this.tone(988, 0.1, 'square', 0.16); this.tone(1319, 0.22, 'square', 0.16, null, 0.09); },

  catchFanfare(rarity) {
    const seq = { common: [523, 659], uncommon: [523, 659, 784], rare: [523, 659, 784, 1047],
      epic: [523, 659, 784, 1047, 1319], legendary: [523, 659, 784, 1047, 1319, 1568, 2093] }[rarity] || [523, 659];
    seq.forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.25, null, i * 0.11));
    if (rarity === 'legendary') seq.forEach((f, i) => this.tone(f / 2, 0.3, 'sawtooth', 0.1, null, i * 0.11));
  },

  levelup() { [440, 554, 659, 880, 1108].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.25, null, i * 0.1)); },
  buy()     { this.coin(); this.tone(784, 0.2, 'triangle', 0.2, null, 0.15); },
  error()   { this.tone(220, 0.18, 'square', 0.18); this.tone(180, 0.22, 'square', 0.18, null, 0.12); },

  // Suara ombak ambient (loop)
  startAmbient() {
    if (!this.ctx || this.ambientNodes) return;
    const len = this.ctx.sampleRate * 3;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 420;
    const g = this.ctx.createGain(); g.gain.value = 0.05;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.18;
    const lfoGain = this.ctx.createGain(); lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain); lfoGain.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(); lfo.start();
    this.ambientNodes = { src, lfo };
  },
};
