"""Regression test untuk kontrol akses dashboard panel-lab.

Fokus: memastikan endpoint telemetri/admin tidak terbuka untuk anonim,
tiket WebSocket bersifat sekali pakai dan berumur pendek, serta header
forwarding tidak dipercaya dari klien biasa.
"""

import time

import pytest
from starlette.requests import Request
from starlette.websockets import WebSocketDisconnect

PROTECTED_GET = [
    "/api/status",
    "/api/users/students",
    "/api/export-telemetry",
    "/api/lab/profile",
    "/api/audit-logs",
]

PROTECTED_POST = [
    "/api/kill-process",
    "/api/kill-user-all",
    "/api/gpu/sweep-zombies",
    "/api/users/boost",
    "/api/admin/backup",
    "/api/admin/checkpoint-wal",
]


def test_anonymous_reads_rejected(client):
    for path in PROTECTED_GET:
        assert client.get(path).status_code == 401, path


def test_anonymous_mutations_rejected(client):
    for path in PROTECTED_POST:
        assert client.post(path, json={}).status_code == 401, path


def test_admin_reads_allowed(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    for path in ("/api/lab/profile", "/api/admin/session", "/api/audit-logs"):
        response = client.get(path, headers=headers)
        assert response.status_code == 200, (path, response.text)


def test_logout_revokes_token(client):
    login = client.post("/api/admin/login", json={"pin": "test-admin-pin-123"})
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    assert client.get("/api/admin/session", headers=headers).status_code == 200
    assert client.post("/api/admin/logout", headers=headers).status_code == 200
    assert client.get("/api/admin/session", headers=headers).status_code == 401
    assert client.post("/api/ws-ticket", headers=headers).status_code == 401


def _fresh_token(client):
    response = client.post("/api/admin/login", json={"pin": "test-admin-pin-123"})
    assert response.status_code == 200, response.text
    return response.json()["token"]


def test_ws_ticket_flow(client):
    headers = {"Authorization": f"Bearer {_fresh_token(client)}"}
    ticket = client.post("/api/ws-ticket", headers=headers).json()["ticket"]

    with client.websocket_connect(f"/ws/telemetry?ticket={ticket}") as websocket:
        snapshot = websocket.receive_json()
        assert "users" in snapshot


def test_ws_ticket_is_single_use(client):
    headers = {"Authorization": f"Bearer {_fresh_token(client)}"}
    ticket = client.post("/api/ws-ticket", headers=headers).json()["ticket"]

    with client.websocket_connect(f"/ws/telemetry?ticket={ticket}"):
        pass

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"/ws/telemetry?ticket={ticket}"):
            pass


def test_ws_without_ticket_rejected(client):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/telemetry"):
            pass

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/telemetry?ticket=palsu"):
            pass


def test_ws_ticket_expires(client):
    import app.main as main_module

    headers = {"Authorization": f"Bearer {_fresh_token(client)}"}
    ticket = client.post("/api/ws-ticket", headers=headers).json()["ticket"]
    main_module.WS_TICKETS[ticket]["expires_at"] = time.time() - 1

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"/ws/telemetry?ticket={ticket}"):
            pass


def test_ws_connection_cap(client):
    headers = {"Authorization": f"Bearer {_fresh_token(client)}"}
    tickets = [
        client.post("/api/ws-ticket", headers=headers).json()["ticket"]
        for _ in range(4)
    ]

    with client.websocket_connect(f"/ws/telemetry?ticket={tickets[0]}") as first:
        first.receive_json()
        with client.websocket_connect(f"/ws/telemetry?ticket={tickets[1]}"):
            with client.websocket_connect(f"/ws/telemetry?ticket={tickets[2]}"):
                with pytest.raises(WebSocketDisconnect):
                    with client.websocket_connect(f"/ws/telemetry?ticket={tickets[3]}"):
                        pass


def test_user_telemetry_requires_auth(client):
    assert client.get("/api/user-telemetry/m25533954").status_code == 401


def test_user_telemetry_internal_token_must_match_user(client):
    internal = {
        "X-Lab-Internal-Token": "t" * 64,
        "X-Lab-Telemetry-User": "m25533954",
    }
    assert client.get("/api/user-telemetry/m25533954", headers=internal).status_code == 200

    wrong_user = dict(internal, **{"X-Lab-Telemetry-User": "m23533740"})
    assert client.get("/api/user-telemetry/m25533954", headers=wrong_user).status_code == 401

    wrong_token = dict(internal, **{"X-Lab-Internal-Token": "x" * 64})
    assert client.get("/api/user-telemetry/m25533954", headers=wrong_token).status_code == 401


def test_user_telemetry_admin_bearer_allowed(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/api/user-telemetry/m25533954", headers=headers)
    assert response.status_code == 200
    assert response.json()["username"] == "m25533954"


def test_forwarded_for_untrusted_client_is_ignored():
    from app.main import get_client_ip

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "query_string": b"",
        "headers": [(b"x-forwarded-for", b"9.9.9.9")],
        "client": ("203.0.113.5", 4321),
    }
    assert get_client_ip(Request(scope)) == "203.0.113.5"


def test_forwarded_for_trusted_proxy_is_used():
    from app.main import get_client_ip

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "query_string": b"",
        "headers": [(b"x-forwarded-for", b"9.9.9.9, 10.0.0.1")],
        "client": ("127.0.0.1", 4321),
    }
    assert get_client_ip(Request(scope)) == "9.9.9.9"


def test_cors_rejects_unknown_origin(client, admin_token):
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Origin": "http://evil.example",
    }
    response = client.get("/api/lab/profile", headers=headers)
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers


def test_cors_allows_configured_origin(client, admin_token):
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Origin": "http://testserver",
    }
    response = client.get("/api/lab/profile", headers=headers)
    assert response.headers.get("access-control-allow-origin") == "http://testserver"


def test_hash_and_verify_master_pin():
    from app.db import hash_master_pin, verify_master_pin

    pin = "RahasiaPalingAman#2026"
    hashed = hash_master_pin(pin)
    assert hashed.startswith("scrypt$16384$8$1$")
    assert verify_master_pin(pin, hashed) is True
    assert verify_master_pin("SalahPin12345", hashed) is False
    assert verify_master_pin("", hashed) is False

    # Plaintext fallback check
    assert verify_master_pin("plain123", "plain123") is True
    assert verify_master_pin("wrong", "plain123") is False


def test_change_master_pin_api(client):
    from app.db import set_master_pin

    # Pastikan PIN awal diset ke nilai tes
    initial_pin = "test-admin-pin-123"
    set_master_pin(initial_pin)

    # 1. Anonymous ditolak
    anon = client.post("/api/admin/change-pin", json={
        "current_pin": initial_pin,
        "new_pin": "pin-baru-panjang-123",
        "confirm_pin": "pin-baru-panjang-123",
    })
    assert anon.status_code == 401

    # Login sebagai admin
    login_res = client.post("/api/admin/login", json={"pin": initial_pin})
    assert login_res.status_code == 200
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. PIN saat ini salah -> 400
    res = client.post("/api/admin/change-pin", headers=headers, json={
        "current_pin": "pin-salah-9999",
        "new_pin": "pin-baru-panjang-123",
        "confirm_pin": "pin-baru-panjang-123",
    })
    assert res.status_code == 400
    assert "tidak sesuai" in res.json().get("detail", "").lower()

    # 3. Konfirmasi tidak cocok -> 400
    res = client.post("/api/admin/change-pin", headers=headers, json={
        "current_pin": initial_pin,
        "new_pin": "pin-baru-panjang-123",
        "confirm_pin": "pin-beda-panjang-123",
    })
    assert res.status_code == 400
    assert "tidak cocok" in res.json().get("detail", "").lower()

    # 4. PIN terlalu pendek (< 10 char) -> 400
    res = client.post("/api/admin/change-pin", headers=headers, json={
        "current_pin": initial_pin,
        "new_pin": "pendek",
        "confirm_pin": "pendek",
    })
    assert res.status_code == 400
    assert "minimal 10" in res.json().get("detail", "").lower()

    # 5. Ganti PIN sukses
    new_pin = "SuperKunciBaru#2026"
    res = client.post("/api/admin/change-pin", headers=headers, json={
        "current_pin": initial_pin,
        "new_pin": new_pin,
        "confirm_pin": new_pin,
    })
    assert res.status_code == 200
    assert res.json().get("success") is True

    # 6. PIN lama tidak bisa login lagi -> 401
    old_login = client.post("/api/admin/login", json={"pin": initial_pin})
    assert old_login.status_code == 401

    # 7. PIN baru berhasil login -> 200
    new_login = client.post("/api/admin/login", json={"pin": new_pin})
    assert new_login.status_code == 200
    new_token = new_login.json()["token"]

    # Kembalikan ke PIN awal tes agar tes berikutnya tetap bersih
    reset_back = client.post(
        "/api/admin/change-pin",
        headers={"Authorization": f"Bearer {new_token}"},
        json={
            "current_pin": new_pin,
            "new_pin": initial_pin,
            "confirm_pin": initial_pin,
        },
    )
    assert reset_back.status_code == 200


def test_reset_admin_pin_cli(client):
    import os
    import subprocess
    import sys
    from pathlib import Path

    script = Path(__file__).resolve().parents[1] / "scripts" / "reset_admin_pin.py"
    temp_pin = "CliResetSecret#2026"

    # Jalankan CLI dengan argumen --pin, --no-restart, dan --no-env-sync agar aman untuk environment produksi/lokal
    sub_env = os.environ.copy()
    res = subprocess.run(
        [sys.executable, str(script), "--pin", temp_pin, "--no-restart", "--no-env-sync"],
        capture_output=True,
        text=True,
        env=sub_env,
    )
    assert res.returncode == 0
    assert "BERHASIL" in res.stdout

    # Login dengan PIN hasil CLI -> 200
    login_cli = client.post("/api/admin/login", json={"pin": temp_pin})
    assert login_cli.status_code == 200

    # Kembalikan ke initial pin
    from app.db import set_master_pin
    set_master_pin("test-admin-pin-123")

