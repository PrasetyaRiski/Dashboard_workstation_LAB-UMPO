import asyncio
import os
import secrets
import signal
import subprocess
import time
import logging
from datetime import datetime
from collections import deque, defaultdict
import psutil

logger = logging.getLogger("panel-lab")
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from app.telemetry import (
    get_snapshot, TRAINING_UIDS, PROTECTED_PROCESS_NAMES,
    get_user_disk_metrics, update_all_user_disk_usage
)
from app.simtik_auth import verify_simtik_credentials
import app.db as db
from app.db import (
    init_db, get_or_create_user, list_users,
    set_user_priority, unset_user_priority,
    toggle_user_admin, toggle_user_active, set_user_role,
    is_user_priority, auto_expire_priorities, get_connection,
    perform_database_backup, list_database_backups,
    get_user, nim_to_username
)

# Load .env file automatically jika tersedia di root direktori atau backend
try:
    from dotenv import load_dotenv
    _CURR_DIR = os.path.dirname(os.path.abspath(__file__))
    _PROJ_ROOT = os.path.dirname(os.path.dirname(_CURR_DIR))
    load_dotenv(os.path.join(_PROJ_ROOT, ".env"))
    load_dotenv(os.path.join(os.path.dirname(_CURR_DIR), ".env"))
    load_dotenv()
except Exception:
    pass

app = FastAPI(title="AI Lab Compute Dashboard", version="2.1.0")

security = HTTPBearer(auto_error=False)
ADMIN_PIN = os.getenv("ADMIN_PIN", "labrisetai26")
ACTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}
FAILED_LOGIN_ATTEMPTS: Dict[str, List[float]] = defaultdict(list)
SESSION_MAX_AGE_SECONDS = 12 * 3600  # Maksimal 12 jam

def get_current_session(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict[str, Any]:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Autentikasi diperlukan. Silakan login terlebih dahulu.")
    token = credentials.credentials
    session = ACTIVE_SESSIONS.get(token)
    if not session:
        raise HTTPException(status_code=401, detail="Sesi login kedaluwarsa atau tidak valid. Silakan login kembali.")
    if session.get("expires_at") and time.time() > session["expires_at"]:
        ACTIVE_SESSIONS.pop(token, None)
        raise HTTPException(status_code=401, detail="Sesi login telah kedaluwarsa (maksimal 12 jam). Silakan login kembali.")
    return session

def verify_operator_or_admin(session: Dict[str, Any] = Depends(get_current_session)) -> Dict[str, Any]:
    """Mengizinkan Asisten Lab (Operator) dan Super Admin"""
    role = session.get("role")
    if role not in ["aslab", "admin"]:
        raise HTTPException(status_code=403, detail="Akses ditolak: Memerlukan hak akses Operator (Aslab) atau Admin.")
    return session

def verify_super_admin(session: Dict[str, Any] = Depends(get_current_session)) -> Dict[str, Any]:
    """Hanya mengizinkan Super Admin"""
    role = session.get("role")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Akses ditolak: Aksi ini memerlukan hak akses Super Admin.")
    return session

# Kompatibilitas untuk handler umum
verify_admin = verify_operator_or_admin

class LoginRequest(BaseModel):
    pin: Optional[str] = None
    nim: Optional[str] = None
    password: Optional[str] = None

class SetRoleRequest(BaseModel):
    nim: str
    role: str

@app.post("/api/admin/login")
def admin_login(req: LoginRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    now_ts = time.time()

    # Rate limiting: Maksimal 5 kali kegagalan per IP dalam jendela 5 menit
    recent_fails = [t for t in FAILED_LOGIN_ATTEMPTS[client_ip] if now_ts - t < 300]
    FAILED_LOGIN_ATTEMPTS[client_ip] = recent_fails
    if len(recent_fails) >= 5:
        raise HTTPException(
            status_code=429,
            detail="Terlalu banyak percobaan login yang gagal. Akses dibatasi sementara selama 5 menit demi keamanan."
        )

    # 1. Login via Master PIN (Super Admin)
    if req.pin:
        if req.pin.strip() == ADMIN_PIN.strip():
            FAILED_LOGIN_ATTEMPTS.pop(client_ip, None)
            token = secrets.token_hex(32)
            ACTIVE_SESSIONS[token] = {
                "role": "admin",
                "nim": None,
                "nama": "Super Admin",
                "expires_at": now_ts + SESSION_MAX_AGE_SECONDS
            }
            return {
                "success": True,
                "token": token,
                "role": "admin",
                "user": {"nim": None, "nama": "Super Admin", "role": "admin"}
            }
        FAILED_LOGIN_ATTEMPTS[client_ip].append(now_ts)
        raise HTTPException(status_code=401, detail="PIN Master Admin salah")

    # 2. Login via Akun SIMTIK (Aslab / Admin)
    if req.nim and req.password:
        is_valid, msg, user_data = verify_simtik_credentials(req.nim, req.password)
        if not is_valid:
            FAILED_LOGIN_ATTEMPTS[client_ip].append(now_ts)
            raise HTTPException(status_code=401, detail=msg or "Kredensial SIMTIK salah atau layanan tidak dapat dihubungi.")

        user = get_or_create_user(req.nim, user_data.get("nama"))
        if not user.get("is_active", True):
            FAILED_LOGIN_ATTEMPTS[client_ip].append(now_ts)
            raise HTTPException(status_code=403, detail="Akses ditolak: Akun Anda dinonaktifkan oleh Admin Lab.")

        user_role = user.get("role") or ("admin" if user.get("is_admin") else "mahasiswa")
        if user_role not in ["aslab", "admin"]:
            FAILED_LOGIN_ATTEMPTS[client_ip].append(now_ts)
            raise HTTPException(
                status_code=403,
                detail=f"Akses Ditolak: Akun NIM {req.nim} terdaftar sebagai Mahasiswa dan tidak memiliki izin akses administratif lab."
            )

        FAILED_LOGIN_ATTEMPTS.pop(client_ip, None)
        token = secrets.token_hex(32)
        nama_user = user.get("nama") or f"Mahasiswa {req.nim}"
        ACTIVE_SESSIONS[token] = {
            "role": user_role,
            "nim": req.nim,
            "nama": nama_user,
            "expires_at": now_ts + SESSION_MAX_AGE_SECONDS
        }
        record_audit(
            target=f"NIM {req.nim}",
            action="LOGIN_DASHBOARD",
            detail=f"{nama_user} login ke dashboard sebagai {user_role.upper()}.",
            log_type="info"
        )
        return {
            "success": True,
            "token": token,
            "role": user_role,
            "user": {"nim": req.nim, "nama": nama_user, "role": user_role}
        }

    raise HTTPException(status_code=400, detail="Harap masukkan PIN Master atau NIM & Password SIMTIK.")

@app.post("/api/admin/logout")
def admin_logout(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if credentials and credentials.credentials:
        ACTIVE_SESSIONS.pop(credentials.credentials, None)
    return {"success": True}

@app.post("/api/users/set-role")
def set_role_api(req: SetRoleRequest, session: Dict[str, Any] = Depends(verify_super_admin)):
    """Mengubah role pengguna: 'mahasiswa', 'aslab', atau 'admin' (Hanya Super Admin)"""
    success = set_user_role(req.nim, req.role)
    if success:
        admin_nama = session.get("nama") or "Super Admin"
        record_audit(
            target=f"NIM {req.nim}",
            action="SET_ROLE",
            detail=f"Role NIM {req.nim} diubah menjadi {req.role.upper()} oleh {admin_nama}.",
            log_type="info"
        )
        return {"success": True, "message": f"Role NIM {req.nim} berhasil diubah menjadi {req.role.upper()}."}
    raise HTTPException(status_code=400, detail="Gagal mengubah role atau role tidak valid.")

@app.get("/api/stats/capacity")
def get_capacity():
    users = list_users()
    active_boosts = 0
    now = datetime.now()
    for u in users:
        if u.get("is_priority") and u.get("priority_expires_at"):
            exp_str = u.get("priority_expires_at")
            try:
                if isinstance(exp_str, str):
                    exp_dt = datetime.strptime(exp_str, "%Y-%m-%d %H:%M:%S")
                else:
                    exp_dt = exp_str
                if exp_dt > now:
                    active_boosts += 1
            except Exception:
                pass
    return {"success": True, "total_slots": 1, "used_slots": active_boosts}

@app.get("/api/audit-logs")
def get_audit_logs_api(limit: int = 100):
    from app.db import get_audit_logs
    return {"success": True, "logs": get_audit_logs(limit)}


# Default Admin PIN (dapat diubah via Environment Variable LAB_ADMIN_PIN)
LAB_ADMIN_PIN = os.getenv("LAB_ADMIN_PIN", ADMIN_PIN)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

# In-Memory Audit Logs Buffer
audit_logs = deque(maxlen=60)
audit_logs.append({
    "time": time.strftime("%H:%M:%S"),
    "action": "SYSTEM_INIT",
    "target": "Server Node UMPO",
    "detail": "Dashboard Monitoring v2.1 aktif. Sistem kontrol hak akses Admin siap.",
    "type": "info"
})

def record_audit(target: str, action: str, detail: str, log_type: str = "info"):
    now_time = time.strftime("%H:%M:%S")
    audit_logs.appendleft({
        "time": now_time,
        "action": action,
        "target": target,
        "detail": detail,
        "type": log_type
    })
    try:
        conn, engine = get_connection()
        cur = conn.cursor()
        placeholder = "%s" if engine == "postgres" else "?"
        cur.execute(
            f"INSERT INTO audit_logs (nim, action, detail) VALUES ({placeholder}, {placeholder}, {placeholder})",
            (target, action, detail)
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print("Error writing to audit_logs DB:", e)

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VerifyPinRequest(BaseModel):
    pin: str

class KillProcessRequest(BaseModel):
    pid: int

class KillUserAllRequest(BaseModel):
    username: str

class ResetPasswordRequest(BaseModel):
    username: str
    new_password: str

class SimulationRequest(BaseModel):
    pass

class SimtikLoginRequest(BaseModel):
    nim: str
    password: str

class BoostUserRequest(BaseModel):
    nim: str
    hours: int = 4
    reason: Optional[str] = "Admin Boost"

class UserActionRequest(BaseModel):
    nim: str

def get_full_snapshot():
    s = get_snapshot()

    # Aggregate all active processes (GPU & non-GPU user processes) for unified Process Manager
    all_processes = []
    seen_pids = set()

    for gpu in s.get("gpus", []):
        g_idx = gpu.get("index")
        for p in gpu.get("processes", []):
            pid = p.get("pid")
            if pid not in seen_pids:
                seen_pids.add(pid)
                all_processes.append({
                    "gpu_index": g_idx,
                    "gpu_name": f"GPU {g_idx}",
                    "pid": pid,
                    "username": p.get("username"),
                    "name": p.get("name"),
                    "cmdline": p.get("cmdline"),
                    "vram_mb": p.get("vram_mb", 0.0),
                    "ram_mb": p.get("ram_mb", 0.0),
                    "cpu_percent": p.get("cpu_percent", 0.0),
                    "uptime": p.get("uptime", "00:00:00"),
                    "is_system": p.get("is_system", False),
                    "is_killable": p.get("is_killable", True)
                })

    # Include user CPU & session processes
    for u in s.get("users", []):
        uname = u.get("username")
        for p in u.get("processes", []):
            pid = p.get("pid")
            if pid and pid not in seen_pids:
                seen_pids.add(pid)
                all_processes.append({
                    "gpu_index": p.get("gpu_index"),
                    "gpu_name": p.get("gpu_name", "CPU / Sesi"),
                    "pid": pid,
                    "username": uname,
                    "name": p.get("name"),
                    "cmdline": p.get("cmdline"),
                    "vram_mb": p.get("vram_mb", 0.0),
                    "ram_mb": p.get("ram_mb", 0.0),
                    "cpu_percent": p.get("cpu_percent", 0.0),
                    "uptime": p.get("uptime", "00:00:00"),
                    "is_system": p.get("is_system", False),
                    "is_killable": p.get("is_killable", True)
                })

    s["all_processes"] = all_processes

    # Check for over-quota users and log to audit_logs once per minute
    now_m = time.strftime("%H:%M")
    for u in s.get("users", []):
        if u.get("status_color") == "red":
            uname = u.get("username")
            recent_keys = [f"{log.get('target')}_{log.get('time')[:5]}" for log in audit_logs if log.get('action') == "OVER_QUOTA"]
            if f"{uname}_{now_m}" not in recent_keys:
                record_audit(
                    target=uname,
                    action="OVER_QUOTA",
                    detail=f"Penggunaan VRAM ({u.get('vram_used_mb')} MB) melebihi ambang batas praktikum (30%)",
                    log_type="warning"
                )
    from app.db import get_audit_logs
    s["audit_logs"] = get_audit_logs(60)
    s["admin_pin_required"] = False
    return s

@app.get("/api/status")
def get_status():
    return get_full_snapshot()

@app.post("/api/verify-pin")
def verify_pin(req: VerifyPinRequest):
    return {"success": True, "message": "Mode Admin (PIN dihapus)."}

@app.get("/api/export-telemetry")
def export_telemetry():
    return get_full_snapshot()

@app.post("/api/kill-process")
def kill_process(req: KillProcessRequest, request: Request, session: Dict[str, Any] = Depends(verify_operator_or_admin)):
    try:
        p = psutil.Process(req.pid)
        username = p.username()
        proc_name = p.name()
        cmd = p.cmdline()
        cmdline = " ".join(cmd) if cmd else proc_name

        # 1. Proteksi Akun Sistem: Hanya akun user/riset yang boleh di-kill
        allowed_users = set(TRAINING_UIDS.values())
        if username not in allowed_users and not (username.startswith("m") and username[1:].isdigit()):
            raise HTTPException(
                status_code=403,
                detail=f"Ditolak: Proses '{proc_name}' (PID {req.pid}) milik akun sistem '{username}' diproteksi dan TIDAK DAPAT dimatikan."
            )

        # 2. Proteksi Layanan / Shell Sistem Penting (Kecuali server notebook singleuser mahasiswa)
        critical_keywords = ["cloudflared", "1panel", "portainer", "systemd", "dockerd", "uvicorn", "sshd", "gunicorn"]
        is_student_notebook = (proc_name.lower() == "jupyterhub-singleuser" or "singleuser" in cmdline.lower())
        if not is_student_notebook:
            if proc_name.lower() in PROTECTED_PROCESS_NAMES or any(k in cmdline.lower() for k in critical_keywords) or ("jupyterhub" in cmdline.lower() and "singleuser" not in cmdline.lower()):
                raise HTTPException(
                    status_code=403,
                    detail=f"Ditolak: Proses '{proc_name}' (PID {req.pid}) merupakan layanan/shell sistem penting dan diproteksi dari penghentian."
                )

        p.terminate()
        try:
            p.wait(timeout=2)
        except psutil.TimeoutExpired:
            p.kill()

        actor_name = session.get("nama") or "Operator"
        record_audit(
            target=f"{username} (PID {req.pid})",
            action="KILL_PROCESS",
            detail=f"Proses komputasi '{proc_name}' ({req.pid}) milik user {username} dihentikan oleh {actor_name}.",
            log_type="danger"
        )

        return {"success": True, "message": f"Proses PID {req.pid} ({proc_name}) milik user {username} berhasil dihentikan."}
    except psutil.NoSuchProcess:
        return {"success": False, "message": f"Proses PID {req.pid} sudah tidak aktif lagi."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menghentikan proses: {str(e)}")

@app.post("/api/kill-user-all")
def kill_user_all(req: KillUserAllRequest, request: Request, session: Dict[str, Any] = Depends(verify_operator_or_admin)):
    if req.username not in TRAINING_UIDS.values() and not (req.username.startswith("m") and req.username[1:].isdigit()):
        raise HTTPException(status_code=400, detail="User tidak valid")

    try:
        # 1. Hentikan service systemd SystemdSpawner jika ada
        try:
            subprocess.run(["systemctl", "stop", f"jupyter-{req.username}-singleuser.service"], check=False, timeout=3)
            subprocess.run(["systemctl", "stop", f"jupyter-{req.username}.service"], check=False, timeout=3)
        except Exception:
            pass

        # 2. Hentikan seluruh proses komputasi dan script user
        subprocess.run(["pkill", "-u", req.username], check=False)
        time.sleep(0.3)
        # 3. Paksa hentikan proses yang masih bertahan (SIGKILL)
        subprocess.run(["pkill", "-9", "-u", req.username], check=False)

        # 4. Putus sesi login/terminal user jika ada
        try:
            subprocess.run(["loginctl", "terminate-user", req.username], check=False, timeout=2)
        except Exception:
            pass

        # 4. Bebaskan sesi perangkat aktif di database
        try:
            from app.db import clear_user_active_session
            nim = req.username[1:] if (req.username.startswith("m") and req.username[1:].isdigit()) else req.username
            clear_user_active_session(nim)
        except Exception:
            pass

        actor_name = session.get("nama") or "Operator"
        record_audit(
            target=req.username,
            action="KILL_USER_ALL",
            detail=f"Seluruh sesi dan proses milik user '{req.username}' berhasil dihentikan paksa oleh {actor_name}.",
            log_type="danger"
        )
        return {"success": True, "message": f"Seluruh sesi dan proses komputasi milik user '{req.username}' berhasil dihentikan."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reset-password")
def reset_password(req: ResetPasswordRequest, request: Request, session: Dict[str, Any] = Depends(verify_super_admin)):
    if req.username not in TRAINING_UIDS.values():
        raise HTTPException(status_code=400, detail="User target tidak valid (Hanya akun lab/training yang dapat direset)")
    if len(req.new_password) < 4:
        raise HTTPException(status_code=400, detail="Password minimal 4 karakter")
    if "\n" in req.new_password or "\r" in req.new_password or ":" in req.new_password:
        raise HTTPException(status_code=400, detail="Password tidak boleh mengandung karakter newline atau titik dua.")

    try:
        proc = subprocess.run(
            ["sudo", "chpasswd"],
            input=f"{req.username}:{req.new_password}",
            text=True,
            capture_output=True,
            check=True
        )

        actor_name = session.get("nama") or "Super Admin"
        record_audit(
            target=req.username,
            action="RESET_PASSWORD",
            detail=f"Password user '{req.username}' berhasil diperbarui oleh {actor_name}.",
            log_type="warning"
        )

        return {"success": True, "message": f"Password untuk user {req.username} berhasil diubah."}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengubah password: {e.stderr}")


# ==========================================
# SIMTIK AUTHENTICATION & USER MANAGEMENT API
# ==========================================

@app.post("/api/auth/simtik")
async def auth_simtik(req: SimtikLoginRequest):
    """Verifikasi NIM & Password langsung ke SIMTIK UMPO"""
    is_valid, msg, user_data = verify_simtik_credentials(req.nim, req.password)
    if not is_valid:
        return JSONResponse(status_code=401, content={"success": False, "message": msg})
    
    # Daftarkan/update user ke database lokal
    nama = user_data.get("nama", f"Mahasiswa {req.nim}")
    user = get_or_create_user(req.nim, nama)
    return {
        "success": True,
        "message": "Login SIMTIK Berhasil",
        "user": user
    }

@app.get("/api/users/students")
def get_students():
    """Mengambil daftar seluruh mahasiswa terdaftar beserta status mode prioritas dan kuota storage"""
    users = list_users()
    for u in users:
        uname = f"m{u['nim']}"
        disk_info = get_user_disk_metrics(uname, is_priority=bool(u.get("is_priority")))
        u.update(disk_info)
    return {"success": True, "users": users}

@app.post("/api/users/boost")
def boost_student(req: BoostUserRequest, session: Dict[str, Any] = Depends(verify_super_admin)):
    """Menaikkan NIM ke Mode Prioritas Level 1 (20 Core, 70G, GPU 0)"""
    
    # --- Admission Control ---
    # Hitung jumlah user yang sedang dalam masa boost prioritas
    users = list_users()
    active_boosts = 0
    now = datetime.now()
    for u in users:
        if u.get("is_priority"):
            exp_str = u.get("priority_expires_at")
            if exp_str:
                try:
                    exp_dt = datetime.strptime(exp_str, "%Y-%m-%d %H:%M:%S") if isinstance(exp_str, str) else exp_str
                    if exp_dt > now:
                        active_boosts += 1
                except Exception:
                    pass
                    
    # Maksimal 1 user boost karena hanya ada 1 slot GPU 0 (dedicated)
    if active_boosts >= 1:
        raise HTTPException(
            status_code=400, 
            detail="Kapasitas Penuh: Saat ini sudah ada slot prioritas (GPU 0) yang digunakan. Silakan tunggu hingga sesi sebelumnya selesai/expired."
        )
    # -------------------------

    success = set_user_priority(req.nim, req.hours, req.reason or "Admin Boost")
    if success:
        # Hentikan sesi lama (jika sedang aktif di Level 2) agar spawn berikutnya otomatis masuk ke Level 1 (GPU 0)
        os_username = f"m{req.nim}"
        subprocess.run(["pkill", "-u", os_username], check=False)
        record_audit(
            target=f"NIM {req.nim}",
            action="BOOST_PRIORITY",
            detail=f"Dinaikkan ke Mode Prioritas Level 1 (20 Core, 70G, GPU 0) selama {req.hours} jam oleh {session.get('nama')}.",
            log_type="success"
        )
        return {"success": True, "message": f"NIM {req.nim} berhasil di-boost ke Mode Prioritas Level 1 selama {req.hours} jam."}
    raise HTTPException(status_code=400, detail="Gagal mengaktifkan mode prioritas.")

@app.post("/api/users/unboost")
def unboost_student(req: UserActionRequest, session: Dict[str, Any] = Depends(verify_super_admin)):
    """Mengembalikan NIM ke Mode Standard Level 2 (2 Core, 3G, GPU 1)"""
    success = unset_user_priority(req.nim)
    if success:
        # Hentikan sesi Level 1 yang sedang aktif agar GPU 0 dibebaskan dan sesi baru masuk ke Level 2
        os_username = f"m{req.nim}"
        subprocess.run(["pkill", "-u", os_username], check=False)
        record_audit(
            target=f"NIM {req.nim}",
            action="UNBOOST_PRIORITY",
            detail=f"Dikembalikan ke Mode Standard Level 2 (2 Core, 3G, GPU 1) oleh {session.get('nama')}.",
            log_type="info"
        )
        return {"success": True, "message": f"NIM {req.nim} dikembalikan ke Mode Standard Level 2."}
    raise HTTPException(status_code=400, detail="Gagal menonaktifkan mode prioritas.")

@app.post("/api/users/toggle-admin")
def toggle_admin(req: UserActionRequest, session: Dict[str, Any] = Depends(verify_super_admin)):
    """Toggle hak akses admin dashboard untuk NIM tertentu"""
    success = toggle_user_admin(req.nim)
    if success:
        return {"success": True, "message": f"Status Admin untuk NIM {req.nim} berhasil diperbarui."}
    raise HTTPException(status_code=404, detail="User tidak ditemukan.")

@app.post("/api/users/toggle-active")
def toggle_active(req: UserActionRequest, request: Request, session: Dict[str, Any] = Depends(verify_super_admin)):
    """Toggle status aktif/blokir akses untuk NIM tertentu dan kill proses jika diblokir"""
    success = toggle_user_active(req.nim)
    if success:
        conn, engine = get_connection()
        cur = conn.cursor()
        placeholder = "%s" if engine == "postgres" else "?"
        cur.execute(f"SELECT is_active FROM users WHERE nim = {placeholder}", (req.nim,))
        row = cur.fetchone()
        if row:
            is_active = bool(row[0] if engine == "postgres" else row["is_active"])
            if not is_active:
                import subprocess
                os_username = f"m{req.nim}"
                subprocess.run(["pkill", "-u", os_username], check=False)
                subprocess.run(["pkill", "-9", "-u", os_username], check=False)
                try:
                    subprocess.run(["loginctl", "terminate-user", os_username], check=False, timeout=2)
                except:
                    pass
                record_audit(
                    target=f"NIM {req.nim}",
                    action="BLOCK_USER",
                    detail=f"Akun NIM {req.nim} dinonaktifkan/diblokir oleh {session.get('nama')} dan seluruh sesi dihentikan.",
                    log_type="danger"
                )
            else:
                record_audit(
                    target=f"NIM {req.nim}",
                    action="UNBLOCK_USER",
                    detail=f"Akun NIM {req.nim} diaktifkan kembali oleh {session.get('nama')}.",
                    log_type="success"
                )
        return {"success": True, "message": f"Status Akses untuk NIM {req.nim} berhasil diperbarui."}
    raise HTTPException(status_code=404, detail="User tidak ditemukan.")

class AddUserRequest(BaseModel):
    nim: str
    nama: str
    is_admin: bool = False

@app.post("/api/users/clear-cache")
def clear_user_cache(req: UserActionRequest, request: Request, session: Dict[str, Any] = Depends(verify_operator_or_admin)):
    import subprocess
    import shutil
    try:
        clean_nim = str(req.nim).strip()
        user_record = db.get_user(clean_nim)
        if not user_record:
            raise HTTPException(status_code=404, detail=f"Mahasiswa dengan NIM {clean_nim} tidak ditemukan di database.")
        
        # Cari username OS & direktori home (biasanya m<nim> atau <nim>)
        possible_unames = [f"m{clean_nim}", clean_nim]
        username = f"m{clean_nim}"
        home_dir = f"/home/m{clean_nim}"
        for u in possible_unames:
            h = f"/home/{u}"
            if os.path.exists(h):
                username = u
                home_dir = h
                break
        
        if not os.path.exists(home_dir):
            return {
                "success": True,
                "message": f"Direktori kerja /home/{username} belum dibuat (mahasiswa belum pernah membuka sesi notebook)."
            }
        
        deleted_items = []
        
        # 1. Hapus cache PIP: ~/.cache/pip
        pip_cache = f"{home_dir}/.cache/pip"
        if os.path.exists(pip_cache):
            cmd = ["rm", "-rf", pip_cache]
            if os.geteuid() != 0:
                cmd = ["sudo", "-n"] + cmd
            subprocess.run(cmd, check=False)
            deleted_items.append("Cache PIP")
        
        # 2. Hapus .ipynb_checkpoints di seluruh direktori user
        cmd_find = ["find", home_dir, "-name", ".ipynb_checkpoints", "-type", "d", "-exec", "rm", "-rf", "{}", "+"]
        if os.geteuid() != 0:
            cmd_find = ["sudo", "-n"] + cmd_find
        subprocess.run(cmd_find, check=False)
        deleted_items.append("Checkpoints Notebook")
        
        # 3. Hapus cache Torch & HuggingFace jika ada
        for sub_cache in ["torch", "huggingface"]:
            p = f"{home_dir}/.cache/{sub_cache}"
            if os.path.exists(p):
                cmd_c = ["rm", "-rf", p]
                if os.geteuid() != 0:
                    cmd_c = ["sudo", "-n"] + cmd_c
                subprocess.run(cmd_c, check=False)
                deleted_items.append(f"Cache {sub_cache.capitalize()}")
        
        operator = session.get("nama") or session.get("nim") or "Admin"
        items_desc = ", ".join(deleted_items) if deleted_items else "Cache sudah bersih"
        action_desc = f"Disk Cache Cleared ({items_desc}) oleh {operator}"
        try:
            record_audit(clean_nim, "CLEAR_CACHE", action_desc)
        except Exception as audit_err:
            logger.warning(f"Gagal mencatat audit log clear cache: {audit_err}")
        
        # Refresh metrik disk secara asinkron
        try:
            update_all_user_disk_usage([username])
        except Exception:
            pass
            
        return {
            "success": True,
            "message": f"Pembersihan cache NIM {clean_nim} selesai ({items_desc})."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clear cache {req.nim}: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "detail": f"Gagal membersihkan cache: {str(e)}"}
        )


from pydantic import BaseModel
class CopyRequest(BaseModel):
    filepath: str

@app.get("/api/users/{nim}/files")
def list_user_files(nim: str, path: str = "", session: Dict[str, Any] = Depends(verify_super_admin)):
    import subprocess, os
    clean_nim = "".join(c for c in nim if c.isalnum())
    home_dir = f"/home/{clean_nim}"
    if not os.path.exists(home_dir):
        return {"success": False, "files": [], "detail": "Direktori tidak ditemukan."}
    
    target_path = os.path.abspath(os.path.join(home_dir, path))
    if not target_path.startswith(home_dir):
        raise HTTPException(status_code=400, detail="Invalid path")
    
    cmd = ["find", target_path, "-maxdepth", "1", "-printf", "%f|%y|%s|%T@\n"]
    if os.geteuid() != 0:
        cmd = ["sudo", "-n"] + cmd
        
    try:
        res = subprocess.run(cmd, capture_output=True, text=True)
        files = []
        for line in res.stdout.splitlines():
            parts = line.split("|")
            if len(parts) >= 4:
                name = parts[0]
                typ = parts[1]
                size = parts[2]
                mtime = parts[3]
                if name == "." or name == "..":
                    continue
                files.append({
                    "name": name,
                    "is_dir": typ == 'd',
                    "size": int(size),
                    "mtime": float(mtime)
                })
        return {"success": True, "files": sorted(files, key=lambda x: (not x['is_dir'], x['name'].lower()))}
    except Exception as e:
        return {"success": False, "detail": str(e)}

from fastapi.responses import Response
import mimetypes

@app.get("/api/users/{nim}/download")
def download_user_file(nim: str, filepath: str, session: Dict[str, Any] = Depends(verify_super_admin)):
    import subprocess, os
    clean_nim = "".join(c for c in nim if c.isalnum())
    home_dir = f"/home/{clean_nim}"
    target_path = os.path.abspath(os.path.join(home_dir, filepath))
    if not target_path.startswith(home_dir):
        raise HTTPException(status_code=400, detail="Invalid path")
        
    cmd = ["cat", target_path]
    if os.geteuid() != 0:
        cmd = ["sudo", "-n"] + cmd
    
    res = subprocess.run(cmd, capture_output=True)
    if res.returncode != 0:
        raise HTTPException(status_code=404, detail="File not found or unreadable")
        
    mime, _ = mimetypes.guess_type(target_path)
    filename = os.path.basename(target_path)
    return Response(content=res.stdout, media_type=mime or "application/octet-stream", headers={"Content-Disposition": f'attachment; filename="{filename}"'})

@app.post("/api/users/{nim}/copy-to-shared")
def copy_file_to_shared(nim: str, req: CopyRequest, session: Dict[str, Any] = Depends(verify_super_admin)):
    import subprocess, os
    filepath = req.filepath
    clean_nim = "".join(c for c in nim if c.isalnum())
    home_dir = f"/home/{clean_nim}"
    target_path = os.path.abspath(os.path.join(home_dir, filepath))
    if not target_path.startswith(home_dir):
        raise HTTPException(status_code=400, detail="Invalid path")
        
    shared_dir = "/home/dataset_shared"
    dest_path = os.path.join(shared_dir, os.path.basename(target_path))
    
    cmd = ["cp", "-r", target_path, dest_path]
    if os.geteuid() != 0:
        cmd = ["sudo", "-n"] + cmd
        
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        return {"success": False, "detail": res.stderr}
        
    cmd_chmod = ["chmod", "-R", "755", dest_path]
    if os.geteuid() != 0:
        cmd_chmod = ["sudo", "-n"] + cmd_chmod
    subprocess.run(cmd_chmod, check=False)
    
    return {"success": True, "message": f"Berhasil disalin ke {dest_path}"}

@app.post("/api/users")

def add_user(req: AddUserRequest, request: Request, session: Dict[str, Any] = Depends(verify_super_admin)):
    conn, engine = get_connection()
    cur = conn.cursor()
    placeholder = "%s" if engine == "postgres" else "?"
    cur.execute(f"SELECT nim FROM users WHERE nim = {placeholder}", (req.nim,))
    if cur.fetchone():
        raise HTTPException(status_code=400, detail="NIM/Username sudah terdaftar.")
    
    cur.execute(
        f"INSERT INTO users (nim, nama, is_admin) VALUES ({placeholder}, {placeholder}, {placeholder})",
        (req.nim, req.nama, 1 if req.is_admin else 0)
    )
    conn.commit()
    record_audit(
        target=f"NIM {req.nim}",
        action="ADD_USER",
        detail=f"Menambahkan user: {req.nama} oleh {session.get('nama')}.",
        log_type="info"
    )
    return {"success": True, "message": "User berhasil ditambahkan."}

@app.delete("/api/users/{nim}")
def delete_user(nim: str, request: Request, session: Dict[str, Any] = Depends(verify_super_admin)):
    conn, engine = get_connection()
    cur = conn.cursor()
    placeholder = "%s" if engine == "postgres" else "?"
    cur.execute(f"DELETE FROM users WHERE nim = {placeholder}", (nim,))
    conn.commit()
    import subprocess
    os_username = f"m{nim}"
    subprocess.run(["pkill", "-9", "-u", os_username], check=False)
    try:
        subprocess.run(["loginctl", "terminate-user", os_username], check=False, timeout=2)
    except:
        pass
    record_audit(
        target=f"NIM {nim}",
        action="DELETE_USER",
        detail="User dihapus dari sistem beserta sesinya.",
        log_type="danger"
    )
    return {"success": True, "message": "User berhasil dihapus."}

@app.post("/api/admin/backup")
def trigger_backup(request: Request, session: Dict[str, Any] = Depends(verify_operator_or_admin)):
    """Membuat snapshot backup database instan (Admin / Aslab)"""
    res = perform_database_backup()
    if not res:
        raise HTTPException(status_code=500, detail="Gagal membuat backup database.")
    record_audit(
        target="SYSTEM_DATABASE",
        action="BACKUP_DATABASE",
        detail=f"Backup database dibuat manual: {os.path.basename(res)} oleh {session.get('nama')}",
        log_type="info"
    )
    return {"success": True, "message": "Backup database berhasil dibuat.", "backup_file": res}

@app.get("/api/admin/backups")
def get_backups(session: Dict[str, Any] = Depends(verify_operator_or_admin)):
    """Mendaftar seluruh file snapshot backup database yang tersedia"""
    return {"success": True, "backups": list_database_backups()}


# WebSocket Manager for real-time live telemetry
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(data)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

@app.websocket("/ws")
@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await websocket.send_json(get_full_snapshot())
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

@app.on_event("startup")
async def startup_event():
    # Inisialisasi tabel database
    init_db()

    async def telemetry_broadcaster():
        while True:
            try:
                if manager.active_connections:
                    snapshot = get_full_snapshot()
                    await manager.broadcast(snapshot)
            except Exception as e:
                print("Broadcast error:", e)
            await asyncio.sleep(1.0)

    async def auto_expire_worker():
        while True:
            try:
                expired_nims = auto_expire_priorities()
                for nim in expired_nims:
                    os_username = f"m{nim}"
                    subprocess.run(["pkill", "-u", os_username], check=False)
                    try:
                        subprocess.run(["loginctl", "terminate-user", os_username], check=False, timeout=2)
                    except Exception:
                        pass
                    record_audit(
                        target=f"NIM {nim}",
                        action="AUTO_EXPIRE_BOOST",
                        detail="Durasi Prioritas habis. Sesi notebook dihentikan dan user kembali ke Mode Standard Level 2.",
                        log_type="info"
                    )
            except Exception as e:
                print("Auto expire worker error:", e)
            await asyncio.sleep(60.0)

    async def disk_usage_worker():
        while True:
            try:
                try:
                    db_users = list_users()
                    extra_unames = [f"m{u['nim']}" for u in db_users if u.get("nim")]
                except Exception:
                    extra_unames = []
                await asyncio.to_thread(update_all_user_disk_usage, extra_unames)
            except Exception as e:
                print("Disk usage worker error:", e)
            await asyncio.sleep(60.0)

    async def daily_backup_worker():
        # Backup sekali saat startup jika belum ada backup hari ini
        try:
            today_prefix = f"lab_users_backup_{datetime.now().strftime('%Y%m%d')}"
            existing = list_database_backups()
            if not any(b["filename"].startswith(today_prefix) for b in existing):
                await asyncio.to_thread(perform_database_backup)
        except Exception as e:
            print("Startup auto-backup error:", e)

        while True:
            # Otomatis backup berkala setiap 24 jam (86400 detik)
            await asyncio.sleep(86400)
            try:
                await asyncio.to_thread(perform_database_backup)
            except Exception as e:
                print("Daily auto-backup worker error:", e)

    asyncio.create_task(telemetry_broadcaster())
    asyncio.create_task(auto_expire_worker())
    asyncio.create_task(disk_usage_worker())
    asyncio.create_task(daily_backup_worker())

# Serve static frontend dist if it exists
FRONTEND_DIST = os.getenv("FRONTEND_DIST", os.path.join(PROJECT_ROOT, "frontend", "dist"))
if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("ws/"):
            raise HTTPException(status_code=404)
        base_dir = os.path.abspath(FRONTEND_DIST)
        target_path = os.path.abspath(os.path.join(base_dir, full_path))
        # Cegah Arbitrary File Read / Path Traversal di luar FRONTEND_DIST
        if not target_path.startswith(base_dir):
            raise HTTPException(status_code=403, detail="Akses ditolak: Percobaan path traversal terdeteksi.")
        if os.path.isfile(target_path):
            return FileResponse(target_path)
        index_file = os.path.join(base_dir, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="File frontend tidak ditemukan.")
