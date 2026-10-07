import React, { useState, useMemo, memo } from 'react';
import {
  Cpu,
  XCircle,
  Play,
  Square,
  Lock,
  Activity,
  Zap,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  X,
  Clock,
  Copy,
  ChevronRight,
  Server,
  AlertTriangle
} from 'lucide-react';

/* ── Process Inspector Drawer ── */
function ProcessDrawer({ proc, onClose, onKill, isAdmin }) {
  if (!proc) return null;
  const isProtected = proc.is_system || !proc.is_killable;

  const copy = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div
      className="fixed inset-0 z-50 flex"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-md transition-opacity" />
      {/* Drawer panel */}
      <div
        className="w-full max-w-md bg-[#181b25] border-l border-slate-700/50 h-[100dvh] overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50 bg-[#0a0e17]/50">
          <div>
            <h3 className="font-bold text-sm text-[#dfe2ef] tracking-tight">
              Process Inspector
            </h3>
            <p className="text-xs font-mono text-[#908fa0] mt-1">
              PID {proc.pid} · {proc.gpu_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1c1f29] border border-[#46455430] text-[#908fa0] hover:text-[#dfe2ef] hover:border-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-6 p-6">
          {/* Status chip */}
          <div className="flex items-center gap-3">
            {isProtected ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <Shield className="w-3.5 h-3.5" />
                Proses Sistem (Terproteksi)
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <Zap className="w-3.5 h-3.5" />
                Job User
              </span>
            )}
            {proc.username === 'labriset' && (
              <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold shadow-sm">
                Riset Dosen
              </span>
            )}
          </div>

          {/* Metadata table */}
          <div className="bg-[#0a0e17] rounded-xl border border-[#46455430] overflow-hidden">
            {[
              { label: 'Pemilik',   value: proc.username,         mono: true, color: 'text-indigo-400' },
              { label: 'PID',       value: proc.pid,               mono: true, color: 'text-[#dfe2ef]' },
              { label: 'Nama Proses', value: proc.name,            mono: true, color: 'text-[#4edea3]' },
              { label: 'GPU',       value: proc.gpu_name,          mono: true, color: 'text-amber-400' },
              { label: 'CPU%',      value: `${proc.cpu_percent}%`, mono: true, color: 'text-rose-400' },
              { label: 'RAM Host',  value: `${proc.ram_mb || 0} MB`, mono: true, color: 'text-blue-400' },
              { label: 'VRAM',      value: `${proc.vram_mb} MB`,  mono: true, color: 'text-amber-400' },
              { label: 'Uptime',    value: proc.uptime || '—',     mono: true, color: 'text-[#c7c4d7]' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="flex justify-between items-center p-3 border-b border-[#46455430] last:border-b-0"
              >
                <span className="text-xs font-mono text-[#908fa0] uppercase tracking-wider">
                  {label}
                </span>
                <span className={`text-xs font-bold font-mono ${color}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Cmdline */}
          {proc.cmdline && (
            <div>
              <p className="text-xs font-mono text-[#908fa0] uppercase tracking-wider mb-2">
                Command Line
              </p>
              <div className="relative group bg-[#0a0e17] rounded-xl border border-[#46455430] p-3">
                <code className="block text-xs font-mono text-[#c7c4d7] break-all pr-8">
                  {proc.cmdline}
                </code>
                <button
                  onClick={() => copy(proc.cmdline)}
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg bg-[#1c1f29] border border-[#46455430] text-[#908fa0] hover:text-[#dfe2ef] transition-colors"
                  title="Copy command"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Idle VRAM warning */}
          {(proc.vram_mb > 500 && (proc.cpu_percent === 0 || proc.cpu_percent < 1)) && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
              <div>
                <p className="font-bold text-xs text-amber-500 mb-1">
                  Idle VRAM Detected
                </p>
                <p className="text-xs text-[#908fa0] leading-relaxed">
                  Proses mengalokasikan <strong className="text-amber-400">{proc.vram_mb} MB</strong> VRAM namun CPU idle. Kemungkinan zombie process atau training selesai namun memory belum dibebaskan.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-auto p-6 border-t border-slate-700/50 bg-[#0a0e17]/50 text-center">
          {!isProtected && isAdmin ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onKill) {
                  onKill({
                    pid: proc.pid,
                    username: proc.username,
                    procName: proc.name,
                    cmdline: proc.cmdline,
                    vramMb: proc.vram_mb,
                    is_system: proc.is_system
                  });
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 text-rose-300 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <XCircle className="w-4 h-4" />
              Hentikan Proses (PID {proc.pid})
            </button>
          ) : (
            <p className="text-xs text-[#908fa0] font-mono leading-relaxed">
              {isProtected
                ? '// Proses sistem terproteksi tidak dapat dihentikan.'
                : '// Login sebagai Admin untuk menghentikan proses ini.'
              }
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main ProcessManager ── */
function ProcessManager({
  processes = [],
  isAdmin,
  onOpenKillModal,
  onRunSimulation,
  onStopSimulation,
  isSimulating,
  onOpenPinModal
}) {
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [inspectedProc, setInspectedProc] = useState(null);

  const filteredProcesses = useMemo(() => {
    return processes.filter((p) => {
      if (filterType === 'user' && (p.is_system || !p.is_killable)) return false;
      if (filterType === 'system' && !p.is_system && p.is_killable) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.username?.toLowerCase().includes(q) ||
          p.name?.toLowerCase().includes(q) ||
          p.cmdline?.toLowerCase().includes(q) ||
          String(p.pid).includes(q)
        );
      }
      return true;
    });
  }, [processes, filterType, search]);

  const stats = useMemo(() => {
    const userJobs = processes.filter((p) => !p.is_system && p.is_killable).length;
    const sysJobs  = processes.filter((p) => p.is_system || !p.is_killable).length;
    const idleVram = processes.filter(p =>
      !p.is_system && p.is_killable && p.vram_mb > 500 && (p.cpu_percent === 0 || p.cpu_percent < 1)
    ).length;
    return { userJobs, sysJobs, idleVram };
  }, [processes]);

  const filterChips = [
    { id: 'all',    label: `Semua (${processes.length})` },
    { id: 'user',   label: `User (${stats.userJobs})` },
    { id: 'system', label: `Sistem (${stats.sysJobs})` },
  ];

  return (
    <>
      <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in duration-300">
        
        {/* Header Content */}
        <div className="p-6 overflow-y-auto">
          {/* Header Description & Buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                </div>
                <h2 className="font-bold text-lg text-[#dfe2ef] tracking-tight">
                  Manajemen Job & Proses
                </h2>
              </div>
              <p className="text-xs text-[#908fa0]">
                Monitor utilisasi CPU, RAM, dan VRAM. Proses sistem dilindungi dari penghentian.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {isAdmin ? (
                <>
                  <button
                    onClick={onRunSimulation}
                    disabled={isSimulating}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Uji Beban (11 User)
                  </button>
                  <button
                    onClick={onStopSimulation}
                    className="px-4 py-2 rounded-xl bg-[#1c1f29] border border-[#46455430] text-xs font-semibold text-[#908fa0] hover:text-rose-400 hover:border-rose-500/30 transition-colors flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" />
                    Stop Semua
                  </button>
                </>
              ) : (
                <button
                  onClick={onOpenPinModal}
                  className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-500 hover:bg-amber-500/20 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Lock className="w-4 h-4" />
                  Buka Admin untuk Kill
                </button>
              )}
            </div>
          </div>

          {/* Bento Grid Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#181b25] border border-[#46455430] rounded-2xl p-5 hover:border-[#c0c1ff]/40 transition-all shadow-lg group relative overflow-hidden">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#c0c1ff]/15 flex items-center justify-center border border-[#c0c1ff]/30 text-[#c0c1ff]">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#dfe2ef] font-mono tracking-tight">{processes.length}</div>
                  <div className="text-[11px] text-[#908fa0] font-mono uppercase tracking-wider">Total Proses</div>
                </div>
              </div>
              <div className="flex gap-2 font-mono text-[11px]">
                <span className="px-2 py-0.5 bg-[#1c1f29] rounded-lg text-[#dfe2ef] border border-[#46455430] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  <strong className="text-indigo-400">{stats.userJobs}</strong> User
                </span>
                <span className="px-2 py-0.5 bg-[#1c1f29] rounded-lg text-[#dfe2ef] border border-[#46455430] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <strong className="text-emerald-400">{stats.sysJobs}</strong> System
                </span>
              </div>
            </div>

            <div className="bg-[#181b25] border border-[#46455430] rounded-2xl p-5 hover:border-[#4cd7f6]/40 transition-all shadow-lg group relative overflow-hidden">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#4cd7f6]/15 flex items-center justify-center border border-[#4cd7f6]/30 text-[#4cd7f6]">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#dfe2ef] font-mono tracking-tight">System</div>
                  <div className="text-[11px] text-[#908fa0] font-mono uppercase tracking-wider">Load Balance</div>
                </div>
              </div>
              <div className="w-full bg-[#262a34] h-1.5 rounded-full overflow-hidden mb-2">
                <div className="bg-[#4cd7f6] h-full rounded-full transition-all" style={{ width: `${Math.min((stats.userJobs / (processes.length || 1)) * 100, 100)}%` }}></div>
              </div>
              <p className="text-[10px] text-[#908fa0] font-mono">User Jobs Dominance: {Math.round((stats.userJobs / (processes.length || 1)) * 100)}%</p>
            </div>

            <div className={`bg-[#181b25] border ${stats.idleVram > 0 ? 'border-amber-500/30' : 'border-[#46455430] hover:border-emerald-500/40'} rounded-2xl p-5 transition-all shadow-lg group relative overflow-hidden`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${stats.idleVram > 0 ? 'bg-amber-500/15 border-amber-500/30 text-amber-500' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'}`}>
                  {stats.idleVram > 0 ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#dfe2ef] font-mono tracking-tight">{stats.idleVram}</div>
                  <div className="text-[11px] text-[#908fa0] font-mono uppercase tracking-wider">Idle VRAM Warnings</div>
                </div>
              </div>
              {stats.idleVram > 0 ? (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Proses menahan memori GPU tanpa CPU Load
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Semua alokasi GPU berjalan optimal
                </div>
              )}
            </div>
          </div>

          {/* Filter & Search Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex gap-2 p-1 bg-[#0a0e17] rounded-xl border border-[#46455430] overflow-x-auto w-full sm:w-auto">
              {filterChips.map(chip => (
                <button
                  key={chip.id}
                  onClick={() => setFilterType(chip.id)}
                  className={`px-3.5 py-1.5 text-xs font-mono font-medium rounded-lg transition-all whitespace-nowrap ${
                    filterType === chip.id 
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
                placeholder="Cari PID / User / Skrip…"
                className="w-full bg-[#0a0e17] border border-[#46455430] rounded-xl py-2 pl-9 pr-4 text-xs font-mono text-[#dfe2ef] placeholder:text-[#908fa0] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Unified Table */}
          <div className="bg-[#181b25] rounded-2xl border border-[#46455430] overflow-hidden shadow-xl">
            {filteredProcesses.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-xl bg-[#1c1f29] border border-[#46455430] flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-6 h-6 text-[#464554]" />
                </div>
                <h3 className="text-sm font-bold text-[#dfe2ef] mb-1">Belum ada proses aktif</h3>
                <p className="text-xs text-[#908fa0] mb-6">Job user akan muncul di sini ketika skrip Python/PyTorch berjalan.</p>
                {isAdmin && (
                  <button
                    onClick={onRunSimulation}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors inline-flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Jalankan Uji Beban Sekarang
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0a0e17]/80 font-mono text-[10px] uppercase tracking-wider text-[#908fa0] border-b border-[#46455430]">
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-5 py-3.5">PID</th>
                      <th className="px-5 py-3.5">GPU</th>
                      <th className="px-5 py-3.5">Task / Skrip</th>
                      <th className="px-5 py-3.5">Tipe</th>
                      <th className="px-5 py-3.5 text-rose-400">CPU%</th>
                      <th className="px-5 py-3.5 text-blue-400">RAM</th>
                      <th className="px-5 py-3.5 text-amber-400">VRAM</th>
                      <th className="px-5 py-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredProcesses.map((proc) => {
                      const isRiset     = proc.username === 'labriset';
                      const isProtected = proc.is_system || !proc.is_killable;
                      const isIdleVram  = !isProtected && proc.vram_mb > 500 && (proc.cpu_percent === 0 || proc.cpu_percent < 1);

                      return (
                        <tr
                          key={proc.pid}
                          onClick={() => setInspectedProc(proc)}
                          className="hover:bg-[#1c1f29]/70 transition-colors group cursor-pointer"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#dfe2ef]">
                                {proc.username}
                              </span>
                              {isRiset && (
                                <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-bold font-mono uppercase">
                                  Riset
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-mono text-[#908fa0]">
                            {proc.pid}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="px-2 py-0.5 rounded-full bg-[#1c1f29] border border-[#46455430] text-[#c7c4d7] text-[10px] font-mono">
                              {proc.gpu_name}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 max-w-[160px]">
                            <div className="truncate text-xs font-semibold text-[#4edea3]" title={proc.name}>
                              {proc.name}
                            </div>
                            {proc.cmdline && (
                              <div className="truncate text-[10px] font-mono text-[#908fa0] mt-0.5" title={proc.cmdline}>
                                {proc.cmdline}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            {isProtected ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono flex items-center gap-1 w-fit">
                                <ShieldCheck className="w-3 h-3" /> Sistem
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono flex items-center gap-1 w-fit">
                                <Zap className="w-3 h-3" /> User
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-xs font-mono font-bold text-rose-400">
                            {proc.cpu_percent}%
                          </td>
                          <td className="px-5 py-3.5 text-xs font-mono text-blue-400">
                            {proc.ram_mb || 0}MB
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-amber-400">
                                {proc.vram_mb}MB
                              </span>
                              {isIdleVram && (
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[9px] font-mono uppercase flex items-center gap-1" title="VRAM dialokasikan namun proses idle">
                                  <ShieldAlert className="w-2.5 h-2.5" /> Idle
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {isProtected ? (
                              <span className="px-2 py-1 rounded-lg bg-[#1c1f29] border border-[#46455430] text-[#908fa0] text-[10px] font-mono flex items-center gap-1 w-fit ml-auto">
                                <Shield className="w-3 h-3 text-[#908fa0]" /> Terlindungi
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold w-fit ml-auto shadow-sm">
                                Aktif
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Row count footer */}
          {filteredProcesses.length > 0 && (
            <div className="flex items-center justify-between pt-4 mt-2">
              <span className="text-[11px] font-mono text-[#908fa0]">
                Menampilkan {filteredProcesses.length} proses dari {processes.length} total
              </span>
              <span className="text-[11px] font-mono text-[#908fa0]">
                Klik baris untuk melihat inspeksi detail
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Process Inspector Drawer */}
      {inspectedProc && (
        <ProcessDrawer
          proc={inspectedProc}
          onClose={() => setInspectedProc(null)}
          onKill={onOpenKillModal}
          isAdmin={isAdmin}
        />
      )}
    </>
  );
}

export default memo(ProcessManager);
