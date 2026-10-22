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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden flex flex-col motion-modal-pop">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-[#1a73e8] shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                Autentikasi Hak Akses Lab
              </h3>
              <p className="text-xs text-slate-500 font-sans">
                Lab Komputasi AI & Riset — TI UMPO
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

        {/* Mode Selector Tabs (Google Cloud Style) */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1 gap-1">
          <button
            type="button"
            onClick={() => { setLoginMode('simtik'); setErrorMsg(''); }}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-mono font-medium transition-colors flex items-center justify-center gap-2 ${
              loginMode === 'simtik'
                ? 'bg-white text-blue-700 border border-slate-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-[#1a73e8]" />
            <span>Akun SIMTIK (Aslab)</span>
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('pin'); setErrorMsg(''); }}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-mono font-medium transition-colors flex items-center justify-center gap-2 ${
              loginMode === 'pin'
                ? 'bg-white text-amber-800 border border-slate-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-600" />
            <span>PIN Master (Admin)</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5">
          <p className="text-xs text-slate-500 mb-4 leading-relaxed font-sans">
            {loginMode === 'simtik'
              ? 'Gunakan akun SIMTIK untuk mengaktifkan wewenang operator monitoring dan pengelolaan sesi mahasiswa.'
              : 'Gunakan PIN Master Teknisi untuk pemeliharaan inti dan wewenang penuh klaster.'
            }
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {loginMode === 'simtik' ? (
              <>
                <div>
                  <label className="block text-[11px] font-mono font-medium text-slate-600 mb-1 uppercase tracking-wider">
                    NIM Mahasiswa / Akun Aslab
                  </label>
                  <input
                    type="text"
                    value={nim}
                    onChange={e => setNim(e.target.value)}
                    placeholder="Contoh: 22533..."
                    className="w-full bg-white border border-slate-300 focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] rounded-md py-2 px-3 text-xs font-mono text-slate-900 outline-none transition-colors"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-medium text-slate-600 mb-1 uppercase tracking-wider">
                    Password SIMTIK
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan password SSO..."
                    className="w-full bg-white border border-slate-300 focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] rounded-md py-2 px-3 text-xs text-slate-900 outline-none transition-colors"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-600 mb-1 uppercase tracking-wider">
                  PIN Master Admin
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="Ketik PIN Master…"
                    className="w-full bg-white border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md py-2 pl-9 pr-3 text-xs font-mono tracking-widest text-slate-900 outline-none transition-colors"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-md bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 border border-slate-300 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-1.5 rounded-md bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isLoading ? (
                  'Memverifikasi…'
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
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
