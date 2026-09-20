/* ============================================================
   UI — HUD, modal toko/koleksi/jual, dan overlay
   ============================================================ */
const UI = {
  shopTab: 'rods',
  openModals: new Set(),

  init() {
    $('btnStart').addEventListener('click', () => this.startGame());
    $('btnShop').addEventListener('click', () => { AudioSys.resume(); AudioSys.click(); this.openModal('shopModal'); });
    $('btnCollection').addEventListener('click', () => { AudioSys.resume(); AudioSys.click(); this.openModal('collectionModal'); });
    $('btnSell').addEventListener('click', () => { AudioSys.resume(); AudioSys.click(); this.openModal('sellModal'); });
    $('btnHelp').addEventListener('click', () => { AudioSys.resume(); AudioSys.click(); this.openModal('helpModal'); });
    $('btnMute').addEventListener('click', () => this.toggleMute());
    $('btnSellAll').addEventListener('click', () => {
      const total = Game.sellAll();
      if (total > 0) this.toast(`💰 Semua ikan terjual! +🪙 ${total.toLocaleString('id-ID')}`, 'gold');
      else this.toast('Tas masih kosong, belum ada yang bisa dijual.');
      this.renderSell(); this.refreshAll();
    });
    $('btnKeep').addEventListener('click', () => {
      const c = Game.pendingCatch;
      const rec = Game.keepCatch();
      AudioSys.click();
      this.closeModal('catchModal');
      if (c) {
        if (rec) this.toast(`🏆 <b>REKOR!</b> ${c.spec.name} ${c.weight.toFixed(1)} kg — terbesar milikmu!`, 'gold');
        else this.toast(`${c.spec.emoji} ${c.spec.name} disimpan. (+${c.xp} XP)`);
      }
    });
    $('btnRelease').addEventListener('click', () => {
      Game.releaseCatch();
      AudioSys.click();
      this.closeModal('catchModal');
    });
    $('btnReset').addEventListener('click', () => {
      if (confirm('Yakin ingin menghapus semua progress dan mengulang dari awal?')) {
        Game.resetSave();
        this.closeModal('helpModal');
        this.refreshAll();
        this.toast('🗑️ Data dihapus. Selamat memancing dari awal!');
      }
    });
    document.querySelectorAll('[data-close]').forEach(b =>
      b.addEventListener('click', () => { AudioSys.click(); this.closeModal(b.dataset.close); }));
    document.querySelectorAll('.tab').forEach(t =>
      t.addEventListener('click', () => {
        AudioSys.click();
        document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        this.shopTab = t.dataset.tab;
        this.renderShop();
      }));
    $('backdrop').addEventListener('click', () => {
      [...this.openModals].forEach(m => { if (m !== 'catchModal') this.closeModal(m); });
    });
    // tombol tarik kembali saat menunggu (klik kanan / tombol keyboard R?) — gunakan klik pada hint
    $('hint').addEventListener('click', () => {
      if (Game.state === 'waiting') { Game.reelIn(); this.refreshAction(); }
    });
    this.refreshAll();
    this.updateMuteIcon();
  },

  startGame() {
    AudioSys.resume();
    AudioSys.click();
    $('startOverlay').style.display = 'none';
    $('hud').classList.remove('hidden');
    $('stateui').classList.remove('hidden');
    Game.started = true;
    this.refreshAll();
    setTimeout(() => this.toast('🎣 <b>TAHAN</b> tombol / klik / spasi, lalu <b>LEPAS</b> untuk melempar!'), 400);
    setTimeout(() => {
      if (Game.profile.casts === 0) this.toast('💡 Bidik zona terang pada bar kekuatan untuk Lemparan Sempurna!');
    }, 4500);
  },

  toggleMute() {
    Game.profile.muted = !Game.profile.muted;
    AudioSys.setMuted(Game.profile.muted);
    Game.save();
    this.updateMuteIcon();
  },
  updateMuteIcon() { $('btnMute').textContent = Game.profile.muted ? '🔇' : '🔊'; },

  /* ---------- Modal ---------- */
  openModal(id) {
    this.openModals.add(id);
    $(id).classList.remove('hidden');
    $('backdrop').classList.remove('hidden');
    Game.paused = true;
    if (id === 'shopModal') this.renderShop();
    if (id === 'collectionModal') this.renderCollection();
    if (id === 'sellModal') this.renderSell();
  },
  closeModal(id) {
    this.openModals.delete(id);
    $(id).classList.add('hidden');
    if (this.openModals.size === 0) {
      $('backdrop').classList.add('hidden');
      Game.paused = false;
    }
    this.refreshAll();
  },

  /* ---------- Toast ---------- */
  toast(html, cls = '') {
    const box = $('toasts');
    while (box.children.length >= 3) box.removeChild(box.firstChild);
    const el = document.createElement('div');
    el.className = 'toast ' + cls;
    el.innerHTML = html;
    box.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3100);
  },

  /* ---------- Aksi & status ---------- */
  refreshAction() {
    const btn = $('actionBtn');
    const hint = $('hint');
    btn.classList.remove('strike', 'reel');
    btn.disabled = false;
    $('powerWrap').classList.add('hidden');
    $('fightWrap').classList.add('hidden');
    this.showStrike(false);

    const bait = DATA.bait(Game.profile.bait);
    const rod = DATA.rod(Game.profile.rod);
    switch (Game.state) {
      case 'idle':
        btn.textContent = '🎣 TAHAN UNTUK MELEMPAR';
        hint.innerHTML = `${rod.emoji} ${rod.name} • ${bait.emoji} ${bait.name} — tahan lalu lepas untuk melempar! (klik hint untuk menarik kail)`;
        break;
      case 'charging':
        btn.textContent = '🚀 LEPASKAN UNTUK MELEMPAR!';
        hint.textContent = 'Bidik zona terang untuk Lemparan Sempurna!';
        $('powerWrap').classList.remove('hidden');
        break;
      case 'flying':
        btn.textContent = '💫 ...';
        btn.disabled = true;
        hint.textContent = 'Kail melayang...';
        break;
      case 'waiting':
        btn.textContent = '↩️ TARIK KEMBALI';
        btn.onclick = null;
        hint.innerHTML = '⏳ Menunggu sambaran... <b>klik tombol / layar saat ⚡ STRIKE! ⚡</b> — klik di sini untuk menarik kail.';
        break;
      case 'bite':
        btn.textContent = '⚡ HENTAK SEKARANG! ⚡';
        btn.classList.add('strike');
        hint.textContent = 'IKAN MENYAMBAR! Klik / tekan spasi SEKARANG!';
        this.showStrike(true);
        break;
      case 'hooked': {
        btn.textContent = '🌀 TAHAN UNTUK MENGGULUNG';
        btn.classList.add('reel');
        const F = Game.fight;
        hint.innerHTML = F ? `Lepas jika bar <b style="color:#ff8a8a">merah</b>! Stamina ${F.spec.name} tinggal <b>${Math.ceil(F.stam)}%</b>` : '';
        $('fightWrap').classList.remove('hidden');
        if (F) $('fishName').textContent = `${F.spec.emoji} ${F.spec.name}`;
        break;
      }
      case 'caught':
        btn.textContent = '🎉 DAPAT!';
        btn.disabled = true;
        break;
    }
  },

  showStrike(on) {
    $('strikeFlash').classList.toggle('hidden', !on);
    if (!on && Game.state !== 'bite') $('actionBtn').classList.remove('strike');
  },

  // Per-frame: bar, jam, banner
  update() {
    if (!Game.started) return;
    // jam
    const h = Game.profile.time;
    const hh = String(Math.floor(h)).padStart(2, '0');
    const mm = String(Math.floor((h % 1) * 60)).padStart(2, '0');
    $('clock').textContent = `${hh}:${mm}`;
    $('clockPill').firstChild.textContent = Game.nightF > 0.6 ? '🌙 ' : Game.duskF > 0.5 ? '🌇 ' : '☀️ ';
    $('goldenBanner').classList.toggle('hidden', !Game.golden);
    // power
    if (Game.state === 'charging') {
      $('powerFill').style.width = (Game.power * 100).toFixed(1) + '%';
    }
    // fight
    if (Game.state === 'hooked' && Game.fight) {
      const F = Game.fight;
      $('dist').textContent = Math.max(0, F.dist).toFixed(1);
      $('stamFill').style.width = F.stam.toFixed(1) + '%';
      $('tensionFill').style.width = F.tension.toFixed(1) + '%';
      $('actionBtn').textContent = Game.holding ? '🌀 MENGGULUNG...' : '🌀 TAHAN UNTUK MENGGULUNG';
    }
  },

  refreshAll() {
    const P = Game.profile;
    $('coins').textContent = P.coins.toLocaleString('id-ID');
    $('level').textContent = P.level;
    const need = DATA.xpNeed(P.level);
    $('xpMiniFill').style.width = clamp(P.xp / need * 100, 0, 100) + '%';
    $('locName').textContent = DATA.loc(P.loc).name;
    const badge = $('invBadge');
    badge.textContent = P.inv.length;
    badge.classList.toggle('hidden', P.inv.length === 0);
    this.refreshAction();
  },

  /* ---------- Modal tangkapan ---------- */
  showCatch(c) {
    const rar = DATA.rarities[c.spec.rarity];
    $('catchRarity').textContent = c.spec.rarity === 'common' ? '' : `✨ ${rar.name.toUpperCase()}! ✨`;
    $('catchRarity').style.color = rar.color;
    $('catchName').textContent = `${c.spec.emoji} ${c.spec.name}`;
    $('catchStars').textContent = rar.stars;
    $('catchWeight').textContent = c.weight >= 10 ? `${c.weight.toFixed(1)} kg` : `${(c.weight * 1000).toFixed(0)} g`;
    $('catchPrice').textContent = `🪙 ${c.price.toLocaleString('id-ID')}`;
    $('catchXP').textContent = `+${c.xp}`;
    const col = Game.profile.coll[c.spec.id] || { best: 0 };
    $('catchRecord').classList.toggle('hidden', !(c.weight > col.best && col.best > 0));
    if (!Game.profile.coll[c.spec.id]) {
      $('catchRecord').classList.remove('hidden');
      $('catchRecord').textContent = '📖 SPESIES BARU! Tercatat di ensiklopedia!';
    } else if (c.weight > col.best) {
      $('catchRecord').textContent = '🏆 REKOR BARU! Ikan terbesar yang pernah kamu tangkap!';
    }
    Game.drawFishIcon($('catchCanvas'), c.spec.id);
    // efek khusus legendaris
    document.querySelector('.catch-card').style.boxShadow =
      c.spec.rarity === 'legendary' ? '0 0 60px rgba(255,217,61,.8)' : '';
    this.openModal('catchModal');
    this.refreshAll();
  },

  /* ---------- Toko ---------- */
  renderShop() {
    const P = Game.profile;
    $('shopCoins').textContent = P.coins.toLocaleString('id-ID');
    const list = $('shopList');
    list.innerHTML = '';
    const statBar = (label, v, max) =>
      `<div class="stat-row"><span style="width:52px">${label}</span><div class="mini-track"><div class="mini-fill" style="width:${clamp(v / max * 100, 4, 100)}%"></div></div></div>`;

    if (this.shopTab === 'rods') {
      for (const r of DATA.rods) {
        const owned = P.rods.includes(r.id);
        const equipped = P.rod === r.id;
        const afford = P.coins >= r.price;
        list.appendChild(this.shopRow(
          r.emoji, r.name,
          `${r.desc}${statBar('🎯 Jarak', r.power, 1.3)}${statBar('🌀 Gulung', r.reel, 2.1)}${statBar('🧵 Senar', r.line, 2.3)}`,
          owned ? (equipped ? '✅ Dipakai' : 'Pakai') : `🪙 ${r.price.toLocaleString('id-ID')}`,
          owned ? (equipped ? 'secondary' : 'primary') : (afford ? 'gold' : 'secondary'),
          owned && equipped ? true : (!owned && !afford),
          () => { if (Game.buyRod(r.id)) { this.renderShop(); this.refreshAll(); this.toast(`🎣 <b>${r.name}</b> ${owned ? 'dipakai!' : 'dibeli!'}`); } else this.toast('🪙 Koin tidak cukup!', 'bad'); },
          equipped
        ));
      }
    } else if (this.shopTab === 'baits') {
      for (const b of DATA.baits) {
        const owned = P.baits.includes(b.id);
        const equipped = P.bait === b.id;
        const afford = P.coins >= b.price;
        list.appendChild(this.shopRow(
          b.emoji, b.name,
          `${b.desc}${statBar('⚡ Sambaran', b.bite, 1.9)}${statBar('🍀 Hoki', b.luck, 4.2)}${statBar('🐋 Ukuran', b.big, 0.55)}`,
          owned ? (equipped ? '✅ Dipakai' : 'Pakai') : `🪙 ${b.price.toLocaleString('id-ID')}`,
          owned ? (equipped ? 'secondary' : 'primary') : (afford ? 'gold' : 'secondary'),
          owned && equipped ? true : (!owned && !afford),
          () => { if (Game.buyBait(b.id)) { this.renderShop(); this.refreshAll(); this.toast(`${b.emoji} <b>${b.name}</b> ${owned ? 'dipakai!' : 'dibeli!'}`); } else this.toast('🪙 Koin tidak cukup!', 'bad'); },
          equipped
        ));
      }
    } else {
      for (const l of DATA.locations) {
        const owned = P.locs.includes(l.id);
        const here = P.loc === l.id;
        const canGo = owned;
        const afford = P.coins >= l.price;
        const lvlOk = P.level >= l.minLevel;
        const fishNames = l.fish.map(f => DATA.spec(f.sp).emoji).join(' ');
        list.appendChild(this.shopRow(
          l.emoji, `${l.name} <span style="font-size:11px;opacity:.8">(Lv ${l.minLevel}+)</span>`,
          `${l.desc}<div style="font-size:16px;margin-top:4px;letter-spacing:2px">${fishNames}</div>`,
          owned ? (here ? '📍 Di sini' : '⛵ Ke sana') : `🪙 ${l.price.toLocaleString('id-ID')}`,
          owned ? (here ? 'secondary' : 'primary') : (afford && lvlOk ? 'gold' : 'secondary'),
          (owned && here) || (!owned && (!afford || !lvlOk)),
          () => {
            if (!owned && !lvlOk) { this.toast(`🔒 Butuh level ${l.minLevel} untuk membuka ${l.name}!`, 'bad'); return; }
            if (Game.buyLocation(l.id)) { this.closeModal('shopModal'); this.refreshAll(); }
            else this.toast('🪙 Koin tidak cukup!', 'bad');
          },
          here
        ));
      }
    }
  },

  shopRow(emoji, title, descHTML, btnText, btnCls, disabled, onClick, equipped) {
    const div = document.createElement('div');
    div.className = 'shop-item' + (equipped ? ' equipped' : '');
    div.innerHTML = `<div class="shop-emoji">${emoji}</div><div class="shop-info"><h3>${title}</h3><p>${descHTML}</p></div>`;
    const btn = document.createElement('button');
    btn.className = `btn ${btnCls} shop-buy`;
    btn.innerHTML = btnText;
    btn.disabled = !!disabled;
    btn.addEventListener('click', onClick);
    div.appendChild(btn);
    return div;
  },

  /* ---------- Koleksi ---------- */
  renderCollection() {
    const grid = $('collGrid');
    grid.innerHTML = '';
    const caught = DATA.species.filter(s => Game.profile.coll[s.id]).length;
    $('collCount').textContent = `${caught}/${DATA.species.length}`;
    for (const s of DATA.species) {
      const col = Game.profile.coll[s.id];
      const rar = DATA.rarities[s.rarity];
      const card = document.createElement('div');
      card.className = 'coll-card' + (col ? '' : ' locked');
      const cv = document.createElement('canvas');
      cv.width = 150; cv.height = 64;
      card.appendChild(cv);
      card.insertAdjacentHTML('beforeend',
        `<div class="rar" style="color:${rar.color}">${col ? rar.name : '???'}</div>
         <h4>${col ? s.name : 'Belum ditemukan'}</h4>
         <div class="meta">${col ? `🐟 ${col.n}x • Terbesar: ${col.best >= 10 ? col.best.toFixed(1) + ' kg' : Math.round(col.best * 1000) + ' g'}` : s.locs.map(l => DATA.loc(l).name).join(', ')}</div>`);
      grid.appendChild(card);
      Game.drawFishIcon(cv, s.id, !col);
    }
  },

  /* ---------- Jual ---------- */
  renderSell() {
    const P = Game.profile;
    const list = $('sellList');
    list.innerHTML = '';
    const total = P.inv.reduce((s, f) => s + f.price, 0);
    $('sellCount').textContent = `${P.inv.length}/${DATA.config.invCap} ikan`;
    $('sellTotal').textContent = `🪙 ${total.toLocaleString('id-ID')}`;
    $('btnSellAll').disabled = P.inv.length === 0;
    if (P.inv.length === 0) {
      list.innerHTML = '<div style="text-align:center;opacity:.7;font-weight:700;padding:20px">Tas masih kosong.<br>Lempar kail dan tangkap ikan dulu! 🎣</div>';
      return;
    }
    const sorted = [...P.inv].sort((a, b) => b.price - a.price);
    for (const f of sorted.slice(0, 60)) {
      const s = DATA.spec(f.sp);
      const rar = DATA.rarities[s.rarity];
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.innerHTML = `<div class="shop-emoji">${s.emoji}</div>
        <div class="shop-info"><h3>${s.name} <span style="font-size:11px;color:${rar.color}">● ${rar.name}</span></h3>
        <p>⚖️ ${f.w >= 10 ? f.w.toFixed(1) + ' kg' : Math.round(f.w * 1000) + ' g'} • 🪙 ${f.price.toLocaleString('id-ID')}</p></div>`;
      const btn = document.createElement('button');
      btn.className = 'btn gold shop-buy';
      btn.textContent = 'Jual';
      btn.addEventListener('click', () => {
        Game.sellOne(f.uid);
        this.renderSell(); this.refreshAll();
      });
      div.appendChild(btn);
      list.appendChild(div);
    }
  },
};

window.addEventListener('DOMContentLoaded', () => UI.init());
