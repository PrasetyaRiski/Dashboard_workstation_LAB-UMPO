import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, Zap, RotateCcw, Shield, ShieldCheck, Search, CheckCircle2,
  AlertCircle, Clock, UserCheck, UserX, Sparkles, KeyRound, RefreshCw,
  Lock, LogOut, ChevronLeft, ChevronRight, Activity, Cpu, MoreVertical,
  Database, Server, Ban, AlertTriangle, Trash2, UserPlus
} from 'lucide-react';
import AuditLogView from './AuditLogView';

const LiveCountdown = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(expiresAt).getTime();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        let timeString = '';
        if (h > 0) timeString += `${h}h `;
        if (m > 0 || h > 0) timeString += `${m}m `;
        timeString += `${s}s`;
        setTimeLeft(timeString);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  return <span className="text-amber-400 font-semibold">{timeLeft || '...'}</span>;
};

export default function UnifiedUserManagement({
  isAdmin,
  students,
  systemUsers,
  onOpenKillModal,
  onResetPassword,
  onKillAllUser,
  fetchStudents,
  showToast
}) {
  const [filterType, setFilterType] = useState('All'); // 'All' | 'System' | 'Simtik'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [auditLogs, setAuditLogs] = useState([]);
  
  // API interaction modals
  const [boostModal, setBoostModal] = useState({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' });
  const [addUserModal, setAddUserModal] = useState({ isOpen: false, nim: '', nama: '', is_admin: false });

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(addUserModal)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('User berhasil ditambahkan', 'success');
        setAddUserModal({ isOpen: false, nim: '', nama: '', is_admin: false });
        fetchStudents();
      } else {
        showToast(data.detail || 'Gagal tambah user', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleDeleteUser = async (nim) => {
    if (!confirm(`Hapus user ${nim} dari sistem secara permanen? Semua sesi OS akan di-kill.`)) return;
    try {
      const res = await fetch(`/api/users/${nim}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`User ${nim} berhasil dihapus.`, 'success');
        fetchStudents();
      } else {
        showToast(data.detail || 'Gagal menghapus', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };
  
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
  });

  const handleBoost = async (e) => {
    e.preventDefault();
    if (!boostModal.nim) return;
    try {
      const res = await fetch('/api/users/boost', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          nim: boostModal.nim,
          hours: Number(boostModal.hours),
          reason: boostModal.reason
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`NIM ${boostModal.nim} berhasil di-boost!`, 'success');
        setBoostModal({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' });
        fetchStudents();
      } else {
        showToast(data.detail || 'Gagal boost user', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleUnboost = async (nim) => {
    if (!confirm(`Kembalikan NIM ${nim} ke Mode Normal?`)) return;
    try {
      const res = await fetch('/api/users/unboost', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nim })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`NIM ${nim} dikembalikan ke Mode Normal.`, 'info');
        fetchStudents();
      } else {
        showToast(data.detail || 'Gagal unboost', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleToggleAdmin = async (nim) => {
    try {
      const res = await fetch('/api/users/toggle-admin', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nim })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Status admin diperbarui', 'success');
        fetchStudents();
      } else {
        showToast(data.detail || 'Gagal mengubah status', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleToggleActive = async (nim) => {
    try {
      const res = await fetch('/api/users/toggle-active', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nim })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Status akun diperbarui', 'success');
        fetchStudents();
      } else {
        showToast(data.detail || 'Gagal mengubah status', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const fetchAuditLogs = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/audit-logs', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || data || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab === 'audit' && isAdmin) {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs, isAdmin]);

  // Combine Users
  const unifiedList = useMemo(() => {
    const list = [];
    (systemUsers || []).forEach(su => {
      list.push({ ...su, type: 'system' });
    });
    (students || []).forEach(st => {
      list.push({ ...st, type: 'student' });
    });
    return list;
  }, [systemUsers, students]);

  // Filter and Search
  const filteredData = useMemo(() => {
    return unifiedList.filter(item => {
      if (filterType === 'System' && item.type !== 'system') return false;
      if (filterType === 'Simtik' && item.type !== 'student') return false;
      const q = searchQuery.toLowerCase();
      if (item.type === 'system') {
        return item.username?.toLowerCase().includes(q) || item.tier?.toLowerCase().includes(q);
      } else {
        return item.nim?.toLowerCase().includes(q) || item.nama?.toLowerCase().includes(q);
      }
    });
  }, [unifiedList, filterType, searchQuery]);

  // Metrics (Preserving Bento Grid)
  const totalStudents = students?.length || 0;
  const activeStudents = students?.filter(s => s.is_active)?.length || 0;
  const boostedStudents = students?.filter(s => s.is_boosted)?.length || 0;
  const adminStudents = students?.filter(s => s.is_admin)?.length || 0;

  const onlineSystem = systemUsers?.filter(u => u.is_online)?.length || 0;
  
  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* Header Tabs */}
      <div className="flex items-center gap-6 px-6 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 pt-4 pb-0">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'users' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Unified User Management
          </div>
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'audit' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Audit Logs
            </div>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Bento Grid Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800/60 transition-colors group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">
                    <Users className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white tracking-tight">{totalStudents}</div>
                    <div className="text-xs text-slate-400 font-medium">Total Akun SIMTIK</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs px-2 py-1 bg-slate-900/50 rounded-md text-slate-300 font-mono border border-slate-700/50">
                    <span className="text-emerald-400 font-bold">{activeStudents}</span> Active
                  </span>
                  <span className="text-xs px-2 py-1 bg-slate-900/50 rounded-md text-slate-300 font-mono border border-slate-700/50">
                    <span className="text-amber-400 font-bold">{adminStudents}</span> Admin
                  </span>
                </div>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800/60 transition-colors group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                    <Zap className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white tracking-tight">{boostedStudents}</div>
                    <div className="text-xs text-slate-400 font-medium">Priority / Boosted</div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-snug">Akun dengan akses vRAM tinggi & tanpa limit waktu aktif.</p>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800/60 transition-colors group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                    <Activity className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white tracking-tight">{onlineSystem} / {systemUsers?.length || 0}</div>
                    <div className="text-xs text-slate-400 font-medium">System Sessions</div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-snug">Sesi Linux aktif (training / riset).</p>
              </div>
            </div>

            {/* Filter & Search Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex gap-2">
                {['All', 'System', 'Simtik'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterType(f)}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${
                      filterType === f 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                        : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {f === 'System' ? 'System / Research' : f === 'Simtik' ? 'SIMTIK Students' : 'All Accounts'}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-72 flex gap-3">
                {isAdmin && (
                  <button onClick={() => setAddUserModal({ ...addUserModal, isOpen: true })} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/20 whitespace-nowrap">
                    <UserPlus className="w-4 h-4" /> Add
                  </button>
                )}
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari username / NIM / nama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                </div>
              </div>
            </div>

            {/* Unified Table */}
            <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800/50">
                      <th className="px-6 py-4 border-b border-slate-700/50 text-xs font-semibold text-slate-300 uppercase tracking-wider">User Info</th>
                      <th className="px-6 py-4 border-b border-slate-700/50 text-xs font-semibold text-slate-300 uppercase tracking-wider">Type / Status</th>
                      <th className="px-6 py-4 border-b border-slate-700/50 text-xs font-semibold text-slate-300 uppercase tracking-wider">Resource / Priority</th>
                      <th className="px-6 py-4 border-b border-slate-700/50 text-xs font-semibold text-slate-300 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-slate-500 text-sm">
                          No accounts found.
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((item, idx) => {
                        if (item.type === 'student') {
                          return (
                            <tr key={`student-${item.nim}`} className="hover:bg-slate-800/50 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                                    {item.nama ? item.nama.charAt(0) : item.nim.slice(-1)}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-white text-sm">
                                      {item.nama || 'No Name'}
                                      {item.is_admin && <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold tracking-wide uppercase">Admin</span>}
                                    </div>
                                    <div className="text-xs text-slate-500 font-mono mt-0.5">{item.nim}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded w-fit border border-slate-700">SIMTIK</span>
                                  {item.is_active ? (
                                    <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div> Active
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-medium text-rose-400 flex items-center gap-1.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div> Disabled
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {item.is_boosted ? (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                                      <Zap className="w-3.5 h-3.5" fill="currentColor" /> Priority Mode
                                    </span>
                                    <span className="text-[10px] text-amber-500/70 font-mono">20 Core | 70GB RAM | GPU 0</span>
                                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                                      Expires: <LiveCountdown expiresAt={item.boost_expires_at} />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs text-slate-400 font-medium px-2 py-0.5 bg-slate-800/50 rounded border border-slate-700/50 w-fit">Standard Quota</span>
                                    <span className="text-[10px] text-slate-500 font-mono mt-1">2 Core | 3GB RAM | GPU 1</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                {isAdmin ? (
                                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {item.is_boosted ? (
                                      <button onClick={() => handleUnboost(item.nim)} className="px-2.5 py-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 text-xs font-medium transition-colors flex items-center gap-1.5" title="Remove Boost">
                                        <RotateCcw className="w-3.5 h-3.5" /> Normal
                                      </button>
                                    ) : (
                                      <button onClick={() => setBoostModal({ isOpen: true, nim: item.nim, nama: item.nama, hours: 4, reason: '' })} className="px-2.5 py-1.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 text-xs font-medium transition-colors flex items-center gap-1.5" title="Boost Resource">
                                        <Zap className="w-3.5 h-3.5" /> Boost
                                      </button>
                                    )}
                                    <button onClick={() => handleToggleActive(item.nim)} className={`px-2.5 py-1.5 rounded border text-xs font-medium transition-colors flex items-center gap-1.5 ${item.is_active ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'}`}>
                                      {item.is_active ? <><UserX className="w-3.5 h-3.5"/> Block</> : <><UserCheck className="w-3.5 h-3.5"/> Unblock</>}
                                    </button>
                                    <button onClick={() => handleToggleAdmin(item.nim)} className={`px-2.5 py-1.5 rounded border text-xs font-medium transition-colors ${item.is_admin ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-700'}`} title="Toggle Admin">
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDeleteUser(item.nim)} className="px-2.5 py-1.5 rounded border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors" title="Delete User">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-500">Read-only</span>
                                )}
                              </td>
                            </tr>
                          );
                        } else {
                          // System User
                          const isRiset = item.tier === 'Riset';
                          const isOverQuota = item.status_color === 'red';
                          return (
                            <tr key={`system-${item.username}`} className="hover:bg-slate-800/50 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs uppercase border border-emerald-500/30">
                                    <Server className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-white text-sm flex items-center gap-2">
                                      {item.username}
                                      {isRiset && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30 font-bold tracking-wide uppercase">Riset</span>}
                                    </div>
                                    <div className="text-xs text-slate-500 font-mono mt-0.5">System Session</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1.5">
                                  {isOverQuota ? (
                                    <span className="text-[10px] font-medium text-rose-400 flex items-center gap-1.5 bg-rose-500/10 px-2 py-0.5 rounded w-fit border border-rose-500/20">
                                      <AlertTriangle className="w-3 h-3"/> Over Quota
                                    </span>
                                  ) : item.is_online ? (
                                    <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded w-fit border border-emerald-500/20">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div> Online
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5 bg-slate-800 px-2 py-0.5 rounded w-fit border border-slate-700">
                                      <Clock className="w-3 h-3"/> Offline
                                    </span>
                                  )}
                                  <div className="flex flex-wrap gap-1">
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{item.gpu_assigned}</span>
                                    <span className="text-[10px] bg-slate-800 text-indigo-400 px-1.5 py-0.5 rounded">{item.cpu_cores_limit || (isRiset ? 20 : 2)} Core</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1 text-[10px] font-mono">
                                  <div className="flex justify-between w-32">
                                    <span className="text-slate-400">RAM:</span>
                                    <span className={item.ram_percent > 80 ? 'text-amber-400 font-bold' : 'text-slate-300'}>{item.ram_percent}% / {isRiset ? '70GB' : '3GB'}</span>
                                  </div>
                                  <div className="flex justify-between w-32">
                                    <span className="text-slate-400">CPU:</span>
                                    <span className={item.cpu_quota_percent > 80 ? 'text-amber-400 font-bold' : 'text-slate-300'}>{item.cpu_quota_percent}%</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {isAdmin ? (
                                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onKillAllUser(item.username)} className="px-2.5 py-1.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-medium transition-colors flex items-center gap-1.5" title="Kill All Sessions">
                                      <Ban className="w-3.5 h-3.5" /> Kill Sessions
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-500">Read-only</span>
                                )}
                              </td>
                            </tr>
                          );
                        }
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === 'audit' && isAdmin && (
          <AuditLogView logs={auditLogs} />
        )}
      </div>

      {/* Add User Modal */}
      {addUserModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <UserPlus className="w-6 h-6 text-indigo-400 fill-current" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Add New User</h3>
                <p className="text-sm text-slate-400">Tambah akun secara manual</p>
              </div>
            </div>

            <form onSubmit={handleAddUser} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Username / NIM</label>
                <input required type="text" value={addUserModal.nim} onChange={(e) => setAddUserModal((prev) => ({ ...prev, nim: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" placeholder="Misal: training12 atau 23533000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nama Lengkap</label>
                <input required type="text" value={addUserModal.nama} onChange={(e) => setAddUserModal((prev) => ({ ...prev, nama: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" placeholder="Nama mahasiswa / asisten" />
              </div>
              <div className="flex items-center gap-3 mt-4">
                <input type="checkbox" id="is_admin" checked={addUserModal.is_admin} onChange={(e) => setAddUserModal((prev) => ({ ...prev, is_admin: e.target.checked }))} className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-950" />
                <label htmlFor="is_admin" className="text-sm font-medium text-slate-300">Jadikan Admin (Bisa Akses Dashboard)</label>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button type="button" onClick={() => setAddUserModal({ isOpen: false, nim: '', nama: '', is_admin: false })} className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm font-medium transition-colors">Batal</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 transition-colors">Simpan User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Boost Modal */}
      {boostModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                  <Zap className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Boost Resource</h3>
                  <p className="text-xs text-slate-400">Tingkatkan limit VRAM & CPU</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleBoost} className="p-5 space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-4">Target: <span className="text-white font-mono">{boostModal.nim}</span></p>
                <label className="block text-sm font-medium text-slate-300 mb-2">Durasi (Jam)</label>
                <input type="number" min="1" max="72" value={boostModal.hours} onChange={e => setBoostModal({...boostModal, hours: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setBoostModal({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' })} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 border border-transparent">Batal</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                  <Zap className="w-4 h-4"/> Apply Boost
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
