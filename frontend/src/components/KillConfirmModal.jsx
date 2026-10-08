import React from 'react';
import { AlertTriangle, X, ShieldAlert, Shield } from 'lucide-react';

export default function KillConfirmModal({ isOpen, processInfo, onConfirm, onClose, isSubmitting }) {
  if (!isOpen || !processInfo) return null;
  const { pid, username, procName, cmdline, vramMb, is_system } = processInfo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black ">
      <div className={`w-full max-w-md overflow-hidden bg-[#181b25] border ${is_system ? 'border-amber-500/30' : 'border-rose-500/30'} rounded-xl shadow-sm animate-in fade-in zoom-in-95 duration-200`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center rounded-xl shrink-0 ${is_system ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
              {is_system
                ? <Shield className="w-5 h-5" />
                : <ShieldAlert className="w-5 h-5" />
              }
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#dfe2ef] tracking-tight">
                {is_system ? 'Proses Sistem Terproteksi' : 'Konfirmasi Hentikan Proses'}
              </h3>
              <p className={`text-[11px] mt-0.5 ${is_system ? 'text-amber-500' : 'text-rose-500'}`}>
                {is_system
                  ? 'Proteksi Keamanan Inti Server'
                  : 'SIGTERM / SIGKILL — Tindakan Administratif'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1c1f29] border border-[#46455430] text-[#908fa0] hover:text-[#dfe2ef] hover:border-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-5">
          {is_system ? (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Shield className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
              <p className="text-xs text-[#c7c4d7] leading-relaxed">
                <strong className="text-amber-500 font-bold">Dilarang:</strong> Proses ini adalah layanan/proses sistem yang penting bagi stabilitas klaster server. Tindakan mematikan proses ini diblokir demi keamanan.
              </p>
            </div>
          ) : (
            <p className="text-xs text-[#908fa0] leading-relaxed">
              Apakah Anda yakin ingin mematikan paksa proses komputasi ini? Pekerjaan pelatihan model AI yang sedang berjalan akan terhenti seketika dan tidak dapat dikembalikan.
            </p>
          )}

          {/* Process info panel */}
          <div className="bg-[#0a0e17] rounded-xl border border-[#46455430] overflow-hidden">
            {[
              { label: 'Pemilik Proses', value: username, valueClass: 'text-indigo-400' },
              { label: 'PID',            value: pid,      valueClass: 'text-[#dfe2ef]' },
              { label: 'Nama Eksekusi',  value: procName, valueClass: 'text-[#4edea3]' },
              ...(vramMb !== undefined
                ? [{ label: 'Konsumsi VRAM', value: `${vramMb} MB`, valueClass: 'text-amber-400' }]
                : []),
            ].map(({ label, value, valueClass }) => (
              <div key={label} className="flex justify-between items-center p-3 border-b border-[#46455430] last:border-b-0">
                <span className="text-xs text-[#908fa0] font-mono uppercase tracking-wider">{label}</span>
                <span className={`text-xs font-bold font-mono ${valueClass}`}>{value}</span>
              </div>
            ))}
            {cmdline && (
              <div className="p-3 bg-[#1c1f29]/50 border-t border-[#46455430]">
                <p className="text-[10px] text-[#908fa0] font-mono uppercase tracking-wider mb-1.5">Command Line</p>
                <code className="block text-[11px] text-[#c7c4d7] font-mono break-all p-2 bg-[#0a0e17] rounded-lg border border-[#46455420]">
                  {cmdline}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-700/50 bg-[#181b25]/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-[#1c1f29] border border-[#46455430] text-xs font-semibold text-[#908fa0] hover:text-[#dfe2ef] hover:border-slate-600 transition-colors disabled:opacity-50"
          >
            {is_system ? 'Tutup' : 'Batal'}
          </button>
          {!is_system && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 disabled:text-rose-400 border border-transparent text-white text-xs font-bold transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                'Memproses…'
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Hentikan Proses
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
