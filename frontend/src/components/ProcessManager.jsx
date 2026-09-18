import React, { useState, useMemo, memo, useRef } from 'react';
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
  ChevronRight
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
      <div
        className="flex-1"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
      />
      {/* Drawer panel */}
      <div
        className="drawer-enter flex flex-col"
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--surface-0)',
          borderLeft: '1px solid var(--border-emph)',
          height: '100dvh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid var(--border-base)' }}
        >
          <div>
            <h3
              className="font-bold"
              style={{ fontSize: '0.875rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
            >
              Process Inspector
            </h3>
            <p
              className="metric-value"
              style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: 2 }}
            >
              PID {proc.pid} · {proc.gpu_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg cursor-pointer transition"
            style={{
              width: 32, height: 32,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-base)',
              color: 'var(--text-secondary)',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 p-5">
          {/* Status chip */}
          <div className="flex items-center gap-2">
            {isProtected ? (
              <span className="badge badge-neutral">
                <Shield className="w-3 h-3" style={{ color: 'var(--accent-emerald)' }} />
                Proses Sistem (Terproteksi)
              </span>
            ) : (
              <span className="badge badge-indigo">
                <Zap className="w-3 h-3" />
                Job Praktikan
              </span>
            )}
            {proc.username === 'labriset' && (
              <span className="badge badge-indigo">Riset Dosen</span>
            )}
          </div>

          {/* Metadata table */}
          <div
            className="panel-inset"
            style={{ padding: 0, overflow: 'hidden' }}
          >
            {[
              { label: 'Pemilik',   value: proc.username,         mono: true },
              { label: 'PID',       value: proc.pid,               mono: true },
              { label: 'Nama Proses', value: proc.name,            mono: true },
              { label: 'GPU',       value: proc.gpu_name,          mono: true },
              { label: 'CPU%',      value: `${proc.cpu_percent}%`, mono: true, color: 'var(--accent-violet)' },
              { label: 'RAM Host',  value: `${proc.ram_mb || 0} MB`, mono: true, color: 'var(--accent-blue)' },
              { label: 'VRAM',      value: `${proc.vram_mb} MB`,  mono: true, color: 'var(--accent-amber)' },
              { label: 'Uptime',    value: proc.uptime || '—',     mono: true },
            ].map(({ label, value, mono, color }) => (
              <div
                key={label}
                className="flex justify-between items-center"
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--border-sub)',
                }}
              >
                <span
                  style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', flex: 1 }}
                >
                  {label}
                </span>
                <span
                  className={mono ? 'metric-value' : ''}
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: color || 'var(--text-primary)',
                    flex: 1,
                    textAlign: 'right',
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Cmdline */}
          {proc.cmdline && (
            <div>
              <p
                className="section-label mb-1.5"
              >
                Command Line
              </p>
              <div
                className="panel-inset relative group"
                style={{ padding: '10px 12px' }}
              >
                <code
                  className="metric-value"
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--text-secondary)',
                    wordBreak: 'break-all',
                    display: 'block',
                    paddingRight: 28,
                  }}
                >
                  {proc.cmdline}
                </code>
                <button
                  onClick={() => copy(proc.cmdline)}
                  className="absolute top-2 right-2 cursor-pointer rounded"
                  style={{
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border-base)',
                    padding: '2px 4px',
                    color: 'var(--text-muted)',
                  }}
                  title="Copy command"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Idle VRAM warning */}
          {(proc.vram_mb > 500 && (proc.cpu_percent === 0 || proc.cpu_percent < 1)) && (
            <div
              className="flex items-start gap-2 p-3 rounded-lg"
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
              }}
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent-amber)' }} />
              <div>
                <p
                  className="font-semibold"
                  style={{ fontSize: '0.6875rem', color: 'var(--accent-amber)' }}
                >
                  Idle VRAM Detected
                </p>
                <p
                  style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: 2 }}
                >
                  Proses mengalokasikan {proc.vram_mb} MB VRAM namun CPU idle. Kemungkinan zombie process atau training selesai namun memory belum dibebaskan.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          className="mt-auto p-5"
          style={{ borderTop: '1px solid var(--border-base)' }}
        >
          {!isProtected && isAdmin ? (
            <button
              onClick={() => { onKill(proc); onClose(); }}
              className="btn-kill w-full justify-center py-2.5"
              style={{ fontSize: '0.75rem', padding: '10px' }}
            >
              <XCircle className="w-4 h-4" />
              Hentikan Proses (SIGTERM / SIGKILL)
            </button>
          ) : (
            <div
              className="text-center metric-value"
              style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}
            >
              {isProtected
                ? 'Proses terproteksi tidak dapat dihentikan'
                : 'Login sebagai Admin untuk mengontrol proses ini'
              }
            </div>
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
    { id: 'user',   label: `Praktikan (${stats.userJobs})` },
    { id: 'system', label: `Sistem (${stats.sysJobs})` },
  ];

  return (
    <>
      <div className="panel-raised fade-in-up" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 pb-4"
          style={{ borderBottom: '1px solid var(--border-base)' }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-4 h-4" style={{ color: 'var(--accent-indigo)' }} />
              <h2
                className="font-bold"
                style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
              >
                Manajemen Job & Proses Komputasi
              </h2>
              <span
                className="metric-value badge badge-neutral"
                style={{ fontSize: '0.5625rem' }}
              >
                {processes.length} Job
              </span>
              {stats.idleVram > 0 && (
                <span
                  className="badge badge-amber"
                  style={{ fontSize: '0.5625rem', gap: 3 }}
                >
                  <ShieldAlert className="w-2.5 h-2.5" />
                  {stats.idleVram} Idle VRAM
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              Monitor utilisasi CPU, RAM, dan VRAM. Proses sistem dilindungi dari penghentian.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {isAdmin ? (
              <>
                <button
                  onClick={onRunSimulation}
                  disabled={isSimulating}
                  className="flex items-center gap-1.5 rounded-lg cursor-pointer disabled:opacity-50 transition"
                  style={{
                    padding: '7px 14px',
                    background: 'var(--accent-indigo)',
                    color: '#fff',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                  }}
                >
                  <Play className="w-3.5 h-3.5" style={{ fill: 'currentColor' }} />
                  Uji Beban (11 User)
                </button>
                <button
                  onClick={onStopSimulation}
                  className="flex items-center gap-1.5 rounded-lg cursor-pointer transition"
                  style={{
                    padding: '7px 12px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-base)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                  }}
                >
                  <Square className="w-3.5 h-3.5" />
                  Stop Semua
                </button>
              </>
            ) : (
              <button
                onClick={onOpenPinModal}
                className="flex items-center gap-1.5 rounded-lg cursor-pointer transition"
                style={{
                  padding: '7px 12px',
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  color: 'var(--accent-amber)',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                }}
              >
                <Lock className="w-3.5 h-3.5" />
                Buka Admin untuk Kill
              </button>
            )}
          </div>
        </div>

        {/* Filter + Search */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3"
          style={{ borderBottom: '1px solid var(--border-sub)' }}
        >
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {filterChips.map(chip => (
              <button
                key={chip.id}
                onClick={() => setFilterType(chip.id)}
                className="cursor-pointer transition rounded-md"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  background: filterType === chip.id ? 'var(--accent-indigo)' : 'var(--surface-2)',
                  color: filterType === chip.id ? '#fff' : 'var(--text-muted)',
                  border: `1px solid ${filterType === chip.id ? 'transparent' : 'var(--border-base)'}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-52">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari PID / User / Skrip…"
              className="field-input"
              style={{ paddingLeft: 32, paddingTop: 6, paddingBottom: 6, fontSize: '0.75rem' }}
            />
          </div>
        </div>

        {/* Table */}
        {filteredProcesses.length === 0 ? (
          <div
            className="text-center py-12 flex flex-col items-center gap-3"
            style={{ borderTop: '1px solid var(--border-sub)' }}
          >
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ width: 48, height: 48, background: 'var(--surface-2)', border: '1px solid var(--border-base)' }}
            >
              <Activity className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <p
                className="font-semibold"
                style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}
              >
                Belum ada proses aktif
              </p>
              <p
                style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 4 }}
              >
                Job praktikan akan muncul di sini ketika skrip Python/PyTorch berjalan.
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={onRunSimulation}
                className="flex items-center gap-2 rounded-lg cursor-pointer transition"
                style={{
                  padding: '8px 16px',
                  background: 'var(--accent-indigo)',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                }}
              >
                <Play className="w-3.5 h-3.5" style={{ fill: 'currentColor' }} />
                Jalankan Uji Beban Sekarang
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>PID</th>
                  <th>GPU</th>
                  <th>Task / Skrip</th>
                  <th>Tipe</th>
                  <th style={{ color: 'var(--accent-violet)' }}>CPU%</th>
                  <th style={{ color: 'var(--accent-blue)' }}>RAM</th>
                  <th style={{ color: 'var(--accent-amber)' }}>VRAM</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcesses.map((proc) => {
                  const isRiset     = proc.username === 'labriset';
                  const isProtected = proc.is_system || !proc.is_killable;
                  const isIdleVram  = !isProtected && proc.vram_mb > 500 && (proc.cpu_percent === 0 || proc.cpu_percent < 1);

                  return (
                    <tr
                      key={proc.pid}
                      onClick={() => setInspectedProc(proc)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold" style={{ color: 'var(--text-primary)', fontSize: '0.75rem' }}>
                            {proc.username}
                          </span>
                          {isRiset && (
                            <span className="badge badge-indigo" style={{ fontSize: '0.5rem' }}>Riset</span>
                          )}
                        </div>
                      </td>
                      <td className="metric-value" style={{ color: 'var(--text-muted)' }}>{proc.pid}</td>
                      <td>
                        <span
                          className="badge badge-neutral"
                          style={{ fontSize: '0.5rem' }}
                        >
                          {proc.gpu_name}
                        </span>
                      </td>
                      <td>
                        <div className="max-w-[160px]">
                          <div
                            className="truncate font-semibold"
                            title={proc.cmdline || proc.name}
                            style={{ fontSize: '0.6875rem', color: 'var(--text-primary)' }}
                          >
                            {proc.name}
                          </div>
                          {proc.cmdline && (
                            <div
                              className="truncate metric-value"
                              title={proc.cmdline}
                              style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: 1 }}
                            >
                              {proc.cmdline}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {isProtected ? (
                          <span className="badge badge-neutral" style={{ fontSize: '0.5rem' }}>
                            <ShieldCheck className="w-2.5 h-2.5" style={{ color: 'var(--accent-emerald)' }} />
                            Sistem
                          </span>
                        ) : (
                          <span className="badge badge-indigo" style={{ fontSize: '0.5rem' }}>
                            <Zap className="w-2.5 h-2.5" />
                            Praktikan
                          </span>
                        )}
                      </td>
                      <td className="metric-value font-bold" style={{ color: 'var(--accent-violet)' }}>
                        {proc.cpu_percent}%
                      </td>
                      <td className="metric-value" style={{ color: 'var(--accent-blue)' }}>
                        {proc.ram_mb || 0}MB
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="metric-value font-bold" style={{ color: isIdleVram ? 'var(--accent-amber)' : 'var(--accent-amber)' }}>
                            {proc.vram_mb}MB
                          </span>
                          {isIdleVram && (
                            <span
                              className="badge badge-amber"
                              style={{ fontSize: '0.4375rem', padding: '1px 4px', gap: 2 }}
                              title="VRAM dialokasikan namun proses idle"
                            >
                              <ShieldAlert className="w-2 h-2" />
                              Idle
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        {isProtected ? (
                          <span className="badge badge-neutral" style={{ fontSize: '0.5rem', cursor: 'not-allowed' }}>
                            <Shield className="w-2.5 h-2.5" style={{ color: 'var(--accent-emerald)' }} />
                            Terlindungi
                          </span>
                        ) : isAdmin ? (
                          <button
                            onClick={() =>
                              onOpenKillModal({
                                pid: proc.pid,
                                username: proc.username,
                                procName: proc.name,
                                cmdline: proc.cmdline,
                                vramMb: proc.vram_mb,
                                is_system: proc.is_system
                              })
                            }
                            className="btn-kill"
                          >
                            <XCircle className="w-3 h-3" />
                            Kill
                          </button>
                        ) : (
                          <span
                            className="metric-value flex items-center gap-1 justify-end"
                            style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}
                          >
                            <Lock className="w-3 h-3" />
                            R/O
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

        {/* Row count */}
        {filteredProcesses.length > 0 && (
          <div
            className="px-5 py-2.5 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border-sub)' }}
          >
            <span className="metric-value" style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
              Klik baris untuk membuka Process Inspector
            </span>
            <span className="metric-value" style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
              {filteredProcesses.length} dari {processes.length} proses ditampilkan
            </span>
          </div>
        )}
      </div>

      {/* Process Inspector Drawer */}
      {inspectedProc && (
        <ProcessDrawer
          proc={inspectedProc}
          onClose={() => setInspectedProc(null)}
          onKill={(p) => onOpenKillModal({
            pid: p.pid,
            username: p.username,
            procName: p.name,
            cmdline: p.cmdline,
            vramMb: p.vram_mb,
            is_system: p.is_system
          })}
          isAdmin={isAdmin}
        />
      )}
    </>
  );
}

export default memo(ProcessManager);
