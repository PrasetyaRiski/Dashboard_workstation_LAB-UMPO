import React, { useState } from 'react';
import {
  ShieldAlert, KeyRound, AlertTriangle, Info, Search, Clock,
  XCircle, Zap, RotateCcw, UserX, UserCheck, ShieldCheck
} from 'lucide-react';

const ACTION_META = {
  BOOST_PRIORITY: {
    icon: Zap,
    color: 'text-[#C8794A]',
    badgeBg: 'bg-[#FEF3C7]',
    badgeBorder: 'border-[#FDE68A]',
    label: 'Boost Prioritas GPU',
  },
  UNBOOST_PRIORITY: {
    icon: RotateCcw,
    color: 'text-[#6F4E37]',
    badgeBg: 'bg-[#FAF6EF]',
    badgeBorder: 'border-[#E4D8C3]',
    label: 'Lepas Prioritas GPU',
  },
  KILL_PROCESS: {
    icon: XCircle,
    color: 'text-[#C53030]',
    badgeBg: 'bg-[#FEE2E2]',
    badgeBorder: 'border-[#FCA5A5]',
    label: 'Hentikan Proses GPU',
  },
  KILL_USER_ALL: {
    icon: AlertTriangle,
    color: 'text-[#C53030]',
    badgeBg: 'bg-[#FEE2E2]',
    badgeBorder: 'border-[#FCA5A5]',
    label: 'Terminasi Seluruh Sesi',
  },
  LOCK_USER: {
    icon: UserX,
    color: 'text-[#B45309]',
    badgeBg: 'bg-[#FEF3C7]',
    badgeBorder: 'border-[#FDE68A]',
    label: 'Kunci Akun Pengguna',
  },
  UNLOCK_USER: {
    icon: UserCheck,
    color: 'text-[#2E7D32]',
    badgeBg: 'bg-[#E8F5E9]',
    badgeBorder: 'border-[#2E7D32]/30',
    label: 'Buka Kunci Akun',
  },
  RESET_PASSWORD: {
    icon: KeyRound,
    color: 'text-[#6F4E37]',
    badgeBg: 'bg-[#FAF6EF]',
    badgeBorder: 'border-[#E4D8C3]',
    label: 'Reset Password Linux',
  },
  SET_ROLE: {
    icon: ShieldCheck,
    color: 'text-[#6F4E37]',
    badgeBg: 'bg-[#FAF6EF]',
    badgeBorder: 'border-[#E4D8C3]',
    label: 'Ubah Role Pengguna',
  },
  OVER_QUOTA: {
    icon: ShieldAlert,
    color: 'text-[#C53030]',
    badgeBg: 'bg-[#FEE2E2]',
    badgeBorder: 'border-[#FCA5A5]',
    label: 'Storage Melebihi Kuota',
  },
  BACKUP_DATABASE: {
    icon: ShieldCheck,
    color: 'text-[#2E7D32]',
    badgeBg: 'bg-[#E8F5E9]',
    badgeBorder: 'border-[#2E7D32]/30',
    label: 'Snapshot Backup DB',
  },
};

function getActionMeta(action) {
  return ACTION_META[action] || {
    icon: Info,
    color: 'text-[#7A6A5C]',
    badgeBg: 'bg-[#FAF6EF]',
    badgeBorder: 'border-[#E4D8C3]',
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
    <div className="flex flex-col gap-4 font-sans">
      {/* Integrity Compliance Info Bar */}
      <div className="bg-[#F3EBDD] rounded-2xl p-4 sm:p-5 border border-[#E4D8C3] shadow-warm-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FAF6EF] border border-[#E4D8C3] flex items-center justify-center text-[#6F4E37] shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-serif text-sm sm:text-base font-bold text-[#2E2018] tracking-tight">
                Log Audit Operasional (Immutable Audit Trail)
              </h2>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32] border border-[#2E7D32]/30">
                SQLite WAL
              </span>
            </div>
            <p className="text-xs text-[#7A6A5C] mt-0.5">
              Pencatatan persisten aktivitas administratif level kernel &amp; aplikasi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-[#FAF6EF] text-[#2E2018] font-mono text-xs font-semibold rounded-xl border border-[#E4D8C3] shadow-xs">
            {logs.length} Peristiwa Terekam
          </span>
        </div>
      </div>

      {/* Main Table / Stream Container */}
      <div className="bg-[#F3EBDD] rounded-2xl border border-[#E4D8C3] shadow-warm-xs overflow-hidden flex flex-col">
        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-b border-[#E4D8C3] bg-[#EFE6D8]/60">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-[#FAF6EF] rounded-xl border border-[#E4D8C3]">
            {filterChips.map((chip) => {
              const active = filter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setFilter(chip.id)}
                  className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-colors whitespace-nowrap min-h-[36px] ${
                    active
                      ? 'bg-[#6F4E37] text-[#FAF6EF] font-semibold shadow-xs'
                      : 'text-[#3B2E26] hover:text-[#2E2018] hover:bg-[#EFE6D8]'
                  }`}
                  type="button"
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6A5C]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari aksi, user, target…"
              className="w-full bg-[#FAF6EF] border border-[#E4D8C3] focus:border-[#6F4E37] focus:ring-2 focus:ring-[#6F4E37]/20 rounded-xl py-2 pl-9 pr-3 text-xs font-mono text-[#2E2018] placeholder:text-[#7A6A5C] outline-none transition-all"
            />
          </div>
        </div>

        {/* Entries */}
        <div className="max-h-[550px] overflow-y-auto divide-y divide-[#E4D8C3] font-mono text-xs bg-[#FAF6EF]">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-[#7A6A5C]">
              <Clock className="w-8 h-8 mx-auto mb-2.5 opacity-40 text-[#7A6A5C]" />
              <p className="font-sans font-medium text-[#7A6A5C]">Tidak ada catatan audit yang cocok dengan kriteria filter.</p>
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              const meta = getActionMeta(log.action);
              const Icon = meta.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-4 p-4 hover:bg-[#F3EBDD] transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${meta.badgeBg} border ${meta.badgeBorder} ${meta.color} mt-0.5 shadow-xs`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`font-semibold ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="text-[#E4D8C3]">·</span>
                        <span className="text-[#2E2018] font-bold bg-[#EFE6D8] px-2 py-0.5 rounded-md border border-[#E4D8C3]">
                          {log.target || log.nim || 'System'}
                        </span>
                      </div>
                      <p className="text-[#3B2E26] text-xs font-sans leading-relaxed">
                        {log.detail || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-[#7A6A5C] text-[11px] tabular-nums font-mono">
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
