# DESIGN.md: Panduan Merapikan UI dan Menghilangkan Tampilan "AI Slop"

Dokumen ini dipakai sebagai (1) checklist audit manual, dan (2) brief tetap untuk AI coding assistant (Claude, Cursor, Copilot) setiap kali mengubah tampilan. Letakkan di root repo dan referensikan di setiap prompt UI.

Stack acuan: Laravel + Blade, Tailwind CSS, Alpine.js. Prinsipnya berlaku di stack apa pun.

---

## 1. Peran dan Tujuan

Bertindak sebagai UI/UX designer sekaligus web developer senior. Tugasnya: membuat antarmuka yang **jelas, tenang, konsisten, dan spesifik untuk isi situsnya**, bukan antarmuka yang "kelihatan modern" secara generik.

Ukuran keberhasilan:
- Pengunjung paham situs ini untuk apa dan apa yang harus dilakukan dalam 5 detik.
- Tidak ada elemen yang bisa dihapus tanpa mengurangi fungsi atau pemahaman.
- Tampilan tidak bisa dengan mudah dikira hasil template atau hasil generate AI.

---

## 2. Ciri "AI Slop" yang Harus Dibuang

Periksa situs kamu terhadap daftar ini. Setiap poin yang cocok adalah kandidat perbaikan.

### Visual
- [ ] Gradient dekoratif (ungu-biru, pink-oranye) pada hero, tombol, atau teks.
- [ ] Semua konten dipecah jadi kartu identik: radius sama, shadow abu lembut sama, padding sama.
- [ ] Glassmorphism, blur, glow, dan blob dekoratif tanpa fungsi.
- [ ] Palet default: krem + serif + terracotta, atau hitam pekat + satu aksen neon.
- [ ] Ikon emoji sebagai pengganti ikon atau ilustrasi (🚀 ✨ 💡 🔥).
- [ ] Border-radius besar (`rounded-2xl`/`3xl`) di semua elemen tanpa hierarki.
- [ ] Hero berformat "angka besar + label kecil + 3 statistik + gradient".

### Tipografi
- [ ] Satu kata di judul diberi warna/italic/gradient berbeda.
- [ ] Label kecil HURUF KAPITAL ber-tracking lebar di atas setiap judul section.
- [ ] Penomoran 01 / 02 / 03 pada konten yang bukan urutan langkah.
- [ ] Font default tanpa pertimbangan (Inter/Poppins di mana-mana, semua bobot 600-700).
- [ ] Teks kecil bergaya monospace untuk label yang bukan data teknis.

### Layout dan motion
- [ ] Grid 3 kolom "fitur" yang sama persis di setiap section.
- [ ] Section dengan padding vertikal sama besar (`py-24`) berulang tanpa ritme.
- [ ] Animasi fade-in/slide-up di setiap section dan hover lift di setiap kartu.
- [ ] Semua teks rata tengah, termasuk paragraf panjang.

### Copy
- [ ] Kalimat generik: "Solusi terbaik untuk kebutuhan Anda", "Revolusi...", "Tingkatkan produktivitas...".
- [ ] Tombol berlabel "Submit", "Learn more", "Get started", atau berakhiran "→" di semua tempat.
- [ ] Teks placeholder (lorem ipsum, "Fitur 1", "Deskripsi singkat") yang lolos ke produksi.
- [ ] Pola "Kata — fragmen" dan string dipisah titik tengah ("A · B · C") sebagai hiasan.

---

## 3. Prinsip Desain

1. **Mulai dari isi, bukan dari template.** Tentukan dulu: situs ini tentang apa, siapa penggunanya, tugas utamanya apa. Warna, font, dan layout diambil dari dunia subjeknya.
2. **Satu hal yang memorable.** Pilih satu elemen (hero, tipografi, ilustrasi, interaksi) sebagai pusat karakter. Sisanya tenang dan disiplin.
3. **Hierarki lewat ukuran, bobot, dan jarak.** Bukan lewat warna-warni, border, dan shadow.
4. **Struktur visual harus membawa informasi.** Border, garis, nomor, dan label hanya dipakai bila mengodekan sesuatu yang nyata (urutan, kategori, status).
5. **Kurangi, lalu kurangi lagi.** Sebelum selesai, hapus satu elemen dekoratif.
6. **Konsisten.** Satu aksi punya satu nama di seluruh alur ("Simpan" → toast "Tersimpan").

---

## 4. Design Tokens

Tentukan token **sebelum** menyentuh komponen. Jangan memakai nilai di luar token.

### 4.1 Warna (maksimal 6 nilai inti)

| Peran | Aturan |
|---|---|
| Background | 1 warna dasar + 1 warna permukaan untuk area terpisah |
| Teks utama | Kontras minimal 7:1 terhadap background |
| Teks sekunder | Kontras minimal 4.5:1 |
| Garis/border | 1 warna, tipis, dipakai hemat |
| Aksen | **1 saja**, untuk aksi utama dan tautan |
| Status | Sukses/peringatan/error, hanya muncul saat dibutuhkan |

Aturan tambahan:
- Hindari hitam murni `#000` dan tinted near-black `#0B0B0B/#111` sebagai default. Pilih netral yang diturunkan dari warna aksen.
- Jangan pakai aksen di lebih dari satu peran sekaligus (tombol, ikon, judul, dan border sekaligus).
- Mode gelap hanya jika memang dibutuhkan, dan dirancang terpisah, bukan sekadar inversi.

### 4.2 Tipografi

- Maksimal **2 keluarga font**; bila dua, harus jelas berbeda peran (misal sans untuk UI, serif/display untuk judul).
- Skala tipe tetap (contoh rasio 1.25): `12 / 14 / 16 / 20 / 25 / 31 / 39`. Jangan keluar skala.
- Body 16px, `line-height` 1.6 (sans) atau 1.65 (serif).
- Panjang baris maksimal ±70 karakter (`max-w-prose` / `max-w-[65ch]`).
- Bobot: pakai 2-3 saja (400, 500, 700). Hindari semua teks tebal.
- Judul: sentence case. Kapital hanya jika memang singkatan.

### 4.3 Spasi dan layout

- Skala spasi basis 4px: `4 8 12 16 24 32 48 64 96`.
- Beri **ritme**: jarak antar section tidak seragam. Konten yang berhubungan didekatkan, yang tidak berhubungan dijauhkan.
- Pakai grid 12 kolom, tetapi tidak semua section harus simetris. Kolom asimetris (7/5, 8/4) sering lebih jelas dan lebih berkarakter daripada 3 kartu sejajar.
- Rata kiri sebagai default untuk teks. Rata tengah hanya untuk judul pendek atau CTA tunggal.

### 4.4 Radius, border, shadow

- Radius: 2 level saja (misal `4px` untuk kontrol, `12px` untuk permukaan besar). Bukan satu radius untuk semua.
- Shadow: hindari sebagai dekorasi. Pakai hanya untuk elemen yang benar-benar melayang (dropdown, modal).
- Pisahkan area dengan jarak dan perbedaan warna permukaan lebih dulu, baru border bila perlu.

### 4.5 Contoh implementasi (Tailwind v4, `resources/css/app.css`)

Isi nilai sesuai identitas situs, **jangan** menyalin contoh ini apa adanya.

```css
@import "tailwindcss";

@theme {
  /* Warna: turunkan dari subjek situs, bukan dari tren */
  --color-bg: #____;
  --color-surface: #____;
  --color-ink: #____;
  --color-ink-muted: #____;
  --color-line: #____;
  --color-accent: #____;

  /* Tipografi */
  --font-sans: "NamaFont", system-ui, sans-serif;
  --font-display: "NamaFontJudul", Georgia, serif;

  /* Radius: 2 level */
  --radius-control: 4px;
  --radius-surface: 12px;
}

@layer base {
  html { color-scheme: light; }
  body { @apply bg-bg text-ink font-sans leading-relaxed antialiased; }
  :focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
}
```

Untuk Tailwind v3, pindahkan token yang sama ke `theme.extend` di `tailwind.config.js`.

---

## 5. Aturan Komponen

**Tombol**
- Satu tombol primer per layar/section. Sisanya sekunder atau tautan.
- Label berupa kata kerja spesifik: "Simpan perubahan", "Kirim pesan", "Unduh laporan". Hindari "Submit".
- Tinggi minimal 40px (44px di mobile). Ada state hover, focus, disabled, dan loading.

**Form**
- Label selalu terlihat di atas input (bukan hanya placeholder).
- Pesan error menjelaskan masalah dan cara memperbaikinya, tanpa permintaan maaf dan tanpa kalimat samar.
- Validasi muncul dekat field, tidak hanya sebagai toast.

**Kartu**
- Pakai hanya bila item memang berdiri sendiri dan bisa dibandingkan. Daftar, tabel, atau baris sederhana sering lebih bersih.
- Jangan menaruh kartu di dalam kartu.

**Navigasi**
- Maksimal 5-7 item. Tandai halaman aktif dengan jelas.
- Di mobile, pastikan semua aksi utama tetap terjangkau satu tangan.

**Tabel dan data**
- Rata kanan untuk angka, rata kiri untuk teks. Header jelas. Zebra stripe hanya bila baris panjang.

**State kosong dan error**
- Kosong = ajakan bertindak ("Belum ada artikel. Buat artikel pertama"). Bukan ilustrasi lucu tanpa arah.

**Ikon**
- Satu set ikon konsisten (misal Lucide/Heroicons), satu ukuran dan ketebalan garis. Tanpa emoji.

---

## 6. Motion

- Nol animasi otomatis kecuali satu momen terarah (misal satu urutan saat halaman pertama dimuat).
- Animasi yang menjawab aksi pengguna (buka dropdown, expand, konfirmasi) diperbolehkan: 150-250ms, easing sederhana.
- Wajib menghormati `prefers-reduced-motion`.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

Alpine.js: gunakan `x-transition` hanya untuk elemen interaktif (dropdown, modal, accordion), bukan untuk menghias section.

---

## 7. Copywriting

- Tulis dari sudut pandang pengguna, dengan bahasa yang mereka pakai. Bukan istilah teknis internal.
- Jelaskan apa yang sesuatu **lakukan**, bukan menjualnya. Spesifik mengalahkan pintar.
- Kalimat aktif, sentence case, tanpa kata pengisi.
- Satu elemen teks = satu tugas.
- Ganti semua placeholder dengan isi nyata sebelum rilis.

| Hindari | Gunakan |
|---|---|
| "Solusi terbaik untuk kebutuhan Anda" | Kalimat yang menyebut apa yang bisa dilakukan pengguna |
| "Get started →" | "Buat akun" |
| "Terjadi kesalahan." | "Email sudah terdaftar. Masuk atau gunakan email lain." |
| "Submit" | "Kirim pesan" |

---

## 8. Aksesibilitas dan Responsivitas (batas bawah wajib)

- [ ] Kontras teks memenuhi WCAG AA (4.5:1 teks biasa, 3:1 teks besar).
- [ ] Fokus keyboard selalu terlihat; semua aksi bisa dicapai dengan Tab.
- [ ] Target sentuh minimal 44x44px.
- [ ] Gambar punya `alt` bermakna (atau `alt=""` bila dekoratif).
- [ ] Heading berurutan (satu `h1`, lalu `h2`, `h3`), bukan dipilih berdasarkan ukuran.
- [ ] Teruji di lebar 360px, 768px, 1280px; tidak ada scroll horizontal.
- [ ] Warna bukan satu-satunya penanda status.
- [ ] Gunakan elemen semantik (`button`, `nav`, `main`, `label`) sebelum `div` + role.

---

## 9. Alur Kerja Perbaikan

Kerjakan berurutan. Jangan lompat ke polesan visual sebelum langkah 1-3 selesai.

1. **Audit.** Screenshot semua halaman utama (desktop + mobile). Centang daftar di bagian 2. Catat 5 masalah terbesar.
2. **Tentukan brief satu paragraf.** Situs untuk siapa, tugas utamanya apa, kesan yang diinginkan (3 kata sifat), apa elemen yang akan jadi pusat karakter.
3. **Tetapkan token** (bagian 4) dan tulis ke `app.css`/`tailwind.config.js`.
4. **Bersihkan struktur dulu:** hierarki heading, jarak, grid, dan urutan konten. Belum perlu dekorasi.
5. **Ganti copy generik** dengan isi spesifik (bagian 7).
6. **Rapikan komponen** satu per satu sesuai bagian 5: tombol → form → navigasi → kartu → footer.
7. **Hapus.** Buang gradient, shadow, animasi, ikon, dan border yang tidak membawa informasi.
8. **Uji** responsif dan aksesibilitas (bagian 8). Jalankan Lighthouse; target Accessibility ≥ 95.
9. **Kritik diri.** Bandingkan sebelum/sesudah. Jika masih terasa seperti template, ulangi dari langkah 2 untuk bagian yang mengambang.

---

## 10. Prompt Siap Pakai untuk AI Coding Assistant

Salin dan sesuaikan bagian dalam `[...]`.

```text
Bertindaklah sebagai UI/UX designer dan web developer senior. Baca DESIGN.md di
root repo dan patuhi seluruhnya.

Konteks situs: [tentang apa, siapa penggunanya, tugas utama pengguna]
Kesan yang diinginkan: [3 kata sifat]
Stack: Laravel Blade, Tailwind CSS, Alpine.js.

Tugas: rapikan [halaman/komponen] agar bersih dan tidak terlihat seperti hasil
generate AI.

Aturan:
1. Gunakan hanya token di app.css. Jangan menambah warna, font, atau radius baru.
2. Jangan gunakan gradient dekoratif, emoji, glassmorphism, label kapital di atas
   judul, penomoran 01/02/03 untuk konten non-urutan, atau animasi fade-in pada
   setiap section.
3. Jangan ubah isi grid 3 kartu menjadi pola yang sama; pilih layout sesuai isi.
4. Ganti semua copy generik dengan kalimat spesifik. Tombol berupa kata kerja.
5. Jaga logika backend, route, dan nama class/ID yang dipakai JavaScript.
6. Pastikan responsif (360/768/1280), fokus keyboard terlihat, kontras AA.

Sebelum menulis kode: tulis rencana singkat (palet, font, layout, alasan) dan
periksa apakah ada bagian yang terasa generik; revisi bila ada. Lalu tulis kode
lengkap yang siap dipakai, dan di akhir sebutkan satu elemen yang kamu hapus
dan alasannya.
```

---

## 11. Checklist Sebelum Rilis

- [ ] Hanya ada satu aksen warna dan satu tombol primer per section.
- [ ] Tidak ada gradient, glow, atau emoji dekoratif.
- [ ] Maksimal 2 font, skala tipe dipatuhi, panjang baris ≤ 70 karakter.
- [ ] Radius hanya 2 level; shadow hanya pada elemen melayang.
- [ ] Tidak ada placeholder atau copy generik tersisa.
- [ ] Motion terbatas dan menghormati `prefers-reduced-motion`.
- [ ] Lolos cek aksesibilitas (bagian 8).
- [ ] Setiap elemen dekoratif yang tersisa bisa dijelaskan fungsinya.
- [ ] Orang yang belum pernah melihat situs ini paham tujuannya dalam 5 detik.
