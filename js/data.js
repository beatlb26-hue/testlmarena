/* ============================================================
   DATA — Spesies ikan, pancingan, umpan, lokasi & konfigurasi
   ============================================================ */
const DATA = {
  version: 1,

  rarities: {
    common:    { name: 'Biasa',      color: '#b8c4cc', stars: '⭐',       xpMult: 1,   priceMult: 1 },
    uncommon:  { name: 'Lumayan',    color: '#5ee87a', stars: '⭐⭐',     xpMult: 1.6, priceMult: 1.6 },
    rare:      { name: 'Langka',     color: '#4db8ff', stars: '⭐⭐⭐',   xpMult: 2.5, priceMult: 2.6 },
    epic:      { name: 'Epik',       color: '#c07bff', stars: '⭐⭐⭐⭐', xpMult: 4,   priceMult: 4.5 },
    legendary: { name: 'LEGENDARIS', color: '#ffd93d', stars: '⭐⭐⭐⭐⭐', xpMult: 8, priceMult: 10 },
  },

  // Spesies ikan
  species: [
    { id: 'mas',     name: 'Ikan Mas',   emoji: '🐟', rarity: 'common',
      locs: ['kolam'], price: 45, wMin: 0.4, wMax: 2.5, xp: 12, strength: 2,
      colors: { body: '#ff9d2e', belly: '#ffe3b3', fin: '#e07b00' }, pattern: 'none',
      desc: 'Ikan favorit pemancing pemula. Rakus dan mudah dipancing.' },
    { id: 'nila',    name: 'Nila',       emoji: '🐟', rarity: 'common',
      locs: ['kolam', 'danau'], price: 55, wMin: 0.3, wMax: 2.0, xp: 14, strength: 2,
      colors: { body: '#7d8ca3', belly: '#dfe7ef', fin: '#5a6b82' }, pattern: 'stripes',
      desc: 'Ikan air tawar yang gesit dan banyak ditemukan.' },
    { id: 'lele',    name: 'Lele',       emoji: '🐡', rarity: 'uncommon',
      locs: ['kolam'], price: 120, wMin: 0.8, wMax: 5.0, xp: 26, strength: 4,
      colors: { body: '#4a4a52', belly: '#9a9aa5', fin: '#33333a' }, pattern: 'none', whiskers: true,
      desc: 'Berlendir, berkumis, dan suka memberontak. Aktif di malam hari.' },
    { id: 'gabus',   name: 'Gabus',      emoji: '🐠', rarity: 'rare',
      locs: ['kolam', 'danau'], price: 320, wMin: 1.0, wMax: 6.0, xp: 55, strength: 5,
      colors: { body: '#3f7d44', belly: '#c9e4a8', fin: '#2c5c30' }, pattern: 'spots',
      desc: 'Predator air tawar yang agresif dan penuh luka tempur.' },
    { id: 'mujair',  name: 'Mujair',     emoji: '🐟', rarity: 'common',
      locs: ['danau'], price: 70, wMin: 0.3, wMax: 1.8, xp: 16, strength: 2,
      colors: { body: '#9fb4c7', belly: '#eef3f7', fin: '#7d90a5' }, pattern: 'stripes',
      desc: 'Ikan danau yang lincah, berenang dalam kawanan besar.' },
    { id: 'tombro',  name: 'Tombro',     emoji: '🐠', rarity: 'uncommon',
      locs: ['danau'], price: 180, wMin: 1.0, wMax: 7.0, xp: 34, strength: 5,
      colors: { body: '#c9a227', belly: '#f4e3b2', fin: '#8a6d1a' }, pattern: 'none',
      desc: 'Ikan mas raksasa penghuni danau dalam. Tarikannya kuat!' },
    { id: 'arwana',  name: 'Arwana Emas', emoji: '🐉', rarity: 'epic',
      locs: ['danau'], price: 1500, wMin: 2.0, wMax: 8.0, xp: 140, strength: 7,
      colors: { body: '#e8a020', belly: '#ffe9b0', fin: '#b34d00' }, pattern: 'glow',
      desc: 'Ikan naga legendaris air tawar. Sisiknya berkilau seperti emas.' },
    { id: 'kerapu',  name: 'Kerapu',     emoji: '🐡', rarity: 'uncommon',
      locs: ['pantai'], price: 260, wMin: 1.5, wMax: 12.0, xp: 45, strength: 6,
      colors: { body: '#8a5a3b', belly: '#e0c39a', fin: '#5c3a22' }, pattern: 'spots',
      desc: 'Penghuni karang yang suka bersembunyi dan menyambar tiba-tiba.' },
    { id: 'kakap',   name: 'Kakap Merah', emoji: '🐠', rarity: 'rare',
      locs: ['pantai'], price: 520, wMin: 1.5, wMax: 15.0, xp: 80, strength: 6,
      colors: { body: '#d9383c', belly: '#ffc4c4', fin: '#8f1d20' }, pattern: 'none',
      desc: 'Ikan konsumsi primadona. Dagingnya lezat, tarikannya mantap.' },
    { id: 'cuda',    name: 'Barracuda',  emoji: '🦈', rarity: 'epic',
      locs: ['pantai'], price: 1300, wMin: 3.0, wMax: 20.0, xp: 150, strength: 8,
      colors: { body: '#8fa3b0', belly: '#e8eef2', fin: '#4e5f6b' }, pattern: 'none', long: true,
      desc: 'Torpedo bergigi tajam. Jangan biarkan senar kendur sedetik pun!' },
    { id: 'tuna',    name: 'Tuna Sirip Kuning', emoji: '🐟', rarity: 'rare',
      locs: ['laut'], price: 900, wMin: 5.0, wMax: 45.0, xp: 130, strength: 8,
      colors: { body: '#2b4d8f', belly: '#cfd8e6', fin: '#e8c020' }, pattern: 'none',
      desc: 'Raja kecepatan samudra. Pertarungan panjang yang melelahkan.' },
    { id: 'marlin',  name: 'Marlin Biru', emoji: '🐋', rarity: 'legendary',
      locs: ['laut'], price: 4500, wMin: 30.0, wMax: 180.0, xp: 450, strength: 10,
      colors: { body: '#1e3fa0', belly: '#c9d6f2', fin: '#101f5c' }, pattern: 'glow', bill: true,
      desc: 'Legenda samudra! Hanya pemancing terhebat yang bisa menaklukkannya.' },
    { id: 'hiu',     name: 'Hiu Putih',  emoji: '🦈', rarity: 'legendary',
      locs: ['laut'], price: 6000, wMin: 80.0, wMax: 400.0, xp: 600, strength: 10,
      colors: { body: '#5a6570', belly: '#f2f4f6', fin: '#39414a' }, pattern: 'none', shark: true,
      desc: 'Predator puncak. Butuh pancingan terbaik dan nyali baja!' },
  ],

  // Pancingan (joran)
  rods: [
    { id: 'bambu',   name: 'Joran Bambu',     emoji: '🎋', price: 0,    power: 0.75, reel: 0.8,  line: 0.85, color: '#c9a227', desc: 'Joran warisan kakek. Sederhana tapi penuh kenangan.' },
    { id: 'fiber',   name: 'Joran Fiber',     emoji: '🎣', price: 300,  power: 0.9,  reel: 1.0,  line: 1.0,  color: '#0ea5c4', desc: 'Ringan dan lentur. Standar para penghobi.' },
    { id: 'carbon',  name: 'Joran Carbon',    emoji: '🎣', price: 1200, power: 1.0,  reel: 1.25, line: 1.25, color: '#39414a', desc: 'Kuat dan sensitif. Andalan pemancing serius.' },
    { id: 'pro',     name: 'Pro Angler X',    emoji: '🏆', price: 3500, power: 1.1,  reel: 1.55, line: 1.6,  color: '#7c3aed', desc: 'Dipakai para juara turnamen memancing.' },
    { id: 'poseidon',name: 'Poseidon Legend', emoji: '🔱', price: 9000, power: 1.25, reel: 2.0,  line: 2.2,  color: '#ffd93d', desc: 'Trisula sang dewa laut. Tak ada ikan yang lolos!' },
  ],

  // Umpan (lure permanen)
  baits: [
    { id: 'cacing', name: 'Cacing Tanah',   emoji: '🪱', price: 0,    bite: 1.0, luck: 0, big: 0,    desc: 'Umpan sejuta umat. Gratis dan selalu tersedia.' },
    { id: 'pelet',  name: 'Pelet Wangi',    emoji: '🍡', price: 250,  bite: 1.5, luck: 0, big: 0,    desc: 'Aromanya memanggil ikan dari kejauhan. Cepat disambar!' },
    { id: 'udang',  name: 'Udang Hidup',    emoji: '🦐', price: 900,  bite: 1.35, luck: 1, big: 0.25, desc: 'Menari-nari di kail. Ikan besar sulit menolaknya.' },
    { id: 'cumi',   name: 'Cumi Segar',      emoji: '🦑', price: 2500, bite: 1.5, luck: 2, big: 0.35, desc: 'Favorit predator laut. Peluang ikan langka naik!' },
    { id: 'emas',   name: 'Umpan Emas',      emoji: '🌟', price: 6000, bite: 1.8, luck: 4, big: 0.5,  desc: 'Berkilau misterius. Konon memanggil para legenda...' },
  ],

  // Lokasi
  locations: [
    { id: 'kolam', name: 'Kolam Desa', emoji: '🏡', price: 0, minLevel: 1, activity: 1.15,
      water: ['#2fa8c7', '#0d5e80'], sand: '#d9b96a', deco: 'kolam',
      fish: [ { sp: 'mas', w: 40 }, { sp: 'nila', w: 30 }, { sp: 'lele', w: 18 }, { sp: 'gabus', w: 6 } ],
      desc: 'Tenang dan damai. Tempat sempurna untuk belajar memancing.' },
    { id: 'danau', name: 'Danau Biru', emoji: '🏔️', price: 500, minLevel: 2, activity: 1.0,
      water: ['#1f8fc4', '#083d63'], sand: '#6a8a7a', deco: 'danau',
      fish: [ { sp: 'mujair', w: 34 }, { sp: 'nila', w: 26 }, { sp: 'tombro', w: 20 }, { sp: 'gabus', w: 8 }, { sp: 'arwana', w: 2.5 } ],
      desc: 'Air jernih pegunungan. Arwana emas bersembunyi di kedalamannya.' },
    { id: 'pantai', name: 'Pantai Sunset', emoji: '🏝️', price: 2000, minLevel: 4, activity: 0.95,
      water: ['#25b3a7', '#0a4d68'], sand: '#f4df9e', deco: 'pantai',
      fish: [ { sp: 'kerapu', w: 32 }, { sp: 'kakap', w: 26 }, { sp: 'mujair', w: 22 }, { sp: 'cuda', w: 5 } ],
      desc: 'Debur ombak dan angin laut. Surga para predator karang.' },
    { id: 'laut', name: 'Laut Dalam', emoji: '🌊', price: 5000, minLevel: 6, activity: 0.85,
      water: ['#155e9c', '#041e3f'], sand: '#1c2f4a', deco: 'laut',
      fish: [ { sp: 'tuna', w: 30 }, { sp: 'kakap', w: 22 }, { sp: 'cuda', w: 14 }, { sp: 'marlin', w: 2.2 }, { sp: 'hiu', w: 1.4 } ],
      desc: 'Zona para monster. Hanya yang berani yang kembali membawa legenda.' },
  ],

  config: {
    invCap: 30,
    xpBase: 80,
    levelCoinReward: 120,
    goldenBiteMult: 1.7,
    nightBiteMult: 0.8,
    hourLength: 12, // 1 jam game = 12 detik nyata
  },
};

// Helper akses cepat
DATA.spec = (id) => DATA.species.find(s => s.id === id);
DATA.rod = (id) => DATA.rods.find(r => r.id === id);
DATA.bait = (id) => DATA.baits.find(b => b.id === id);
DATA.loc = (id) => DATA.locations.find(l => l.id === id);
DATA.xpNeed = (level) => Math.round(DATA.config.xpBase * Math.pow(level, 1.45));
