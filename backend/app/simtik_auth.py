"""
Modul Otentikasi SIMTIK UMPO (Reverse Login)
Menghubungkan otentikasi login mahasiswa langsung ke portal SIMTIK UMPO
https://simtik.umpo.ac.id/apps/action/login.user.php
"""

import logging
import re
import urllib3
import requests

# Disable insecure request warnings for internal university SSL if needed
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger("simtik_auth")
logging.basicConfig(level=logging.INFO)

SIMTIK_BASE_URL = "https://simtik.umpo.ac.id"
SIMTIK_LOGIN_ACTION = "https://simtik.umpo.ac.id/apps/action/login.user.php"

def verify_simtik_credentials(nim: str, password: str, timeout: int = 10) -> tuple[bool, str, dict]:
    """
    Memverifikasi kredensial mahasiswa ke portal SIMTIK UMPO.
    Returns:
        (is_valid: bool, message: str, user_data: dict)
    """
    nim = str(nim).strip()
    if not nim or not password:
        return False, "NIM dan Password tidak boleh kosong.", {}

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Referer": SIMTIK_BASE_URL + "/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
    })

    try:
        # Langkah 1: Handshake awal untuk mendapatkan Nginx challenge cookies
        session.get(SIMTIK_BASE_URL + "/", verify=False, timeout=timeout)
        session.get(SIMTIK_BASE_URL + "/", verify=False, timeout=timeout)

        # Langkah 2: Kirim kredensial ke endpoint login SIMTIK
        payload = {
            "userid": nim,
            "passwd": password,
            "level": "mhs",
            "lokasi_gps": "",
            "lat_long": ""
        }

        resp = session.post(
            SIMTIK_LOGIN_ACTION,
            data=payload,
            verify=False,
            timeout=timeout,
            allow_redirects=False
        )

        resp_text = resp.text

        # Langkah 3: Evaluasi respon dari SIMTIK
        # Kasus A: Login Gagal (SweetAlert error atau teks error)
        if "Login Gagal" in resp_text or "User tidak ditemukan" in resp_text or "Password salah" in resp_text or "icon: 'error'" in resp_text:
            # Ekstrak pesan kesalahan spesifik jika ada
            err_match = re.search(r"text:\s*['\"]([^'\"]+)['\"]", resp_text)
            err_msg = err_match.group(1) if err_match else "NIM atau Password SIMTIK salah."
            return False, err_msg, {}

        # Kasus B: Login Sukses
        # Biasanya ditandai dengan redirect 302, icon: 'success', atau set session cookie aktif
        is_success = False
        if resp.status_code in [301, 302, 303]:
            is_success = True
        elif "Login Berhasil" in resp_text or "icon: 'success'" in resp_text or "window.location" in resp_text:
            is_success = True
        elif resp.status_code == 200 and "PHPSESSID" in session.cookies:
            # Cek jika tidak ada indikator error sama sekali
            if "Swal.fire" in resp_text and "error" not in resp_text:
                is_success = True

        if is_success:
            user_data = {
                "nim": nim,
                "nama": f"Mahasiswa {nim}", # Default placeholder jika nama tidak diparsing
                "level": "mhs"
            }
            return True, "Otentikasi SIMTIK Berhasil", user_data

        return False, "Gagal memverifikasi akun ke SIMTIK.", {}

    except requests.exceptions.Timeout:
        logger.error(f"Timeout saat menghubungi SIMTIK UMPO untuk NIM {nim}")
        return False, "Koneksi ke server SIMTIK UMPO timeout. Silakan coba beberapa saat lagi.", {}
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error saat menghubungi SIMTIK UMPO: {e}")
        return False, f"Terjadi kesalahan jaringan ke SIMTIK UMPO: {str(e)}", {}
    except Exception as e:
        logger.error(f"Internal error di verifikasi SIMTIK: {e}")
        return False, f"Kesalahan internal sistem otentikasi: {str(e)}", {}


if __name__ == "__main__":
    # Test lokal cepat
    print("Testing SIMTIK Auth Module...")
    valid, msg, data = verify_simtik_credentials("99999999", "wrongpwd")
    print(f"Hasil Tes Dummy: valid={valid}, pesan='{msg}'")
