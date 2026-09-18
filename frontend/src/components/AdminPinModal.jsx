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
      const res  = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (res.ok && data.success) { onSuccess(pin); setPin(''); onClose(); }
      else setErrorMsg(data.detail || 'PIN Admin salah. Akses ditolak.');
    } catch { setErrorMsg('Gagal terhubung ke server verifikasi.'); }
    finally  { setIsLoading(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="palette-enter w-full max-w-sm overflow-hidden"
        style={{
          background: 'var(--surface-0)',
          border: '1px solid var(--border-emph)',
          borderRadius: 14,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid var(--border-base)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                width: 36, height: 36,
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
              }}
            >
              <Lock className="w-4 h-4" style={{ color: 'var(--accent-indigo)' }} />
            </div>
            <div>
              <h3
                className="font-bold"
                style={{ fontSize: '0.875rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
              >
                Akses Kontrol Admin
              </h3>
              <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: 1 }}>
                Lab Komputasi AI — TI UMPO
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg cursor-pointer transition"
            style={{
              width: 28, height: 28,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-base)',
              color: 'var(--text-muted)',
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
            Tindakan administratif (Kill Process & Reset Password) dilindungi PIN untuk mencegah eksekusi tanpa izin.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="section-label mb-1.5 block" style={{ letterSpacing: '0.04em' }}>
                PIN Admin
              </label>
              <div className="relative">
                <Key
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="password"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="Ketik PIN Admin…"
                  className="field-input"
                  style={{ paddingLeft: 34, letterSpacing: '0.15em', fontFamily: "'JetBrains Mono', monospace" }}
                  autoFocus
                />
              </div>
            </div>

            {errorMsg && (
              <div
                className="flex items-center gap-2 p-2.5 rounded-lg"
                style={{
                  background: 'rgba(244,63,94,0.08)',
                  border: '1px solid rgba(244,63,94,0.2)',
                }}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent-rose)' }} />
                <span style={{ fontSize: '0.6875rem', color: 'var(--accent-rose)' }}>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg transition"
                style={{
                  padding: '7px 14px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-base)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="cursor-pointer rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
                style={{
                  padding: '7px 16px',
                  background: 'var(--accent-indigo)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                }}
              >
                {isLoading
                  ? 'Memverifikasi…'
                  : (<><ShieldCheck className="w-3.5 h-3.5" /> Buka Akses Admin</>)
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
