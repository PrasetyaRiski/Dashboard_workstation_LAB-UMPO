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
import re
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

# Validasi ketat NIM menggunakan regex
NIM_REGEX = re.compile(r"^\d{8,15}$")


def extract_client_ip(handler) -> str:
    """Ekstrak IP client dari request handler Tornado secara aman (mendukung reverse proxy)."""
    try:
        if not handler or not getattr(handler, "request", None):
            return "127.0.0.1"
        req = handler.request
        headers = getattr(req, "headers", {})
        cf_ip = headers.get("CF-Connecting-IP")
        if cf_ip:
            return cf_ip.strip()
        x_real_ip = headers.get("X-Real-IP")
        if x_real_ip:
            return x_real_ip.strip()
        x_forwarded_for = headers.get("X-Forwarded-For")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        if getattr(req, "remote_ip", None):
            return req.remote_ip
    except Exception as e:
        logger.warning(f"Gagal mengekstrak client IP: {e}")
    return "unknown"


def is_user_process_running(linux_user: str) -> bool:
    """Memeriksa apakah notebook server atau kernel Jupyter pengguna sedang aktif berjalan."""
    try:
        # 1. Cek transient systemd service untuk SystemdSpawner
        res_sys = subprocess.run(
            ["systemctl", "is-active", "--quiet", f"jupyter-{linux_user}.service"],
            capture_output=True
        )
        if res_sys.returncode == 0:
            return True
    except Exception:
        pass

    try:
        # 2. Cek proses Linux yang sedang berjalan atas nama user tersebut
        res_pgrep = subprocess.run(
            ["pgrep", "-u", linux_user, "-f", "jupyter"],
            capture_output=True,
            text=True
        )
        if res_pgrep.returncode == 0 and res_pgrep.stdout.strip():
            return True
    except Exception:
        pass

    return False


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
    # useradd tanpa hak sudo
    cmd = ["useradd", "-m", "-s", "/bin/bash", username]
    if os.geteuid() != 0:
        cmd = ["sudo", "-n"] + cmd
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        logger.error(f"useradd {username} gagal ({res.returncode}): {res.stderr.strip()}")
        return False
    # Set permission home dir ke 0700 (akses pribadi saja)
    chmod_cmd = ["chmod", "0700", f"/home/{username}"]
    if os.geteuid() != 0:
        chmod_cmd = ["sudo", "-n"] + chmod_cmd
    subprocess.run(chmod_cmd)
    logger.info(f"User Linux {username} berhasil dibuat dengan akses terbatas.")
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
            # 1) Akun sistem lab -> password Linux (Whitelist ketat)
            if is_system_account(username):
                ok = await asyncio.to_thread(_pam_check, username, password)
                return username if ok else None

            # Izinkan mahasiswa mengetik "m21533045" maupun "21533045"
            nim = username_to_nim(username)
            if not NIM_REGEX.match(nim):
                logger.warning(f"Username ditolak (bukan akun sistem atau format NIM tidak valid): {username}")
                return None

            # 2) Mahasiswa -> SIMTIK
            from app.simtik_auth import verify_simtik_credentials
            is_valid, msg, user_data = await asyncio.to_thread(verify_simtik_credentials, nim, password)
            if not is_valid:
                logger.warning(f"SIMTIK menolak NIM {nim}: {msg}")
                return None

            # 3) Sinkron ke DB dashboard & Cek apakah user diblokir admin
            try:
                from app.db import get_or_create_user
                rec = get_or_create_user(nim, user_data.get("nama"))
                if rec and not rec.get("is_active", True):
                    logger.warning(f"NIM {nim} diblokir admin.")
                    from tornado import web
                    raise web.HTTPError(
                        403,
                        f"Akses Ditolak: Akun NIM {nim} sedang dinonaktifkan oleh Admin Lab. Silakan hubungi pengelola.",
                        reason=f"Akun NIM {nim} dinonaktifkan oleh Admin Lab"
                    )
            except Exception as e:
                if hasattr(e, "status_code"):
                    raise e
                logger.warning(f"Sinkron DB gagal (diabaikan): {e}")

            # 4) Enforce Single-Device / Single Active Session (Option 2)
            linux_user = nim_to_username(nim)
            client_ip = extract_client_ip(handler)

            try:
                from app.db import get_user_active_session, set_user_active_session
                session_info = get_user_active_session(nim)
                active_ip = session_info.get("active_ip") if session_info else None
                is_running = is_user_process_running(linux_user)

                # Jika proses notebook sedang aktif dan login dari perangkat/IP berbeda -> REJECT (403)
                if is_running and active_ip and active_ip != client_ip:
                    logger.warning(
                        f"[SingleSession] Penolakan login ganda: NIM {nim} aktif di IP {active_ip}, "
                        f"percobaan masuk dari IP {client_ip}."
                    )
                    from tornado import web
                    raise web.HTTPError(
                        403,
                        f"Akses Ditolak: Akun NIM {nim} sedang aktif digunakan di perangkat lain ({active_ip}). "
                        f"Silakan logout dari perangkat sebelumnya atau hubungi Asisten Lab untuk mereset sesi Anda.",
                        reason=f"Akun NIM {nim} sedang aktif di perangkat lain ({active_ip})"
                    )

                # Catat sesi aktif perangkat saat ini
                set_user_active_session(nim, client_ip)
                logger.info(f"[SingleSession] Sesi aktif tercatat untuk NIM {nim} (IP: {client_ip})")
            except Exception as e:
                if hasattr(e, "status_code"):
                    raise e
                logger.warning(f"Error verifikasi single-session (diabaikan agar login tetap jalan): {e}")

            # 5) Akun Linux untuk SystemdSpawner
            if not ensure_linux_user(linux_user):
                return None

            logger.info(f"Login SIMTIK sukses: NIM {nim} -> {linux_user} (IP: {client_ip})")
            return linux_user
        except Exception as e:
            if hasattr(e, "status_code"):
                raise e
            logger.exception("Error tak terduga di SimtikAuthenticator.authenticate")
            return None


def simtik_pre_spawn_hook(spawner):
    username = spawner.user.name
    priority = username in LEVEL1_SYSTEM
    if not priority and not is_system_account(username):
        nim = username_to_nim(username)
        # 1. Cek apakah akun aktif atau dinonaktifkan oleh Admin
        try:
            from app.db import is_user_active
            if not is_user_active(nim):
                from tornado import web
                logger.warning(f"Spawn server ditolak: NIM {nim} diblokir oleh admin.")
                raise web.HTTPError(403, f"Akses Ditolak: Akun NIM {nim} sedang dinonaktifkan oleh Admin Lab. Silakan hubungi pengelola.")
        except Exception as e:
            if hasattr(e, "status_code"):
                raise e
            logger.warning(f"Cek status aktif gagal untuk {username}: {e}")

        # 2. Cek status alokasi prioritas
        try:
            from app.db import is_user_priority
            priority = is_user_priority(nim)
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


def simtik_post_stop_hook(spawner):
    """
    Hook yang dijalankan secara otomatis saat server single-user berhenti
    (melalui logout, tombol stop server di control panel, maupun idle culler).
    Membersihkan active_ip di database sehingga pengguna dapat login di perangkat lain.
    """
    try:
        username = spawner.user.name
        if not is_system_account(username):
            nim = username_to_nim(username)
            from app.db import clear_user_active_session
            clear_user_active_session(nim)
            logger.info(f"[SingleSession] Server {username} dihentikan. Sesi aktif NIM {nim} berhasil dibebaskan.")
    except Exception as e:
        logger.warning(f"Error pada simtik_post_stop_hook untuk {spawner.user.name}: {e}")
