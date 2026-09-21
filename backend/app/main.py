import asyncio
import os
import signal
import subprocess
import time
from collections import deque
import psutil
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional

from app.telemetry import get_snapshot, TRAINING_UIDS, PROTECTED_PROCESS_NAMES

app = FastAPI(title="AI Lab Compute Dashboard", version="2.1.0")

# Default Admin PIN (dapat diubah via Environment Variable LAB_ADMIN_PIN)
LAB_ADMIN_PIN = os.getenv("LAB_ADMIN_PIN", "umpo2026")

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

def get_full_snapshot():
    s = get_snapshot()

    # Aggregate all active GPU processes for unified Process Manager
    all_processes = []
    for gpu in s.get("gpus", []):
        g_idx = gpu.get("index")
        for p in gpu.get("processes", []):
            all_processes.append({
                "gpu_index": g_idx,
                "gpu_name": f"GPU {g_idx}",
                "pid": p.get("pid"),
                "username": p.get("username"),
                "name": p.get("name"),
                "cmdline": p.get("cmdline"),
                "vram_mb": p.get("vram_mb"),
                "ram_mb": p.get("ram_mb", 0.0),
                "cpu_percent": p.get("cpu_percent"),
                "uptime": p.get("uptime"),
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
                audit_logs.appendleft({
                    "time": time.strftime("%H:%M:%S"),
                    "action": "OVER_QUOTA",
                    "target": uname,
                    "detail": f"Penggunaan VRAM ({u.get('vram_used_mb')} MB) melebihi ambang batas praktikum (30%)",
                    "type": "alert"
                })
    s["audit_logs"] = list(audit_logs)
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
def kill_process(req: KillProcessRequest, request: Request):
    try:
        p = psutil.Process(req.pid)
        username = p.username()
        proc_name = p.name()
        cmd = p.cmdline()
        cmdline = " ".join(cmd) if cmd else proc_name

        # 1. Proteksi Akun Sistem: Hanya akun user/riset yang boleh di-kill
        allowed_users = set(TRAINING_UIDS.values())
        if username not in allowed_users:
            raise HTTPException(
                status_code=403,
                detail=f"Ditolak: Proses '{proc_name}' (PID {req.pid}) milik akun sistem '{username}' diproteksi dan TIDAK DAPAT dimatikan."
            )

        # 2. Proteksi Layanan / Shell Sistem Penting
        critical_keywords = ["cloudflared", "jupyterhub", "1panel", "portainer", "systemd", "dockerd", "uvicorn", "sshd", "gunicorn"]
        if proc_name.lower() in PROTECTED_PROCESS_NAMES or any(k in cmdline.lower() for k in critical_keywords):
            raise HTTPException(
                status_code=403,
                detail=f"Ditolak: Proses '{proc_name}' (PID {req.pid}) merupakan layanan/shell sistem penting dan diproteksi dari penghentian."
            )

        p.terminate()
        try:
            p.wait(timeout=2)
        except psutil.TimeoutExpired:
            p.kill()

        audit_logs.appendleft({
            "time": time.strftime("%H:%M:%S"),
            "action": "KILL_PROCESS",
            "target": f"{username} (PID {req.pid})",
            "detail": f"Proses komputasi '{proc_name}' ({req.pid}) milik user {username} dihentikan oleh Admin.",
            "type": "danger"
        })

        return {"success": True, "message": f"Proses PID {req.pid} ({proc_name}) milik user {username} berhasil dihentikan."}
    except psutil.NoSuchProcess:
        return {"success": False, "message": f"Proses PID {req.pid} sudah tidak aktif lagi."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menghentikan proses: {str(e)}")

@app.post("/api/kill-user-all")
def kill_user_all(req: KillUserAllRequest, request: Request):
    if req.username not in TRAINING_UIDS.values():
        raise HTTPException(status_code=400, detail="User tidak valid")

    try:
        subprocess.run(["sudo", "pkill", "-u", req.username, "-f", "python3"], check=False)
        audit_logs.appendleft({
            "time": time.strftime("%H:%M:%S"),
            "action": "KILL_USER_ALL",
            "target": req.username,
            "detail": f"Semua proses komputasi python3 milik '{req.username}' dihentikan paksa.",
            "type": "danger"
        })
        return {"success": True, "message": f"Semua proses komputasi milik {req.username} berhasil dihentikan."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reset-password")
def reset_password(req: ResetPasswordRequest, request: Request):
    if req.username not in TRAINING_UIDS.values():
        raise HTTPException(status_code=400, detail="User target tidak valid")
    if len(req.new_password) < 4:
        raise HTTPException(status_code=400, detail="Password minimal 4 karakter")

    try:
        proc = subprocess.run(
            ["sudo", "chpasswd"],
            input=f"{req.username}:{req.new_password}",
            text=True,
            capture_output=True,
            check=True
        )

        audit_logs.appendleft({
            "time": time.strftime("%H:%M:%S"),
            "action": "RESET_PASSWORD",
            "target": req.username,
            "detail": f"Password user '{req.username}' berhasil diperbarui oleh Admin.",
            "type": "warning"
        })

        return {"success": True, "message": f"Password untuk user {req.username} berhasil diubah."}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengubah password: {e.stderr}")

@app.post("/api/run-simulation")
def run_simulation(req: SimulationRequest, request: Request):
    try:
        # Run test_simulation.py via subprocess
        script_path = os.path.join(PROJECT_ROOT, "test_simulation.py")
        subprocess.Popen(["sudo", "python3", script_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        audit_logs.appendleft({
            "time": time.strftime("%H:%M:%S"),
            "action": "SIMULATION_START",
            "target": "11 Akun User & Riset",
            "detail": "Simulasi komputasi serentak 11 akun diluncurkan oleh Admin untuk pengujian beban & Kill Process.",
            "type": "info"
        })
        return {"success": True, "message": "Simulasi komputasi serentak 11 user berhasil dijalankan! Beban CPU, RAM & GPU akan termonitor dalam 2-3 detik."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/stop-simulation")
def stop_simulation(req: SimulationRequest, request: Request):
    try:
        stop_script = os.path.join(PROJECT_ROOT, "stop_simulation.sh")
        subprocess.run(["sudo", "bash", stop_script], check=False)
        audit_logs.appendleft({
            "time": time.strftime("%H:%M:%S"),
            "action": "SIMULATION_STOP",
            "target": "11 Akun User & Riset",
            "detail": "Semua proses simulasi uji coba berhasil dibersihkan oleh Admin.",
            "type": "warning"
        })
        return {"success": True, "message": "Seluruh proses komputasi uji coba telah dihentikan dan dibersihkan."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    async def telemetry_broadcaster():
        while True:
            try:
                if manager.active_connections:
                    snapshot = get_full_snapshot()
                    await manager.broadcast(snapshot)
            except Exception as e:
                print("Broadcast error:", e)
            await asyncio.sleep(1.0)

    asyncio.create_task(telemetry_broadcaster())

# Serve static frontend dist if it exists
FRONTEND_DIST = os.getenv("FRONTEND_DIST", os.path.join(PROJECT_ROOT, "frontend", "dist"))
if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("ws/"):
            raise HTTPException(status_code=404)
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
