import React from 'react';
import { 
  X, Check, AlertTriangle, Terminal, ShieldCheck, 
  Cpu, Layers, ArrowRight, Loader2, Users, Zap
} from 'lucide-react';

export default function ModeSwitchModal({ 
  isOpen, 
  targetMode, 
  _currentMode,
  activeCount = 0,
  activeBoosts = 0,
  onConfirm, 
  onClose, 
  isSubmitting 
}) {
  if (!isOpen || !targetMode) return null;

  const isSwitchingToCpu60 = targetMode === 'cpu60' || targetMode === 'basic' || targetMode === 'standard';

  const modeConfig = isSwitchingToCpu60 ? {
    title: 'Beralih ke Mode 60 (CPU Only)',
    targetName: 'Mode 60 (Maks 60 Slot)',
    targetSlots: 60,
    currentSlots: 30,
    accentColor: 'text-sky-600',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: Terminal,
    description: 'Membuka kapasitas klaster hingga 60 sesi mahasiswa sekaligus (1 Core CPU · 1.5 GB RAM). Fitur GPU Boost dikunci mati dan dinonaktifkan secara global.',
    workload: {
      title: 'Kemampuan Beban Kerja (1 Core · 1.5 GB RAM · Tanpa GPU)',
      supported: [
        'Scripting & pemrograman umum (Python, C/C++, Java, Bash)',
        'Algoritma standar, struktur data, dan simulasi logika/matematis ringan',
        'Pengolahan data tabular kecil (CSV / JSON di bawah 50 MB)',
        'Visualisasi data sederhana (Matplotlib / Seaborn skala kecil)',
      ],
      unsupported: [
        'Machine Learning & Deep Learning (PyTorch, TensorFlow, Keras tidak didukung)',
        'Dataset besar (> 200 MB akan melebihi RAM 1.5 GB dan memicu OOM Kill otomatis)',
        'Komputasi grafis / AI berakselerasi GPU (akses GPU diblokir secara hardware)',
      ],
    },
    changes: [
      {
        label: 'Kapasitas Kuota Level 2',
        from: 'Maks 30 Sesi Mahasiswa',
        to: 'Maks 60 Sesi Mahasiswa (2 Kelas)',
        icon: Users,
        positive: true,
      },
      {
        label: 'Fitur GPU Boost (GPU 1)',
        from: 'Diizinkan (Maks 3 Slot)',
        to: 'Dikunci OFF / Nonaktif',
        icon: Zap,
        positive: false,
        note: 'Pemberian boost baru diblokir. Boost yang sudah berjalan tetap berlaku sampai kedaluwarsa.',
      },
      {
        label: 'Jatah Baseline Level 2',
        from: '2 Core · 3.0 GB RAM',
        to: '1 Core · 1.5 GB RAM',
        icon: Cpu,
        positive: null,
        note: 'Praktikum komputasi CPU-only yang ringan dan stabil.',
      },
      {
        label: 'Jalur Riset (Level 1)',
        from: 'Dedicated GPU 0 (60 GB)',
        to: 'Tetap Terisolasi Penuh di GPU 0',
        icon: ShieldCheck,
        positive: true,
        note: 'Mahasiswa skripsi dan dosen tidak akan terpengaruh sama sekali.',
      },
    ],
    confirmBtnClass: 'bg-slate-900 hover:bg-slate-800 text-white',
    confirmBtnText: 'Terapkan Mode 60 (60 Slot)',
  } : {
    title: 'Beralih ke Mode 30 (GPU Boost)',
    targetName: 'Mode 30 (Maks 30 Slot)',
    targetSlots: 30,
    currentSlots: 60,
    accentColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Layers,
    description: 'Membatasi kapasitas menjadi maksimal 30 mahasiswa (2 Core CPU · 3.0 GB RAM) dan mengizinkan fitur GPU Boost (hingga 3 slot akselerasi GPU 1 VRAM 4.8 GB).',
    workload: {
      title: 'Kemampuan Beban Kerja (2 Core · 3.0 GB RAM · GPU Boost Ready)',
      supported: [
        'Analisis data skala menengah (Pandas / Numpy / Polars dengan dataset ~1 GB)',
        'Machine Learning klasik (Scikit-Learn, XGBoost, Regresi, Random Forest, SVM)',
        'Pengolahan citra digital dasar (OpenCV filtering, deteksi fitur, transformasi)',
        'Multi-core processing & pemodelan statistik (2 Core CPU / 3.0 GB RAM)',
        'Dengan GPU Boost (jika aktif): Neural Network ringan / CNN / AI kecil (VRAM < 4.8 GB)',
      ],
      unsupported: [
        'Model AI skala besar / LLM parameter besar (> 7B) yang butuh VRAM > 4.8 GB',
        'Beban komputasi yang melebihi batas 3.0 GB RAM sistem (akan dihentikan cgroup)',
      ],
    },
    changes: [
      {
        label: 'Kapasitas Kuota Level 2',
        from: 'Maks 60 Sesi Mahasiswa',
        to: 'Maks 30 Sesi Mahasiswa (1 Kelas)',
        icon: Users,
        positive: null,
        note: 'Membatasi persaingan memori host server.',
      },
      {
        label: 'Jatah Baseline Level 2',
        from: '1 Core · 1.5 GB RAM',
        to: '2 Core · 3.0 GB RAM',
        icon: Cpu,
        positive: true,
        note: 'Kapasitas RAM & CPU lebih lega untuk analisis data & praktikum AI.',
      },
      {
        label: 'Fitur GPU Boost (GPU 1)',
        from: 'Dikunci OFF / Nonaktif',
        to: 'Diizinkan (Maks 3 Slot Sementara)',
        icon: Zap,
        positive: true,
        note: 'Aslab/Admin dapat memberikan akses GPU 1 sementara (VRAM 4.8 GB; CPU & RAM tetap 2 Core / 3 GB).',
      },
      {
        label: 'Jalur Riset (Level 1)',
        from: 'Dedicated GPU 0 (60 GB)',
        to: 'Tetap Terisolasi Penuh di GPU 0',
        icon: ShieldCheck,
        positive: true,
        note: 'Mahasiswa skripsi dan dosen tetap prioritas tertinggi di GPU 0.',
      },
    ],
    confirmBtnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    confirmBtnText: 'Terapkan Mode 30 (30 Slot)',
  };

  const IconHeader = modeConfig.icon;
  const isOverCapacity = !isSwitchingToCpu60 && activeCount > 30;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 font-sans">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col motion-card">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${modeConfig.badgeBg} shadow-xs`}>
              <IconHeader className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sans font-bold text-base text-slate-900 tracking-tight">
                  {modeConfig.title}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfirmasi perubahan kapasitas klaster dan kebijakan GPU Boost
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-slate-200 bg-white cursor-pointer disabled:opacity-40"
            type="button"
            aria-label="Tutup Dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Overview Callout */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
            {modeConfig.description}
          </div>

          {/* Sesi Berjalan Notice / Over Capacity */}
          {isOverCapacity ? (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Kapasitas Melebihi Batas Baru ({activeCount} Sesi Aktif):</strong> Batas baru adalah 30 slot. Sesi aktif <u>tidak akan dihentikan</u>, namun mahasiswa baru tidak dapat melakukan spawn hingga jumlah sesi turun di bawah 30.
              </div>
            </div>
          ) : activeCount > 0 ? (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-700">
              <Users className="w-4 h-4 shrink-0 text-slate-500 mt-0.5" />
              <div className="leading-relaxed">
                <strong>{activeCount} Mahasiswa Sedang Aktif:</strong> Sesi koding yang sedang berjalan <u>tidak akan terputus</u>. Perubahan kuota akan langsung diterapkan pada spawn berikutnya.
              </div>
            </div>
          ) : null}

          {/* Running Boost Notice when switching to Mode 60 */}
          {isSwitchingToCpu60 && activeBoosts > 0 && (
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 flex items-start gap-2.5 text-xs text-sky-900">
              <Zap className="w-4 h-4 shrink-0 text-sky-600 mt-0.5" />
              <div className="leading-relaxed">
                <strong>{activeBoosts} GPU Boost Sedang Berjalan:</strong> Mahasiswa yang sedang memiliki GPU Boost tetap mempertahankan akses GPU 1 hingga waktu kedaluwarsa atau dicabut manual. Pemberian boost baru akan dikunci.
              </div>
            </div>
          )}

          {/* Matrix Perubahan Parameter */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Rincian Perubahan Parameter Klaster:
            </span>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 font-mono text-xs bg-slate-50/50">
              {modeConfig.changes.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div key={idx} className="p-3 flex flex-col gap-1 hover:bg-white transition-colors">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="font-sans font-semibold text-slate-700 flex items-center gap-1.5">
                        <ItemIcon className="w-3.5 h-3.5 text-slate-400" />
                        {item.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="line-through text-slate-400 font-medium">
                        {item.from}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-900">
                        {item.to}
                      </span>
                    </div>

                    {item.note && (
                      <span className="text-[10.5px] font-sans text-slate-400 mt-0.5">
                        {item.note}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Workload Capabilities & Technical Limits */}
          {modeConfig.workload && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Kapasitas Beban Kerja Spesifikasi Target:
              </span>

              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/70 flex flex-col gap-2.5 text-xs font-sans">
                <div>
                  <div className="font-semibold text-emerald-700 flex items-center gap-1.5 mb-1 text-[11.5px]">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Mampu Menjalankan (Beban Kerja yang Didukung):</span>
                  </div>
                  <ul className="list-disc list-inside text-slate-600 text-[11px] space-y-0.5 leading-relaxed pl-1">
                    {modeConfig.workload.supported.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-200/70">
                  <div className="font-semibold text-rose-700 flex items-center gap-1.5 mb-1 text-[11.5px]">
                    <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Batas Kemampuan (Tidak Didukung):</span>
                  </div>
                  <ul className="list-disc list-inside text-slate-600 text-[11px] space-y-0.5 leading-relaxed pl-1">
                    {modeConfig.workload.unsupported.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors min-h-[42px] cursor-pointer bg-white disabled:opacity-40"
            type="button"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`px-5 py-2 rounded-xl text-xs font-semibold ${modeConfig.confirmBtnClass} transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50 min-h-[42px] cursor-pointer`}
            type="button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Menerapkan Perubahan...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{modeConfig.confirmBtnText}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
