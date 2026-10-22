import React from 'react';
import { AlertTriangle, X, ShieldAlert, Shield } from 'lucide-react';

export default function KillConfirmModal({ isOpen, processInfo, onConfirm, onClose, isSubmitting }) {
  if (!isOpen || !processInfo) return null;
  const { pid, username, procName, cmdline, vramMb, is_system } = processInfo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2E2018]/60 backdrop-blur-xs font-sans">
      <div className={`w-full max-w-md bg-[#F3EBDD] border ${
        is_system ? 'border-[#FDE68A]' : 'border-[#FCA5A5]'
      } rounded-2xl shadow-warm-modal overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          is_system ? 'border-[#FDE68A] bg-[#FEF3C7]' : 'border-[#FCA5A5] bg-[#FEE2E2]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 flex items-center justify-center rounded-xl shrink-0 ${
              is_system 
                ? 'bg-[#FEF3C7] border border-[#FDE68A] text-[#B45309]' 
                : 'bg-[#FEE2E2] border border-[#FCA5A5] text-[#C53030]'
            }`}>
              {is_system ? <Shield className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-[#2E2018] tracking-tight">
                {is_system ? 'Proses Sistem Terproteksi' : 'Konfirmasi Penghentian Proses'}
              </h3>
              <p className={`text-xs font-mono font-medium ${is_system ? 'text-[#B45309]' : 'text-[#C53030]'}`}>
                {is_system ? 'Proteksi Keamanan Inti Server' : 'SIGTERM / SIGKILL Aksi Administratif'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#FAF6EF] hover:bg-[#EFE6D8] text-[#7A6A5C] hover:text-[#2E2018] transition-colors border border-[#E4D8C3] cursor-pointer"
            type="button"
            aria-label="Tutup Dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {is_system ? (
            <div className="p-3.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-xs text-[#B45309] flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="font-semibold">Aksi Diblokir:</strong> Proses ini adalah layanan sistem penting bagi stabilitas workstation dan tidak diizinkan untuk dihentikan paksa.
              </p>
            </div>
          ) : (
            <p className="text-xs text-[#3B2E26] leading-relaxed">
              Tindakan ini akan menghentikan eksekusi pelatihan model secara paksa. Seluruh checkpoint atau data dalam memori proses yang belum tersimpan akan hilang.
            </p>
          )}

          {/* Process Metadata Details Panel */}
          <div className="bg-[#FAF6EF] rounded-xl border border-[#E4D8C3] overflow-hidden font-mono text-xs">
            <div className="flex justify-between items-center px-3.5 py-2.5 border-b border-[#E4D8C3]">
              <span className="text-[#7A6A5C] text-[11px] font-semibold uppercase tracking-wider">Pemilik Sesi</span>
              <span className="text-[#2E2018] font-bold bg-[#F3EBDD] px-2 py-0.5 rounded-md border border-[#E4D8C3]">{username}</span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2.5 border-b border-[#E4D8C3]">
              <span className="text-[#7A6A5C] text-[11px] font-semibold uppercase tracking-wider">PID Proses</span>
              <span className="text-[#2E2018] font-bold tabular-nums">{pid}</span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2.5 border-b border-[#E4D8C3]">
              <span className="text-[#7A6A5C] text-[11px] font-semibold uppercase tracking-wider">Nama Eksekusi</span>
              <span className="text-[#2E2018] font-medium truncate max-w-[200px]" title={procName}>{procName}</span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-[#7A6A5C] text-[11px] font-semibold uppercase tracking-wider">Alokasi VRAM</span>
              <span className="text-[#C53030] font-bold tabular-nums">{vramMb || 0} MB</span>
            </div>
          </div>

          {cmdline && (
            <div className="p-3 bg-[#FAF6EF] rounded-xl border border-[#E4D8C3] text-[11px] font-mono text-[#7A6A5C] break-all max-h-24 overflow-y-auto">
              <span className="text-[#2E2018] font-semibold block mb-1">Command line:</span>
              {cmdline}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E4D8C3]">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#3B2E26] hover:bg-[#EFE6D8] border border-[#E4D8C3] transition-colors min-h-[44px] cursor-pointer"
              type="button"
            >
              Batal
            </button>
            {!is_system && (
              <button
                onClick={onConfirm}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#C53030] hover:bg-[#9B2C2C] text-white transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50 min-h-[44px] cursor-pointer"
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
