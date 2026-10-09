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

def is_valid_name(candidate: str) -> bool:
    """Memvalidasi apakah string merupakan nama orang yang masuk akal"""
    if not candidate:
        return False
    clean = re.sub(r"<[^>]+>", "", candidate).strip("!.,-:;'\" \r\n\t")
    if len(clean) < 3 or len(clean) > 60:
        return False
    low = clean.lower()
    blacklisted = [
        "mahasiswa", "mahasiswa baru", "sistem", "admin", "berhasil", "login",
        "user", "guest", "undefined", "null", "portal", "simtik", "umpo",
        "ponorogo", "muhammadiyah", "selamat datang", "proses", "menunggu",
        "dashboard", "halaman", "tutup", "ok", "error", "gagal", "beranda"
    ]
    for b in blacklisted:
        if low == b or b in low.split():
            return False
    # Harus ada karakter huruf alfabet
    if not re.search(r"[A-Za-z]", clean):
        return False
    return True


def extract_student_name(resp_text: str, session: requests.Session = None, timeout: int = 5) -> str:
    """
    Mengekstrak nama lengkap mahasiswa dari respon SweetAlert login atau
    dari halaman profil/dashboard SIMTIK UMPO.
    """
    nama = ""

    # 1. Coba ekstrak dari teks respon login (SweetAlert / JSON / HTML)
    if resp_text:
        # Pola SweetAlert: text: 'Selamat Datang, [NAMA]!' atau title: 'Selamat Datang, [NAMA]'
        swal_match = re.search(r"(?:text|title):\s*['\"][^'\"]*Selamat\s+Datang[,\s]+([^!'\"<>\r\n]+)", resp_text, re.IGNORECASE)
        if swal_match and is_valid_name(swal_match.group(1)):
            nama = swal_match.group(1).strip("!.,-:;'\" ")

        # Pola SweetAlert umum: Halo / Hai [NAMA]
        if not nama:
            halo_match = re.search(r"(?:text|title):\s*['\"][^'\"]*(?:Halo|Hai)[,\s]+([^!'\"<>\r\n]+)", resp_text, re.IGNORECASE)
            if halo_match and is_valid_name(halo_match.group(1)):
                nama = halo_match.group(1).strip("!.,-:;'\" ")

        # Pola greeting umum di HTML
        if not nama:
            greet_match = re.search(r"Selamat\s+Datang[,\s]+(?:<b>|<strong>)?([A-Za-z\s.,'\-]+)(?:</b>|</strong>)?", resp_text, re.IGNORECASE)
            if greet_match and is_valid_name(greet_match.group(1)):
                nama = greet_match.group(1).strip("!.,-:;'\" ")

    # 2. Jika nama belum ditemukan dan session aktif tersedia, coba akses halaman dashboard portal SIMTIK
    if not nama and session:
        try:
            # Akses halaman apps/ atau apps/index.php dengan session cookie PHPSESSID yang sudah login
            dash_resp = session.get(f"{SIMTIK_BASE_URL}/apps/", verify=False, timeout=timeout, allow_redirects=True)
            if dash_resp.status_code == 200:
                dash_html = dash_resp.text

                # Cek greeting di dashboard
                m = re.search(r"Selamat\s+Datang[,\s]+(?:<b>|<strong>)?([A-Za-z\s.,'\-]+)(?:</b>|</strong>)?", dash_html, re.IGNORECASE)
                if m and is_valid_name(m.group(1)):
                    nama = m.group(1).strip("!.,-:;'\" ")

                # Cek elemen profil di header / navbar / sidebar
                # Contoh: <span class="user-name">Nama Mahasiswa</span> atau <span class="hidden-xs">Nama Mahasiswa</span>
                if not nama:
                    user_tag_match = re.search(r"class=[\"'][^\"']*(?:user-name|profile-name|user_name|hidden-xs|username)[^\"']*[\"'][^>]*>\s*([A-Za-z\s.,'\-]+)\s*<", dash_html, re.IGNORECASE)
                    if user_tag_match and is_valid_name(user_tag_match.group(1)):
                        nama = user_tag_match.group(1).strip("!.,-:;'\" ")

                # Cek elemen profil dalam panel pengguna (AdminLTE / Tailwind template)
                if not nama:
                    panel_match = re.search(r"class=[\"'][^\"']*(?:user-panel|profile-details|user-info)[^\"']*[\"'][^>]*>[\s\S]*?<[p|span|b][^>]*>\s*([A-Za-z\s.,'\-]+)\s*<\/[p|span|b]>", dash_html, re.IGNORECASE)
                    if panel_match and is_valid_name(panel_match.group(1)):
                        nama = panel_match.group(1).strip("!.,-:;'\" ")

                # Cek tabel profil mahasiswa jika ada kolom "Nama" / "Nama Mahasiswa"
                if not nama:
                    table_match = re.search(r"(?:Nama|Nama Mahasiswa)\s*<\/td>\s*<td[^>]*>:?<\/td>\s*<td[^>]*>\s*([A-Za-z\s.,'\-]+)\s*<\/td>", dash_html, re.IGNORECASE)
                    if table_match and is_valid_name(table_match.group(1)):
                        nama = table_match.group(1).strip("!.,-:;'\" ")

                # Cek heading h3-h6 dengan class user/profile
                if not nama:
                    h_match = re.search(r"<h[3-6][^>]*class=[\"'][^\"']*(?:name|profile|user)[^\"']*[\"'][^>]*>\s*([A-Za-z\s.,'\-]+)\s*<\/h[3-6]>", dash_html, re.IGNORECASE)
                    if h_match and is_valid_name(h_match.group(1)):
                        nama = h_match.group(1).strip("!.,-:;'\" ")
        except Exception as e:
            logger.debug(f"Pengecekan profil dashboard SIMTIK gagal/timeout: {e}")

    # 3. Sanitasi akhir
    if nama:
        nama = re.sub(r"<[^>]+>", "", nama).strip("!.,-:;'\" ")
        if is_valid_name(nama):
            if nama.isupper() or nama.islower():
                nama = nama.title()
        else:
            nama = ""

    return nama


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
            # Ekstrak nama asli mahasiswa dari SIMTIK
            extracted_name = extract_student_name(resp_text, session=session, timeout=timeout)
            if extracted_name:
                logger.info(f"[SIMTIK AUTH] Login sukses NIM {nim} - Nama terdeteksi: '{extracted_name}'")
                final_nama = extracted_name
            else:
                logger.info(f"[SIMTIK AUTH] Login sukses NIM {nim} - Nama tidak terdeteksi di respon SIMTIK, fallback: 'Mahasiswa {nim}'")
                final_nama = f"Mahasiswa {nim}"

            user_data = {
                "nim": nim,
                "nama": final_nama,
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
