import React, { useState } from 'react';
import { 
  X, DatabaseBackup, RotateCcw, AlertTriangle, ShieldCheck, 
  Check, Loader2, Calendar, HardDrive, KeyRound, Lock
} from 'lucide-react';

export default function DatabaseBackupModal({
  isOpen,
  onClose,
  backups = [],
  onTriggerBackup,
  isBackingUp,
  onRestoreBackup,
  adminRole,
  showToast,
}) {
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isSuperAdmin = adminRole === 'admin';

  const handleStartRestore = (backup) => {
    if (!isSuperAdmin) {
      showToast('Hanya Super Admin yang memiliki hak akses untuk memulihkan database.', 'error');
      return;
    }
    setSelectedBackup(backup);
    setPin('');
    setErrorMsg('');
  };

  const handleCancelRestore = () => {
    setSelectedBackup(null);
    setPin('');
    setErrorMsg('');
  };

  const handleConfirmRestore = async (e) => {
    e.preventDefault();
    if (!selectedBackup) return;
    if (!pin.trim()) {
      setErrorMsg('PIN Super Admin wajib diisi untuk verifikasi pemulihan.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    const res = await onRestoreBackup(selectedBackup.filename, pin.trim());
    setIsSubmitting(false);

    if (res?.success) {
      setSelectedBackup(null);
      setPin('');
    } else if (res?.message) {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col motion-card max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 bg-slate-50 text-slate-700 shadow-xs">
              <DatabaseBackup className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-slate-900 tracking-tight">
                Cadangan &amp; Pemulihan Database
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola snapshot cadangan dan pemulihan data sistem (lab_users.db)
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

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
          
          {/* Action Row */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 gap-3 flex-wrap">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Snapshot Otomatis Terjadwal
              </span>
              <span className="text-[11px] text-slate-500">
                Dicadangkan tiap pukul 02:00 WIB via Crontab (Retensi 14 hari)
              </span>
            </div>
            <button
              onClick={onTriggerBackup}
              disabled={isBackingUp}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold font-mono bg-slate-900 hover:bg-slate-800 text-white border border-slate-950 shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
              type="button"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Mencadangkan...</span>
                </>
              ) : (
                <>
                  <DatabaseBackup className="w-3.5 h-3.5" />
                  <span>Buat Backup Baru</span>
                </>
              )}
            </button>
          </div>

          {/* Restore Confirmation Prompt (If user selected a backup to restore) */}
          {selectedBackup && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-xs text-rose-900 uppercase tracking-wide">
                    Konfirmasi Pemulihan Database
                  </h4>
                  <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                    Anda akan memulihkan database dari snapshot: <strong className="font-mono">{selectedBackup.filename}</strong>.
                    Seluruh akun, mode lab, dan hak akses akan dikembalikan ke kondisi pada tanggal tersebut.
                  </p>
                  <p className="text-[11px] text-rose-700 mt-1.5 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Snapshot darurat dari database saat ini akan dibuat otomatis sebelum pemulihan.</span>
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-white border border-rose-300 text-xs text-rose-700 font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleConfirmRestore} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-rose-200/80">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Masukkan PIN Super Admin..."
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-rose-300 focus:border-rose-600 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCancelRestore}
                    disabled={isSubmitting}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-white border border-slate-200 transition-colors cursor-pointer bg-white/80"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>Memulihkan...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Pulihkan Database</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of Available Backups */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Daftar Snapshot Cadangan ({backups.length}):</span>
              <span className="text-[10px] text-slate-400 lowercase font-normal">terurut dari terbaru</span>
            </span>

            {backups.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                Belum ada berkas backup yang tersedia.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                {backups.map((b, idx) => {
                  const isPreRestore = b.is_safety_snapshot || b.filename.startsWith('pre_restore_');
                  return (
                    <div 
                      key={idx} 
                      className={`p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors ${
                        selectedBackup?.filename === b.filename ? 'bg-rose-50/40 border-l-4 border-l-rose-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          isPreRestore
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          <HardDrive className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-900 truncate">
                              {b.filename}
                            </span>
                            {isPreRestore && (
                              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Snapshot Darurat
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {b.created_at ? new Date(b.created_at).toLocaleString('id-ID') : '-'}
                            </span>
                            <span>•</span>
                            <span>{b.size_kb} KB</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleStartRestore(b)}
                        disabled={!isSuperAdmin || selectedBackup?.filename === b.filename}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 border transition-all shrink-0 ${
                          !isSuperAdmin
                            ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                            : selectedBackup?.filename === b.filename
                            ? 'bg-rose-100 text-rose-700 border-rose-300'
                            : 'bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border-slate-200 hover:border-rose-200 shadow-2xs cursor-pointer'
                        }`}
                        type="button"
                        title={isSuperAdmin ? `Pulihkan database dari ${b.filename}` : 'Hanya Super Admin yang dapat memulihkan database'}
                      >
                        <RotateCcw className="w-3 h-3 text-rose-500" />
                        <span>Pulihkan</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 shrink-0 text-xs text-slate-500">
          <span className="text-[11px]">
            {isSuperAdmin ? 'Akses Super Admin aktif untuk pemulihan.' : 'Mode Operator: Hanya Super Admin yang dapat memulihkan data.'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 border border-slate-200 transition-colors cursor-pointer bg-white"
            type="button"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
