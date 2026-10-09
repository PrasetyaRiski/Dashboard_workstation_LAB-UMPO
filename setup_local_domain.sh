#!/bin/bash
# ==============================================================================
# SCRIPT OTOMATIS: SETUP DOMAIN LOKAL & NGINX REVERSE PROXY LAB AI UMPO
# Menjalankan domain lokal (mDNS) & Nginx di server edy@ai (76.76.76.188)
# ==============================================================================

set -e

echo "=========================================================="
echo "🚀 MEMULAI INSTALASI DOMAIN LOKAL & NGINX REVERSE PROXY..."
echo "=========================================================="

# 1. Pastikan Nginx dan Avahi Daemon terpasang
echo "📦 1. Memeriksa paket Nginx dan Avahi..."
sudo apt-get update -qq
sudo apt-get install -y -qq nginx avahi-daemon

# 2. Atur Hostname Server menjadi 'labai'
echo "🏷️  2. Mengatur Hostname server menjadi 'labai'..."
sudo hostnamectl set-hostname labai 2>/dev/null || true

# 3. Konfigurasi Avahi Hosts (/etc/avahi/hosts) untuk domain .local
echo "📡 3. Mengonfigurasi broadcast mDNS (/etc/avahi/hosts)..."
SERVER_IP=$(hostname -I | awk '{print $1}')
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="76.76.76.188"
fi

sudo mkdir -p /etc/avahi
sudo tee /etc/avahi/hosts > /dev/null << EOF
$SERVER_IP  labai.local
$SERVER_IP  jupyter.labai.local
$SERVER_IP  dashboard.labai.local
EOF

sudo systemctl enable avahi-daemon --now
sudo systemctl restart avahi-daemon
echo "✅ mDNS Avahi aktif: domain *.local berhasil dibroadcast ke jaringan LAN."

# 4. Pasang Konfigurasi Nginx Reverse Proxy
echo "🌐 4. Memasang konfigurasi Nginx..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_CONF_SRC="$SCRIPT_DIR/nginx/labai_local.conf"

if [ ! -f "$NGINX_CONF_SRC" ]; then
    echo "❌ Berkas $NGINX_CONF_SRC tidak ditemukan!"
    exit 1
fi

# Salin konfigurasi ke /etc/nginx/sites-available/
sudo cp "$NGINX_CONF_SRC" /etc/nginx/sites-available/labai.conf

# Hapus default website Nginx lama jika ada
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Aktifkan konfigurasi labai.conf
sudo ln -sf /etc/nginx/sites-available/labai.conf /etc/nginx/sites-enabled/labai.conf

# Uji konfigurasi Nginx
echo "🔍 5. Memeriksa sintaks Nginx..."
sudo nginx -t

# Restart Nginx
echo "🔄 6. Merestart Nginx..."
sudo systemctl enable nginx --now
sudo systemctl restart nginx

echo "=========================================================="
echo "🎉 DOMAIN LOKAL BERHASIL DIKONFIGURASI!"
echo "=========================================================="
echo "Mahasiswa & Dosen sekarang bisa mengakses tanpa nomor IP & port:"
echo ""
echo "  📊 Dashboard Workstation : http://labai.local"
echo "  📓 JupyterLab Notebook    : http://jupyter.labai.local"
echo ""
echo "Alamat IP Fallback (Port 80):"
echo "  👉 http://$SERVER_IP      (Langsung membuka Dashboard)"
echo "=========================================================="
