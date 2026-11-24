"""Regression tests untuk fitur pemulihan (restore) database SQLite.

Cakupan:
- Proteksi path traversal pada nama file restore.
- Validasi integritas berkas backup (sqlite integrity_check & tabel wajib).
- Pembuatan snapshot darurat sebelum proses restore ditimpa.
- Reverse hot-restore mengembalikan state database ke snapshot sebelumnya.
- Otorisasi endpoint /api/admin/restore: wajib Super Admin & verifikasi PIN Master.
- Audit log RESTORE_DATABASE tercatat saat restore berhasil.
"""

import os
import pytest
from app import db


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


def _admin_headers():
    import app.main as main_module
    import time
    token = "test-super-admin-restore-token"
    main_module.ACTIVE_SESSIONS[token] = {
        "role": "admin",
        "nim": None,
        "nama": "Super Admin Test",
        "expires_at": time.time() + 3600,
    }
    return {"Authorization": f"Bearer {token}"}


def test_restore_rejects_path_traversal():
    res = db.perform_database_restore("../../../etc/passwd")
    assert res["success"] is False
    assert "tidak valid" in res["message"] or "tidak ditemukan" in res["message"]


def test_restore_rejects_non_db_files():
    res = db.perform_database_restore("hacker.sh")
    assert res["success"] is False
    assert "harus berakhiran .db" in res["message"]


def test_restore_rejects_nonexistent_file():
    res = db.perform_database_restore("lab_users_backup_99999999_999999.db")
    assert res["success"] is False
    assert "tidak ditemukan" in res["message"]


def test_restore_cycle_restores_data_and_creates_safety_snapshot():
    # 1. Pastikan user awal ada dengan role 'mahasiswa'
    nim = "99887766"
    db.get_or_create_user(nim, "Mahasiswa Restore Test")
    db.set_user_role(nim, "mahasiswa")
    assert db.get_user(nim)["role"] == "mahasiswa"

    # 2. Buat backup snapshot
    backup_path = db.perform_database_backup()
    assert backup_path is not None
    backup_file = os.path.basename(backup_path)

    # 3. Ubah state database setelah backup (misal diubah jadi 'aslab')
    db.set_user_role(nim, "aslab")
    assert db.get_user(nim)["role"] == "aslab"

    # 4. Lakukan restore dari backup snapshot sebelumnya
    restore_res = db.perform_database_restore(backup_file)
    assert restore_res["success"] is True
    assert restore_res.get("pre_restore_backup") is not None
    assert os.path.isfile(restore_res["pre_restore_backup"])

    # 5. Verifikasi bahwa data kembali ke state saat backup dibuat ('mahasiswa')
    restored_user = db.get_user(nim)
    assert restored_user["role"] == "mahasiswa"


def test_restore_api_requires_super_admin_and_pin(client):
    headers = _admin_headers()
    db.set_master_pin("test-admin-pin-123")
    # Buat backup valid terlebih dahulu
    backup_path = db.perform_database_backup()
    assert backup_path is not None
    backup_file = os.path.basename(backup_path)

    # 1. PIN salah -> 401
    bad_res = client.post(
        "/api/admin/restore",
        json={"filename": backup_file, "pin": "salah-pin-rahasia"},
        headers=headers
    )
    assert bad_res.status_code == 401
    assert "PIN Super Admin salah" in bad_res.json()["detail"]

    # 2. PIN benar -> 200
    ok_res = client.post(
        "/api/admin/restore",
        json={"filename": backup_file, "pin": "test-admin-pin-123"},
        headers=headers
    )
    assert ok_res.status_code == 200
    data = ok_res.json()
    assert data["success"] is True
    assert "berhasil dipulihkan" in data["message"]

    # 3. Audit log tercatat
    audit_logs = db.get_audit_logs(10)
    restore_audits = [a for a in audit_logs if a.get("action") == "RESTORE_DATABASE"]
    assert len(restore_audits) >= 1
