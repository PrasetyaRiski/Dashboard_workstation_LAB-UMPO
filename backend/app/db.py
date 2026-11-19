"""
Database Management untuk User & Resource Allocation
Mendukung PostgreSQL (Port 5432) dengan fallback otomatis ke SQLite lokal
"""

import os
import time
import sqlite3
import logging
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

logger = logging.getLogger("db_manager")

PG_HOST = os.getenv("POSTGRES_HOST", "127.0.0.1")
PG_PORT = os.getenv("POSTGRES_PORT", "5432")
PG_USER = os.getenv("POSTGRES_USER", "postgres")
PG_PASS = os.getenv("POSTGRES_PASSWORD", "postgres")
PG_DB = os.getenv("POSTGRES_DB", "lab_ai_umpo")

# Cek apakah modul psycopg2 terinstall
USE_POSTGRES = False
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    USE_POSTGRES = True
except ImportError:
    logger.warning("psycopg2 tidak ditemukan. Menggunakan SQLite lokal sebagai database.")

# Lokasi DB bersama: dashboard (panel-lab) dan JupyterHub HARUS memakai file yang sama.
# Bisa dioverride lewat env LAB_DB_PATH.
_DEFAULT_SHARED_DIR = "/home/public/web/data"
if os.getenv("LAB_DB_PATH"):
    SQLITE_PATH = os.getenv("LAB_DB_PATH")
elif os.path.isdir("/home/public/web"):
    SQLITE_PATH = os.path.join(_DEFAULT_SHARED_DIR, "lab_users.db")
else:
    SQLITE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "lab_users.db")

_TABLES_READY = False


def get_connection():
    """Mengembalikan koneksi database PostgreSQL atau SQLite fallback"""
    global _TABLES_READY, SQLITE_PATH
    if USE_POSTGRES:
        try:
            conn = psycopg2.connect(
                host=PG_HOST,
                port=PG_PORT,
                user=PG_USER,
                password=PG_PASS,
                database=PG_DB,
                connect_timeout=3
            )
            return conn, "postgres"
        except Exception as e:
            logger.warning(f"Gagal koneksi ke PostgreSQL ({e}), beralih ke SQLite lokal.")
    
    # SQLite Fallback
    try:
        os.makedirs(os.path.dirname(SQLITE_PATH), exist_ok=True)
        conn = sqlite3.connect(SQLITE_PATH, timeout=10)
    except (PermissionError, OSError) as e:
        logger.warning(f"Gagal mengakses {SQLITE_PATH} ({e}), beralih ke database lokal...")
        local_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
        os.makedirs(local_dir, exist_ok=True)
        fallback_path = os.path.join(local_dir, "lab_users.db")
        SQLITE_PATH = fallback_path
        conn = sqlite3.connect(fallback_path, timeout=10)
    
    # Aktifkan WAL mode untuk konkurensi (JupyterHub + FastAPI)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    
    conn.row_factory = sqlite3.Row
    if not _TABLES_READY:
        # Pastikan tabel selalu ada, walau init_db() belum dipanggil (mis. dari JupyterHub)
        conn.execute("""CREATE TABLE IF NOT EXISTS users (
            nim TEXT PRIMARY KEY, nama TEXT, is_admin INTEGER DEFAULT 0,
            is_priority INTEGER DEFAULT 0, priority_expires_at TIMESTAMP NULL,
            is_active INTEGER DEFAULT 1, role TEXT DEFAULT 'mahasiswa',
            gpu_boost_expires_at TIMESTAMP NULL,
            gpu_boost_reason TEXT NULL,
            gpu_boost_by TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP NULL)""")
        conn.execute("""CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, nim TEXT, action TEXT, detail TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
        conn.execute("""CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY, value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
        conn.commit()

        # Migrasi kolom 'role' jika tabel lama belum memilikinya
        try:
            conn.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'mahasiswa'")
            conn.commit()
        except Exception:
            pass

        # Migrasi kolom 'active_ip' dan 'last_activity_at' untuk Single-Session Policy
        try:
            conn.execute("ALTER TABLE users ADD COLUMN active_ip TEXT NULL")
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute("ALTER TABLE users ADD COLUMN last_activity_at TIMESTAMP NULL")
            conn.commit()
        except Exception:
            pass

        # Migrasi kolom GPU Boost Level 2 (terpisah dari is_priority Level 1)
        for _ddl in (
            "ALTER TABLE users ADD COLUMN gpu_boost_expires_at TIMESTAMP NULL",
            "ALTER TABLE users ADD COLUMN gpu_boost_reason TEXT NULL",
            "ALTER TABLE users ADD COLUMN gpu_boost_by TEXT NULL",
        ):
            try:
                conn.execute(_ddl)
                conn.commit()
            except Exception:
                pass

        _TABLES_READY = True
    return conn, "sqlite"


def init_db():
    """Membuat tabel jika belum ada"""
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        if engine == "postgres":
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    nim VARCHAR(30) PRIMARY KEY,
                    nama VARCHAR(150),
                    is_admin BOOLEAN DEFAULT FALSE,
                    is_priority BOOLEAN DEFAULT FALSE,
                    priority_expires_at TIMESTAMP NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    role VARCHAR(30) DEFAULT 'mahasiswa',
                    active_ip VARCHAR(50) NULL,
                    last_activity_at TIMESTAMP NULL,
                    gpu_boost_expires_at TIMESTAMP NULL,
                    gpu_boost_reason TEXT NULL,
                    gpu_boost_by VARCHAR(150) NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP NULL
                );
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id SERIAL PRIMARY KEY,
                    nim VARCHAR(30),
                    action VARCHAR(100),
                    detail TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS system_settings (
                    key VARCHAR(100) PRIMARY KEY,
                    value TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            # Migrasi kolom baru untuk database PostgreSQL yang sudah ada.
            for _ddl in (
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS gpu_boost_expires_at TIMESTAMP NULL",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS gpu_boost_reason TEXT NULL",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS gpu_boost_by VARCHAR(150) NULL",
            ):
                try:
                    cur.execute(_ddl)
                except Exception:
                    conn.rollback()
        else:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    nim TEXT PRIMARY KEY,
                    nama TEXT,
                    is_admin INTEGER DEFAULT 0,
                    is_priority INTEGER DEFAULT 0,
                    priority_expires_at TIMESTAMP NULL,
                    is_active INTEGER DEFAULT 1,
                    role TEXT DEFAULT 'mahasiswa',
                    active_ip TEXT NULL,
                    last_activity_at TIMESTAMP NULL,
                    gpu_boost_expires_at TIMESTAMP NULL,
                    gpu_boost_reason TEXT NULL,
                    gpu_boost_by TEXT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP NULL
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nim TEXT,
                    action TEXT,
                    detail TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS system_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
        conn.commit()
        logger.info(f"Database ({engine}) berhasil diinisialisasi.")
    finally:
        cur.close()
        conn.close()


def nim_to_username(nim: str) -> str:
    """Mengembalikan username sistem operasi untuk NIM tertentu (default: m<nim>)"""
    clean = str(nim).strip()
    if os.path.exists(f"/home/{clean}"):
        return clean
    return f"m{clean}"


def _row_to_user_dict(cur, row, engine: str) -> Dict[str, Any]:
    """Normalisasi baris ``users`` tanpa bergantung pada urutan kolom.

    PostgreSQL memakai cursor tuple biasa, sehingga pemetaan berbasis indeks
    mudah bergeser saat kolom baru ditambahkan. Nama kolom diambil dari
    ``cursor.description`` agar aman untuk kedua engine.
    """
    if hasattr(row, "keys"):
        result = dict(row)
    else:
        columns = [desc[0] for desc in (getattr(cur, "description", None) or [])]
        result = dict(zip(columns, row))

    result["is_admin"] = bool(result.get("is_admin"))
    result["is_priority"] = bool(result.get("is_priority"))
    result["is_active"] = bool(result.get("is_active", True))
    result["role"] = result.get("role") or ("admin" if result.get("is_admin") else "mahasiswa")
    for key in (
        "priority_expires_at",
        "gpu_boost_expires_at",
        "created_at",
        "last_login",
        "last_activity_at",
    ):
        if result.get(key) is not None:
            result[key] = str(result[key])
    return result


def get_user(nim: str) -> Optional[Dict[str, Any]]:
    """Mengambil detail user berdasarkan NIM dari database"""
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        cur.execute(f"SELECT * FROM users WHERE nim = {placeholder}", (str(nim).strip(),))
        row = cur.fetchone()
        if not row:
            return None
        return _row_to_user_dict(cur, row, engine)
    finally:
        cur.close()
        conn.close()


def get_or_create_user(nim: str, nama: Optional[str] = None) -> Dict[str, Any]:
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        cur.execute(f"SELECT * FROM users WHERE nim = {placeholder}", (nim,))
        row = cur.fetchone()
        
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if not row:
            display_name = nama or f"Mahasiswa {nim}"
            cur.execute(
                f"INSERT INTO users (nim, nama, last_login) VALUES ({placeholder}, {placeholder}, {placeholder})",
                (nim, display_name, now_str)
            )
            conn.commit()
            cur.execute(f"SELECT * FROM users WHERE nim = {placeholder}", (nim,))
            row = cur.fetchone()
        else:
            cur.execute(
                f"UPDATE users SET last_login = {placeholder} WHERE nim = {placeholder}",
                (now_str, nim)
            )
            conn.commit()
            cur.execute(f"SELECT * FROM users WHERE nim = {placeholder}", (nim,))
            row = cur.fetchone()

        return _row_to_user_dict(cur, row, engine)
    finally:
        cur.close()
        conn.close()


def list_users() -> List[Dict[str, Any]]:
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM users ORDER BY is_priority DESC, last_login DESC NULLS LAST")
        rows = cur.fetchall()
        return [_row_to_user_dict(cur, r, engine) for r in rows]
    finally:
        cur.close()
        conn.close()


def set_user_role(nim: str, role: str) -> bool:
    """Mengubah role pengguna: 'mahasiswa', 'aslab', atau 'admin'"""
    role = role.lower().strip()
    valid_roles = {"mahasiswa", "aslab", "admin"}
    if role not in valid_roles:
        return False
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        is_admin_flag = 1 if role == "admin" else 0
        cur.execute(
            f"UPDATE users SET role = {placeholder}, is_admin = {placeholder} WHERE nim = {placeholder}",
            (role, is_admin_flag, nim)
        )
        cur.execute(
            f"INSERT INTO audit_logs (nim, action, detail) VALUES ({placeholder}, {placeholder}, {placeholder})",
            (nim, "SET_ROLE", f"Role pengguna diubah menjadi: {role.upper()}")
        )
        conn.commit()
        return True
    finally:
        cur.close()
        conn.close()


def set_user_priority(nim: str, hours: int = 4, reason: str = "Admin Boost") -> bool:
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        expires_at = datetime.now() + timedelta(hours=hours)
        expires_str = expires_at.strftime("%Y-%m-%d %H:%M:%S")

        cur.execute(
            f"UPDATE users SET is_priority = {placeholder}, priority_expires_at = {placeholder} WHERE nim = {placeholder}",
            (True if engine == "postgres" else 1, expires_str, nim)
        )
        cur.execute(
            f"INSERT INTO audit_logs (nim, action, detail) VALUES ({placeholder}, {placeholder}, {placeholder})",
            (nim, "BOOST_PRIORITY", f"Menaikkan ke mode Prioritas Level 1 (20 Core, 60G, GPU 0) selama {hours} jam. Alasan: {reason}")
        )
        conn.commit()
        return True
    finally:
        cur.close()
        conn.close()


def unset_user_priority(nim: str) -> bool:
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        cur.execute(
            f"UPDATE users SET is_priority = {placeholder}, priority_expires_at = NULL WHERE nim = {placeholder}",
            (False if engine == "postgres" else 0, nim)
        )
        cur.execute(
            f"INSERT INTO audit_logs (nim, action, detail) VALUES ({placeholder}, {placeholder}, {placeholder})",
            (nim, "UNBOOST_PRIORITY", "Dikembalikan ke mode Standard Level 2 (CPU Only, GPU 1 dilepas)")
        )
        conn.commit()
        return True
    finally:
        cur.close()
        conn.close()


# ==============================================================================
# GPU BOOST LEVEL 2 (GPU 1) — terpisah dari is_priority / Level 1 (GPU 0)
# ==============================================================================

GPU_BOOST_MAX_SLOTS = 3
GPU_BOOST_VRAM_MB = 4800
GPU_BOOST_CPU_CORES = 2.0
GPU_BOOST_RAM_GB = 3.0


def get_gpu_boost_enabled() -> bool:
    """Toggle global GPU Boost. Default aktif."""
    value = get_setting("gpu_boost_enabled", "1").strip().lower()
    return value not in ("0", "false", "off", "no", "disabled")


def set_gpu_boost_enabled(enabled: bool) -> None:
    set_setting("gpu_boost_enabled", "1" if enabled else "0")
    logger.info("[GpuBoost] Fitur GPU Boost %s.", "diaktifkan" if enabled else "dimatikan")


def _parse_expiry(value: Any) -> Optional[datetime]:
    """Ubah nilai TIMESTAMP database menjadi datetime lokal (naive)."""
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.strptime(str(value), "%Y-%m-%d %H:%M:%S")
    except (TypeError, ValueError):
        return None


def list_active_gpu_boosts() -> List[Dict[str, Any]]:
    """Daftar boost GPU yang masih berlaku, diurutkan dari yang paling lama."""
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        cur.execute(
            "SELECT nim, nama, gpu_boost_expires_at, gpu_boost_reason, gpu_boost_by "
            f"FROM users WHERE gpu_boost_expires_at IS NOT NULL AND is_active = {placeholder}",
            (True if engine == "postgres" else 1,),
        )
        rows = cur.fetchall()
        now = datetime.now()
        active = []
        for row in rows:
            if hasattr(row, "keys"):
                item = dict(row)
            else:
                item = {
                    "nim": row[0],
                    "nama": row[1],
                    "gpu_boost_expires_at": row[2],
                    "gpu_boost_reason": row[3],
                    "gpu_boost_by": row[4],
                }
            expires = _parse_expiry(item.get("gpu_boost_expires_at"))
            if not expires or expires <= now:
                continue
            is_unlimited = expires.year >= 2090
            item["gpu_boost_expires_at"] = expires.strftime("%Y-%m-%d %H:%M:%S")
            item["is_unlimited"] = is_unlimited
            item["remaining_minutes"] = None if is_unlimited else max(0, int((expires - now).total_seconds() // 60))
            active.append(item)
        active.sort(key=lambda x: x["gpu_boost_expires_at"])
        return active
    finally:
        cur.close()
        conn.close()


def is_user_gpu_boosted(nim: str) -> bool:
    """True jika NIM aktif dan masih memiliki GPU Boost yang belum kedaluwarsa."""
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        cur.execute(
            f"SELECT gpu_boost_expires_at, is_active FROM users WHERE nim = {placeholder}",
            (str(nim).strip(),),
        )
        row = cur.fetchone()
        if not row:
            return False
        if hasattr(row, "keys"):
            expires_raw = row["gpu_boost_expires_at"]
            is_active = bool(row["is_active"])
        else:
            expires_raw = row[0]
            is_active = bool(row[1])
        if not is_active or not expires_raw:
            return False
        expires = _parse_expiry(expires_raw)
        if not expires or expires <= datetime.now():
            unset_user_gpu_boost(nim, reason="Kedaluwarsa otomatis")
            return False
        return True
    finally:
        cur.close()
        conn.close()


def set_user_gpu_boost(nim: str, hours: int = 4, reason: str = "Admin Boost", actor: str = "Admin") -> bool:
    """Beri akses GPU 1 (Level 2 Boost) selama ``hours`` jam (1-12) atau 0 untuk unlimited."""
    is_unlimited = (int(hours or 0) == 0)
    clean_hours = 0 if is_unlimited else max(1, min(int(hours), 12))
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        if is_unlimited:
            expires_str = "2099-12-31 23:59:59"
            dur_label = "tanpa batas waktu (Unlimited)"
        else:
            expires_str = (datetime.now() + timedelta(hours=clean_hours)).strftime("%Y-%m-%d %H:%M:%S")
            dur_label = f"selama {clean_hours} jam"

        cur.execute(
            "UPDATE users SET gpu_boost_expires_at = {}, gpu_boost_reason = {}, gpu_boost_by = {} "
            "WHERE nim = {}".format(placeholder, placeholder, placeholder, placeholder),
            (expires_str, reason or "Admin Boost", actor, nim),
        )
        cur.execute(
            f"INSERT INTO audit_logs (nim, action, detail) VALUES ({placeholder}, {placeholder}, {placeholder})",
            (
                nim,
                "GPU_BOOST",
                f"GPU 1 Boost Level 2 (VRAM {GPU_BOOST_VRAM_MB} MB) {dur_label} "
                f"oleh {actor}. Alasan: {reason or 'Admin Boost'}",
            ),
        )
        conn.commit()
        return True
    except Exception as exc:
        conn.rollback()
        logger.error("Gagal memberi GPU boost untuk %s: %s", nim, exc)
        return False
    finally:
        cur.close()
        conn.close()


def unset_user_gpu_boost(nim: str, actor: Optional[str] = None, reason: str = "Dicabut admin") -> bool:
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        cur.execute(
            f"UPDATE users SET gpu_boost_expires_at = NULL, gpu_boost_reason = NULL, gpu_boost_by = NULL "
            f"WHERE nim = {placeholder}",
            (nim,),
        )
        cur.execute(
            f"INSERT INTO audit_logs (nim, action, detail) VALUES ({placeholder}, {placeholder}, {placeholder})",
            (nim, "GPU_UNBOOST", f"GPU Boost Level 2 dilepas. {reason}" + (f" Oleh {actor}." if actor else "")),
        )
        conn.commit()
        return True
    except Exception as exc:
        conn.rollback()
        logger.error("Gagal mencabut GPU boost untuk %s: %s", nim, exc)
        return False
    finally:
        cur.close()
        conn.close()


def auto_expire_gpu_boosts() -> List[str]:
    """Cabut GPU Boost yang sudah lewat masa berlaku; kembalikan daftar NIM."""
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT nim, gpu_boost_expires_at FROM users WHERE gpu_boost_expires_at IS NOT NULL")
        rows = cur.fetchall()
        now = datetime.now()
        expired = []
        for row in rows:
            if hasattr(row, "keys"):
                nim = row["nim"]
                expires_raw = row["gpu_boost_expires_at"]
            else:
                nim = row[0]
                expires_raw = row[1]
            expires = _parse_expiry(expires_raw)
            if expires and expires <= now:
                expired.append(nim)
    finally:
        cur.close()
        conn.close()

    for nim in expired:
        unset_user_gpu_boost(nim, reason="Kedaluwarsa otomatis")
        logger.info("[GpuBoost] Boost GPU untuk NIM %s berakhir.", nim)
    return expired


def record_system_audit(nim: str, action: str, detail: str) -> None:
    """Catat audit dari worker latar (tanpa sesi pengguna)."""
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        cur.execute(
            f"INSERT INTO audit_logs (nim, action, detail) VALUES ({placeholder}, {placeholder}, {placeholder})",
            (nim, action, detail),
        )
        conn.commit()
    except Exception as exc:
        conn.rollback()
        logger.error("Gagal mencatat audit sistem untuk %s: %s", nim, exc)
    finally:
        cur.close()
        conn.close()


def toggle_user_admin(nim: str) -> bool:
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        cur.execute(f"SELECT is_admin FROM users WHERE nim = {placeholder}", (nim,))
        row = cur.fetchone()
        if not row:
            return False
        curr_admin = bool(row[0]) if engine == "postgres" else bool(row["is_admin"])
        new_val = not curr_admin
        new_role = "admin" if new_val else "mahasiswa"
        cur.execute(
            f"UPDATE users SET is_admin = {placeholder}, role = {placeholder} WHERE nim = {placeholder}",
            (new_val if engine == "postgres" else (1 if new_val else 0), new_role, nim)
        )
        conn.commit()
        return True
    finally:
        cur.close()
        conn.close()


def toggle_user_active(nim: str) -> bool:
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        cur.execute(f"SELECT is_active FROM users WHERE nim = {placeholder}", (nim,))
        row = cur.fetchone()
        if not row:
            return False
        curr_active = bool(row[0]) if engine == "postgres" else bool(row["is_active"])
        new_val = not curr_active
        cur.execute(
            f"UPDATE users SET is_active = {placeholder} WHERE nim = {placeholder}",
            (new_val if engine == "postgres" else (1 if new_val else 0), nim)
        )
        conn.commit()
        return True
    finally:
        cur.close()
        conn.close()


def is_user_active(nim: str) -> bool:
    """Cek apakah NIM aktif (tidak diblokir)"""
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        cur.execute(f"SELECT is_active FROM users WHERE nim = {placeholder}", (nim,))
        row = cur.fetchone()
        if not row:
            return True
        return bool(row[0] if engine == "postgres" else row["is_active"])
    finally:
        cur.close()
        conn.close()


def is_user_priority(nim: str) -> bool:
    """Cek apakah NIM berhak atas kuota Prioritas (20 Core, 60GB, GPU 0)"""
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        cur.execute(f"SELECT is_priority, priority_expires_at, is_active FROM users WHERE nim = {placeholder}", (nim,))
        row = cur.fetchone()
        if not row:
            return False
        
        is_active = bool(row[2]) if engine == "postgres" else bool(row["is_active"])
        if not is_active:
            return False

        is_prio = bool(row[0]) if engine == "postgres" else bool(row["is_priority"])
        expires_at = row[1] if engine == "postgres" else row["priority_expires_at"]

        if is_prio:
            if expires_at:
                if isinstance(expires_at, str):
                    exp_dt = datetime.strptime(expires_at, "%Y-%m-%d %H:%M:%S")
                else:
                    exp_dt = expires_at
                if datetime.now() > exp_dt:
                    # Sudah expired
                    unset_user_priority(nim)
                    return False
            return True
        return False
    finally:
        cur.close()
        conn.close()


def auto_expire_priorities() -> List[str]:
    """Background worker untuk mengembalikan user yang waktu boost-nya sudah lewat"""
    conn, engine = get_connection()
    cur = conn.cursor()
    expired_nims = []
    try:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        placeholder = "%s" if engine == "postgres" else "?"
        
        cur.execute(
            f"SELECT nim FROM users WHERE is_priority = {placeholder} AND priority_expires_at IS NOT NULL AND priority_expires_at <= {placeholder}",
            (True if engine == "postgres" else 1, now_str)
        )
        rows = cur.fetchall()
        for r in rows:
            nim = r[0] if engine == "postgres" else r["nim"]
            expired_nims.append(nim)
            
        for nim in expired_nims:
            unset_user_priority(nim)
            logger.info(f"Auto-expire priority: NIM {nim} dikembalikan ke mode Normal.")
            
        return expired_nims
    finally:
        cur.close()
        conn.close()


def get_audit_logs(limit: int = 100) -> List[Dict[str, Any]]:
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        safe_limit = max(1, min(int(limit), 1000))
        cur.execute(f"SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT {placeholder}", (safe_limit,))
        rows = cur.fetchall()
        results = []
        for r in rows:
            if engine == "postgres":
                item = dict(r) if hasattr(r, "keys") else {
                    "id": r[0], "nim": r[1], "action": r[2], "detail": r[3], "created_at": r[4]
                }
            else:
                item = dict(r)
            created_str = str(item.get("created_at") or "")
            target_val = item.get("nim") or "System"
            action_val = item.get("action") or "INFO"

            act = action_val.upper()
            if any(k in act for k in ["KILL", "BLOCK", "DELETE"]):
                log_type = "danger"
            elif any(k in act for k in ["OVER_QUOTA", "RESET", "WARN"]):
                log_type = "warning"
            elif any(k in act for k in ["BOOST", "SUCCESS"]):
                log_type = "success"
            else:
                log_type = "info"

            results.append({
                "id": item.get("id"),
                "nim": target_val,
                "target": target_val,
                "action": action_val,
                "detail": item.get("detail") or "",
                "time": created_str,
                "created_at": created_str,
                "type": log_type
            })
        return results
    finally:
        cur.close()
        conn.close()


def set_user_active_session(nim: str, client_ip: str) -> bool:
    """Mencatat IP perangkat aktif pengguna untuk single-session policy"""
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cur.execute(
            f"UPDATE users SET active_ip = {placeholder}, last_activity_at = {placeholder} WHERE nim = {placeholder}",
            (client_ip, now_str, nim)
        )
        conn.commit()
        return True
    except Exception as e:
        logger.warning(f"Error set_user_active_session: {e}")
        return False
    finally:
        cur.close()
        conn.close()


def clear_user_active_session(nim: str) -> bool:
    """Mengosongkan sesi aktif pengguna (logout atau sesi di-kill)"""
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        cur.execute(
            f"UPDATE users SET active_ip = NULL WHERE nim = {placeholder}",
            (nim,)
        )
        conn.commit()
        return True
    except Exception as e:
        logger.warning(f"Error clear_user_active_session: {e}")
        return False
    finally:
        cur.close()
        conn.close()


def get_user_active_session(nim: str) -> Optional[Dict[str, Any]]:
    """Membaca data sesi aktif pengguna"""
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        cur.execute(
            f"SELECT nim, nama, is_active, active_ip, last_activity_at, is_priority, role FROM users WHERE nim = {placeholder}",
            (nim,)
        )
        row = cur.fetchone()
        if not row:
            return None
        if hasattr(row, "keys"):
            return dict(row)
        return {
            "nim": row[0],
            "nama": row[1],
            "is_active": bool(row[2]),
            "active_ip": row[3],
            "last_activity_at": str(row[4]) if row[4] else None,
            "is_priority": bool(row[5]),
            "role": row[6] if len(row) > 6 else "mahasiswa"
        }
    except Exception as e:
        logger.warning(f"Error get_user_active_session: {e}")
        return None
    finally:
        cur.close()
        conn.close()


def perform_database_backup(retention_days: int = 14) -> Optional[str]:
    """
    Melakukan online hot-backup SQLite lab_users.db secara aman menggunakan native SQLite backup API.
    Aman terhadap transaksi konkuren WAL mode tanpa me-lock database.
    Menghapus backup lama yang berusia lebih dari retention_days (default 14 hari).
    Mengembalikan path file backup yang baru dibuat.
    """
    global SQLITE_PATH
    if USE_POSTGRES:
        return None

    target_path = SQLITE_PATH
    if not os.path.exists(target_path):
        local_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "lab_users.db")
        if os.path.exists(local_path):
            target_path = local_path
        else:
            try:
                conn, _ = get_connection()
                conn.close()
            except Exception:
                pass
            if os.path.exists(SQLITE_PATH):
                target_path = SQLITE_PATH
            elif os.path.exists(local_path):
                target_path = local_path
            else:
                logger.warning("File database tidak ditemukan untuk backup.")
                return None

    try:
        base_dir = os.path.dirname(target_path)
        backup_dir = os.path.join(base_dir, "backups")
        try:
            os.makedirs(backup_dir, exist_ok=True)
            try:
                os.chmod(backup_dir, 0o700)
            except OSError:
                pass
        except (PermissionError, OSError):
            local_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
            backup_dir = os.path.join(local_dir, "backups")
            os.makedirs(backup_dir, exist_ok=True)
            try:
                os.chmod(backup_dir, 0o700)
            except OSError:
                pass

        now_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest_filename = f"lab_users_backup_{now_str}.db"
        dest_path = os.path.join(backup_dir, dest_filename)

        # Hot backup menggunakan native sqlite3 backup
        src_conn = sqlite3.connect(target_path, timeout=10)
        try:
            # Checkpoint WAL log and truncate WAL file
            src_conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
            src_conn.execute("PRAGMA optimize;")
        except Exception as ck_err:
            logger.warning(f"WAL checkpoint warning: {ck_err}")

        dst_conn = sqlite3.connect(dest_path)
        with dst_conn:
            src_conn.backup(dst_conn)
        dst_conn.close()
        src_conn.close()

        # Hardening izin berkas: hanya pemilik yang dapat membaca file backup (0600)
        try:
            os.chmod(dest_path, 0o600)
        except OSError:
            pass

        logger.info(f"✅ Auto-backup database berhasil dibuat: {dest_path}")

        # Rotasi / Pembersihan backup lama
        cleanup_old_backups(backup_dir, retention_days)

        return dest_path
    except Exception as e:
        logger.error(f"❌ Gagal melakukan auto-backup database: {e}")
        return None


def cleanup_old_backups(backup_dir: str, retention_days: int = 14):
    """Menghapus file backup yang lebih tua dari retention_days hari, mempertahankan minimal 5 backup terbaru."""
    try:
        if not os.path.exists(backup_dir):
            return
        files = [
            os.path.join(backup_dir, f) for f in os.listdir(backup_dir)
            if f.startswith("lab_users_backup_") and f.endswith(".db")
        ]
        files.sort(key=os.path.getmtime, reverse=True)

        cutoff_time = time.time() - (retention_days * 86400)
        # Selalu pertahankan minimal 5 file backup terbaru
        for f in files[5:]:
            if os.path.getmtime(f) < cutoff_time:
                try:
                    os.remove(f)
                    logger.info(f"Dihapus backup lama: {os.path.basename(f)}")
                except Exception:
                    pass
    except Exception as e:
        logger.warning(f"Gagal rotasi backup: {e}")


def checkpoint_wal_database() -> Dict[str, Any]:
    """
    Melakukan flushing WAL log ke file database utama dan memotong ukuran file .db-wal (TRUNCATE).
    Mencegah membengkaknya file WAL secara berlebihan dan mengoptimalkan performa I/O query.
    """
    global SQLITE_PATH
    if USE_POSTGRES:
        return {"success": True, "message": "PostgreSQL tidak memerlukan SQLite WAL checkpoint."}

    target_path = SQLITE_PATH
    if not os.path.exists(target_path):
        local_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "lab_users.db")
        if os.path.exists(local_path):
            target_path = local_path
        else:
            return {"success": False, "message": "Database SQLite tidak ditemukan untuk WAL checkpoint."}

    try:
        conn = sqlite3.connect(target_path, timeout=10)
        cursor = conn.cursor()
        cursor.execute("PRAGMA wal_checkpoint(TRUNCATE);")
        res = cursor.fetchone()
        cursor.execute("PRAGMA optimize;")
        conn.close()
        logger.info(f"✅ SQLite WAL checkpoint (TRUNCATE) berhasil: {res}")
        return {
            "success": True,
            "message": "WAL checkpoint (TRUNCATE) dan PRAGMA optimize berhasil dieksekusi.",
            "checkpoint_result": res
        }
    except Exception as e:
        logger.error(f"❌ Gagal melakukan WAL checkpoint: {e}")
        return {"success": False, "message": str(e)}


def list_database_backups() -> List[Dict[str, Any]]:
    """Mendaftar riwayat file backup yang tersedia."""
    global SQLITE_PATH
    results = []
    dirs_to_check = []
    if SQLITE_PATH:
        dirs_to_check.append(os.path.join(os.path.dirname(SQLITE_PATH), "backups"))
    local_backup_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "backups")
    if local_backup_dir not in dirs_to_check:
        dirs_to_check.append(local_backup_dir)

    for bdir in dirs_to_check:
        if not os.path.exists(bdir):
            continue
        for fname in os.listdir(bdir):
            if fname.startswith("lab_users_backup_") and fname.endswith(".db"):
                fpath = os.path.join(bdir, fname)
                try:
                    stat = os.stat(fpath)
                    results.append({
                        "filename": fname,
                        "path": fpath,
                        "size_kb": round(stat.st_size / 1024, 1),
                        "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })
                except Exception:
                    pass
    results.sort(key=lambda x: x["created_at"], reverse=True)
    return results


def get_setting(key: str, default: str = "") -> str:
    """Mengambil nilai konfigurasi dari tabel system_settings."""
    try:
        conn, engine = get_connection()
        cur = conn.cursor()
        placeholder = "%s" if engine == "postgres" else "?"
        cur.execute(f"SELECT value FROM system_settings WHERE key = {placeholder}", (key,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            return str(row[0]) if not isinstance(row, dict) else str(row.get("value", default))
        return default
    except Exception as e:
        logger.warning(f"Gagal membaca setting {key}: {e}")
        return default


def set_setting(key: str, value: str) -> None:
    """Menyimpan atau memperbarui konfigurasi pada tabel system_settings."""
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        if engine == "postgres":
            cur.execute("""
                INSERT INTO system_settings (key, value, updated_at)
                VALUES (%s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
            """, (key, str(value)))
        else:
            cur.execute("""
                INSERT INTO system_settings (key, value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
            """, (key, str(value)))
        conn.commit()
    finally:
        cur.close()
        conn.close()


# ==============================================================================
# HASHING & MANAJEMEN PIN MASTER OPERATOR / SUPER ADMIN
# ==============================================================================

def hash_master_pin(pin: str) -> str:
    """Menghasilkan hash scrypt dengan salt acak 16 byte untuk PIN Master."""
    salt = secrets.token_bytes(16)
    derived = hashlib.scrypt(
        pin.strip().encode("utf-8"),
        salt=salt,
        n=16384,
        r=8,
        p=1,
    )
    return f"scrypt$16384$8$1${salt.hex()}${derived.hex()}"


def verify_master_pin(pin: str, stored_hash_or_plain: str) -> bool:
    """Memverifikasi PIN terhadap hash scrypt atau plaintext legacy."""
    if not stored_hash_or_plain or not pin:
        return False
    stored = stored_hash_or_plain.strip()
    clean_pin = pin.strip()

    if stored.startswith("scrypt$"):
        try:
            parts = stored.split("$")
            if len(parts) != 6:
                return False
            _, n_str, r_str, p_str, salt_hex, hash_hex = parts
            salt = bytes.fromhex(salt_hex)
            expected_hash = bytes.fromhex(hash_hex)
            computed = hashlib.scrypt(
                clean_pin.encode("utf-8"),
                salt=salt,
                n=int(n_str),
                r=int(r_str),
                p=int(p_str),
            )
            return hmac.compare_digest(computed, expected_hash)
        except Exception as e:
            logger.warning(f"Error memverifikasi hash PIN: {e}")
            return False

    # Fallback perbandingan waktu konstan untuk plaintext (dari .env awal)
    return hmac.compare_digest(clean_pin.encode("utf-8"), stored.encode("utf-8"))


def get_master_pin_hash() -> str:
    """Mengambil hash PIN Master dari system_settings jika tersedia."""
    return get_setting("admin_pin_hash", "").strip()


def set_master_pin(new_pin: str) -> str:
    """Meng-hash PIN Master baru dan menyimpannya ke system_settings."""
    hashed = hash_master_pin(new_pin)
    set_setting("admin_pin_hash", hashed)
    logger.info("[Auth] PIN Master berhasil diperbarui dan disimpan sebagai hash di database.")
    return hashed


# ==============================================================================
# MODE OPERASIONAL LAB (30 SLOT + GPU BOOST vs 60 SLOT CPU-ONLY)
# ==============================================================================

LAB_MODE_BOOST30 = "boost30"
LAB_MODE_CPU60 = "cpu60"
LAB_MODE_DEFAULT = LAB_MODE_BOOST30

# Alias historis agar otomatis/pemanggil lama tetap aman.
LAB_MODE_ALIASES = {
    "ai": LAB_MODE_BOOST30,
    "boost": LAB_MODE_BOOST30,
    "boost30": LAB_MODE_BOOST30,
    "gpu": LAB_MODE_BOOST30,
    "basic": LAB_MODE_CPU60,
    "standard": LAB_MODE_CPU60,
    "cpu": LAB_MODE_CPU60,
    "cpu60": LAB_MODE_CPU60,
}


def normalize_lab_mode(mode: Any) -> str:
    """Normalisasi mode lab, termasuk alias lama. ValueError jika tidak dikenal."""
    key = str(mode or "").strip().lower()
    normalized = LAB_MODE_ALIASES.get(key)
    if not normalized:
        raise ValueError(
            f"Mode lab tidak dikenal: {mode!r}. Gunakan '{LAB_MODE_BOOST30}' (Mode 30) "
            f"atau '{LAB_MODE_CPU60}' (Mode 60)."
        )
    return normalized


def get_lab_mode() -> str:
    """Mode lab aktif dari database. Default Mode 30 (boost30)."""
    raw = get_setting("lab_mode", LAB_MODE_DEFAULT)
    try:
        return normalize_lab_mode(raw)
    except ValueError:
        logger.warning("[LabMode] Nilai lab_mode tidak valid (%r); memakai default %s.", raw, LAB_MODE_DEFAULT)
        return LAB_MODE_DEFAULT


def set_lab_mode(mode: str) -> str:
    """Simpan mode lab setelah validasi. Tidak menyentuh toggle GPU Boost."""
    normalized = normalize_lab_mode(mode)
    set_setting("lab_mode", normalized)
    logger.info("[LabMode] Mode lab diset ke %s.", normalized)
    return normalized


def _lab_profile_for_mode(mode: str) -> Dict[str, Any]:
    if mode == LAB_MODE_BOOST30:
        return {
            "mode": LAB_MODE_BOOST30,
            "name": "Mode 30 - GPU Boost",
            "short_name": "Mode 30 (30 Slot)",
            "description": (
                "Level 2 maksimal 30 sesi CPU-only (2 core / 3.0 GB RAM); "
                "hingga 3 mahasiswa dapat GPU Boost sementara (GPU 1)."
            ),
            "max_slots": 30,
            "gpu_boost_allowed": True,
            "gpu_enabled": False,
            "gpu_device": "",
            "gpu_name": "GPU Boost (3 Slot)",
            "ram_limit_gb": 3.0,
            "ram_limit_mb": 3072.0,
            "cpu_limit_cores": 2.0,
            "idle_release_minutes": 15,
        }
    return {
        "mode": LAB_MODE_CPU60,
        "name": "Mode 60 - CPU Only",
        "short_name": "Mode 60 (60 Slot)",
        "description": (
            "Level 2 maksimal 60 sesi CPU-only (1 core / 1.5 GB RAM). "
            "GPU Boost dikunci mati; boost yang sudah berjalan tetap dihormati sampai kedaluwarsa."
        ),
        "max_slots": 60,
        "gpu_boost_allowed": False,
        "gpu_enabled": False,
        "gpu_device": "",
        "gpu_name": "GPU Boost (Dinonaktifkan)",
        "ram_limit_gb": 1.5,
        "ram_limit_mb": 1536.0,
        "cpu_limit_cores": 1.0,
        "idle_release_minutes": 15,
    }


def get_lab_profile() -> Dict[str, Any]:
    """Profil operasional Lab Komputasi UMPO sesuai mode aktif (30/60)."""
    return _lab_profile_for_mode(get_lab_mode())


def set_lab_profile(mode: str) -> Dict[str, Any]:
    """Ubah mode lab dan rekonsiliasi toggle GPU Boost.

    - 30 -> 60 : toggle global dipaksa OFF (boost berjalan tetap dihormati).
    - 60 -> 30 : toggle global dinyalakan kembali.
    - Mode sama : toggle tidak diubah agar pilihan manual Aslab/Admin tidak tertimpa.
    """
    target = normalize_lab_mode(mode)
    previous = get_lab_mode()
    if target != previous:
        set_lab_mode(target)
        set_gpu_boost_enabled(target == LAB_MODE_BOOST30)
        logger.info(
            "[LabMode] Perpindahan mode %s -> %s; toggle GPU Boost %s.",
            previous,
            target,
            "ON" if target == LAB_MODE_BOOST30 else "OFF",
        )
    return get_lab_profile()


