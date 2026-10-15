import React, { useState } from 'react';
import { Lock, Key, X, AlertCircle, ShieldCheck, UserCheck } from 'lucide-react';

export default function AdminPinModal({ isOpen, onSuccess, onClose }) {
  const [loginMode, setLoginMode] = useState('simtik'); // 'simtik' | 'pin'
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (loginMode === 'simtik') {
      if (!nim.trim() || !password) {
        setErrorMsg('Harap masukkan NIM dan Password SIMTIK.');
        return;
      }
    } else {
      if (!pin.trim()) {
        setErrorMsg('Harap masukkan PIN Master Admin.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const payload = loginMode === 'simtik'
        ? { nim: nim.trim(), password }
        : { pin: pin.trim() };

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess(data.token, data.role || 'admin', data.user || null);
        setNim('');
        setPassword('');
        setPin('');
        onClose();
      } else {
        setErrorMsg(data.detail || 'Login gagal. Periksa kembali kredensial Anda.');
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server backend atau sistem SIMTIK.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm motion-backdrop">
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.15),0_0_0_1px_rgba(255,255,255,0.8)] overflow-hidden flex flex-col motion-modal-pop">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 shadow-sm shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                Autentikasi Hak Akses Lab
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Lab Komputasi AI & Riset — TI UMPO
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Mode Selector */}
        <div className="flex p-2 gap-2 border-b border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={() => { setLoginMode('simtik'); setErrorMsg(''); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center gap-2 ${
              loginMode === 'simtik'
                ? 'bg-white text-blue-700 border border-blue-200 shadow-[0_2px_4px_rgba(37,99,235,0.1)]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Akun SIMTIK (Aslab)</span>
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('pin'); setErrorMsg(''); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center gap-2 ${
              loginMode === 'pin'
                ? 'bg-white text-amber-700 border border-amber-200 shadow-[0_2px_4px_rgba(245,158,11,0.1)]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-600" />
            <span>PIN Master (Admin)</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            {loginMode === 'simtik'
              ? 'Gunakan akun SIMTIK untuk mengaktifkan wewenang operator monitoring dan penghentian proses mahasiswa.'
              : 'Gunakan PIN Master Teknisi untuk pemeliharaan inti dan wewenang penuh cluster.'
            }
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {loginMode === 'simtik' ? (
              <>
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                    NIM Mahasiswa / Akun Aslab
                  </label>
                  <input
                    type="text"
                    value={nim}
                    onChange={e => setNim(e.target.value)}
                    placeholder="Contoh: 22533..."
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl py-2.5 px-3.5 text-xs font-mono text-slate-900 outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Password SIMTIK
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan password SSO..."
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-[11px] font-mono font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  PIN Master Admin
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="Ketik PIN Master…"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 rounded-xl py-2.5 pl-10 pr-3.5 text-xs font-mono tracking-widest text-slate-900 outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 shadow-[0_2px_0_#cbd5e1,0_2px_4px_rgba(0,0,0,0.03)] active:translate-y-0.5 transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-semibold shadow-[0_2px_0_#1d4ed8,0_4px_10px_rgba(37,99,235,0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_#1d4ed8] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  'Memverifikasi…'
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Masuk Konsol</span>
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
