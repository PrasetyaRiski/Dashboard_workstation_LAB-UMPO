"""Watchdog kuota VRAM untuk GPU Boost Level 2.

GPU 1 (RTX 5060 Ti) tidak mendukung MIG sehingga VRAM tidak bisa dipartisi
oleh hardware. Modul ini menegakkan kuota per mahasiswa dengan dua langkah:

1. Memantau pemakaian VRAM tiap proses yang berjalan di GPU 1.
2. Memberi peringatan audit, lalu menghentikan proses kernel mahasiswa jika
   pemakaian melebihi kuota selama beberapa pemeriksaan berturut-turut.

Modul ini hanya menangani kuota. Pencabutan boost yang kedaluwarsa dilakukan
oleh worker di ``app.main`` agar sesi ikut dihentikan dan GPU benar-benar
dilepas.
"""

from __future__ import annotations

import logging
import os
import signal
import subprocess
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("gpu_guard")

GPU_BOOST_INDEX = int(os.getenv("LAB_GPU_BOOST_INDEX", "1"))
GPU_BOOST_VRAM_MB = int(os.getenv("LAB_GPU_BOOST_VRAM_MB", "4800"))
# Toleransi 10% agar alokasi cache CUDA kecil tidak langsung dianggap pelanggaran.
QUOTA_TOLERANCE = float(os.getenv("LAB_GPU_BOOST_TOLERANCE", "1.10"))
STRIKES_BEFORE_KILL = max(1, int(os.getenv("LAB_GPU_BOOST_STRIKES", "2")))

_strikes: Dict[str, int] = {}


def _run(cmd: List[str], timeout: int = 5) -> str:
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        return result.stdout or ""
    except (OSError, subprocess.SubprocessError) as exc:
        logger.debug("Perintah %s gagal: %s", cmd[0], exc)
        return ""


def get_boost_gpu_uuid(index: int = GPU_BOOST_INDEX) -> Optional[str]:
    """UUID GPU yang dipakai untuk boost (default GPU 1)."""
    output = _run(
        [
            "nvidia-smi",
            "--query-gpu=index,uuid",
            "--format=csv,noheader,nounits",
        ]
    )
    for line in output.splitlines():
        parts = [part.strip() for part in line.split(",")]
        if len(parts) != 2:
            continue
        try:
            if int(parts[0]) == index:
                return parts[1]
        except ValueError:
            continue
    return None


def list_gpu_compute_apps(gpu_uuid: str) -> List[Tuple[int, int]]:
    """Daftar (pid, vram_mb) untuk proses komputasi pada GPU tertentu."""
    output = _run(
        [
            "nvidia-smi",
            "--query-compute-apps=gpu_uuid,pid,used_memory",
            "--format=csv,noheader,nounits",
        ]
    )
    apps: List[Tuple[int, int]] = []
    for line in output.splitlines():
        parts = [part.strip() for part in line.split(",")]
        if len(parts) != 3:
            continue
        if parts[0] != gpu_uuid:
            continue
        try:
            apps.append((int(parts[1]), int(float(parts[2]))))
        except ValueError:
            continue
    return apps


def pid_owner(pid: int) -> Optional[str]:
    """Username pemilik PID, atau None jika proses sudah hilang."""
    try:
        with open(f"/proc/{pid}/status", "r", encoding="utf-8", errors="ignore") as handle:
            for line in handle:
                if line.startswith("Uid:"):
                    uid = int(line.split()[1])
                    import pwd

                    return pwd.getpwuid(uid).pw_name
    except (OSError, ValueError, KeyError, IndexError):
        return None
    return None


def _kill_pids(pids: List[int]) -> None:
    for pid in pids:
        if pid <= 1:
            continue
        try:
            os.kill(pid, signal.SIGTERM)
            logger.warning("[GpuGuard] SIGTERM dikirim ke PID %s (kuota VRAM).", pid)
        except (OSError, PermissionError) as exc:
            logger.warning("[GpuGuard] Gagal menghentikan PID %s: %s", pid, exc)


def run_gpu_guard_once() -> Dict[str, Any]:
    """Satu siklus pemeriksaan. Aman dipanggil dari thread/async to_thread."""
    try:
        from app.db import list_active_gpu_boosts, nim_to_username, record_system_audit
    except Exception as exc:  # pragma: no cover - hanya saat import rusak
        logger.error("[GpuGuard] Gagal mengimpor database: %s", exc)
        return {"checked": 0, "violations": []}

    boosts = list_active_gpu_boosts()
    if not boosts:
        _strikes.clear()
        return {"checked": 0, "violations": []}

    # Buang hitungan strike milik NIM yang boost-nya sudah tidak aktif agar
    # pemberian boost berikutnya mulai dari nol.
    active_nims = {str(item.get("nim")) for item in boosts}
    for stale_nim in [key for key in _strikes if key not in active_nims]:
        _strikes.pop(stale_nim, None)

    gpu_uuid = get_boost_gpu_uuid()
    if not gpu_uuid:
        logger.debug("[GpuGuard] UUID GPU %s tidak ditemukan.", GPU_BOOST_INDEX)
        return {"checked": 0, "violations": []}

    apps = list_gpu_compute_apps(gpu_uuid)
    if not apps:
        _strikes.clear()
        return {"checked": len(boosts), "violations": []}

    usage: Dict[str, Dict[str, Any]] = {}
    for pid, vram_mb in apps:
        owner = pid_owner(pid)
        if not owner:
            continue
        entry = usage.setdefault(owner, {"vram_mb": 0, "pids": []})
        entry["vram_mb"] += vram_mb
        entry["pids"].append(pid)

    violations: List[Dict[str, Any]] = []
    limit_mb = int(GPU_BOOST_VRAM_MB * QUOTA_TOLERANCE)

    for boost in boosts:
        nim = str(boost.get("nim") or "")
        if not nim:
            continue
        os_username = nim_to_username(nim)
        data = usage.get(os_username)
        used_mb = int(data["vram_mb"]) if data else 0
        if used_mb <= limit_mb:
            _strikes.pop(nim, None)
            continue

        _strikes[nim] = _strikes.get(nim, 0) + 1
        violations.append({"nim": nim, "used_mb": used_mb, "strike": _strikes[nim]})

        if _strikes[nim] < STRIKES_BEFORE_KILL:
            record_system_audit(
                nim,
                "GPU_QUOTA_WARNING",
                f"Pemakaian VRAM {used_mb} MB melebihi kuota {GPU_BOOST_VRAM_MB} MB. "
                f"Peringatan {_strikes[nim]}/{STRIKES_BEFORE_KILL}.",
            )
            continue

        pids = list(data["pids"]) if data else []
        _kill_pids(pids)
        record_system_audit(
            nim,
            "GPU_QUOTA_KILL",
            f"Kernel dihentikan karena VRAM {used_mb} MB melebihi kuota "
            f"{GPU_BOOST_VRAM_MB} MB selama {STRIKES_BEFORE_KILL} pemeriksaan.",
        )
        _strikes.pop(nim, None)

    return {"checked": len(boosts), "violations": violations}
