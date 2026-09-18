import React, { useState } from 'react';
import {
  ShieldAlert,
  KeyRound,
  AlertTriangle,
  Info,
  Clock,
  Download,
  Search
} from 'lucide-react';

export default function AuditLogView({ logs = [] }) {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter((log) => {
    if (filter !== 'ALL' && log.action !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const target = (log.target || '').toLowerCase();
      const detail = (log.detail || '').toLowerCase();
      return target.includes(q) || detail.includes(q);
    }
    return true;
  });

  const getActionBadge = (action) => {
    switch (action) {
      case 'KILL_PROCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-3 h-3" /> KILL PROCESS
          </span>
        );
      case 'RESET_PASSWORD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <KeyRound className="w-3 h-3" /> RESET PASSWORD
          </span>
        );
      case 'OVER_QUOTA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/40 animate-pulse">
            <AlertTriangle className="w-3 h-3" /> OVER QUOTA
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <Info className="w-3 h-3" /> {action}
          </span>
        );
    }
  };

  const downloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `audit-log-umpo-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Riwayat Aktivitas & Audit Log Laboratorium
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Pencatatan real-time aksi penghentian proses praktikan, reset password, dan deteksi pelanggaran kuota VRAM.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadJSON}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Unduh Log (.JSON)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari user praktikan, PID, atau keterangan log..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'Semua Log' },
            { id: 'KILL_PROCESS', label: 'Kill Process' },
            { id: 'RESET_PASSWORD', label: 'Reset Password' },
            { id: 'OVER_QUOTA', label: 'Over Quota' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                filter === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
            Tidak ada riwayat aktivitas yang sesuai filter.
          </div>
        ) : (
          filteredLogs.map((log, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs"
            >
              <div className="flex items-start sm:items-center gap-3">
                <span className="text-slate-500 text-[11px] bg-slate-900 px-2 py-1 rounded border border-slate-800 shrink-0">
                  {log.time}
                </span>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {getActionBadge(log.action)}
                    <span className="text-slate-200 font-bold">{log.target}</span>
                  </div>
                  <p className="text-slate-400 text-xs font-sans font-normal">
                    {log.detail}
                  </p>
                </div>
              </div>

              <div className="text-slate-500 text-[11px] self-end sm:self-center shrink-0">
                Status: <span className="text-emerald-400">Terekam</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
