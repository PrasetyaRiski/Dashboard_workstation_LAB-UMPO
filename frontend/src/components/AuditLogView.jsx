import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldAlert, KeyRound, AlertTriangle, Info, Search, Clock,
  XCircle, Zap, RotateCcw, UserX, UserCheck, ShieldCheck, SlidersHorizontal,
  RefreshCw, Cpu, UserPlus, LogIn
} from 'lucide-react';

const ACTION_META = {
  BOOST_PRIORITY: {
    icon: Zap,
    color: 'text-amber-700',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    label: 'Boost Prioritas GPU',
  },
  UNBOOST_PRIORITY: {
    icon: RotateCcw,
    color: 'text-slate-600',
    badgeBg: 'bg-slate-100',
    badgeBorder: 'border-slate-200',
    label: 'Lepas Prioritas GPU',
  },
  GPU_BOOST: {
    icon: Zap,
    color: 'text-sky-700',
    badgeBg: 'bg-sky-50',
    badgeBorder: 'border-sky-200',
    label: 'GPU Boost Level 2',
  },
  GPU_UNBOOST: {
    icon: RotateCcw,
    color: 'text-slate-600',
    badgeBg: 'bg-slate-100',
    badgeBorder: 'border-slate-200',
    label: 'Cabut GPU Boost',
  },
  AUTO_EXPIRE_BOOST: {
    icon: Clock,
    color: 'text-amber-700',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    label: 'Boost Kedaluwarsa',
  },
  AUTO_EXPIRE_GPU_BOOST: {
    icon: Clock,
    color: 'text-amber-700',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    label: 'GPU Boost Kedaluwarsa',
  },
  KILL_PROCESS: {
    icon: XCircle,
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    label: 'Hentikan Proses',
  },
  KILL_USER_ALL: {
    icon: AlertTriangle,
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    label: 'Terminasi Seluruh Sesi',
  },
  LOCK_USER: {
    icon: UserX,
    color: 'text-amber-600',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    label: 'Kunci Akun Pengguna',
  },
  BLOCK_USER: {
    icon: UserX,
    color: 'text-amber-600',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    label: 'Blokir Akun Pengguna',
  },
  UNLOCK_USER: {
    icon: UserCheck,
    color: 'text-emerald-600',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    label: 'Buka Kunci Akun',
  },
  UNBLOCK_USER: {
    icon: UserCheck,
    color: 'text-emerald-600',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    label: 'Aktifkan Kembali Akun',
  },
  RESET_PASSWORD: {
    icon: KeyRound,
    color: 'text-slate-700',
    badgeBg: 'bg-slate-100',
    badgeBorder: 'border-slate-200',
    label: 'Reset Password Linux',
  },
  SET_ROLE: {
    icon: ShieldCheck,
    color: 'text-sky-600',
    badgeBg: 'bg-sky-50',
    badgeBorder: 'border-sky-200',
    label: 'Ubah Role Pengguna',
  },
  OVER_QUOTA: {
    icon: ShieldAlert,
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    label: 'Storage Melebihi Kuota',
  },
  OVER_QUOTA_STORAGE: {
    icon: ShieldAlert,
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    label: 'Storage Melebihi Kuota',
  },
  BACKUP_DATABASE: {
    icon: ShieldCheck,
    color: 'text-emerald-600',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    label: 'Snapshot Backup DB',
  },
  CHANGE_LAB_PROFILE: {
    icon: SlidersHorizontal,
    color: 'text-sky-600',
    badgeBg: 'bg-sky-50',
    badgeBorder: 'border-sky-200',
    label: 'Ubah Mode Lab',
  },
  SET_LAB_MODE: {
    icon: SlidersHorizontal,
    color: 'text-sky-600',
    badgeBg: 'bg-sky-50',
    badgeBorder: 'border-sky-200',
    label: 'Ubah Mode Lab',
  },
  EMERGENCY_RELEASE_IDLE: {
    icon: Cpu,
    color: 'text-amber-700',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    label: 'Lepas Sesi Idle',
  },
  SWEEP_GPU_ZOMBIES: {
    icon: Cpu,
    color: 'text-amber-700',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    label: 'Sweep Proses GPU Zombie',
  },
  ADD_USER: {
    icon: UserPlus,
    color: 'text-emerald-600',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    label: 'Tambah Pengguna',
  },
  DELETE_USER: {
    icon: UserX,
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    label: 'Hapus Pengguna',
  },
  LOGIN_DASHBOARD: {
    icon: LogIn,
    color: 'text-slate-600',
    badgeBg: 'bg-slate-100',
    badgeBorder: 'border-slate-200',
    label: 'Login Dashboard',
  },
  LOGIN_FAILED: {
    icon: ShieldAlert,
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    label: 'Login Gagal',
  },
};

const FILTER_CHIPS = [
  { id: 'ALL', label: 'Semua' },
  { id: 'MODE', label: 'Mode Lab', actions: ['SET_LAB_MODE', 'CHANGE_LAB_PROFILE'] },
  {
    id: 'BOOST',
    label: 'Boost',
    actions: [
      'BOOST_PRIORITY', 'UNBOOST_PRIORITY', 'GPU_BOOST', 'GPU_UNBOOST',
      'AUTO_EXPIRE_BOOST', 'AUTO_EXPIRE_GPU_BOOST',
    ],
  },
  { id: 'KILL_PROCESS', label: 'Kill Proses', actions: ['KILL_PROCESS', 'KILL_USER_ALL'] },
  { id: 'RESET_PASSWORD', label: 'Reset PW', actions: ['RESET_PASSWORD'] },
  { id: 'USER_ACCESS', label: 'Akun', actions: ['SET_ROLE', 'BLOCK_USER', 'UNBLOCK_USER', 'LOCK_USER', 'UNLOCK_USER', 'ADD_USER', 'DELETE_USER'] },
  { id: 'OVER_QUOTA', label: 'Over Quota', actions: ['OVER_QUOTA', 'OVER_QUOTA_STORAGE'] },
];

function getActionMeta(action) {
  return ACTION_META[action] || {
    icon: Info,
    color: 'text-slate-500',
    badgeBg: 'bg-slate-100',
    badgeBorder: 'border-slate-200',
    label: action,
  };
}

export default function AuditLogView({ logs = [], adminToken = '' }) {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [remoteLogs, setRemoteLogs] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const fetchLogs = useCallback(async () => {
    if (!adminToken) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/audit-logs?limit=200&_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (Array.isArray(json.logs)) {
        setRemoteLogs(json.logs);
        setFetchError('');
      }
    } catch (err) {
      setFetchError('Gagal memuat riwayat terbaru dari server.');
      console.error('Fetch audit logs error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [adminToken]);

  // Muat riwayat lengkap saat tab dibuka, lalu segarkan berkala.
  useEffect(() => {
    fetchLogs();
    if (!adminToken) return undefined;
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, [fetchLogs, adminToken]);

  const safeLogs = Array.isArray(remoteLogs)
    ? remoteLogs
    : (Array.isArray(logs) ? logs : []);
  const activeChip = FILTER_CHIPS.find((chip) => chip.id === filter) || FILTER_CHIPS[0];

  const filteredLogs = safeLogs.filter((log) => {
    if (activeChip.actions && !activeChip.actions.includes(log.action)) return false;
    if (search) {
      const q = search.toLowerCase().trim();
      const targetStr = String(log.target || log.nim || '').toLowerCase();
      const detailStr = String(log.detail || '').toLowerCase();
      const actionStr = String(log.action || '').toLowerCase();
      return targetStr.includes(q) || detailStr.includes(q) || actionStr.includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4 font-sans">
      {/* Integrity Compliance Info Bar */}
      <div className="surface-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-800 shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="academic-eyebrow">Jejak Audit</span>
            <div className="flex items-center gap-2.5">
              <h2 className="font-academic text-base sm:text-lg text-slate-900">
                Log Audit Operasional
              </h2>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                SQLite WAL
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Pencatatan persisten aktivitas administratif level kernel &amp; aplikasi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-slate-50 text-slate-800 font-mono text-xs font-semibold rounded-xl border border-slate-200 shadow-xs">
            {safeLogs.length} Peristiwa Terekam
          </span>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={isRefreshing || !adminToken}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-mono text-xs font-medium rounded-xl border border-slate-200 shadow-xs transition-colors min-h-[36px] cursor-pointer"
            title="Muat ulang log audit dari server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Segarkan
          </button>
        </div>
      </div>

      {/* Main Table / Stream Container */}
      <div className="surface-card overflow-hidden flex flex-col">
        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-white rounded-xl border border-slate-200 shadow-xs">
            {FILTER_CHIPS.map((chip) => {
              const active = filter === chip.id;
              const chipCount = chip.id === 'ALL'
                ? safeLogs.length
                : safeLogs.filter((log) => chip.actions && chip.actions.includes(log.action)).length;
              return (
                <button
                  key={chip.id}
                  onClick={() => setFilter(chip.id)}
                  className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-colors whitespace-nowrap min-h-[36px] cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  type="button"
                >
                  {chip.label}
                  {chipCount > 0 && (
                    <span className={`ml-1.5 text-[10px] tabular-nums ${active ? 'text-slate-300' : 'text-slate-400'}`}>
                      {chipCount}
                    </span>
                  )}
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
              className="w-full bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl py-2 pl-9 pr-3 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-xs"
            />
          </div>
        </div>

        {fetchError && (
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-sans">
            {fetchError}
          </div>
        )}

        {/* Entries */}
        <div className="max-h-[550px] overflow-y-auto divide-y divide-slate-100 font-mono text-xs bg-white">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2.5 opacity-40 text-slate-300" />
              <p className="font-sans font-medium text-slate-500">Tidak ada catatan audit yang cocok dengan kriteria filter.</p>
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              const meta = getActionMeta(log.action);
              const Icon = meta.icon;
              return (
                <div
                  key={log.id || idx}
                  className="flex items-start justify-between gap-4 p-4 hover:bg-slate-50 transition-colors"
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
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
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
