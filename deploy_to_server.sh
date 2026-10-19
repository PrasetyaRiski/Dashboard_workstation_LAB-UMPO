#!/bin/bash
# ==============================================================================
# Script Sinkronisasi & Deploy dari Workspace Lokal ke Server Lab
# ==============================================================================

set -e

echo "🚀 [1/3] Memeriksa status Git lokal..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️ Ada perubahan lokal yang belum di-commit. Silakan commit terlebih dahulu:"
    echo "   git add . && git commit -m 'pesan commit'"
    exit 1
fi

echo "📤 [2/3] Mendorong commit ke GitHub & Server..."
git push origin main
git push server main || true

echo "🔄 [3/3] Menjalankan deploy & restart dashboard di server lab..."
ssh lab-umpo "bash /home/public/web/panel-lab/deploy_simtik.sh"

echo "✅ Deploy selesai! Dashboard aktif di http://76.76.76.188:8888"
