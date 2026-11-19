#!/bin/bash
# ==============================================================================
# SCRIPT DEPLOY OTOMATIS: SIMTIK AUTH & DYNAMIC QoS LAB KOMPUTASI UMPO
# Jalankan di server edy@ai:/home/public/web
# ==============================================================================

set -e

# Jalankan dari salinan agar `git reset --hard` tidak mengubah berkas skrip
# yang sedang dieksekusi (bash membaca skrip secara bertahap per offset byte).
if [ "${DEPLOY_SIMTIK_COPY:-0}" != "1" ]; then
    SELF_PATH="$(readlink -f "$0")"
    cp -f "$SELF_PATH" /tmp/deploy_simtik_run.sh
    DEPLOY_SIMTIK_COPY=1 exec bash /tmp/deploy_simtik_run.sh "$@"
fi

echo "=========================================================="
echo "🚀 MEMULAI PENERAPAN SISTEM SIMTIK & DYNAMIC QoS LAB KOMPUTASI..."
echo "=========================================================="

# 1. Masuk ke direktori web/panel-lab
# Memastikan repositori terisolasi di dalam folder panel-lab agar rapi
sudo mkdir -p /home/public/web/panel-lab
sudo mkdir -p /home/public/web/data
# Amankan direktori database: hanya root & admin/service yang boleh akses (blokir akses world-writeable mahasiswa)
sudo chmod 770 /home/public/web/data 2>/dev/null || true
sudo chmod 660 /home/public/web/data/*.db 2>/dev/null || true
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
    (cd frontend && \
        if [ ! -d "node_modules/three" ]; then \
            echo "📦 Menginstall modul three.js..." && npm install three; \
        fi && \
        npm run build) || true
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

# 3.1 Pasang helper notebook (lab_gemini.py) ke environment Jupyter single-user
if [ -f "lab_gemini.py" ]; then
    SITE_PACKAGES=$(/opt/ai_env/bin/python -c "import site; print(site.getsitepackages()[0])" 2>/dev/null || true)
    if [ -n "$SITE_PACKAGES" ] && [ -d "$SITE_PACKAGES" ]; then
        sudo cp -f lab_gemini.py "$SITE_PACKAGES/lab_gemini.py"
        sudo chmod 0644 "$SITE_PACKAGES/lab_gemini.py"
        echo "✅ Helper lab_gemini.py dipasang di $SITE_PACKAGES"
    else
        echo "⚠️ /opt/ai_env tidak ditemukan; helper lab_gemini.py belum dipasang."
    fi
fi

# 3.1b Pasang kuota VRAM GPU Boost (lazy hook saat `import torch`)
if [ -f "lab_gpu_quota.py" ]; then
    SITE_PACKAGES=$(/opt/ai_env/bin/python -c "import site; print(site.getsitepackages()[0])" 2>/dev/null || true)
    if [ -n "$SITE_PACKAGES" ] && [ -d "$SITE_PACKAGES" ]; then
        sudo cp -f lab_gpu_quota.py "$SITE_PACKAGES/lab_gpu_quota.py"
        sudo chmod 0644 "$SITE_PACKAGES/lab_gpu_quota.py"
        # .pth dieksekusi oleh site.py saat interpreter start. Baris "import ..."
        # dipakai agar tidak menimpa sitecustomize.py milik distribusi.
        printf 'import lab_gpu_quota\n' | sudo tee "$SITE_PACKAGES/lab_gpu_quota.pth" >/dev/null
        sudo chmod 0644 "$SITE_PACKAGES/lab_gpu_quota.pth"
        if /opt/ai_env/bin/python -c "import lab_gpu_quota" >/dev/null 2>&1; then
            echo "✅ Kuota VRAM GPU Boost dipasang di $SITE_PACKAGES"
        else
            echo "⚠️ Modul lab_gpu_quota gagal diimpor; kuota VRAM hanya via watchdog."
        fi
    else
        echo "⚠️ /opt/ai_env tidak ditemukan; kuota VRAM GPU Boost belum dipasang."
    fi
fi

# 3.2 Pasang Jupyter AI + provider Gemini per-user (chat sidebar JupyterLab)
JUPYTER_AI_VERSION="${JUPYTER_AI_VERSION:-2.31.7}"
AI_ENV_PIP="/opt/ai_env/bin/pip"
if [ -x "$AI_ENV_PIP" ] && [ -d "lab_gemini_ai_pkg" ]; then
    echo "🤖 Memeriksa Jupyter AI ${JUPYTER_AI_VERSION} & provider Gemini..."
    AI_CONSTRAINTS="/tmp/lab_ai_constraints.txt"
    # Kunci versi paket yang sudah ada agar pemasangan Jupyter AI tidak
    # menaikkan pydantic/jupyter_server/langchain yang dipakai environment lain.
    "$AI_ENV_PIP" freeze 2>/dev/null \
        | grep -viE '^(jupyter[_-]ai([_-]magics)?|lab[_-]gemini[_-]ai)([=<>!~ ]|$)' \
        > "$AI_CONSTRAINTS" || true

    if ! "$AI_ENV_PIP" show jupyter-ai 2>/dev/null | grep -q "^Version: ${JUPYTER_AI_VERSION}$"; then
        sudo "$AI_ENV_PIP" install --quiet -c "$AI_CONSTRAINTS" "jupyter-ai==${JUPYTER_AI_VERSION}" \
            || { echo "❌ Gagal memasang Jupyter AI. Deploy dibatalkan."; exit 1; }
    fi

    # --force-reinstall agar perubahan kode provider ikut terpasang.
    sudo "$AI_ENV_PIP" install --quiet --no-deps --no-build-isolation --force-reinstall ./lab_gemini_ai_pkg \
        || { echo "❌ Gagal memasang provider lab-gemini. Deploy dibatalkan."; exit 1; }

    AI_CONFIG_DIR="/opt/ai_env/etc/jupyter"
    AI_CONFIG_FILE="$AI_CONFIG_DIR/jupyter_server_config.py"
    sudo mkdir -p "$AI_CONFIG_DIR"
    sudo touch "$AI_CONFIG_FILE"
    # Jupyter hanya memuat trait config dari jupyter_server_config.py, bukan
    # dari jupyter_server_config.d/*.json (file .d hanya untuk enable extension).
    sudo sed -i '/# === BEGIN LAB AI CHAT ===/,/# === END LAB AI CHAT ===/d' "$AI_CONFIG_FILE" 2>/dev/null || true
    if [ -f "config/lab_ai_config.py" ]; then
        sudo tee -a "$AI_CONFIG_FILE" >/dev/null < config/lab_ai_config.py
    else
        echo "❌ config/lab_ai_config.py tidak ditemukan. Deploy dibatalkan."
        exit 1
    fi
    # Bersihkan percobaan konfigurasi lama yang tidak pernah dibaca Jupyter.
    sudo rm -f "$AI_CONFIG_DIR/jupyter_server_config.d/50-lab-ai.json" 2>/dev/null || true
    if ! sudo /opt/ai_env/bin/python -m py_compile "$AI_CONFIG_FILE" >/dev/null 2>&1; then
        echo "❌ Konfigurasi Jupyter AI tidak valid. Deploy dibatalkan."
        exit 1
    fi

    # Migrasi konfigurasi pengguna lama dari gemini-2.5-flash ke gemini-3.8-flash
    for cfg in /home/*/.local/share/jupyter/jupyter_ai/config.json; do
        if [ -f "$cfg" ]; then
            sudo sed -i 's/"model_provider_id": *"lab-gemini:gemini-2\.5-flash"/"model_provider_id": "lab-gemini:gemini-3.8-flash"/g' "$cfg" 2>/dev/null || true
        fi
    done

    echo "✅ Jupyter AI dipasang; provider aktif: lab-gemini:gemini-3.8-flash"

    if ! /opt/ai_env/bin/python -c "
import logging
from importlib.metadata import entry_points, version
from jupyter_ai_magics.utils import get_lm_providers
assert version('jupyter-ai') == '${JUPYTER_AI_VERSION}'
assert any(ep.name == 'lab-gemini' for ep in entry_points().select(group='jupyter_ai.model_providers'))
providers = get_lm_providers(log=logging.getLogger('deploy'), restrictions={'allowed_providers': ['lab-gemini'], 'blocked_providers': None})
assert 'lab-gemini' in providers
" >/dev/null 2>&1; then
        echo "❌ Provider lab-gemini gagal dimuat. Deploy dibatalkan."
        exit 1
    fi
else
    echo "⚠️ /opt/ai_env atau lab_gemini_ai_pkg tidak ditemukan; chat Jupyter AI dilewati."
fi

# 4. Restart Dashboard di Port 8888
echo "🔄 Merestart Dashboard Monitoring..."
chmod +x backend/run.sh 2>/dev/null || true

DASHBOARD_UNIT=""
for unit in lab-dashboard.service panel-lab.service workstation-monitor.service; do
    if systemctl list-unit-files "$unit" 2>/dev/null | grep -q "^$unit"; then
        DASHBOARD_UNIT="$unit"
        break
    fi
done

if [ -n "$DASHBOARD_UNIT" ]; then
    sudo systemctl daemon-reload
    sudo systemctl enable "$DASHBOARD_UNIT" >/dev/null 2>&1 || true
    sudo systemctl restart "$DASHBOARD_UNIT"
    echo "✅ Service $DASHBOARD_UNIT berhasil direstart lewat systemd."
else
    echo "⚠️ Tidak ada unit systemd dashboard. Menjalankan backend lewat nohup (mode darurat)."
    sudo fuser -k 8888/tcp 2>/dev/null || true
    sleep 1
    nohup ./backend/run.sh > dashboard.log 2>&1 &
    echo "✅ Dashboard backend dijalankan di latar belakang (port 8888)."
fi

sleep 2
if ss -tuln 2>/dev/null | grep -q ":8888 " || netstat -tuln 2>/dev/null | grep -q ":8888 "; then
    echo "✅ Port 8888 AKTIF dan siap menerima koneksi."
else
    echo "⚠️ Port 8888 belum merespons. Mencoba restart ulang lewat systemd..."
    if [ -n "$DASHBOARD_UNIT" ]; then
        sudo systemctl restart "$DASHBOARD_UNIT"
    else
        sudo fuser -k 8888/tcp 2>/dev/null || true
        sleep 1
        nohup ./backend/run.sh > dashboard.log 2>&1 &
    fi
    sleep 3
    if ss -tuln 2>/dev/null | grep -q ":8888 " || netstat -tuln 2>/dev/null | grep -q ":8888 "; then
        echo "✅ Port 8888 AKTIF!"
    else
        echo "❌ Port 8888 masih belum aktif. Periksa status unit dan log:"
        if [ -n "$DASHBOARD_UNIT" ]; then
            sudo systemctl status "$DASHBOARD_UNIT" --no-pager -l | tail -n 20 || true
            sudo journalctl -u "$DASHBOARD_UNIT" -n 20 --no-pager || true
        else
            tail -n 20 dashboard.log 2>/dev/null || true
        fi
    fi
fi

# 4.5 Konfigurasi Cgroups v2 Slices
# Level 1 (Prioritas Skripsi) selalu diprioritaskan di atas Level 2:
# - CPU/IO weight 100x lebih tinggi + MemoryMin/Low agar tidak tersapu.
# - Level 2 CPU-only 60 slot; GPU 1 hanya untuk GPU Boost 3 slot (dijaga gpu_guard).
echo "⚙️ Mengonfigurasi systemd QoS Slices (L1 prioritas: 20 core/60G, L2: 24 core/95G cap)..."
sudo tee /etc/systemd/system/compute-level1.slice > /dev/null << 'EOF'
[Slice]
CPUQuota=2000%
CPUWeight=10000
IOWeight=10000
MemoryMin=16G
MemoryLow=32G
MemoryHigh=55G
MemoryMax=60G
EOF

sudo tee /etc/systemd/system/compute-level2.slice > /dev/null << 'EOF'
[Slice]
CPUQuota=2400%
CPUWeight=100
IOWeight=100
MemoryHigh=85G
MemoryMax=95G
EOF
sudo systemctl daemon-reload

# Terapkan juga ke slice yang sedang aktif tanpa menunggu reboot.
sudo systemctl set-property compute-level1.slice \
    CPUQuota=2000% CPUWeight=10000 IOWeight=10000 \
    MemoryMin=16G MemoryLow=32G MemoryHigh=55G MemoryMax=60G 2>/dev/null || true
sudo systemctl set-property compute-level2.slice \
    CPUQuota=2400% CPUWeight=100 IOWeight=100 \
    MemoryHigh=85G MemoryMax=95G 2>/dev/null || true

# 4.6 Pastikan akses hardware GPU (compute mode DEFAULT, grup video, render & device permissions)
echo "🎮 Memeriksa & mengonfigurasi izin akses hardware GPU untuk pengguna..."
if command -v nvidia-smi &>/dev/null; then
    sudo nvidia-smi -c DEFAULT || true
fi
# Matikan daemon MPS jika pernah aktif agar RTX 5060 Ti kembali ke mode sharing normal
echo quit | nvidia-cuda-mps-control 2>/dev/null || true
sudo rm -rf /tmp/nvidia-mps /tmp/nvidia-log 2>/dev/null || true

for u in $(cut -d: -f1 /etc/passwd | grep -E '^m[0-9]+'); do
    sudo usermod -aG video,render "$u" 2>/dev/null || true
done
sudo chmod 666 /dev/nvidia* /dev/nvidia-uvm* 2>/dev/null || true

# 4.7 Pastikan direktori bersama /home/dataset_shared dan pintasan (symlink) untuk setiap akun
echo "📁 Memeriksa direktori bersama /home/dataset_shared & sinkronisasi pintasan..."
sudo mkdir -p /home/dataset_shared
sudo chmod 755 /home/dataset_shared

for user_dir in /home/m[0-9]* /home/training* /home/labriset; do
    if sudo test -d "$user_dir"; then
        u=$(basename "$user_dir")
        if ! sudo test -e "$user_dir/dataset_shared"; then
            sudo ln -s /home/dataset_shared "$user_dir/dataset_shared" || true
            sudo chown -h "$u:$u" "$user_dir/dataset_shared" 2>/dev/null || true
        fi
    fi
done

# 5. Konfigurasi JupyterHub & Idle Culler
JH_CONFIG="/opt/jupyterhub/etc/jupyterhub_config.py"
if [ ! -f "$JH_CONFIG" ]; then
    JH_CONFIG="/etc/jupyterhub/jupyterhub_config.py"
fi

if [ -f "$JH_CONFIG" ]; then
    echo "⚙️ Memeriksa konfigurasi JupyterHub di $JH_CONFIG..."
    
    # 5.1 Pastikan jupyterhub-idle-culler terinstall (Mengatasi PEP 668 externally-managed-environment pada Ubuntu 24.04/Debian 12)
    echo "📦 Memeriksa modul jupyterhub-idle-culler..."
    if [ -x "/opt/jupyterhub/bin/pip" ]; then
        sudo /opt/jupyterhub/bin/pip install --quiet --break-system-packages jupyterhub-idle-culler 2>/dev/null \
            || sudo /opt/jupyterhub/bin/pip install --quiet jupyterhub-idle-culler 2>/dev/null || true
    fi

    # Cek apakah modul sudah dapat diimpor oleh Python sistem
    if ! python3 -c "import jupyterhub_idle_culler" &>/dev/null; then
        if command -v pip3 &> /dev/null; then
            sudo pip3 install --quiet --break-system-packages jupyterhub-idle-culler 2>/dev/null \
                || sudo pip3 install --quiet jupyterhub-idle-culler 2>/dev/null \
                || sudo apt-get install -y python3-jupyterhub-idle-culler 2>/dev/null \
                || true
        fi
    fi

    # 5.2 Pastikan jupyter-resource-usage terinstall untuk menampilkan RAM & CPU Live di Status Bar JupyterLab
    echo "📊 Memeriksa & menginstall jupyter-resource-usage (Status Bar Live RAM & CPU)..."
    if [ -x "/opt/jupyterhub/bin/pip" ]; then
        sudo /opt/jupyterhub/bin/pip install --quiet --break-system-packages jupyter-resource-usage 2>/dev/null \
            || sudo /opt/jupyterhub/bin/pip install --quiet jupyter-resource-usage 2>/dev/null || true
    fi
    if command -v pip3 &> /dev/null; then
        sudo pip3 install --quiet --break-system-packages jupyter-resource-usage 2>/dev/null \
            || sudo pip3 install --quiet jupyter-resource-usage 2>/dev/null || true
    fi

    # Konfigurasi system-wide jupyter-resource-usage agar otomatis membaca cgroups dan menampilkan indikator CPU & RAM
    sudo mkdir -p /etc/jupyter
    sudo tee /etc/jupyter/jupyter_server_config.py > /dev/null << 'EOF_RES'
c.ServerApp.jpserver_extensions = {
    'jupyter_resource_usage': True
}
c.ResourceUseDisplay.track_cpu_percent = True
c.ResourceUseDisplay.enable_menu = True
EOF_RES
    sudo cp -f /etc/jupyter/jupyter_server_config.py /etc/jupyter/jupyter_notebook_config.py 2>/dev/null || true
    if [ -d "/opt/jupyterhub" ]; then
        sudo mkdir -p /opt/jupyterhub/etc/jupyter 2>/dev/null || true
        sudo cp -f /etc/jupyter/jupyter_server_config.py /opt/jupyterhub/etc/jupyter/ 2>/dev/null || true
    fi

    # Aktifkan extension secara eksplisit di environment Python sistem & JupyterHub
    echo "⚙️ Mengaktifkan extension jupyter-resource-usage..."
    if [ -x "/opt/jupyterhub/bin/jupyter" ]; then
        sudo /opt/jupyterhub/bin/jupyter server extension enable --py jupyter_resource_usage --sys-prefix 2>/dev/null || true
        sudo /opt/jupyterhub/bin/jupyter serverextension enable --py jupyter_resource_usage --sys-prefix 2>/dev/null || true
        sudo /opt/jupyterhub/bin/jupyter labextension enable @jupyter-server/resource-usage 2>/dev/null || true
    fi
    if command -v jupyter &> /dev/null; then
        sudo jupyter server extension enable --py jupyter_resource_usage --sys-prefix 2>/dev/null || true
        sudo jupyter serverextension enable --py jupyter_resource_usage --sys-prefix 2>/dev/null || true
        sudo jupyter labextension enable @jupyter-server/resource-usage 2>/dev/null || true
    fi

    # 5.3 Bersihkan konfigurasi versi lama agar tidak terjadi duplikasi
    sudo sed -i '/# === BEGIN SIMTIK & QoS CONFIG ===/,/# === END SIMTIK & QoS CONFIG ===/d' "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i '/# =* INTEGRASI OTENTIKASI SIMTIK UMPO/,+35d' "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i '/jupyterhub_simtik_auth/d' "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i '/c.JupyterHub.authenticator_class = SimtikAuthenticator/d' "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i '/c.Spawner.pre_spawn_hook = simtik_pre_spawn_hook/d' "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i '/c.Spawner.post_stop_hook = simtik_post_stop_hook/d' "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i '/c.JupyterHub.shutdown_on_logout = True/d' "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i '/jupyterhub_idle_culler/d' "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i "/'name': 'idle-culler'/d" "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i '/c.JupyterHub.announcement/d' "$JH_CONFIG" 2>/dev/null || true
    # Bersihkan blok handler lama (telemetri & SSO) agar tidak dobel dengan blok terkelola
    sudo sed -i '/^# PROXY API TELEMETRI SISWA KE PANEL-LAB/,/^]$/d' "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i '/^from tornado import web, httpclient$/d' "$JH_CONFIG" 2>/dev/null || true
    sudo sed -i '/^c.JupyterHub.extra_handlers = \[$/,/^]$/d' "$JH_CONFIG" 2>/dev/null || true
    
    echo "📝 Menambahkan hook SIMTIK, Single-Device Policy, & Idle Culler ke $JH_CONFIG..."
    sudo tee -a "$JH_CONFIG" > /dev/null << 'EOF'

# === BEGIN SIMTIK & QoS CONFIG ===
# ========================================================
# INTEGRASI OTENTIKASI SIMTIK UMPO & DYNAMIC QoS LAB AI
# ========================================================
import sys
sys.path.append("/home/public/web/panel-lab")
from jupyterhub_simtik_auth import (
    SimtikAuthenticator,
    simtik_pre_spawn_hook,
    simtik_post_stop_hook,
    MiraiGridSSOHandler,
    UserTelemetryProxyHandler,
    GeminiKeyHandler,
)

c.JupyterHub.authenticator_class = SimtikAuthenticator
c.Spawner.pre_spawn_hook = simtik_pre_spawn_hook
c.Spawner.post_stop_hook = simtik_post_stop_hook
c.JupyterHub.shutdown_on_logout = True

# Handler tambahan: telemetri (proxy internal), API key Gemini per user, dan SSO MiraiGrid.
c.JupyterHub.extra_handlers = [
    (r"/api/user-telemetry/([^/]+)", UserTelemetryProxyHandler),
    (r"/api/gemini-key", GeminiKeyHandler),
    (r"/sso/miraigrid", MiraiGridSSOHandler),
]

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

    # 5.3 Bersihkan template login & tanamkan Pop-up Modal Resource Monitor ke antarmuka JupyterLab workspace
    echo "📢 Menjalankan sanitasi template login & konfigurasi Workstation Monitor..."
    chmod +x inject_jupyter_modal.py 2>/dev/null || true
    sudo python3 inject_jupyter_modal.py || python3 inject_jupyter_modal.py || true

    # 5.4 Validasi modul & konfigurasi sebelum restart (cegah outage)
    if ! sudo /opt/ai_env/bin/python -c "import sys; sys.path.insert(0, '/home/public/web/panel-lab'); import jupyterhub_simtik_auth" >/dev/null 2>&1; then
        echo "❌ Modul jupyterhub_simtik_auth gagal diimpor. Restart JupyterHub DIBATALKAN."
        exit 1
    fi
    if ! sudo python3 -m py_compile "$JH_CONFIG" >/dev/null 2>&1; then
        echo "❌ jupyterhub_config.py mengandung kesalahan sintaks. Restart JupyterHub DIBATALKAN."
        exit 1
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

    # Segarkan notebook server single-user yang sedang berjalan agar segera memuat extension baru
    echo "🔄 Menyegarkan proses single-user notebook server yang aktif..."
    sudo pkill -f 'jupyterhub-singleuser' 2>/dev/null || true
else
    echo "⚠️ File jupyterhub_config.py tidak ditemukan di path default. Silakan cek lokasinya."
fi

# 6. Perbarui konfigurasi Nginx Reverse Proxy jika Nginx terpasang
if command -v nginx &>/dev/null && [ -f "nginx/labai_local.conf" ]; then
    echo "🌐 Memperbarui konfigurasi Nginx Reverse Proxy..."
    sudo cp nginx/labai_local.conf /etc/nginx/sites-available/labai.conf 2>/dev/null || true
    sudo ln -sf /etc/nginx/sites-available/labai.conf /etc/nginx/sites-enabled/labai.conf 2>/dev/null || true
    if sudo nginx -t 2>/dev/null; then
        sudo systemctl reload nginx 2>/dev/null || true
        echo "✅ Nginx Reverse Proxy berhasil dimuat ulang."
    fi
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

