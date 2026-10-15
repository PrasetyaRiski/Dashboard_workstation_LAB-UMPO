import React, { useState } from 'react';
import {
  ShieldAlert, KeyRound, AlertTriangle, Info, Search, Clock,
  XCircle, Zap, RotateCcw, UserX, UserCheck, ShieldCheck
} from 'lucide-react';

const ACTION_META = {
  BOOST_PRIORITY: {
    icon: Zap,
    color: 'text-blue-600',
    badgeBg: 'bg-blue-50',
    badgeBorder: 'border-blue-200',
    label: 'Boost Prioritas GPU',
  },
  UNBOOST_PRIORITY: {
    icon: RotateCcw,
    color: 'text-indigo-600',
    badgeBg: 'bg-indigo-50',
    badgeBorder: 'border-indigo-200',
    label: 'Kembali Standar',
  },
  AUTO_EXPIRE_BOOST: {
    icon: Clock,
    color: 'text-amber-600',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    label: 'Prioritas Kadaluarsa',
  },
  KILL_PROCESS: {
    icon: XCircle,
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    label: 'Hentikan Proses (Kill)',
  },
  KILL_USER_ALL: {
    icon: ShieldAlert,
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    label: 'Hentikan Sesi User',
  },
  BLOCK_USER: {
    icon: UserX,
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    label: 'Kunci Akun (Block)',
  },
  UNBLOCK_USER: {
    icon: UserCheck,
    color: 'text-emerald-600',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    label: 'Buka Kunci Akun',
  },
  RESET_PASSWORD: {
    icon: KeyRound,
    color: 'text-amber-600',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    label: 'Reset Password Linux',
  },
  SET_ROLE: {
    icon: ShieldCheck,
    color: 'text-indigo-600',
    badgeBg: 'bg-indigo-50',
    badgeBorder: 'border-indigo-200',
    label: 'Ubah Role Pengguna',
  },
  LOGIN_DASHBOARD: {
    icon: UserCheck,
    color: 'text-blue-600',
    badgeBg: 'bg-blue-50',
    badgeBorder: 'border-blue-200',
    label: 'Otentikasi Admin',
  },
  OVER_QUOTA: {
    icon: AlertTriangle,
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    label: 'Storage Melebihi Kuota',
  },
  BACKUP_DATABASE: {
    icon: ShieldCheck,
    color: 'text-indigo-600',
    badgeBg: 'bg-indigo-50',
    badgeBorder: 'border-indigo-200',
    label: 'Snapshot Backup DB',
  },
};

function getActionMeta(action) {
  return ACTION_META[action] || {
    icon: Info,
    color: 'text-slate-600',
    badgeBg: 'bg-slate-50',
    badgeBorder: 'border-slate-200',
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
    <div className="flex flex-col gap-6">
      {/* Integrity Compliance Info Bar - 3D Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(37,99,235,0.06),0_2px_4px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Log Audit Operasional (Immutable Audit Trail)
              </h2>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                SQLite WAL
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pencatatan persisten aktivitas administratif level kernel & aplikasi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-slate-100 text-slate-700 font-mono text-xs font-semibold rounded-lg border border-slate-200/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
            {logs.length} Peristiwa Terekam
          </span>
        </div>
      </div>

      {/* Main Table / Stream Container - 3D Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(37,99,235,0.06),0_2px_4px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col">
        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-b border-slate-200/80 bg-slate-50/70">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-slate-200/50 rounded-xl border border-slate-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
            {filterChips.map((chip) => {
              const active = filter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setFilter(chip.id)}
                  className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-all duration-150 whitespace-nowrap ${
                    active
                      ? 'bg-white text-blue-700 font-semibold border border-blue-200/80 shadow-[0_2px_4px_rgba(37,99,235,0.1),0_1px_2px_rgba(0,0,0,0.05)]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                  type="button"
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari aksi, user, target…"
              className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl py-1.5 pl-9 pr-3 text-xs font-mono text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
            />
          </div>
        </div>

        {/* Entries */}
        <div className="max-h-[550px] overflow-y-auto divide-y divide-slate-100 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2.5 opacity-40 text-slate-400" />
              <p className="font-sans font-medium text-slate-500">Tidak ada catatan audit yang cocok dengan kriteria filter.</p>
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              const meta = getActionMeta(log.action);
              const Icon = meta.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-4 p-4 hover:bg-blue-50/40 transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.badgeBg} border ${meta.badgeBorder} ${meta.color} mt-0.5 shadow-sm`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`font-semibold ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {log.target || log.nim || 'System'}
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs font-sans leading-relaxed">
                        {log.detail || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-slate-400 text-[11px] tabular-nums font-mono">
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
