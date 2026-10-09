#!/bin/bash
# setup_mps_gpu1.sh
# Skrip untuk mengaktifkan NVIDIA MPS (Multi-Process Service) pada GPU 1
# Berguna untuk sharing VRAM dan mengefisienkan context switching untuk user Level 2

# Pastikan script dijalankan sebagai root
if [ "$EUID" -ne 0 ]; then
  echo "Harap jalankan sebagai root (sudo)"
  exit 1
fi

echo "=== Mengonfigurasi NVIDIA MPS untuk GPU 1 ==="

# Set Compute Mode ke EXCLUSIVE_PROCESS (direkomendasikan untuk MPS)
nvidia-smi -i 1 -c EXCLUSIVE_PROCESS

# Export CUDA_VISIBLE_DEVICES ke GPU 1
export CUDA_VISIBLE_DEVICES=1

# Tentukan direktori pipe dan log untuk MPS
export CUDA_MPS_PIPE_DIRECTORY=/tmp/nvidia-mps
export CUDA_MPS_LOG_DIRECTORY=/tmp/nvidia-log

# Buat direktori jika belum ada
mkdir -p /tmp/nvidia-mps
mkdir -p /tmp/nvidia-log
chmod 777 /tmp/nvidia-mps
chmod 777 /tmp/nvidia-log

# Start daemon MPS
nvidia-cuda-mps-control -d

echo "✅ NVIDIA MPS daemon berhasil dijalankan untuk GPU 1."
echo "Untuk mematikan MPS, jalankan: echo quit | nvidia-cuda-mps-control"
echo "Pastikan Environment Variable CUDA_MPS_PINNED_DEVICE_MEM_LIMIT sudah diset di JupyterHub Spawner."
