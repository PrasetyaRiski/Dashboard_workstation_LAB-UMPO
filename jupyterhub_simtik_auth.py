"""
JupyterHub SIMTIK Authenticator & Dynamic QoS Spawner Hook (v4)

- Akun sistem (labriset, training1-10, edy, labadmin) -> password Linux (PAM)
- Mahasiswa (NIM) -> diverifikasi ke SIMTIK UMPO
- NIM murni angka tidak valid sebagai username Linux/systemd, sehingga akun
  Linux/Jupyter mahasiswa memakai prefix "m" (contoh: NIM 21533045 -> m21533045).
  Database dashboard tetap memakai NIM asli.
"""

import os
import sys
import pwd
import subprocess
import logging
import asyncio
from jupyterhub.auth import Authenticator

for _p in ("/home/public/web/backend", "/home/public/web/panel-lab/backend",
           os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")):
    if os.path.isdir(_p) and _p not in sys.path:
        sys.path.insert(0, _p)
        break

logger = logging.getLogger("jupyterhub_simtik")

USER_PREFIX = "m"
SYSTEM_ACCOUNTS = {"labriset", "edy", "labadmin"}
LEVEL1_SYSTEM = {"labriset"}


def is_system_account(name: str) -> bool:
    return name in SYSTEM_ACCOUNTS or (name.startswith("training") and name[8:].isdigit())


def nim_to_username(nim: str) -> str:
    return f"{USER_PREFIX}{nim}"


def username_to_nim(username: str) -> str:
    if username.startswith(USER_PREFIX) and username[len(USER_PREFIX):].isdigit():
        return username[len(USER_PREFIX):]
    return username


def ensure_linux_user(username: str) -> bool:
    try:
        pwd.getpwnam(username)
        return True
    except KeyError:
        pass
    cmd = ["useradd", "-m", "-s", "/bin/bash", username]
    if os.geteuid() != 0:
        cmd = ["sudo", "-n"] + cmd
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        logger.error(f"useradd {username} gagal ({res.returncode}): {res.stderr.strip()}")
        return False
    logger.info(f"User Linux {username} berhasil dibuat.")
    return True


def _pam_check(username: str, password: str) -> bool:
    import pamela
    try:
        pamela.authenticate(username, password, service="login")
        return True
    except Exception as e:
        logger.warning(f"PAM menolak {username}: {e}")
        return False


class SimtikAuthenticator(Authenticator):

    async def authenticate(self, handler, data):
        username = (data.get("username") or "").strip().lower()
        password = data.get("password") or ""
        if not username or not password:
            return None

        try:
            # 1) Akun sistem lab -> password Linux
            if is_system_account(username):
                ok = await asyncio.to_thread(_pam_check, username, password)
                return username if ok else None

            # Izinkan mahasiswa mengetik "m21533045" maupun "21533045"
            nim = username_to_nim(username)
            if not nim.isdigit():
                logger.warning(f"Username tidak dikenal: {username}")
                return None

            # 2) Mahasiswa -> SIMTIK
            from app.simtik_auth import verify_simtik_credentials
            is_valid, msg, user_data = await asyncio.to_thread(verify_simtik_credentials, nim, password)
            if not is_valid:
                logger.warning(f"SIMTIK menolak NIM {nim}: {msg}")
                return None

            # 3) Sinkron ke DB dashboard (tidak boleh menggagalkan login)
            try:
                from app.db import get_or_create_user
                rec = get_or_create_user(nim, user_data.get("nama"))
                if rec and not rec.get("is_active", True):
                    logger.warning(f"NIM {nim} diblokir admin.")
                    return None
            except Exception as e:
                logger.warning(f"Sinkron DB gagal (diabaikan): {e}")

            # 4) Akun Linux untuk SystemdSpawner
            linux_user = nim_to_username(nim)
            if not ensure_linux_user(linux_user):
                return None

            logger.info(f"Login SIMTIK sukses: NIM {nim} -> {linux_user}")
            return linux_user
        except Exception:
            logger.exception("Error tak terduga di SimtikAuthenticator.authenticate")
            return None


def simtik_pre_spawn_hook(spawner):
    username = spawner.user.name
    priority = username in LEVEL1_SYSTEM
    if not priority and not is_system_account(username):
        try:
            from app.db import is_user_priority
            priority = is_user_priority(username_to_nim(username))
        except Exception as e:
            logger.warning(f"Cek prioritas gagal untuk {username}: {e}")

    if priority:
        logger.info(f"[QoS] {username} -> LEVEL 1 (20 core, 70G, GPU 0)")
        spawner.unit_extra_properties = {"Slice": "compute-level1.slice"}
        spawner.cpu_limit = 20.0
        spawner.mem_limit = "70G"
        spawner.environment = {"OMP_NUM_THREADS": "20", "OPENBLAS_NUM_THREADS": "20",
                               "CUDA_VISIBLE_DEVICES": "0"}
    else:
        logger.info(f"[QoS] {username} -> LEVEL 2 (2 core, 3G, GPU 1)")
        spawner.unit_extra_properties = {"Slice": "compute-level2.slice"}
        spawner.cpu_limit = 2.0
        spawner.mem_limit = "3G"
        spawner.environment = {"OMP_NUM_THREADS": "2", "OPENBLAS_NUM_THREADS": "2",
                               "CUDA_VISIBLE_DEVICES": "1"}
