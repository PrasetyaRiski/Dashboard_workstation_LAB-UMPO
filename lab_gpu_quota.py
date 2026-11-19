"""Kuota VRAM per proses untuk GPU Boost Level 2.

Modul ini dipasang ke ``site-packages`` environment Jupyter (``/opt/ai_env``)
dan dimuat otomatis lewat ``lab_gpu_quota.pth``. Modul hanya aktif bila proses
spawn membawa ``LAB_GPU_BOOST_ACTIVE=1`` dan ``LAB_GPU_VRAM_MB``.

Kuota diterapkan malas (lazy) saat ``torch`` pertama kali diimpor agar startup
notebook tetap ringan. ``torch.cuda.set_per_process_memory_fraction`` mencegah
proses meminta VRAM melebihi kuota, sedangkan watchdog ``gpu_guard`` menangani
proses non-PyTorch atau alokasi di luar allocator PyTorch.
"""

import builtins
import os
import sys

_VRAM_MB = 0
try:
    _VRAM_MB = int(os.environ.get("LAB_GPU_VRAM_MB", "0") or "0")
except ValueError:
    _VRAM_MB = 0

_ACTIVE = os.environ.get("LAB_GPU_BOOST_ACTIVE", "0") == "1"
_APPLIED = False

_ORIGINAL_IMPORT = builtins.__import__


def _apply_quota(torch_module):
    """Terapkan fraksi VRAM sekali saja; jangan pernah menggagalkan import."""
    global _APPLIED
    if _APPLIED or not _ACTIVE or _VRAM_MB <= 0:
        return
    try:
        if not torch_module.cuda.is_available():
            return
        device = torch_module.cuda.current_device()
        total = float(torch_module.cuda.get_device_properties(device).total_memory)
        if total <= 0:
            return
        fraction = min(1.0, (_VRAM_MB * 1024 * 1024) / total)
        torch_module.cuda.set_per_process_memory_fraction(fraction, device)
        _APPLIED = True
    except Exception:
        # Kuota adalah lapisan pertahanan tambahan; watchdog tetap berjalan.
        pass


def _quota_import(name, globals=None, locals=None, fromlist=(), level=0):
    module = _ORIGINAL_IMPORT(name, globals, locals, fromlist, level)
    if name == "torch" or name.startswith("torch."):
        torch_module = sys.modules.get("torch")
        if torch_module is not None:
            _apply_quota(torch_module)
    return module


if _ACTIVE and _VRAM_MB > 0:
    builtins.__import__ = _quota_import
