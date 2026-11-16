# Gemini API Key per Mahasiswa

Panduan singkat penggunaan Google Gemini API di JupyterLab Lab AI UMPO.
Setiap mahasiswa memakai **API key AI Studio miliknya sendiri**. Key tidak
pernah disimpan di dalam notebook dan tidak dibagikan ke akun lain.

---

## 1. Buat API key

1. Buka <https://aistudio.google.com/apikey> (login akun Google).
2. Klik **Create API key**, pilih project, lalu salin key (`AIza...`).
3. Simpan key hanya di modal JupyterLab (langkah berikut), bukan di file notebook.

---

## 2. Simpan key lewat pop-up di JupyterLab

1. Login ke JupyterHub dan buka **Lab**.
2. Saat pertama kali membuka Lab, muncul modal **Gemini API Key**.
3. Tempel key → klik **Simpan & Uji**. Server akan menguji key ke Google:
   - **Valid** → key tersimpan, modal tertutup.
   - **Tidak valid** → pesan kesalahan ditampilkan, key tidak disimpan.
   - **Kuota habis (429)** → key tetap disimpan dengan status *limit*.
4. Tombol **Nanti** menutup modal untuk sesi browser ini. Modal akan muncul
   lagi pada sesi berikutnya sampai key diisi.

Modal juga bisa dibuka kapan saja lewat:

- tombol **Gemini API Key** di panel *Workstation Resource Monitor* (kanan bawah), atau
- klik pill telemetry → tombol **Gemini API Key**.

Di modal tersebut juga tampil **pemakaian token hari ini** (prompt, output,
jumlah request). Statistik direset setiap pergantian hari (WIB) dan saat key
diganti.

---

## 3. Pakai di notebook

```python
from lab_gemini import generate

resp = generate("Jelaskan overfitting dalam dua kalimat.")
print(resp.text)
```

Model default: `gemini-2.5-flash`. Untuk model lain:

```python
resp = generate("...", model="gemini-2.5-pro")
```

Butuh akses `client` mentah:

```python
import lab_gemini

gem = lab_gemini.client()
print(gem.models.list())
```

Statistik lokal:

```python
print(lab_gemini.usage_today())
```

---

## 4. Saat key kena limit

Gejala: `GeminiQuotaExceeded` atau error `429 RESOURCE_EXHAUSTED`.

1. Buat key baru di AI Studio (atau tunggu kuota harian pulih).
2. Buka modal **Gemini API Key** → tempel key baru → **Simpan & Uji**.
3. Jalankan ulang cell. Statistik token hari ini otomatis direset.

Status *limit* juga muncul sebagai chip merah **Gemini: limit** di panel
monitor, dan modal terbuka otomatis saat Lab dimuat.

---

## 5. Hapus key

Modal **Gemini API Key** → tombol **Hapus**. Key, profil, dan statistik harian
dihapus dari akun Anda.

---

## 6. Keamanan & privasi

| Aspek | Keterangan |
|---|---|
| Lokasi penyimpanan | `/home/<user>/.config/gemini/api_key` |
| Izin berkas | `0600` (hanya pemilik + root), direktori `0700` |
| Penulisan | atomik, menolak symlink (`O_NOFOLLOW`) |
| Notebook | key **tidak** pernah ditulis ke `.ipynb` |
| Log | key tidak dicatat; audit hanya 6 karakter awal + 4 akhir |
| Kuota | mengikuti akun Google masing-masing mahasiswa |

> Jangan menaruh key di variabel global server, `.bashrc`, atau membagikannya
> ke mahasiswa lain. Key adalah kredensial pribadi.

---

## 7. Catatan untuk Aslab/Admin

- Endpoint: `GET/POST/DELETE /api/gemini-key` (handler `GeminiKeyHandler`).
- Hanya melayani pemilik sesi JupyterHub; tidak ada akses lintas akun.
- Rate limit: 10 permintaan/menit per user.
- Audit: `GEMINI_KEY_SET`, `GEMINI_KEY_REMOVED`, `GEMINI_KEY_REJECTED`.
- Verifikasi manual di server:

```bash
sudo cat /home/<user>/.config/gemini/api_key | wc -c   # hanya root
sudo ls -l /home/<user>/.config/gemini/
```

- Helper `lab_gemini.py` dipasang otomatis oleh `deploy_simtik.sh` ke
  site-packages `/opt/ai_env`.
- Setelah upgrade JupyterLab, jalankan ulang `sudo python3 inject_jupyter_modal.py`
  agar modal tertanam kembali.
