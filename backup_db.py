#!/usr/bin/env python3
"""
Script Otomatis Backup Database SQLite (lab_users.db)
Dapat dijalankan secara manual dari CLI atau dijadwalkan via Linux crontab.
"""

import sys
import os

# Tambahkan backend ke Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(CURRENT_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.db import perform_database_backup, list_database_backups

def main():
    print("=" * 60)
    print("📦 Memulai Auto-Backup Database Lab AI UMPO...")
    print("=" * 60)

    backup_path = perform_database_backup(retention_days=14)
    if backup_path:
        print(f"✅ Sukses! File backup tersimpan di: {backup_path}")
        print(f"📊 Ukuran file: {round(os.path.getsize(backup_path) / 1024, 2)} KB")
        print("\n📋 5 Snapshot Backup Terakhir:")
        backups = list_database_backups()
        for idx, b in enumerate(backups[:5], start=1):
            print(f"  {idx}. {b['filename']} ({b['size_kb']} KB) - {b['created_at']}")
        sys.exit(0)
    else:
        print("❌ Gagal membuat backup database. Periksa log atau izin folder.")
        sys.exit(1)

if __name__ == "__main__":
    main()
