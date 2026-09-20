# 🎣 Mancing Mania — Simulator Memancing

Game simulator memancing 2D yang berjalan langsung di browser. Lempar kail, hentak saat
ada sambaran, dan gulung ikan dengan mengatur ketegangan senar!

## ✨ Fitur

- 🐟 **13 spesies ikan** — dari Ikan Mas sampai Hiu Putih & Marlin legendaris
- 🗺️ **4 lokasi** — Kolam Desa, Danau Biru, Pantai Sunset, Laut Dalam
- 🎣 **5 pancingan** & 🪱 **5 umpan** dengan statistik berbeda
- ⚡ **Minigame hentak & gulung** dengan bar ketegangan senar yang dinamis
- 🌅 **Siklus siang–malam** + Waktu Emas (peluang sambaran lebih besar)
- 💰 **Ekonomi & toko**, 🎖️ **level & XP**, 📖 **ensiklopedia koleksi**
- 🔊 **Efek suara prosedural** (WebAudio API, tanpa file audio)
- 💾 **Progress tersimpan otomatis** di localStorage
- 📱 Bisa dimainkan dengan **mouse, sentuhan, maupun keyboard (spasi)**

## 🚀 Cara Menjalankan

Cukup jalankan server statis lalu buka di browser:

```bash
cd testlmarena
python3 -m http.server 8000
```

Lalu buka **http://localhost:8000**.

## 🎮 Cara Bermain

1. **TAHAN** tombol / klik / spasi untuk mengisi kekuatan, **LEPAS** untuk melempar.
2. Tunggu pelampung disambar — saat muncul **⚡ HENTAK! ⚡**, segera klik / tekan spasi.
3. Saat melawan ikan, **TAHAN** untuk menggulung dan **LEPAS** agar senar tidak putus.
4. Jual ikan, beli peralatan lebih bagus, dan buka lokasi baru!

## 🗂️ Struktur

```
index.html        → Struktur halaman & modal
css/style.css     → Tampilan & animasi
js/data.js        → Data ikan, pancingan, umpan, lokasi
js/audio.js       → Efek suara prosedural (WebAudio)
js/game.js        → Engine game (fisika, AI ikan, render canvas)
js/ui.js          → HUD, toko, koleksi, & overlay
```
