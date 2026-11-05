import React from 'react';
import { AlertTriangle, X, ShieldAlert, Shield } from 'lucide-react';

export default function KillConfirmModal({ isOpen, processInfo, onConfirm, onClose, isSubmitting }) {
  if (!isOpen || !processInfo) return null;
  const { pid, username, procName, cmdline, vramMb, is_system } = processInfo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 font-sans">
      <div className={`w-full max-w-md bg-white border ${
        is_system ? 'border-amber-200' : 'border-rose-200'
      } rounded-xl shadow-xl overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          is_system ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 flex items-center justify-center rounded-xl shrink-0 ${
              is_system 
                ? 'bg-white border border-amber-200 text-amber-700' 
                : 'bg-white border border-rose-200 text-rose-600'
            }`}>
              {is_system ? <Shield className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                {is_system ? 'Proses Sistem Terproteksi' : 'Konfirmasi Penghentian Proses'}
              </h3>
              <p className={`text-xs font-mono font-medium ${is_system ? 'text-amber-700' : 'text-rose-600'}`}>
                {is_system ? 'Proteksi Keamanan Inti Server' : 'SIGTERM / SIGKILL Aksi Administratif'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-slate-200 bg-white cursor-pointer"
            type="button"
            aria-label="Tutup Dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {is_system ? (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="font-semibold">Aksi Diblokir:</strong> Proses ini adalah layanan sistem penting bagi stabilitas workstation dan tidak diizinkan untuk dihentikan paksa.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan menghentikan eksekusi pelatihan model secara paksa. Seluruh checkpoint atau data dalam memori proses yang belum tersimpan akan hilang.
            </p>
          )}

          {/* Process Metadata Details Panel */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden font-mono text-xs">
            <div className="flex justify-between items-center px-3.5 py-2.5 border-b border-slate-200">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Pemilik Sesi</span>
              <span className="text-slate-900 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">{username}</span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2.5 border-b border-slate-200">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">PID Proses</span>
              <span className="text-slate-900 font-bold tabular-nums">{pid}</span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2.5 border-b border-slate-200">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Nama Eksekusi</span>
              <span className="text-slate-900 font-medium truncate max-w-[200px]" title={procName}>{procName}</span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Alokasi VRAM</span>
              <span className="text-rose-600 font-bold tabular-nums">{vramMb || 0} MB</span>
            </div>
          </div>

          {cmdline && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-500 break-all max-h-24 overflow-y-auto">
              <span className="text-slate-800 font-semibold block mb-1">Command line:</span>
              {cmdline}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors min-h-[44px] cursor-pointer bg-white"
              type="button"
            >
              Batal
            </button>
            {!is_system && (
              <button
                onClick={onConfirm}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50 min-h-[44px] cursor-pointer"
                type="button"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menghentikan...</span>
                  </>
                ) : (
                  <span>Hentikan Paksa (SIGKILL)</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
