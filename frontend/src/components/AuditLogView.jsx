import React, { useState } from 'react';
import { ShieldAlert, KeyRound, AlertTriangle, Info, Search, Clock, XCircle } from 'lucide-react';

const ACTION_META = {
  KILL_PROCESS: {
    icon: XCircle,
    color: 'var(--accent-rose)',
    bg: 'rgba(244,63,94,0.08)',
    border: 'rgba(244,63,94,0.18)',
    label: 'Kill Process',
  },
  RESET_PASSWORD: {
    icon: KeyRound,
    color: 'var(--accent-amber)',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.18)',
    label: 'Reset Password',
  },
  OVER_QUOTA: {
    icon: AlertTriangle,
    color: 'var(--accent-rose)',
    bg: 'rgba(244,63,94,0.06)',
    border: 'rgba(244,63,94,0.15)',
    label: 'Over Quota',
    pulse: true,
  },
  KILL_USER_ALL: {
    icon: ShieldAlert,
    color: 'var(--accent-rose)',
    bg: 'rgba(244,63,94,0.08)',
    border: 'rgba(244,63,94,0.18)',
    label: 'Kill All',
  },
  SIMULATION_START: {
    icon: Info,
    color: 'var(--accent-blue)',
    bg: 'rgba(59,130,246,0.07)',
    border: 'rgba(59,130,246,0.15)',
    label: 'Simulation',
  },
};

function getActionMeta(action) {
  return ACTION_META[action] || {
    icon: Info,
    color: 'var(--accent-indigo)',
    bg: 'rgba(99,102,241,0.07)',
    border: 'rgba(99,102,241,0.15)',
    label: action,
  };
}

export default function AuditLogView({ logs = [] }) {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter((log) => {
    if (filter !== 'ALL' && log.action !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (log.target || '').toLowerCase().includes(q) ||
        (log.detail || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filterChips = [
    { id: 'ALL',           label: `Semua (${logs.length})` },
    { id: 'KILL_PROCESS',  label: 'Kill Process' },
    { id: 'RESET_PASSWORD',label: 'Reset PW' },
    { id: 'OVER_QUOTA',   label: 'Over Quota' },
  ];

  return (
    <div className="panel-raised fade-in-up" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 pb-4"
        style={{ borderBottom: '1px solid var(--border-base)' }}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" style={{ color: 'var(--accent-indigo)' }} />
          <h2
            className="font-bold"
            style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
          >
            Audit Log Laboratorium
          </h2>
          <span
            className="badge badge-neutral metric-value"
            style={{ fontSize: '0.5625rem' }}
          >
            {logs.length} Entri
          </span>
        </div>
        <p
          style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}
        >
          Pencatatan real-time aksi kill, reset password, dan deteksi pelanggaran kuota.
        </p>
      </div>

      {/* Filter & Search */}
      <div
        className="flex flex-col sm:flex-row items-center gap-3 px-5 py-3"
        style={{ borderBottom: '1px solid var(--border-sub)' }}
      >
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {filterChips.map(chip => (
            <button
              key={chip.id}
              onClick={() => setFilter(chip.id)}
              className="cursor-pointer transition rounded-md"
              style={{
                padding: '4px 10px',
                fontSize: '0.6875rem',
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                background: filter === chip.id ? 'var(--accent-indigo)' : 'var(--surface-2)',
                color: filter === chip.id ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${filter === chip.id ? 'transparent' : 'var(--border-base)'}`,
                whiteSpace: 'nowrap',
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-60 sm:ml-auto">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari user, PID, atau keterangan…"
            className="field-input"
            style={{ paddingLeft: 32, paddingTop: 5, paddingBottom: 5, fontSize: '0.6875rem' }}
          />
        </div>
      </div>

      {/* Log entries */}
      <div style={{ maxHeight: 520, overflowY: 'auto' }}>
        {filteredLogs.length === 0 ? (
          <div
            className="text-center py-12 metric-value"
            style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}
          >
            Tidak ada riwayat aktivitas yang sesuai filter.
          </div>
        ) : (
          filteredLogs.map((log, idx) => {
            const meta = getActionMeta(log.action);
            const Icon = meta.icon;
            return (
              <div
                key={idx}
                className="flex items-start gap-3 px-5 py-3 transition"
                style={{
                  borderBottom: '1px solid var(--border-sub)',
                }}
              >
                {/* Icon */}
                <div
                  className="flex items-center justify-center rounded-lg shrink-0 mt-0.5"
                  style={{
                    width: 28, height: 28,
                    background: meta.bg,
                    border: `1px solid ${meta.border}`,
                  }}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${meta.pulse ? 'animate-pulse' : ''}`}
                    style={{ color: meta.color }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span
                      className="font-bold"
                      style={{ fontSize: '0.6875rem', color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span
                      className="metric-value font-bold"
                      style={{ fontSize: '0.6875rem', color: 'var(--text-primary)' }}
                    >
                      {log.target}
                    </span>
                  </div>
                  <p
                    style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1.5 }}
                  >
                    {log.detail}
                  </p>
                </div>

                {/* Timestamp */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span
                    className="metric-value"
                    style={{
                      fontSize: '0.5625rem',
                      color: 'var(--text-muted)',
                      padding: '2px 6px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-base)',
                      borderRadius: 5,
                    }}
                  >
                    {log.time}
                  </span>
                  <span
                    className="metric-value"
                    style={{ fontSize: '0.5rem', color: 'var(--accent-emerald)' }}
                  >
                    Terekam
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
