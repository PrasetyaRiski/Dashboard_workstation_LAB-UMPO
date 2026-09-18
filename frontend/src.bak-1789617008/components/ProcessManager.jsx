import React, { memo } from 'react';
import {
  Cpu,
  XCircle,
  Play,
  Square,
  Lock,
  ShieldAlert,
  Activity,
  Zap,
  Terminal,
  AlertCircle
} from 'lucide-react';

function ProcessManager({
  processes = [],
  isAdmin,
  onOpenKillModal,
  onRunSimulation,
  onStopSimulation,
  isSimulating,
  onOpenPinModal
}) {
  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Manajemen Proses & Job Komputasi GPU
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {processes.length} Job Berjalan
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Daftar seluruh proses PyTorch/CUDA mahasiswa di GPU 0 & GPU 1 yang dapat dihentikan (Kill).
          </p>
        </div>

        {/* Action Controls for Admin */}
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin ? (
            <>
              <button
                onClick={onRunSimulation}
                disabled={isSimulating}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Luncurkan komputasi PyTorch di 11 akun untuk menguji fitur Kill"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Uji Simulasi Komputasi (11 User)</span>
              </button>

              <button
                onClick={onStopSimulation}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 text-xs font-semibold border border-slate-700 hover:border-rose-500/30 transition flex items-center gap-1.5 cursor-pointer"
                title="Hentikan semua proses simulasi"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Bersihkan Semua</span>
              </button>
            </>
          ) : (
            <button
              onClick={onOpenPinModal}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Buka Admin untuk Kontrol Kill</span>
            </button>
          )}
        </div>
      </div>

      {/* Table / List */}
      {processes.length === 0 ? (
        <div className="p-8 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-300">
              Saat ini belum ada mahasiswa yang menjalankan proses komputasi di GPU.
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              Ketika praktikan login SSH dan menjalankan skrip Python PyTorch, rincian job beserta tombol <strong className="text-rose-400">[🔴 HENTIKAN PROSES / KILL]</strong> akan otomatis muncul di tabel ini.
            </p>
          </div>

          {isAdmin ? (
            <div className="pt-2">
              <button
                onClick={onRunSimulation}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition inline-flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Jalankan Uji Coba Komputasi 11 User Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="pt-1 text-[11px] text-slate-500 font-mono">
              💡 Tip: Mode Penonton (Read-Only) hanya dapat memantau telemetri.
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Praktikan</th>
                <th className="py-2.5 px-3">PID</th>
                <th className="py-2.5 px-3">GPU</th>
                <th className="py-2.5 px-3">Nama Proses / Skrip</th>
                <th className="py-2.5 px-3">VRAM</th>
                <th className="py-2.5 px-3">CPU</th>
                <th className="py-2.5 px-3 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {processes.map((proc) => {
                const isRiset = proc.username === 'labriset';
                return (
                  <tr key={proc.pid} className="hover:bg-slate-950/40 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs">{proc.username}</span>
                        {isRiset && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Riset
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{proc.pid}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold text-[11px]">
                        {proc.gpu_name}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate text-slate-200">
                      <span className="font-semibold block truncate" title={proc.cmdline || proc.name}>
                        {proc.name}
                      </span>
                      {proc.cmdline && (
                        <span className="text-[10px] text-slate-500 block truncate" title={proc.cmdline}>
                          {proc.cmdline}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-amber-400 font-bold">{proc.vram_mb} MB</td>
                    <td className="py-3 px-3 text-slate-300">{proc.cpu_percent}%</td>
                    <td className="py-3 px-3 text-right">
                      {isAdmin ? (
                        <button
                          onClick={() =>
                            onOpenKillModal({
                              pid: proc.pid,
                              username: proc.username,
                              procName: proc.name,
                              cmdline: proc.cmdline,
                              vramMb: proc.vram_mb
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-sans text-xs font-semibold shadow-md shadow-rose-600/30 transition inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Kill Process</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-sans">
                          <Lock className="w-3 h-3" /> Read-Only
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default memo(ProcessManager);
