import React, { useState, memo } from 'react';
import {
  Zap,
  Flame,
  Activity,
  AlertTriangle,
  Key,
  XCircle,
  Shield,
  Check,
  AlertCircle,
  Search,
  Copy,
  Eye,
  EyeOff,
  Dices,
  Lock,
  StopCircle
} from 'lucide-react';

function UserGpuMonitor({
  users = [],
  isAdmin = false,
  onOpenKillModal,
  onResetPassword,
  onKillAllUser
}) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const handleOpenReset = (uname) => {
    setSelectedUser(uname);
    setNewPassword('');
    setShowPassword(false);
    setCopySuccess(false);
    setStatusMsg(null);
  };

  const handleCloseReset = () => {
    setSelectedUser(null);
    setNewPassword('');
    setShowPassword(false);
    setCopySuccess(false);
    setStatusMsg(null);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Umpo!';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setShowPassword(true);
    setStatusMsg({ type: 'info', text: 'Password acak terbuat. Silakan salin & simpan.' });
  };

  const copyToClipboard = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      setStatusMsg({ type: 'error', text: 'Password minimal 4 karakter' });
      return;
    }
    setIsSubmitting(true);
    const res = await onResetPassword(selectedUser, newPassword);
    setIsSubmitting(false);
    if (res.success) {
      setStatusMsg({ type: 'success', text: res.message });
      setTimeout(() => {
        handleCloseReset();
      }, 1500);
    } else {
      setStatusMsg({ type: 'error', text: res.message || 'Gagal mereset password' });
    }
  };

  const filteredUsers = users.filter((u) => {
    if (filter === 'training' && u.status !== 'Training Active') return false;
    if (filter === 'overquota' && u.status_color !== 'red') return false;
    if (filter === 'online' && !u.is_online) return false;
    if (filter === 'offline' && u.is_online) return false;

    if (search) {
      const q = search.toLowerCase();
      const matchUname = u.username.toLowerCase().includes(q);
      const matchProc = u.processes?.some((p) => p.name.toLowerCase().includes(q) || (p.cmdline && p.cmdline.toLowerCase().includes(q)));
      return matchUname || matchProc;
    }
    return true;
  });

  const getStatusBadge = (user) => {
    if (user.status_color === 'red') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Over Quota (&gt;30%)</span>
        </span>
      );
    }
    if (user.status === 'Training Active') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <Flame className="w-3.5 h-3.5 text-emerald-400" />
          <span>Training Active</span>
        </span>
      );
    }
    if (user.is_online) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span>SSH Idle</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
        <span className="w-2 h-2 rounded-full bg-slate-500" />
        <span>Offline</span>
      </span>
    );
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Monitoring Kuota & Performa Per-User Praktikan
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Transparansi konsumsi VRAM mahasiswa (GPU 1 Pool) & Kuota Riset labriset (GPU 0 Dedicated).
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari praktikan / skrip..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
        {[
          { id: 'all', label: `Semua User (${users.length})` },
          { id: 'training', label: '🔥 Sedang Training' },
          { id: 'overquota', label: '⚠️ Over Quota' },
          { id: 'online', label: '🔵 Online (Idle)' },
          { id: 'offline', label: '⚪ Offline' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              filter === f.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
            Tidak ada data praktikan yang sesuai kriteria pencarian/filter.
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isRiset = user.tier === 'Riset';
            const vramPct = user.vram_percent_of_quota || 0;
            const isOverQuota = user.status_color === 'red';

            return (
              <div
                key={user.username}
                className={`p-4 rounded-xl bg-slate-950/70 border transition flex flex-col justify-between ${
                  isOverQuota
                    ? 'border-rose-500/50 bg-rose-950/10 shadow-lg shadow-rose-950/20'
                    : isRiset
                    ? 'border-indigo-500/40 bg-indigo-950/5'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-white">
                          {user.username}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isRiset
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {user.gpu_assigned}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isRiset ? 'Riset Dosen / TA' : 'Praktikan Mahasiswa'}
                      </p>
                    </div>
                    {getStatusBadge(user)}
                  </div>

                  {/* VRAM Quota Progress */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">VRAM Usage:</span>
                      <span className={isOverQuota ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                        {user.vram_used_mb} MB{' '}
                        <span className="text-slate-500">
                          / {user.vram_limit_mb} MB ({vramPct}%)
                        </span>
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverQuota
                            ? 'bg-rose-500'
                            : vramPct > 70
                            ? 'bg-amber-500'
                            : isRiset
                            ? 'bg-indigo-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(vramPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Active Processes list */}
                  {user.processes && user.processes.length > 0 ? (
                    <div className="space-y-2 pt-2 border-t border-slate-800/80 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Job Komputasi ({user.processes.length})
                        </span>
                        {isAdmin && onKillAllUser && (
                          <button
                            onClick={() => onKillAllUser(user.username)}
                            className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
                            title="Hentikan semua job user ini"
                          >
                            <StopCircle className="w-3 h-3" /> Stop Semua
                          </button>
                        )}
                      </div>

                      {user.processes.map((p) => (
                        <div
                          key={p.pid}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono"
                        >
                          <div className="truncate flex-1">
                            <span className="text-slate-200 font-bold block truncate">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              PID: {p.pid} • {p.vram_mb} MB VRAM
                            </span>
                          </div>
                          {isAdmin ? (
                            <button
                              onClick={() =>
                                onOpenKillModal({
                                  pid: p.pid,
                                  username: user.username,
                                  procName: p.name,
                                  cmdline: p.cmdline,
                                  vramMb: p.vram_mb
                                })
                              }
                              className="px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-sans text-[11px] font-bold shadow-md transition flex items-center gap-1 cursor-pointer"
                              title="Hentikan Proses (SIGKILL)"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Kill</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-sans flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" /> Terkunci
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-800/80 mb-3 text-[11px] text-slate-500 italic">
                      Tidak ada proses komputasi GPU berjalan.
                    </div>
                  )}
                </div>

                {/* Footer: RAM Cgroup & Reset Password */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-[11px]">
                  <div className="text-slate-400 font-mono">
                    RAM: <span className="text-slate-300 font-semibold">{user.ram_used_mb || 0} MB</span>
                  </div>

                  {isAdmin ? (
                    <button
                      onClick={() => handleOpenReset(user.username)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 transition cursor-pointer font-sans font-medium"
                    >
                      <Key className="w-3 h-3" />
                      <span>Ganti Password</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-sans flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-600" />
                      <span>Mode Read-Only</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Reset Password (Only Accessible to Admin) */}
      {isAdmin && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reset Password Akun</h3>
                  <p className="text-xs text-slate-400">
                    Praktikan: <span className="text-indigo-400 font-semibold">{selectedUser}</span>
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitPassword} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Password Baru
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Dices className="w-3 h-3" /> Buat Acak
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru..."
                    className="w-full pl-3 pr-16 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500 transition font-mono"
                    autoFocus
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    {newPassword && (
                      <button
                        type="button"
                        onClick={copyToClipboard}
                        className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                        title="Salin Password"
                      >
                        {copySuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                      title={showPassword ? 'Sembunyikan Password' : 'Tampilkan Password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {copySuccess && (
                  <p className="text-[10px] text-emerald-400 mt-1 font-sans">
                    ✓ Password berhasil disalin ke clipboard!
                  </p>
                )}
              </div>

              {statusMsg && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    statusMsg.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : statusMsg.type === 'info'
                      ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                  }`}
                >
                  {statusMsg.type === 'success' ? (
                    <Check className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseReset}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-50 shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(UserGpuMonitor);
