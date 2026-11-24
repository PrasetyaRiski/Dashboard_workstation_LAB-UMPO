"""Regression test untuk ringkasan sesi Level 2 vs sesi bypass.

Cakupan:
- Mahasiswa Level 2 dihitung ke kuota praktikum (`level2`).
- Admin, Aslab, dan mahasiswa Level 1 dilaporkan terpisah (`bypass`) dan tidak
  memakai kuota.
- `/api/status` mengekspos `level2_slots.active_bypass_count`.
- Cache ringan ringkasan sesi bisa dilewati saat dibutuhkan data segar.
"""

import pytest

from app import lab_policy as lp


def _session(username):
    return {
        "username": username,
        "nim": lp.username_to_nim(username) if lp.is_student_username(username) else username,
        "last_activity": None,
        "source": "systemd",
    }


@pytest.fixture()
def fake_sessions(monkeypatch):
    """Dua mahasiswa Level 2 + satu admin + satu akun riset Level 1."""
    units = {"m11111111", "m22222222", "m23533743", "labriset"}
    monkeypatch.setattr(lp, "_list_running_singleuser_units", lambda: set(units))
    monkeypatch.setattr(lp, "_list_jupyterhub_spawners", lambda: {})
    monkeypatch.setattr(
        lp,
        "is_level2_student",
        lambda username: username in {"m11111111", "m22222222"},
    )
    monkeypatch.setattr(lp, "_SESSION_SUMMARY_CACHE", {"ts": 0.0, "data": None})
    return units


def test_session_summary_splits_level2_and_bypass(fake_sessions):
    summary = lp.get_active_session_summary(use_cache=False)

    level2_users = {s["username"] for s in summary["level2"]}
    bypass_users = {s["username"] for s in summary["bypass"]}

    assert level2_users == {"m11111111", "m22222222"}
    assert bypass_users == {"m23533743", "labriset"}
    assert len(summary["level2"]) == 2
    assert len(summary["bypass"]) == 2


def test_session_summary_cache_can_be_bypassed(fake_sessions, monkeypatch):
    lp.get_active_session_summary(use_cache=False)
    assert len(lp.get_active_session_summary(use_cache=True)["level2"]) == 2

    # Perubahan sumber tidak terlihat selama cache masih hangat...
    monkeypatch.setattr(lp, "_list_running_singleuser_units", lambda: {"m33333333"})
    monkeypatch.setattr(lp, "is_level2_student", lambda username: True)
    assert len(lp.get_active_session_summary(use_cache=True)["level2"]) == 2

    # ...tetapi data segar tersedia saat cache dilewati.
    assert len(lp.get_active_session_summary(use_cache=False)["level2"]) == 1


def test_session_summary_tolerates_scan_failure(fake_sessions, monkeypatch):
    def _boom():
        raise RuntimeError("systemctl tidak tersedia")

    monkeypatch.setattr(lp, "_list_running_singleuser_units", _boom)
    summary = lp.get_active_session_summary(use_cache=False)

    assert summary == {"level2": [], "bypass": []}


def test_status_exposes_active_bypass_count(client, admin_token, monkeypatch):
    from app import lab_policy

    monkeypatch.setattr(
        lab_policy,
        "get_active_session_summary",
        lambda use_cache=True: {
            "level2": [_session("m11111111"), _session("m22222222")],
            "bypass": [_session("m23533743")],
        },
    )

    response = client.get(
        "/api/status",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    slots = response.json()["level2_slots"]

    assert slots["active_count"] == 2
    assert slots["active_bypass_count"] == 1
    assert slots["available_slots"] == max(0, slots["max_slots"] - 2)
