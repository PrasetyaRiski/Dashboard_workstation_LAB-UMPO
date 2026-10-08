# Google Stitch UI/UX Design System Specification
## AI Computing & Telemetry Console — Lab AI Informatika UMPO
> **Dokumen Spesifikasi Desain & Master Prompt untuk Google Stitch / AI Frontend Engine**  
> *Versi: 2.0 | Tema: Google Stitch "Precision Cloud Console" (Deep Dark & Neon Accents)*  
> *Target Output: React 18+ / Tailwind CSS / Lucide React / Vite*

---

## 1. Visi & Prinsip Desain (Design Philosophy)

Tujuan perombakan ini adalah mentransformasi tampilan dashboard menjadi **Enterprise Cloud Console (sekelas Google Cloud Console / Vercel Dashboard)** dengan gaya estetika **Google Stitch**. Tampilan harus futuristik, presisi tinggi, bersih, dan memancarkan atmosfer *High-Performance Computing*, namun **wajib mempertahankan 100% seluruh fitur, state, logika autentikasi, dan endpoint API yang sudah berjalan.**

### 💎 Prinsip Desain Google Stitch
1. **Deep Void & Glassmorphism Surfaces:** Latar belakang gelap pekat berlapis (`#0f131c` hingga `#1c1f29`) dengan aksen border semi-transparan yang sangat tipis (`#46455430`). Tidak ada warna abu-abu kusam atau putih menyilaukan.
2. **Neon Functional Telemetry:** Warna neon (Cyan `#4cd7f6`, Emerald `#4edea3`, Periwinkle `#c0c1ff`, Amber `#fbbf24`, Rose `#ffb4ab`) digunakan secara fungsional untuk menunjukkan status hardware, QoS, dan kuota.
3. **Bento Grid Hierarchy:** Informasi disajikan dalam modular bento box yang proporsional, rapi, dan adaptif terhadap berbagai ukuran layar monitor lab.
4. **Data Density with Breathing Room:** Menampilkan banyak metrik teknis (NIM, IP, Cgroup Slice, VRAM, Disk, PID) secara padat menggunakan tipografi monospace tanpa terasa sesak.

---

## 2. Design Tokens & Palette Guide

### 🎨 Color Palette (Hex Tokens)

| Token Name | Hex Code | Penggunaan di Antarmuka |
|---|---|---|
| `bg-void` | `#0f131c` | Latar belakang canvas utama |
| `surface-1` | `#141822` | Background Sidebar & Modal Backdrops |
| `surface-2` | `#181b25` | Background Bento Card & Container Tabel |
| `surface-3` | `#1c1f29` | Background Baris Hover, Filter Aktif, Input Field |
| `border-subtle` | `#46455420` | Garis pemisah baris tabel |
| `border-base` | `#46455430` | Border standar bento card & panel |
| `border-active` | `#c0c1ff50` | Border saat input difokuskan atau card disorot |
| `text-primary` | `#dfe2ef` | Teks judul, angka metrik utama, label aktif |
| `text-muted` | `#908fa0` | Teks deskripsi, label sekunder, unit ukuran |
| `neon-cyan` | `#4cd7f6` | **GPU 0 Dedicated, Level 1 Priority, Boost Mode** |
| `neon-indigo` | `#c0c1ff` | **Dosen / Akun Training, System Telemetry, Primary CTA** |
| `neon-emerald` | `#4edea3` | **Status Online, Layanan Normal, Cgroup Level 2** |
| `neon-amber` | `#fbbf24` | **Timer Sisa Waktu, Warning Beban >80%, Countdown** |
| `neon-rose` | `#ffb4ab` | **Over Quota, Akun Diblokir, Tombol Kill Sesi/Danger** |

### 🔤 Typography & Font Stacks
* **Sans Font:** `Plus Jakarta Sans`, `Inter`, atau `system-ui` untuk teks antarmuka, heading, dan navigasi.
* **Mono Font:** `JetBrains Mono`, `Fira Code`, atau `ui-monospace` untuk seluruh nilai metrik (RAM, VRAM, MB/GB, NIM, IP, PID, Slice Name).

---

## 3. Kontrak Preservasi Fitur (Feature Preservation Contract)

⚠️ **ATURAN MUTLAK:** Perombakan desain visual **TIDAK BOLEH** menghapus, menyederhanakan, atau merusak fungsi-fungsi backend berikut:

1. **Autentikasi & RBAC (3 Level):**
   - Public Monitoring View (`!isAdmin`): Mode tanpa login, tabel bersifat *Read-Only*, tombol destruktif disembunyikan.
   - Operator Aslab (`adminRole === 'aslab'`): Bisa memantau server, membaca Audit Log, dan mengeksekusi **Kill Sesi / Terminate Job**.
   - Super Admin (`adminRole === 'admin'`): Akses penuh termasuk Boost QoS, Revert, Ubah Role (Mhs/Aslab/Admin), Blokir Akun, Reset Password Linux, dan Simulasi PyTorch.
2. **Admission Control GPU 0:**
   - Menampilkan slot kapasitas GPU 0 (`[🔴 Slot Prioritas: {used}/{total} Terpakai]`).
   - Tombol Boost otomatis `disabled` jika slot penuh.
3. **Live Countdown Timer:**
   - Komponen timer reaktif (`<LiveCountdown expiresAt={...} />`) yang berdetik setiap detik menghitung sisa durasi boost.
4. **Monitoring Storage (Soft Quota):**
   - Kolom "Storage (Disk)" menampilkan progres pemakaian, kapasitas kuota (10GB / 50GB).
   - Badge peringatan `⚠️ Over Quota` jika melampaui kuota.
   - Tombol tab filter `⚠️ Over Quota (X)` di atas tabel.
5. **Single-Device Session Indicator:**
   - Menampilkan status Online (hijau berdenyut) beserta IP perangkat aktif (`item.active_ip`).
6. **Streaming Telemetri WebSocket:**
   - Indikator koneksi *Live / Offline*, auto-reconnect, dan riwayat grafik beban GPU/CPU real-time.
7. **Backup Database Trigger:**
   - Aksi snapshot backup instan database SQLite WAL-safe.

---

## 4. Arsitektur Komponen & Layout Hierarchy

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR (Persistent): Logo | Status WS Live | Mode RBAC Badge | Jam Server | Login / Logout       │
├──────────────────┬───────────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR (Nav)    │ MAIN CONTENT AREA (Scrollable)                                                │
│ ├── Ringkasan    │ ┌───────────────────────────────────────────────────────────────────────────┐ │
│ ├── Manajemen Job│ │ PAGE HEADER: Judul Halaman & Breadcrumb Status                            │ │
│ ├── User         │ ├───────────────────────────────────────────────────────────────────────────┤ │
│ ├── Infrastruktur│ │ BENTO METRICS BAR: 3–4 Kartu Statistik Ringkas                            │ │
│ ├── Audit Log    │ ├───────────────────────────────────────────────────────────────────────────┤ │
│ └── [Collapse]   │ │ SEARCH & SEGMENTED FILTER CONTROLS                                        │ │
│                  │ ├───────────────────────────────────────────────────────────────────────────┤ │
│                  │ │ UNIFIED DATA TABLE / GPU CARDS (Glassmorphic Container)                   │ │
│                  │ └───────────────────────────────────────────────────────────────────────────┘ │
└──────────────────┴───────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Rincian Desain per Halaman (Page Specifications)

### 📌 1. Shell & Header Global

#### Komponen Topbar (`App.jsx`)
* **Kiri:** Toggle Sidebar Icon, Logo Fakultas/Prodi, Judul Konsol `"Lab Komputasi AI UMPO"`.
* **Tengah:** Indikator WebSocket Ping (`🟢 WebSocket Live` / `🔴 Reconnecting...`).
* **Kanan:**
  * Mode Akses Pill Badge:
    * Public: `[🌐 Public Monitoring]`
    * Aslab: `[🛡️ Operator Mode: {nama}]`
    * Admin: `[⚡ Super Admin Mode]`
  * Jam Digital Server (WIB) dengan format monospace.
  * Tombol Aksi: `"Login Admin"` (membuka PIN Modal) ATAU `"Logout"` (dengan icon door exit).

#### Komponen Sidebar (`Sidebar.jsx`)
* Lebar: `w-64` (dapat di-collapse menjadi `w-20` icon-only).
* Navigasi Tabs:
  1. **Ringkasan** (`overview`): Icon `LayoutDashboard`
  2. **Manajemen Job** (`jobs`): Icon `Cpu` + Badge jumlah proses aktif
  3. **User** (`students`): Icon `Users`
  4. **Infrastruktur** (`system`): Icon `Server`
  5. **Audit Log** (`audit`): Icon `FileText` + Badge jumlah log (khusus Admin/Aslab)

---

### 📌 2. Halaman: Ringkasan (`overview`)

Tampilan visual utama untuk memantau performa perangkat keras komputasi:

1. **Bento Row 1: System Overview Bar (`SystemOverview.jsx`)**
   * Kartu metrik CPU Host (Core count, load persentase, gauge bar).
   * Kartu RAM Host (Terpakai / Total misal `45 GB / 128 GB`).
   * Kartu Total Pengguna Aktif & GPU Utilization agregat.
2. **Bento Row 2: Live Performance Sparkline (`LiveChart.jsx`)**
   * Grafik visual real-time (beban 60 detik terakhir) dengan gradien neon transparan.
3. **Bento Row 3: Dual GPU Cards (`GpuCard.jsx`)**
   * **GPU 0 Card (Dedicated Priority):**
     * Header: Aksen border neon cyan `#4cd7f6`.
     * Badge: `Level 1 (Priority / Skripsi)`.
     * Metrik: Suhu (°C), Fan Speed (%), Power Draw (Watt / TDP), VRAM Usage Bar (MB / GB).
     * Daftar proses AI yang sedang running di GPU 0.
   * **GPU 1 Card (Shared Pool):**
     * Header: Aksen border neon periwinkle `#c0c1ff`.
     * Badge: `Level 2 (Standard / Praktikum)`.
     * Metrik identik + indikator Multi-Tenant Sharing.

---

### 📌 3. Halaman: Manajemen Job (`jobs` - `ProcessManager.jsx`)

Pusat kendali proses dan simulasi komputasi:

1. **Bento Header Bar:**
   * Total Running Compute Processes.
   * Total GPU VRAM teralokasi oleh proses.
   * Tombol Aksi Admin:
     * `"Uji Beban (Run Simulation)"` (Menjalankan simulasi PyTorch 11 akun).
     * `"Hentikan Simulasi"` (Membersihkan proses simulasi).
2. **Tabel Proses Komputasi:**
   * Kolom: `PID`, `Pengguna / Akun`, `Nama Perintah / Script`, `Alokasi GPU (0/1)`, `VRAM Terpakai`, `RAM Host`, `Durasi Jalan`, `Aksi`.
   * Baris memiliki efek hover subtle (`hover:bg-[#1c1f29]`).
   * Tombol Aksi: Icon sampah / stop (`Kill Process`) membuka `KillConfirmModal` dengan konfirmasi PID & username.

---

### 📌 4. Halaman: Manajemen User Terpadu (`students` - `UnifiedUserManagement.jsx`)

Halaman paling krusial yang menggabungkan mahasiswa SIMTIK dan akun sistem (`training1-10`, `labriset`):

#### A. Bento Metric Summary Cards (Atas Tabel)
* **Card 1: Slot GPU 0 Prioritas**
  * Nilai: `{used_slots} / {total_slots} Slot Terpakai`
  * Progress Bar: Cyan jika tersedia, Merah jika penuh 100%.
* **Card 2: Total Akun Terdaftar**
  * Menampilkan jumlah mahasiswa SIMTIK + 11 akun sistem.
* **Card 3: Akun Riset & Prioritas Aktif**
  * Menghitung akun yang sedang menikmati hak Level 1.
* **Card 4: Peringatan Storage (Over Quota)**
  * Menampilkan jumlah akun yang melewati kuota (Merah menyala jika > 0).

#### B. Filter Bar & Pencarian
* **Segmented Pill Controls:**
  * `[Semua Akun]`
  * `[Mahasiswa SIMTIK]`
  * `[Dosen & Riset]`
  * `[⚠️ Over Quota (X)]` (Tombol merah berpendar saat ada akun over-quota).
* **Input Search Bar:** Monospace placeholder `"Cari berdasarkan NIM, Nama, atau Akun..."` dengan icon pencarian.

#### C. Struktur Tabel Modern (8 Kolom Presisi)
1. **Akun & Pengguna:**
   * Avatar sirkular dengan inisial nama.
   * Nama lengkap mahasiswa atau nama akun sistem.
   * Email kampus (`mhs.{nim}@umpo.ac.id`) atau deskripsi akun.
2. **Identitas & Status:**
   * NIM dalam font monospace cyan `#4cd7f6`.
   * Status Badge:
     * `🟢 Online` (pulse animation) + Alamat IP Perangkat Aktif (`item.active_ip`).
     * `⚪ Offline` (abu-abu netral).
     * `🔴 Blocked` (merah).
3. **Role / Hak Akses:**
   * Jika Super Admin: Dropdown selector sleek (`Mahasiswa` | `Aslab` | `Admin`).
   * Jika Non-Admin: Pill badge statis.
4. **QoS & Cgroup Slice:**
   * Level 1: Badge Cyan `Level 1 (Priority)` + text `compute-level1.slice`.
   * Level 2: Badge Slate `Level 2 (Standard)` + text `compute-level2.slice`.
5. **Alokasi Hardware & Countdown:**
   * Level 1: `GPU 0 (Dedicated) | 20 Cores | 70GB RAM`.
     * Teks hitung mundur: `Sisa: <LiveCountdown />` (Warna Amber).
   * Level 2: `GPU 1 (Shared Pool) | 2 Cores | 3GB RAM`.
6. **Penggunaan RAM:**
   * Progress bar mini pemakaian memori pengguna saat ini.
7. **Storage (Disk) [FITUR BARU]:**
   * Text: `{used_mb} MB / {quota_gb} GB`
   * Progress Bar: Hijau/Cyan (<80%), Amber (>80%), Merah (>100%).
   * Badge: `⚠️ Over Quota` jika melampaui batas.
8. **Aksi Manajemen (Kanan Rata):**
   * Jika Public: Label `// READ_ONLY`.
   * Jika Aslab: Tombol `[Kill Sesi]` (jika user online).
   * Jika Super Admin:
     * Tombol `[⚡ Boost]` (jika Level 2) atau `[↺ Revert]` (jika Level 1).
     * Tombol `[Kill Sesi]` (jika online).
     * Tombol `[Reset Pass]` (khusus akun lokal sistem).
     * Tombol `[Blokir / Aktifkan]` (UserCheck / UserX).
     * Tombol `[Hapus User]` (Trash2).

---

### 📌 5. Halaman: Infrastruktur & Audit Log (`system` & `audit`)

#### Halaman Infrastruktur (`system`)
* Bento Box 1: **Alokasi Payung Cgroups v2 (RAM)**
  * Rincian slice `user.slice` (100 GB), `user-1021.slice` (70 GB), dan kuota per akun training (3 GB).
* Bento Box 2: **Konfigurasi CUDA & Driver Server**
  * Versi Driver NVIDIA (595.xx), CUDA Runtime (13.x), PyTorch environment, dan status GPU Architecture.
* Bento Box 3: **Status Database & Auto-Backup**
  * Lokasi DB SQLite WAL (`/home/public/web/data/lab_users.db`).
  * Tombol Aksi: `"Backup Database Sekarang"` (Memicu endpoint `POST /api/admin/backup`).
  * Riwayat 5 snapshot file backup terakhir beserta ukurannya.

#### Halaman Audit Log (`audit` - `AuditLogView.jsx`)
* Tabel riwayat aktivitas lab (Admin yang mengeksekusi, aksi BOOST/KILL/ROLE, target NIM, detail alasan, waktu UTC).
* Pill status log type (`info`, `warning`, `danger`).

---

## 6. Spesifikasi Desain Dialog / Modals

Semua modal wajib menggunakan:
* **Overlay:** `fixed inset-0 z-50 bg-[#0f131c]/80 backdrop-blur-md flex items-center justify-center p-4`.
* **Modal Card:** `bg-[#181b25] border border-[#46455440] rounded-2xl shadow-2xl p-6 w-full max-w-md`.

### 1. Modal Login Admin PIN (`AdminPinModal.jsx`)
* Card glassmorphic di tengah layar.
* Header: Icon Shield Indigo + Judul `"Autentikasi Konsol Lab"`.
* Input: Password / PIN input besar dengan placeholder `••••••••` (monospace, centered font).
* Tombol: `"Verifikasi Akses"` full-width neon indigo.

### 2. Modal Boost GPU Prioritas (`BoostModal`)
* Menampilkan nama dan NIM mahasiswa yang akan di-boost.
* Pilihan Durasi (Segmented Grid): `[1 Jam]`, `[2 Jam]`, `[4 Jam]`, `[8 Jam]`, `[12 Jam]`, `[24 Jam]`.
* Input Alasan / Keterangan (misal: "Pelatihan Skripsi Model ResNet").
* Tombol: `"Konfirmasi Boost ke GPU 0"` (Neon Cyan).

### 3. Modal Konfirmasi Kill Sesi (`KillConfirmModal.jsx`)
* Aksen warna: Rose / Danger `#ffb4ab`.
* Header: Icon AlertTriangle.
* Pesan konfirmasi: `"Hentikan proses PID {pid} milik {username}?"`.
* Tombol: `"Batalkan"` (Abu-abu) vs `"Ya, Hentikan Proses"` (Merah).

---

## 7. Master Prompt untuk Google Stitch / AI Code Engine

Gunakan prompt di bawah ini saat memberikan instruksi kepada Google Stitch atau asisten koding AI untuk merombak tampilan:

```markdown
You are refactoring the Frontend React UI for the "AI Lab Workstation Management System" at Universitas Muhammadiyah Ponorogo.

REDESIGN OBJECTIVE:
Completely redesign the UI into a modern, enterprise-grade "Google Stitch Precision Console" aesthetic.
Use deep void backgrounds (#0f131c), sleek bento cards (#181b25 with border #46455430), and purposeful neon accents (#4cd7f6 for Priority GPU 0, #c0c1ff for system, #4edea3 for online status, #fbbf24 for timers, #ffb4ab for over-quota/danger).

STRICT PRESERVATION REQUIREMENTS (DO NOT BREAK OR REMOVE ANY LOGIC):
1. Preserve all useState, useEffect, WebSocket listeners, and fetch API handlers.
2. Maintain RBAC modes: Public View (!isAdmin), Operator Aslab (adminRole === 'aslab'), and Super Admin (adminRole === 'admin').
3. Keep the GPU 0 Admission capacity counter and progress bar ([Slot Prioritas: {used}/{total}]).
4. Preserve the <LiveCountdown /> real-time ticking timer for priority expiration.
5. In the User Management table:
   - Retain all 8 columns: Akun, Identitas (NIM + active IP), Role selector, QoS Cgroup Slice, Hardware Allocation, RAM usage, Storage Disk Quota, and Action buttons.
   - Retain the Storage (Disk) visual progress bar and "⚠️ Over Quota" badge.
   - Retain the "⚠️ Over Quota (X)" quick filter button above the table.
6. Preserve all modals: Admin PIN Login, Boost QoS, Kill Process Confirmation, and Reset Linux Password.
7. Maintain support for simulation run/stop controls.

DESIGN SPECIFICATION:
- Layout: Fixed left collapsible Sidebar (w-64) + Topbar (WS status, RBAC mode pill, digital clock, Login/Logout) + Main scrollable Bento view.
- Typography: Clean sans-serif for UI, JetBrains Mono / font-mono for all metrics (RAM, VRAM, MB/GB, PID, NIM, IP, Cgroup Slice).
- Animations: Smooth transitions (transition-all duration-200), pulse rings on active sessions, subtle glow on borders.
```

---

## 8. Checklist Verifikasi Desain

Sebelum mempublikasikan hasil rombakan desain:
- [ ] Apakah warna latar belakang seragam `#0f131c` tanpa ada blok putih/abu-abu kusam?
- [ ] Apakah semua tombol aksi destruktif (Kill Sesi, Blokir, Hapus) tersembunyi saat user belum login (`!isAdmin`)?
- [ ] Apakah baris mahasiswa yang over-quota menampilkan indikator merah dan badge `⚠️ Over Quota`?
- [ ] Apakah live countdown timer tetap berdetik setiap detik saat ada akun yang di-boost?
- [ ] Apakah grafik beban GPU WebSocket tetap melakukan *streaming* data tanpa lag?
- [ ] Apakah build `npm run build` berhasil 100% tanpa error sintaks JSX?
