import React, { useState } from 'react';
import { ShieldAlert, KeyRound, AlertTriangle, Info, Search, Clock, XCircle, Zap, RotateCcw, UserX, UserCheck } from 'lucide-react';

const ACTION_META = {
  BOOST_PRIORITY: {
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Boost Priority',
  },
  UNBOOST_PRIORITY: {
    icon: RotateCcw,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    label: 'Revert Standard',
  },
  AUTO_EXPIRE_BOOST: {
    icon: Clock,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Auto Expire',
  },
  KILL_PROCESS: {
    icon: XCircle,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    label: 'Kill Process',
  },
  KILL_USER_ALL: {
    icon: ShieldAlert,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    label: 'Kill All',
  },
  BLOCK_USER: {
    icon: UserX,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    label: 'Block User',
  },
  UNBLOCK_USER: {
    icon: UserCheck,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    label: 'Unblock User',
  },
  RESET_PASSWORD: {
    icon: KeyRound,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Reset Password',
  },
  SET_ROLE: {
    icon: ShieldCheck,
    color: 'text-[#c0c1ff]',
    bg: 'bg-[#c0c1ff]/10',
    border: 'border-[#c0c1ff]/20',
    label: 'Ubah Role',
  },
  LOGIN_DASHBOARD: {
    icon: UserCheck,
    color: 'text-[#4cd7f6]',
    bg: 'bg-[#4cd7f6]/10',
    border: 'border-[#4cd7f6]/20',
    label: 'Login Admin',
  },
  OVER_QUOTA: {
    icon: AlertTriangle,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    label: 'Over Quota',
    pulse: true,
  },
  SIMULATION_START: {
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    label: 'Simulation',
  },
};

function getActionMeta(action) {
  return ACTION_META[action] || {
    icon: Info,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
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
    { id: 'ALL',            label: `Semua (${logs.length})` },
    { id: 'BOOST_PRIORITY', label: 'Boost Priority' },
    { id: 'KILL_PROCESS',   label: 'Kill Process' },
    { id: 'RESET_PASSWORD', label: 'Reset PW' },
    { id: 'OVER_QUOTA',     label: 'Over Quota' },
  ];

  return (
    <div className="bg-[#181b25] rounded-2xl border border-[#46455430] overflow-hidden shadow-xl flex flex-col h-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 pb-5 border-b border-slate-700/50 bg-[#0a0e17]/50">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="font-bold text-sm text-[#dfe2ef] tracking-tight">
              Audit Log Laboratorium
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#1c1f29] border border-[#46455430] text-[10px] font-mono text-[#908fa0]">
              {logs.length} Entri
            </span>
          </div>
          <p className="text-xs text-[#908fa0] ml-11">
            Pencatatan real-time aksi kill, reset password, dan deteksi pelanggaran kuota.
          </p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 border-b border-[#46455420] bg-[#0f131c]/50">
        <div className="flex gap-2 p-1 bg-[#0a0e17] rounded-xl border border-[#46455430] w-full sm:w-auto overflow-x-auto">
          {filterChips.map(chip => (
            <button
              key={chip.id}
              onClick={() => setFilter(chip.id)}
              className={`px-3.5 py-1.5 text-xs font-mono font-medium rounded-lg transition-all whitespace-nowrap ${
                filter === chip.id 
                  ? 'bg-[#1c1f29] text-[#c0c1ff] border border-[#c0c1ff]/30 shadow-sm' 
                  : 'text-[#908fa0] border border-transparent hover:text-[#dfe2ef]'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari user, PID, atau keterangan…"
            className="w-full bg-[#0a0e17] border border-[#46455430] rounded-xl py-2 pl-9 pr-4 text-xs font-mono text-[#dfe2ef] placeholder:text-[#908fa0] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto max-h-[520px]">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-8 h-8 text-[#46455440] mx-auto mb-3" />
            <p className="text-xs font-mono text-[#908fa0]">Tidak ada riwayat aktivitas yang sesuai filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#46455420]">
            {filteredLogs.map((log, idx) => {
              const meta = getActionMeta(log.action);
              const Icon = meta.icon;
              return (
                <div key={idx} className="flex items-start gap-4 p-5 hover:bg-[#1c1f29]/40 transition-colors group">
                  {/* Icon */}
                  <div className={`flex items-center justify-center rounded-xl shrink-0 w-10 h-10 ${meta.bg} border ${meta.border} shadow-sm`}>
                    <Icon className={`w-4 h-4 ${meta.color} ${meta.pulse ? 'animate-pulse' : ''}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-xs font-bold uppercase tracking-wider ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-[#464554] text-xs">•</span>
                      <span className="text-xs font-mono font-bold text-[#dfe2ef] bg-[#1c1f29] px-2 py-0.5 rounded border border-[#46455430]">
                        {log.target}
                      </span>
                    </div>
                    <p className="text-xs text-[#908fa0] leading-relaxed">
                      {log.detail}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <div className="shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
                    <span className="text-[10px] font-mono text-[#c7c4d7] px-2.5 py-1 bg-[#0a0e17] rounded-lg border border-[#46455430]">
                      {log.time}
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
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
  );
}
