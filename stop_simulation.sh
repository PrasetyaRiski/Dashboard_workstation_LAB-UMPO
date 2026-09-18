#!/bin/bash
# Hentikan semua proses komputasi uji coba jika ada yang tertinggal
echo "Menghentikan semua proses uji coba AI Lab..."
sudo pkill -f test_simulation.py 2>/dev/null || true
sudo pkill -u labriset -f python3 2>/dev/null || true
for i in {1..10}; do
  sudo pkill -u training$i -f python3 2>/dev/null || true
done
echo "✅ Semua proses uji coba mahasiswa & riset telah dibersihkan."
