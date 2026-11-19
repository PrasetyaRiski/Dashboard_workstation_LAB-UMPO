"""Regression test untuk GPU Boost Level 2 (GPU 1).

Cakupan:
- Grant/revoke boost beserta metadata dan audit.
- Batas 3 slot bersamaan.
- Toggle global: boost baru ditolak, boost berjalan tidak diputus.
- Target ditolak: Level 1 (prioritas), Admin, Aslab, akun tidak dikenal.
- Aslab (operator) boleh memberi boost, sama seperti Admin.
- Kedaluwarsa otomatis mengembalikan NIM ke CPU-only.
- Endpoint kapasitas publik hanya membocorkan agregat, bukan identitas.
- Profil lab tetap 60 slot CPU-only dan tidak bisa diubah lewat API.
"""

import time
from datetime import datetime, timedelta

import pytest

from app import db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _headers(token):
    return {"Authorization": f"Bearer {token}"}


def _aslab_headers(nim="99000999"):
    """Buat sesi Aslab langsung di memori tanpa bergantung pada SIMTIK."""
    import app.main as main_module

    token = f"test-aslab-{nim}"
    main_module.ACTIVE_SESSIONS[token] = {
        "role": "aslab",
        "nim": nim,
        "nama": "Aslab Penguji",
        "expires_at": time.time() + 3600,
    }
    return _headers(token)


def _student(nim, role="mahasiswa"):
    db.get_or_create_user(nim, f"Mahasiswa Uji {nim}")
    db.set_user_role(nim, role)
    return nim


def _force_gpu_boost_expiry(nim, minutes_ago=5):
    """Paksa kolom expiry ke masa lalu untuk menguji auto-expire."""
    conn, engine = db.get_connection()
    cur = conn.cursor()
    try:
        placeholder = "%s" if engine == "postgres" else "?"
        past = (datetime.now() - timedelta(minutes=minutes_ago)).strftime("%Y-%m-%d %H:%M:%S")
        cur.execute(
            f"UPDATE users SET gpu_boost_expires_at = {placeholder} WHERE nim = {placeholder}",
            (past, nim),
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()


def _reset_lab_state():
    """Bersihkan boost/prioritas dan aktifkan kembali toggle global."""
    conn, engine = db.get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE users SET gpu_boost_expires_at = NULL, gpu_boost_reason = NULL, "
            "gpu_boost_by = NULL, is_priority = 0, priority_expires_at = NULL"
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()
    db.set_gpu_boost_enabled(True)


@pytest.fixture(autouse=True)
def clean_lab_state(client):
    """Pastikan setiap test mulai dari kondisi boost kosong dan toggle aktif."""
    _reset_lab_state()
    yield
    _reset_lab_state()


# ---------------------------------------------------------------------------
# Grant / revoke
# ---------------------------------------------------------------------------

def test_grant_and_revoke_gpu_boost(client, admin_token):
    nim = _student("99000001")
    headers = _headers(admin_token)

    response = client.post(
        "/api/users/gpu-boost",
        json={"nim": nim, "hours": 2, "reason": "Praktikum Deep Learning"},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["success"] is True
    assert payload["expires_in_hours"] == 2
    assert payload["vram_mb"] == db.GPU_BOOST_VRAM_MB

    assert db.is_user_gpu_boosted(nim) is True
    user = db.get_user(nim)
    assert user["gpu_boost_expires_at"] is not None
    assert user["gpu_boost_reason"] == "Praktikum Deep Learning"
    assert user["gpu_boost_by"] == "Super Admin"
    assert user["is_priority"] is False

    active = db.list_active_gpu_boosts()
    assert [item["nim"] for item in active] == [nim]

    revoke = client.post("/api/users/gpu-unboost", json={"nim": nim}, headers=headers)
    assert revoke.status_code == 200, revoke.text
    assert db.is_user_gpu_boosted(nim) is False
    assert db.get_user(nim)["gpu_boost_expires_at"] is None
    assert db.list_active_gpu_boosts() == []


def test_gpu_boost_clamps_duration_to_twelve_hours(client, admin_token):
    nim = _student("99000002")
    response = client.post(
        "/api/users/gpu-boost",
        json={"nim": nim, "hours": 99, "reason": "Durasi berlebih"},
        headers=_headers(admin_token),
    )
    assert response.status_code == 200, response.text
    assert response.json()["expires_in_hours"] == 12

    item = next(b for b in db.list_active_gpu_boosts() if b["nim"] == nim)
    assert 11 * 60 < item["remaining_minutes"] <= 12 * 60


# ---------------------------------------------------------------------------
# Slot capacity
# ---------------------------------------------------------------------------

def test_gpu_boost_is_limited_to_three_slots(client, admin_token):
    headers = _headers(admin_token)
    nims = [_student(f"9900001{i}") for i in range(4)]

    for nim in nims[:3]:
        response = client.post(
            "/api/users/gpu-boost",
            json={"nim": nim, "hours": 1},
            headers=headers,
        )
        assert response.status_code == 200, response.text

    assert len(db.list_active_gpu_boosts()) == db.GPU_BOOST_MAX_SLOTS

    rejected = client.post(
        "/api/users/gpu-boost",
        json={"nim": nims[3], "hours": 1},
        headers=headers,
    )
    assert rejected.status_code == 400
    assert "slot" in rejected.json()["detail"].lower()
    assert db.is_user_gpu_boosted(nims[3]) is False

    # Setelah satu slot dilepas, NIM keempat boleh masuk.
    assert client.post(
        "/api/users/gpu-unboost", json={"nim": nims[0]}, headers=headers
    ).status_code == 200
    accepted = client.post(
        "/api/users/gpu-boost",
        json={"nim": nims[3], "hours": 1},
        headers=headers,
    )
    assert accepted.status_code == 200, accepted.text


def test_repeated_grant_for_active_user_does_not_consume_extra_slot(client, admin_token):
    headers = _headers(admin_token)
    nim = _student("99000003")

    for _ in range(2):
        response = client.post(
            "/api/users/gpu-boost",
            json={"nim": nim, "hours": 1},
            headers=headers,
        )
        assert response.status_code == 200, response.text

    assert len(db.list_active_gpu_boosts()) == 1


# ---------------------------------------------------------------------------
# Global toggle
# ---------------------------------------------------------------------------

def test_toggle_off_blocks_new_boost_but_keeps_running_boost(client, admin_token):
    headers = _headers(admin_token)
    running = _student("99000010")
    waiting = _student("99000011")

    assert client.post(
        "/api/users/gpu-boost",
        json={"nim": running, "hours": 2},
        headers=headers,
    ).status_code == 200

    toggle = client.post(
        "/api/lab/gpu-boost-toggle", json={"enabled": False}, headers=headers
    )
    assert toggle.status_code == 200, toggle.text
    assert toggle.json()["enabled"] is False
    assert db.get_gpu_boost_enabled() is False

    # Boost yang sudah berjalan tetap hidup sampai kedaluwarsa/dicabut.
    assert db.is_user_gpu_boosted(running) is True

    blocked = client.post(
        "/api/users/gpu-boost",
        json={"nim": waiting, "hours": 1},
        headers=headers,
    )
    assert blocked.status_code == 403
    assert "dinonaktifkan" in blocked.json()["detail"].lower()

    re_enable = client.post(
        "/api/lab/gpu-boost-toggle", json={"enabled": True}, headers=headers
    )
    assert re_enable.status_code == 200
    assert db.get_gpu_boost_enabled() is True


# ---------------------------------------------------------------------------
# Target validation
# ---------------------------------------------------------------------------

def test_gpu_boost_rejects_level1_priority_student(client, admin_token):
    nim = _student("99000020")
    db.set_user_priority(nim, 2, "Skripsi")

    response = client.post(
        "/api/users/gpu-boost",
        json={"nim": nim, "hours": 1},
        headers=_headers(admin_token),
    )
    assert response.status_code == 400
    assert "level 1" in response.json()["detail"].lower()
    assert db.is_user_gpu_boosted(nim) is False


def test_gpu_boost_rejects_admin_and_aslab_targets(client, admin_token):
    headers = _headers(admin_token)
    for index, role in enumerate(("admin", "aslab")):
        nim = _student(f"9900003{index}", role=role)
        response = client.post(
            "/api/users/gpu-boost",
            json={"nim": nim, "hours": 1},
            headers=headers,
        )
        assert response.status_code == 400, (role, response.text)
        assert "admin/aslab" in response.json()["detail"].lower()


def test_gpu_boost_rejects_unknown_target(client, admin_token):
    response = client.post(
        "/api/users/gpu-boost",
        json={"nim": "99999999", "hours": 1},
        headers=_headers(admin_token),
    )
    assert response.status_code == 404


def test_gpu_boost_rejects_blocked_student(client, admin_token):
    nim = _student("99000030")
    db.toggle_user_active(nim)  # aktif -> nonaktif

    response = client.post(
        "/api/users/gpu-boost",
        json={"nim": nim, "hours": 1},
        headers=_headers(admin_token),
    )
    assert response.status_code == 400
    assert "diblokir" in response.json()["detail"].lower() or "nonaktif" in response.json()["detail"].lower()


def test_aslab_operator_can_grant_and_revoke_boost(client):
    nim = _student("99000040")
    headers = _aslab_headers()

    grant = client.post(
        "/api/users/gpu-boost",
        json={"nim": nim, "hours": 1, "reason": "Asistensi"},
        headers=headers,
    )
    assert grant.status_code == 200, grant.text
    assert db.get_user(nim)["gpu_boost_by"] == "Aslab Penguji"

    revoke = client.post("/api/users/gpu-unboost", json={"nim": nim}, headers=headers)
    assert revoke.status_code == 200, revoke.text
    assert db.is_user_gpu_boosted(nim) is False


# ---------------------------------------------------------------------------
# Expiry
# ---------------------------------------------------------------------------

def test_gpu_boost_auto_expires_and_returns_to_cpu_only(client):
    nim = _student("99000050")
    assert db.set_user_gpu_boost(nim, 1, "Uji kedaluwarsa", "Admin") is True
    assert db.is_user_gpu_boosted(nim) is True

    _force_gpu_boost_expiry(nim)
    expired = db.auto_expire_gpu_boosts()

    assert nim in expired
    assert db.is_user_gpu_boosted(nim) is False
    assert db.get_user(nim)["gpu_boost_expires_at"] is None
    assert db.list_active_gpu_boosts() == []


def test_is_user_gpu_boosted_clears_stale_expiry_on_read(client):
    nim = _student("99000051")
    assert db.set_user_gpu_boost(nim, 1, "Uji baca", "Admin") is True
    _force_gpu_boost_expiry(nim)

    assert db.is_user_gpu_boosted(nim) is False
    assert db.get_user(nim)["gpu_boost_expires_at"] is None


# ---------------------------------------------------------------------------
# Public capacity endpoint
# ---------------------------------------------------------------------------

def test_capacity_endpoint_exposes_gpu_boost_aggregates_only(client, admin_token):
    headers = _headers(admin_token)
    nims = [_student("99000060"), _student("99000061")]
    for nim in nims:
        assert client.post(
            "/api/users/gpu-boost",
            json={"nim": nim, "hours": 1},
            headers=headers,
        ).status_code == 200

    # Endpoint ini sengaja tanpa autentikasi untuk widget publik.
    response = client.get("/api/stats/capacity")
    assert response.status_code == 200, response.text
    payload = response.json()
    boost = payload["gpu_boost"]

    assert boost["enabled"] is True
    assert boost["total_slots"] == db.GPU_BOOST_MAX_SLOTS
    assert boost["used_slots"] == 2
    assert boost["available_slots"] == db.GPU_BOOST_MAX_SLOTS - 2
    assert boost["vram_mb"] == db.GPU_BOOST_VRAM_MB

    serialized = str(payload)
    assert "users" not in payload
    for nim in nims:
        assert nim not in serialized


# ---------------------------------------------------------------------------
# Fixed lab profile
# ---------------------------------------------------------------------------

def test_lab_profile_is_fixed_60_slot_cpu_only(client, admin_token):
    profile = client.get("/api/lab/profile", headers=_headers(admin_token)).json()
    assert profile["max_slots"] == 60
    assert profile["gpu_enabled"] is False
    assert profile["cpu_limit_cores"] == 1.0
    assert profile["ram_limit_mb"] == 1536.0
    assert profile["mode"] == "standard"


def test_mode_switch_endpoint_is_removed(client, admin_token):
    response = client.post(
        "/api/lab/profile", json={"mode": "basic"}, headers=_headers(admin_token)
    )
    assert response.status_code == 410
    assert "gpu boost" in response.json()["detail"].lower()
