# Buku Panduan Resmi Sistem Web Dashboard & JupyterHub
## Laboratorium Artificial Intelligence & Riset Komputasi
**Program Studi Informatika — Fakultas Teknik — Universitas Muhammadiyah Ponorogo (UMPO)**

---

* **Judul Dokumen:** Buku Panduan Penggunaan & Operasional Layanan Komputasi Berbasis Web
* **Edisi:** Versi 2.2 (Web & JupyterHub Focus) — Oktober 2026
* **Sasaran Pembaca:** Mahasiswa Praktikan, Peneliti / Mahasiswa Tugas Akhir, Asisten Laboratorium, dan Dosen Pembimbing
* **Akses Layanan:** 
  * Portal JupyterHub: `http://76.76.76.188:8090` (atau tautan domain resmi kampus)
  * Web Dashboard Monitoring & Console: `http://76.76.76.188:8888`

---

## Daftar Isi

1. [Bab 1: Pengenalan & Arsitektur Layanan Komputasi](#bab-1-pengenalan--arsitektur-layanan-komputasi)
   * 1.1 Visi & Tujuan Laboratorium AI UMPO
   * 1.2 Ekosistem Terintegrasi: Web Dashboard & JupyterHub
   * 1.3 Alokasi Komputasi Dual GPU (Standard vs Prioritas Skripsi)
   * 1.4 Integrasi SSO SIMTIK (*Zero-Admin Onboarding*)
2. [Bab 2: Panduan Pengguna JupyterHub (Mahasiswa & Peneliti)](#bab-2-panduan-pengguna-jupyterhub-mahasiswa--peneliti)
   * 2.1 Prosedur Masuk (*Login*) Menggunakan Akun SIMTIK
   * 2.2 Mengenal Antarmuka Kerja JupyterLab
   * 2.3 Memulai Notebook Python & Memanfaatkan Akselerasi GPU (PyTorch)
   * 2.4 Mengakses Dataset Bersama (*Shared Datasets*)
   * 2.5 Menginstal Pustaka (*Package*) Python Tambahan Melalui Notebook
   * 2.6 Penyimpanan Bobot Model (*Weights*) & Kuota Disk
   * 2.7 Mengatasi Kendala Notebook (*Kernel Died*, *Out of Memory*, *Idle Timeout*)
   * 2.8 Kebijakan Sesi Tunggal (*Single-Device Lock*) & Prosedur Logout
3. [Bab 3: Panduan Web Dashboard (Mode Monitoring Publik)](#bab-3-panduan-web-dashboard-mode-monitoring-publik)
   * 3.1 Tata Letak & Navigasi Antarmuka Web Dashboard
   * 3.2 Membaca Telemetri Komputasi Real-Time (GPU, VRAM, RAM, CPU, Disk)
   * 3.3 Indikator Status Koneksi & Sinkronisasi Waktu Server
   * 3.4 Memantau Aktivitas Sesi & Slot Prioritas yang Tersedia
4. [Bab 4: Panduan Administrator & Asisten Lab (Web Console)](#bab-4-panduan-administrator--asisten-lab-web-console)
   * 4.1 Membuka Mode Akses Administrator (Login PIN Master)
   * 4.2 Manajemen Pengguna & Alokasi Dynamic QoS
     * 4.2.1 Filter & Pencarian Pengguna
     * 4.2.2 Memberikan Akses GPU Boost (Prioritas Level 1)
     * 4.2.3 Mengembalikan Pengguna ke Mode Standard (*Unboost*)
     * 4.2.4 Membersihkan Cache Disk Mahasiswa (Ikon Penghapus)
     * 4.2.5 Menghentikan Sesi Bermasalah (Ikon Stop: *Kill Sesi OS Aktif*)
   * 4.3 Web File Explorer Terpadu
     * 4.3.1 Menjelajahi Folder Mahasiswa & Direktori Bersama
     * 4.3.2 Mengunggah (*Upload*) Berkas & Dataset via Web
     * 4.3.3 Mengunduh (*Download*) Berkas Pekerjaan Mahasiswa
     * 4.3.4 Membuat Folder, Mengubah Nama, dan Menghapus Berkas
     * 4.3.5 Fitur Salin ke Direktori Bersama (*Copy to Shared*)
     * 4.3.6 Manajemen Papan Klip (*Clipboard*: Copy / Cut / Paste)
   * 4.4 Pemantauan Log Audit Administratif
   * 4.5 Pencadangan Database Sekali Klik (*Snapshot Database*)
5. [Bab 5: Kebijakan Operasional, Etika Komputasi, & Bantuan](#bab-5-kebijakan-operasional-etika-komputasi--bantuan)
   * 5.1 Etika & Tata Tertib Komputasi Bersama
   * 5.2 Standar Pelaporan Kendala
   * 5.3 Kontak Resmi & Informasi Dukungan

---

# Bab 1: Pengenalan & Arsitektur Layanan Komputasi

### 1.1 Visi & Tujuan Laboratorium AI UMPO
Laboratorium Artificial Intelligence & Riset Komputasi Fakultas Teknik Universitas Muhammadiyah Ponorogo menyediakan infrastruktur komputasi berkinerja tinggi (*High-Performance Computing*) untuk mendukung kegiatan praktikum kecerdasan buatan, pembelajaran mesin (*Machine Learning*), *Deep Learning*, pengolahan citra digital, *Natural Language Processing*, serta riset tugas akhir mahasiswa.

Seluruh operasional komputasi dirancang agar dapat diakses sepenuhnya melalui peramban web (*web browser*), sehingga pengguna tidak perlu melakukan konfigurasi driver yang rumit atau menggunakan antarmuka baris perintah (*terminal SSH*) pada perangkat lokal mereka.

---

### 1.2 Ekosistem Terintegrasi: Web Dashboard & JupyterHub
Sistem komputasi laboratorium AI UMPO terdiri atas dua portal web utama yang saling terhubung:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PENGGUNA (WEB BROWSER)                         │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
     PORTAL JUPYTERHUB (:8090)             WEB DASHBOARD CONSOLE (:8888)
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│ • Lingkungan Notebook Interaktif      │ │ • Telemetri GPU, CPU, RAM     │
│ • Login SSO Akun SIMTIK Mahasiswa     │ │ • Manajemen Kuota & Pengguna  │
│ • Akselerasi PyTorch CUDA             │ │ • Pemberian Slot GPU Boost    │
│ • Akses Direktori /home/m<NIM>        │ │ • Web File Explorer & Unduhan │
│ • Akses Dataset Bersama               │ │ • Audit Trail & Backup Web    │
└───────────────────────────────────────┘ └───────────────────────────────┘
                    ▲                                 ▲
                    │                                 │
┌───────────────────┴─────────────────────────────────┴───────────────────┐
│                  KERNEL SERVER & DUAL GPU ACCELERATOR                   │
│         [GPU 0: Dedicated Riset]   │   [GPU 1: Pool Praktikum]          │
└─────────────────────────────────────────────────────────────────────────┘
```

1. **JupyterHub Portal (Port 8090):** Portal kerja utama bagi mahasiswa dan peneliti untuk menulis kode Python, memuat model AI, melatih dataset, dan menjalankan eksperimen ilmiah dalam bentuk antarmuka JupyterLab.
2. **Web Dashboard Console (Port 8888):** Panel kontrol dan pemantauan grafis modern (*Precision Console*) untuk memantau beban fisik kartu grafis secara langsung, mengelola kuota pengguna, memberikan izin prioritas GPU, serta mengelola berkas secara visual.

---

### 1.3 Alokasi Komputasi Dual GPU (Standard vs Prioritas Skripsi)
Server laboratorium dilengkapi dengan akselerator kartu grafis ganda (*Dual NVIDIA RTX 5060 Ti*) yang dibagi menjadi dua tingkat (*tier*) layanan secara cerdas:

| Parameter Karakteristik | Mode Standard (Praktikum Reguler) | Mode Prioritas (Skripsi & Riset) |
|---|---|---|
| **Peruntukan Akun** | Mahasiswa praktikum reguler & akun kelas | Mahasiswa Tugas Akhir (di-boost) & Riset Dosen |
| **Akselerator Grafis** | **GPU 1** (Shared Compute Pool) | **GPU 0** (Dedicated 100% Khusus Riset) |
| **Batas Memori RAM** | **4 GB RAM** per sesi pengguna | **70 GB RAM** berkecepatan tinggi |
| **Batas Unit Prosesor** | **2 Core CPU** | **20 Core CPU** komputasi paralel |
| **Kuota Penyimpanan** | **10 GB** ruang direktori pribadi | **50 GB** ruang direktori diperbesar |
| **Masa Berlaku Akses** | Berlaku penuh selama semester praktikum | **1 – 24 Jam** (Hitung mundur otomatis) |

* **Prinsip Keadilan:** Mahasiswa praktikum reguler berbagi kapasitas di GPU 1 tanpa khawatir server mengalami crash.
* **Jaminan Bebas Gangguan:** Mahasiswa skripsi yang mendapatkan izin GPU 0 berjalan secara terisolasi tanpa terganggu oleh komputasi mahasiswa praktikum lainnya.

---

### 1.4 Integrasi SSO SIMTIK (*Zero-Admin Onboarding*)
Sistem menggunakan integrasi otentikasi terpusat ke portal akademik universitas (**SIMTIK UMPO**).
* Mahasiswa **tidak perlu mendaftarkan akun baru** secara manual ke asisten lab.
* Cukup gunakan NIM dan kata sandi SIMTIK yang valid.
* Saat login pertama kali berhasil, sistem web otomatis menyiapkan direktori penyimpanan pribadi mahasiswa (`/home/m<NIM>`) secara instan.
* Sandi mahasiswa tidak disimpan di database server lokal laboratorium, menjamin keamanan privasi data akun mahasiswa.

---

# Bab 2: Panduan Pengguna JupyterHub (Mahasiswa & Peneliti)

### 2.1 Prosedur Masuk (*Login*) Menggunakan Akun SIMTIK
Untuk memulai sesi praktikum atau penelitian:
1. Buka peramban web (disarankan Google Chrome, Microsoft Edge, atau Mozilla Firefox terbaru).
2. Kunjungi alamat JupyterHub: `http://76.76.76.188:8090`.
3. Pada halaman login:
   * **Username:** Masukkan Nomor Induk Mahasiswa Anda (contoh: `22533001`).
   * **Password:** Masukkan kata sandi portal SIMTIK UMPO Anda.
4. Klik tombol **Sign In**.
5. Sistem akan melakukan verifikasi ke portal SIMTIK kampus. Dalam 2–5 detik, antarmuka kerja JupyterLab akan terbuka di layar Anda.

---

### 2.2 Mengenal Antarmuka Kerja JupyterLab
Setelah login berhasil, Anda akan disambut oleh antarmuka modern JupyterLab:
* **Bilah Sisi Kiri (File Browser):** Menampilkan struktur berkas dan folder pribadi Anda. Anda dapat mengunggah berkas kecil, membuat folder baru, mengganti nama, atau mengunduh notebook dari panel ini.
* **Halaman Peluncur (*Launcher*):**
  * Klik ikon **Python 3 (ipykernel)** di bawah kategori *Notebook* untuk membuat lembar kerja komputasi baru (.ipynb).
  * Opsi *Console* untuk interaksi baris perintah berbasis Python.
  * Opsi *Text File* atau *Markdown File* untuk menulis dokumen teks dan dokumentasi.
* **Bilah Menu Atas:** Berisi menu pengoperasian (*File*, *Edit*, *View*, *Run*, *Kernel*, *Settings*, *Help*).
* **Pop-Up Modal Pemberitahuan & Bantuan:** Saat halaman JupyterLab terbuka, jendela sembul modern otomatis menyapa mahasiswa dengan panduan penanganan kendala cepat (Kernel Died, Kuota, atau Sesi Terkunci) dan instruksi untuk segera melapor ke Asisten Laboratorium jika menemui masalah. Mahasiswa cukup menekan tombol *"Saya Mengerti"* untuk mulai bekerja.

---

### 2.3 Pemanfaatan Akselerasi GPU Otomatis
Setiap notebook Python yang dibuka di JupyterHub secara otomatis terintegrasi dengan akselerator kartu grafis NVIDIA RTX dan pustaka komputasi CUDA:
* **Pengenalan Hardware Otomatis:** Kernel Python otomatis mengenali GPU yang dialokasikan (GPU 1 untuk mode Standard atau GPU 0 untuk mode Prioritas). Pengguna tidak perlu melakukan kompilasi driver atau konfigurasi environment secara manual.
* **Isolasi Hardware:** Mekanisme Cgroups di latar belakang memastikan alokasi VRAM dan batas memori RAM berjalan terisolasi, sehingga beban komputasi satu mahasiswa tidak mengganggu kestabilan sistem secara keseluruhan.

---

### 2.4 Pemanfaatan Direktori Dataset Bersama (*dataset_shared*)
Untuk menghemat ruang kuota penyimpanan pribadi mahasiswa dan memangkas waktu pengunduhan dataset berukuran besar, laboratorium menyediakan direktori bersama:
* **Lokasi Jalur Direktori Master:** `/home/dataset_shared/`
* **Pintasan Otomatis di JupyterLab Mahasiswa:** Sistem otomatis membuatkan pintasan (*symbolic link*) folder `dataset_shared` langsung di dalam direktori kerja setiap mahasiswa (`/home/m<NIM>/dataset_shared`).
* **Kemudahan Akses Visual:** Saat membuka JupyterLab, mahasiswa SIMTIK akan langsung melihat folder `dataset_shared` di panel penjelajah berkas (*File Browser*) sebelah kiri tanpa perlu mencari jalur absolut atau mengetik perintah manual.
* **Keuntungan Kuota & Keamanan:** Dataset praktikum (citra, tabular CSV, teks, maupun bobot pretrained model) dapat langsung dibaca oleh notebook. Folder ini bersifat hanya-baca (*read-only*) bagi mahasiswa sehingga aman dari risiko terhapus atau tertimpa secara tidak sengaja.

---

### 2.5 Ketersediaan Pustaka AI & Instalasi Mandiri
Server laboratorium telah dilengkapi dengan bundel pustaka kecerdasan buatan dan sains data siap pakai (PyTorch, Torchvision, Scikit-Learn, Pandas, NumPy, OpenCV, Matplotlib):
* Jika praktikum atau penelitian membutuhkan modul tambahan, mahasiswa dapat memasangnya langsung dari dalam notebook melalui perintah instalasi paket pengguna (`%pip install <nama_pustaka>`).
* Seluruh pustaka tambahan yang dipasang akan tersimpan secara otomatis di direktori pribadi pengguna dan tetap tersimpan saat pengguna keluar (*logout*).

---

### 2.6 Penyimpanan Berkas & Pengunduhan Model (*Export Hasil*)
Setiap mahasiswa memiliki kuota penyimpanan direktori sebesar **10 GB** (atau **50 GB** saat mode prioritas aktif):
* Seluruh berkas lembar kerja (`.ipynb`), skrip Python, dan berkas bobot model hasil pelatihan tersimpan di dalam folder kerja pribadi Anda.
* **Mengunduh Berkas Hasil ke Komputer Pribadi:**
  1. Buka bilah **File Browser** di sisi kiri antarmuka JupyterLab.
  2. Cari berkas model atau notebook yang ingin diunduh.
  3. Klik kanan pada berkas tersebut, lalu pilih opsi **Download**.
  4. Peramban web akan langsung mengunduh berkas ke penyimpanan komputer/laptop Anda.
* **Memantau Status Kuota:**
  Penggunaan kuota dapat dipantau melalui Web Dashboard di port `8888`. Jika penyimpanan mendekati batas maksimal, mahasiswa disarankan membersihkan file sampah atau meminta asisten lab menekan tombol *Bersihkan Cache Disk*.

---

### 2.7 Mengatasi Kendala Notebook (*Kernel Died*, *Out of Memory*, *Idle Timeout*)

#### 1. Pesan *Kernel Died* / *Out of Memory (OOM)*:
* **Penyebab:** Ukuran *batch size* pelatihan terlalu besar atau dataset yang dimuat melebihi alokasi memori RAM/VRAM yang ditentukan.
* **Solusi di JupyterLab:**
  1. Klik menu **Kernel** pada bilah menu atas JupyterLab.
  2. Pilih **Restart Kernel and Clear All Outputs**.
  3. Kurangi nilai `batch_size` pada skrip kode Anda (misalnya turunkan dari `64` ke `16` atau `8`).
  4. Jalankan kembali sel kode dari awal.

#### 2. Penutupan Otomatis Akibat *Idle-Timeout*:
* Server menerapkan fitur *Idle Culler*.
* Jika notebook Anda tidak menjalankan perhitungan dan tab peramban ditutup selama lebih dari **60 menit**, sesi komputasi akan diputus otomatis agar alokasi VRAM tidak tersandera.
* Seluruh berkas notebook yang sudah tersimpan tetap aman dan tidak akan hilang. Anda cukup membuka kembali portal JupyterHub untuk melanjutkan aktivitas.

---

### 2.8 Kebijakan Sesi Tunggal (*Single-Device Lock*) & Prosedur Logout
Laboratorium AI UMPO menerapkan kebijakan ketat **1 Akun = 1 Perangkat Aktif**.

#### Mengapa Ada Single-Device Lock?
1. Menghindari kerusakan file notebook akibat penulisan konkuren dari dua jendela berbeda.
2. Mencegah praktik joki praktikum dan penyalahgunaan akun mahasiswa oleh pihak tidak berwenang.

#### Gejala Saat Terkunci:
Jika Anda membuka JupyterHub di Laptop A, lalu mencoba login menggunakan Laptop B tanpa logout terlebih dahulu, layar akan memunculkan penolakan:
> *"Akses Ditolak (HTTP 403): Akun Anda sedang aktif digunakan di perangkat lain. Harap lakukan logout dari perangkat sebelumnya."*

#### Cara Logout yang Benar:
* Jangan hanya menutup tab peramban!
* Klik menu **File** di pojok kiri atas JupyterLab.
* Pilih opsi **Log Out**.
* Sesi komputasi Anda akan dilepaskan secara bersih dan Anda dapat login kembali dari perangkat lain dengan lancar.

---

# Bab 3: Panduan Web Dashboard (Mode Monitoring Publik)

Web Dashboard Laboratorium AI UMPO dapat diakses bebas oleh seluruh mahasiswa dan pengunjung di tautan:
* **Alamat Dashboard:** `http://76.76.76.188:8888`

---

### 3.1 Tata Letak & Navigasi Antarmuka Web Dashboard
Antarmuka Web Dashboard mengusung konsep visual modern (*Precision Console / Stitch UI*) dengan tata letak bersih dan responsif:
1. **Bilah Navigasi Sisi Kiri (*Sidebar*):**
   * **Ringkasan:** Tampilan ringkasan metrik beban server, status memori, dan kartu telemetri GPU.
   * **Pengguna:** Tabel pemantauan seluruh akun mahasiswa, status online, kuota disk, dan pengelolaan prioritas.
   * **File Explorer:** Antarmuka pengelola berkas berbasis web (terkunci dengan hak akses admin).
   * **Log Audit:** Riwayat catatan aktivitas administratif dan keamanan server (terkunci dengan hak akses admin).
   * **Buku Panduan:** Dokumentasi resmi panduan sistem yang terintegrasi langsung di aplikasi web.
2. **Indikator Status Bawah:**
   * Menampilkan status koneksi telemetri (**ONLINE / OFFLINE**) secara langsung.
   * Jam real-time Waktu Indonesia Barat (WIB).
   * Tombol muat ulang telemetri manual (*Refresh*).
3. **Bilah Header Atas:**
   * Informasi identitas laboratorium dan mode kerja aktif (*Public Monitoring View* atau *Administrator Mode*).
   * Tombol **Login Admin** untuk masuk ke mode kendali asisten laboratorium.

---

### 3.2 Membaca Telemetri Komputasi Real-Time
Pada tab **Ringkasan**, terdapat 4 kartu metrik utama dan panel pemantau GPU ganda:

1. **Host CPU & RAM:**
   * Memperlihatkan persentase beban prosesor pusat dan konsumsi memori utama server (RAM) dalam satuan gigabyte.
2. **Penyimpanan `/home`:**
   * Menampilkan kapasitas terpakai dan sisa ruang kosong pada partisi utama direktori kerja mahasiswa.
3. **VRAM Quota Cluster (Dual GPU):**
   * Menampilkan agregasi total memori grafis (VRAM) yang sedang digunakan di seluruh cluster server.
4. **Keamanan & Backup:**
   * Menampilkan status integritas basis data SQLite Write-Ahead Logging (WAL) dan riwayat tanggal snapshot pencadangan terakhir.
5. **Kartu Grafis GPU 0 & GPU 1:**
   * Setiap kartu GPU menampilkan indikator suhu operasional (°C), utilisasi komputasi grafis (%), alokasi VRAM terpakai (GB), kecepatan putaran kipas (*Fan Speed*), dan konsumsi daya listrik (*Power Wattage*).

---

### 3.3 Indikator Status Koneksi & Sinkronisasi Waktu Server
* Di pojok kiri bawah bilah navigasi, terdapat lingkaran indikator berkedip hijau (**ONLINE**). Telemetri diperbarui secara otomatis setiap beberapa detik melalui saluran data real-time.
* Jika koneksi jaringan kampus terputus atau server sedang dalam pemeliharaan, indikator berubah menjadi merah (**OFFLINE**).
* Anda dapat menekan tombol ikon putar di samping jam untuk meminta pembaruan data telemetri seketika.

---

### 3.4 Memantau Aktivitas Sesi & Slot Prioritas yang Tersedia
Pada tab **Pengguna**, pengguna mode publik dapat melihat:
* Jumlah akun mahasiswa yang sedang aktif (*Online Sessions*).
* Status slot komputasi Level 1: Menampilkan apakah slot GPU 0 sedang kosong atau sedang digunakan oleh mahasiswa skripsi.
* Daftar mahasiswa yang sedang menjalankan tugas komputasi beserta waktu mulai sesi.

---

# Bab 4: Panduan Administrator & Asisten Lab (Web Console)

Bagian ini ditujukan bagi Asisten Laboratorium dan Dosen Pengelola yang bertugas menjaga kelancaran praktikum dan riset.

---

### 4.1 Membuka Mode Akses Administrator (Login PIN Master)
Untuk mengakses fungsi administratif pada Web Dashboard:
1. Klik tombol **Login Admin** di pojok kanan atas bilah navigasi dashboard.
2. Jendela sembul (*modal dialog*) otentikasi akan muncul.
3. Masukkan **PIN Master Administrator** laboratorium yang telah ditetapkan.
4. Tekan tombol **Masuk**.
5. Setelah terverifikasi, label mode di bilah atas akan berubah menjadi **Super Admin Mode**, dan seluruh tombol operasional (Boost, Clear Cache, Kill Sesi, File Explorer, Log Audit, Snapshot) akan aktif secara otomatis.

---

### 4.2 Manajemen Pengguna & Alokasi Dynamic QoS
Buka tab **Pengguna** di bilah navigasi kiri untuk mengakses dasbor manajemen pengguna.

#### 4.2.1 Filter & Pencarian Pengguna:
* Gunakan kolom pencarian di bagian atas tabel untuk mencari mahasiswa secara cepat berdasarkan **NIM** atau **Nama Lengkap**.
* Gunakan tombol saringan tab:
  * **Semua:** Menampilkan seluruh akun yang terdaftar.
  * **Mahasiswa SIMTIK:** Khusus menyaring akun mahasiswa praktikan dan skripsi.
  * **Akun Sistem:** Menyaring akun riset khusus (`labriset`, `training1`-`10`).

#### 4.2.2 Memberikan Akses GPU Boost (Prioritas Level 1):
Ketika seorang mahasiswa skripsi mengajukan permohonan komputasi untuk pelatihan model besar:
1. Cari baris mahasiswa bersangkutan pada tabel.
2. Klik tombol **⚡ Boost** (berwarna biru gradien).
3. Jendela pengaturan alokasi akan muncul:
   * Pilih durasi waktu komputasi yang diizinkan (**1 Jam, 2 Jam, 4 Jam, 8 Jam, 12 Jam, atau 24 Jam**).
   * Isi kolom keterangan/alasan (misalnya: *Training Model Skripsi YOLOv8 Deteksi Kanker Kulit*).
4. Klik **Konfirmasi Boost**.
5. Sistem otomatis memeriksa ketersediaan slot GPU 0. Jika tersedia, status akun langsung ditingkatkan ke **Level 1 (GPU 0 Dedicated)**.
6. Hitung mundur waktu aktif (*Live Countdown*) akan langsung berjalan secara real-time pada kolom tabel mahasiswa tersebut.

#### 4.2.3 Mengembalikan Pengguna ke Mode Standard (*Unboost*):
* Jika masa durasi boost habis, sistem akan secara otomatis mengembalikan akun ke tingkat Standard Level 2.
* Jika asisten lab ingin mengembalikan alokasi lebih awal secara manual:
  1. Klik tombol **Kembalikan ke Mode Standard** pada baris mahasiswa bersangkutan.
  2. Konfirmasi tindakan. Akun akan kembali dialokasikan ke GPU 1 dan slot GPU 0 kembali terbuka bagi peneliti lain.

#### 4.2.4 Membersihkan Cache Disk Mahasiswa (Ikon Penghapus):
Jika kapasitas penyimpanan mahasiswa bertanda kuning/merah (*Over Quota*):
1. Klik tombol **ikon penghapus** (*Bersihkan Cache Disk*) pada baris mahasiswa tersebut.
2. Konfirmasi tindakan pada dialog peringatan.
3. Sistem web akan secara aman memusnahkan direktori sampah unduhan cache PIP (`~/.cache/pip`) dan riwayat checkpoint notebook (`.ipynb_checkpoints`) tanpa menghapus naskah kode atau dataset utama mahasiswa.
4. Kapasitas penyimpanan mahasiswa akan langsung berkurang dan normal kembali.

#### 4.2.5 Menghentikan Sesi Bermasalah (Ikon Stop: *Kill Sesi OS Aktif*):
Jika mahasiswa mengalami kendala perulangan tanpa henti (*infinite loop*), kebocoran memori, atau kernel tidak merespons:
1. Temukan nama mahasiswa pada tabel.
2. Klik tombol **ikon stop** berwarna merah (*Kill Sesi OS Aktif*).
3. Konfirmasi jendela pemutusan sesi.
4. Sistem web akan mematikan proses notebook pengguna tersebut dan membebaskan alokasi VRAM pada kartu grafis secara seketika tanpa perlu me-restart server secara keseluruhan.

---

### 4.3 Web File Explorer Terpadu
Menu **File Explorer** pada bilah navigasi kiri menyediakan antarmuka visual lengkap untuk mengelola berkas di server laboratorium tanpa perlu menggunakan aplikasi pihak ketiga seperti FileZilla atau WinSCP.

#### 4.3.1 Menjelajahi Folder Mahasiswa & Direktori Bersama:
* **Panel Kiri:** Berisi daftar seluruh direktori mahasiswa yang terdaftar (`/home/m<NIM>`) serta folder publik bersama (`dataset_shared`).
* **Panel Kanan:** Menampilkan isi direktori aktif beserta nama berkas, tipe (folder/file), ukuran file, dan tanggal modifikasi terakhir.
* **Navigasi Hirarki:** Klik pada nama folder untuk masuk ke subdirektori, atau klik tombol **Panah Atas (..)** pada bilah jalur (*breadcrumb*) untuk kembali ke folder induk.

#### 4.3.2 Mengunggah (*Upload*) Berkas & Dataset via Web:
1. Pilih direktori tujuan pada panel File Explorer.
2. Klik tombol **Upload File** pada bilah tindakan atas.
3. Pilih berkas dari komputer Anda (dataset .zip/.csv, notebook .ipynb, modul .py, dsb.).
4. Berkas akan terunggah secara otomatis langsung ke direktori tujuan dengan kepemilikan hak akses pengguna yang sesuai.

#### 4.3.3 Mengunduh (*Download*) Berkas Pekerjaan Mahasiswa:
1. Pada baris berkas yang diinginkan, klik tombol **ikon unduh** (*Download*).
2. Peramban web Anda akan langsung mengunduh berkas tersebut ke penyimpanan lokal Anda.

#### 4.3.4 Membuat Folder, Mengubah Nama, dan Menghapus Berkas:
* **Buat Folder Baru:** Klik tombol **New Folder**, ketikkan nama folder, lalu simpan.
* **Ganti Nama (*Rename*):** Klik tombol **ikon pensil** (*Edit/Rename*) pada baris berkas, masukkan nama baru, lalu konfirmasi.
* **Hapus Berkas (*Delete*):** Klik tombol **ikon tempat sampah** (*Delete*), konfirmasi penghapusan pada modal dialog keamanan.

#### 4.3.5 Fitur Salin ke Direktori Bersama (*Copy to Shared*):
Jika mahasiswa menghasilkan dataset atau materi praktikum yang bermanfaat untuk dibagikan ke seluruh kelas:
1. Klik tombol **Copy to Shared** pada baris berkas terkait.
2. Berkas tersebut otomatis disalin ke `/home/dataset_shared/` dengan izin baca bagi seluruh praktikan.

#### 4.3.6 Manajemen Papan Klip (*Clipboard*: Copy / Cut / Paste):
* Klik ikon **Copy** (Salin) atau **Cut** (Potong) pada berkas tertentu.
* Arahkan navigasi ke folder tujuan yang diinginkan.
* Tombol **Paste** (Tempel) akan muncul pada bilah tindakan atas. Klik tombol tersebut untuk menyelesaikan proses pemindahan berkas.

---

### 4.4 Pemantauan Log Audit Administratif
Buka tab **Log Audit** untuk melihat rekaman jejak audit (*audit trail*) keamanan:
* Setiap tindakan krusial (pemberian boost GPU, pencabutan boost, pembersihan cache, pemutusan sesi pengguna, penggantian nama berkas, dan penghapusan data) tercatat secara permanen.
* Informasi yang dicatat mencakup: **Waktu Aksi**, **Admin/Pelaksana**, **Jenis Aksi**, **Target Mahasiswa/NIM**, dan **Keterangan Rinci**.
* Fitur ini menjamin akuntabilitas seluruh aktivitas pengelolaan laboratorium.

---

### 4.5 Pencadangan Database Sekali Klik (*Snapshot Database*)
Pada tab **Ringkasan**, di kartu metrik *Keamanan & Backup*:
* Asisten lab dapat menekan tombol **Snapshot Database**.
* Sistem web akan membuat salinan instan (*point-in-time snapshot*) basis data pengguna dan kuota ke direktori penyimpanan cadangan lokal secara aman tanpa menghentikan layanan yang sedang berjalan.

---

# Bab 5: Kebijakan Operasional, Etika Komputasi, & Bantuan

### 5.1 Etika & Tata Tertib Komputasi Bersama
Untuk menjaga kenyamanan seluruh sivitas akademika Universitas Muhammadiyah Ponorogo:
1. **Peruntukan Akademik & Penelitian:** Sumber daya komputasi laboratorium AI UMPO hanya diizinkan untuk keperluan praktikum perkuliahan, riset skripsi, publikasi ilmiah, dan proyek inovasi yang disetujui program studi.
2. **Larangan Penambangan Kripto (*Cryptomining*):** Dilarang keras menggunakan GPU atau CPU laboratorium untuk aktivitas *mining cryptocurrency*. Sistem audit akan mendeteksi beban komputasi anomali secara otomatis dan akun bersangkutan akan diblokir permanen.
3. **Efisiensi Memori Grafis:** Segera lakukan *Restart Kernel* atau panggil `torch.cuda.empty_cache()` jika proses komputasi telah selesai agar alokasi VRAM dapat dimanfaatkan oleh rekan mahasiswa lainnya.
4. **Kebersihan Ruang Penyimpanan:** Hapus berkas checkpoint bobot model yang gagal atau tidak terpakai agar tidak membebani ruang penyimpanan server.

---

### 5.2 Standar Pelaporan Kendala
Jika mahasiswa atau peneliti menemui kendala teknis:
1. **Langkah Pertama:** Periksa Web Dashboard publik di port `8888` untuk memastikan apakah server dalam status normal atau sedang mengalami beban puncak.
2. **Langkah Kedua:** Buka buku panduan ini melalui tab **Buku Panduan** di Web Dashboard untuk memeriksa solusi mandiri (*Troubleshooting Guide*).
3. **Langkah Ketiga:** Jika kendala berlanjut (misalnya akun terkunci di perangkat lain atau kuota disk penuh), hubungi Asisten Laboratorium yang bertugas dengan menyertakan NIM dan tangkapan layar (*screenshot*) pesan error yang tampil.

---

### 5.3 Kontak Resmi & Informasi Dukungan
* **Laboratorium:** Laboratorium Artificial Intelligence & Komputasi Riset
* **Institusi:** Program Studi Teknik Informatika, Fakultas Teknik, Universitas Muhammadiyah Ponorogo
* **Lokasi:** Gedung Laboratorium Fakultas Teknik UMPO, Ponorogo, Jawa Timur
* **Kanal Dukungan:** Asisten Laboratorium Komputasi AI yang bertugas pada jam kerja operasional kampus.

---

*Buku Panduan ini berlaku efektif sejak tanggal diterbitkan dan menjadi acuan operasional resmi Laboratorium AI Fakultas Teknik Universitas Muhammadiyah Ponorogo.*
