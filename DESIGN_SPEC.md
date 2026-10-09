# 📐 Spesifikasi Desain UI/UX Workstation 2026 (Anti-AI Slop Manifesto)

> **Proyek**: Dashboard Workstation Lab Komputasi AI — Universitas Muhammadiyah Ponorogo  
> **Standar**: *Industrial-Grade Precision Workstation* (Terinspirasi dari standar desain Linear, Vercel, Grafana Enterprise, dan Cloudflare Radar)  
> **Tujuan**: Menghilangkan tampilan "AI Slop" (generik, neon berlebih, tidak ergonomis) dan menggantinya dengan antarmuka alat komputasi presisi tinggi yang clean, dinamis, responsif, dan interaktif.

---

## 📑 Daftar Isi
1. [Manifesto: Mengapa "Anti-AI Slop"?](#1-manifesto-mengapa-anti-ai-slop)
2. [Prinsip Desain Utama](#2-prinsip-desain-utama)
3. [Design Tokens & Color Palette (Obsidian System)](#3-design-tokens--color-palette-obsidian-system)
4. [Tipografi & Tabular Figures (Zero Layout Shift)](#4-tipografi--tabular-figures-zero-layout-shift)
5. [Struktur Layout & Responsive Breakpoints](#5-struktur-layout--responsive-breakpoints)
6. [Komponen Presisi & Ergonomi Interaktif](#6-komponen-presisi--ergonomi-interaktif)
7. [Mikro-Interaksi & Motion Curves](#7-mikro-interaksi--motion-curves)
8. [Do's and Don'ts (Checklist Audit)](#8-dos-and-donts-checklist-audit)

---

## 1. Manifesto: Mengapa "Anti-AI Slop"?

Banyak antarmuka web modern yang dibuat secara otomatis oleh model AI generik memperlihatkan pola visual yang seragam, melelahkan mata (*visual fatigue*), dan tidak ramah bagi sistem pemantauan komputasi (*telemetry*).

### Perbandingan: AI Slop vs. Industrial Precision

| Aspek | Ciri Khas "AI Slop" ❌ | Standar Industrial Workstation (2026) ✅ |
| :--- | :--- | :--- |
| **Warna Latar** | Ungu pekat / Biru gelap neon dengan gradien pelangi mengambang bebas. | **Obsidian Palette** (Zinc-950, Slate-950) bertingkat dengan hierarki elevasi yang terukur. |
| **Pencahayaan** | *Heavy neon glow*, shadow berwarna blur besar (`box-shadow: 0 0 35px #a855f7`). | **Hairline Semantic Borders** (1px border `rgba(255,255,255,0.08)`) dengan *subtle inner ambient tint*. |
| **Bentuk Kartu** | Border radius raksasa (`rounded-3xl` / pill shape) memakan ruang layar. | Radius terkalibrasi (`rounded-lg` 8px hingga `rounded-xl` 12px), memaksimalkan *screen real-estate*. |
| **Kepadatan Data** | *Padded heavily*, jarak kosong berlebihan, hanya mampu menampilkan 2–3 metrik per layar. | **High Information Density**: data tersusun rapi, compact rows, rasio data-ke-tinta (*data-to-ink ratio*) tinggi. |
| **Angka Real-Time** | Menggunakan font display biasa; angka bergoyang (*jitter/layout-shift*) saat nilai berganti. | **Tabular Numeric Figures (`font-mono` / `tnum`)**: lebar digit statis, grafik dan tabel stabil tanpa getaran. |
| **Navigasi** | Mengandalkan klik tombol bertingkat dan dropdown tersembunyi. | **Keyboard-first Ergonomics**: Command Palette (`Ctrl + K`), shortcut cepat, drawer slide-over tanpa reload. |

---

## 2. Prinsip Desain Utama

1. **Form Follows Function (Fungsi Mendahului Ornamen)**  
   Setiap garis, warna, dan status dot harus menyampaikan informasi operasional yang berguna (misal: suhu kritis, utilisasi VRAM, memori idle), bukan hiasan dekoratif semata.
2. **High Data Density without Clutter (Padat Tanpa Berantakan)**  
   Operator lab perlu melihat 11 akun mahasiswa dan 2 GPU sekaligus dalam 1 pandangan layar tanpa harus scrolling berkali-kali. Gunakan table padat (*dense view*) dan visualisasi modular.
3. **Subtle Tactile Feedback (Umpan Balik Taktil yang Halus)**  
   Interaksi tombol, hover baris, dan drawer harus memberikan respon mikro-fisik (durasi 150ms–200ms) tanpa animasi berlebihan yang memperlambat alur kerja.
4. **Predictable Layout Structure (Struktur Terprediksi)**  
   Letak metrik statis, pembagian kolom jelas, dan konsisten di berbagai ukuran layar.

---

## 3. Design Tokens & Color Palette (Obsidian System)

Gunakan palet netral berbasis **Zinc / Neutral** dengan aksen semantik yang sangat terkalibrasi. Hindari warna primer RGB murni.

### A. Layering Permukaan (Elevation System)
```css
:root {
  /* Surface Layers */
  --bg-app:        #09090b; /* Zinc 950 - Background utama canvas */
  --bg-surface:    #121215; /* Base Card Background */
  --bg-elevated:   #18181b; /* Zinc 900 - Floating / Header / Modal */
  --bg-subtle:     #27272a; /* Zinc 800 - Active state / hover row */
  
  /* Hairline Borders */
  --border-subtle: rgba(255, 255, 255, 0.07);
  --border-strong: rgba(255, 255, 255, 0.14);
  --border-focus:  rgba(255, 255, 255, 0.28);
}
```

### B. Semantic Accents (Hanya Digunakan Sesuai Nilai Data)
| Token | Hex / HSL | Penggunaan Semantik |
| :--- | :--- | :--- |
| `--accent-emerald` | `#10b981` (Emerald 500) | Beban Optimal / Online / Status Normal / Koneksi Stabil |
| `--accent-amber` | `#f59e0b` (Amber 500) | Peringatan Utilisasi Tinggi (>75%) / Suhu Memanas / Pending |
| `--accent-rose` | `#f43f5e` (Rose 500) | Batas Kritis (>90%) / Kill Action / Error / OOM Risk |
| `--accent-sky` | `#0ea5e9` (Sky 500) | Alokasi Beban Praktikum Mahasiswa (`training1`-`training10`) |
| `--accent-indigo` | `#6366f1` (Indigo 500) | Alokasi Beban Riset Dosen / TA (`labriset`) |

---

## 4. Tipografi & Tabular Figures (Zero Layout Shift)

Typography adalah fondasi dashboard instrumen industri:

### A. Font Pairing
1. **Primary Interface Font**: `Inter` atau `Geist Sans`
   - *Weights*: `400` (Regular teks), `500` (Label/Tombol), `600` (Header seksi/Title).
   - *Letter-spacing*: `-0.015em` untuk judul, `0` untuk body text.
2. **Numeric & Telemetry Font**: `JetBrains Mono` atau `Geist Mono`
   - Digunakan untuk: Persentase (%), Suhu (°C), Memory (MB/GB), PID, Port, IP, dan Clock Speed.

### B. Aturan Anti-Jitter (Tabular Numbers)
Ketika data diperbarui via WebSocket setiap 1 detik, angka harus menggunakan:
```css
.tabular-nums {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
```
*Dengan aturan ini, lebar angka `1` sama persis dengan angka `8`, mencegah kolom tabel atau progress value bergeser bolak-balik saat streaming berlangsung.*

---

## 5. Struktur Layout & Responsive Breakpoints

Desain antarmuka harus menggunakan CSS Grid berbasis fluid container dengan breakpoint standar:

```
[ Desktop: 1280px+ ]
┌─────────────────────────────────────────────────────────────┐
│ Navbar: Logo + Status Dot + Search (Ctrl+K) + Lock Mode     │
├─────────────────────────────────────────────────────────────┤
│ Tab Navigation: [Overview] [Charts] [Users] [Process] [...] │
├─────────────────────────────────────────────────────────────┤
│ KPI Quick Summary Cards (3 - 4 kolom)                       │
├──────────────────────────────┬──────────────────────────────┤
│ GPU 0: Lab Riset (Grid 1/2)  │ GPU 1: Training Lab (Grid 2/2│
├──────────────────────────────┴──────────────────────────────┤
│ Live Telemetry Charts (Dual Area Series)                    │
└─────────────────────────────────────────────────────────────┘
```

### Breakpoint Matrix
- **Mobile (< 640px)**: 1 kolom penuh. Card GPU ditumpuk vertikal. Tabel beralih ke *compact card view*.
- **Tablet (640px - 1024px)**: Grid 2 kolom fleksibel. Sembunyikan kolom metadata non-kritis pada tabel proses.
- **Desktop (1024px - 1440px)**: Grid seimbang, multi-GPU berdampingan.
- **Ultrawide (> 1440px)**: Maksimalkan *content container* (`max-w-7xl` atau `max-w-[1600px]`), bukan stretch tanpa batas.

---

## 6. Komponen Presisi & Ergonomi Interaktif

### A. VRAM Block Allocation Grid (Pengganti Progress Bar Tradisional)
- Jangan hanya menampilkan progress bar 1 garis datar!
- Bagilah total memori GPU (misal: 24 blok @ 1GB untuk GPU 24GB).
- Setiap blok diberi warna sesuai pemilik proses (`indigo` untuk riset, `sky` untuk training praktikan, `zinc` untuk kosong).
- Hover pada blok menampilkan tooltip: PID, Username, dan VRAM persis yang dialokasikan.

### B. Micro Sparklines (Miniatur Tren 60 Detik)
- Tempatkan sparkline SVG sederhana di sebelah angka metrik utama (GPU Load & Temperature).
- Menghilangkan kebutuhan untuk selalu beralih ke tab grafik penuh jika pengguna hanya ingin melihat tren sesaat.

### C. Process Inspector Drawer (Slide-Over Panel)
- Alih-alih membuka popup modal besar yang memblokir pandangan, klik baris proses di tabel akan memunculkan panel laci dari kanan.
- Fitur di dalam drawer:
  - Nilai PID & PPID lengkap.
  - Full Command Line execution string dengan tombol **1-Click Copy**.
  - Deteksi **Idle VRAM Hazard** (proses memakai memori GPU tetapi utilisasi compute 0% selama >10 menit).
  - Tombol **Terminate Process** dengan otentikasi Admin PIN.

### D. Global Command Palette (`Ctrl + K` / `Cmd + K`)
- Modal pencarian cepat dengan *keyboard navigation* (`↑` `↓` `Enter` `Esc`).
- Aksi instan:
  - Lompat ke Tab (Overview, Charts, Users, Processes, Audit).
  - Cari proses berdasarkan nama script atau PID.
  - Buka modal otentikasi admin.

---

## 7. Mikro-Interaksi & Motion Curves

Hindari transisi lambat yang terasa berat. Transisi harus tajam dan instan:

### Standar Transisi CSS
```css
/* Snappy Easings */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--duration-fast: 150ms;
--duration-normal: 200ms;

/* Utility Hover */
.interactive-row {
  transition: background-color var(--duration-fast) var(--ease-out-expo),
              border-color var(--duration-fast) var(--ease-out-expo);
}
```

### Animasi Status Dot (Breathing Pulse)
Gunakan efek denyut yang sangat lembut (*subtle opacity pulse*), bukan bayangan neon yang berkedip kasar:
```css
@keyframes subtle-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.92); }
}

.pulse-dot {
  animation: subtle-pulse 2.5s infinite ease-in-out;
}
```

---

## 8. Do's and Don'ts (Checklist Audit)

Sebelum merilis perubahan antarmuka, pastikan kode mematuhi panduan berikut:

### ❌ DILARANG (Anti-Pattern / AI Slop):
- 🚫 **Menaruh gradient neon ungu-biru di background body**.
- 🚫 **Menggunakan border radius ekstrem (`rounded-3xl` / `rounded-full`) untuk container data teknis**.
- 🚫 **Menggunakan font sans-serif untuk angka yang nilainya terus berubah-ubah per detik**.
- 🚫 **Menampilkan modal konfirmasi dengan animasi bouncing kartun**.
- 🚫 **Membuat teks deskripsi panjang yang tidak ada nilainya bagi teknisi lab**.
- 🚫 **Menggunakan warna merah untuk hal yang bukan kegagalan sistem atau bahaya kritis**.

### ✅ WAJIB DILAKUKAN (Industry Standard):
- ✔️ **Gunakan hairline border 1px dengan opasitas transparan (`rgba(255,255,255,0.08)`)**.
- ✔️ **Gunakan font monospaced tabular untuk seluruh metrik numerik**.
- ✔️ **Sediakan shortcut keyboard (`Ctrl+K` & `Esc`) untuk setiap modal dan navigasi**.
- ✔️ **Berikan tombol salin (copy) cepat untuk PID, Username, dan Command Line**.
- ✔️ **Pastikan kontras teks memenuhi standar WCAG AA/AAA (kontras minimal 4.5:1 terhadap background)**.
- ✔️ **Berikan label status yang jelas (badge teks ringkas) selain mengandalkan warna semata**.
