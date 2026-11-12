"""Konfigurasi pytest untuk regression test keamanan panel-lab.

Environment di-set SEBELUM modul aplikasi diimpor agar PIN, token internal,
dan path database tidak memakai nilai produksi.
"""

import os
import sys
import tempfile
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

_TMP_DIR = tempfile.mkdtemp(prefix="panel-lab-tests-")

os.environ["TESTING"] = "1"
os.environ["ADMIN_PIN"] = "test-admin-pin-123"
os.environ["LAB_INTERNAL_TOKEN"] = "t" * 64
os.environ["LAB_DB_PATH"] = os.path.join(_TMP_DIR, "test.db")
os.environ["CORS_ALLOW_ORIGINS"] = "http://testserver"

import pytest  # noqa: E402


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    from app.db import init_db
    from app.main import app

    init_db()
    return TestClient(app)


@pytest.fixture(scope="session")
def admin_token(client):
    response = client.post("/api/admin/login", json={"pin": "test-admin-pin-123"})
    assert response.status_code == 200, response.text
    return response.json()["token"]
