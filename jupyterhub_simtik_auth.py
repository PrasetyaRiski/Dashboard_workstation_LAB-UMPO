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
import base64
import hashlib
import hmac
import json
import re
import time
import tornado.web
from jupyterhub.auth import Authenticator
from jupyterhub.handlers.base import BaseHandler
from jupyterhub.utils import url_path_join

for _p in ("/home/public/web/backend", "/home/public/web/panel-lab/backend",
           os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")):
    if os.path.isdir(_p) and _p not in sys.path:
        sys.path.insert(0, _p)
        break

logger = logging.getLogger("jupyterhub_simtik")

# Monkeypatch SystemdSpawner._expand_user_vars untuk mendukung list di unit_extra_properties (seperti DeviceAllow)
try:
    from systemdspawner import SystemdSpawner

    def _safe_expand_user_vars(self, string):
        if isinstance(string, (list, tuple)):
            return [_safe_expand_user_vars(self, s) for s in string]
        if isinstance(string, str):
            u = getattr(self, "user", None)
            uname = getattr(u, "name", "") if u else ""
            uid = getattr(u, "id", "") if u else ""
            return string.format(USERNAME=uname, USERID=uid)
        return string

    SystemdSpawner._expand_user_vars = _safe_expand_user_vars
except Exception as _patch_err:
    logger.warning(f"Gagal monkeypatch SystemdSpawner._expand_user_vars: {_patch_err}")

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


def is_user_process_running(handler, linux_user: str) -> bool:
    """
    Memeriksa secara komprehensif apakah server notebook atau proses pengguna sedang aktif:
    1. Cek state spawner di internal JupyterHub via handler
    2. Cek unit systemd transient SystemdSpawner (jupyter-{user}-singleuser.service)
    3. Cek proses OS via psutil (jupyterhub-singleuser / ipykernel)
    4. Cek proses OS via pgrep (jupyterhub-singleuser / ipykernel)
    """
    # 1. Cek internal JupyterHub Spawner state
    try:
        jh_user = None
        if handler and hasattr(handler, "find_user"):
            jh_user = handler.find_user(linux_user)
        if jh_user:
            spawner = getattr(jh_user, "spawner", None)
            if spawner and (getattr(spawner, "active", False) or getattr(spawner, "ready", False)):
                logger.info(f"[SessionCheck] {linux_user} terdeteksi aktif via JupyterHub spawner state.")
                return True
            if getattr(jh_user, "active", False):
                logger.info(f"[SessionCheck] {linux_user} terdeteksi aktif via JupyterHub user.active.")
                return True
    except Exception as e:
        logger.warning(f"Error checking JupyterHub user state for {linux_user}: {e}")

    # 2. Cek transient service systemd untuk SystemdSpawner
    try:
        units_to_check = [
            f"jupyter-{linux_user}-singleuser.service",
            f"jupyter-{linux_user}.service",
            f"jupyter-{linux_user}-singleuser",
            f"jupyter-{linux_user}"
        ]
        for unit in units_to_check:
            res = subprocess.run(
                ["systemctl", "is-active", "--quiet", unit],
                capture_output=True,
                timeout=2
            )
            if res.returncode == 0:
                logger.info(f"[SessionCheck] {linux_user} terdeteksi aktif via systemd unit {unit}.")
                return True
    except Exception:
        pass

    # 3. Cek proses via psutil (khusus server jupyter dan kernel komputasi)
    try:
        import psutil
        for p in psutil.process_iter(["username", "name", "cmdline"]):
            try:
                if p.info.get("username") == linux_user:
                    cmdline = " ".join(p.info.get("cmdline") or [])
                    pname = (p.info.get("name") or "").lower()
                    if "jupyterhub-singleuser" in cmdline or "ipykernel" in cmdline or "jupyter" in pname:
                        logger.info(f"[SessionCheck] {linux_user} terdeteksi aktif via psutil ({cmdline[:50]}).")
                        return True
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    except Exception:
        pass

    # 4. Cek proses via pgrep (khusus jupyter & ipykernel)
    try:
        res_pgrep = subprocess.run(
            ["pgrep", "-u", linux_user, "-f", "jupyterhub-singleuser|ipykernel_launcher"],
            capture_output=True,
            text=True,
            timeout=2
        )
        if res_pgrep.returncode == 0 and res_pgrep.stdout.strip():
            logger.info(f"[SessionCheck] {linux_user} terdeteksi aktif via pgrep.")
            return True
    except Exception:
        pass

    return False


def is_system_account(name: str) -> bool:
    return name in SYSTEM_ACCOUNTS or (name.startswith("training") and name[8:].isdigit())


def nim_to_username(nim: str) -> str:
    if is_system_account(nim):
        return nim
    return f"{USER_PREFIX}{nim}"


def username_to_nim(username: str) -> str:
    if username.startswith(USER_PREFIX) and username[len(USER_PREFIX):].isdigit():
        return username[len(USER_PREFIX):]
    return username


def ensure_linux_user(username: str) -> bool:
    try:
        pwd.getpwnam(username)
        # Pastikan user yang sudah ada memiliki akses hardware GPU (grup video & render)
        cmd_group = ["usermod", "-aG", "video,render", username]
        if os.geteuid() != 0:
            cmd_group = ["sudo", "-n"] + cmd_group
        subprocess.run(cmd_group, check=False)
        return True
    except KeyError:
        pass
    # useradd dengan group video dan render untuk akses hardware GPU
    cmd = ["useradd", "-m", "-s", "/bin/bash", "-G", "video,render", username]
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
    
    # Pasang otomatis symlink dataset_shared agar langsung terlihat di JupyterLab
    ensure_dataset_shared_symlink(username)

    logger.info(f"User Linux {username} berhasil dibuat dengan akses GPU (group video, render).")
    return True


def ensure_dataset_shared_symlink(username: str) -> None:
    """Memastikan folder /home/dataset_shared ada (755) dan symlink dataset_shared terpasang di home user."""
    try:
        shared_path = "/home/dataset_shared"
        if not os.path.exists(shared_path):
            cmd_mkdir = ["mkdir", "-p", shared_path]
            if os.geteuid() != 0:
                cmd_mkdir = ["sudo", "-n"] + cmd_mkdir
            subprocess.run(cmd_mkdir, check=False)

            cmd_chmod = ["chmod", "755", shared_path]
            if os.geteuid() != 0:
                cmd_chmod = ["sudo", "-n"] + cmd_chmod
            subprocess.run(cmd_chmod, check=False)

        user_home = f"/home/{username}"
        if os.path.isdir(user_home):
            symlink_path = os.path.join(user_home, "dataset_shared")
            if not os.path.exists(symlink_path) and not os.path.islink(symlink_path):
                cmd_ln = ["ln", "-s", shared_path, symlink_path]
                if os.geteuid() != 0:
                    cmd_ln = ["sudo", "-n"] + cmd_ln
                subprocess.run(cmd_ln, check=False)

                cmd_chown = ["chown", "-h", f"{username}:{username}", symlink_path]
                if os.geteuid() != 0:
                    cmd_chown = ["sudo", "-n"] + cmd_chown
                subprocess.run(cmd_chown, check=False)
                logger.info(f"[Symlink] Pintasan dataset_shared berhasil dipasang di {symlink_path}")
    except Exception as e:
        logger.warning(f"Gagal menyiapkan symlink dataset_shared untuk {username}: {e}")


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

        client_ip = extract_client_ip(handler)

        try:
            # =========================================================
            # 1) AKUN SISTEM LAB (labriset, training1..10, edy, labadmin)
            # =========================================================
            if is_system_account(username):
                ok = await asyncio.to_thread(_pam_check, username, password)
                if not ok:
                    logger.warning(f"Password Linux salah untuk akun sistem: {username}")
                    return None

                # ENFORCE SINGLE-SESSION: Cek apakah akun sistem sudah memiliki sesi aktif
                is_running = is_user_process_running(handler, username)
                if is_running:
                    logger.warning(
                        f"[SingleSession] Penolakan login baru: Akun sistem '{username}' "
                        f"sudah memiliki sesi notebook aktif yang sedang berjalan. Akses login baru dari IP {client_ip} ditolak."
                    )
                    raise tornado.web.HTTPError(
                        403,
                        f"Akses Ditolak: Akun '{username}' saat ini sedang aktif digunakan pada sesi/perangkat lain. "
                        f"Kebijakan Laboratorium: Satu akun hanya diperbolehkan aktif pada 1 perangkat secara bersamaan. "
                        f"Silakan logout dari perangkat sebelumnya terlebih dahulu, atau hubungi Asisten Lab untuk mereset sesi Anda.",
                        reason=f"Akun sistem '{username}' sedang aktif di perangkat lain"
                    )

                # Rekam sesi aktif ke database dashboard
                try:
                    from app.db import get_or_create_user, set_user_active_session
                    disp_nama = "Riset Dosen" if username == "labriset" else f"Akun {username.capitalize()}"
                    get_or_create_user(username, disp_nama)
                    set_user_active_session(username, client_ip)
                    logger.info(f"[SingleSession] Sesi aktif tercatat untuk akun sistem {username} (IP: {client_ip})")
                except Exception as e:
                    logger.warning(f"Gagal mencatat sesi aktif akun sistem {username}: {e}")

                logger.info(f"Login Akun Sistem sukses: {username} (IP: {client_ip})")
                return username

            # =========================================================
            # 2) MAHASISWA SIMTIK (Format NIM)
            # =========================================================
            nim = username_to_nim(username)
            if not NIM_REGEX.match(nim):
                logger.warning(f"Username ditolak (bukan akun sistem atau format NIM tidak valid): {username}")
                return None

            # Verifikasi kredensial ke SIMTIK
            from app.simtik_auth import verify_simtik_credentials, is_ti_nim
            is_valid, msg, user_data = await asyncio.to_thread(verify_simtik_credentials, nim, password)
            if not is_valid:
                logger.warning(f"SIMTIK menolak NIM {nim}: {msg}")
                return None

            # =========================================================
            # KEBIJAKAN PRODI: Hanya Teknik Informatika (kode 53) yang boleh masuk.
            # Dicek setelah kredensial valid agar pesan penolakan tidak membocorkan
            # daftar NIM TI ke pengguna tanpa kredensial sah.
            # =========================================================
            if not is_ti_nim(nim):
                logger.warning(
                    f"[ProdiFilter] Akses ditolak: NIM {nim} bukan prodi Teknik Informatika (kode 53)."
                )
                raise tornado.web.HTTPError(
                    403,
                    reason=(
                        "Akses Ditolak: Lab AI ini hanya diperuntukkan bagi mahasiswa "
                        "Teknik Informatika (S1). Akun Anda terdeteksi berasal dari program studi lain."
                    ),
                    log_message=f"NIM non-TI ditolak: {nim}"
                )

            # Sinkron ke DB dashboard & Cek apakah user diblokir admin
            try:
                from app.db import get_or_create_user
                rec = get_or_create_user(nim, user_data.get("nama"))
                if rec and not rec.get("is_active", True):
                    logger.warning(f"NIM {nim} diblokir admin.")
                    raise tornado.web.HTTPError(
                        403,
                        f"Akses Ditolak: Akun NIM {nim} sedang dinonaktifkan oleh Admin Lab. Silakan hubungi pengelola.",
                        reason=f"Akun NIM {nim} dinonaktifkan oleh Admin Lab"
                    )
            except tornado.web.HTTPError:
                raise
            except Exception as e:
                logger.warning(f"Sinkron DB gagal (diabaikan): {e}")

            # ENFORCE SINGLE-SESSION: Cek apakah mahasiswa sudah memiliki sesi aktif
            linux_user = nim_to_username(nim)
            is_running = is_user_process_running(handler, linux_user)

            if is_running:
                logger.warning(
                    f"[SingleSession] Penolakan login baru: NIM {nim} ({linux_user}) "
                    f"sudah memiliki sesi notebook aktif yang sedang berjalan. Akses login baru dari IP {client_ip} ditolak."
                )
                raise tornado.web.HTTPError(
                    403,
                    f"Akses Ditolak: Akun NIM {nim} saat ini sedang aktif digunakan pada sesi/perangkat lain. "
                    f"Kebijakan Laboratorium: Satu akun hanya diperbolehkan aktif pada 1 perangkat secara bersamaan. "
                    f"Silakan selesaikan atau logout dari sesi sebelumnya terlebih dahulu, atau hubungi Asisten Lab untuk mereset sesi Anda.",
                    reason=f"Akun NIM {nim} sedang aktif di perangkat lain"
                )

            # Catat sesi aktif di database
            try:
                from app.db import set_user_active_session
                set_user_active_session(nim, client_ip)
                logger.info(f"[SingleSession] Sesi aktif tercatat untuk NIM {nim} (IP: {client_ip})")
            except Exception as e:
                logger.warning(f"Error set_user_active_session: {e}")

            # Pastikan user Linux lokal tersedia untuk SystemdSpawner
            if not ensure_linux_user(linux_user):
                return None

            logger.info(f"Login SIMTIK sukses: NIM {nim} -> {linux_user} (IP: {client_ip})")
            return linux_user
        except tornado.web.HTTPError:
            raise
        except Exception as e:
            if hasattr(e, "status_code"):
                raise e
            logger.exception("Error tak terduga di SimtikAuthenticator.authenticate")
            return None


def ensure_user_tmp_dir(username: str):
    """Memastikan direktori isolasi cache sementara ~/.tmp tersedia untuk setiap pengguna."""
    try:
        user_home = os.path.expanduser(f"~{username}")
        if not os.path.isdir(user_home):
            user_home = f"/home/{username}"
        tmp_path = os.path.join(user_home, ".tmp")
        if not os.path.exists(tmp_path):
            os.makedirs(tmp_path, mode=0o700, exist_ok=True)
            try:
                pw = pwd.getpwnam(username)
                os.chown(tmp_path, pw.pw_uid, pw.pw_gid)
            except Exception:
                pass
    except Exception as e:
        logger.warning(f"Gagal menyiapkan user tmpdir untuk {username}: {e}")


def is_admin_or_aslab_user(username: str, jh_user=None) -> bool:
    """
    Memeriksa apakah pengguna memiliki hak akses Admin atau Aslab:
    1. Cek akun sistem inti (labadmin, edy, labriset)
    2. Cek flag admin internal JupyterHub (jh_user.admin)
    3. Cek data role di database lab_users.db (role == 'admin' atau 'aslab' atau is_admin == True)
    """
    if username in SYSTEM_ACCOUNTS:
        return True
    if jh_user and getattr(jh_user, "admin", False):
        return True
    nim = username_to_nim(username)
    try:
        from app.db import get_user
        u = get_user(nim)
        if u and (u.get("is_admin") or u.get("role") in ("admin", "aslab")):
            return True
    except Exception:
        pass
    return False


def count_active_level2_students(spawner, exclude_username=None) -> int:
    """
    Menghitung jumlah mahasiswa praktikum Level 2 yang server-nya sedang aktif berjalan.
    Akun Admin, Aslab, dan mahasiswa Level 1 (Prioritas Skripsi GPU 0) DIBYPASS (tidak dihitung).
    """
    try:
        from jupyterhub import orm
        db = getattr(getattr(spawner, "user", None), "db", None)
        should_close = False
        if not db:
            from jupyterhub.orm import new_session_factory
            session_factory = new_session_factory("sqlite:////opt/jupyterhub/etc/jupyterhub.sqlite")
            db = session_factory()
            should_close = True

        try:
            active_spawners = (
                db.query(orm.Spawner)
                .join(orm.User)
                .filter(orm.Spawner.server_id.isnot(None))
                .all()
            )
            count = 0
            for s in active_spawners:
                uname = s.user.name
                if exclude_username and uname == exclude_username:
                    continue
                # Lewati jika akun admin, aslab, atau akun sistem
                if is_admin_or_aslab_user(uname, s.user):
                    continue
                # Lewati jika mahasiswa sedang berada di Mode Prioritas Level 1 (Skripsi/Riset GPU 0)
                nim = username_to_nim(uname)
                try:
                    from app.db import is_user_priority
                    if is_user_priority(nim):
                        continue
                except Exception:
                    pass
                count += 1
            return count
        finally:
            if should_close:
                db.close()
    except Exception as e:
        logger.warning(f"Error menghitung active level2 students: {e}")
        return 0


def simtik_pre_spawn_hook(spawner):
    username = spawner.user.name
    # 1. Pastikan pintasan dataset_shared terpasang di home user
    ensure_dataset_shared_symlink(username)
    # 2. Pastikan direktori isolasi cache temp tersedia
    ensure_user_tmp_dir(username)

    priority = username in LEVEL1_SYSTEM
    is_privileged = is_admin_or_aslab_user(username, getattr(spawner, "user", None))
    if not priority and not is_system_account(username):
        nim = username_to_nim(username)
        # Cek apakah akun aktif atau dinonaktifkan oleh Admin
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

        # Cek status alokasi prioritas
        try:
            from app.db import is_user_priority
            priority = is_user_priority(nim)
        except Exception as e:
            logger.warning(f"Cek prioritas gagal untuk {username}: {e}")

    # =========================================================================
    # 2.5 ADMISSION CONTROL: Kuota Dinamis Mahasiswa Praktikum (Level 2)
    # - Mode Praktikum AI           : Maks 30 Slot (GPU 1 Aktif)
    # - Mode Pemrograman Dasar      : Maks 60 Slot (CPU Only, GPU 1 Standby)
    # Akun Aslab, Admin, dan Mahasiswa Prioritas Skripsi (Level 1) DIBYPASS
    # =========================================================================
    lab_mode = "ai"
    max_level2_concurrent = 30
    try:
        from app.db import get_lab_profile
        profile = get_lab_profile()
        lab_mode = profile.get("mode", "ai")
        max_level2_concurrent = int(profile.get("max_slots", 30))
    except Exception as e:
        logger.warning(f"[AdmissionControl] Gagal membaca profil lab dari database: {e}")

    if not priority and not is_privileged:
        active_l2 = count_active_level2_students(spawner, exclude_username=username)
        if active_l2 >= max_level2_concurrent:
            from tornado import web
            mode_label = "Pemrograman Dasar (2 Kelas)" if lab_mode == "basic" else "Praktikum AI"
            logger.warning(
                f"[AdmissionControl] Spawn ditolak untuk {username}: Kuota {max_level2_concurrent} mahasiswa ({mode_label}) penuh ({active_l2}/{max_level2_concurrent})."
            )
            raise web.HTTPError(
                429,
                f"Kapasitas Lab Penuh ({active_l2}/{max_level2_concurrent} Mahasiswa Aktif - {mode_label}): "
                f"Batas kuota {max_level2_concurrent} mahasiswa praktikum aktif sedang tercapai. "
                f"Silakan tunggu beberapa saat hingga ada mahasiswa lain yang selesai atau sesi otomatis terlepas."
            )

    # 3. Kernel-Level Culling (15 Menit Idle Kernel)
    if not hasattr(spawner, "args") or spawner.args is None:
        spawner.args = []
    cull_args = [
        "--MappingKernelManager.cull_idle_timeout=900",
        "--MappingKernelManager.cull_interval=120",
        "--MappingKernelManager.cull_connected=True"
    ]
    for arg in cull_args:
        if arg not in spawner.args:
            spawner.args.append(arg)

    user_home = f"/home/{username}"
    user_tmp = f"{user_home}/.tmp"

    if priority:
        logger.info(f"[QoS] {username} -> LEVEL 1 (20 core, 60G, Dedicated GPU 0 - Hardware Isolated)")
        spawner.unit_extra_properties = {
            "Slice": "compute-level1.slice",
            # Hardware-Level Cgroup Device Isolation: Kunci ke GPU 0 di tingkat kernel Linux
            "DeviceAllow": [
                "/dev/nvidia0 rw",
                "/dev/nvidiactl rw",
                "/dev/nvidia-uvm rw",
                "/dev/nvidia-uvm-tools rw",
                "/dev/nvidia-modeset rw",
            ],
        }
        spawner.cpu_limit = 20.0
        spawner.mem_limit = "60G"
        if not hasattr(spawner, "environment") or spawner.environment is None:
            spawner.environment = {}
        spawner.environment.update({
            "OMP_NUM_THREADS": "20",
            "OPENBLAS_NUM_THREADS": "20",
            "MKL_NUM_THREADS": "20",
            "CUDA_DEVICE_ORDER": "PCI_BUS_ID",
            "CUDA_VISIBLE_DEVICES": "0",
            # Optimasi Framework AI Anti-OOM
            "TF_FORCE_GPU_ALLOW_GROWTH": "true",
            "PYTORCH_CUDA_ALLOC_CONF": "expandable_segments:True",
            # Isolasi folder cache sementara per user
            "TMPDIR": user_tmp,
            "TEMP": user_tmp,
            "TMP": user_tmp,
        })
    else:
        # Konfigurasi Level 2 Adaptif sesuai Mode Lab yang Aktif
        if lab_mode == "basic":
            logger.info(f"[QoS] {username} -> LEVEL 2 MODE DASAR (CPU Only, 2 core, 2G, GPU Blocked at Kernel)")
            spawner.unit_extra_properties = {
                "Slice": "compute-level2.slice",
                # Hardware-Level Cgroup Device Isolation: Blokir total seluruh file /dev/nvidia* di tingkat kernel
                "DevicePolicy": "closed",
            }
            spawner.cpu_limit = 2.0
            spawner.mem_limit = "2G"
            if not hasattr(spawner, "environment") or spawner.environment is None:
                spawner.environment = {}
            spawner.environment.update({
                "OMP_NUM_THREADS": "2",
                "OPENBLAS_NUM_THREADS": "2",
                "MKL_NUM_THREADS": "2",
                "CUDA_DEVICE_ORDER": "PCI_BUS_ID",
                "CUDA_VISIBLE_DEVICES": "",  # Nonaktifkan CUDA context
                "TMPDIR": user_tmp,
                "TEMP": user_tmp,
                "TMP": user_tmp,
            })
        else:
            logger.info(f"[QoS] {username} -> LEVEL 2 MODE AI (GPU 1 Shared Anti-OOM, 2 core, 3G - GPU 0 Blocked at Kernel)")
            spawner.unit_extra_properties = {
                "Slice": "compute-level2.slice",
                # Hardware-Level Cgroup Device Isolation: Hanya izinkan GPU 1, blokir GPU 0 (milik riset) di kernel
                "DeviceAllow": [
                    "/dev/nvidia1 rw",
                    "/dev/nvidiactl rw",
                    "/dev/nvidia-uvm rw",
                    "/dev/nvidia-uvm-tools rw",
                    "/dev/nvidia-modeset rw",
                ],
            }
            spawner.cpu_limit = 2.0
            spawner.mem_limit = "3G"
            if not hasattr(spawner, "environment") or spawner.environment is None:
                spawner.environment = {}
            spawner.environment.update({
                "OMP_NUM_THREADS": "2",
                "OPENBLAS_NUM_THREADS": "2",
                "MKL_NUM_THREADS": "2",
                "CUDA_DEVICE_ORDER": "PCI_BUS_ID",
                "CUDA_VISIBLE_DEVICES": "1",
                # Optimasi Framework AI Anti-OOM
                "TF_FORCE_GPU_ALLOW_GROWTH": "true",
                "PYTORCH_CUDA_ALLOC_CONF": "expandable_segments:True",
                # Isolasi folder cache sementara per user
                "TMPDIR": user_tmp,
                "TEMP": user_tmp,
                "TMP": user_tmp,
            })


def simtik_post_stop_hook(spawner):
    """
    Hook yang dijalankan secara otomatis saat server single-user berhenti
    (melalui logout, tombol stop server di control panel, maupun idle culler).
    Membersihkan active_ip di database sehingga pengguna dapat login di perangkat lain.
    """
    try:
        username = spawner.user.name
        nim = username_to_nim(username)
        from app.db import clear_user_active_session
        clear_user_active_session(nim)
        clear_user_active_session(username)
        # Pastikan proses server jupyter/kernel pengguna dihentikan bersih
        subprocess.run(["pkill", "-u", username, "-f", "jupyterhub-singleuser|ipykernel_launcher"], check=False)
        logger.info(f"[SingleSession] Server {username} dihentikan. Sesi aktif berhasil dibebaskan.")
    except Exception as e:
        logger.warning(f"Error pada simtik_post_stop_hook untuk {spawner.user.name}: {e}")


# Pastikan Spawner dan SystemdSpawner tidak menampilkan form pilihan profil (login langsung)
try:
    from jupyterhub.spawner import Spawner
    Spawner.options_form = None
    Spawner.options_from_form = None
    from systemdspawner import SystemdSpawner
    SystemdSpawner.options_form = None
    SystemdSpawner.options_from_form = None
    logger.info("Spawner & SystemdSpawner options_form dinonaktifkan (login langsung tanpa pilihan profil).")
except Exception as _e:
    pass


# =========================================================
# MIRAI GRID SSO (AUTO LOGIN DARI CPANEL KE JUPYTERHUB)
# =========================================================
# Alur: MiraiGrid backend menandatangani token HS256 berumur pendek, lalu
# browser mengirim form POST ke /hub/sso/miraigrid. Handler memverifikasi
# token, memeriksa prodi TI, menegakkan single-session, lalu memasang cookie
# login JupyterHub dan mengarahkan ke JupyterLab pengguna.

SSO_ISSUER = "miraigrid.web.id"
SSO_AUDIENCE = "jupyterhub-lab.umpo"
SSO_MAX_SKEW_SECONDS = 30
SSO_ALLOWED_ORIGINS = {
    "http://76.76.76.189:3000",
    "https://miraigrid.web.id",
}

# Cache jti sekali pakai. Hub berjalan satu proses, jadi dict in-memory cukup.
_SSO_USED_JTI = {}
_SSO_LAST_PRUNE = 0


def _b64url_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _prune_used_jti(now: int) -> None:
    global _SSO_LAST_PRUNE
    if now - _SSO_LAST_PRUNE < 30:
        return
    expired = [jti for jti, exp in _SSO_USED_JTI.items() if exp < now - SSO_MAX_SKEW_SECONDS]
    for jti in expired:
        _SSO_USED_JTI.pop(jti, None)
    _SSO_LAST_PRUNE = now


def verify_miraigrid_sso_token(token: str):
    """Verifikasi JWT HS256 dari MiraiGrid. Mengembalikan payload atau None."""
    secret = os.environ.get("SSO_SHARED_SECRET", "")
    if len(secret) < 32:
        logger.error("SSO_SHARED_SECRET belum diset atau kurang dari 32 karakter.")
        return None

    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64url_decode(signature_b64)):
            return None

        header = json.loads(_b64url_decode(header_b64))
        payload = json.loads(_b64url_decode(payload_b64))

        if header.get("alg") != "HS256":
            return None
        if payload.get("iss") != SSO_ISSUER or payload.get("aud") != SSO_AUDIENCE:
            return None

        now = int(time.time())
        iat = int(payload.get("iat", 0))
        exp = int(payload.get("exp", 0))
        if iat > now + SSO_MAX_SKEW_SECONDS or exp < now - SSO_MAX_SKEW_SECONDS:
            return None

        jti = str(payload.get("jti") or "")
        if not jti:
            return None

        _prune_used_jti(now)
        if jti in _SSO_USED_JTI:
            logger.warning(f"[SSO] Token replay ditolak (jti={jti}).")
            return None
        _SSO_USED_JTI[jti] = exp

        return payload
    except Exception as exc:
        logger.warning(f"[SSO] Token tidak valid: {exc}")
        return None


def _origin_allowed(handler) -> bool:
    origin = (handler.request.headers.get("Origin") or "").rstrip("/")
    referer = handler.request.headers.get("Referer") or ""

    if origin:
        return origin in SSO_ALLOWED_ORIGINS
    if referer:
        return any(
            referer == allowed or referer.startswith(allowed + "/")
            for allowed in SSO_ALLOWED_ORIGINS
        )
    return False


class MiraiGridSSOHandler(BaseHandler):
    """Endpoint POST /hub/sso/miraigrid untuk auto-login dari MiraiGrid."""

    def check_xsrf_cookie(self):
        # Form POST berasal dari origin lain (MiraiGrid), sehingga XSRF token
        # tidak tersedia. Keamanan dijaga oleh signature token + Origin check.
        pass

    def _json_error(self, status: int, error: str, message: str):
        self.set_status(status)
        self.set_header("Content-Type", "application/json; charset=UTF-8")
        self.set_header("Cache-Control", "no-store")
        self.finish({"error": error, "message": message})

    async def get(self):
        self.set_status(405)
        self.set_header("Allow", "POST")
        self.finish("Method Not Allowed")

    async def post(self):
        if not _origin_allowed(self):
            logger.warning(
                f"[SSO] Origin ditolak: {self.request.headers.get('Origin') or self.request.headers.get('Referer')}"
            )
            return self._json_error(403, "origin_not_allowed", "Origin tidak diizinkan.")

        token = self.get_argument("token", "")
        if not token:
            return self._json_error(400, "missing_token", "Token SSO tidak ditemukan.")

        payload = verify_miraigrid_sso_token(token)
        if not payload:
            return self._json_error(400, "invalid_token", "Token SSO tidak valid atau sudah kedaluwarsa.")

        nim = str(payload.get("sub", "")).strip()
        from app.simtik_auth import is_ti_nim
        if not is_ti_nim(nim):
            logger.warning(f"[SSO] NIM non-TI ditolak: {nim}")
            return self._json_error(
                403,
                "not_teknik_informatika",
                "Hanya mahasiswa Teknik Informatika (S1) yang diizinkan.",
            )

        linux_user = nim_to_username(nim)
        client_ip = self.request.remote_ip

        # Jika browser ini sudah punya sesi JupyterHub untuk user yang sama,
        # lanjutkan tanpa membuat sesi baru.
        current = await self.get_current_user()
        if current and current.name == linux_user:
            return self.redirect(url_path_join(self.hub.base_url, "user", linux_user, "lab"))

        # Kebijakan single-session: tolak jika user sudah punya server aktif.
        if is_user_process_running(self, linux_user):
            logger.warning(f"[SSO] Sesi aktif sudah ada untuk {linux_user}; login baru ditolak (IP: {client_ip}).")
            return self._json_error(
                403,
                "active_session_exists",
                "Akun ini sedang aktif di perangkat lain. Logout dari perangkat sebelumnya terlebih dahulu.",
            )

        # Sinkronisasi database dashboard & cek status akun
        try:
            from app.db import get_or_create_user, set_user_active_session
            rec = get_or_create_user(nim, payload.get("name"))
            if rec and not rec.get("is_active", True):
                return self._json_error(
                    403,
                    "account_disabled",
                    "Akun Anda dinonaktifkan oleh administrator.",
                )
        except Exception as exc:
            logger.warning(f"[SSO] Sinkronisasi DB gagal (diabaikan): {exc}")
            set_user_active_session = None

        if not ensure_linux_user(linux_user):
            return self._json_error(
                500,
                "linux_user_provision_failed",
                "Gagal menyiapkan akun Linux untuk pengguna.",
            )

        if set_user_active_session:
            try:
                set_user_active_session(nim, client_ip)
            except Exception as exc:
                logger.warning(f"[SSO] Gagal mencatat sesi aktif: {exc}")

        user = self.user_from_username(linux_user)
        self.set_login_cookie(user)

        logger.info(f"[SSO] Login MiraiGrid sukses: NIM {nim} -> {linux_user} (IP: {client_ip})")
        return self.redirect(url_path_join(self.hub.base_url, "user", user.name, "lab"))
