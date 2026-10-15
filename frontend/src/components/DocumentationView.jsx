import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Cpu, 
  HardDrive, 
  Zap, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink,
  Users,
  FolderOpen,
  Layers,
  FileCode2,
  Lock,
  RefreshCw,
  Clock,
  Sparkles,
  Info,
  CheckCircle2,
  ShieldCheck,
  Download,
  Upload,
  DatabaseBackup,
  Search,
  Printer,
  Terminal,
  X
} from 'lucide-react';

const PYTHON_SNIPPETS = [
  {
    id: 'pytorch-gpu',
    title: 'Verifikasi GPU PyTorch & Info Hardware',
    category: 'PyTorch',
    desc: 'Memeriksa ketersediaan akselerasi CUDA, nama perangkat GPU, serta alokasi memori tensor awal.',
    code: `import torch

print(f"PyTorch Version : {torch.__version__}")
print(f"CUDA Available  : {torch.cuda.is_available()}")

if torch.cuda.is_available():
    device_id = torch.cuda.current_device()
    print(f"Device Count    : {torch.cuda.device_count()}")
    print(f"Active Device   : {device_id} ({torch.cuda.get_device_name(device_id)})")
    
    # Inisialisasi tensor uji coba di VRAM
    x = torch.randn(1000, 1000, device="cuda")
    print("Status          : Sukses mengalokasikan tensor pada GPU!")
else:
    print("PERINGATAN: CUDA tidak terdeteksi, komputasi berjalan di CPU.")`
  },
  {
    id: 'shared-dataset',
    title: 'Akses Direktori Dataset Bersama (dataset_shared)',
    category: 'Penyimpanan',
    desc: 'Membaca berkas dataset publik atau materi kuliah tanpa memakan kuota penyimpanan pribadi.',
    code: `import os
from pathlib import Path

# Path folder bersama yang terhubung langsung di direktori home
shared_dir = Path.home() / "dataset_shared"

print(f"Direktori Bersama: {shared_dir}")
if shared_dir.exists():
    items = list(shared_dir.glob("*"))
    print(f"Total Berkas Ditemukan: {len(items)}")
    for f in items[:10]:
        size_mb = f.stat().st_size / (1024 * 1024)
        print(f" - {f.name} ({size_mb:.2f} MB)")
else:
    print("Folder dataset_shared belum terpasang atau sedang dimuat.")`
  },
  {
    id: 'vram-cleanup',
    title: 'Pembersihan Memori GPU / Cache VRAM (Anti-OOM)',
    category: 'Optimasi',
    desc: 'Membebaskan alokasi VRAM yang tertahan setelah pelatihan model atau sebelum memulai eksperimen baru.',
    code: `import gc
import torch

# Jalankan garbage collector Python
gc.collect()

# Kosongkan cache memori tidak terpakai di GPU CUDA
if torch.cuda.is_available():
    torch.cuda.empty_cache()
    torch.cuda.ipc_collect()
    
    allocated = torch.cuda.memory_allocated() / (1024 ** 2)
    reserved = torch.cuda.memory_reserved() / (1024 ** 2)
    print(f"VRAM Allocated : {allocated:.1f} MB")
    print(f"VRAM Reserved  : {reserved:.1f} MB")
    print("Cache VRAM berhasil dibebaskan kembali ke sistem!")`
  },
  {
    id: 'tf-gpu',
    title: 'Deteksi Perangkat GPU di TensorFlow',
    category: 'TensorFlow',
    desc: 'Memastikan runtime TensorFlow mendeteksi GPU dan mengaktifkan dynamic memory growth.',
    code: `import tensorflow as tf

print(f"TensorFlow Version: {tf.__version__}")
gpus = tf.config.list_physical_devices('GPU')

print(f"Jumlah GPU Terdeteksi: {len(gpus)}")
for gpu in gpus:
    print(f" - Perangkat: {gpu.name}")
    # Izinkan pemakaian memori dinamis sesuai kebutuhan
    try:
        tf.config.experimental.set_memory_growth(gpu, True)
        print("   Memory growth diatur ke True")
    except RuntimeError as e:
        print(f"   Konfigurasi gagal: {e}")`
  }
];

export default function DocumentationView({ showToast }) {
  const [activeSection, setActiveSection] = useState('all');
  const [copiedCode, setCopiedCode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    if (showToast) showToast('Kode berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const dynamicJupyterUrl = typeof window !== 'undefined'
    ? `http://${window.location.hostname}:8090`
    : 'http://76.76.76.188:8090';

  const sections = [
    { id: 'all', label: 'Semua Panduan' },
    { id: 'snippets', label: 'Python Cheat-Sheet' },
    { id: 'mahasiswa', label: 'Panduan JupyterHub' },
    { id: 'dashboard', label: 'Panduan Web Dashboard' },
    { id: 'aslab', label: 'Admin & Asisten Lab' },
    { id: 'explorer', label: 'Web File Explorer' },
    { id: 'troubleshoot', label: 'Kendala & Solusi' }
  ];

  // Search filter query
  const query = searchQuery.trim().toLowerCase();

  const filteredSnippets = useMemo(() => {
    if (!query) return PYTHON_SNIPPETS;
    return PYTHON_SNIPPETS.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.desc.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query)
    );
  }, [query]);

  const matchesSearch = (text) => {
    if (!query) return true;
    return text.toLowerCase().includes(query);
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-16 print:p-0 print:max-w-none">
      {/* Header Banner - Clean, Crisp, Flat Design */}
      <div className="rounded-2xl bg-slate-900 p-6 sm:p-7 text-white border border-slate-800 print:bg-white print:text-black print:border-none print:p-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 print:hidden">
              <BookOpen className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider bg-slate-800 text-slate-300 border border-slate-700 uppercase print:text-black print:border-slate-400">
                  Buku Panduan & SOP v2.3
                </span>
                <span className="text-xs text-slate-400 font-mono print:text-slate-600">Fokus Web, JupyterHub & AI Runtime</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white print:text-black">
                Buku Panduan Sistem Web & Komputasi AI
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed print:text-slate-700">
                Dokumentasi operasional Web Dashboard, portal riset JupyterHub, isolasi GPU, manajemen dataset bersama, dan pintasan kode Python di Laboratorium AI Universitas Muhammadiyah Ponorogo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 print:hidden">
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all active:scale-[0.98]"
              title="Cetak SOP ini sebagai PDF atau Dokumen Kertas"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Cetak SOP</span>
            </button>
            <a
              href={dynamicJupyterUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all active:scale-[0.98]"
            >
              <span>Buka JupyterHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Live Search & Filter Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          {/* Section Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeSection === sec.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                }`}
              >
                {sec.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kata kunci / kode…"
              className="w-full bg-slate-950 text-xs text-white placeholder-slate-400 rounded-xl pl-9 pr-8 py-2 border border-slate-700 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                type="button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Kolom 1 & 2: Konten Utama */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* PYTHON CHEAT-SHEET FOR AI STUDENTS */}
          {(activeSection === 'all' || activeSection === 'snippets') && (
            (matchesSearch('python') || matchesSearch('cuda') || matchesSearch('pytorch') || matchesSearch('vram') || filteredSnippets.length > 0) && (
              <div className="rounded-2xl bg-white border border-slate-200 p-6 flex flex-col gap-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>Cheat-Sheet Kode Python Mahasiswa & Peneliti</span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-mono font-semibold">
                          Praktis & Teruji
                        </span>
                      </h2>
                      <p className="text-xs text-slate-500">
                        Cuplikan kode siap pakai untuk verifikasi GPU, pembacaan dataset, dan pencegahan OOM
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {filteredSnippets.map((snippet) => (
                    <div
                      key={snippet.id}
                      className="rounded-xl border border-slate-800 bg-slate-900 text-slate-100 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {snippet.category}
                          </span>
                          <span className="font-semibold text-slate-200">{snippet.title}</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(snippet.code, snippet.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono transition-colors border border-slate-700 active:scale-95"
                          title="Salin kode ke clipboard"
                          type="button"
                        >
                          {copiedCode === snippet.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Salin Kode</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-3 text-[11px] text-slate-400 bg-slate-900 border-b border-slate-800/80 leading-relaxed font-sans">
                        {snippet.desc}
                      </div>

                      <div className="p-4 bg-slate-950 overflow-x-auto font-mono text-[11px] leading-relaxed text-emerald-300">
                        <pre><code>{snippet.code}</code></pre>
                      </div>
                    </div>
                  ))}

                  {filteredSnippets.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                      Tidak ada cuplikan kode yang sesuai dengan kata kunci pencarian.
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {/* 1. BAGIAN PANDUAN JUPYTERHUB (MAHASISWA & PENELITI) */}
          {(activeSection === 'all' || activeSection === 'mahasiswa') && (
            (matchesSearch('jupyter') || matchesSearch('mahasiswa') || matchesSearch('login') || matchesSearch('simtik')) && (
              <div className="rounded-2xl bg-white border border-slate-200 p-6 flex flex-col gap-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Panduan Penggunaan JupyterHub (Mahasiswa & Peneliti)
                    </h2>
                    <p className="text-xs text-slate-500">Mulai komputasi AI dengan akun SIMTIK tanpa instalasi driver lokal</p>
                  </div>
                </div>

                {/* Langkah Kerja */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-semibold text-slate-900 block mb-1">1. Buka Portal Jupyter</span>
                    <p className="text-slate-600 leading-relaxed">
                      Akses alamat portal <code className="text-blue-600 font-mono font-semibold">{dynamicJupyterUrl}</code> melalui peramban web Anda.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-semibold text-slate-900 block mb-1">2. Login SSO SIMTIK</span>
                    <p className="text-slate-600 leading-relaxed">
                      Gunakan <strong>NIM</strong> dan kata sandi akun <strong>SIMTIK UMPO</strong> Anda.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-semibold text-slate-900 block mb-1">3. Lingkungan Siap</span>
                    <p className="text-slate-600 leading-relaxed">
                      Direktori <code>/home/m[NIM]</code> dan GPU siap digunakan secara instan dengan isolasi cgroups.
                    </p>
                  </div>
                </div>

                {/* Fitur & Alokasi Komputasi JupyterLab */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Akselerasi GPU & Cgroups Otomatis</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Setiap notebook yang dibuka langsung terhubung dengan GPU NVIDIA RTX. Sistem secara otomatis mengatur isolasi hardware sesuai tingkat alokasi (Standard atau Prioritas Riset) tanpa perlu setup driver manual.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <FolderOpen className="w-4 h-4 text-blue-600" />
                      <span>Direktori Bersama (dataset_shared)</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Folder <code>dataset_shared</code> otomatis terpasang sebagai pintasan di panel file JupyterLab Anda. Seluruh mahasiswa dapat langsung membuka dan membaca dataset bersama tanpa mengurangi kuota penyimpanan pribadi.
                    </p>
                  </div>
                </div>
              </div>
            )
          )}

          {/* 2. BAGIAN WEB DASHBOARD (MONITORING PUBLIK) */}
          {(activeSection === 'all' || activeSection === 'dashboard') && (
            (matchesSearch('dashboard') || matchesSearch('ringkasan') || matchesSearch('telemetri') || matchesSearch('level')) && (
              <div className="rounded-2xl bg-white border border-slate-200 p-6 flex flex-col gap-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Panduan Web Dashboard (Precision Console)
                    </h2>
                    <p className="text-xs text-slate-500">Memantau beban cluster server dan ketersediaan hardware secara langsung</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Cpu className="w-4 h-4 text-blue-600" />
                      <span>Telemetri Beban Server & Dual GPU</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Tab <strong>Ringkasan</strong> menyajikan grafik real-time persentase CPU, konsumsi RAM server, kapasitas disk <code>/home</code>, serta suhu (°C), utilisasi komputasi (%), dan VRAM (GB) dari kedua GPU (RTX 5060 Ti).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>Pemantauan Sesi Mahasiswa</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Tab <strong>Pengguna</strong> menampilkan mahasiswa yang sedang aktif (<em>Online</em>), penggunaan kuota disk, waktu mulai sesi, serta ketersediaan slot prioritas GPU 0.
                    </p>
                  </div>
                </div>

                {/* Matriks Tingkat Komputasi */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Tingkat Layanan</th>
                        <th className="p-3">Akselerasi GPU</th>
                        <th className="p-3">Alokasi CPU & RAM</th>
                        <th className="p-3">Kuota Disk</th>
                        <th className="p-3">Peruntukan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      <tr>
                        <td className="p-3 font-semibold text-slate-900">Standard (Level 2)</td>
                        <td className="p-3">GPU 1 (Shared Pool)</td>
                        <td className="p-3">2 Core CPU &bull; 4 GB RAM</td>
                        <td className="p-3">10 GB</td>
                        <td className="p-3 text-slate-500">Praktikum perkuliahan rutin</td>
                      </tr>
                      <tr className="bg-amber-50/30">
                        <td className="p-3 font-semibold text-amber-800">Priority (Level 1)</td>
                        <td className="p-3 font-bold text-amber-700">GPU 0 (Dedicated 100%)</td>
                        <td className="p-3 font-bold text-emerald-700">20 Core CPU &bull; 70 GB RAM</td>
                        <td className="p-3 font-bold text-slate-800">50 GB</td>
                        <td className="p-3 text-amber-700 font-medium">Skripsi / Riset Deep Learning</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* 3. BAGIAN ASISTEN LAB & ADMINISTRATOR */}
          {(activeSection === 'all' || activeSection === 'aslab') && (
            (matchesSearch('aslab') || matchesSearch('admin') || matchesSearch('boost') || matchesSearch('kill') || matchesSearch('snapshot')) && (
              <div className="rounded-2xl bg-white border border-slate-200 p-6 flex flex-col gap-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Panduan Administrator & Asisten Laboratorium
                    </h2>
                    <p className="text-xs text-slate-500">Manajemen hak akses, QoS Admission Control, dan pemeliharaan sesi</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 text-xs">
                  {/* 1. Akses Admin */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      A
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block mb-0.5">Masuk ke Mode Administrator</span>
                      <p className="text-slate-600 leading-relaxed">
                        Klik tombol <strong>Login Admin</strong> di kanan atas dashboard, lalu masukkan <strong>PIN Master</strong> laboratorium. Seluruh tombol tindakan administratif akan terbuka.
                      </p>
                    </div>
                  </div>

                  {/* 2. Boost GPU */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block mb-0.5">Memberikan Akses GPU Boost (Prioritas Level 1)</span>
                      <p className="text-slate-600 leading-relaxed">
                        Pada tab <strong>Pengguna</strong>, cari NIM mahasiswa skripsi, lalu klik tombol <strong>⚡ Boost</strong>. Tentukan durasi (1–24 Jam) dan isi keterangan penelitian. Sesi mahasiswa otomatis dialokasikan ke GPU 0 secara dedicated dengan hitung mundur waktu aktif (<em>countdown</em>) otomatis.
                      </p>
                    </div>
                  </div>

                  {/* 3. Bersihkan Cache */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      🧹
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block mb-0.5">Membersihkan Cache Disk Mahasiswa (Ikon Penghapus)</span>
                      <p className="text-slate-600 leading-relaxed">
                        Jika status kuota mahasiswa berstatus <em>Over Quota</em>, klik <strong>ikon penghapus (Bersihkan Cache Disk)</strong>. Sistem otomatis membersihkan file sementara cache pip dan checkpoint tanpa menghapus file kode utama.
                      </p>
                    </div>
                  </div>

                  {/* 4. Kill Sesi */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      🛑
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block mb-0.5">Menghentikan Sesi Bermasalah (Ikon Stop: Kill Sesi OS Aktif)</span>
                      <p className="text-slate-600 leading-relaxed">
                        Jika mahasiswa mengalami kernel beku (<em>infinite loop</em>) atau kehabisan memori VRAM, klik <strong>ikon stop (Kill Sesi OS Aktif)</strong> pada baris mahasiswa terkait untuk membebaskan hardware secara instan.
                      </p>
                    </div>
                  </div>

                  {/* 5. Snapshot Backup */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      <DatabaseBackup className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block mb-0.5">Pencadangan Database Sekali Klik (Snapshot)</span>
                      <p className="text-slate-600 leading-relaxed">
                        Pada tab <strong>Ringkasan</strong> di kartu <em>Keamanan & Backup</em>, admin dapat menekan tombol <strong>Snapshot Database</strong> untuk mencadangkan database status pengguna dan kuota secara aman dengan teknik SQLite WAL lock-free.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* 4. BAGIAN WEB FILE EXPLORER */}
          {(activeSection === 'all' || activeSection === 'explorer') && (
            (matchesSearch('file') || matchesSearch('explorer') || matchesSearch('upload') || matchesSearch('download')) && (
              <div className="rounded-2xl bg-white border border-slate-200 p-6 flex flex-col gap-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                    4
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Panduan Web File Explorer Terpadu
                    </h2>
                    <p className="text-xs text-slate-500">Kelola dan jelajahi seluruh berkas kerja langsung melalui antarmuka web</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <FolderOpen className="w-4 h-4 text-blue-600" />
                      <span>Navigasi Direktori Mahasiswa</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Pilih akun mahasiswa pada panel kiri untuk melihat seluruh berkas di folder <code>/home/m[NIM]</code> atau buka direktori <code>dataset_shared</code> untuk melihat dataset publik.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>Unggah Berkas (Upload)</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Klik tombol <strong>Upload File</strong> di bagian atas untuk mengirimkan dataset atau modul Python langsung ke folder tujuan tanpa perlu konfigurasi FTP/SSH.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Download className="w-4 h-4 text-indigo-600" />
                      <span>Unduh Berkas (Download)</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Klik <strong>ikon unduh</strong> pada baris berkas (misal berkas model <code>.pth</code> atau grafik hasil evaluasi) untuk langsung mengunduh ke perangkat Anda.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Layers className="w-4 h-4 text-amber-600" />
                      <span>Salin ke Direktori Bersama</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Gunakan tombol <strong>Copy to Shared</strong> pada berkas materi praktikum agar otomatis tersedia bagi seluruh mahasiswa di folder <code>dataset_shared</code>.
                    </p>
                  </div>
                </div>
              </div>
            )
          )}

          {/* 5. BAGIAN KENDALA & SOLUSI */}
          {(activeSection === 'all' || activeSection === 'troubleshoot') && (
            (matchesSearch('kendala') || matchesSearch('solusi') || matchesSearch('403') || matchesSearch('oom') || matchesSearch('quota')) && (
              <div className="rounded-2xl bg-white border border-slate-200 p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                    5
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Pemecahan Masalah (Kendala & Solusi Berbasis Web)
                    </h2>
                    <p className="text-xs text-slate-500">Panduan mandiri mengatasi kendala umum saat praktikum dan riset</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-1">
                      🔒 Akses Ditolak (HTTP 403) / Akun Terkunci di Perangkat Lain
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      Sistem mendeteksi bahwa akun NIM Anda masih aktif di perangkat atau tab peramban sebelumnya. 
                      <strong> Solusi:</strong> Buka laptop sebelumnya, lalu klik menu <code>File → Log Out</code> di JupyterLab. Jika perangkat lama tidak dapat diakses, mintalah asisten lab untuk menekan tombol <em>Kill Sesi OS Aktif</em> di Web Dashboard.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-1">
                      ⚠️ Kernel Died / Out of Memory (OOM) di JupyterLab
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      Terjadi jika model atau ukuran batch pelatihan melebihi batas memori RAM/VRAM yang dialokasikan.
                      <strong> Solusi:</strong> Di JupyterLab, klik menu <code>Kernel → Restart Kernel and Clear All Outputs</code>, gunakan cuplikan kode pembersih VRAM dari Cheat-Sheet di atas, lalu perkecil nilai <code>batch_size</code> pada skrip kode Anda.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-1">
                      🟡 Kuota Penyimpanan Penuh (Peringatan Over Quota)
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      Terjadi jika berkas checkpoint atau file sementara menumpuk hingga melebihi kuota 10 GB.
                      <strong> Solusi:</strong> Hapus berkas checkpoint bobot model yang tidak terpakai dari panel File Browser JupyterLab, atau minta asisten lab untuk menekan tombol <em>Bersihkan Cache Disk</em> pada Dashboard.
                    </p>
                  </div>
                </div>
              </div>
            )
          )}

        </div>

        {/* Kolom 3: Sidebar Regulasi & Informasi */}
        <div className="flex flex-col gap-6">

          {/* Kartu Regulasi Single-Device Lock */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
              <Lock className="w-4 h-4 text-rose-600" />
              <span>Kebijakan Single-Device Lock</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Setiap mahasiswa hanya diizinkan aktif di <strong>1 perangkat peramban</strong> secara bersamaan guna mencegah bentrok penyimpanan berkas notebook dan praktik joki praktikum.
            </p>
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium">
              💡 Selalu lakukan <strong>File → Log Out</strong> di JupyterLab sebelum berganti komputer atau menutup browser.
            </div>
          </div>

          {/* Kartu Idle Culler - Diselaraskan dengan konfigurasi 30 Menit (1800s) server */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Pemadaman Otomatis (30 Menit)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Jika notebook Anda tidak menjalankan kalkulasi aktif dan ditinggalkan selama lebih dari <strong>30 menit</strong> (1800 detik), daemon <em>idle-culler</em> server otomatis mematikan kernel agar alokasi VRAM GPU terbebas untuk mahasiswa lain. Seluruh file dan notebook Anda tetap tersimpan utuh di storage.
            </p>
          </div>

          {/* Akses Cepat Port */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Daftar Layanan Web Lab AI</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">JupyterHub Portal</span>
                  <span className="text-[11px] text-slate-500 font-mono">Port 8090 &bull; SSO SIMTIK</span>
                </div>
                <a
                  href={dynamicJupyterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Buka JupyterHub"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Web Dashboard</span>
                  <span className="text-[11px] text-slate-500 font-mono">Port 8888 &bull; Monitoring & Console</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                  ONLINE
                </span>
              </div>
            </div>
          </div>

          {/* Kontak Laboratorium */}
          <div className="rounded-2xl bg-slate-900 text-white p-5 flex flex-col gap-3 border border-slate-800 print:hidden">
            <span className="text-xs font-mono font-semibold text-blue-400 uppercase tracking-wider">
              Dukungan Akademik & Teknis
            </span>
            <h3 className="text-sm font-bold">Laboratorium AI & Riset Komputasi</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Program Studi Teknik Informatika, Fakultas Teknik, Universitas Muhammadiyah Ponorogo. Untuk pengajuan GPU Boost Skripsi atau pertanyaan terkait, silakan menghubungi Asisten Laboratorium yang bertugas.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex flex-col gap-1">
              <span>Status Klaster: Beroperasi Penuh</span>
              <span>SSO SIMTIK: Terhubung (Real-time)</span>
              <span>Culler Policy: 30 Menit Idle</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
