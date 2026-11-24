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
    db.set_lab_mode("boost30")
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


def test_gpu_boost_unlimited_duration(client, admin_token):
    nim = _student("99000003")
    response = client.post(
        "/api/users/gpu-boost",
        json={"nim": nim, "hours": 0, "reason": "Riset Tanpa Batas"},
        headers=_headers(admin_token),
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["success"] is True
    assert payload["is_unlimited"] is True
    assert payload["expires_in_hours"] == 0

    assert db.is_user_gpu_boosted(nim) is True
    active = db.list_active_gpu_boosts()
    boost_item = next(b for b in active if b["nim"] == nim)
    assert boost_item["is_unlimited"] is True
    assert boost_item["remaining_minutes"] is None
    assert boost_item["gpu_boost_expires_at"].startswith("2099")

    # Worker auto_expire tidak boleh mencabut boost unlimited
    expired = db.auto_expire_gpu_boosts()
    assert nim not in expired
    assert db.is_user_gpu_boosted(nim) is True

    # Cabut manual tetap bisa
    unboost = client.post("/api/users/gpu-unboost", json={"nim": nim}, headers=_headers(admin_token))
    assert unboost.status_code == 200
    assert db.is_user_gpu_boosted(nim) is False


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
# Mode-controlled GPU Boost
# ---------------------------------------------------------------------------

def test_mode_60_blocks_new_boost_but_keeps_running_boost(client, admin_token):
    headers = _headers(admin_token)
    running = _student("99000010")
    waiting = _student("99000011")

    assert client.post(
        "/api/users/gpu-boost",
        json={"nim": running, "hours": 2},
        headers=headers,
    ).status_code == 200

    # Pindah ke Mode 60
    res = client.post("/api/lab/profile", json={"mode": "cpu60"}, headers=headers)
    assert res.status_code == 200
    assert db.get_gpu_boost_enabled() is False

    # Boost yang sudah berjalan tetap hidup sampai kedaluwarsa/dicabut.
    assert db.is_user_gpu_boosted(running) is True

    # Mahasiswa baru ditolak karena di Mode 60
    blocked = client.post(
        "/api/users/gpu-boost",
        json={"nim": waiting, "hours": 1},
        headers=headers,
    )
    assert blocked.status_code == 409
    assert "mode 30" in blocked.json()["detail"].lower()

    # Kembalikan ke Mode 30
    re_enable = client.post("/api/lab/profile", json={"mode": "boost30"}, headers=headers)
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
# Mode 30 (GPU Boost) & Mode 60 (CPU Only)
# ---------------------------------------------------------------------------

def test_default_mode_is_mode_30(client, admin_token):
    profile = client.get("/api/lab/profile", headers=_headers(admin_token)).json()
    assert profile["mode"] == "boost30"
    assert profile["max_slots"] == 30
    assert profile["gpu_boost_allowed"] is True
    assert profile["cpu_limit_cores"] == 2.0
    assert profile["ram_limit_mb"] == 3072.0

    capacity = client.get("/api/stats/capacity").json()
    assert capacity["lab_mode"] == "boost30"
    assert capacity["gpu_boost_allowed"] is True
    assert capacity["gpu_boost"]["allowed"] is True


def test_switch_to_mode_60_and_back(client, admin_token):
    # Pindah ke Mode 60
    res60 = client.post(
        "/api/lab/profile", json={"mode": "cpu60"}, headers=_headers(admin_token)
    )
    assert res60.status_code == 200, res60.text
    body60 = res60.json()
    assert body60["mode"] == "cpu60"
    assert body60["profile"]["max_slots"] == 60
    assert body60["profile"]["cpu_limit_cores"] == 1.0
    assert body60["profile"]["ram_limit_mb"] == 1536.0
    assert body60["gpu_boost_allowed"] is False
    assert body60["gpu_boost_enabled"] is False

    cap60 = client.get("/api/stats/capacity").json()
    assert cap60["lab_mode"] == "cpu60"
    assert cap60["gpu_boost_allowed"] is False
    assert cap60["gpu_boost"]["allowed"] is False
    assert cap60["gpu_boost"]["enabled"] is False

    # Pindah kembali ke Mode 30
    res30 = client.post(
        "/api/lab/profile", json={"mode": "boost30"}, headers=_headers(admin_token)
    )
    assert res30.status_code == 200, res30.text
    body30 = res30.json()
    assert body30["mode"] == "boost30"
    assert body30["profile"]["max_slots"] == 30
    assert body30["profile"]["cpu_limit_cores"] == 2.0
    assert body30["profile"]["ram_limit_mb"] == 3072.0
    assert body30["gpu_boost_allowed"] is True
    assert body30["gpu_boost_enabled"] is True


def test_mode_60_blocks_new_boost_and_toggle(client, admin_token):
    # Set ke Mode 60
    client.post("/api/lab/profile", json={"mode": "cpu60"}, headers=_headers(admin_token))

    # Coba grant boost di Mode 60 -> ditolak 409
    nim = _student("99000088")
    grant = client.post(
        "/api/users/gpu-boost",
        json={"nim": nim, "hours": 2, "reason": "Tes Mode 60"},
        headers=_headers(admin_token),
    )
    assert grant.status_code == 409
    assert "mode 30" in grant.json()["detail"].lower()

    # Endpoint toggle kompatibilitas mengembalikan enabled=False di Mode 60
    toggle = client.post(
        "/api/lab/gpu-boost-toggle",
        json={"enabled": True},
        headers=_headers(admin_token),
    )
    assert toggle.status_code == 200
    assert toggle.json()["enabled"] is False


def test_mode_switch_preserves_running_boost(client, admin_token):
    # Di Mode 30, beri boost ke mahasiswa
    nim = _student("99000089")
    grant = client.post(
        "/api/users/gpu-boost",
        json={"nim": nim, "hours": 4, "reason": "Boost Aktif"},
        headers=_headers(admin_token),
    )
    assert grant.status_code == 200

    # Pindah ke Mode 60
    res = client.post(
        "/api/lab/profile", json={"mode": "cpu60"}, headers=_headers(admin_token)
    )
    assert res.status_code == 200
    warnings = res.json().get("warnings", [])
    assert any("gpu boost masih berjalan" in w.lower() for w in warnings)

    # Boost tetap ada di database
    active = db.list_active_gpu_boosts()
    assert any(str(b["nim"]) == nim for b in active)

    # Cabut boost di Mode 60 tetap berhasil
    unboost = client.post(
        "/api/users/gpu-unboost", json={"nim": nim}, headers=_headers(admin_token)
    )
    assert unboost.status_code == 200
    active_after = db.list_active_gpu_boosts()
    assert not any(str(b["nim"]) == nim for b in active_after)


def test_mode_switch_permissions_and_aliases(client, admin_token):
    # Aslab boleh ganti mode
    aslab_hdr = _aslab_headers("99000991")
    aslab_res = client.post(
        "/api/lab/profile", json={"mode": "basic"}, headers=aslab_hdr
    )
    assert aslab_res.status_code == 200
    assert aslab_res.json()["mode"] == "cpu60"

    # Alias ai -> boost30
    alias_res = client.post(
        "/api/lab/profile", json={"mode": "ai"}, headers=_headers(admin_token)
    )
    assert alias_res.status_code == 200
    assert alias_res.json()["mode"] == "boost30"

    # Mode tidak valid ditolak 400
    invalid_res = client.post(
        "/api/lab/profile", json={"mode": "super_gpu_mode"}, headers=_headers(admin_token)
    )
    assert invalid_res.status_code == 400

    # Tanpa token / mahasiswa ditolak 401/403
    mhs_hdr = _headers("invalid_or_student_token")
    denied = client.post("/api/lab/profile", json={"mode": "cpu60"}, headers=mhs_hdr)
    assert denied.status_code in (401, 403)


def test_status_endpoint_includes_mode_fields(client, admin_token):
    status = client.get("/api/status", headers=_headers(admin_token)).json()
    l2 = status["level2_slots"]
    assert l2["lab_mode"] == "boost30"
    assert l2["max_slots"] == 30
    assert l2["cpu_limit_cores"] == 2.0
    assert l2["ram_limit_gb"] == 3.0
    assert l2["ram_limit_mb"] == 3072.0
    assert l2["gpu_boost_allowed"] is True
    assert l2["gpu_boost_max"] == db.GPU_BOOST_MAX_SLOTS
    assert l2["gpu_boost_vram_mb"] == db.GPU_BOOST_VRAM_MB


# ---------------------------------------------------------------------------
# Telemetri JupyterLab harus mengikuti status boost, bukan menebak GPU
# ---------------------------------------------------------------------------

def test_user_telemetry_defaults_to_cpu_only(client, admin_token):
    """Mahasiswa tanpa boost TIDAK boleh terlihat memegang GPU/VRAM."""
    nim = _student("99000101")
    response = client.get(f"/api/user-telemetry/m{nim}", headers=_headers(admin_token))
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["tier"] == "Level 2 (CPU-only)"
    assert data["gpu_assigned"] == "CPU only"
    assert data["gpu_index"] is None
    assert data["vram_limit_mb"] == 0.0
    assert data["vram_used_mb"] == 0.0
    assert data["gpu_name"] == "CPU Only (GPU Blocked)"
    assert data["gpu_total_vram_mb"] == 0
    assert data["cpu_cores_limit"] == 2
    assert data["ram_max_mb"] == 3072.0
    assert "workload_specs" in data
    assert data["workload_specs"]["cores"] == 2.0
    assert "capable_for" in data["workload_specs"]
    assert "limitations" in data["workload_specs"]


def test_user_telemetry_reflects_gpu_boost_without_changing_cpu_ram(client, admin_token):
    nim = _student("99000102")
    grant = client.post(
        "/api/users/gpu-boost",
        json={"nim": nim, "hours": 1, "reason": "Uji telemetri boost"},
        headers=_headers(admin_token),
    )
    assert grant.status_code == 200, grant.text

    data = client.get(f"/api/user-telemetry/m{nim}", headers=_headers(admin_token)).json()
    assert data["tier"] == "Level 2 (GPU Boost)"
    assert data["gpu_assigned"] == "GPU 1 (Boost)"
    assert data["gpu_index"] == 1
    assert data["vram_limit_mb"] == float(db.GPU_BOOST_VRAM_MB)
    # GPU Boost hanya menambah GPU 1; kuota CPU/RAM tetap baseline Mode 30.
    assert data["cpu_cores_limit"] == 2
    assert data["ram_max_mb"] == 3072.0
    assert data["workload_specs"]["mode"] == "boosted"
    assert data["workload_specs"]["gpu_allowed"] is True


def test_gpu_boost_audit_is_recorded_once(client, admin_token):
    """Grant/revoke harus menghasilkan tepat satu baris audit, bukan duplikat."""
    nim = _student("99000105")
    headers = _headers(admin_token)

    assert client.post(
        "/api/users/gpu-boost",
        json={"nim": nim, "hours": 2, "reason": "Uji audit"},
        headers=headers,
    ).status_code == 200

    grant_logs = [
        l for l in db.get_audit_logs(500)
        if l["action"] == "GPU_BOOST" and str(l["nim"]).endswith(nim)
    ]
    assert len(grant_logs) == 1
    assert "Uji audit" in grant_logs[0]["detail"]

    assert client.post("/api/users/gpu-unboost", json={"nim": nim}, headers=headers).status_code == 200

    unboost_logs = [
        l for l in db.get_audit_logs(500)
        if l["action"] == "GPU_UNBOOST" and str(l["nim"]).endswith(nim)
    ]
    assert len(unboost_logs) == 1


def test_user_telemetry_follows_mode_60_baseline(client, admin_token):
    nim = _student("99000103")
    switch = client.post(
        "/api/lab/profile",
        json={"mode": "cpu60"},
        headers=_headers(admin_token),
    )
    assert switch.status_code == 200, switch.text

    data = client.get(f"/api/user-telemetry/m{nim}", headers=_headers(admin_token)).json()
    assert data["tier"] == "Level 2 (CPU-only)"
    assert data["gpu_index"] is None
    assert data["vram_limit_mb"] == 0.0
    assert data["cpu_cores_limit"] == 1
    assert data["ram_max_mb"] == 1536.0


def test_user_telemetry_keeps_running_boost_in_mode_60(client, admin_token):
    nim = _student("99000104")
    grant = client.post(
        "/api/users/gpu-boost",
        json={"nim": nim, "hours": 1, "reason": "Boost berjalan"},
        headers=_headers(admin_token),
    )
    assert grant.status_code == 200, grant.text

    switch = client.post(
        "/api/lab/profile",
        json={"mode": "cpu60"},
        headers=_headers(admin_token),
    )
    assert switch.status_code == 200, switch.text

    data = client.get(f"/api/user-telemetry/m{nim}", headers=_headers(admin_token)).json()
    assert data["tier"] == "Level 2 (GPU Boost)"
    assert data["gpu_index"] == 1
    assert data["vram_limit_mb"] == float(db.GPU_BOOST_VRAM_MB)
    assert data["cpu_cores_limit"] == 1
    assert data["ram_max_mb"] == 1536.0


