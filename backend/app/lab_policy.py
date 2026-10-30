"""
Kebijakan kuota Lab AI UMPO untuk dashboard (tanpa dependensi JupyterHub).

Modul ini adalah padanan ringan dari policy yang dipakai `jupyterhub_simtik_auth.py`
saat spawn server. Tujuannya agar dashboard dapat menghitung slot praktikum Level 2
dan menentukan akun yang boleh dibebaskan tanpa perlu meng-import JupyterHub
(backend FastAPI tidak memiliki dependensi tersebut).

Sumber kebenaran kuota:
- Level 2 (praktikum) : maksimal `LEVEL2_MAX_SLOTS` sesi bersamaan.
- Level 1 (riset)     : akun prioritas / `labriset`, selalu bypass kuota.
- Admin & Aslab       : bypass kuota.
"""

import logging
import os
import re
import sqlite3
import subprocess
import time
from datetime import datetime, timezone

logger = logging.getLogger("lab_policy")

LEVEL2_MAX_SLOTS = int(os.getenv("LAB_LEVEL2_MAX_SLOTS", "30"))
IDLE_RELEASE_MINUTES = int(os.getenv("LAB_IDLE_RELEASE_MINUTES", "10"))
JH_DB_PATH = os.getenv("JUPYTERHUB_DB_PATH", "/opt/jupyterhub/etc/jupyterhub.sqlite")

# Akun sistem (disamakan dengan jupyterhub_simtik_auth.py)
SYSTEM_ACCOUNTS = {"labriset", "edy", "labadmin"} | {f"training{i}" for i in range(1, 11)}
LEVEL1_SYSTEM = {"labriset"}

_STUDENT_USERNAME_RE = re.compile(r"^m(\d{8,15})$")

# Cache keputusan role per username, agar endpoint /api/status tetap ringan.
_ROLE_CACHE = {}
_ROLE_CACHE_TTL = 30.0


def username_to_nim(username: str) -> str:
    """m23533743 -> 23533743, selain itu dikembalikan apa adanya."""
    username = (username or "").strip()
    m = _STUDENT_USERNAME_RE.match(username)
    return m.group(1) if m else username


def is_student_username(username: str) -> bool:
    """True hanya untuk akun mahasiswa berpola m<NIM>."""
    return bool(_STUDENT_USERNAME_RE.match((username or "").strip()))


def is_system_account(username: str) -> bool:
    username = (username or "").strip()
    return (
        username in SYSTEM_ACCOUNTS
        or username.startswith("training")
        or username in ("root", "jupyterhub", "jupyter", "www-data")
    )


def is_admin_or_aslab_user(username: str) -> bool:
    """Akun sistem, admin, atau aslab (dibaca dari lab_users.db)."""
    username = (username or "").strip()
    if not username:
        return False
    if is_system_account(username):
        return True
    if not is_student_username(username):
        return False

    now = time.time()
    cached = _ROLE_CACHE.get(username)
    if cached and (now - cached[1]) < _ROLE_CACHE_TTL:
        return cached[0]

    result = False
    try:
        from app.db import get_user

        u = get_user(username_to_nim(username))
        if u:
            result = bool(u.get("is_admin")) or u.get("role") in ("admin", "aslab")
    except Exception as e:
        logger.debug(f"Gagal cek role {username}: {e}")

    _ROLE_CACHE[username] = (result, now)
    return result


def is_level1_user(username: str) -> bool:
    """Akun prioritas riset/skripsi (GPU 0) yang selalu bypass kuota Level 2."""
    username = (username or "").strip()
    if not username:
        return False
    if username in LEVEL1_SYSTEM:
        return True
    if not is_student_username(username):
        return False
    try:
        from app.db import is_user_priority

        return bool(is_user_priority(username_to_nim(username)))
    except Exception as e:
        logger.debug(f"Gagal cek prioritas {username}: {e}")
        return False


def is_level2_student(username: str) -> bool:
    """Mahasiswa praktikum murni: bukan sistem, bukan admin/aslab, bukan Level 1."""
    if not is_student_username(username):
        return False
    if is_admin_or_aslab_user(username):
        return False
    if is_level1_user(username):
        return False
    return True


def _list_running_singleuser_units():
    """Username dari transient systemd unit SystemdSpawner yang sedang berjalan."""
    users = set()
    try:
        res = subprocess.run(
            [
                "systemctl", "list-units", "jupyter-*-singleuser.service",
                "--state=running", "--no-legend", "--plain", "--no-pager",
            ],
            capture_output=True,
            text=True,
            timeout=3,
        )
        for line in (res.stdout or "").strip().splitlines():
            parts = line.split()
            if not parts:
                continue
            unit = parts[0]
            if unit.startswith("jupyter-") and "-singleuser" in unit:
                uname = unit[len("jupyter-"):].split("-singleuser")[0]
                if uname:
                    users.add(uname)
    except Exception as e:
        logger.debug(f"Gagal membaca systemd singleuser units: {e}")
    return users


def _list_jupyterhub_spawners():
    """Dict username -> datetime last_activity untuk spawner dengan server_id aktif."""
    result = {}
    if not os.path.exists(JH_DB_PATH):
        return result
    conn = None
    try:
        conn = sqlite3.connect(JH_DB_PATH, timeout=3)
        conn.execute("PRAGMA query_only = ON;")
        cur = conn.cursor()
        cur.execute(
            """
            SELECT u.name, s.last_activity
            FROM spawners s
            JOIN users u ON s.user_id = u.id
            WHERE s.server_id IS NOT NULL
            """
        )
        for name, last_activity in cur.fetchall():
            if not name:
                continue
            parsed = None
            if last_activity:
                try:
                    parsed = datetime.fromisoformat(str(last_activity).replace("Z", ""))
                except Exception:
                    parsed = None
            result[name] = parsed
    except Exception as e:
        logger.debug(f"Gagal membaca spawner JupyterHub: {e}")
    finally:
        if conn:
            conn.close()
    return result


def get_active_level2_sessions(include_bypass: bool = False):
    """
    Daftar sesi mahasiswa Level 2 yang sedang aktif.

    Return: list of dict {username, nim, last_activity (datetime|None), source}
    Sumber digabung dari transient systemd unit dan state spawner JupyterHub.
    """
    units = _list_running_singleuser_units()
    spawners = _list_jupyterhub_spawners()
    all_names = units | set(spawners.keys())

    sessions = []
    for uname in sorted(all_names):
        if not include_bypass and not is_level2_student(uname):
            continue
        sessions.append(
            {
                "username": uname,
                "nim": username_to_nim(uname),
                "last_activity": spawners.get(uname),
                "source": "systemd" if uname in units else "jupyterhub",
            }
        )
    return sessions


def count_active_level2_students() -> int:
    return len(get_active_level2_sessions())


def idle_minutes(last_activity) -> float:
    """Selisih menit sejak aktivitas terakhir. None dianggap sangat lama.

    JupyterHub menyimpan `last_activity` sebagai UTC naive, sehingga pembanding
    harus memakai UTC (bukan waktu lokal server) agar tidak salah menganggap
    semua sesi idle.
    """
    if not last_activity:
        return float("inf")
    if getattr(last_activity, "tzinfo", None) is not None:
        last_activity = last_activity.astimezone(timezone.utc).replace(tzinfo=None)
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    delta = now_utc - last_activity
    return max(0.0, delta.total_seconds() / 60.0)
