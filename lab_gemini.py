"""Manajemen Gemini API Key per user untuk Lab Komputasi UMPO.

Modul ini dipakai di dua tempat:

1. ``jupyterhub_simtik_auth.GeminiKeyHandler`` (server, berjalan sebagai root)
   untuk membaca/menulis key milik user, memvalidasi ke Google, dan membaca
   statistik pemakaian token harian.
2. Notebook mahasiswa lewat helper ``generate()`` / ``client()``.

Penyimpanan sengaja memakai berkas di home user (``~/.config/gemini/``) dengan
izin 0600 supaya:

- hanya user pemilik (dan root) yang bisa membaca key;
- kernel notebook dapat membacanya langsung tanpa layanan tambahan;
- key tidak pernah ikut tersimpan di dalam berkas ``.ipynb``.

Modul ini hanya memakai standard library. ``google.genai`` diimpor secara
lazy agar handler server tetap bisa jalan di environment tanpa SDK tersebut.
"""

from __future__ import annotations

import errno
import fcntl
import json
import os
import stat
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest

WIB = timezone(timedelta(hours=7))
DEFAULT_MODEL = "gemini-3.8-flash"

# Model yang sudah dipensiunkan Google. ID lama tetap dipetakan agar konfigurasi
# Jupyter AI dan notebook mahasiswa yang belum diperbarui tidak langsung gagal.
RETIRED_MODELS = {
    "gemini-2.5-flash": "gemini-3.8-flash",
    "gemini-2.5-pro": "gemini-3.8-flash",
    "models/gemini-2.5-flash": "gemini-3.8-flash",
    "models/gemini-2.5-pro": "gemini-3.8-flash",
}

KEY_DIR = Path(".config") / "gemini"
KEY_FILENAME = "api_key"
PROFILE_FILENAME = "profile.json"
USAGE_FILENAME = "usage.json"
LOCK_FILENAME = "usage.lock"

GEMINI_MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models"
VALIDATION_TIMEOUT = 10
MAX_KEY_LENGTH = 512


# ==============================================================================
# Exception yang ramah untuk mahasiswa
# ==============================================================================

class GeminiKeyMissing(RuntimeError):
    """Key belum diatur oleh user."""


class GeminiKeyInvalid(RuntimeError):
    """Key ditolak Google."""


class GeminiQuotaExceeded(RuntimeError):
    """Kuota key habis (HTTP 429)."""


# ==============================================================================
# Utilitas path & waktu
# ==============================================================================

def now_wib() -> datetime:
    return datetime.now(WIB)


def today_key() -> str:
    return now_wib().strftime("%Y-%m-%d")


def user_home(home: Optional[str] = None) -> Path:
    return Path(home) if home else Path(os.path.expanduser("~"))


def resolve_model(model: Optional[str] = None) -> str:
    """Petakan model yang dipensiunkan Google ke model default aktif."""
    clean = (model or DEFAULT_MODEL).strip()
    return RETIRED_MODELS.get(clean, clean)


def key_dir(home: Optional[str] = None) -> Path:
    return user_home(home) / KEY_DIR


def key_path(home: Optional[str] = None) -> Path:
    return key_dir(home) / KEY_FILENAME


def profile_path(home: Optional[str] = None) -> Path:
    return key_dir(home) / PROFILE_FILENAME


def usage_path(home: Optional[str] = None) -> Path:
    return key_dir(home) / USAGE_FILENAME


def _lock_path(home: Optional[str] = None) -> Path:
    return key_dir(home) / LOCK_FILENAME


def mask_key(key: str) -> str:
    """Tampilkan potongan key yang aman untuk UI (tanpa membocorkan isi penuh)."""
    clean = (key or "").strip()
    if not clean:
        return ""
    if len(clean) <= 10:
        return "•" * len(clean)
    return f"{clean[:6]}…{clean[-4:]}"


# ==============================================================================
# Baca / tulis key (atomik, anti-symlink)
# ==============================================================================

def _ensure_dir(directory: Path, uid: Optional[int], gid: Optional[int]) -> None:
    """Buat ``~/.config/gemini`` (0700). Bila dijalankan root, chown ke user.

    Parent ``~/.config`` juga di-chown agar tidak tertinggal sebagai milik root
    ketika direktori tersebut baru dibuat oleh handler (kasus user baru).
    """
    config_root = directory.parent
    if uid is not None:
        config_root.mkdir(mode=0o755, parents=True, exist_ok=True)
        if stat.S_ISDIR(os.lstat(config_root).st_mode):
            try:
                os.chown(config_root, uid, gid if gid is not None else -1)
            except OSError:
                pass

    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    st = os.lstat(directory)
    if not stat.S_ISDIR(st.st_mode):
        raise OSError(f"{directory} bukan direktori")
    os.chmod(directory, 0o700)
    if uid is not None:
        os.chown(directory, uid, gid if gid is not None else -1)


def read_key(home: Optional[str] = None) -> str:
    """Baca key; kembalikan string kosong bila belum ada atau bukan berkas biasa."""
    path = key_path(home)
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    except FileNotFoundError:
        return ""
    except NotADirectoryError:
        return ""
    except OSError as exc:
        if exc.errno in (errno.ELOOP, errno.ENOENT):
            # Symlink ditolak: jangan pernah mengikuti tautan untuk berkas rahasia.
            return ""
        raise
    try:
        with os.fdopen(fd, "r", encoding="utf-8") as handle:
            return handle.read().strip()
    except Exception:
        return ""


def write_key(
    key: str,
    home: Optional[str] = None,
    uid: Optional[int] = None,
    gid: Optional[int] = None,
) -> None:
    """Simpan key secara atomik dengan izin 0600 (dan chown ke pemilik home)."""
    clean = (key or "").strip()
    if not clean:
        raise ValueError("API key kosong")
    if len(clean) > MAX_KEY_LENGTH:
        raise ValueError("API key terlalu panjang")

    directory = key_dir(home)
    _ensure_dir(directory, uid, gid)

    target = key_path(home)
    tmp = directory / f".{KEY_FILENAME}.{secrets.token_hex(6)}.tmp"

    fd = os.open(
        tmp,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
        0o600,
    )
    try:
        os.write(fd, (clean + "\n").encode("utf-8"))
        os.fsync(fd)
    finally:
        os.close(fd)

    if uid is not None:
        os.chown(tmp, uid, gid if gid is not None else -1)

    os.replace(tmp, target)
    os.chmod(target, 0o600)
    if uid is not None:
        os.chown(target, uid, gid if gid is not None else -1)


def delete_key(home: Optional[str] = None) -> None:
    """Hapus key beserta profil dan statistik harian."""
    for path in (key_path(home), profile_path(home), usage_path(home)):
        try:
            if os.path.islink(path):
                os.unlink(path)
                continue
            if os.path.isfile(path):
                os.unlink(path)
        except FileNotFoundError:
            continue


# ==============================================================================
# Profil status (needs_attention, validasi terakhir)
# ==============================================================================

def read_profile(home: Optional[str] = None) -> Dict[str, Any]:
    try:
        data = json.loads(profile_path(home).read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {}
        return data
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {}


def _write_json(
    path: Path,
    payload: Dict[str, Any],
    uid: Optional[int] = None,
    gid: Optional[int] = None,
) -> None:
    tmp = path.with_name(f".{path.name}.{secrets.token_hex(6)}.tmp")
    with open(tmp, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.flush()
        os.fsync(handle.fileno())
    os.chmod(tmp, 0o600)
    if uid is not None:
        os.chown(tmp, uid, gid if gid is not None else -1)
    os.replace(tmp, path)
    if uid is not None:
        os.chown(path, uid, gid if gid is not None else -1)


def update_profile(
    home: Optional[str] = None,
    uid: Optional[int] = None,
    gid: Optional[int] = None,
    **changes: Any,
) -> Dict[str, Any]:
    data = read_profile(home)
    data.update(changes)
    data["updated_at"] = now_wib().isoformat(timespec="seconds")
    try:
        _ensure_dir(key_dir(home), uid, gid)
        _write_json(profile_path(home), data, uid=uid, gid=gid)
    except OSError:
        pass
    return data


# ==============================================================================
# Statistik pemakaian token harian (ditulis helper notebook)
# ==============================================================================

def _empty_usage() -> Dict[str, Any]:
    return {
        "date": today_key(),
        "requests": 0,
        "prompt_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
        "updated_at": None,
    }


def read_usage(home: Optional[str] = None) -> Dict[str, Any]:
    try:
        data = json.loads(usage_path(home).read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return _empty_usage()
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return _empty_usage()

    if data.get("date") != today_key():
        return _empty_usage()

    normalized = _empty_usage()
    for field in ("requests", "prompt_tokens", "output_tokens", "total_tokens"):
        try:
            normalized[field] = int(data.get(field) or 0)
        except (TypeError, ValueError):
            normalized[field] = 0
    normalized["updated_at"] = data.get("updated_at")
    return normalized


def add_usage(
    home: Optional[str] = None,
    prompt_tokens: int = 0,
    output_tokens: int = 0,
) -> Dict[str, Any]:
    """Tambahkan pemakaian token hari ini dengan penguncian antar-proses."""
    directory = key_dir(home)
    _ensure_dir(directory, None, None)

    with open(_lock_path(home), "a+", encoding="utf-8") as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        try:
            usage = read_usage(home)
            usage["requests"] += 1
            usage["prompt_tokens"] += max(0, int(prompt_tokens or 0))
            usage["output_tokens"] += max(0, int(output_tokens or 0))
            usage["total_tokens"] = usage["prompt_tokens"] + usage["output_tokens"]
            usage["updated_at"] = now_wib().isoformat(timespec="seconds")
            _write_json(usage_path(home), usage)
            return usage
        finally:
            fcntl.flock(lock.fileno(), fcntl.LOCK_UN)


def reset_usage(home: Optional[str] = None) -> None:
    """Kosongkan statistik harian (dipakai saat user mengganti key)."""
    try:
        usage_path(home).unlink()
    except FileNotFoundError:
        pass


# ==============================================================================
# Validasi key ke Google
# ==============================================================================

def validate_key(key: str, timeout: int = VALIDATION_TIMEOUT) -> Dict[str, Any]:
    """Uji key ke endpoint models.list Gemini.

    Hasil ``state``: ``ok`` | ``invalid`` | ``quota`` | ``unreachable`` | ``error``.
    """
    clean = (key or "").strip()
    if not clean:
        return {"state": "invalid", "http_status": None, "message": "API key kosong.", "model_count": 0}

    query = urlparse.urlencode({"key": clean})
    req = urlrequest.Request(
        f"{GEMINI_MODELS_URL}?{query}",
        headers={"User-Agent": "lab-ai-umpo/1.0", "Accept": "application/json"},
    )

    status: Optional[int] = None
    payload: Dict[str, Any] = {}
    try:
        with urlrequest.urlopen(req, timeout=timeout) as response:
            status = getattr(response, "status", 200)
            raw = response.read() or b"{}"
            payload = json.loads(raw.decode("utf-8", "replace"))
    except urlerror.HTTPError as exc:
        status = exc.code
        try:
            payload = json.loads((exc.read() or b"{}").decode("utf-8", "replace"))
        except Exception:
            payload = {}
    except Exception as exc:  # timeout, DNS, TLS, dsb.
        return {
            "state": "unreachable",
            "http_status": None,
            "message": f"Tidak dapat menghubungi Google: {exc}",
            "model_count": 0,
        }

    error = payload.get("error") if isinstance(payload, dict) else None
    message = ""
    if isinstance(error, dict):
        message = str(error.get("message") or error.get("status") or "").strip()

    if status == 200:
        models = payload.get("models") or []
        return {
            "state": "ok",
            "http_status": status,
            "message": "Key valid.",
            "model_count": len(models) if isinstance(models, list) else 0,
        }

    if status == 429:
        return {
            "state": "quota",
            "http_status": status,
            "message": message or "Kuota key ini sedang habis (HTTP 429).",
            "model_count": 0,
        }

    lowered = message.lower()
    if status in (400, 403) and ("api key not valid" in lowered or "api_key_invalid" in lowered):
        return {
            "state": "invalid",
            "http_status": status,
            "message": "Key tidak valid atau sudah dicabut.",
            "model_count": 0,
        }

    return {
        "state": "error",
        "http_status": status,
        "message": message or f"Google menolak permintaan (HTTP {status}).",
        "model_count": 0,
    }


# ==============================================================================
# Helper notebook
# ==============================================================================

def client(home: Optional[str] = None):
    """Kembalikan ``google.genai.Client`` dengan key milik user.

    Raise ``GeminiKeyMissing`` bila key belum diatur lewat modal JupyterLab.
    """
    api_key = read_key(home)
    if not api_key:
        raise GeminiKeyMissing(
            "Belum ada Gemini API key. Buka panel Workstation Resource Monitor di "
            "kanan bawah JupyterLab, lalu klik tombol 'Gemini API Key'."
        )

    try:
        from google import genai  # diimpor lazy agar handler server tetap ringan
    except ImportError as exc:  # pragma: no cover - env produksi sudah terpasang
        raise GeminiKeyMissing(
            "Paket google-genai belum terpasang di environment ini."
        ) from exc

    return genai.Client(api_key=api_key)


def _extract_usage(resp: Any) -> tuple[int, int]:
    usage = getattr(resp, "usage_metadata", None)
    if not usage:
        return 0, 0
    prompt = getattr(usage, "prompt_token_count", 0) or 0
    output = getattr(usage, "candidates_token_count", 0) or 0
    return int(prompt), int(output)


def _mark_quota(home: Optional[str]) -> None:
    try:
        update_profile(home, needs_attention=True, last_state="quota")
    except Exception:
        pass


def generate(contents: Any, model: Optional[str] = None, home: Optional[str] = None, **kwargs: Any):
    """Panggil ``generateContent`` sambil mencatat token harian.

    Contoh::

        from lab_gemini import generate
        print(generate("Apa itu GPU?").text)
    """
    model_name = resolve_model(model)
    gem = client(home)

    try:
        resp = gem.models.generate_content(model=model_name, contents=contents, **kwargs)
    except Exception as exc:
        if getattr(exc, "code", None) == 429:
            _mark_quota(home)
            raise GeminiQuotaExceeded(
                "Kuota Gemini API key Anda habis (HTTP 429). Ganti key lewat "
                "tombol 'Gemini API Key' di panel Workstation Resource Monitor."
            ) from exc
        raise

    prompt_tokens, output_tokens = _extract_usage(resp)
    try:
        add_usage(home, prompt_tokens, output_tokens)
        update_profile(home, needs_attention=False, last_state="ok", last_model=model_name)
    except OSError:
        pass

    return resp


def generate_stream(contents: Any, model: Optional[str] = None, home: Optional[str] = None, **kwargs: Any):
    """Versi streaming; token dicatat setelah stream selesai."""
    model_name = resolve_model(model)
    gem = client(home)

    def iterator():
        prompt_tokens = 0
        output_tokens = 0
        try:
            for chunk in gem.models.generate_content_stream(
                model=model_name, contents=contents, **kwargs
            ):
                p, o = _extract_usage(chunk)
                prompt_tokens = max(prompt_tokens, p)
                output_tokens = max(output_tokens, o)
                yield chunk
        except Exception as exc:
            if getattr(exc, "code", None) == 429:
                _mark_quota(home)
                raise GeminiQuotaExceeded(
                    "Kuota Gemini API key Anda habis (HTTP 429). Ganti key lewat "
                    "tombol 'Gemini API Key' di panel Workstation Resource Monitor."
                ) from exc
            raise
        finally:
            try:
                add_usage(home, prompt_tokens, output_tokens)
            except OSError:
                pass

    return iterator()


def usage_today(home: Optional[str] = None) -> Dict[str, Any]:
    return read_usage(home)
