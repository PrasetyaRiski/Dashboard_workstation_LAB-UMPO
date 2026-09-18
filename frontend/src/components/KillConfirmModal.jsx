import React from 'react';
import { AlertTriangle, X, ShieldAlert, Shield } from 'lucide-react';

export default function KillConfirmModal({ isOpen, processInfo, onConfirm, onClose, isSubmitting }) {
  if (!isOpen || !processInfo) return null;
  const { pid, username, procName, cmdline, vramMb, is_system } = processInfo;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="palette-enter w-full max-w-md overflow-hidden"
        style={{
          background: 'var(--surface-0)',
          border: `1px solid ${is_system ? 'rgba(245,158,11,0.25)' : 'rgba(244,63,94,0.25)'}`,
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
              className="flex items-center justify-center rounded-lg shrink-0"
              style={{
                width: 36, height: 36,
                background: is_system ? 'rgba(245,158,11,0.1)' : 'rgba(244,63,94,0.1)',
                border: `1px solid ${is_system ? 'rgba(245,158,11,0.25)' : 'rgba(244,63,94,0.25)'}`,
              }}
            >
              {is_system
                ? <Shield className="w-4 h-4" style={{ color: 'var(--accent-amber)' }} />
                : <ShieldAlert className="w-4 h-4" style={{ color: 'var(--accent-rose)' }} />
              }
            </div>
            <div>
              <h3
                className="font-bold"
                style={{ fontSize: '0.875rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
              >
                {is_system ? 'Proses Sistem Terproteksi' : 'Konfirmasi Hentikan Proses'}
              </h3>
              <p
                style={{
                  fontSize: '0.625rem',
                  color: is_system ? 'var(--accent-amber)' : 'var(--accent-rose)',
                  marginTop: 1,
                }}
              >
                {is_system
                  ? 'Proteksi Keamanan Inti Server'
                  : 'SIGTERM / SIGKILL — Tindakan Administratif'
                }
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
        <div className="p-5 flex flex-col gap-4">
          {is_system ? (
            <div
              className="flex items-start gap-2.5 p-3 rounded-lg"
              style={{
                background: 'rgba(245,158,11,0.07)',
                border: '1px solid rgba(245,158,11,0.18)',
              }}
            >
              <Shield className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent-amber)' }} />
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong>Dilarang:</strong> Proses ini adalah layanan/proses sistem yang penting bagi stabilitas klaster server. Tindakan mematikan proses ini diblokir demi keamanan.
              </p>
            </div>
          ) : (
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Apakah Anda yakin ingin mematikan paksa proses komputasi ini? Pekerjaan pelatihan model AI yang sedang berjalan akan terhenti seketika dan tidak dapat dikembalikan.
            </p>
          )}

          {/* Process info panel */}
          <div
            className="panel-inset overflow-hidden"
            style={{ padding: 0 }}
          >
            {[
              { label: 'Pemilik Proses', value: username, color: 'var(--accent-indigo)' },
              { label: 'PID',            value: pid,      color: 'var(--text-primary)' },
              { label: 'Nama Eksekusi',  value: procName, color: 'var(--accent-emerald)' },
              ...(vramMb !== undefined
                ? [{ label: 'Konsumsi VRAM', value: `${vramMb} MB`, color: 'var(--accent-amber)' }]
                : []),
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="flex justify-between items-center"
                style={{ padding: '7px 12px', borderBottom: '1px solid var(--border-sub)' }}
              >
                <span
                  className="metric-value"
                  style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}
                >
                  {label}
                </span>
                <span
                  className="metric-value font-bold"
                  style={{ fontSize: '0.6875rem', color }}
                >
                  {value}
                </span>
              </div>
            ))}
            {cmdline && (
              <div style={{ padding: '8px 12px' }}>
                <p className="section-label mb-1" style={{ fontSize: '0.5rem' }}>Command Line</p>
                <code
                  className="metric-value"
                  style={{
                    fontSize: '0.5625rem',
                    color: 'var(--text-muted)',
                    wordBreak: 'break-all',
                    display: 'block',
                  }}
                >
                  {cmdline}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-4"
          style={{ borderTop: '1px solid var(--border-base)' }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer rounded-lg transition disabled:opacity-50"
            style={{
              padding: '7px 14px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-base)',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {is_system ? 'Tutup' : 'Batal'}
          </button>
          {!is_system && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="btn-kill cursor-pointer rounded-lg disabled:opacity-50 flex items-center gap-1.5"
              style={{
                padding: '7px 16px',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: 'var(--accent-rose)',
                color: '#fff',
                border: 'none',
                boxShadow: '0 2px 8px rgba(244,63,94,0.35)',
              }}
            >
              {isSubmitting ? (
                'Memproses…'
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Hentikan Proses
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
