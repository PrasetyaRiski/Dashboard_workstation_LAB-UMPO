import React from 'react';
import { AlertTriangle, X, ShieldAlert, Shield } from 'lucide-react';

export default function KillConfirmModal({ isOpen, processInfo, onConfirm, onClose, isSubmitting }) {
  if (!isOpen || !processInfo) return null;
  const { pid, username, procName, cmdline, vramMb, is_system } = processInfo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 motion-backdrop">
      <div className={`w-full max-w-md bg-white border ${
        is_system ? 'border-amber-300' : 'border-rose-300'
      } rounded-xl shadow-lg overflow-hidden flex flex-col motion-modal-pop`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          is_system ? 'border-amber-200 bg-amber-50/50' : 'border-rose-200 bg-rose-50/50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 ${
              is_system 
                ? 'bg-amber-100 border border-amber-200 text-amber-800' 
                : 'bg-rose-100 border border-rose-200 text-rose-800'
            }`}>
              {is_system ? <Shield className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                {is_system ? 'Proses Sistem Terproteksi' : 'Konfirmasi Penghentian Proses'}
              </h3>
              <p className={`text-xs font-mono font-medium ${is_system ? 'text-amber-800' : 'text-rose-800'}`}>
                {is_system ? 'Proteksi Keamanan Inti Server' : 'SIGTERM / SIGKILL Aksi Administratif'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors border border-slate-200"
            type="button"
            aria-label="Tutup Dialog"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {is_system ? (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-amber-800 font-semibold">Aksi Diblokir:</strong> Proses ini adalah layanan sistem penting bagi stabilitas workstation dan tidak diizinkan untuk dihentikan paksa.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Tindakan ini akan menghentikan eksekusi pelatihan model secara paksa. Seluruh checkpoint atau data dalam memori proses yang belum tersimpan akan hilang.
            </p>
          )}

          {/* Process Metadata Details Panel */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden font-mono text-xs">
            <div className="flex justify-between items-center px-3 py-2 border-b border-slate-200">
              <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Pemilik Sesi</span>
              <span className="text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">{username}</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2 border-b border-slate-200">
              <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">PID Proses</span>
              <span className="text-slate-900 font-bold tabular-nums">{pid}</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2 border-b border-slate-200">
              <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Nama Eksekusi</span>
              <span className="text-slate-800 font-semibold">{procName}</span>
            </div>
            {vramMb !== undefined && (
              <div className="flex justify-between items-center px-3 py-2">
                <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">VRAM Dibebaskan</span>
                <span className="text-emerald-700 font-bold tabular-nums bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{vramMb} MB</span>
              </div>
            )}

            {cmdline && (
              <div className="p-3 bg-slate-100 border-t border-slate-200">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Perintah Lengkap</p>
                <code className="block text-[11px] text-slate-700 break-all p-2 bg-white rounded border border-slate-200">
                  {cmdline}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 rounded-md bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 border border-slate-300 transition-colors motion-press disabled:opacity-50"
          >
            {is_system ? 'Tutup' : 'Batal'}
          </button>
          {!is_system && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors motion-press flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                'Memproses…'
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Hentikan Proses {pid}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
