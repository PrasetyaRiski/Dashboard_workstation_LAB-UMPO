import React, { useState } from 'react';
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
  DatabaseBackup
} from 'lucide-react';

export default function DocumentationView({ showToast }) {
  const [activeSection, setActiveSection] = useState('all');
  const [copiedCode, setCopiedCode] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    if (showToast) showToast('Kode berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sections = [
    { id: 'all', label: 'Semua Panduan' },
    { id: 'mahasiswa', label: 'Panduan JupyterHub' },
    { id: 'dashboard', label: 'Panduan Web Dashboard' },
    { id: 'aslab', label: 'Admin & Asisten Lab' },
    { id: 'explorer', label: 'Web File Explorer' },
    { id: 'troubleshoot', label: 'Kendala & Solusi' }
  ];

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 p-6 sm:p-8 text-white border border-blue-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 shadow-inner">
              <BookOpen className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase">
                  Buku Panduan Resmi v2.2
                </span>
                <span className="text-xs text-slate-400 font-mono">Fokus Web & JupyterHub</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Buku Panduan Sistem Web & JupyterHub
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Panduan praktis pengoperasian Web Dashboard Monitoring, portal komputasi interaktif JupyterHub, alokasi akselerasi GPU, dan manajemen berkas di Laboratorium AI Universitas Muhammadiyah Ponorogo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="http://76.76.76.188:8090"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Buka Portal JupyterHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-slate-800">
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeSection === sec.id
                  ? 'bg-blue-600 text-white font-semibold shadow-md'
                  : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Kolom 1 & 2: Konten Utama */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* 1. BAGIAN PANDUAN JUPYTERHUB (MAHASISWA & PENELITI) */}
          {(activeSection === 'all' || activeSection === 'mahasiswa') && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
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
                  <p className="text-slate-600">Akses alamat <code>http://76.76.76.188:8090</code> melalui peramban web Anda.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="font-semibold text-slate-900 block mb-1">2. Login SSO SIMTIK</span>
                  <p className="text-slate-600">Gunakan <strong>NIM</strong> dan kata sandi akun <strong>SIMTIK UMPO</strong> Anda.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="font-semibold text-slate-900 block mb-1">3. Lingkungan Siap</span>
                  <p className="text-slate-600">Direktori <code>/home/m[NIM]</code> dan GPU siap digunakan secara instan.</p>
                </div>
              </div>

              {/* Script: Akses GPU PyTorch */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Memeriksa & Menggunakan Akselerasi GPU di Notebook Python
                  </span>
                  <button
                    onClick={() => copyToClipboard(`import torch\n\nif torch.cuda.is_available():\n    print("GPU Siap Digunakan:", torch.cuda.get_device_name(0))\n    device = torch.device("cuda:0")\n    x = torch.randn(1000, 1000, device=device)\n    print("VRAM Terpakai:", torch.cuda.memory_allocated() / (1024 ** 2), "MB")\nelse:\n    print("Berjalan pada mode CPU")`, 'check-gpu')}
                    className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-sans"
                  >
                    {copiedCode === 'check-gpu' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === 'check-gpu' ? 'Tersalin' : 'Salin Kode'}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto border border-slate-800 leading-relaxed">
{`import torch

if torch.cuda.is_available():
    print("GPU Siap Digunakan:", torch.cuda.get_device_name(0))
    device = torch.device("cuda:0")
    x = torch.randn(1000, 1000, device=device)
    print("VRAM Terpakai:", torch.cuda.memory_allocated() / (1024 ** 2), "MB")
else:
    print("Berjalan pada mode CPU")`}
                </pre>
              </div>

              {/* Install Lib & Shared Dataset */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
                  <span className="font-semibold text-slate-900">📦 Instal Pustaka Tambahan di Notebook</span>
                  <p className="text-slate-600 leading-relaxed">
                    Jalankan sel dengan perintah sihir <code>%pip</code> untuk memasang pustaka ke folder pribadi Anda:
                  </p>
                  <pre className="p-2 rounded bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
%pip install seaborn transformers albumentations
                  </pre>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
                  <span className="font-semibold text-slate-900">📂 Mengakses Dataset Bersama</span>
                  <p className="text-slate-600 leading-relaxed">
                    Baca dataset bersama langsung dari folder <code>/home/dataset_shared/</code> tanpa mendownload ulang:
                  </p>
                  <pre className="p-2 rounded bg-slate-900 text-sky-400 font-mono text-[11px] overflow-x-auto">
import pandas as pd
df = pd.read_csv('/home/dataset_shared/dataset.csv')
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* 2. BAGIAN WEB DASHBOARD (MONITORING PUBLIK) */}
          {(activeSection === 'all' || activeSection === 'dashboard') && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
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
                    Tab <strong>Pengguna</strong> menampilkan mahasiswa yang sedang aktif (*Online*), penggunaan kuota disk, waktu mulai sesi, serta ketersediaan slot prioritas GPU 0.
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
                      <td className="p-3">2 Core CPU &bull; 3 GB RAM</td>
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
          )}

          {/* 3. BAGIAN ASISTEN LAB & ADMINISTRATOR */}
          {(activeSection === 'all' || activeSection === 'aslab') && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
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
                      Pada tab <strong>Pengguna</strong>, cari NIM mahasiswa skripsi, lalu klik tombol <strong>⚡ Boost</strong>. Tentukan durasi (1–24 Jam) dan isi keterangan penelitian. Sesi mahasiswa otomatis dialokasikan ke GPU 0 secara dedicated dengan hitung mundur waktu aktif (*countdown*) otomatis.
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
                      Jika mahasiswa mengalami kernel beku (*infinite loop*) atau kehabisan memori VRAM, klik <strong>ikon stop (Kill Sesi OS Aktif)</strong> pada baris mahasiswa terkait untuk membebaskan hardware secara instan.
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
                      Pada tab <strong>Ringkasan</strong> di kartu *Keamanan & Backup*, admin dapat menekan tombol <strong>Snapshot Database</strong> untuk mencadangkan database status pengguna dan kuota secara aman tanpa interupsi layanan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. BAGIAN WEB FILE EXPLORER */}
          {(activeSection === 'all' || activeSection === 'explorer') && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
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
          )}

          {/* 5. BAGIAN KENDALA & SOLUSI */}
          {(activeSection === 'all' || activeSection === 'troubleshoot') && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
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
                    <strong> Solusi:</strong> Di JupyterLab, klik menu <code>Kernel → Restart Kernel and Clear All Outputs</code>, lalu perkecil nilai <code>batch_size</code> pada skrip kode Anda.
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
          )}

        </div>

        {/* Kolom 3: Sidebar Regulasi & Informasi */}
        <div className="flex flex-col gap-6">

          {/* Kartu Regulasi Single-Device Lock */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
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

          {/* Kartu Idle Culler */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Pemadaman Otomatis (60 Menit)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Jika notebook Anda tidak menjalankan kalkulasi komputasi dan tab peramban ditinggalkan selama lebih dari <strong>60 menit</strong>, server akan mematikan kernel secara otomatis agar memori GPU terbebas untuk mahasiswa lain. Seluruh file Anda tetap tersimpan aman.
            </p>
          </div>

          {/* Akses Cepat Port */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Daftar Layanan Web Lab AI</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">JupyterHub Portal</span>
                  <span className="text-[11px] text-slate-500 font-mono">Port 8090 &bull; Praktikum AI</span>
                </div>
                <a
                  href="http://76.76.76.188:8090"
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-blue-600 hover:bg-blue-50"
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
                  AKTIF
                </span>
              </div>
            </div>
          </div>

          {/* Kontak Laboratorium */}
          <div className="rounded-2xl bg-slate-900 text-white p-5 flex flex-col gap-3 border border-slate-800 shadow-sm">
            <span className="text-xs font-mono font-semibold text-blue-400 uppercase tracking-wider">
              Dukungan Akademik & Teknis
            </span>
            <h3 className="text-sm font-bold">Laboratorium AI & Riset Komputasi</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Program Studi Teknik Informatika, Fakultas Teknik, Universitas Muhammadiyah Ponorogo. Untuk pengajuan GPU Boost Skripsi atau pertanyaan terkait, silakan menghubungi Asisten Laboratorium yang bertugas.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex flex-col gap-1">
              <span>Status Sistem: Siap Produksi</span>
              <span>SSO: SIMTIK Terintegrasi</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
