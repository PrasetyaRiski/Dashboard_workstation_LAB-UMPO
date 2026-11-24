#!/usr/bin/env python3
"""
Script Pemulihan (Restore) Database SQLite Lab AI UMPO (lab_users.db)
Dapat dijalankan langsung dari terminal CLI jika web dashboard tidak dapat diakses.

Penggunaan:
  python3 restore_db.py                       # Tampilkan daftar dan pilih interaktif
  python3 restore_db.py <nama_file_backup.db> # Pulihkan file snapshot tertentu
"""

import sys
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(CURRENT_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.db import perform_database_restore, list_database_backups


def main():
    print("=" * 65)
    print("🔄 Utilitas Pemulihan (Restore) Database Lab AI UMPO")
    print("=" * 65)

    backups = list_database_backups()
    if not backups:
        print("❌ Tidak ada file backup database yang ditemukan.")
        sys.exit(1)

    target_file = None
    if len(sys.argv) > 1:
        target_file = sys.argv[1].strip()
    else:
        print("\n📋 Snapshot Cadangan yang Tersedia:")
        for idx, b in enumerate(backups[:10], start=1):
            tag = " [Darurat]" if b.get("is_safety_snapshot") else ""
            print(f"  [{idx}] {b['filename']} ({b['size_kb']} KB) - {b['created_at']}{tag}")

        try:
            choice = input("\nPilih nomor snapshot untuk dipulihkan [1-%d] atau 'q' untuk batal: " % min(10, len(backups))).strip()
            if choice.lower() == 'q' or not choice:
                print("Operasi dibatalkan.")
                sys.exit(0)
            num = int(choice)
            if 1 <= num <= min(10, len(backups)):
                target_file = backups[num - 1]["filename"]
            else:
                print("Pilihan tidak valid.")
                sys.exit(1)
        except (ValueError, KeyboardInterrupt):
            print("\nOperasi dibatalkan.")
            sys.exit(1)

    confirm = input(f"\n⚠️  PERINGATAN: Memulihkan database dari '{target_file}' akan menimpa data aktif saat ini.\nLanjutkan pemulihan? [y/N]: ").strip().lower()
    if confirm != 'y':
        print("Pemulihan dibatalkan.")
        sys.exit(0)

    print(f"\n⏳ Memvalidasi dan memulihkan database dari '{target_file}'...")
    res = perform_database_restore(target_file)
    if res.get("success"):
        print("✅ SUKSES! Database berhasil dipulihkan.")
        if res.get("pre_restore_backup"):
            print(f"📦 Snapshot darurat database sebelum ditimpa telah disimpan di:\n   {res['pre_restore_backup']}")
        sys.exit(0)
    else:
        print(f"❌ GAGAL: {res.get('message', 'Terjadi kesalahan.')}")
        sys.exit(1)


if __name__ == "__main__":
    main()
