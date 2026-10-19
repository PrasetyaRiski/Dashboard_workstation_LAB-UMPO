#!/bin/bash
# ==============================================================================
# Script Peningkatan Swap Memory ke 32 GB pada NVMe SSD (Lab AI UMPO)
# Memberikan safety net RAM 128 GB untuk 30 mahasiswa komputasi serentak.
# ==============================================================================
set -e

if [ "$EUID" -ne 0 ]; then
  echo "Error: Skrip ini harus dijalankan dengan hak akses root / sudo."
  echo "Gunakan: sudo bash scripts/setup_swap_32g.sh"
  exit 1
fi

echo "=== 1. Memeriksa Status Swap Saat Ini ==="
swapon --show || true
free -h

SWAP_TARGET="/swap.img"
echo ""
echo "=== 2. Menonaktifkan Swap Lama ($SWAP_TARGET) ==="
swapoff "$SWAP_TARGET" 2>/dev/null || swapoff -a 2>/dev/null || true

echo "=== 3. Mengalokasikan Swap File 32 GB pada NVMe SSD ==="
if command -v fallocate >/dev/null 2>&1; then
  fallocate -l 32G "$SWAP_TARGET"
else
  dd if=/dev/zero of="$SWAP_TARGET" bs=1G count=32 status=progress
fi

echo "=== 4. Mengatur Permission Keamanan (chmod 600) ==="
chmod 600 "$SWAP_TARGET"

echo "=== 5. Format Swap Signature ==="
mkswap "$SWAP_TARGET"

echo "=== 6. Mengaktifkan Swap 32 GB ==="
swapon "$SWAP_TARGET"

echo "=== 7. Memastikan Konfigurasi Persisten di /etc/fstab ==="
if ! grep -q "$SWAP_TARGET" /etc/fstab; then
  echo "$SWAP_TARGET none swap sw 0 0" >> /etc/fstab
fi

# Optimasi swappiness: jangan swap agresif jika RAM 128GB masih banyak
sysctl vm.swappiness=10
if ! grep -q "vm.swappiness" /etc/sysctl.conf; then
  echo "vm.swappiness=10" >> /etc/sysctl.conf
fi

echo ""
echo "=== SELESAI: Swap Berhasil Ditingkatkan ke 32 GB ==="
free -h
swapon --show
