import React, { useState, useMemo, memo } from 'react';
import {
  Zap,
  XCircle,
  Key,
  Cpu,
  ShieldAlert,
  Search,
  Clock,
  Activity,
  StopCircle,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Shield,
  MemoryStick as Memory,
  LayoutGrid,
  List
} from 'lucide-react';

/* ─── Status badge helper ─── */
function getStatusBadge(user) {
  if (user.status_color === 'red') {
    return (
      <span className="badge badge-rose" style={{ fontSize: '0.5625rem', gap: 3 }}>
        <AlertTriangle className="w-2.5 h-2.5" />
        Over Quota
      </span>
    );
  }
  if (user.is_online && (user.processes?.length > 0 || user.cpu_percent > 5)) {
    return (
      <span className="badge badge-emerald" style={{ fontSize: '0.5625rem', gap: 3 }}>
        <Activity className="w-2.5 h-2.5" />
        Aktif
      </span>
    );
  }
  if (user.is_online) {
    return (
      <span className="badge badge-indigo" style={{ fontSize: '0.5625rem', gap: 3 }}>
        <CheckCircle2 className="w-2.5 h-2.5" />
        Online
      </span>
    );
  }
  return (
    <span className="badge badge-neutral" style={{ fontSize: '0.5625rem', gap: 3 }}>
      <Clock className="w-2.5 h-2.5" />
      Offline
    </span>
  );
}

/* ─── User Card (Grid mode) ─── */
function UserCard({ user, isAdmin, onOpenKillModal, onKillAllUser, onOpenReset }) {
  const isRiset     = user.tier === 'Riset';
  const vramPct     = user.vram_percent_of_quota || 0;
  const cpuPct      = user.cpu_quota_percent || 0;
  const ramPct      = user.ram_percent || 0;
  const isOverQuota = user.status_color === 'red';
  const isIdleVram  = user.vram_used_mb > 500 && (user.cpu_percent === 0 || user.cpu_percent < 1) && user.processes?.length > 0;

  const accentColor = isOverQuota
    ? 'var(--accent-rose)'
    : isRiset
    ? 'var(--accent-indigo)'
    : 'var(--text-secondary)';

  return (
    <div
      className="panel-raised flex flex-col gap-0 overflow-hidden"
      style={{
        borderColor: isOverQuota
          ? 'rgba(244, 63, 94, 0.3)'
          : isRiset
          ? 'rgba(99, 102, 241, 0.2)'
          : 'var(--border-emph)',
      }}
    >
      {/* Card header */}
      <div
        className="flex items-start justify-between gap-2 p-4 pb-3"
        style={{ borderBottom: '1px solid var(--border-sub)' }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="metric-value font-bold"
              style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}
            >
              {user.username}
            </span>
            {isRiset && (
              <span className="badge badge-indigo" style={{ fontSize: '0.5rem' }}>Riset Dosen</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span
              className="badge badge-neutral"
              style={{ fontSize: '0.5rem' }}
            >
              {user.gpu_assigned}
            </span>
            <span
              className="badge badge-neutral"
              style={{ fontSize: '0.5rem', color: 'var(--accent-violet)' }}
            >
              Maks {user.cpu_cores_limit || (isRiset ? 20 : 2)} Core
            </span>
            <span
              className="badge badge-neutral"
              style={{ fontSize: '0.5rem', color: 'var(--accent-blue)' }}
            >
              Limit {isRiset ? '70 GB' : '4 GB'} RAM
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {getStatusBadge(user)}
          {isIdleVram && (
            <span className="badge badge-amber" style={{ fontSize: '0.4375rem', gap: 2 }}>
              <ShieldAlert className="w-2 h-2" />
              Idle VRAM
            </span>
          )}
        </div>
      </div>

      {/* Resource bars */}
      <div className="p-4 flex flex-col gap-3" style={{ borderBottom: '1px solid var(--border-sub)' }}>
        {[
          {
            label: 'CPU',
            value: `${user.cpu_percent || 0}% · ${user.cpu_cores_used || 0}/${user.cpu_cores_limit || (isRiset ? 20 : 2)} Core`,
            percent: cpuPct,
            barColor: cpuPct > 85 ? 'var(--accent-rose)' : cpuPct > 60 ? 'var(--accent-amber)' : 'var(--accent-violet)',
          },
          {
            label: 'RAM',
            value: `${user.ram_used_mb || 0} MB / ${user.ram_max_mb || (isRiset ? 71680 : 4096)} MB (${ramPct}%)`,
            percent: ramPct,
            barColor: ramPct > 85 ? 'var(--accent-rose)' : ramPct > 65 ? 'var(--accent-amber)' : 'var(--accent-blue)',
          },
          {
            label: 'VRAM',
            value: `${user.vram_used_mb} MB / ${user.vram_limit_mb} MB (${vramPct}%)`,
            percent: vramPct,
            barColor: isOverQuota ? 'var(--accent-rose)' : vramPct > 70 ? 'var(--accent-amber)' : accentColor,
          },
        ].map(({ label, value, percent, barColor }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1">
              <span
                className="section-label"
                style={{ fontSize: '0.5625rem', letterSpacing: '0.05em' }}
              >
                {label}
              </span>
              <span
                className="metric-value"
                style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}
              >
                {value}
              </span>
            </div>
            <div className="progress-track" style={{ height: 4 }}>
              <div
                className="progress-fill"
                style={{ width: `${Math.min(percent, 100)}%`, height: 4, background: barColor }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Active processes (compact) */}
      {user.processes && user.processes.length > 0 ? (
        <div className="p-4 pb-3" style={{ borderBottom: '1px solid var(--border-sub)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="section-label" style={{ fontSize: '0.5625rem' }}>
              Job Berjalan ({user.processes.length})
            </span>
            {isAdmin && onKillAllUser && (
              <button
                onClick={() => onKillAllUser(user.username)}
                className="flex items-center gap-1 cursor-pointer"
                style={{ fontSize: '0.5625rem', color: 'var(--accent-rose)', fontWeight: 600, background: 'none', border: 'none' }}
              >
                <StopCircle className="w-3 h-3" />
                Stop Semua
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {user.processes.slice(0, 3).map((p) => (
              <div
                key={p.pid}
                className="flex items-center justify-between gap-2"
                style={{
                  padding: '5px 8px',
                  background: 'var(--surface-2)',
                  borderRadius: 6,
                  border: '1px solid var(--border-sub)',
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="metric-value font-semibold truncate"
                    style={{ fontSize: '0.6875rem', color: 'var(--text-primary)', maxWidth: 100 }}
                    title={p.name}
                  >
                    {p.name}
                  </span>
                  <span
                    className="metric-value shrink-0"
                    style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}
                  >
                    PID {p.pid}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="metric-value" style={{ fontSize: '0.5625rem', color: 'var(--accent-amber)' }}>
                    {p.vram_mb}MB
                  </span>
                  {p.is_system || !p.is_killable ? (
                    <Shield className="w-2.5 h-2.5" style={{ color: 'var(--accent-emerald)' }} />
                  ) : isAdmin ? (
                    <button
                      onClick={() => onOpenKillModal({ pid: p.pid, username: user.username, procName: p.name, cmdline: p.cmdline, vramMb: p.vram_mb, is_system: p.is_system })}
                      className="btn-kill"
                      style={{ padding: '2px 5px', fontSize: '0.5625rem' }}
                    >
                      <XCircle className="w-2.5 h-2.5" />
                      Kill
                    </button>
                  ) : (
                    <Lock className="w-2.5 h-2.5" style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
              </div>
            ))}
            {user.processes.length > 3 && (
              <span
                className="metric-value"
                style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', textAlign: 'center' }}
              >
                +{user.processes.length - 3} proses lagi
              </span>
            )}
          </div>
        </div>
      ) : (
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border-sub)' }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-md"
              style={{ background: user.is_online ? 'var(--accent-emerald)' : 'var(--text-muted)' }}
            />
            <p
              className="metric-value"
              style={{
                fontSize: '0.5625rem',
                color: user.is_online ? 'var(--accent-emerald)' : 'var(--text-muted)',
                fontWeight: user.is_online ? 600 : 400
              }}
            >
              {user.is_online ? 'User Online (Sesi Aktif)' : 'Tidak ada proses berjalan'}
            </p>
          </div>
          {isAdmin && user.is_online && onKillAllUser && (
            <button
              onClick={() => onKillAllUser(user.username)}
              className="flex items-center gap-1 cursor-pointer transition hover:opacity-80"
              style={{
                fontSize: '0.5625rem',
                color: 'var(--accent-rose)',
                fontWeight: 600,
                background: 'rgba(244,63,94,0.1)',
                border: '1px solid rgba(244,63,94,0.25)',
                padding: '3px 8px',
                borderRadius: 5,
              }}
              title="Hentikan sesi online user ini"
            >
              <StopCircle className="w-3 h-3" />
              Kill Sesi User
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div
          className="metric-value flex items-center gap-3"
          style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}
        >
          <span style={{ color: 'var(--accent-violet)' }}>{user.cpu_cores_used || 0} Core</span>
          <span style={{ color: 'var(--accent-blue)' }}>{user.ram_used_mb || 0} MB RAM</span>
          <span style={{ color: 'var(--accent-amber)' }}>{user.vram_used_mb || 0} MB VRAM</span>
        </div>
        {isAdmin ? (
          <button
            onClick={() => onOpenReset(user.username)}
            className="flex items-center gap-1 cursor-pointer transition"
            style={{
              fontSize: '0.5625rem',
              fontWeight: 600,
              color: 'var(--accent-indigo)',
              background: 'none',
              border: 'none',
              padding: '3px 6px',
              borderRadius: 5,
            }}
          >
            <Key className="w-3 h-3" />
            Ganti Password
          </button>
        ) : (
          <span className="metric-value" style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
            <Clock className="w-3 h-3 inline mr-1" />
            {user.uptime || 'Siap digunakan'}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Main UserGpuMonitor ─── */
function UserGpuMonitor({ users = [], isAdmin = false, onOpenKillModal, onResetPassword, onKillAllUser }) {
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'dense'
  const [resetModal, setResetModal] = useState({
    isOpen: false,
    username: '',
    newPassword: '',
    confirmPassword: '',
    error: '',
    isSubmitting: false
  });

  const handleOpenReset  = (u) => setResetModal({ isOpen: true, username: u, newPassword: '', confirmPassword: '', error: '', isSubmitting: false });
  const handleCloseReset = () => setResetModal({ isOpen: false, username: '', newPassword: '', confirmPassword: '', error: '', isSubmitting: false });

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    if (!resetModal.newPassword) return setResetModal(p => ({ ...p, error: 'Password tidak boleh kosong.' }));
    if (resetModal.newPassword !== resetModal.confirmPassword)
      return setResetModal(p => ({ ...p, error: 'Konfirmasi password tidak cocok.' }));
    setResetModal(p => ({ ...p, isSubmitting: true, error: '' }));
    try {
      const res = await onResetPassword(resetModal.username, resetModal.newPassword);
      if (res.success) handleCloseReset();
      else setResetModal(p => ({ ...p, error: res.message, isSubmitting: false }));
    } catch (err) {
      setResetModal(p => ({ ...p, error: err.message, isSubmitting: false }));
    }
  };

  const aggregated = useMemo(() => {
    let totalCpuCores = 0, totalRamMb = 0, totalVramMb = 0, activeCount = 0;
    users.forEach(u => {
      totalCpuCores += u.cpu_cores_used || 0;
      totalRamMb    += u.ram_used_mb || 0;
      totalVramMb   += u.vram_used_mb || 0;
      if (u.is_online || (u.processes?.length > 0) || (u.cpu_percent > 5)) activeCount++;
    });
    return {
      totalCpuCores: totalCpuCores.toFixed(1),
      totalRamGb: (totalRamMb / 1024).toFixed(2),
      totalVramGb: (totalVramMb / 1024).toFixed(2),
      activeCount
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (filter === 'active'    && u.status_color !== 'green' && u.status_color !== 'indigo') return false;
      if (filter === 'overquota' && u.status_color !== 'red') return false;
      if (filter === 'online'    && !u.is_online) return false;
      if (filter === 'offline'   && u.is_online)  return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          u.username.toLowerCase().includes(q) ||
          u.processes?.some(p => p.name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [users, filter, search]);

  const filterChips = [
    { id: 'all',       label: `Semua (${users.length})` },
    { id: 'active',    label: '⚡ Aktif' },
    { id: 'overquota', label: '⚠️ Over Quota' },
    { id: 'online',    label: '🟢 Online' },
    { id: 'offline',   label: '⚪ Offline' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Aggregate stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'User Aktif',     value: `${aggregated.activeCount}`,      sub: `dari ${users.length} total`,      color: 'var(--accent-emerald)' },
          { label: 'CPU Terpakai',   value: `${aggregated.totalCpuCores}`,    sub: 'Core aktif',                      color: 'var(--accent-violet)' },
          { label: 'RAM Cgroup',     value: `${aggregated.totalRamGb} GB`,    sub: 'dari 100 GB limit',               color: 'var(--accent-blue)' },
          { label: 'VRAM GPU',       value: `${aggregated.totalVramGb} GB`,   sub: 'dari 32 GB total',                color: 'var(--accent-amber)' },
        ].map(({ label, value, sub, color }) => (
          <div
            key={label}
            className="panel-raised"
            style={{ padding: '12px 16px' }}
          >
            <p className="section-label mb-1" style={{ fontSize: '0.5625rem' }}>{label}</p>
            <p
              className="metric-value font-bold"
              style={{ fontSize: '1rem', color, letterSpacing: '-0.02em' }}
            >
              {value}
            </p>
            <p className="metric-value" style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {sub}
            </p>
          </div>
        ))}
      </div>

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto flex-wrap">
          {filterChips.map(chip => (
            <button
              key={chip.id}
              onClick={() => setFilter(chip.id)}
              className="cursor-pointer transition rounded-md"
              style={{
                padding: '4px 10px',
                fontSize: '0.6875rem',
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                background: filter === chip.id ? 'var(--accent-indigo)' : 'var(--surface-2)',
                color: filter === chip.id ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${filter === chip.id ? 'transparent' : 'var(--border-base)'}`,
                whiteSpace: 'nowrap',
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari user atau skrip…"
              className="field-input"
              style={{ paddingLeft: 30, paddingTop: 5, paddingBottom: 5, fontSize: '0.6875rem', width: 180 }}
            />
          </div>

          {/* View toggle */}
          <div
            className="flex rounded-lg overflow-hidden shrink-0"
            style={{ border: '1px solid var(--border-base)' }}
          >
            {[{ m: 'card', icon: LayoutGrid }, { m: 'dense', icon: List }].map(({ m, icon: Icon }) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className="flex items-center justify-center cursor-pointer transition"
                style={{
                  width: 32, height: 32,
                  background: viewMode === m ? 'var(--accent-indigo)' : 'var(--surface-2)',
                  color: viewMode === m ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users list */}
      {filteredUsers.length === 0 ? (
        <div
          className="text-center py-12 panel-raised metric-value"
          style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}
        >
          Tidak ada data user yang sesuai kriteria.
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredUsers.map(user => (
            <UserCard
              key={user.username}
              user={user}
              isAdmin={isAdmin}
              onOpenKillModal={onOpenKillModal}
              onKillAllUser={onKillAllUser}
              onOpenReset={handleOpenReset}
            />
          ))}
        </div>
      ) : (
        /* Dense Table View */
        <div className="panel-raised overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Tier / GPU</th>
                  <th>Status</th>
                  <th style={{ color: 'var(--accent-violet)' }}>CPU%</th>
                  <th style={{ color: 'var(--accent-blue)' }}>RAM</th>
                  <th style={{ color: 'var(--accent-amber)' }}>VRAM</th>
                  <th>Job</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const isRiset     = user.tier === 'Riset';
                  const isOverQuota = user.status_color === 'red';
                  return (
                    <tr key={user.username}>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{user.username}</span>
                          {isRiset && <span className="badge badge-indigo" style={{ fontSize: '0.4375rem' }}>Riset</span>}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.4375rem' }}>{user.gpu_assigned}</span>
                      </td>
                      <td>{getStatusBadge(user)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-track" style={{ width: 40, height: 3 }}>
                            <div className="progress-fill" style={{ width: `${Math.min(user.cpu_quota_percent || 0, 100)}%`, height: 3, background: 'var(--accent-violet)' }} />
                          </div>
                          <span className="metric-value" style={{ color: 'var(--accent-violet)', fontWeight: 600 }}>{user.cpu_percent || 0}%</span>
                        </div>
                      </td>
                      <td>
                        <span className="metric-value" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{user.ram_used_mb || 0} MB</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-track" style={{ width: 40, height: 3 }}>
                            <div className="progress-fill" style={{ width: `${Math.min(user.vram_percent_of_quota || 0, 100)}%`, height: 3, background: isOverQuota ? 'var(--accent-rose)' : 'var(--accent-amber)' }} />
                          </div>
                          <span className="metric-value" style={{ color: isOverQuota ? 'var(--accent-rose)' : 'var(--accent-amber)', fontWeight: 600 }}>{user.vram_used_mb} MB</span>
                        </div>
                      </td>
                      <td className="metric-value" style={{ color: 'var(--text-muted)' }}>
                        {user.processes?.length || 0} job
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex items-center gap-1.5 justify-end">
                          {isAdmin && user.is_online && onKillAllUser && (
                            <button
                              onClick={() => onKillAllUser(user.username)}
                              className="flex items-center gap-1 cursor-pointer transition hover:opacity-80"
                              style={{
                                fontSize: '0.5625rem',
                                fontWeight: 600,
                                color: 'var(--accent-rose)',
                                background: 'rgba(244,63,94,0.1)',
                                border: '1px solid rgba(244,63,94,0.25)',
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                              title="Hentikan sesi online user ini"
                            >
                              <StopCircle className="w-2.5 h-2.5" />
                              Kill Sesi
                            </button>
                          )}
                          {isAdmin ? (
                            <button
                              onClick={() => handleOpenReset(user.username)}
                              className="flex items-center gap-1 cursor-pointer"
                              style={{
                                fontSize: '0.5625rem',
                                fontWeight: 600,
                                color: 'var(--accent-indigo)',
                                background: 'none',
                                border: 'none',
                              }}
                            >
                              <Key className="w-3 h-3" />
                              Reset PW
                            </button>
                          ) : (
                            <Lock className="w-3 h-3 ml-auto" style={{ color: 'var(--text-muted)' }} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="palette-enter w-full max-w-sm"
            style={{
              background: 'var(--surface-0)',
              border: '1px solid var(--border-emph)',
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}
          >
            <div
              className="flex items-center gap-2 p-5"
              style={{ borderBottom: '1px solid var(--border-base)' }}
            >
              <Key className="w-4 h-4" style={{ color: 'var(--accent-indigo)' }} />
              <h3 className="font-bold" style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                Ganti Password User
              </h3>
            </div>
            <div className="p-5">
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                Perbarui password SSH/Jupyter untuk{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{resetModal.username}</strong>.
              </p>
              <form onSubmit={handleConfirmReset} className="flex flex-col gap-3">
                {resetModal.error && (
                  <div
                    className="p-2.5 rounded-lg"
                    style={{
                      background: 'rgba(244,63,94,0.08)',
                      border: '1px solid rgba(244,63,94,0.2)',
                      fontSize: '0.6875rem',
                      color: 'var(--accent-rose)',
                    }}
                  >
                    {resetModal.error}
                  </div>
                )}
                <div>
                  <label className="section-label mb-1.5 block" style={{ letterSpacing: '0.04em' }}>Password Baru</label>
                  <input
                    type="password"
                    value={resetModal.newPassword}
                    onChange={e => setResetModal(p => ({ ...p, newPassword: e.target.value }))}
                    className="field-input"
                    placeholder="Masukkan password baru…"
                    required
                  />
                </div>
                <div>
                  <label className="section-label mb-1.5 block" style={{ letterSpacing: '0.04em' }}>Konfirmasi Password</label>
                  <input
                    type="password"
                    value={resetModal.confirmPassword}
                    onChange={e => setResetModal(p => ({ ...p, confirmPassword: e.target.value }))}
                    className="field-input"
                    placeholder="Ulangi password baru…"
                    required
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCloseReset}
                    className="cursor-pointer rounded-lg transition"
                    style={{
                      padding: '7px 14px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-base)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={resetModal.isSubmitting}
                    className="cursor-pointer rounded-lg transition disabled:opacity-50"
                    style={{
                      padding: '7px 16px',
                      background: 'var(--accent-indigo)',
                      border: 'none',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                    }}
                  >
                    {resetModal.isSubmitting ? 'Menyimpan…' : 'Simpan Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(UserGpuMonitor);
