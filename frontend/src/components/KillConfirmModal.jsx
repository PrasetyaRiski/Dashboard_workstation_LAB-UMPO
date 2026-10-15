import React from 'react';
import { AlertTriangle, X, ShieldAlert, Shield } from 'lucide-react';

export default function KillConfirmModal({ isOpen, processInfo, onConfirm, onClose, isSubmitting }) {
  if (!isOpen || !processInfo) return null;
  const { pid, username, procName, cmdline, vramMb, is_system } = processInfo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm motion-backdrop">
      <div className={`w-full max-w-md bg-white border ${
        is_system ? 'border-amber-200' : 'border-rose-200'
      } rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.15)] overflow-hidden flex flex-col motion-modal-pop`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${
          is_system ? 'border-amber-100 bg-amber-50/40' : 'border-rose-100 bg-rose-50/40'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 flex items-center justify-center rounded-xl shrink-0 shadow-sm ${
              is_system 
                ? 'bg-amber-100/80 border border-amber-200 text-amber-700' 
                : 'bg-rose-100/80 border border-rose-200 text-rose-700'
            }`}>
              {is_system ? <Shield className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                {is_system ? 'Proses Sistem Terproteksi' : 'Konfirmasi Hentikan Proses'}
              </h3>
              <p className={`text-xs font-mono font-medium mt-0.5 ${is_system ? 'text-amber-700' : 'text-rose-700'}`}>
                {is_system ? 'Proteksi Keamanan Inti Server' : 'SIGTERM / SIGKILL Aksi Administratif'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/80 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors border border-slate-200/60 shadow-sm"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          {is_system ? (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
              <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-amber-800 font-semibold">Aksi Diblokir:</strong> Proses ini adalah layanan sistem penting bagi stabilitas server dan tidak diizinkan untuk dimatikan.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan menghentikan eksekusi pelatihan model secara paksa. Seluruh checkpoint atau data dalam memori yang belum disimpan akan hilang.
            </p>
          )}

          {/* Process Metadata Details Panel - 3D Inset Card */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200/90 overflow-hidden font-mono text-xs shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200/70">
              <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Pemilik Sesi</span>
              <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">{username}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200/70">
              <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">PID Proses</span>
              <span className="text-slate-900 font-bold tabular-nums">{pid}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200/70">
              <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Nama Eksekusi</span>
              <span className="text-slate-800 font-semibold">{procName}</span>
            </div>
            {vramMb !== undefined && (
              <div className="flex justify-between items-center px-4 py-2.5">
                <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">VRAM Dibebaskan</span>
                <span className="text-emerald-700 font-bold tabular-nums bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">{vramMb} MB</span>
              </div>
            )}

            {cmdline && (
              <div className="p-3.5 bg-slate-100/70 border-t border-slate-200/80">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5">Perintah Lengkap</p>
                <code className="block text-[11px] text-slate-700 break-all p-2.5 bg-white rounded-lg border border-slate-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                  {cmdline}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 shadow-[0_2px_0_#cbd5e1,0_2px_4px_rgba(0,0,0,0.03)] active:translate-y-0.5 transition-all disabled:opacity-50"
          >
            {is_system ? 'Tutup' : 'Batal'}
          </button>
          {!is_system && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-semibold shadow-[0_2px_0_#be123c,0_4px_10px_rgba(244,63,94,0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_#be123c] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                'Memproses…'
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
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
