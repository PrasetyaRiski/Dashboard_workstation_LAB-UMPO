"""
JupyterHub SIMTIK Authenticator & Dynamic QoS Spawner Hook
Letakkan file ini di direktori konfigurasi JupyterHub di server:
/home/public/web/jupyterhub_simtik_auth.py

Cara Mengaktifkan di jupyterhub_config.py:
--------------------------------------------
import sys
sys.path.append("/home/public/web")
from jupyterhub_simtik_auth import SimtikAuthenticator, simtik_pre_spawn_hook

c.JupyterHub.authenticator_class = SimtikAuthenticator
c.Spawner.pre_spawn_hook = simtik_pre_spawn_hook
--------------------------------------------
"""

import os
import sys
import pwd
import subprocess
import logging
from jupyterhub.auth import Authenticator
from tornado import gen

# Tambahkan path backend ke sys.path agar bisa memanggil simtik_auth dan db
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

from app.simtik_auth import verify_simtik_credentials
from app.db import get_or_create_user, is_user_priority

logger = logging.getLogger("jupyterhub_simtik")


def ensure_linux_user(username: str):
    """
    Memastikan akun Linux lokal ada untuk NIM tersebut agar JupyterHub bisa membuat workspace.
    Jika belum ada, buatkan otomatis user dengan home directory.
    """
    try:
        pwd.getpwnam(username)
    except KeyError:
        logger.info(f"Membuat user Linux lokal untuk mahasiswa NIM: {username}")
        try:
            # Buat user baru tanpa password, grup users
            subprocess.run(
                ["sudo", "useradd", "-m", "-s", "/bin/bash", "-g", "users", username],
                check=True,
                capture_output=True
            )
            logger.info(f"User Linux {username} berhasil dibuat.")
        except Exception as e:
            logger.error(f"Gagal membuat user Linux untuk {username}: {e}")


class SimtikAuthenticator(Authenticator):
    """
    Authenticator kustom JupyterHub yang memverifikasi kredensial ke SIMTIK UMPO
    """

    @gen.coroutine
    def authenticate(self, handler, data):
        nim = data.get("username", "").strip()
        password = data.get("password", "").strip()

        if not nim or not password:
            return None

        # 1. Kasus Akun Sistem Lab (labriset, edy, training1-10) -> gunakan Linux PAM lokal
        SYSTEM_ACCOUNTS = {"labriset", "edy", "root", "admin", "labadmin"}
        if nim in SYSTEM_ACCOUNTS or nim.startswith("training"):
            try:
                import pamela
                pamela.authenticate(nim, password)
                logger.info(f"Login sukses via Linux PAM: Akun Sistem {nim}")
                return nim
            except Exception as e:
                logger.warning(f"Login PAM ditolak untuk {nim}: {e}")
                return None

        # 2. Kasus Mahasiswa -> Verifikasi kredensial ke SIMTIK UMPO secara live
        is_valid, msg, user_data = verify_simtik_credentials(nim, password)
        if not is_valid:
            logger.warning(f"Login ditolak untuk NIM {nim}: {msg}")
            return None

        # 3. Sinkronisasi ke Database User Management Lab
        nama = user_data.get("nama", f"Mahasiswa {nim}")
        user_record = get_or_create_user(nim, nama)

        # Cek apakah akun aktif
        if not user_record.get("is_active", True):
            logger.warning(f"Akses ditolak: Akun NIM {nim} dinonaktifkan oleh Admin.")
            return None

        # 3. Pastikan user Linux lokal ada untuk Spawner
        ensure_linux_user(nim)

        logger.info(f"Login sukses: Mahasiswa NIM {nim} ({nama})")
        return nim


def simtik_pre_spawn_hook(spawner):
    """
    Hook yang dijalankan sebelum server notebook mahasiswa dinyalakan.
    Menginjeksi jatah CPU, RAM, GPU, dan Systemd Slice (Cgroups v2).
    """
    username = spawner.user.name

    # Akun master labriset atau mahasiswa yang di-boost berhak atas Level 1
    is_priority = (username == "labriset") or is_user_priority(username)

    if is_priority:
        # ==========================================
        # JATAH PROFIL PRIORITAS (LEVEL 1 / LABRISET)
        # ==========================================
        logger.info(f"[DYNAMIC QoS] User {username} dialokasikan ke LEVEL 1 PRIORITAS (20 Core, 70G, GPU 0)")
        spawner.unit_extra_properties = {
            'Slice': 'level1.slice',
            'MemorySwapMax': '0',
        }
        spawner.cpu_limit = 20.0                          # 20 Core CPU
        spawner.mem_limit = "70G"                         # 70 GB RAM
        spawner.environment = {
            'OMP_NUM_THREADS': '20',
            'OPENBLAS_NUM_THREADS': '20',
            'CUDA_VISIBLE_DEVICES': '0',                  # GPU 0 (Full 16GB VRAM)
        }
    else:
        # ==========================================
        # JATAH PROFIL NORMAL (LEVEL 2 / PRAKTIKAN)
        # ==========================================
        logger.info(f"[DYNAMIC QoS] User {username} dialokasikan ke LEVEL 2 NORMAL (2 Core, 3G, GPU 1)")
        spawner.unit_extra_properties = {
            'Slice': 'level2.slice',
            'MemorySwapMax': '0',
        }
        spawner.cpu_limit = 2.0                           # 2 Core CPU
        spawner.mem_limit = "3G"                          # 3 GB RAM (3072 MB)
        spawner.environment = {
            'OMP_NUM_THREADS': '2',
            'OPENBLAS_NUM_THREADS': '2',
            'CUDA_VISIBLE_DEVICES': '1',                  # GPU 1 (Shared ~4.8GB VRAM)
        }
