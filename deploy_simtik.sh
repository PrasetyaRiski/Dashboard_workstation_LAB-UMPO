#!/bin/bash
# ==============================================================================
# SCRIPT DEPLOY OTOMATIS: SIMTIK AUTH & DYNAMIC QoS LAB AI UMPO
# Jalankan di server edy@ai:/home/public/web
# ==============================================================================

set -e

echo "=========================================================="
echo "🚀 MEMULAI PENERAPAN SISTEM SIMTIK & DYNAMIC QoS LAB AI..."
echo "=========================================================="

# 1. Masuk ke direktori web
cd /home/public/web

# 2. Sinkronkan dengan GitHub
echo "🔄 Mengambil pembaruan dari GitHub..."
if [ ! -d ".git" ]; then
    git init
    git remote add origin https://github.com/PrasetyaRiski/Dashboard_workstation_LAB-UMPO.git || true
fi
git fetch origin main
git reset --hard origin/main

# 3. Update dependencies venv
echo "📦 Menginstall modul requests ke venv..."
if [ -d "venv" ]; then
    source venv/bin/activate
    pip install --quiet requests
elif [ -d "../venv" ]; then
    source ../venv/bin/activate
    pip install --quiet requests
fi

# 4. Restart Dashboard di Port 8888
echo "🔄 Merestart Dashboard Monitoring..."
if systemctl is-active --quiet panel-lab.service 2>/dev/null; then
    sudo systemctl restart panel-lab.service
    echo "✅ Service panel-lab.service berhasil direstart."
else
    sudo fuser -k 8888/tcp 2>/dev/null || true
    sleep 1
    nohup ./backend/run.sh > dashboard.log 2>&1 &
    echo "✅ Dashboard backend aktif di latar belakang (port 8888)."
fi

# 5. Konfigurasi JupyterHub
JH_CONFIG="/opt/jupyterhub/etc/jupyterhub_config.py"
if [ ! -f "$JH_CONFIG" ]; then
    JH_CONFIG="/etc/jupyterhub/jupyterhub_config.py"
fi

if [ -f "$JH_CONFIG" ]; then
    echo "⚙️ Memeriksa konfigurasi JupyterHub di $JH_CONFIG..."
    if ! grep -q "jupyterhub_simtik_auth" "$JH_CONFIG"; then
        echo "📝 Menambahkan hook SIMTIK ke $JH_CONFIG..."
        sudo tee -a "$JH_CONFIG" > /dev/null << 'EOF'

# ========================================================
# INTEGRASI OTENTIKASI SIMTIK UMPO & DYNAMIC QoS LAB AI
# ========================================================
import sys
sys.path.append("/home/public/web")
from jupyterhub_simtik_auth import SimtikAuthenticator, simtik_pre_spawn_hook

c.JupyterHub.authenticator_class = SimtikAuthenticator
c.Spawner.pre_spawn_hook = simtik_pre_spawn_hook
EOF
        echo "✅ Konfigurasi JupyterHub berhasil ditambahkan."
    else
        echo "ℹ️ Konfigurasi JupyterHub sudah terpasang sebelumnya."
    fi

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

echo "=========================================================="
echo "🎉 PENERAPAN SELESAI!"
echo "Dashboard Admin : http://76.76.76.188:8888 (Tab User)"
echo "JupyterHub      : http://76.76.76.188:8090 (Login pakai SIMTIK)"
echo "=========================================================="
