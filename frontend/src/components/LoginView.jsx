import React, { useState } from 'react';
import { 
  Lock, Key, AlertCircle, ShieldCheck, UserCheck, Loader2
} from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [loginMode, setLoginMode] = useState('simtik'); // 'simtik' | 'pin'
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
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
      if (!username.trim() || !pin.trim()) {
        setErrorMsg('Username dan PIN Master wajib diisi.');
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
          body: JSON.stringify({ username: username.trim(), pin: pin.trim() }),
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 selection:bg-slate-200 selection:text-slate-900 font-sans relative">
      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/80 border-t-[3px] border-t-slate-900 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-16px_rgba(15,23,42,0.14)] p-6 sm:p-8 flex flex-col gap-6 relative z-10">
        {/* Header & Logo */}
        <div className="flex flex-col items-center text-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2 shadow-xs">
            <img 
              src="/ti-umpo-logo.png" 
              alt="Teknik Informatika UMPO" 
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="academic-eyebrow">Program Studi Teknik Informatika</span>
            <h1 className="font-academic text-xl sm:text-[22px] text-slate-900 leading-snug">
              Konsol Manajemen Lab Komputasi
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Laboratorium Komputasi · Fakultas Teknik UMPO
            </p>
          </div>
        </div>

        {/* Tab Mode Selector */}
        <div className="flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 gap-1 font-sans text-xs">
          <button
            type="button"
            onClick={() => { setLoginMode('simtik'); setErrorMsg(''); }}
            className={`flex-1 py-2 rounded-lg font-medium transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center gap-1.5 cursor-pointer ${
              loginMode === 'simtik'
                ? 'bg-white text-slate-900 font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Akun SIMTIK (SSO)</span>
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('pin'); setErrorMsg(''); }}
            className={`flex-1 py-2 rounded-lg font-medium transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center gap-1.5 cursor-pointer ${
              loginMode === 'pin'
                ? 'bg-white text-slate-900 font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Root / Master Admin</span>
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5 leading-relaxed">
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
                  className="w-full bg-slate-50/80 border border-slate-200 focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition-all min-h-[42px]"
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
                  className="w-full bg-slate-50/80 border border-slate-200 focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition-all min-h-[42px]"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username Operator
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="w-full bg-slate-50/80 border border-slate-200 focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition-all min-h-[42px]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password / PIN Master
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Masukkan kode otorisasi PIN…"
                  autoComplete="current-password"
                  className="w-full bg-slate-50/80 border border-slate-200 focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition-all min-h-[42px]"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-1.5 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.12),0_6px_16px_-8px_rgba(15,23,42,0.4)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center gap-2 min-h-[44px] cursor-pointer disabled:opacity-50"
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
        <div className="pt-3.5 border-t border-slate-100 flex flex-col gap-1.5 text-center">
          <p className="text-[11px] text-slate-500">
            Akses terbatas untuk Asisten Laboratorium dan Administrator.
          </p>
          <p className="text-[10px] text-slate-400 font-mono tracking-wide">
            LAB KOMPUTASI UMPO · 2026
          </p>
        </div>
      </div>
    </div>
  );
}
