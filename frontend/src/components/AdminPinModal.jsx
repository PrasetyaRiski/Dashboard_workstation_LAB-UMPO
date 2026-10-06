import React from 'react';
import { Lock, Key, X, AlertCircle, ShieldCheck } from 'lucide-react';

export default function AdminPinModal({ isOpen, onSuccess, onClose }) {
  const [pin, setPin] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin.trim()) { setErrorMsg('Masukkan PIN Admin.'); return; }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res  = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (res.ok && data.success) { onSuccess(data.token); setPin(''); onClose(); }
      else setErrorMsg(data.detail || 'PIN Admin salah. Akses ditolak.');
    } catch { setErrorMsg('Gagal terhubung ke server verifikasi.'); }
    finally  { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-sm overflow-hidden bg-[#181b25] border border-slate-700 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.2)]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#dfe2ef] tracking-tight">
                Akses Kontrol Admin
              </h3>
              <p className="text-[11px] text-[#908fa0] mt-0.5">
                Lab Komputasi AI — TI UMPO
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
        <div className="p-5">
          <p className="text-xs text-[#908fa0] mb-5 leading-relaxed">
            Tindakan administratif (Kill Process & Reset Password) dilindungi PIN untuk mencegah eksekusi tanpa izin.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-mono font-medium text-[#c7c4d7] mb-2 uppercase tracking-wider">
                PIN Admin
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#908fa0]" />
                <input
                  type="password"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="Ketik PIN Admin…"
                  className="w-full bg-[#0a0e17] border border-[#46455430] rounded-xl py-2.5 pl-10 pr-4 text-sm font-mono tracking-[0.2em] text-[#dfe2ef] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:tracking-normal placeholder:text-[#908fa0]"
                  autoFocus
                />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="text-xs text-rose-400">{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-[#1c1f29] border border-[#46455430] text-xs font-semibold text-[#908fa0] hover:text-[#dfe2ef] hover:border-slate-600 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-indigo-400 border border-transparent text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  'Memverifikasi…'
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Buka Akses Admin
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
