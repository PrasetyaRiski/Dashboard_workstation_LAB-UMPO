# MOTION.md: Efek 3D dan Motion (referensi Strix) untuk Laravel + Tailwind + Alpine

Pendamping `DESIGN.md`. Jika ada konflik, aturan `DESIGN.md` (bersih, tidak ramai) menang. Motion di sini dipakai untuk **menjelaskan dan memberi umpan balik**, bukan untuk menghias.

---

## 1. Tujuan dan Batas

- Referensi: halaman strix.ai. Dari strukturnya, situs itu bercerita lewat **mockup produk** (tabel hasil pentest, komentar PR dengan diff, detail issue dengan tab Fix/Reproduction), bukan lewat dekorasi. Itu yang ditiru: motion menyorot isi produk.
- Yang **tidak** ditiru: logo, teks, aset, dan kode milik Strix. Ambil pola (durasi, easing, urutan reveal), bukan salinan.
- Anggaran motion per halaman: **1 momen 3D utama + maksimal 3 motion fungsional**. Selebihnya diam.

| Jenis | Boleh | Contoh |
|---|---|---|
| Momen 3D utama (1x) | Ya | Hero: panel mockup miring yang meluruskan diri saat scroll, atau scene 3D server/GPU |
| Motion fungsional | Ya | Bar RAM/GPU bergerak saat data berubah, highlight sel yang baru berubah, tab/accordion terbuka |
| Reveal per section | Tidak | Fade-slide-up di setiap section |
| Hover lift di semua kartu | Tidak | |
| Partikel, blob, glow berputar | Tidak | |

Untuk **dashboard monitoring** (bukan landing page), 3D cukup sebagai satu panel ringkasan di bagian atas. Area tabel dan data tidak diberi efek 3D.

---

## 2. Alur Kerja dengan Skill UI dan Context7

### 2.1 Skill UI: ekstrak pola motion dari situs referensi

Skill UI (`skillui`) membaca sebuah situs lalu menghasilkan folder berisi token desain dan, pada mode `ultra`, spesifikasi animasi, interaksi hover/focus, dan screenshot per posisi scroll. Berjalan lokal, tanpa API key.

```bash
npm install -g skillui
npm install playwright && npx playwright install chromium   # hanya untuk mode ultra

# Jalankan di FOLDER TERPISAH, bukan di dalam repo proyek
mkdir -p ~/design-refs && cd ~/design-refs
skillui --url https://www.strix.ai --mode ultra --screens 6 --name strix-ref
```

Hasil yang dipakai:
- `references/ANIMATIONS.md`: keyframe, durasi, easing yang terdeteksi.
- `references/INTERACTIONS.md`: perubahan state saat hover/focus.
- `screens/scroll/`: 7 screenshot urutan scroll sebagai acuan visual.

Aturan pakai:
1. Folder output membawa `CLAUDE.md` dan `SKILL.md` sendiri. Jangan taruh langsung di repo proyek karena bisa menimpa konteks proyekmu. Salin hanya `ANIMATIONS.md` dan `INTERACTIONS.md` ke `docs/motion-ref/`.
2. Baca hasilnya dan **ringkas jadi token** (bagian 3). Jangan menyalin keyframe mentah.
3. Pustaka animasi yang terdeteksi di situs referensi belum tentu cocok untuk proyekmu. Pilih sendiri (bagian 4).

### 2.2 Context7: dokumentasi pustaka yang terbaru untuk AI

Context7 memasukkan dokumentasi dan contoh kode versi terbaru ke prompt, sehingga AI tidak mengarang API GSAP/Three.js/Tailwind yang sudah berubah.

```bash
npx ctx7 setup            # pilih mode CLI + Skills atau MCP; tambah --claude untuk Claude Code
```

Cara pakai di prompt:
```text
Buat ScrollTrigger yang meluruskan panel hero saat scroll. use context7
Pasang Tailwind v4 @theme untuk token motion. use library /tailwindlabs/tailwindcss
```

Cari ID pustaka lewat `ctx7 library gsap "scrolltrigger"` dan `ctx7 library three "WebGLRenderer"`. Jangan menebak ID.

Tambahkan aturan permanen di `CLAUDE.md` proyek:
```text
Gunakan Context7 untuk dokumentasi pustaka (GSAP, Three.js, Tailwind, Alpine, Laravel Vite) sebelum menulis kode yang memanggil API-nya.
```

---

## 3. Token Motion

Definisikan sekali, pakai di mana-mana. Nilai berikut titik awal; sesuaikan setelah membaca `ANIMATIONS.md` hasil ekstraksi.

```css
/* resources/css/app.css */
@theme {
  --ease-out-soft: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-in-out-soft: cubic-bezier(0.65, 0, 0.35, 1);

  --duration-fast: 150ms;     /* hover, press */
  --duration-base: 250ms;     /* tab, accordion, dropdown */
  --duration-slow: 600ms;     /* bar data, reveal hero */
}
```

Aturan:
- Hanya animasikan `transform` dan `opacity` (plus `width` pada bar data yang kecil). Jangan `top/left/height/box-shadow` pada elemen besar.
- Jarak gerak kecil: 8-24px untuk translate, maksimal 6-8° untuk tilt, 18° untuk reveal hero.
- Satu easing keluar (`out-soft`) untuk hampir semua gerak masuk.
- Urutan (stagger) maksimal 60ms antar item dan maksimal 6 item.

---

## 4. Pilihan Teknologi

| Kebutuhan | Pakai | Alasan |
|---|---|---|
| Tilt/parallax kartu, flip, tab | CSS 3D transform + Alpine | Tanpa dependensi tambahan |
| Scroll-driven (panel hero meluruskan diri, pin) | GSAP + ScrollTrigger | Kontrol scrub dan matchMedia |
| Scene 3D sungguhan (server/GPU) | Three.js | Hanya jika benar-benar dipakai; lazy-load |
| Transisi antar halaman | Hindari dulu | Rawan konflik dengan Livewire/Turbo |

Pasang lewat npm (Vite), bukan CDN:
```bash
npm install gsap
npm install three        # hanya jika memakai scene 3D
```
Impor secara dinamis agar tidak membebani halaman lain:
```js
// resources/js/app.js
if (document.querySelector('[data-hero-panel]')) {
  import('./motion/hero').then(m => m.initHero());
}
if (document.querySelector('[data-lab-scene]')) {
  import('./motion/lab-scene').then(m => m.registerLabScene());
}
```

---

## 5. Momen 3D Utama: pilih salah satu

### Opsi A (ringan): Panel mockup yang meluruskan diri saat scroll

Gaya Strix: panel produk tampil miring dan meluruskan diri saat masuk viewport. Cocok untuk landing/halaman beranda.

```html
<div class="[perspective:1200px]">
  <section data-hero-panel class="rounded-[var(--radius-surface)] border border-line bg-surface">
    <!-- isi panel: ringkasan status + tabel alokasi asli, bukan gambar -->
  </section>
</div>
```

```js
// resources/js/motion/hero.js
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initHero() {
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.fromTo(
      '[data-hero-panel]',
      { rotateX: 18, y: 40, opacity: 0.6, transformOrigin: '50% 100%' },
      {
        rotateX: 0, y: 0, opacity: 1, ease: 'none',
        scrollTrigger: {
          trigger: '[data-hero-panel]',
          start: 'top 85%',
          end: 'top 35%',
          scrub: true,
        },
      }
    );
  });

  return () => mm.revert();
}
```

### Opsi B (khas Lab AI): Scene 3D isometrik server dan GPU

Konten adalah subjeknya: dua GPU RTX 5060 Ti, slice `user-1021` dan `compute-level2`. Tiap GPU berupa balok; intensitas cahaya tepi mengikuti utilisasi dari data live. Sesuatu yang tidak bisa dikira template.

```js
// resources/js/motion/lab-scene.js
import * as THREE from 'three';

export function mountLabScene(canvas, getUtilization = () => [0.3, 0.6]) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(6, 5, 8);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(4, 8, 6);
  scene.add(key);

  const group = new THREE.Group();
  scene.add(group);

  // Dua GPU; warna diambil dari token CSS agar konsisten dengan UI
  const accent = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-accent').trim() || '#4f8cff';

  const gpus = [-1.5, 1.5].map((x) => {
    const material = new THREE.MeshStandardMaterial({
      color: 0x2a2f3a, roughness: 0.5, metalness: 0.3,
      emissive: new THREE.Color(accent), emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 1.2), material);
    mesh.position.x = x;
    group.add(mesh);
    return mesh;
  });

  let raf = 0;
  let visible = true;

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
  io.observe(canvas);

  const clock = new THREE.Clock();
  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (!visible || document.hidden) return;

    const t = clock.getElapsedTime();
    group.rotation.y = Math.sin(t * 0.2) * 0.35;

    const util = getUtilization();
    gpus.forEach((g, i) => {
      const target = (util[i] ?? 0) * 0.8;
      g.material.emissiveIntensity += (target - g.material.emissiveIntensity) * 0.05;
    });

    renderer.render(scene, camera);
  };
  tick();

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    scene.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
    renderer.dispose();
  };
}

export function registerLabScene() {
  window.Alpine.data('labScene', () => ({
    off: null,
    init() { this.off = mountLabScene(this.$refs.canvas); },
    destroy() { this.off?.(); },
  }));
}
```

```html
<div x-data="labScene" data-lab-scene class="h-64 w-full">
  <canvas x-ref="canvas" class="h-full w-full" aria-hidden="true"></canvas>
</div>
<!-- Info penting tetap ada sebagai teks/tabel HTML di sampingnya -->
```

Catatan:
- Pastikan `registerLabScene()` dipanggil **sebelum** `Alpine.start()`, atau gunakan event `alpine:init`.
- Verifikasi sintaks `Alpine.data`, `destroy()`, dan API Three.js terbaru lewat Context7 sebelum dipakai.
- Hubungkan `getUtilization` ke data yang sudah ada di panel (polling/Livewire/fetch). Jangan membuat sumber data baru untuk animasi.
- Sediakan fallback jika WebGL tidak tersedia: tampilkan gambar statis atau tabel saja.

---

## 6. Motion Fungsional (maksimal 3)

### 6.1 Bar penggunaan yang bergerak halus
```html
<div class="h-2 rounded bg-line">
  <div class="h-2 rounded bg-accent transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out-soft)]"
       :style="`width: ${percent}%`"></div>
</div>
```
Ubah warna ke kuning/merah hanya saat melewati ambang (mis. >80%), supaya warna membawa arti.

### 6.2 Sorot sel yang baru berubah
```css
@keyframes data-flash {
  from { background-color: color-mix(in oklab, var(--color-accent) 18%, transparent); }
  to   { background-color: transparent; }
}
.is-updated { animation: data-flash 900ms var(--ease-out-soft); }
```
Tambahkan class `is-updated` saat nilai berubah dan lepas setelah animasi selesai.

### 6.3 Tilt panel ringkasan (opsional, hanya perangkat dengan pointer halus)
```js
// resources/js/motion/tilt.js
export function registerTilt(Alpine) {
  Alpine.data('tilt', () => ({
    max: 6,
    move(e) {
      if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const r = this.$el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      this.$refs.inner.style.transform = `rotateY(${x * this.max}deg) rotateX(${-y * this.max}deg)`;
    },
    reset() { this.$refs.inner.style.transform = ''; },
  }));
}
```
```html
<div x-data="tilt" @pointermove="move($event)" @pointerleave="reset()" class="[perspective:1000px]">
  <div x-ref="inner" class="transition-transform duration-150 ease-out [transform-style:preserve-3d]">
    ...
  </div>
</div>
```
Pakai di **satu** panel saja, bukan semua kartu.

---

## 7. Performa dan Aksesibilitas (wajib)

- [ ] Hormati `prefers-reduced-motion`: matikan tilt, scrub, dan rotasi 3D; tampilkan kondisi akhir statis.
- [ ] Three.js: batasi `devicePixelRatio` (maks 1.5), hentikan render saat di luar layar atau tab tersembunyi, panggil `dispose()` saat elemen dilepas.
- [ ] Muat GSAP/Three.js secara dinamis hanya di halaman yang membutuhkan.
- [ ] Canvas diberi `aria-hidden="true"`; semua informasi penting tersedia sebagai teks/tabel.
- [ ] Tidak ada animasi otomatis yang berulang tanpa henti selain scene 3D yang pelan dan bisa dijeda.
- [ ] Uji di laptop tanpa GPU dedikasi dan di HP: target 60 fps di panel, tidak ada layout shift (CLS ≈ 0).
- [ ] Jalankan Lighthouse Performance dan Accessibility sebelum dan sesudah; tidak boleh turun.
- [ ] Jika menggunakan Livewire `wire:navigate`/Turbo, inisialisasi ulang dan bersihkan animasi pada setiap navigasi.

---

## 8. Prompt Siap Pakai (Claude Code)

```text
Baca DESIGN.md dan MOTION.md di root repo, serta docs/motion-ref/ANIMATIONS.md
(hasil skillui dari referensi). Gunakan Context7 untuk dokumentasi GSAP, Three.js,
Alpine, dan Tailwind sebelum menulis kode.

Konteks: [halaman/komponen yang dikerjakan]. Stack: Laravel Blade, Tailwind v4,
Alpine.js, Vite.

Tugas: tambahkan [Opsi A / Opsi B] dari MOTION.md pada [lokasi].

Aturan:
1. Gunakan token motion di app.css; jangan menambah durasi/easing baru.
2. Maksimal 1 momen 3D + 3 motion fungsional di halaman ini.
3. Impor GSAP/Three.js secara dinamis; sediakan cleanup (destroy/dispose).
4. Hormati prefers-reduced-motion dan sediakan fallback tanpa WebGL.
5. Jangan mengubah route, controller, dan logika backend.
6. Jangan menyalin aset, teks, atau kode dari situs referensi.

Sebelum menulis kode: tulis rencana singkat (efek, pemicu, durasi, fallback) dan
sebutkan efek mana yang kamu BUANG agar halaman tetap tenang. Lalu tulis kode
lengkap yang siap dipakai.
```

---

## 9. Checklist Sebelum Rilis

- [ ] Hanya 1 momen 3D dan ≤ 3 motion fungsional di halaman.
- [ ] Setiap animasi menjawab pertanyaan "apa yang ingin ditunjukkan?".
- [ ] Hanya `transform`/`opacity` yang dianimasikan pada elemen besar.
- [ ] Reduced motion dan fallback WebGL diuji.
- [ ] Tidak ada aset atau kode salinan dari situs referensi.
- [ ] Performa dan aksesibilitas Lighthouse tidak turun.
- [ ] Halaman terasa lebih jelas, bukan lebih ramai.
