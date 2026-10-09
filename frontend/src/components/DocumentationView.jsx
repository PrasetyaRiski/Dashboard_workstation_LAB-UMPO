import React, { useState } from 'react';
import { 
  BookOpen, 
  Terminal, 
  ShieldCheck, 
  Cpu, 
  HardDrive, 
  Zap, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink,
  Users,
  Server,
  Layers,
  FileCode2,
  Lock
} from 'lucide-react';

export default function DocumentationView({ showToast }) {
  const [activeSection, setActiveSection] = useState('all');
  const [copiedCode, setCopiedCode] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    if (showToast) showToast('Kode perintah berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sections = [
    { id: 'all', label: 'Semua Panduan' },
    { id: 'mahasiswa', label: 'Panduan Mahasiswa' },
    { id: 'aslab', label: 'Panduan Aslab & Admin' },
    { id: 'arsitektur', label: 'Arsitektur & QoS' },
    { id: 'troubleshoot', label: 'Troubleshooting' }
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
                  Dokumentasi Resmi v2.1
                </span>
                <span className="text-xs text-slate-400 font-mono">Edisi Oktober 2026</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Buku Panduan Komputasi & JupyterHub
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Panduan komprehensif operasional, arsitektur sistem, alokasi Dynamic QoS, dan tata cara praktikum di Laboratorium AI Program Studi Informatika Universitas Muhammadiyah Ponorogo.
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
              <span>Buka JupyterHub</span>
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

          {/* BAGIAN MAHASISWA: QUICKSTART */}
          {(activeSection === 'all' || activeSection === 'mahasiswa') && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Panduan Cepat Mahasiswa (Zero-Admin Onboarding)
                  </h2>
                  <p className="text-xs text-slate-500">Cara masuk dan mulai menggunakan notebook</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="font-semibold text-slate-800 block mb-1">1. Buka Portal</span>
                  <span className="text-slate-600">Akses JupyterHub di port <code>8090</code> melalui browser Anda.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="font-semibold text-slate-800 block mb-1">2. Login SIMTIK</span>
                  <span className="text-slate-600">Gunakan <strong>NIM</strong> dan <strong>Password SIMTIK UMPO</strong> Anda.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="font-semibold text-slate-800 block mb-1">3. Otomatis Aktif</span>
                  <span className="text-slate-600">Direktori <code>/home/m[NIM]</code> terbuat otomatis dengan kuota 10 GB.</span>
                </div>
              </div>

              {/* Code Box: Cek GPU */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-700">
                  <span>Memeriksa Akses GPU di PyTorch</span>
                  <button
                    onClick={() => copyToClipboard(`import torch\nprint("GPU Tersedia:", torch.cuda.is_available())\nif torch.cuda.is_available():\n    print("Device Name:", torch.cuda.get_device_name(0))`, 'check-gpu')}
                    className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-sans"
                  >
                    {copiedCode === 'check-gpu' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === 'check-gpu' ? 'Tersalin' : 'Salin Skrip'}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto border border-slate-800">
{`import torch
print("GPU Tersedia:", torch.cuda.is_available())
if torch.cuda.is_available():
    print("Device Name:", torch.cuda.get_device_name(0))
    x = torch.randn(1000, 1000, device="cuda:0")`}
                </pre>
              </div>

              {/* Install Lib */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-700">
                  <span>Menginstall Library Python (Direktori User)</span>
                  <button
                    onClick={() => copyToClipboard('pip install --user scikit-learn seaborn transformers', 'pip-install')}
                    className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-sans"
                  >
                    {copiedCode === 'pip-install' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Salin</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 text-xs font-mono overflow-x-auto border border-slate-800">
pip install --user scikit-learn seaborn transformers
                </pre>
              </div>
            </div>
          )}

          {/* BAGIAN ASLAB: OPERASIONAL DASHBOARD */}
          {(activeSection === 'all' || activeSection === 'aslab') && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Panduan Operasional Asisten Lab & Admin
                  </h2>
                  <p className="text-xs text-slate-500">Manajemen sesi, admission control, dan pemeliharaan server</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Admission Control (GPU Boost)</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Hanya ada 1 slot GPU 0 (Dedicated). Jika mahasiswa skripsi membutuhkan daya komputasi tinggi, klik <strong>Boost Priority</strong> pada tabel user, pilih durasi (1-24 jam). Sistem akan otomatis menurunkan kembali saat waktu habis.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <span>Kill Process & OOM Safeguard</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Jika ada proses yang memakan VRAM berlebihan atau freeze, gunakan tab <strong>Processes</strong> untuk mematikan PID terkait. Akun sistem inti (systemd, sshd, uvicorn) diproteksi secara mutlak agar server tidak mati.
                  </p>
                </div>
              </div>

              {/* Deploy command */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-700">
                  <span>Perintah Update & Sinkronisasi Sistem (Server)</span>
                  <button
                    onClick={() => copyToClipboard('sudo bash simtik.sh', 'deploy-cmd')}
                    className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-sans"
                  >
                    {copiedCode === 'deploy-cmd' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Salin</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-900 text-amber-300 text-xs font-mono overflow-x-auto border border-slate-800">
sudo bash simtik.sh
                </pre>
              </div>
            </div>
          )}

          {/* BAGIAN ARSITEKTUR: DYNAMIC QOS */}
          {(activeSection === 'all' || activeSection === 'arsitektur') && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Arsitektur Dynamic QoS & Isolasi Hardware
                  </h2>
                  <p className="text-xs text-slate-500">Mekanisme Cgroups v2 Level 1 vs Level 2</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Parameter Alokasi</th>
                      <th className="p-3">Level 2 (Standard Praktikum)</th>
                      <th className="p-3">Level 1 (Priority Skripsi / Riset)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    <tr>
                      <td className="p-3 font-semibold text-slate-900">GPU Hardware</td>
                      <td className="p-3">GPU 1 (Shared Pool)</td>
                      <td className="p-3 text-amber-700 font-semibold bg-amber-50/50">GPU 0 (Dedicated)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900">Batas RAM Utama</td>
                      <td className="p-3">3 GB (MemoryMax=3G)</td>
                      <td className="p-3 text-emerald-700 font-semibold bg-emerald-50/50">70 GB (MemoryMax=70G)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900">Kuota CPU</td>
                      <td className="p-3">2 Core (CPUQuota=200%)</td>
                      <td className="p-3 font-semibold">20 Core (CPUQuota=2000%)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900">Soft Quota Disk</td>
                      <td className="p-3">10 GB</td>
                      <td className="p-3">50 GB</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900">Masa Berlaku</td>
                      <td className="p-3">Permanen Masa Studi</td>
                      <td className="p-3">1 - 24 Jam (Auto-Expire)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* BAGIAN TROUBLESHOOTING */}
          {(activeSection === 'all' || activeSection === 'troubleshoot') && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Pemecahan Masalah (Troubleshooting Guide)
                  </h2>
                  <p className="text-xs text-slate-500">Solusi cepat untuk kendala operasional yang sering terjadi</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-1">🔴 Port 8888 Belum Merespons / Connection Refused</span>
                  <p className="text-slate-600 mb-2">
                    Terjadi saat modul Python belum lengkap atau uvicorn crash saat startup. Cek log terakhir:
                  </p>
                  <pre className="p-2 rounded bg-slate-900 text-slate-200 font-mono text-[11px]">
tail -n 50 /home/public/web/panel-lab/backend/dashboard.log
                  </pre>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-1">🟡 Kuota Penyimpanan Penuh (⚠️ Over Quota)</span>
                  <p className="text-slate-600 mb-2">
                    Mahasiswa dapat membersihkan cache PIP dan checkpoint notebook dengan menekan tombol sapu <strong>Clear Cache</strong> di dashboard atau via terminal:
                  </p>
                  <pre className="p-2 rounded bg-slate-900 text-slate-200 font-mono text-[11px]">
rm -rf ~/.cache/pip && find ~ -name ".ipynb_checkpoints" -type d -exec rm -rf {} +
                  </pre>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-1">🟢 Pemulihan Database dari Snapshot Backup</span>
                  <p className="text-slate-600 mb-2">
                    Snapshot otomatis dicadangkan setiap hari pukul 02:00 WIB ke folder <code>/home/public/web/data/backups/</code>. Untuk restore:
                  </p>
                  <pre className="p-2 rounded bg-slate-900 text-slate-200 font-mono text-[11px]">
cp /home/public/web/data/backups/lab_users_backup_*.db /home/public/web/data/lab_users.db
                  </pre>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Kolom 3: Sidebar Informasi & Regulasi */}
        <div className="flex flex-col gap-6">

          {/* Kartu Regulasi Single-Device Lock */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
              <Lock className="w-4 h-4 text-rose-600" />
              <span>Kebijakan Single-Device</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Setiap mahasiswa hanya boleh aktif di <strong>1 perangkat dalam satu waktu</strong>. Jika Anda mencoba login di laptop kedua saat sesi pertama masih aktif, sistem akan menolak login (HTTP 403) untuk mencegah kerusakan berkas dan joki praktikum.
            </p>
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium">
              💡 Pastikan selalu menekan <strong>File → Log Out</strong> sebelum berganti perangkat.
            </div>
          </div>

          {/* Kartu Idle Culler */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>Idle-Culler (60 Menit)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Jika kernel notebook tidak menjalankan perhitungan dan browser ditutup selama lebih dari <strong>60 menit</strong>, sesi komputasi akan dihentikan otomatis agar VRAM dan memori server dapat digunakan oleh mahasiswa lain. Berkas Anda tetap aman.
            </p>
          </div>

          {/* Kontak Laboratorium */}
          <div className="rounded-2xl bg-slate-900 text-white p-5 flex flex-col gap-3 border border-slate-800 shadow-sm">
            <span className="text-xs font-mono font-semibold text-blue-400 uppercase tracking-wider">
              Dukungan Teknis
            </span>
            <h3 className="text-sm font-bold">Laboratorium AI UMPO</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fakultas Teknik, Universitas Muhammadiyah Ponorogo. Untuk pelaporan kendala server atau pengajuan riset khusus, silakan hubungi Asisten Lab bertugas.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex flex-col gap-1">
              <span>Port Portal: :8090</span>
              <span>Port Console: :8888</span>
              <span>DB: SQLite WAL Safe</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
