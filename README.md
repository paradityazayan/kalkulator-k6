# 🎣 Gigit Masalah — Monorepo

Dua proyek web berbasis browser dari **Kelompok 6 RPL**, terinspirasi dunia mancing: game memancing 3D dan kalkulator bertema dermaga. Keduanya jalan langsung di browser tanpa install apa pun, tanpa backend, tanpa database — semua progres tersimpan otomatis lewat `localStorage`.

**🔗 Main game di sini:** https://nononame66.github.ios/gigit-masalah/
**🔗 Kalkulator di sini:** https://nononame66.github.io/tes/kalkulator/
---

## 📂 Struktur Repo

```
tes/
├── gigit-masalah/     → game memancing 3D
├── kalkulator/         → kalkulator bertema dermaga
└── README.md           → kamu di sini
```

Setiap folder berdiri sendiri (independen) — punya HTML/CSS/JS masing-masing dan tidak saling bergantung.

---

## 🎣 1. Gigit Masalah — Game Memancing 3D

Game memancing 3D berbasis browser, terinspirasi dari **Fisch (Roblox)**. Dibuat pakai **Three.js**, bisa dimainkan di PC maupun HP.

📁 Ada di folder [`gigit-masalah/`](./gigit-masalah)

### Cara Bermain

| Kontrol | Aksi |
|---|---|
| **WASD** / Joystick kiri bawah | Gerak karakter |
| **Drag layar/mouse** | Putar kamera |
| **SPASI** / tombol hijau | Lempar kail, hook ikan, tarik saat reeling |
| Tombol **SHAKE** | Ketuk berkali-kali saat umpan sudah di air |

**Alur bermain:** Lempar kail → tunggu SHAKE → GIGITAN! → hook cepat → menangkan minigame reeling → ikan/barang masuk Tas.

### Fitur

- Dunia 3D low-poly stylized (pulau tropis, langit gradient, laut animasi, siklus siang-malam & hujan)
- Sistem casting dengan power meter & zona PERFECT
- Minigame shake + reeling dengan tingkat kesulitan berbeda per rarity ikan
- 15 spesies ikan (Common → Mythic) + 7 jenis barang sampah bernama lucu
- Sistem Toko: beli & pasang pancingan dan umpan
- Fishdex (koleksi ikan) & Tas/Inventory
- Preview 3D hasil tangkapan yang berputar, termasuk model custom untuk beberapa ikan langka
- XP, level, koin, dan progres otomatis tersimpan (`localStorage`)
- Dukungan penuh PC (keyboard + mouse) dan mobile (joystick virtual + tap)

### 🏆 Challenge Spesial

Coba tangkap ikan **Mythic** paling langka: 🐲 **Leviathan Sungai Glitch** atau 🌌 **Naga Kosmik Bintang**. Dapat salah satunya? Tunjukkan screenshot tangkapan buat klaim hadiah lewat IG [@abrisam.listiyo](https://www.instagram.com/abrisam.listiyo).

### Dibuat Dengan

Three.js (r0.160) &middot; HTML/CSS/JavaScript (ES Modules, tanpa framework/build tool) &middot; Web Audio API (efek suara prosedural) &middot; `localStorage`

---

## 🧮 2. Kalkulator Mancing Masalah

Kalkulator bertema **nota timbangan dermaga** — dasar & presisi (scientific), lengkap dengan konverter satuan, riwayat, memori, dan sistem level/lencana ala pemancing.

📁 Ada di folder [`kalkulator/`](./kalkulator)

### Fitur

- Kalkulator Dasar & Presisi (sin, cos, tan, ln, log, √, x², π)
- Konverter: Panjang, Berat, Suhu, Luas, Volume, Waktu, Kecepatan, Data Digital, Energi
- Riwayat perhitungan (📜) — klik buat pakai ulang, hapus satu/semua
- Memori: MC / MR / M+ / M- / MS
- Sistem level & pangkat pemancing (Pemancing Pemula → Grandmaster Mancing), XP, dan 5 lencana
- Mode terang (nota kertas) & gelap (dermaga malam neon)
- Maskot "Kapten Kadal" yang bereaksi tiap perhitungan
- Efek suara Web Audio API (default mati, bisa dinyalakan)
- Dukungan keyboard penuh & desain responsif/aksesibel
- Semua progres tersimpan otomatis (`localStorage`)

### Dibuat Dengan

HTML/CSS/JavaScript vanilla (tanpa framework) &middot; Web Audio API &middot; `localStorage`

---

## 🙏 Kredit

**Kelompok 6 RPL — SMKN 1 Sanden, Bantul**
Ardhi Muhammad &middot; Paraditya Zayan &middot; Ferdina &middot; Albrisam Durrany I.L.W.

Sebagian besar model 3D dibuat sepenuhnya lewat kode (procedural low-poly). Beberapa model ikan langka memakai aset dari Sketchfab berlisensi CC-BY-4.0 — detail lengkap ada di [`gigit-masalah/README.md`](./gigit-masalah/README.md).

---

## 🛠️ Menjalankan Secara Lokal

Kedua proyek murni statis (HTML/CSS/JS), tidak butuh build step. Cukup:

```bash
git clone https://github.com/nononame66/tes.git
cd tes/gigit-masalah   # atau cd tes/kalkulator
# lalu buka index.html / calculator.html langsung di browser,
# atau jalankan local server (disarankan, agar ES Modules & assets termuat benar):
python3 -m http.server 8000
```

Buka `http://localhost:8000` di browser.

## 🚀 Publikasi (GitHub Pages)

Repo ini bisa langsung dipublikasikan lewat GitHub Pages tanpa konfigurasi tambahan — tidak butuh backend maupun database. Setelah Pages aktif untuk branch `main`, kedua proyek otomatis bisa diakses di:

- `https://<username>.github.io/<repo>/gigit-masalah/`
- `https://<username>.github.io/<repo>/kalkulator/`
