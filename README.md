# Dashboard Workstation Lab Komputasi AI — UMPO

<div align="center">

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css&logoColor=white)
![NVIDIA NVML](https://img.shields.io/badge/NVIDIA-NVML_CUDA-76B900?logo=nvidia&logoColor=white)

**Sistem Monitoring Telemetri Real-time & Manajemen Beban GPU Server Workstation**  
*Laboratorium Komputasi AI — Program Studi Teknik Informatika, Universitas Muhammadiyah Ponorogo*

</div>

---

## 📌 Ringkasan Proyek

**Dashboard Workstation LAB-UMPO** adalah platform pemantauan telemetri presisi tinggi dan kontrol proses yang dirancang khusus untuk mengawasi penggunaan sumber daya komputasi workstation (CPU, RAM, Storage, dan Multi-GPU NVIDIA) secara *real-time*.

Dashboard ini dibangun dengan arsitektur modern **FastAPI + WebSocket** di backend serta **React 19 + Vite + Tailwind CSS v4** di frontend, mengusung standar antarmuka **Obsidian Precision Workstation 2026** yang *clean*, elegan, minim latensi, serta responsif dengan navigasi Sidebar dan dukungan tema Gelap/Terang (*Dark & Light Mode*).

---

## ✨ Fitur Utama

### 1. ⚡ Live Telemetry Stream (WebSocket 1Hz)
- Pemantauan real-time status host: Penggunaan CPU (per-core dan agregat), Host RAM, Swap, Disk Storage, Uptime, dan Load Average.
- Data dipancarkan secara terus-menerus melalui koneksi WebSocket efisien (`/ws/telemetry` & `/ws`) tanpa overhead polling HTTP berulang.
- Indikator status jaringan otomatis dengan *auto-reconnect banner* saat koneksi terputus.

### 2. 🎮 Multi-GPU Workload Monitoring (NVIDIA NVML)
- **Segmentasi Komputasi Workstation**:
  - **GPU 0**: Dialokasikan khusus untuk riset dosen dan Tugas Akhir mahasiswa tingkat akhir (`labriset`).
  - **GPU 1**: Mode *fair-share* untuk praktikum mahasiswa serentak (`training1` s.d `training10`).
- **Metrik Hardware Detail**: VRAM Usage (MB & %), Core Utilization %, Suhu (°C), Konsumsi Daya (Watt), Fan Speed %, dan Clock Speed (MHz).
- **VRAM Block Allocation Grid**: Visualisasi blok alokasi memori grafis per proses/user menyerupai peta blok memori dinamis.
- **Micro Sparklines**: Grafik riwayat mini 60-detik yang tersemat langsung di dalam setiap kartu GPU.

### 3. 🧭 Modern Sidebar Navigation & Tata Letak Tabular
Menggantikan model navbar konvensional dengan **Collapsible Sidebar** yang dilengkapi logo resmi TI-UMPO, badge dinamis, dan 5 tampilan utama:
- **📊 Ringkasan (Overview)**: Ikhtisar keseluruhan hardware server, grafik live telemetri, status kartu GPU, dan daftar proses berjalan.
- **⚡ Manajemen Job**: Tampilan komprehensif seluruh proses komputasi yang sedang aktif di workstation.
- **👥 User**: Monitor alokasi sumber daya per pengguna, visualisasi penggunaan VRAM, dan kontrol intervensi akun.
- **🏢 Infrastruktur**: Informasi isolasi memori kernel Linux (*cgroups v2* umbrella limit), versi NVIDIA Driver, serta CUDA Runtime.
- **📋 Audit Log**: Linimasa kronologis seluruh intervensi administratif pada server (penghentian proses, pemutusan sesi, reset password, dan status over-quota).

### 4. 👥 Manajemen Sesi & Kontrol Pengguna Terpusat (User Menu)
- **Sentralisasi Aksi Penghentian (Kill Action)**: Aksi penghentian proses dan pemutusan sesi dipusatkan secara eksklusif di dalam **Menu User**, mencegah risiko penghentian proses yang tidak disengaja dari kartu GPU umum.
- **Deteksi User Online Tanpa VRAM**: Mendeteksi status aktif pengguna (`is_online`) melalui sesi login terminal, bahkan sebelum pengguna mulai mengalokasikan VRAM pada GPU.
- **Hentikan Sesi & Proses Pengguna (`Kill User Sesi`)**: Fitur terpadu untuk menghentikan seluruh proses komputasi sekaligus memutus sesi login/terminal user secara instan (`pkill -u` + `loginctl terminate-user`).
- **Reset Password Akun Praktikan**: Kemampuan memperbarui password akun praktikan/riset secara langsung dari dashboard (`/api/reset-password`).
- **Safe Process Protection**: Proteksi absolut terhadap proses dan layanan kritis sistem (`systemd`, `sshd`, `dockerd`, `jupyterhub`, `cloudflared`, `1panel`, `portainer`, `uvicorn`, `gunicorn`).

### 5. 🌓 Dukungan Tema Gelap & Terang (Dark & Light Mode)
- Tampilan bawaan bergaya **Obsidian Dark** dengan aksen neon kontras tinggi yang nyaman di mata untuk monitoring jangka panjang di ruang lab.
- Tersedia opsi beralih ke **Light Mode** yang bersih, dengan preferensi tema tersimpan otomatis di *local storage* browser.

### 6. 🤖 Simulator Pengujian Beban Kerja (Built-in Testing)
- Pengujian beban komputasi terintegrasi menggunakan skrip `test_simulation.py` dan `stop_simulation.sh` untuk mensimulasikan beban kerja 11 akun pengguna serentak.
- Tombol mulai/hentikan simulasi dapat dieksekusi langsung dari dashboard dengan feedback audit log otomatis.

---

## 🏗️ Arsitektur Sistem

```
┌───────────────────────────────────────────────────────────────┐
│                        Client Browser                         │
│   React 19 + Vite 8 + Tailwind CSS v4 + Recharts + Lucide     │
│   (Sidebar Navigation, Dark/Light Mode, User Session Manager) │
└───────────────┬───────────────────────────────▲───────────────┘
                │ HTTP REST (/api/*)            │ WebSocket (/ws/telemetry)
                ▼                               │
┌───────────────────────────────────────────────┴───────────────┐
│                        FastAPI Backend                        │
│                     (Port Default: 8888)                      │
├───────────────────────────────────────────────────────────────┤
│ • telemetry.py : psutil, pynvml (NVML), cgroups v2, loginctl  │
│ • main.py      : REST Endpoints, WebSocket Manager, Audit Log │
│ • Static Host  : Serve Frontend SPA Production Build (/dist)  │
└───────────────┬───────────────────────────────┬───────────────┘
                ▼                               ▼
┌───────────────────────────────┐   ┌───────────────────────────┐
│     Host Server Resources     │   │   NVIDIA GPUs & Driver    │
│    (CPU Cores, RAM, Storage,  │   │  (Dual Architecture GPUs, │
│    cgroups v2, User Slices)   │   │   NVML, CUDA 13.2 Driver) │
└───────────────────────────────┘   └───────────────────────────┘
```

---

## 📁 Struktur Direktori

```
Dashboard_workstation_LAB-UMPO/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # Entrypoint FastAPI, REST API & WebSocket
│   │   └── telemetry.py         # Modul ekstraksi telemetri host & NVML GPU
│   ├── requirements.txt         # Dependensi Python backend
│   └── run.sh                   # Script startup cepat backend
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   └── ti-umpo-logo.png     # Logo resmi TI-UMPO pada Sidebar
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminPinModal.jsx
│   │   │   ├── AuditLogView.jsx
│   │   │   ├── GpuCard.jsx
│   │   │   ├── KillConfirmModal.jsx
│   │   │   ├── LiveChart.jsx
│   │   │   ├── ProcessManager.jsx
│   │   │   ├── Sidebar.jsx      # Komponen navigasi utama collapsible
│   │   │   ├── SystemOverview.jsx
│   │   │   └── UserGpuMonitor.jsx # Monitor beban & kontrol aksi user
│   │   ├── App.jsx              # Komponen root aplikasi & state manager
│   │   ├── index.css            # Styling tema CSS Variables & Tailwind
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── LICENSE                      # Lisensi MIT
├── README.md                    # Dokumentasi utama proyek
├── stop_simulation.sh           # Script penghenti simulasi komputasi
└── test_simulation.py           # Script simulator beban kerja PyTorch
```

---

## 🚀 Panduan Instalasi & Menjalankan

### 1. Clone Repository
```bash
git clone https://github.com/PrasetyaRiski/Dashboard_workstation_LAB-UMPO.git
cd Dashboard_workstation_LAB-UMPO
```

### 2. Setup Backend (Python)
Pastikan Python 3.10+ sudah terpasang:
```bash
# Buat dan aktifkan virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependensi backend
pip install -r backend/requirements.txt
```

### 3. Setup & Build Frontend (Node.js)
Pastikan Node.js (v18+) dan npm sudah terpasang:
```bash
cd frontend
npm install
npm run build
cd ..
```

### 4. Menjalankan Dashboard

#### Opsi A: Mode Produksi / Standalone (Direkomendasikan)
Backend FastAPI akan langsung men-serve antarmuka frontend statis yang telah di-build:
```bash
source venv/bin/activate
bash backend/run.sh
```
*Atau langsung via uvicorn:*
```bash
source venv/bin/activate
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8888 --workers 1
```
Akses dashboard di browser melalui: **`http://localhost:8888`** atau `http://<IP_SERVER>:8888`.

#### Opsi B: Mode Development (Hot Reloading)
Jika Anda ingin mengembangkan antarmuka secara dinamis:
- **Terminal 1 (Backend)**:
  ```bash
  source venv/bin/activate
  cd backend
  uvicorn app.main:app --host 0.0.0.0 --port 8888 --reload
  ```
- **Terminal 2 (Frontend)**:
  ```bash
  cd frontend
  npm run dev
  ```
Buka browser di: **`http://localhost:5173`** *(Vite otomatis melakukan proxy request API & WebSocket ke port 8888)*.

---

## 🌐 Daftar Endpoint API

| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/status` | Mengambil snapshot data telemetri sistem lengkap (CPU, RAM, GPU, User, Log). |
| `GET` | `/api/export-telemetry` | Ekspor data telemetri komprehensif. |
| `POST` | `/api/kill-process` | Menghentikan proses tertentu berdasarkan `pid` (dilindungi verifikasi akun sistem). |
| `POST` | `/api/kill-user-all` | Menghentikan seluruh proses dan memutus sesi online milik pengguna tertentu. |
| `POST` | `/api/reset-password` | Memperbarui password akun Linux milik praktikan/user lab. |
| `POST` | `/api/run-simulation` | Menjalankan simulator komputasi PyTorch (11 user serentak). |
| `POST` | `/api/stop-simulation` | Menghentikan seluruh proses simulasi pengujian. |
| `WS` | `/ws/telemetry` | WebSocket stream telemetri real-time broadcast setiap 1 detik. |

---

## 🛡️ Deployment Otomatis (Systemd Service)

Untuk menjalankan dashboard di workstation lab secara permanen (24/7 dan otomatis aktif kembali saat server restart):

1. Buat file service systemd:
   ```bash
   sudo nano /etc/systemd/system/panel-lab.service
   ```
2. Salin konfigurasi berikut (sesuaikan path direktori jika berbeda):
   ```ini
   [Unit]
   Description=AI Lab Workstation Telemetry Dashboard
   After=network.target

   [Service]
   Type=simple
   User=kiki
   WorkingDirectory=/home/kiki/panel-lab
   Environment="PATH=/home/kiki/panel-lab/venv/bin:/usr/local/bin:/usr/bin"
   ExecStart=/home/kiki/panel-lab/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8888 --workers 1
   Restart=always
   RestartSec=3

   [Install]
   WantedBy=multi-user.target
   ```
3. Aktifkan dan jalankan service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable panel-lab.service
   sudo systemctl start panel-lab.service
   ```
4. Cek status service:
   ```bash
   sudo systemctl status panel-lab.service
   ```

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi **[MIT License](LICENSE)** — bebas digunakan, dikembangkan, dan didistribusikan untuk keperluan akademik maupun institusional.

© 2026 **Prasetya Riski** — *Laboratorium Komputasi AI, Program Studi Teknik Informatika, Universitas Muhammadiyah Ponorogo*.
