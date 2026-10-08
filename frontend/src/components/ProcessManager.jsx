import React, { useState, useMemo } from 'react';
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
  Server,
  AlertTriangle,
  HardDrive
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
      <div className="flex-1 bg-black  transition-opacity" />
      {/* Drawer panel */}
      <div
        className="w-full max-w-md bg-surface-2 border-l border-border-base h-[100dvh] overflow-y-auto flex flex-col animate-in slide-in- duration-300 shadow-sm"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-subtle bg-surface-1/70">
          <div>
            <h3 className="font-bold text-sm text-text-primary tracking-tight">
              Process Inspector
            </h3>
            <p className="text-xs font-mono text-text-muted mt-1">
              PID {proc.pid} · {proc.gpu_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-3 border border-border-base text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-6 p-6">
          {/* Status chip */}
          <div className="flex items-center gap-3">
            {isProtected ? (
              <span className="px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-neon-emerald text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <Shield className="w-3.5 h-3.5" />
                Proses Sistem (Terproteksi)
              </span>
            ) : (
              <span className="px-3 py-1 rounded-md bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <Zap className="w-3.5 h-3.5" />
                Job User Compute
              </span>
            )}
            {proc.username === 'labriset' && (
              <span className="px-3 py-1 rounded-md bg-secondary-container text-secondary-fixed text-xs font-semibold shadow-sm">
                Riset Dosen
              </span>
            )}
          </div>

          {/* Metadata table */}
          <div className="bg-surface-1 rounded-xl border border-border-subtle overflow-hidden">
            {[
              { label: 'Pemilik',     value: proc.username,         mono: true, color: 'text-secondary-fixed' },
              { label: 'PID',         value: proc.pid,              mono: true, color: 'text-text-primary' },
              { label: 'Nama Proses', value: proc.name,             mono: true, color: 'text-neon-emerald' },
              { label: 'GPU',         value: proc.gpu_name,         mono: true, color: 'text-neon-amber' },
              { label: 'CPU%',        value: `${proc.cpu_percent}%`, mono: true, color: 'text-neon-rose' },
              { label: 'RAM Host',    value: `${proc.ram_mb || 0} MB`, mono: true, color: 'text-primary' },
              { label: 'VRAM',        value: `${proc.vram_mb} MB`,  mono: true, color: 'text-neon-cyan' },
              { label: 'Durasi',      value: proc.uptime || '—',    mono: true, color: 'text-text-muted' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="flex justify-between items-center p-3 border-b border-border-subtle last:border-b-0"
              >
                <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
                  {label}
                </span>
                <span className={`text-xs font-mono font-bold ${color}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Command Line Preview */}
          {proc.cmdline && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
                  Command Line
                </span>
                <button
                  onClick={() => copy(proc.cmdline)}
                  className="flex items-center gap-1 text-[11px] font-mono text-text-muted hover:text-neon-cyan transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Salin
                </button>
              </div>
              <pre className="p-3 bg-surface-1 border border-border-subtle rounded-xl text-xs font-mono text-text-primary overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                {proc.cmdline}
              </pre>
            </div>
          )}

          {/* Action */}
          {isAdmin && !isProtected ? (
            <button
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
              className="w-full py-2.5 px-4 rounded-xl bg-error-container/30 border border-error-container/60 hover:bg-error-container/50 text-neon-rose font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <XCircle className="w-4 h-4" />
              Hentikan Proses (PID {proc.pid})
            </button>
          ) : (
            <p className="text-xs text-text-muted font-mono leading-relaxed">
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
export default function ProcessManager({
  processes = [],
  isAdmin,
  isSuperAdmin,
  adminRole,
  onOpenKillModal,
  onRunSimulation,
  onStopSimulation,
  isSimulating,
  onOpenPinModal
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'gpu0' | 'gpu1' | 'highmem'
  const [search, setSearch] = useState('');
  const [inspectedProc, setInspectedProc] = useState(null);

  // Stats calculation
  const totalProcesses = processes.length;
  const gpu0Processes = useMemo(() => processes.filter(p => p.gpu_index === 0 || p.gpu_name?.includes('0')), [processes]);
  const gpu1Processes = useMemo(() => processes.filter(p => p.gpu_index === 1 || p.gpu_name?.includes('1')), [processes]);
  const highMemProcesses = useMemo(() => processes.filter(p => (p.vram_mb || 0) > 8000), [processes]);

  const totalVramMb = useMemo(() => processes.reduce((acc, p) => acc + (p.vram_mb || 0), 0), [processes]);
  const totalVramGb = (totalVramMb / 1024).toFixed(1);

  const gpu0VramGb = (gpu0Processes.reduce((acc, p) => acc + (p.vram_mb || 0), 0) / 1024).toFixed(1);
  const gpu1VramGb = (gpu1Processes.reduce((acc, p) => acc + (p.vram_mb || 0), 0) / 1024).toFixed(1);

  const highPriorityCount = useMemo(() => processes.filter(p => p.username === 'labriset' || p.is_priority).length, [processes]);
  const workerCount = totalProcesses - highPriorityCount;

  const filteredProcesses = useMemo(() => {
    return processes.filter((p) => {
      if (filterType === 'gpu0' && !(p.gpu_index === 0 || p.gpu_name?.includes('0'))) return false;
      if (filterType === 'gpu1' && !(p.gpu_index === 1 || p.gpu_name?.includes('1'))) return false;
      if (filterType === 'highmem' && (p.vram_mb || 0) <= 8000) return false;
      if (search) {
        const q = search.toLowerCase().trim();
        return (
          String(p.username || '').toLowerCase().includes(q) ||
          String(p.name || '').toLowerCase().includes(q) ||
          String(p.cmdline || '').toLowerCase().includes(q) ||
          String(p.pid || '').includes(q)
        );
      }
      return true;
    });
  }, [processes, filterType, search]);

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Dynamic Operational Backdrop Banner — Stitch Style */}
      <div className="relative w-full overflow-hidden rounded-xl bg-surface-1 shadow-md border border-border-subtle p-6">
        <div className="absolute -top-24 right-1/4 w-96 h-96 rounded-md bg-primary/5 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-12 w-80 h-80 rounded-md bg-secondary-container/10 blur-3xl pointer-events-none"></div>

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 z-10">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-surface-3 font-mono text-[10px] text-tertiary border border-border-base">
                <span className="w-2 h-2 rounded-md bg-neon-emerald animate-pulse"></span>
                CLUSTER DEDICATED ONLINE
              </span>
              <span className="font-mono text-xs text-text-muted">SLURM / CGROUP v2</span>
            </div>
            <h1 className="font-headline-lg text-2xl font-bold text-text-primary tracking-tight">
              Manajemen Job & Proses Komputasi
            </h1>
            <p className="text-xs text-on-surface-variant max-w-2xl leading-relaxed">
              Konsol orkestrasi beban komputasi AI real-time Node UMPO AI-HPC. Memonitor alokasi CUDA context, memory isolation, serta QoS slice eksekusi model.
            </p>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {isSuperAdmin ? (
              <>
                <button
                  onClick={onRunSimulation}
                  disabled={isSimulating}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-surface-dim font-headline-md text-xs font-bold shadow-md hover:bg-secondary-fixed transition-colors disabled:opacity-50"
                  type="button"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>⚡ Uji Beban (Run Simulation)</span>
                </button>
                <button
                  onClick={onStopSimulation}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-3 text-neon-rose font-headline-md text-xs font-semibold hover:bg-error-container/20 transition-colors border border-border-base"
                  type="button"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>🛑 Hentikan Simulasi</span>
                </button>
              </>
            ) : adminRole === 'aslab' ? (
              <div className="px-3.5 py-2 rounded-lg bg-neon-cyan/15 border border-neon-cyan/30 text-neon-cyan text-xs font-mono font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Mode Operator Aslab: Kill Process Aktif</span>
              </div>
            ) : (
              <button
                onClick={onOpenPinModal}
                className="px-4 py-2 rounded-lg bg-surface-3 border border-border-base text-xs font-medium text-text-muted hover:text-text-primary transition-colors flex items-center gap-2"
                type="button"
              >
                <Lock className="w-3.5 h-3.5 text-neon-amber" />
                <span>Login Admin untuk Kontrol</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bento Telemetry Overview Bar (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stat 1: Running Compute */}
        <div className="p-5 rounded-xl bg-surface-2 border border-border-subtle shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
              Running Compute Tasks
            </span>
            <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center text-neon-cyan border border-neon-cyan/20">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-bold text-text-primary">
                {totalProcesses}
              </span>
              <span className="font-mono text-xs text-neon-cyan font-bold">Proses Aktif</span>
            </div>
            <div className="flex items-center justify-between pt-1 font-mono text-[10px] text-outline">
              <span>{highPriorityCount} Prioritas Tinggi</span>
              <span>{workerCount} Worker Bersama</span>
            </div>
          </div>
          <div className="w-full h-1.5 rounded-md bg-surface-variant overflow-hidden">
            <div
              className="h-full bg-neon-cyan rounded-md transition-all duration-500"
              style={{ width: `${Math.min(100, (totalProcesses / 15) * 100)}%` }}
            />
          </div>
        </div>

        {/* Stat 2: Total VRAM Teralokasi */}
        <div className="p-5 rounded-xl bg-surface-2 border border-border-subtle shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
              Total GPU VRAM Teralokasi
            </span>
            <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center text-neon-amber border border-neon-amber/20">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-bold text-text-primary">
                {totalVramGb}
              </span>
              <span className="font-mono text-xs text-text-muted">/ 32.0 GB Total</span>
            </div>
            <div className="flex items-center justify-between pt-1 font-mono text-[10px] text-outline">
              <span>GPU 0: {gpu0VramGb} GB</span>
              <span>GPU 1: {gpu1VramGb} GB</span>
            </div>
          </div>
          <div className="w-full h-1.5 rounded-md bg-surface-variant overflow-hidden">
            <div
              className="h-full bg-neon-amber rounded-md transition-all duration-500"
              style={{ width: `${Math.min(100, (Number(totalVramGb) / 32) * 100)}%` }}
            />
          </div>
        </div>

        {/* Stat 3: Avg Duration & Balance */}
        <div className="p-5 rounded-xl bg-surface-2 border border-border-subtle shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
              Alokasi Akselerator
            </span>
            <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center text-secondary border border-secondary/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-bold text-text-primary">
                {gpu0Processes.length} : {gpu1Processes.length}
              </span>
              <span className="font-mono text-xs text-tertiary">GPU 0 : GPU 1</span>
            </div>
            <div className="flex items-center justify-between pt-1 font-mono text-[10px] text-outline">
              <span>Dedicated: {gpu0Processes.length} task</span>
              <span>Shared Pool: {gpu1Processes.length} task</span>
            </div>
          </div>
          <div className="w-full h-1.5 rounded-md bg-surface-variant overflow-hidden">
            <div
              className="h-full bg-secondary-fixed-dim rounded-md transition-all duration-500"
              style={{ width: `${totalProcesses > 0 ? (gpu0Processes.length / totalProcesses) * 100 : 50}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter, Search and View Segment */}
      <div className="p-3 rounded-xl bg-surface-1 border border-border-subtle shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
          <input
            type="text"
            placeholder="Cari PID, Nama Pengguna, atau Skrip Model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-3 font-mono text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface-2 transition-colors border border-border-base"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-xs transition-colors border ${
              filterType === 'all'
                ? 'bg-secondary text-surface-dim font-bold border-secondary'
                : 'bg-surface-3 text-text-muted hover:text-text-primary border-border-base'
            }`}
            type="button"
          >
            <span>Semua Job</span>
            <span className="px-1.5 py-0.2 rounded-md bg-surface-dim/20 text-[10px] font-bold">
              {totalProcesses}
            </span>
          </button>
          <button
            onClick={() => setFilterType('gpu0')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-xs transition-colors border ${
              filterType === 'gpu0'
                ? 'bg-secondary text-surface-dim font-bold border-secondary'
                : 'bg-surface-3 text-text-muted hover:text-text-primary border-border-base'
            }`}
            type="button"
          >
            <span>GPU 0 Dedicated</span>
            <span className="px-1.5 py-0.2 rounded-md bg-surface-container-high text-neon-cyan text-[10px] font-bold">
              {gpu0Processes.length}
            </span>
          </button>
          <button
            onClick={() => setFilterType('gpu1')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-xs transition-colors border ${
              filterType === 'gpu1'
                ? 'bg-secondary text-surface-dim font-bold border-secondary'
                : 'bg-surface-3 text-text-muted hover:text-text-primary border-border-base'
            }`}
            type="button"
          >
            <span>GPU 1 Shared</span>
            <span className="px-1.5 py-0.2 rounded-md bg-surface-container-high text-secondary-fixed text-[10px] font-bold">
              {gpu1Processes.length}
            </span>
          </button>
          <button
            onClick={() => setFilterType('highmem')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-xs transition-colors border ${
              filterType === 'highmem'
                ? 'bg-secondary text-surface-dim font-bold border-secondary'
                : 'bg-surface-3 text-text-muted hover:text-text-primary border-border-base'
            }`}
            type="button"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-neon-amber" />
            <span>High VRAM (&gt;8GB)</span>
            <span className="px-1.5 py-0.2 rounded-md bg-surface-container-high text-neon-amber text-[10px] font-bold">
              {highMemProcesses.length}
            </span>
          </button>
        </div>
      </div>

      {/* Unified Process Table Section */}
      <div className="rounded-xl bg-surface-1 shadow-sm overflow-hidden border border-border-subtle flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1100px]">
            <thead className="bg-surface-2 text-text-muted font-mono text-[10px] uppercase tracking-wider border-b border-border-subtle">
              <tr>
                <th className="px-4 py-3">PID</th>
                <th className="px-4 py-3">Pengguna / Akun</th>
                <th className="px-4 py-3">Nama Perintah / Skrip Model</th>
                <th className="px-4 py-3">Alokasi GPU</th>
                <th className="px-4 py-3 text-right">VRAM Terpakai</th>
                <th className="px-4 py-3 text-right">Host RAM</th>
                <th className="px-4 py-3">Durasi</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredProcesses.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-text-muted text-xs font-mono">
                    Tidak ada proses komputasi aktif yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredProcesses.map((proc) => {
                  const isGpu0 = proc.gpu_index === 0 || proc.gpu_name?.includes('0');
                  const isProtected = proc.is_system || !proc.is_killable;
                  const initials = proc.username?.slice(0, 2).toUpperCase() || 'AI';

                  return (
                    <tr
                      key={proc.pid}
                      onClick={() => setInspectedProc(proc)}
                      className="group hover:bg-surface-3 transition-colors bg-surface-1 cursor-pointer"
                    >
                      {/* PID */}
                      <td className="px-4 py-3 font-mono text-xs text-neon-cyan font-bold">
                        {proc.pid}
                      </td>

                      {/* Pengguna / Akun */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-surface-container-high flex items-center justify-center font-mono text-[10px] text-primary-fixed font-bold border border-border-base shrink-0">
                            {initials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs text-text-primary font-medium truncate">
                              {proc.username}
                            </span>
                            <span className="font-mono text-[10px] text-text-muted">
                              {proc.username === 'labriset' ? 'Riset Dosen' : proc.username?.startsWith('m') ? 'SIMTIK Mhs' : 'System Service'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Nama Perintah / Skrip Model */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-text-primary bg-surface-2 px-2.5 py-1 rounded max-w-sm border border-border-subtle">
                          <span className="text-tertiary font-bold text-[10px]">py</span>
                          <span className="truncate">{proc.cmdline || proc.name}</span>
                        </div>
                      </td>

                      {/* Alokasi GPU */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[10px] font-semibold border ${
                          isGpu0
                            ? 'bg-primary-container/15 text-neon-cyan border-neon-cyan/20'
                            : 'bg-secondary-container/20 text-secondary-fixed border-secondary/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-md ${isGpu0 ? 'bg-neon-cyan' : 'bg-secondary-fixed'}`}></span>
                          {isGpu0 ? 'GPU 0 (Dedicated)' : 'GPU 1 (Shared)'}
                        </span>
                      </td>

                      {/* VRAM Terpakai */}
                      <td className="px-4 py-3 text-right font-mono text-xs text-text-primary font-bold">
                        {proc.vram_mb?.toLocaleString() || 0} MB
                      </td>

                      {/* Host RAM */}
                      <td className="px-4 py-3 text-right font-mono text-xs text-text-muted">
                        {proc.ram_mb ? `${(proc.ram_mb / 1024).toFixed(1)} GB` : '—'}
                      </td>

                      {/* Durasi */}
                      <td className="px-4 py-3 font-mono text-xs text-text-muted">
                        {proc.uptime || '—'}
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && !isProtected ? (
                          <button
                            onClick={() => onOpenKillModal({
                              pid: proc.pid,
                              username: proc.username,
                              procName: proc.name,
                              cmdline: proc.cmdline,
                              vramMb: proc.vram_mb,
                              is_system: proc.is_system
                            })}
                            className="p-1 rounded-lg text-neon-rose bg-surface-3 hover:bg-neon-rose hover:text-surface-dim transition-colors border border-border-base"
                            title={`Kill PID ${proc.pid}`}
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">stop</span>
                          </button>
                        ) : (
                          <span className="text-text-muted text-[10px] font-mono">
                            {isProtected ? 'Sys' : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
    </div>
  );
}
