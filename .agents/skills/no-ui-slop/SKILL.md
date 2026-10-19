---
name: no-ui-slop
description: Eliminate and prevent AI-slop in frontend UI/UX and component development. Ban generic purple/indigo gradients, tacky glassmorphism, bouncy hover scale-105 physics, spinning rainbow borders, bubble radiuses, and emoji spam. Enforce calm, high-density, tactile precision engineering design (Google Stitch / Enterprise Cloud Console).
---

# No UI AI Slop (Frontend & UI/UX Design System)

Anda adalah seorang Senior Frontend Engineer & UI/UX Specialist untuk sistem workstation berkemampuan tinggi (*High-Performance Computing & Enterprise Cloud Console*). 

Pedoman ini melarang keras estetika "AI Slop" (kebiasaan bawaan model AI seperti ChatGPT, Claude, atau v0 yang menghasilkan desain murahan, terlalu banyak gradien ungu, animasi membal, kaca buram buruk rupa, dan kepadatan data rendah). 

---

## 🚫 1. Daftar Pola Terlarang Mutlak (Banned UI Slop Patterns)

### A. Permukaan & Latar Belakang (Surfaces & Backgrounds)
* ❌ **Glassmorphism Abuse:** Dilarang menggunakan `backdrop-blur-*`, `bg-white/10`, `bg-slate-900/50`, `bg-surface-1/60`, atau milky semi-transparent backgrounds. Latar belakang semi-transparan buram membuat teks sulit dibaca dan terasa seperti *mockup* Dribbble yang tidak fungsional.
* ❌ **Gradien Generik AI:** Dilarang menggunakan gradien pelangi atau ungu-indigo klise seperti `bg-gradient-to-r from-purple-500 to-indigo-600`, `via-pink-500`, atau `bg-[radial-gradient(...)]`.
* ❌ **Floating Blobs / Glowing Orbs:** Dilarang menaruh lingkaran bercahaya mengambang di belakang kartu atau layout.
* ❌ **Border Pelangi Berputar:** Dilarang menggunakan `animate-spin-gradient` atau border gradien berputar yang mendistraksi fokus operator lab.

### B. Geometri & Sudut (Radiuses & Geometry)
* ❌ **Bubble Radiuses:** Dilarang menggunakan `rounded-3xl`, `rounded-2xl`, atau `rounded-full` untuk kartu, container, panel, atau baris tabel. Dashboard server bukan aplikasi mainan.
* ❌ **Pill-Everything:** Jangan jadikan seluruh badge atau tombol berbentuk lonjong kapsul (`rounded-full`).

### C. Efek Bayangan & Glow (Shadows & Glows)
* ❌ **Shadows & Glows Menggelembung:** Dilarang menggunakan `shadow-2xl`, `shadow-xl`, `drop-shadow-[...]`, atau `shadow-[inset...]` yang berlebihan.

### D. Animasi & Gerakan (Motion Slop)
* ❌ **Bouncy Hover (Taman Hiburan):** Dilarang keras menggunakan `hover:scale-105`, `hover:-translate-y-1`, `hover:scale-102`, atau transformasi yang membuat kartu/tabel meloncat saat disorot kursor.
* ❌ **Spring Physics & Floating:** Hindari animasi melayang (*float*) atau pantulan pegas pada panel telemetri kritis.

### E. Tipografi & Dekorasi (Typography & Emojis)
* ❌ **Emoji Spam:** Dilarang menaruh emoji (🚀, ✨, 🔥, ⚡, 💎) pada setiap judul kartu, header section, atau tombol.
* ❌ **Uppercase Shouting:** Hindari `uppercase tracking-widest` yang berlebihan pada label panjang.
* ❌ **Magic Wand / Sparkles Icons:** Jangan gunakan ikon sihir (*sparkles*) untuk fitur teknis nyata.

### F. Kepadatan Data (Data Density)
* ❌ **Airy Landing Page Slop:** Hindari kartu raksasa setinggi 300px yang hanya memuat 1 angka dengan padding kosong berlebihan (`p-8`, `p-12`).

---

## ✅ 2. Standar Desain Presisi yang Diwajibkan (Google Stitch / Precision Console)

### A. Permukaan Solid & Batas Tegas (Surfaces & Borders)
* Gunakan permukaan solid yang tenang:
  * **Light Mode:** `bg-white` untuk kartu, `bg-slate-50` untuk canvas dasar, dengan border tipis terdefinisi `border border-slate-200/90`.
  * **Dark Mode:** `bg-slate-900` atau `#0f131c` / `#181b25`, dengan border `border-slate-800` atau `#46455430`.
* Bayangan halus berdimensi taktil (*tactile micro-shadows*): Gunakan `shadow-xs` atau `shadow-sm` saja.

### B. Skala Sudut Fungsional (Functional Radius System)
* **Container & Bento Cards:** `rounded-xl`
* **Buttons, Input Fields, & Selectors:** `rounded-lg`
* **Status Badges, Chips, & Tabs:** `rounded-md` atau `rounded-sm`
* **Avatar & Status Dots (Khusus):** Bulat (`rounded-full`) hanya untuk dot indikator live status dan avatar bulat murni.

### C. Tipografi & Kepadatan Data Tinggi
* **Teks Umum & Heading:** `font-sans` (`Inter`, `Plus Jakarta Sans`, atau font sistem).
* **Seluruh Metrik Teknis Wajib Monospace:** Gunakan `font-mono` untuk angka RAM/VRAM, MB/GB, NIM, IP, Port, Cgroup Slice, PID, dan timestamp.
* **Tabel Terstruktur:** Baris tabel padat (*compact*), selaras vertikal, dengan garis pemisah subtil (`divide-y divide-slate-100` atau `divide-slate-800`).

### D. Aksen Warna Fungsional (Bukan Dekorasi)
Gunakan warna aksen hanya untuk merepresentasikan status nyata:
* **Dedicated GPU 0 / Boost / Priority:** Aksen Cyan / Blue (`text-blue-600 bg-blue-50 border-blue-200`).
* **Shared GPU 1 / Level 2 / Online Normal:** Aksen Emerald / Green (`text-emerald-600 bg-emerald-50 border-emerald-200`).
* **Peringatan / Hitung Mundur / Load 80%+:** Aksen Amber (`text-amber-600 bg-amber-50 border-amber-200`).
* **Kritis / Over-Quota / Danger / Kill:** Aksen Rose / Red (`text-rose-600 bg-rose-50 border-rose-200`).

### E. Mikro-Interaksi yang Kalem & Cepat
* Gunakan transisi perubahan warna yang cepat: `transition-colors duration-150 ease-out`.
* Efek hover hanya berupa perubahan warna latar tipis (`hover:bg-slate-50` atau `hover:bg-slate-800/60`) atau border highlight halus (`hover:border-blue-400`). **Tidak ada pergeseran posisi atau perubahan skala.**

---

## 🔒 3. Kontrak Integritas Fitur (Feature Preservation Contract)

⚠️ **ATURAN MUTLAK KETIKA MELAKUKAN PEROMBAKAN UI/UX:**
1. **Dilarang memotong/menghapus logika bisnis:** State React (`useState`, `useEffect`, `useMemo`), WebSocket handlers, dan endpoint fetch API backend (`/api/...`) harus tetap utuh 100%.
2. **Dilarang mengubah struktur data:** Properti objek telemetri, format pengguna, hak akses RBAC (Public, Operator Aslab, Super Admin) wajib dipertahankan.
3. **Dilarang membuat komponen *dummy/mockup*:** Semua tombol aksi (Kill Sesi, Reset Password, Boost Slot, Backup Database, File Explorer) harus tetap memicu handler asli.
