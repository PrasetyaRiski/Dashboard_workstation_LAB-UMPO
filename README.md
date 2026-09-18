# Dashboard Workstation Lab Komputasi AI — UMPO

<div align="center">

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css&logoColor=white)
![NVIDIA NVML](https://img.shields.io/badge/NVIDIA-NVML_CUDA-76B900?logo=nvidia&logoColor=white)

**Sistem Monitoring Telemetri Real-time & Manajemen Beban GPU Server Workstation**  
*Laboratorium Komputasi AI — Program Studi Teknik Informatika, Universitas Muhammadiyah Ponorogo*

</div>

---

## 📌 Ringkasan Proyek

**Dashboard Workstation LAB-UMPO** adalah platform pemantauan telemetri presisi tinggi dan kontrol proses yang dirancang khusus untuk mengawasi penggunaan sumber daya komputasi workstation (CPU, RAM, dan Multi-GPU NVIDIA) secara *real-time*.

Dashboard ini dibangun dengan arsitektur modern **FastAPI + WebSocket** di backend serta **React 19 + Tailwind CSS** di frontend, mengusung standar antarmuka **Obsidian Precision Workstation 2026** yang *clean*, elegan, minim latensi, dan bebas *visual clutter*.

---

## ✨ Fitur Utama

### 1. ⚡ Live Telemetry Stream (WebSocket 1Hz)
- Pemantauan real-time status host: Penggunaan CPU (per-core), Host RAM, Swap, Disk, Uptime, dan Load Average.
- Data dipancarkan secara terus-menerus melalui koneksi WebSocket efisien tanpa perlu polling HTTP berulang.

### 2. 🎮 Multi-GPU Workload Monitoring (NVIDIA NVML)
- **Segmentasi Komputasi Otomatis**:
  - **GPU 0**: Dialokasikan khusus untuk riset dosen / Tugas Akhir mahasiswa tingkat akhir (`labriset`).
  - **GPU 1**: Mode *fair-share* untuk praktikum mahasiswa serentak (`training1` s.d `training10`).
- Metrik detail: VRAM Usage, GPU Core Utilization %, Suhu (°C), Konsumsi Daya (Watt), Fan Speed %, dan Clock Speed (MHz).
- **VRAM Block Allocation Grid**: Visualisasi blok alokasi memori grafis per proses/user menyerupai peta blok disk memory.
- **60-Second Micro Sparklines**: Miniatur grafik tren langsung di dalam setiap kartu GPU.

### 3. 🔍 Process Manager & Inspector Drawer
- Tabel proses GPU terpadu dengan filter cepat berdasarkan GPU, User, atau PID.
- **Process Inspector Drawer**: Klik baris proses untuk membuka panel detail mendalam (PID, PPID, full command line args, runtime, deteksi proses VRAM idle, dan tombol copy command).
- **Safe Process Termination**: Proteksi absolut terhadap proses kritis sistem (`systemd`, `sshd`, `dockerd`, `jupyterhub`, dsb).

### 4. 🔒 Keamanan & Kontrol Berbasis PIN Admin
- Operasi administratif sensitif dilindungi oleh **Admin PIN Modal** (Default: `umpo2026`):
  - Hentikan paksa proses tertentu (*Kill Process*).
  - Hentikan seluruh proses milik user tertentu (*Kill All Processes by User*).
  - Reset password akun praktikan / user lab.
- **Audit Logs Timeline**: Pencatatan riwayat kronologis setiap intervensi administratif lengkap dengan stempel waktu.

### 5. ⌨️ Global Command Palette (`Ctrl + K` / `Cmd + K`)
- Navigasi super cepat dengan keyboard shortcut:
  - Pencarian fuzzy untuk beralih antar tab (Overview, Live Charts, Users, Process Manager, Audit Log).
  - Temukan proses atau user aktif seketika.
  - Aksi instan (Kunci/Buka Mode Admin, Refresh, Trigger Simulasi).

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                      Client Browser                     │
│    React 19 + Vite + Tailwind CSS + Recharts + Lucide   │
└──────────────┬────────────────────────────▲─────────────┘
               │ HTTP REST (/api/*)         │ WebSocket (/ws/telemetry)
               ▼                            │
┌───────────────────────────────────────────┴─────────────┐
│                    FastAPI Backend                      │
│                  (Port Default: 8888)                   │
├─────────────────────────────────────────────────────────┤
│ • telemetry.py : psutil, pynvml (NVIDIA Management Lib) │
│ • main.py      : REST API, WebSocket Broadcaster, Auth  │
│ • Static Host  : Serve Frontend SPA Build (/dist)       │
└──────────────┬────────────────────────────┬─────────────┘
               ▼                            ▼
┌───────────────────────────┐  ┌──────────────────────────┐
│   Host Server Resources   │  │   NVIDIA GPUs & Driver   │
│   (CPU Cores, RAM, Disk)  │  │ (CUDA, VRAM, NVML Clock) │
└───────────────────────────┘  └──────────────────────────┘
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
```bash
cd frontend
npm install
npm run build
cd ..
```

### 4. Menjalankan Dashboard

#### Opsi A: Mode Standalone / Produksi (Satu Port)
Backend FastAPI akan langsung men-serve aplikasi frontend yang sudah di-build:
```bash
source venv/bin/activate
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8888 --workers 1
```
Akses dashboard di browser melalui: **`http://localhost:8888`** atau `http://<IP_SERVER>:8888`.

#### Opsi B: Mode Development (Hot Reloading)
Jika Anda ingin mengembangkan atau memodifikasi antarmuka:
- **Terminal 1 (Backend)**:
  ```bash
  cd backend
  uvicorn app.main:app --host 0.0.0.0 --port 8888 --reload
  ```
- **Terminal 2 (Frontend)**:
  ```bash
  cd frontend
  npm run dev
  ```
Buka browser di: **`http://localhost:5173`** *(Vite otomatis mem-proxy request API & WebSocket ke port 8888)*.

---

## ⚙️ Konfigurasi Lingkungan (Environment Variables)

Anda dapat menyesuaikan konfigurasi dengan mengatur environment variable sebelum menjalankan backend:

| Variable | Default | Keterangan |
|---|---|---|
| `LAB_ADMIN_PIN` | `umpo2026` | PIN keamanan untuk mengakses fungsi administratif (Kill, Reset). |
| `FRONTEND_DIST` | Otomatis terdeteksi | Lokasi direktori berkas statis frontend (`frontend/dist`). |

Contoh kustomisasi PIN saat menjalankan server:
```bash
LAB_ADMIN_PIN="rahasia_admin_2026" uvicorn app.main:app --host 0.0.0.0 --port 8888
```

---

## 🤖 Menjalankan Uji Simulasi Komputasi (Testing)

Tersedia skrip simulasi komputasi beban kerja 11 user (`labriset` + `training1` s.d `training10`) untuk menguji visualisasi grafik dan pemantauan CPU/RAM/VRAM:

```bash
# Menjalankan simulasi (alokasi memori & komputasi matrix serentak)
python3 test_simulation.py

# Menghentikan simulasi
bash stop_simulation.sh
```

---

## 🛡️ Deployment Otomatis (Systemd Service)

Untuk menjalankan server di workstation lab secara permanen (24/7 dan auto-restart saat reboot):

1. Buat file service systemd:
   ```bash
   sudo nano /etc/systemd/system/panel-lab.service
   ```
2. Salin konfigurasi berikut:
   ```ini
   [Unit]
   Description=AI Lab Workstation Telemetry Dashboard
   After=network.target

   [Service]
   Type=simple
   User=kiki
   WorkingDirectory=/home/kiki/panel-lab
   Environment="PATH=/home/kiki/panel-lab/venv/bin:/usr/local/bin:/usr/bin"
   Environment="LAB_ADMIN_PIN=umpo2026"
   ExecStart=/home/kiki/panel-lab/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8888 --workers 1
   Restart=always
   RestartSec=3

   [Install]
   WantedBy=multi-user.target
   ```
3. Aktifkan dan jalankan:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable panel-lab
   sudo systemctl start panel-lab
   ```

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi **[MIT License](LICENSE)** — bebas digunakan, dimodifikasi, dan didistribusikan untuk keperluan akademik maupun komersial.

© 2026 **Prasetya Riski** — *Laboratorium Komputasi AI, Teknik Informatika, Universitas Muhammadiyah Ponorogo*.
