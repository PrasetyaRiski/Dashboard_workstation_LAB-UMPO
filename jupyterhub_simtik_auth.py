"""
JupyterHub SIMTIK Authenticator & Dynamic QoS Spawner Hook
Versi 3.0 (Bulletproof: Native Async, PAM Fallback, Auto Useradd, Exception Shield)
"""

import os
import sys
import pwd
import subprocess
import logging
from jupyterhub.auth import Authenticator

# Tambahkan path backend ke sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
for path_cand in [
    os.path.join(BASE_DIR, "backend"),
    os.path.join(BASE_DIR, "panel-lab", "backend"),
    "/home/public/web/backend",
    "/home/public/web/panel-lab/backend"
]:
    if os.path.exists(path_cand) and path_cand not in sys.path:
        sys.path.append(path_cand)

logger = logging.getLogger("jupyterhub_simtik")


def ensure_linux_user(username: str):
    """
    Memastikan akun Linux lokal ada untuk NIM mahasiswa agar SystemdSpawner bisa membuat workspace.
    """
    try:
        pwd.getpwnam(username)
        return True
    except KeyError:
        logger.info(f"Membuat user Linux lokal untuk mahasiswa: {username}")
        try:
            # Gunakan useradd standar tanpa parameter group kaku
            cmd = ["useradd", "-m", "-s", "/bin/bash", username]
            if os.geteuid() != 0:
                cmd = ["sudo"] + cmd
            res = subprocess.run(cmd, check=False, capture_output=True, text=True)
            if res.returncode == 0:
                logger.info(f"User Linux {username} berhasil dibuat.")
                return True
            else:
                logger.warning(f"useradd returned code {res.returncode}: {res.stderr}")
                return False
        except Exception as e:
            logger.error(f"Gagal memanggil useradd untuk {username}: {e}")
            return False


class SimtikAuthenticator(Authenticator):
    """
    Authenticator kustom JupyterHub dengan metode Native Async:
    1. Akun Sistem (labriset, edy, training1-10) -> Verifikasi via PAM Linux lokal
    2. Mahasiswa (NIM) -> Verifikasi via SIMTIK UMPO secara live
    """

    async def authenticate(self, handler, data):
        try:
            username = data.get("username", "").strip()
            password = data.get("password", "").strip()

            if not username or not password:
                return None

            # ==========================================================
            # 1. KASUS AKUN SISTEM LAB (labriset, edy, training1-10, dll)
            # ==========================================================
            SYSTEM_ACCOUNTS = {"labriset", "edy", "root", "admin", "labadmin"}
            if username in SYSTEM_ACCOUNTS or username.startswith("training"):
                try:
                    import pamela
                    pamela.authenticate(username, password)
                    logger.info(f"Login sukses via Linux PAM: Akun {username}")
                    return username
                except Exception as e:
                    logger.warning(f"Login PAM ditolak untuk {username}: {e}")
                    return None

            # ==========================================================
            # 2. KASUS MAHASISWA (NIM) -> Verifikasi ke SIMTIK UMPO
            # ==========================================================
            try:
                from app.simtik_auth import verify_simtik_credentials
                is_valid, msg, user_data = verify_simtik_credentials(username, password)
            except Exception as e:
                logger.error(f"Gagal memanggil modul verify_simtik_credentials: {e}")
                return None

            if not is_valid:
                logger.warning(f"Login SIMTIK ditolak untuk NIM {username}: {msg}")
                return None

            # 3. Sinkronisasi ke Database User Management Lab (Opsional / Non-blocking)
            try:
                from app.db import get_or_create_user
                nama = user_data.get("nama", f"Mahasiswa {username}")
                user_rec = get_or_create_user(username, nama)
                if user_rec and not user_rec.get("is_active", True):
                    logger.warning(f"Akses ditolak: Akun NIM {username} dinonaktifkan oleh Admin.")
                    return None
            except Exception as e:
                logger.warning(f"Gagal sinkronisasi DB (diabaikan agar login tetap jalan): {e}")

            # 4. Pastikan Akun Linux Lokal Ada untuk SystemdSpawner
            ensure_linux_user(username)

            logger.info(f"Login sukses: Mahasiswa NIM {username}")
            return username

        except Exception as e:
            logger.exception(f"Unhandled error in SimtikAuthenticator.authenticate: {e}")
            return None


def simtik_pre_spawn_hook(spawner):
    """
    Hook yang dijalankan sebelum server notebook mahasiswa dinyalakan.
    Menginjeksi jatah CPU, RAM, GPU, dan Systemd Slice (Cgroups v2).
    """
    try:
        username = spawner.user.name

        # Cek apakah user berhak atas Level 1 (Monster/Prioritas)
        is_priority = False
        if username in {"labriset", "edy", "labadmin"}:
            is_priority = True
        else:
            try:
                from app.db import is_user_priority
                is_priority = is_user_priority(username)
            except Exception as e:
                logger.warning(f"Gagal cek prioritas DB untuk {username}: {e}")
                is_priority = False

        if is_priority:
            # ==========================================
            # JATAH LEVEL 1 (PRIORITAS / LABRISET)
            # ==========================================
            logger.info(f"[DYNAMIC QoS] User {username} dialokasikan ke LEVEL 1 PRIORITAS (20 Core, 70G, GPU 0)")
            spawner.unit_extra_properties = {
                'Slice': 'compute-level1.slice',
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
            # JATAH LEVEL 2 (NORMAL / PRAKTIKAN)
            # ==========================================
            logger.info(f"[DYNAMIC QoS] User {username} dialokasikan ke LEVEL 2 NORMAL (2 Core, 3G, GPU 1)")
            spawner.unit_extra_properties = {
                'Slice': 'compute-level2.slice',
                'MemorySwapMax': '0',
            }
            spawner.cpu_limit = 2.0                           # 2 Core CPU
            spawner.mem_limit = "3G"                          # 3 GB RAM (3072 MB)
            spawner.environment = {
                'OMP_NUM_THREADS': '2',
                'OPENBLAS_NUM_THREADS': '2',
                'CUDA_VISIBLE_DEVICES': '1',                  # GPU 1 (Shared ~4.8GB VRAM)
            }
    except Exception as e:
        logger.exception(f"Unhandled error in simtik_pre_spawn_hook: {e}")
        # Fallback aman ke level 2
        spawner.unit_extra_properties = {'Slice': 'compute-level2.slice'}
        spawner.cpu_limit = 2.0
        spawner.mem_limit = "3G"
