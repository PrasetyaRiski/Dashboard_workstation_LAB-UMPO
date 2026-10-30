import React from 'react';
import { AlertTriangle, X, ShieldAlert, Cpu } from 'lucide-react';

export default function KillConfirmModal({ isOpen, processInfo, onConfirm, onClose, isSubmitting }) {
  if (!isOpen || !processInfo) return null;

  const { pid, username, procName, cmdline, vramMb } = processInfo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute -right-12 -top-12 w-36 h-36 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Konfirmasi Hentikan Proses</h3>
              <p className="text-xs text-rose-400/90 font-medium">Tindakan Administratif (SIGTERM / SIGKILL)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          <p className="text-xs text-slate-300 leading-relaxed">
            Apakah Anda yakin ingin mematikan paksa proses komputasi ini? Pekerjaan pelatihan model AI yang sedang berjalan pada proses ini akan terhenti seketika.
          </p>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">User Praktikan :</span>
              <span className="text-indigo-400 font-bold">{username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">PID Proses :</span>
              <span className="text-slate-200 font-bold">{pid}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Nama Eksekusi :</span>
              <span className="text-emerald-400 font-bold truncate max-w-[200px]">{procName}</span>
            </div>
            {vramMb !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-500">Konsumsi VRAM :</span>
                <span className="text-amber-400 font-bold">{vramMb} MB</span>
              </div>
            )}
            {cmdline && (
              <div className="pt-1 border-t border-slate-800/80">
                <span className="text-slate-500 block mb-1 text-[11px]">Command Line :</span>
                <div className="text-[11px] text-slate-400 bg-slate-900 px-2 py-1.5 rounded truncate">
                  {cmdline}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition shadow-lg shadow-rose-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Memproses...</span>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Hentikan Proses</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
