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
      const res = await fetch(`/api/audit-logs?_t=${Date.now()}`, { 
        headers: getAuthHeaders(),
        cache: 'no-store'
      });
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
  const onlineStudents = students?.filter(s => s.is_active && systemUsers?.some(su => su.username === `m${s.nim}`))?.length || 0;
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
            {/* Bento Grid Metrics — Stitch Design */}
            {/* Ringkasan singkat */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 px-1 text-sm text-[#908fa0]">
              <span><strong className="text-[#dfe2ef] text-base">{totalStudents}</strong> akun SIMTIK</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#4edea3]"></span><strong className="text-[#dfe2ef] text-base">{onlineStudents}</strong> online</span>
              <span><strong className="text-[#dfe2ef] text-base">{boostedStudents}/1</strong> slot GPU prioritas</span>
              <span><strong className="text-[#dfe2ef] text-base">{onlineSystem}/{systemUsers?.length || 0}</strong> sesi sistem</span>
            </div>

            {/* Filter & Search Header — Stitch Style */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex gap-2 p-1 bg-[#0a0e17] rounded-xl border border-[#46455430]">
                {['All', 'System', 'Simtik'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterType(f)}
                    className={`px-3.5 py-1.5 text-xs font-mono font-medium rounded-lg transition-all ${
                      filterType === f 
                        ? 'bg-[#1c1f29] text-[#c0c1ff] border border-[#c0c1ff]/30 shadow-sm' 
                        : 'text-[#908fa0] hover:text-[#dfe2ef]'
                    }`}
                  >
                    {f === 'System' ? 'System / Research' : f === 'Simtik' ? 'SIMTIK Students' : 'All Accounts'}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-72 flex gap-3">
                {isAdmin && (
                  <button onClick={() => setAddUserModal({ ...addUserModal, isOpen: true })} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors whitespace-nowrap">
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

            {/* Unified Table — Stitch Screen 2 Style */}
            <div className="bg-[#181b25] rounded-2xl border border-[#46455430] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0a0e17]/80 font-mono text-[10px] uppercase tracking-wider text-[#908fa0] border-b border-[#46455430]">
                      <th className="px-5 py-3.5">Student / Researcher</th>
                      <th className="px-5 py-3.5">NIM / Dept</th>
                      <th className="px-5 py-3.5">Tier & cgroup</th>
                      <th className="px-5 py-3.5">Active Hardware</th>
                      <th className="px-5 py-3.5">RAM & Quota</th>
                      <th className="px-5 py-3.5 text-right">Root Actions</th>
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
                            <tr key={`student-${item.nim}`} className="hover:bg-[#1c1f29]/70 transition-colors border-b border-[#46455420] group">
                              {/* 1. Student / Researcher */}
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase font-mono border ${
                                    item.is_boosted 
                                      ? 'bg-[#4cd7f6]/20 text-[#4cd7f6] border-[#4cd7f6]/40' 
                                      : 'bg-[#1c1f29] text-[#c0c1ff] border-[#46455430]'
                                  }`}>
                                    {item.nama ? item.nama.slice(0, 2).toUpperCase() : item.nim.slice(-2)}
                                  </div>
                                  <div>
                                    <div className="font-medium text-[#dfe2ef] text-sm flex items-center gap-2">
                                      {item.nama || 'Mahasiswa SIMTIK'}
                                      {item.is_admin && <span className="text-[9px] bg-[#fbbf24]/20 text-[#fbbf24] px-1.5 py-0.2 rounded border border-[#fbbf24]/30 font-mono font-bold uppercase">ADMIN</span>}
                                    </div>
                                    <div className="text-[11px] text-[#908fa0] font-mono mt-0.5">mhs.{item.nim}@umpo.ac.id</div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. NIM & Status */}
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-mono text-xs font-semibold text-[#4cd7f6]">{item.nim}</span>
                                  {item.is_active ? (
                                    systemUsers?.some(su => su.username === `m${item.nim}`) ? (
                                      <span className="text-[10px] font-mono text-[#4edea3] flex items-center gap-1.5" title="User sedang online (sesi aktif)">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span> Online
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-mono text-[#908fa0] flex items-center gap-1.5" title="Akun valid (sedang offline)">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#908fa0]"></span> Offline
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-[10px] font-mono text-[#ffb4ab] flex items-center gap-1.5" title="Akun diblokir">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab]"></span> Blocked
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 3. Tier & cgroup (Stitch Screen 2) */}
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col gap-0.5">
                                  {item.is_boosted ? (
                                    <>
                                      <span className="px-2 py-0.5 rounded bg-[#4cd7f6]/20 text-[#4cd7f6] border border-[#4cd7f6]/40 font-mono text-[9px] font-bold w-fit shadow-sm">
                                        TIER 3 (MONSTER)
                                      </span>
                                      <span className="text-[10px] text-[#908fa0] font-mono">/slice/monster.slice</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="px-2 py-0.5 rounded bg-[#262a34] text-[#c7c4d7] border border-[#46455440] font-mono text-[9px] font-medium w-fit">
                                        TIER 2 (STANDARD)
                                      </span>
                                      <span className="text-[10px] text-[#908fa0] font-mono">/slice/student.slice</span>
                                    </>
                                  )}
                                </div>
                              </td>

                              {/* 4. Active Hardware */}
                              <td className="px-5 py-3.5">
                                {item.is_boosted ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-mono font-bold text-[#4cd7f6] flex items-center gap-1">
                                      <Zap className="w-3.5 h-3.5" fill="currentColor"/> GPU 0 (Dedicated)
                                    </span>
                                    <span className="text-[10px] text-[#908fa0] font-mono">20 Cores | 70GB VRAM</span>
                                    <div className="text-[10px] text-[#fbbf24] font-mono">
                                      Expires: <LiveCountdown expiresAt={item.boost_expires_at} />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-mono text-[#c7c4d7] font-medium">GPU 1 (Shared Pool)</span>
                                    <span className="text-[10px] text-[#908fa0] font-mono">2 Cores | 3GB RAM</span>
                                  </div>
                                )}
                              </td>

                              {/* 5. RAM & Quota Progress (Stitch Screen 2) */}
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col gap-1 w-32">
                                  <div className="flex justify-between text-[10px] font-mono">
                                    <span className="text-[#908fa0]">{item.is_boosted ? 'Alloc: 70GB' : 'Alloc: 3GB'}</span>
                                    <span className={item.is_boosted ? 'text-[#4cd7f6] font-bold' : 'text-[#c7c4d7]'}>
                                      {item.is_boosted ? 'Max Cap' : 'Norm'}
                                    </span>
                                  </div>
                                  <div className="w-full bg-[#262a34] h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${item.is_boosted ? 'bg-[#4cd7f6]' : 'bg-[#c0c1ff]'}`}
                                      style={{ width: item.is_boosted ? '100%' : '35%' }}
                                    ></div>
                                  </div>
                                </div>
                              </td>

                              {/* 6. Root Actions */}
                              <td className="px-5 py-3.5 text-right">
                                {isAdmin ? (
                                  <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                    {item.is_boosted ? (
                                      <button onClick={() => handleUnboost(item.nim)} className="px-2 py-1 rounded-lg bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30 hover:bg-[#fbbf24]/25 text-xs font-mono transition-colors flex items-center gap-1" title="Revert to Normal">
                                        <RotateCcw className="w-3.5 h-3.5" /> Revert
                                      </button>
                                    ) : (
                                      <button onClick={() => setBoostModal({ isOpen: true, nim: item.nim, nama: item.nama, hours: 4, reason: '' })} className="px-2 py-1 rounded-lg bg-[#4cd7f6]/15 text-[#4cd7f6] border border-[#4cd7f6]/30 hover:bg-[#4cd7f6]/25 text-xs font-mono font-medium transition-colors flex items-center gap-1 shadow-sm" title="Boost Resource to Monster">
                                        <Zap className="w-3.5 h-3.5" /> Boost
                                      </button>
                                    )}
                                    <button onClick={() => handleToggleActive(item.nim)} className={`px-2 py-1 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1 ${item.is_active ? 'bg-[#ffb4ab]/15 text-[#ffb4ab] border-[#ffb4ab]/30 hover:bg-[#ffb4ab]/25' : 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/30 hover:bg-[#4edea3]/25'}`} title={item.is_active ? 'Block User & Kill Sessions' : 'Unblock User'}>
                                      {item.is_active ? <UserX className="w-3.5 h-3.5"/> : <UserCheck className="w-3.5 h-3.5"/>}
                                    </button>
                                    <button onClick={() => handleToggleAdmin(item.nim)} className={`px-2 py-1 rounded-lg border text-xs font-mono transition-colors ${item.is_admin ? 'bg-[#c0c1ff]/20 text-[#c0c1ff] border-[#c0c1ff]/40' : 'bg-[#1c1f29] text-[#908fa0] border-[#46455430] hover:text-white'}`} title="Toggle Admin Privileges">
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDeleteUser(item.nim)} className="px-2 py-1 rounded-lg border border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 transition-colors" title="Delete User & Kill Sessions">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-mono text-[#908fa0]">// READ_ONLY</span>
                                )}
                              </td>
                            </tr>
                          );
                        } else {
                          // System User
                          const isRiset = item.tier === 'Riset';
                          const isOverQuota = item.status_color === 'red';
                          return (
                            <tr key={`system-${item.username}`} className="hover:bg-[#1c1f29]/70 transition-colors border-b border-[#46455420] group">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-[#c0c1ff]/15 text-[#c0c1ff] border border-[#c0c1ff]/30 flex items-center justify-center font-bold text-xs uppercase font-mono">
                                    <Server className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-[#dfe2ef] text-sm flex items-center gap-2">
                                      {item.username}
                                      {isRiset && <span className="text-[9px] bg-[#c0c1ff]/20 text-[#c0c1ff] px-1.5 py-0.2 rounded border border-[#c0c1ff]/30 font-mono font-bold uppercase">RISET</span>}
                                    </div>
                                    <div className="text-[11px] text-[#908fa0] font-mono mt-0.5">system@{item.username}</div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-3.5">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-mono text-xs font-semibold text-[#c0c1ff]">{item.username}</span>
                                  {isOverQuota ? (
                                    <span className="text-[10px] font-mono text-[#ffb4ab] flex items-center gap-1.5">
                                      <AlertTriangle className="w-3 h-3"/> Over Quota
                                    </span>
                                  ) : item.is_online ? (
                                    <span className="text-[10px] font-mono text-[#4edea3] flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span> Online
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono text-[#908fa0] flex items-center gap-1.5">
                                      <Clock className="w-3 h-3"/> Offline
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="px-5 py-3.5">
                                <div className="flex flex-col gap-0.5">
                                  <span className="px-2 py-0.5 rounded bg-[#c0c1ff]/20 text-[#c0c1ff] border border-[#c0c1ff]/40 font-mono text-[9px] font-bold w-fit">
                                    {isRiset ? 'TIER 1 (RISET)' : 'TIER 2 (TRAINING)'}
                                  </span>
                                  <span className="text-[10px] text-[#908fa0] font-mono">/slice/{item.username}.slice</span>
                                </div>
                              </td>

                              <td className="px-5 py-3.5">
                                <div className="flex flex-col gap-0.5 font-mono text-xs">
                                  <span className="text-[#c7c4d7]">{item.gpu_assigned}</span>
                                  <span className="text-[10px] text-[#908fa0]">{item.cpu_cores_limit || (isRiset ? 20 : 2)} Cores Claimed</span>
                                </div>
                              </td>

                              <td className="px-5 py-3.5">
                                <div className="flex flex-col gap-1 w-32 font-mono">
                                  <div className="flex justify-between text-[10px]">
                                    <span className="text-[#908fa0]">RAM: {isRiset ? '70GB' : '3GB'}</span>
                                    <span className={item.ram_percent > 80 ? 'text-[#fbbf24] font-bold' : 'text-[#c7c4d7]'}>{item.ram_percent}%</span>
                                  </div>
                                  <div className="w-full bg-[#262a34] h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${item.ram_percent > 80 ? 'bg-[#fbbf24]' : 'bg-[#4edea3]'}`}
                                      style={{ width: `${Math.min(item.ram_percent || 0, 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-3.5 text-right">
                                {isAdmin ? (
                                  <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onKillAllUser(item.username)} className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 text-xs font-mono transition-colors flex items-center gap-1.5" title="Kill All Sessions">
                                      <Ban className="w-3.5 h-3.5" /> Terminate
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-mono text-[#908fa0]">// READ_ONLY</span>
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
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors">Simpan User</button>
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
                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2">
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
