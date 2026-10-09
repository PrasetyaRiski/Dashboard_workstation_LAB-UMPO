#!/bin/bash
# ==============================================================================
# SCRIPT DEPLOY OTOMATIS: SIMTIK AUTH & DYNAMIC QoS LAB AI UMPO
# Jalankan di server edy@ai:/home/public/web
# ==============================================================================

set -e

echo "=========================================================="
echo "🚀 MEMULAI PENERAPAN SISTEM SIMTIK & DYNAMIC QoS LAB AI..."
echo "=========================================================="

# 1. Masuk ke direktori web/panel-lab
# Memastikan repositori terisolasi di dalam folder panel-lab agar rapi
sudo mkdir -p /home/public/web/panel-lab
sudo mkdir -p /home/public/web/data
sudo chmod 777 /home/public/web/data 2>/dev/null || true
cd /home/public/web/panel-lab

# 2. Sinkronkan dengan GitHub
echo "🔄 Mengambil pembaruan dari GitHub..."
if [ ! -d ".git" ]; then
    git init
    git remote add origin https://github.com/PrasetyaRiski/Dashboard_workstation_LAB-UMPO.git || true
fi
git fetch origin main
git reset --hard origin/main

if command -v npm &> /dev/null && [ -f "frontend/package.json" ]; then
    echo "⚡ Memeriksa dan memperbarui build frontend dist..."
    (cd frontend && npm run build --silent || true)
fi

# 3. Update dependencies venv
echo "📦 Menginstall modul backend ke venv..."
if [ -d "venv" ]; then
    source venv/bin/activate
    pip install --quiet -r backend/requirements.txt
elif [ -d "../venv" ]; then
    source ../venv/bin/activate
    pip install --quiet -r backend/requirements.txt
else
    python3 -m venv venv
    source venv/bin/activate
    pip install --quiet -r backend/requirements.txt
fi

# 4. Restart Dashboard di Port 8888
echo "🔄 Merestart Dashboard Monitoring..."
chmod +x backend/run.sh 2>/dev/null || true

if systemctl list-unit-files panel-lab.service 2>/dev/null | grep -q panel-lab.service; then
    sudo systemctl daemon-reload
    sudo systemctl restart panel-lab.service
    echo "✅ Service panel-lab.service berhasil direstart."
elif systemctl list-unit-files workstation-monitor.service 2>/dev/null | grep -q workstation-monitor.service; then
    sudo systemctl daemon-reload
    sudo systemctl restart workstation-monitor.service
    echo "✅ Service workstation-monitor.service berhasil direstart."
else
    sudo fuser -k 8888/tcp 2>/dev/null || true
    sleep 1
    nohup ./backend/run.sh > dashboard.log 2>&1 &
    echo "✅ Dashboard backend dijalankan di latar belakang (port 8888)."
fi

sleep 2
if ss -tuln 2>/dev/null | grep -q ":8888 " || netstat -tuln 2>/dev/null | grep -q ":8888 "; then
    echo "✅ Port 8888 AKTIF dan siap menerima koneksi."
else
    echo "⚠️ Port 8888 belum merespons. Mencoba menyalakan manual lewat nohup..."
    sudo fuser -k 8888/tcp 2>/dev/null || true
    sleep 1
    nohup ./backend/run.sh > dashboard.log 2>&1 &
    sleep 2
    if ss -tuln 2>/dev/null | grep -q ":8888 " || netstat -tuln 2>/dev/null | grep -q ":8888 "; then
        echo "✅ Port 8888 AKTIF!"
    else
        echo "❌ Port 8888 masih belum aktif. Isi log terakhir (dashboard.log):"
        tail -n 20 dashboard.log 2>/dev/null || true
    fi
fi

# 4.5 Konfigurasi Cgroups v2 Slices (Level 1: 70G, Level 2: 4G)
echo "⚙️ Memeriksa & mengonfigurasi systemd QoS Slices (Level 2: 4G RAM, Level 1: 70G RAM)..."
sudo tee /etc/systemd/system/compute-level1.slice > /dev/null << 'EOF'
[Slice]
CPUQuota=2000%
MemoryMax=70G
EOF

sudo tee /etc/systemd/system/compute-level2.slice > /dev/null << 'EOF'
[Slice]
CPUQuota=200%
MemoryMax=4G
EOF
sudo systemctl daemon-reload

# 5. Konfigurasi JupyterHub & Idle Culler
JH_CONFIG="/opt/jupyterhub/etc/jupyterhub_config.py"
if [ ! -f "$JH_CONFIG" ]; then
    JH_CONFIG="/etc/jupyterhub/jupyterhub_config.py"
fi

if [ -f "$JH_CONFIG" ]; then
    echo "⚙️ Memeriksa konfigurasi JupyterHub di $JH_CONFIG..."
    
    # 5.1 Pastikan jupyterhub-idle-culler terinstall
    echo "📦 Memeriksa modul jupyterhub-idle-culler..."
    if [ -x "/opt/jupyterhub/bin/pip" ]; then
        sudo /opt/jupyterhub/bin/pip install --quiet jupyterhub-idle-culler || true
    elif command -v pip3 &> /dev/null; then
        sudo pip3 install --quiet jupyterhub-idle-culler || true
    fi

    # 5.2 Bersihkan konfigurasi versi lama agar tidak terjadi duplikasi
    sudo sed -i '/# === BEGIN SIMTIK & QoS CONFIG ===/,/# === END SIMTIK & QoS CONFIG ===/d' "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i '/# =* INTEGRASI OTENTIKASI SIMTIK UMPO/,+35d' "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i '/jupyterhub_simtik_auth/d' "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i '/c.JupyterHub.authenticator_class = SimtikAuthenticator/d' "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i '/c.Spawner.pre_spawn_hook = simtik_pre_spawn_hook/d' "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i '/c.Spawner.post_stop_hook = simtik_post_stop_hook/d' "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i '/c.JupyterHub.shutdown_on_logout = True/d' "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i '/jupyterhub_idle_culler/d' "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i "/'name': 'idle-culler'/d" "$JH_CONFIG" 2>/dev/null || true
    
    echo "📝 Menambahkan hook SIMTIK, Single-Device Policy, & Idle Culler ke $JH_CONFIG..."
    sudo tee -a "$JH_CONFIG" > /dev/null << 'EOF'

# === BEGIN SIMTIK & QoS CONFIG ===
# ========================================================
# INTEGRASI OTENTIKASI SIMTIK UMPO & DYNAMIC QoS LAB AI
# ========================================================
import sys
sys.path.append("/home/public/web/panel-lab")
from jupyterhub_simtik_auth import SimtikAuthenticator, simtik_pre_spawn_hook, simtik_post_stop_hook

c.JupyterHub.authenticator_class = SimtikAuthenticator
c.Spawner.pre_spawn_hook = simtik_pre_spawn_hook
c.Spawner.post_stop_hook = simtik_post_stop_hook
c.JupyterHub.shutdown_on_logout = True

# ========================================================
# JUPYTERHUB IDLE CULLER (PELEPASAN OTOMATIS RAM & VRAM GPU)
# Mematikan server notebook yang tidak aktif > 30 menit (1800 detik)
# ========================================================
c.JupyterHub.services = [
    {
        'name': 'idle-culler',
        'admin': True,
        'command': [
            sys.executable,
            '-m', 'jupyterhub_idle_culler',
            '--timeout=1800',         # 30 menit (1800 detik) idle -> stop server
            '--cull-every=300',        # Pemeriksaan setiap 5 menit (300 detik)
            '--cull-users=False',      # Hanya stop server singleuser, JANGAN hapus akun
            '--cull-connected=True',   # Tetap stop jika tab browser terbuka tapi kernel idle
            '--concurrency=10',
        ],
    }
]

c.JupyterHub.load_roles = [
    {
        'name': 'idle-culler',
        'scopes': ['list:users', 'read:users:activity', 'admin:servers'],
        'services': ['idle-culler'],
    }
]
# === END SIMTIK & QoS CONFIG ===
EOF
    echo "✅ Konfigurasi JupyterHub & Idle Culler berhasil diperbarui."

    # 6. Restart JupyterHub Service
    echo "🔄 Merestart service JupyterHub..."
    sudo systemctl restart jupyterhub.service || sudo systemctl restart jupyterhub
    sleep 2
    if systemctl is-active --quiet jupyterhub.service 2>/dev/null || systemctl is-active --quiet jupyterhub 2>/dev/null; then
        echo "✅ JupyterHub aktif dan normal!"
    else
        echo "⚠️ Cek status jupyterhub: sudo systemctl status jupyterhub.service"
    fi
else
    echo "⚠️ File jupyterhub_config.py tidak ditemukan di path default. Silakan cek lokasinya."
fi

# 7. Penjadwalan Crontab Auto-Backup Database (Setiap jam 02:00 pagi)
echo "⏰ Memeriksa jadwal Crontab Auto-Backup database..."
chmod +x /home/public/web/panel-lab/backup_db.py 2>/dev/null || true
BACKUP_CRON="0 2 * * * /home/public/web/panel-lab/venv/bin/python /home/public/web/panel-lab/backup_db.py >> /home/public/web/panel-lab/backup.log 2>&1"
if ! crontab -l 2>/dev/null | grep -q "backup_db.py"; then
    (crontab -l 2>/dev/null; echo "$BACKUP_CRON") | crontab - 2>/dev/null || true
    echo "✅ Crontab Auto-Backup berhasil dipasang (Berjalan tiap pukul 02:00 WIB)."
else
    echo "✅ Crontab Auto-Backup sudah aktif."
fi

echo "=========================================================="
echo "🎉 PENERAPAN SELESAI!"
echo "Dashboard Admin : http://76.76.76.188:8888 (Tab User)"
echo "JupyterHub      : http://76.76.76.188:8090 (Login pakai SIMTIK)"
echo "Auto-Backup DB  : Tiap 02:00 WIB (/home/public/web/data/backups)"
echo "=========================================================="

