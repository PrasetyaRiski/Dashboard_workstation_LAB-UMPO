"""Regression tests untuk endpoint penambahan pengguna (POST /api/users).

Cakupan:
- Penambahan mahasiswa baru berhasil dengan role default 'mahasiswa'.
- Penambahan Aslab dan Admin menetapkan kolom role & is_admin dengan benar.
- Penambahan user prioritas Level 1 menghitung priority_expires_at.
- Penolakan duplikasi NIM (400).
- Penolakan karakter NIM ilegal / path traversal (400).
- Otorisasi: hanya Super Admin yang diizinkan (Operator/Aslab ditolak 403).
"""

import time
import pytest
from app import db


def _admin_headers():
    import app.main as main_mod
    token = "test-super-admin-add-user"
    main_mod.ACTIVE_SESSIONS[token] = {
        "role": "admin",
        "nim": None,
        "nama": "Super Admin Test",
        "expires_at": time.time() + 3600,
    }
    return {"Authorization": f"Bearer {token}"}


def _operator_headers():
    import app.main as main_mod
    token = "test-operator-add-user"
    main_mod.ACTIVE_SESSIONS[token] = {
        "role": "aslab",
        "nim": "99001122",
        "nama": "Aslab Uji",
        "expires_at": time.time() + 3600,
    }
    return {"Authorization": f"Bearer {token}"}


def test_add_student_user(client):
    headers = _admin_headers()
    nim = "22533099"
    res = client.post(
        "/api/users",
        json={"nim": nim, "nama": "Budi Santoso", "role": "mahasiswa"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["success"] is True

    user = db.get_user(nim)
    assert user is not None
    assert user["nama"] == "Budi Santoso"
    assert user["role"] == "mahasiswa"
    assert user["is_admin"] is False
    assert user["is_priority"] is False


def test_add_aslab_and_admin_user(client):
    headers = _admin_headers()
    
    # Aslab
    aslab_nim = "22533100"
    res1 = client.post(
        "/api/users",
        json={"nim": aslab_nim, "nama": "Citra Lestari", "role": "aslab"},
        headers=headers,
    )
    assert res1.status_code == 200
    u1 = db.get_user(aslab_nim)
    assert u1["role"] == "aslab"
    assert u1["is_admin"] is False

    # Admin
    admin_nim = "admin_lab_new"
    res2 = client.post(
        "/api/users",
        json={"nim": admin_nim, "nama": "Super Admin Baru", "role": "admin"},
        headers=headers,
    )
    assert res2.status_code == 200
    u2 = db.get_user(admin_nim)
    assert u2["role"] == "admin"
    assert u2["is_admin"] is True


def test_add_priority_user(client):
    headers = _admin_headers()
    prio_nim = "22533101"
    res = client.post(
        "/api/users",
        json={
            "nim": prio_nim,
            "nama": "Dedi Riset Skripsi",
            "role": "mahasiswa",
            "is_priority": True,
            "priority_days": 14,
        },
        headers=headers,
    )
    assert res.status_code == 200
    user = db.get_user(prio_nim)
    assert user["is_priority"] is True
    assert user["priority_expires_at"] is not None


def test_add_user_duplicate_rejected(client):
    headers = _admin_headers()
    dup_nim = "22533102"
    res1 = client.post(
        "/api/users",
        json={"nim": dup_nim, "nama": "Pengguna Pertama", "role": "mahasiswa"},
        headers=headers,
    )
    assert res1.status_code == 200

    # Percobaan kedua dengan NIM sama harus ditolak
    res2 = client.post(
        "/api/users",
        json={"nim": dup_nim, "nama": "Pengguna Kedua", "role": "mahasiswa"},
        headers=headers,
    )
    assert res2.status_code == 400
    assert "sudah terdaftar" in res2.json()["detail"]


def test_add_user_invalid_nim_rejected(client):
    headers = _admin_headers()
    # Karakter ilegal / path traversal
    res = client.post(
        "/api/users",
        json={"nim": "../etc/passwd", "nama": "Hacker", "role": "mahasiswa"},
        headers=headers,
    )
    assert res.status_code == 400
    assert "tidak valid" in res.json()["detail"]


def test_add_user_requires_super_admin(client):
    # Operator / Aslab biasa harus ditolak 403
    headers = _operator_headers()
    res = client.post(
        "/api/users",
        json={"nim": "22533103", "nama": "Uji Operator", "role": "mahasiswa"},
        headers=headers,
    )
    assert res.status_code == 403
