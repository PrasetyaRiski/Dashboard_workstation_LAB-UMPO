import React from 'react';
import { 
  X, Check, AlertTriangle, Sparkles, Terminal, ShieldCheck, 
  Cpu, Layers, HardDrive, ArrowRight, Loader2, Users
} from 'lucide-react';

export default function ModeSwitchModal({ 
  isOpen, 
  targetMode, 
  currentMode,
  activeCount = 0,
  onConfirm, 
  onClose, 
  isSubmitting 
}) {
  if (!isOpen || !targetMode) return null;

  const isSwitchingToBasic = targetMode === 'basic';

  const modeConfig = isSwitchingToBasic ? {
    title: 'Beralih ke Mode Pemrograman Dasar',
    targetName: 'Mode Pemrograman Dasar (2 Kelas)',
    targetSlots: 60,
    currentSlots: 30,
    accentColor: 'text-sky-600',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: Terminal,
    description: 'Membuka kapasitas klaster hingga 60 mahasiswa sekaligus untuk menampung 2 kelas praktikum paralel (Algoritma, Pemrograman Dasar, Struktur Data).',
    changes: [
      {
        label: 'Kapasitas Kuota',
        from: '30 Slot Mahasiswa',
        to: '60 Slot Mahasiswa (2 Kelas)',
        icon: Users,
        positive: true,
      },
      {
        label: 'Akselerasi GPU 1',
        from: 'Aktif (Shared Pool)',
        to: 'Standby / CPU Only',
        icon: Layers,
        positive: false,
        note: 'Mencegah crash CUDA OOM karena praktikum dasar murni membutuhkan CPU.',
      },
      {
        label: 'Jatah RAM Host',
        from: '3.0 GB per Mahasiswa',
        to: '2.0 GB per Mahasiswa',
        icon: Cpu,
        positive: null,
        note: 'Koding dasar rata-rata hanya mengonsumsi 200–500 MB RAM.',
      },
      {
        label: 'Jalur Riset (Level 1)',
        from: 'Dedicated GPU 0 (60 GB)',
        to: 'Tetap Terisolasi Penuh di GPU 0',
        icon: ShieldCheck,
        positive: true,
        note: 'Mahasiswa skripsi/dosen tidak akan terpengaruh sama sekali.',
      },
    ],
    confirmBtnClass: 'bg-sky-600 hover:bg-sky-700 text-white',
    confirmBtnText: 'Terapkan Mode Dasar (60 Slot)',
  } : {
    title: 'Beralih ke Mode Praktikum AI',
    targetName: 'Mode Praktikum AI (1 Kelas)',
    targetSlots: 30,
    currentSlots: 60,
    accentColor: 'text-violet-600',
    badgeBg: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: Sparkles,
    description: 'Mengaktifkan akselerasi GPU 1 (NVIDIA RTX 5060 Ti) untuk praktikum Machine Learning & Deep Learning (PyTorch/TensorFlow).',
    changes: [
      {
        label: 'Kapasitas Kuota',
        from: '60 Slot Mahasiswa',
        to: '30 Slot Mahasiswa (1 Kelas AI)',
        icon: Users,
        positive: null,
        note: 'Membatasi persaingan VRAM agar proses training model berjalan lancar.',
      },
      {
        label: 'Akselerasi GPU 1',
        from: 'Standby / CPU Only',
        to: 'Aktif (Shared Pool 16 GB)',
        icon: Layers,
        positive: true,
        note: 'Mahasiswa dapat mengeksekusi model neural network dengan CUDA.',
      },
      {
        label: 'Jatah RAM Host',
        from: '2.0 GB per Mahasiswa',
        to: '3.0 GB per Mahasiswa',
        icon: Cpu,
        positive: true,
        note: 'Memberi ruang ekstra untuk memuat dataset citra/vektor ke memori.',
      },
      {
        label: 'Jalur Riset (Level 1)',
        from: 'Dedicated GPU 0 (60 GB)',
        to: 'Tetap Terisolasi Penuh di GPU 0',
        icon: ShieldCheck,
        positive: true,
        note: 'Mahasiswa skripsi/dosen tidak akan terpengaruh sama sekali.',
      },
    ],
    confirmBtnClass: 'bg-violet-600 hover:bg-violet-700 text-white',
    confirmBtnText: 'Terapkan Mode Praktikum AI (30 Slot)',
  };

  const IconHeader = modeConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col motion-card">
        
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
                Konfirmasi perubahan alokasi hardware dan kuota operasional klaster
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

          {/* Sesi Berjalan Notice */}
          {activeCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="leading-relaxed">
                <strong>{activeCount} Mahasiswa Sedang Aktif:</strong> Sesi koding yang sedang berlangsung <u>tidak akan terputus</u>. Kebijakan baru akan langsung berlaku untuk mahasiswa yang login berikutnya.
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
            className={`px-5 py-2 rounded-xl text-xs font-semibold ${modeConfig.confirmBtnClass} transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50 min-h-[42px] cursor-pointer active:translate-y-0.5`}
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
