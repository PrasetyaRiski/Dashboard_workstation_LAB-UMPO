import React, { useState } from 'react';
import { Lock, Key, X, AlertCircle, ShieldCheck, UserCheck, Shield } from 'lucide-react';

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
        setErrorMsg(data.detail || 'Login gagal. Periksa kembali data login Anda.');
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server backend/SIMTIK.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden bg-[#181b25] border border-slate-700/80 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#46455430] bg-[#0a0e17]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#dfe2ef] tracking-tight">
                Autentikasi Akses Kontrol Lab
              </h3>
              <p className="text-[11px] text-[#908fa0] mt-0.5">
                Lab Komputasi AI & Riset — TI UMPO
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

        {/* Tab Selector */}
        <div className="flex border-b border-[#46455430] bg-[#0f131c]/70 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => { setLoginMode('simtik'); setErrorMsg(''); }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-semibold transition-all flex items-center justify-center gap-2 ${
              loginMode === 'simtik'
                ? 'bg-[#1c1f29] text-[#4cd7f6] border border-[#4cd7f6]/30 shadow-sm'
                : 'text-[#908fa0] hover:text-[#dfe2ef]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Akun SIMTIK (Aslab / Admin)</span>
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('pin'); setErrorMsg(''); }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-semibold transition-all flex items-center justify-center gap-2 ${
              loginMode === 'pin'
                ? 'bg-[#1c1f29] text-amber-400 border border-amber-400/30 shadow-sm'
                : 'text-[#908fa0] hover:text-[#dfe2ef]'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>PIN Master (Teknisi)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {loginMode === 'simtik' ? (
            <p className="text-xs text-[#908fa0] mb-5 leading-relaxed">
              Login menggunakan akun SSO SIMTIK Anda. Hak akses operator monitoring & kill sesi diberikan kepada <strong className="text-[#4cd7f6]">Asisten Lab (Aslab)</strong> dan <strong className="text-amber-400">Admin Lab</strong>.
            </p>
          ) : (
            <p className="text-xs text-[#908fa0] mb-5 leading-relaxed">
              Akses darurat Super Admin menggunakan PIN Master jika sistem SSO kampus sedang offline atau dalam mode isolasi teknisi.
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {loginMode === 'simtik' ? (
              <>
                <div>
                  <label className="block text-xs font-mono font-medium text-[#c7c4d7] mb-1.5 uppercase tracking-wider">
                    NIM Mahasiswa
                  </label>
                  <input
                    type="text"
                    value={nim}
                    onChange={e => setNim(e.target.value)}
                    placeholder="Contoh: 22533..."
                    className="w-full bg-[#0a0e17] border border-[#46455430] rounded-xl py-2.5 px-3.5 text-sm font-mono text-[#dfe2ef] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-[#908fa0]"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-medium text-[#c7c4d7] mb-1.5 uppercase tracking-wider">
                    Password SIMTIK
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan password SSO..."
                    className="w-full bg-[#0a0e17] border border-[#46455430] rounded-xl py-2.5 px-3.5 text-sm text-[#dfe2ef] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-[#908fa0]"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-mono font-medium text-[#c7c4d7] mb-1.5 uppercase tracking-wider">
                  PIN Master Admin
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#908fa0]" />
                  <input
                    type="password"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="Ketik PIN Master…"
                    className="w-full bg-[#0a0e17] border border-[#46455430] rounded-xl py-2.5 pl-10 pr-4 text-sm font-mono tracking-[0.2em] text-[#dfe2ef] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:tracking-normal placeholder:text-[#908fa0]"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3">
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
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-indigo-400 border border-transparent text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-lg"
              >
                {isLoading ? (
                  'Memverifikasi…'
                ) : loginMode === 'simtik' ? (
                  <>
                    <UserCheck className="w-4 h-4" /> Masuk Akun SIMTIK
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Akses Super Admin
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
