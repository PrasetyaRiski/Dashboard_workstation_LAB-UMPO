import React, { useState } from 'react';
import {
  ShieldAlert, KeyRound, AlertTriangle, Info, Search, Clock,
  XCircle, Zap, RotateCcw, UserX, UserCheck, ShieldCheck, Shield
} from 'lucide-react';

const ACTION_META = {
  BOOST_PRIORITY: {
    icon: Zap,
    color: 'text-neon-cyan',
    bg: 'bg-primary-container/15',
    border: 'border-neon-cyan/30',
    label: 'Boost Priority Level 1',
  },
  UNBOOST_PRIORITY: {
    icon: RotateCcw,
    color: 'text-secondary-fixed',
    bg: 'bg-secondary-container/20',
    border: 'border-secondary/30',
    label: 'Revert Standard Level 2',
  },
  AUTO_EXPIRE_BOOST: {
    icon: Clock,
    color: 'text-neon-amber',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    label: 'Auto Expire Boost',
  },
  KILL_PROCESS: {
    icon: XCircle,
    color: 'text-neon-rose',
    bg: 'bg-error-container/20',
    border: 'border-neon-rose/30',
    label: 'Kill Single Process',
  },
  KILL_USER_ALL: {
    icon: ShieldAlert,
    color: 'text-neon-rose',
    bg: 'bg-error-container/20',
    border: 'border-neon-rose/30',
    label: 'Kill All User Sessions',
  },
  BLOCK_USER: {
    icon: UserX,
    color: 'text-neon-rose',
    bg: 'bg-error-container/20',
    border: 'border-neon-rose/30',
    label: 'Block Account',
  },
  UNBLOCK_USER: {
    icon: UserCheck,
    color: 'text-neon-emerald',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    label: 'Unblock Account',
  },
  RESET_PASSWORD: {
    icon: KeyRound,
    color: 'text-neon-amber',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    label: 'Reset Linux Password',
  },
  SET_ROLE: {
    icon: ShieldCheck,
    color: 'text-secondary-fixed',
    bg: 'bg-secondary-container/20',
    border: 'border-secondary/30',
    label: 'Ubah Role Pengguna',
  },
  LOGIN_DASHBOARD: {
    icon: UserCheck,
    color: 'text-neon-cyan',
    bg: 'bg-primary-container/15',
    border: 'border-neon-cyan/30',
    label: 'Login Admin',
  },
  OVER_QUOTA: {
    icon: AlertTriangle,
    color: 'text-neon-rose',
    bg: 'bg-error-container/20',
    border: 'border-neon-rose/30',
    label: 'Storage Over Quota',
    pulse: true,
  },
  BACKUP_DATABASE: {
    icon: ShieldCheck,
    color: 'text-secondary-fixed',
    bg: 'bg-secondary-container/20',
    border: 'border-secondary/30',
    label: 'Backup Database SQLite',
  },
  SIMULATION_START: {
    icon: Info,
    color: 'text-neon-cyan',
    bg: 'bg-primary-container/15',
    border: 'border-neon-cyan/30',
    label: 'Run Simulation PyTorch',
  },
};

function getActionMeta(action) {
  return ACTION_META[action] || {
    icon: Info,
    color: 'text-primary-fixed',
    bg: 'bg-surface-3',
    border: 'border-border-base',
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
        (log.detail || '').toLowerCase().includes(q) ||
        (log.action || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filterChips = [
    { id: 'ALL',            label: `Semua (${logs.length})` },
    { id: 'BOOST_PRIORITY', label: 'Boost Priority' },
    { id: 'KILL_PROCESS',   label: 'Kill Process' },
    { id: 'RESET_PASSWORD', label: 'Reset PW' },
    { id: 'OVER_QUOTA',     label: 'Over Quota' },
  ];

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Security & Integrity Compliance Banner — Stitch Style */}
      <div className="relative overflow-hidden rounded-xl bg-surface-1 p-5 shadow-md border border-border-subtle">
        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-neon-cyan/5 blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary-fixed shrink-0 border border-border-base shadow-inner">
              <ShieldCheck className="w-5 h-5 text-neon-cyan" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-headline-md text-sm font-bold text-text-primary tracking-tight">
                  Immutable Append-Only Audit Trail
                </span>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container font-mono text-[9px] text-secondary-fixed font-semibold uppercase">
                  Audit Ready
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Pencatatan real-time kernel & level aplikasi. Setiap aksi administratif (Boost, Kill Process, Password Reset, Status Quota) tercatat ke disk SQLite WAL secara persisten.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-neon-emerald bg-surface-2 px-3 py-1.5 rounded-lg border border-border-base shrink-0">
            <span className="w-2 h-2 rounded-full bg-neon-emerald animate-pulse"></span>
            <span>{logs.length} Catatan Terverifikasi</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-surface-2 rounded-xl border border-border-subtle overflow-hidden shadow-xl flex flex-col">
        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-b border-border-subtle bg-surface-1">
          <div className="flex gap-1.5 p-1 bg-surface-container-lowest rounded-lg border border-border-subtle w-full sm:w-auto overflow-x-auto">
            {filterChips.map(chip => (
              <button
                key={chip.id}
                onClick={() => setFilter(chip.id)}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded transition-all whitespace-nowrap ${
                  filter === chip.id
                    ? 'bg-surface-3 text-neon-cyan border border-neon-cyan/30 shadow-sm font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                type="button"
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari user, aksi, atau detail..."
              className="w-full bg-surface-3 border border-border-base rounded-lg py-1.5 pl-9 pr-3 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface-container-high transition-all"
            />
          </div>
        </div>

        {/* Log Entries Stream */}
        <div className="flex-1 overflow-y-auto max-h-[600px]">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="w-8 h-8 text-outline mx-auto mb-2 opacity-50" />
              <p className="text-xs font-mono text-text-muted">Tidak ada riwayat aktivitas yang sesuai filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {filteredLogs.map((log, idx) => {
                const meta = getActionMeta(log.action);
                const Icon = meta.icon;
                return (
                  <div key={idx} className="flex items-start gap-4 p-4 hover:bg-surface-3 transition-colors group">
                    {/* Action Icon */}
                    <div className={`flex items-center justify-center rounded-xl shrink-0 w-9 h-9 ${meta.bg} border ${meta.border} shadow-sm`}>
                      <Icon className={`w-4 h-4 ${meta.color} ${meta.pulse ? 'animate-pulse' : ''}`} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-bold font-mono tracking-tight ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="text-outline text-xs">•</span>
                        <span className="text-xs font-mono font-bold text-text-primary bg-surface-1 px-2 py-0.5 rounded border border-border-base">
                          {log.target}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed">
                        {log.detail}
                      </p>
                    </div>

                    {/* Timestamp */}
                    <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5 font-mono">
                      <span className="text-[10px] text-text-primary px-2 py-0.5 bg-surface-1 rounded border border-border-base">
                        {log.time}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-neon-emerald flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-emerald"></span>
                        Terekam
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
