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
      let res, data;
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

      data = await res.json();
      if (res.ok && data.success) {
        onSuccess(data.token, data.role || 'admin', data.user || null);
        onClose();
      } else {
        setErrorMsg(data.detail || data.message || 'Autentikasi gagal. Periksa kembali kredensial Anda.');
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server backend atau sistem SIMTIK.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2E2018]/60 backdrop-blur-xs font-sans">
      <div className="w-full max-w-md bg-[#F3EBDD] border border-[#E4D8C3] rounded-2xl shadow-warm-modal overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E4D8C3] bg-[#FAF6EF]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#F3EBDD] border border-[#E4D8C3] text-[#6F4E37] shrink-0 shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-[#2E2018] tracking-tight">
                Autentikasi Hak Akses Lab
              </h3>
              <p className="text-xs text-[#7A6A5C]">
                Login asisten lab atau administrator sistem
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#7A6A5C] hover:text-[#2E2018] hover:bg-[#EFE6D8] rounded-xl transition-colors cursor-pointer"
            type="button"
            aria-label="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Mode Switcher */}
        <div className="flex border-b border-[#E4D8C3] bg-[#EFE6D8]/60 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => { setLoginMode('simtik'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all min-h-[40px] ${
              loginMode === 'simtik'
                ? 'bg-[#6F4E37] text-[#FAF6EF] shadow-xs font-semibold'
                : 'text-[#3B2E26] hover:bg-[#EFE6D8]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Akun SIMTIK (SSO)</span>
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('pin'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all min-h-[40px] ${
              loginMode === 'pin'
                ? 'bg-[#6F4E37] text-[#FAF6EF] shadow-xs font-semibold'
                : 'text-[#3B2E26] hover:bg-[#EFE6D8]'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>PIN Root Operator</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#C53030] text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {loginMode === 'simtik' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#2E2018] mb-1.5">
                  NIM Mahasiswa / Asisten
                </label>
                <input
                  type="text"
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                  placeholder="Contoh: 21533001"
                  className="w-full bg-[#FAF6EF] border border-[#E4D8C3] focus:border-[#6F4E37] focus:ring-2 focus:ring-[#6F4E37]/20 rounded-xl px-3.5 py-2 text-xs font-mono text-[#2E2018] placeholder:text-[#7A6A5C] outline-none transition-all min-h-[44px]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E2018] mb-1.5">
                  Password SIMTIK
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#FAF6EF] border border-[#E4D8C3] focus:border-[#6F4E37] focus:ring-2 focus:ring-[#6F4E37]/20 rounded-xl px-3.5 py-2 text-xs font-mono text-[#2E2018] placeholder:text-[#7A6A5C] outline-none transition-all min-h-[44px]"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#2E2018] mb-1.5">
                PIN Master Server
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan kode otorisasi PIN…"
                className="w-full bg-[#FAF6EF] border border-[#E4D8C3] focus:border-[#6F4E37] focus:ring-2 focus:ring-[#6F4E37]/20 rounded-xl px-3.5 py-2 text-xs font-mono text-[#2E2018] placeholder:text-[#7A6A5C] outline-none transition-all min-h-[44px]"
                autoFocus
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E4D8C3]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#3B2E26] hover:bg-[#EFE6D8] border border-[#E4D8C3] transition-colors min-h-[44px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#6F4E37] hover:bg-[#4A3426] text-[#FAF6EF] transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-[#FAF6EF]/30 border-t-[#FAF6EF] rounded-full animate-spin" />
                  <span>Memverifikasi...</span>
                </>
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
  );
}
