"""Regression test manajemen Gemini API key per user.

Fokus:
- key disimpan dengan izin 0600 dan tidak mengikuti symlink;
- validasi memetakan respons Google ke status yang benar;
- statistik token harian ter-reset saat ganti hari / ganti key;
- mask key tidak membocorkan isi penuh.
"""

import io
import json
import os
import stat
import sys
import urllib.error
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import lab_gemini  # noqa: E402


@pytest.fixture()
def home(tmp_path):
    directory = tmp_path / "home"
    directory.mkdir()
    return str(directory)


# ==============================================================================
# Penyimpanan key
# ==============================================================================

def test_write_read_mask_delete_key(home):
    key = "AIzaSyDummyKeyForTesting1234567890"
    lab_gemini.write_key(key, home=home)

    path = lab_gemini.key_path(home)
    assert path.is_file()
    assert stat.S_IMODE(os.stat(path).st_mode) == 0o600
    assert lab_gemini.read_key(home) == key

    masked = lab_gemini.mask_key(key)
    assert masked.startswith("AIzaSy")
    assert masked.endswith(key[-4:])
    assert key not in masked

    lab_gemini.delete_key(home)
    assert not path.exists()
    assert lab_gemini.read_key(home) == ""


def test_write_key_rejects_empty_and_oversized(home):
    with pytest.raises(ValueError):
        lab_gemini.write_key("   ", home=home)
    with pytest.raises(ValueError):
        lab_gemini.write_key("x" * (lab_gemini.MAX_KEY_LENGTH + 1), home=home)


def test_read_key_refuses_symlink(home):
    secret = Path(home) / "rahasia.txt"
    secret.write_text("JANGAN_DIBACA", encoding="utf-8")

    gemini_dir = lab_gemini.key_dir(home)
    gemini_dir.mkdir(parents=True, exist_ok=True)
    os.symlink(secret, lab_gemini.key_path(home))

    assert lab_gemini.read_key(home) == ""


def test_write_key_replaces_symlink_without_touching_target(home):
    secret = Path(home) / "rahasia.txt"
    secret.write_text("TARGET_ASLI", encoding="utf-8")

    gemini_dir = lab_gemini.key_dir(home)
    gemini_dir.mkdir(parents=True, exist_ok=True)
    os.symlink(secret, lab_gemini.key_path(home))

    lab_gemini.write_key("AIzaKeyBaru1234567890", home=home)

    assert secret.read_text(encoding="utf-8") == "TARGET_ASLI"
    assert lab_gemini.read_key(home) == "AIzaKeyBaru1234567890"
    assert not lab_gemini.key_path(home).is_symlink()


def test_key_directory_permissions(home):
    lab_gemini.write_key("AIzaKey1234567890", home=home)
    mode = stat.S_IMODE(os.stat(lab_gemini.key_dir(home)).st_mode)
    assert mode == 0o700


# ==============================================================================
# Validasi ke Google (tanpa jaringan)
# ==============================================================================

class _FakeResponse:
    def __init__(self, payload, status=200):
        self._body = json.dumps(payload).encode()
        self.status = status

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def _http_error(code, payload):
    return urllib.error.HTTPError(
        url="https://example.invalid",
        code=code,
        msg="error",
        hdrs=None,
        fp=io.BytesIO(json.dumps(payload).encode()),
    )


def test_validate_key_ok(monkeypatch):
    monkeypatch.setattr(
        lab_gemini.urlrequest,
        "urlopen",
        lambda req, timeout=10: _FakeResponse({"models": [{"name": "models/gemini-2.5-flash"}]}),
    )
    result = lab_gemini.validate_key("AIzaValid")
    assert result["state"] == "ok"
    assert result["model_count"] == 1


def test_validate_key_invalid(monkeypatch):
    def raise_invalid(req, timeout=10):
        raise _http_error(400, {"error": {"message": "API key not valid. Please pass a valid API key."}})

    monkeypatch.setattr(lab_gemini.urlrequest, "urlopen", raise_invalid)
    result = lab_gemini.validate_key("AIzaSalah")
    assert result["state"] == "invalid"
    assert result["http_status"] == 400


def test_validate_key_quota(monkeypatch):
    def raise_quota(req, timeout=10):
        raise _http_error(429, {"error": {"message": "Resource has been exhausted"}})

    monkeypatch.setattr(lab_gemini.urlrequest, "urlopen", raise_quota)
    result = lab_gemini.validate_key("AIzaLimit")
    assert result["state"] == "quota"
    assert result["http_status"] == 429


def test_validate_key_unreachable(monkeypatch):
    def raise_timeout(req, timeout=10):
        raise TimeoutError("timed out")

    monkeypatch.setattr(lab_gemini.urlrequest, "urlopen", raise_timeout)
    result = lab_gemini.validate_key("AIzaApaSaja")
    assert result["state"] == "unreachable"
    assert result["http_status"] is None


def test_validate_key_empty():
    result = lab_gemini.validate_key("   ")
    assert result["state"] == "invalid"


# ==============================================================================
# Statistik token harian
# ==============================================================================

def test_usage_accumulates(home):
    usage = lab_gemini.add_usage(home, prompt_tokens=100, output_tokens=40)
    assert usage["requests"] == 1
    assert usage["total_tokens"] == 140

    usage = lab_gemini.add_usage(home, prompt_tokens=10, output_tokens=5)
    assert usage["requests"] == 2
    assert usage["total_tokens"] == 155

    today = lab_gemini.today_key()
    assert usage["date"] == today
    assert lab_gemini.read_usage(home)["total_tokens"] == 155


def test_usage_resets_on_new_day(home):
    lab_gemini.add_usage(home, prompt_tokens=50, output_tokens=25)
    path = lab_gemini.usage_path(home)

    stale = json.loads(path.read_text(encoding="utf-8"))
    stale["date"] = "2000-01-01"
    path.write_text(json.dumps(stale), encoding="utf-8")

    usage = lab_gemini.read_usage(home)
    assert usage["total_tokens"] == 0
    assert usage["requests"] == 0
    assert usage["date"] == lab_gemini.today_key()


def test_reset_usage(home):
    lab_gemini.add_usage(home, prompt_tokens=10, output_tokens=10)
    lab_gemini.reset_usage(home)
    assert lab_gemini.read_usage(home)["total_tokens"] == 0


def test_profile_roundtrip(home):
    lab_gemini.update_profile(home, needs_attention=True, last_state="quota")
    profile = lab_gemini.read_profile(home)
    assert profile["needs_attention"] is True
    assert profile["last_state"] == "quota"

    lab_gemini.update_profile(home, needs_attention=False, last_state="ok")
    assert lab_gemini.read_profile(home)["needs_attention"] is False
