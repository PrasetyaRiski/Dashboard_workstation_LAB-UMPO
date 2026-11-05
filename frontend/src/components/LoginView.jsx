import React, { useState } from 'react';
import { 
  Lock, Key, AlertCircle, ShieldCheck, UserCheck, Loader2
} from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [loginMode, setLoginMode] = useState('simtik'); // 'simtik' | 'pin'
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (loginMode === 'simtik') {
      if (!nim.trim() || !password) {
        setErrorMsg('NIM dan Password wajib diisi.');
        return;
      }
    } else {
      if (!pin.trim()) {
        setErrorMsg('PIN Operator wajib diisi.');
        return;
      }
    }

    setIsLoading(true);
    try {
      let res;
      if (loginMode === 'simtik') {
        res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nim: nim.trim(), password }),
        });
      } else {
        res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pin.trim() }),
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess(data.token, data.role || 'admin', data.user || null);
      } else {
        setErrorMsg(data.detail || data.message || 'Autentikasi gagal. Periksa kembali kredensial Anda.');
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server backend atau sistem otentikasi SIMTIK.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 selection:bg-slate-200 selection:text-slate-900 font-sans relative overflow-hidden">
      {/* Decorative Subtle Grid Lines */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(#0f172a 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-lg p-6 sm:p-8 flex flex-col gap-6 relative z-10 motion-card">
        {/* Header & Logo */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2 shadow-xs">
            <img 
              src="/ti-umpo-logo.png" 
              alt="Teknik Informatika UMPO" 
              className="w-full h-full object-contain"
            />
          </div>

          <div>
            <h1 className="font-sans font-bold text-lg sm:text-xl text-slate-900 tracking-tight">
              Konsol Manajemen Lab AI
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Teknik Informatika · Universitas Muhammadiyah Ponorogo
            </p>
          </div>
        </div>

        {/* Tab Mode Selector */}
        <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200 gap-1 font-mono text-xs">
          <button
            type="button"
            onClick={() => { setLoginMode('simtik'); setErrorMsg(''); }}
            className={`flex-1 py-2 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              loginMode === 'simtik'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Akun SIMTIK (SSO)</span>
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('pin'); setErrorMsg(''); }}
            className={`flex-1 py-2 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              loginMode === 'pin'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>PIN Root Operator</span>
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {loginMode === 'simtik' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  NIM Mahasiswa / Asisten Lab
                </label>
                <input
                  type="text"
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                  placeholder="Contoh: 21533001"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition-all min-h-[42px]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password SIMTIK
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition-all min-h-[42px]"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                PIN Master Server
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan kode otorisasi PIN…"
                className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition-all min-h-[42px]"
                autoFocus
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 min-h-[44px] cursor-pointer disabled:opacity-50 active:translate-y-0.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Memverifikasi Kredensial...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Masuk ke Konsol Dashboard</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Notice */}
        <div className="pt-3 border-t border-slate-100 flex flex-col gap-1.5 text-center">
          <p className="text-[11px] text-slate-400">
            Akses Terbatas: Hanya Asisten Laboratorium dan Administrator yang berhak masuk.
          </p>
        </div>
      </div>
    </div>
  );
}
