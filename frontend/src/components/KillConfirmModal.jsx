import React from 'react';
import { AlertTriangle, X, ShieldAlert, Shield } from 'lucide-react';

export default function KillConfirmModal({ isOpen, processInfo, onConfirm, onClose, isSubmitting }) {
  if (!isOpen || !processInfo) return null;
  const { pid, username, procName, cmdline, vramMb, is_system } = processInfo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className={`w-full max-w-md bg-[#18181b] border ${
        is_system ? 'border-[rgba(245,158,11,0.3)]' : 'border-[rgba(244,63,94,0.3)]'
      } rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.45)] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.08)] bg-[#111114]">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 ${
              is_system 
                ? 'bg-[rgba(245,158,11,0.12)] text-[#fbbf24]' 
                : 'bg-[rgba(244,63,94,0.12)] text-[#fb7185]'
            }`}>
              {is_system ? <Shield className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#fafafa] tracking-tight">
                {is_system ? 'Proses Sistem Terproteksi' : 'Konfirmasi Hentikan Proses'}
              </h3>
              <p className={`text-[11px] font-mono mt-0.5 ${is_system ? 'text-[#fbbf24]' : 'text-[#fb7185]'}`}>
                {is_system ? 'Proteksi Keamanan Inti Server' : 'SIGTERM / SIGKILL Aksi Administratif'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
            type="button"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {is_system ? (
            <div className="p-3 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-xs text-[#fafafa] flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-[#fbbf24] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-[#fbbf24]">Aksi Diblokir:</strong> Proses ini adalah layanan sistem penting bagi stabilitas server dan tidak diizinkan untuk dimatikan.
              </p>
            </div>
          ) : (
            <p className="text-xs text-[#a1a1aa] leading-relaxed">
              Tindakan ini akan menghentikan eksekusi pelatihan model secara paksa. Seluruh checkpoint atau data dalam memori yang belum disimpan akan hilang.
            </p>
          )}

          {/* Process Metadata Details Panel */}
          <div className="bg-[#111114] rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden font-mono text-xs">
            <div className="flex justify-between items-center px-3 py-2 border-b border-[rgba(255,255,255,0.06)]">
              <span className="text-[#71717a] text-[11px] uppercase tracking-wider">Pemilik Sesi</span>
              <span className="text-[#818cf8] font-semibold">{username}</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2 border-b border-[rgba(255,255,255,0.06)]">
              <span className="text-[#71717a] text-[11px] uppercase tracking-wider">PID Proses</span>
              <span className="text-[#fafafa] font-bold tabular-nums">{pid}</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2 border-b border-[rgba(255,255,255,0.06)]">
              <span className="text-[#71717a] text-[11px] uppercase tracking-wider">Nama Eksekusi</span>
              <span className="text-[#38bdf8] font-medium">{procName}</span>
            </div>
            {vramMb !== undefined && (
              <div className="flex justify-between items-center px-3 py-2">
                <span className="text-[#71717a] text-[11px] uppercase tracking-wider">VRAM Dibebaskan</span>
                <span className="text-[#34d399] font-bold tabular-nums">{vramMb} MB</span>
              </div>
            )}

            {cmdline && (
              <div className="p-3 bg-[#09090b] border-t border-[rgba(255,255,255,0.08)]">
                <p className="text-[10px] text-[#71717a] uppercase tracking-wider mb-1">Perintah Lengkap</p>
                <code className="block text-[11px] text-[#a1a1aa] break-all p-2 bg-[#18181b] rounded border border-[rgba(255,255,255,0.06)]">
                  {cmdline}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-4 py-3 border-t border-[rgba(255,255,255,0.08)] bg-[#111114]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-xs font-medium text-[#a1a1aa] hover:text-[#fafafa] transition-colors disabled:opacity-50"
          >
            {is_system ? 'Tutup' : 'Batal'}
          </button>
          {!is_system && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-[#f43f5e] hover:bg-[#e11d48] disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
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
