#!/usr/bin/env python3
"""
Simulasi Pengujian Komputasi Serentak Seluruh User (11 Akun)
Seimbang untuk pengujian CPU, RAM (Cgroup), dan GPU (CUDA VRAM).
Lab Komputasi AI Teknik Informatika - Universitas Muhammadiyah Ponorogo

- labriset (GPU 0): Beban riset (~15 GB RAM, ~10 Core CPU, ~6.5 GB VRAM)
- training1 s.d training10 (GPU 1): Beban praktikum (~1.2 GB RAM, ~1.5 Core CPU, ~1.2 GB VRAM/user)
Durasi Default: 120 detik
"""
import os
import sys
import time
import signal
import subprocess

DURATION = 120  # Durasi pengujian dalam detik

# Skrip untuk training praktikan (GPU 1, CPU 2 Core, RAM 3 GB limit)
TRAINING_SCRIPT = f"""
import torch, time, os
import numpy as np

# 1. Alokasi Host RAM (~1.2 GB, dalam batas kuota 3 GB cgroup)
try:
    ram_buffer = np.ones((1200 * 1024 * 1024,), dtype=np.uint8)
    ram_buffer += 1
except Exception:
    ram_buffer = None

# 2. Alokasi GPU VRAM (~1.2 GB pada GPU 1)
device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
gpu_tensors = [torch.randn(3000, 3000, device=device) for _ in range(3)]

# 3. Alokasi CPU Tensors untuk komputasi multi-thread CPU
torch.set_num_threads(2)
cpu_t1 = torch.randn(1100, 1100)
cpu_t2 = torch.randn(1100, 1100)

start = time.time()
while time.time() - start < {DURATION}:
    # Beban CPU
    _ = torch.matmul(cpu_t1, cpu_t2)
    # Beban GPU
    for t in gpu_tensors:
        _ = torch.matmul(t, t)
    time.sleep(0.03)
"""

# Skrip untuk riset dosen / TA (GPU 0, CPU 20 Core, RAM 70 GB limit)
RISET_SCRIPT = f"""
import torch, time, os
import numpy as np

# 1. Alokasi Host RAM (~15 GB, dalam batas kuota 70 GB cgroup)
try:
    ram_buffer = np.ones((15 * 1024 * 1024 * 1024,), dtype=np.uint8)
    ram_buffer += 1
except Exception:
    ram_buffer = None

# 2. Alokasi GPU VRAM (~6.5 GB pada GPU 0)
device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
gpu_tensors = [torch.randn(4500, 4500, device=device) for _ in range(8)]

# 3. Alokasi CPU Tensors untuk komputasi multi-thread CPU (10 threads)
torch.set_num_threads(10)
cpu_t1 = torch.randn(2000, 2000)
cpu_t2 = torch.randn(2000, 2000)

start = time.time()
while time.time() - start < {DURATION}:
    # Beban CPU intensif
    _ = torch.matmul(cpu_t1, cpu_t2)
    # Beban GPU intensif
    for t in gpu_tensors:
        _ = torch.matmul(t, t)
    time.sleep(0.02)
"""

def main():
    if os.geteuid() != 0:
        print("[!] Harap jalankan dengan sudo: sudo python3 test_simulation.py")
        sys.exit(1)

    print("=" * 72)
    print(" 🚀 PENGUJIAN KOMPUTASI LENGKAP (CPU • RAM • GPU) 11 AKUN")
    print("    Lab Komputasi AI Teknik Informatika - Universitas Muhammadiyah Ponorogo")
    print(f"    Durasi Pengujian : {DURATION} Detik")
    print("=" * 72)

    processes = []

    # 1. Jalankan untuk labriset (GPU 0, High CPU & RAM)
    print("\n[1/2] Menjalankan Komputasi Riset: labriset (GPU 0, 10 Core CPU, 15 GB RAM)...")
    cmd_riset = [
        "sudo", "-u", "labriset",
        "env", "CUDA_VISIBLE_DEVICES=0",
        "/opt/ai_env/bin/python3", "-c", RISET_SCRIPT
    ]
    p_riset = subprocess.Popen(cmd_riset, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    processes.append(("labriset", "GPU 0", p_riset))
    print(f"      ✅ labriset berjalan di GPU 0 (PID: {p_riset.pid})")

    # 2. Jalankan untuk training1 s.d training10 (GPU 1, 2 Core CPU, 1.2 GB RAM)
    print("\n[2/2] Menjalankan Komputasi Praktikum: training1 - training10 (GPU 1, ~1.5 Core CPU, ~1.2 GB RAM)...")
    for i in range(1, 11):
        uname = f"training{i}"
        cmd_train = [
            "sudo", "-u", uname,
            "env", "CUDA_VISIBLE_DEVICES=1",
            "/opt/ai_env/bin/python3", "-c", TRAINING_SCRIPT
        ]
        p_train = subprocess.Popen(cmd_train, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        processes.append((uname, "GPU 1", p_train))
        print(f"      ✅ {uname} berjalan di GPU 1 (PID: {p_train.pid})")

    print("\n" + "=" * 72)
    print(" 🎉 SELURUH 11 PENGGUNA SEDANG BERJALAN SERENTAK (CPU + RAM + GPU)!")
    print(" 👉 Silakan BUKA DASHBOARD: http://76.76.76.188:8888")
    print(f" ⏳ Menghitung mundur {DURATION} detik (Tekan Ctrl+C untuk menghentikan)...")
    print("=" * 72)

    try:
        for remaining in range(DURATION, 0, -5):
            print(f"    [Sisa Waktu: {remaining:03d}s] Semua proses aktif (CPU, RAM, GPU)...")
            time.sleep(5)
    except KeyboardInterrupt:
        print("\n\n⚠️ Penghentian manual diterima. Menghentikan semua proses...")
    finally:
        for uname, gpu, p in processes:
            try:
                p.terminate()
            except Exception:
                pass
        print("✅ Seluruh proses pengujian telah dihentikan, RAM & VRAM dibersihkan.")

if __name__ == "__main__":
    main()
