#!/usr/bin/env python3
"""
Skrip CLI Pemulihan Root: Reset PIN Master Super Admin Panel Lab AI UMPO.

Gunakan skrip ini saat terjadi insiden lockout, lupa PIN, atau rotasi kredensial
langsung dari server Linux (akses root/sudo).

Contoh penggunaan:
  # Mode interaktif (meminta input PIN secara tersembunyi):
  sudo python3 backend/scripts/reset_admin_pin.py

  # Mode generate otomatis (membuat PIN acak 24 karakter):
  sudo python3 backend/scripts/reset_admin_pin.py --generate

  # Mode manual dengan argumen:
  sudo python3 backend/scripts/reset_admin_pin.py --pin "KunciRahasiaBaru#2026"
"""

import os
import sys
import argparse
import getpass
import secrets
import re
import subprocess
from pathlib import Path

# Pastikan direktori backend masuk ke sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

try:
    from dotenv import load_dotenv
    load_dotenv(str(BACKEND_DIR / ".env"))
    load_dotenv(str(BACKEND_DIR.parent / ".env"))
    load_dotenv("/home/public/web/panel-lab/backend/.env")
    load_dotenv("/home/public/web/.env")
except Exception:
    pass

from app.db import init_db, set_master_pin, get_connection


def record_reset_audit(detail: str):
    """Mencatat audit log langsung ke database."""
    try:
        conn, engine = get_connection()
        cur = conn.cursor()
        placeholder = "%s" if engine == "postgres" else "?"
        cur.execute(
            f"INSERT INTO audit_logs (nim, action, detail) VALUES ({placeholder}, {placeholder}, {placeholder})",
            ("ROOT_CLI", "RESET_MASTER_PIN", detail),
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as exc:
        print(f"⚠️ Peringatan: Gagal mencatat log audit: {exc}", file=sys.stderr)


def sync_env_files(new_pin: str):
    """Sinkronisasi PIN ke file .env lokal dan root backup bila ada akses."""
    candidates = [
        BACKEND_DIR / ".env",
        BACKEND_DIR.parent / ".env",
        Path("/home/public/web/panel-lab/backend/.env"),
        Path("/home/public/web/panel-lab/.env"),
    ]
    updated = []
    for c in candidates:
        if c.is_file() and os.access(c, os.W_OK):
            try:
                txt = c.read_text(encoding="utf-8")
                if re.search(r"^ADMIN_PIN=", txt, re.M):
                    txt = re.sub(r"^ADMIN_PIN=.*$", f"ADMIN_PIN={new_pin}", txt, count=1, flags=re.M)
                else:
                    txt += f"\nADMIN_PIN={new_pin}\n"
                c.write_text(txt, encoding="utf-8")
                c.chmod(0o600)
                updated.append(str(c))
            except Exception as exc:
                print(f"⚠️ Gagal memperbarui {c}: {exc}", file=sys.stderr)

    # Simpan di /root jika root
    root_file = Path("/root/.panel_lab_admin_pin")
    if os.getuid() == 0 or os.access(root_file.parent, os.W_OK):
        try:
            root_file.write_text(new_pin + "\n", encoding="utf-8")
            root_file.chmod(0o600)
            updated.append(str(root_file))
        except Exception:
            pass

    return updated


def main():
    parser = argparse.ArgumentParser(description="Reset PIN Master Super Admin Panel Lab")
    parser.add_argument("--pin", type=str, default="", help="PIN baru yang akan disetel")
    parser.add_argument("--generate", action="store_true", help="Buat PIN acak aman secara otomatis")
    parser.add_argument("--no-restart", action="store_true", help="Jangan restart service systemd")
    parser.add_argument("--no-env-sync", action="store_true", help="Jangan modifikasi file .env (hanya update hash di DB)")

    args = parser.parse_args()

    # 1. Tentukan PIN baru
    if args.generate:
        new_pin = secrets.token_urlsafe(18)  # 24 karakter aman
    elif args.pin:
        new_pin = args.pin.strip()
    else:
        print("🔐 Pemulihan Root: Reset PIN Master Panel Lab AI UMPO")
        print("-----------------------------------------------------")
        try:
            p1 = getpass.getpass("Masukkan PIN Master Baru (min. 10 karakter): ")
            p2 = getpass.getpass("Konfirmasi PIN Master Baru               : ")
        except (KeyboardInterrupt, EOFError):
            print("\nDibatalkan.")
            return 1
        if p1 != p2:
            print("❌ Error: Konfirmasi PIN tidak cocok.", file=sys.stderr)
            return 1
        new_pin = p1.strip()

    if len(new_pin) < 10:
        print("❌ Error: PIN Master harus minimal 10 karakter demi keamanan.", file=sys.stderr)
        return 1

    # 2. Inisialisasi DB & Simpan Hash
    init_db()
    hashed = set_master_pin(new_pin)

    # 3. Sinkronkan file environment jika diizinkan
    updated_files = [] if args.no_env_sync else sync_env_files(new_pin)

    # 4. Catat Audit
    record_reset_audit(f"PIN Master direset via CLI server oleh UID={os.getuid()} (user={getpass.getuser()}).")

    print("\n✅ BERHASIL: PIN Master Super Admin telah diperbarui!")
    print(f"   Hash scrypt tersimpan di DB: {hashed[:32]}...")
    if updated_files:
        print(f"   File disinkronkan          : {', '.join(updated_files)}")
    print(f"   PIN Master Baru            : {new_pin}\n")

    # 5. Opsional restart service dashboard agar sesi in-memory lama di-refresh
    if not args.no_restart and os.getuid() == 0:
        for unit in ("lab-dashboard.service", "panel-lab.service"):
            check = subprocess.run(["systemctl", "is-active", unit], capture_output=True, text=True)
            if check.stdout.strip() == "active":
                print(f"🔄 Merestart {unit}...")
                subprocess.run(["systemctl", "restart", unit], check=False)
                print(f"✅ {unit} telah direstart.")
                break

    return 0


if __name__ == "__main__":
    sys.exit(main())
