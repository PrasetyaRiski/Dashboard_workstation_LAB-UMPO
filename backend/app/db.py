"""
Database Management untuk User & Resource Allocation
Mendukung PostgreSQL (Port 5432) dengan fallback otomatis ke SQLite lokal
"""

import os
import sqlite3
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

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

SQLITE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "lab_users.db")


def get_connection():
    """Mengembalikan koneksi database PostgreSQL atau SQLite fallback"""
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
    os.makedirs(os.path.dirname(SQLITE_PATH), exist_ok=True)
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
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
            """)
        else:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    nim TEXT PRIMARY KEY,
                    nama TEXT,
                    is_admin INTEGER DEFAULT 0,
                    is_priority INTEGER DEFAULT 0,
                    priority_expires_at TIMESTAMP NULL,
                    is_active INTEGER DEFAULT 1,
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
        conn.commit()
        logger.info(f"Database ({engine}) berhasil diinisialisasi.")
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

        if engine == "postgres":
            res = dict(row) if hasattr(row, "keys") else {
                "nim": row[0], "nama": row[1], "is_admin": bool(row[2]),
                "is_priority": bool(row[3]), "priority_expires_at": row[4],
                "is_active": bool(row[5]), "created_at": row[6], "last_login": row[7]
            }
        else:
            res = dict(row)
            res["is_admin"] = bool(res.get("is_admin"))
            res["is_priority"] = bool(res.get("is_priority"))
            res["is_active"] = bool(res.get("is_active"))
        return res
    finally:
        cur.close()
        conn.close()


def list_users() -> List[Dict[str, Any]]:
    conn, engine = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM users ORDER BY is_priority DESC, last_login DESC NULLS LAST")
        rows = cur.fetchall()
        results = []
        for r in rows:
            if engine == "postgres":
                item = dict(r) if hasattr(r, "keys") else {
                    "nim": r[0], "nama": r[1], "is_admin": bool(r[2]),
                    "is_priority": bool(r[3]), "priority_expires_at": r[4],
                    "is_active": bool(r[5]), "created_at": r[6], "last_login": r[7]
                }
            else:
                item = dict(r)
                item["is_admin"] = bool(item.get("is_admin"))
                item["is_priority"] = bool(item.get("is_priority"))
                item["is_active"] = bool(item.get("is_active"))
            
            # Format expires_at string jika ada
            if item.get("priority_expires_at"):
                item["priority_expires_at"] = str(item["priority_expires_at"])
            if item.get("created_at"):
                item["created_at"] = str(item["created_at"])
            if item.get("last_login"):
                item["last_login"] = str(item["last_login"])
                
            results.append(item)
        return results
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
            (nim, "BOOST_PRIORITY", f"Menaikkan ke mode Monster selama {hours} jam. Alasan: {reason}")
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
            (nim, "UNBOOST_PRIORITY", "Dikembalikan ke mode Normal (Praktikan)")
        )
        conn.commit()
        return True
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
        cur.execute(
            f"UPDATE users SET is_admin = {placeholder} WHERE nim = {placeholder}",
            (new_val if engine == "postgres" else (1 if new_val else 0), nim)
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


def is_user_priority(nim: str) -> bool:
    """Cek apakah NIM berhak atas kuota Prioritas (20 Core, 70GB, GPU 0)"""
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
