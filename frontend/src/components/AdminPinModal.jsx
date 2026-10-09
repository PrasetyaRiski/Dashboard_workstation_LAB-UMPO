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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-md bg-[#18181b] border border-[rgba(255,255,255,0.14)] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.45)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.08)] bg-[#111114]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[rgba(99,102,241,0.12)] border border-[rgba(99,102,241,0.25)] text-[#818cf8] shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#fafafa] tracking-tight">
                Autentikasi Hak Akses Lab
              </h3>
              <p className="text-[11px] text-[#a1a1aa] mt-0.5">
                Lab Komputasi AI & Riset — TI UMPO
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

        {/* Segmented Mode Selector */}
        <div className="flex p-1.5 gap-1.5 border-b border-[rgba(255,255,255,0.08)] bg-[#09090b]">
          <button
            type="button"
            onClick={() => { setLoginMode('simtik'); setErrorMsg(''); }}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-mono font-medium transition-colors flex items-center justify-center gap-2 ${
              loginMode === 'simtik'
                ? 'bg-[#27272a] text-[#38bdf8] border border-[rgba(14,165,233,0.3)] shadow-sm'
                : 'text-[#71717a] hover:text-[#fafafa]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Akun SIMTIK (Aslab)</span>
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('pin'); setErrorMsg(''); }}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-mono font-medium transition-colors flex items-center justify-center gap-2 ${
              loginMode === 'pin'
                ? 'bg-[#27272a] text-[#fbbf24] border border-[rgba(245,158,11,0.3)] shadow-sm'
                : 'text-[#71717a] hover:text-[#fafafa]'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>PIN Master (Admin)</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5">
          <p className="text-xs text-[#a1a1aa] mb-4 leading-relaxed">
            {loginMode === 'simtik'
              ? 'Gunakan akun SIMTIK untuk mengaktifkan wewenang operator monitoring dan penghentian proses mahasiswa.'
              : 'Gunakan PIN Master Teknisi untuk pemeliharaan inti dan wewenang penuh cluster.'
            }
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {loginMode === 'simtik' ? (
              <>
                <div>
                  <label className="block text-[11px] font-mono text-[#a1a1aa] mb-1 uppercase tracking-wider">
                    NIM Mahasiswa / Akun Aslab
                  </label>
                  <input
                    type="text"
                    value={nim}
                    onChange={e => setNim(e.target.value)}
                    placeholder="Contoh: 22533..."
                    className="w-full bg-[#111114] border border-[rgba(255,255,255,0.08)] focus:border-[#38bdf8] rounded-lg py-2 px-3 text-xs font-mono text-[#fafafa] outline-none transition-colors"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#a1a1aa] mb-1 uppercase tracking-wider">
                    Password SIMTIK
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan password SSO..."
                    className="w-full bg-[#111114] border border-[rgba(255,255,255,0.08)] focus:border-[#38bdf8] rounded-lg py-2 px-3 text-xs text-[#fafafa] outline-none transition-colors"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-[11px] font-mono text-[#a1a1aa] mb-1 uppercase tracking-wider">
                  PIN Master Admin
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#71717a]" />
                  <input
                    type="password"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="Ketik PIN Master…"
                    className="w-full bg-[#111114] border border-[rgba(255,255,255,0.08)] focus:border-[#fbbf24] rounded-lg py-2 pl-9 pr-3 text-xs font-mono tracking-widest text-[#fafafa] outline-none transition-colors"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.2)] text-[#fb7185] text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-xs font-medium text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-1.5 rounded-lg bg-[#38bdf8] hover:bg-[#0ea5e9] text-zinc-950 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
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
