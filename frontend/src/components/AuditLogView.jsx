import React, { useState } from 'react';
import {
  ShieldAlert, KeyRound, AlertTriangle, Info, Search, Clock,
  XCircle, Zap, RotateCcw, UserX, UserCheck, ShieldCheck
} from 'lucide-react';

const ACTION_META = {
  BOOST_PRIORITY: {
    icon: Zap,
    color: 'text-[#38bdf8]',
    badgeBg: 'bg-[#0ea5e9]/10',
    badgeBorder: 'border-[#0ea5e9]/25',
    label: 'Boost Prioritas GPU',
  },
  UNBOOST_PRIORITY: {
    icon: RotateCcw,
    color: 'text-[#818cf8]',
    badgeBg: 'bg-[#6366f1]/10',
    badgeBorder: 'border-[#6366f1]/25',
    label: 'Kembali Standar',
  },
  AUTO_EXPIRE_BOOST: {
    icon: Clock,
    color: 'text-[#fbbf24]',
    badgeBg: 'bg-[#f59e0b]/10',
    badgeBorder: 'border-[#f59e0b]/25',
    label: 'Prioritas Kadaluarsa',
  },
  KILL_PROCESS: {
    icon: XCircle,
    color: 'text-[#fb7185]',
    badgeBg: 'bg-[#f43f5e]/10',
    badgeBorder: 'border-[#f43f5e]/25',
    label: 'Hentikan Proses (Kill)',
  },
  KILL_USER_ALL: {
    icon: ShieldAlert,
    color: 'text-[#fb7185]',
    badgeBg: 'bg-[#f43f5e]/10',
    badgeBorder: 'border-[#f43f5e]/25',
    label: 'Hentikan Sesi User',
  },
  BLOCK_USER: {
    icon: UserX,
    color: 'text-[#fb7185]',
    badgeBg: 'bg-[#f43f5e]/10',
    badgeBorder: 'border-[#f43f5e]/25',
    label: 'Kunci Akun (Block)',
  },
  UNBLOCK_USER: {
    icon: UserCheck,
    color: 'text-[#34d399]',
    badgeBg: 'bg-[#10b981]/10',
    badgeBorder: 'border-[#10b981]/25',
    label: 'Buka Kunci Akun',
  },
  RESET_PASSWORD: {
    icon: KeyRound,
    color: 'text-[#fbbf24]',
    badgeBg: 'bg-[#f59e0b]/10',
    badgeBorder: 'border-[#f59e0b]/25',
    label: 'Reset Password Linux',
  },
  SET_ROLE: {
    icon: ShieldCheck,
    color: 'text-[#818cf8]',
    badgeBg: 'bg-[#6366f1]/10',
    badgeBorder: 'border-[#6366f1]/25',
    label: 'Ubah Role Pengguna',
  },
  LOGIN_DASHBOARD: {
    icon: UserCheck,
    color: 'text-[#38bdf8]',
    badgeBg: 'bg-[#0ea5e9]/10',
    badgeBorder: 'border-[#0ea5e9]/25',
    label: 'Otentikasi Admin',
  },
  OVER_QUOTA: {
    icon: AlertTriangle,
    color: 'text-[#fb7185]',
    badgeBg: 'bg-[#f43f5e]/10',
    badgeBorder: 'border-[#f43f5e]/25',
    label: 'Storage Melebihi Kuota',
  },
  BACKUP_DATABASE: {
    icon: ShieldCheck,
    color: 'text-[#818cf8]',
    badgeBg: 'bg-[#6366f1]/10',
    badgeBorder: 'border-[#6366f1]/25',
    label: 'Snapshot Backup DB',
  },
};

function getActionMeta(action) {
  return ACTION_META[action] || {
    icon: Info,
    color: 'text-[#a1a1aa]',
    badgeBg: 'bg-[#27272a]',
    badgeBorder: 'border-[rgba(255,255,255,0.08)]',
    label: action,
  };
}

export default function AuditLogView({ logs = [] }) {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const safeLogs = Array.isArray(logs) ? logs : [];

  const filteredLogs = safeLogs.filter((log) => {
    if (filter !== 'ALL' && log.action !== filter) return false;
    if (search) {
      const q = search.toLowerCase().trim();
      const targetStr = String(log.target || log.nim || '').toLowerCase();
      const detailStr = String(log.detail || '').toLowerCase();
      const actionStr = String(log.action || '').toLowerCase();
      return targetStr.includes(q) || detailStr.includes(q) || actionStr.includes(q);
    }
    return true;
  });

  const filterChips = [
    { id: 'ALL',            label: `Semua (${logs.length})` },
    { id: 'BOOST_PRIORITY', label: 'Boost' },
    { id: 'KILL_PROCESS',   label: 'Kill Proses' },
    { id: 'RESET_PASSWORD', label: 'Reset PW' },
    { id: 'OVER_QUOTA',     label: 'Over Quota' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Integrity Compliance Info Bar */}
      <div className="bg-[#111114] rounded-xl p-4 border border-[rgba(255,255,255,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#18181b] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#34d399] shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#fafafa] tracking-tight">
                Log Audit Operasional (Immutable Audit Trail)
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#18181b] text-[#34d399] border border-[#10b981]/20">
                SQLite WAL
              </span>
            </div>
            <p className="text-xs text-[#a1a1aa] mt-0.5">
              Pencatatan persisten aktivitas administratif level kernel & aplikasi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-[#a1a1aa]">
          <span>{logs.length} Peristiwa Terekam</span>
        </div>
      </div>

      {/* Main Table / Stream Container */}
      <div className="bg-[#111114] rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden flex flex-col">
        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-b border-[rgba(255,255,255,0.08)] bg-[#18181b]">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {filterChips.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setFilter(chip.id)}
                className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors whitespace-nowrap ${
                  filter === chip.id
                    ? 'bg-[#27272a] text-[#fafafa] font-semibold border border-[rgba(255,255,255,0.14)]'
                    : 'text-[#a1a1aa] hover:text-[#fafafa]'
                }`}
                type="button"
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#71717a]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari aksi, user, target…"
              className="w-full bg-[#111114] border border-[rgba(255,255,255,0.08)] focus:border-[#38bdf8] rounded-md py-1 pl-8 pr-3 text-xs font-mono text-[#fafafa] placeholder:text-[#71717a] outline-none transition-colors"
            />
          </div>
        </div>

        {/* Entries */}
        <div className="max-h-[550px] overflow-y-auto divide-y divide-[rgba(255,255,255,0.04)] font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-[#71717a]">
              <Clock className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p>Tidak ada catatan audit yang cocok dengan kriteria filter.</p>
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              const meta = getActionMeta(log.action);
              const Icon = meta.icon;
              return (
                <div key={idx} className="flex items-start justify-between gap-4 p-3 hover:bg-[#18181b] transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${meta.badgeBg} border ${meta.badgeBorder} ${meta.color} mt-0.5`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`font-semibold ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="text-[#71717a]">·</span>
                        <span className="text-[#fafafa] font-bold bg-[#18181b] px-1.5 py-0.2 rounded border border-[rgba(255,255,255,0.06)]">
                          {log.target || log.nim || 'System'}
                        </span>
                      </div>
                      <p className="text-[#a1a1aa] text-[11px] font-sans leading-relaxed">
                        {log.detail || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-[#71717a] text-[11px] tabular-nums">
                      {log.time || log.created_at || 'Baru Saja'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
