import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, Zap, RotateCcw, Shield, ShieldCheck, Search, CheckCircle2,
  AlertCircle, Clock, UserCheck, UserX, Sparkles, KeyRound, RefreshCw,
  Lock, LogOut, ChevronLeft, ChevronRight, Activity, Cpu, MoreVertical,
  Database, Server, Ban, AlertTriangle, Trash2, X
} from 'lucide-react';
import AuditLogView from './AuditLogView';

const LiveCountdown = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!expiresAt) return;
    const updateCountdown = () => {
      const now = new Date().getTime();
      const cleanDate = typeof expiresAt === 'string' ? expiresAt.replace(' ', 'T') : expiresAt;
      const target = new Date(cleanDate).getTime();
      if (isNaN(target)) {
        setTimeLeft('—');
        return;
      }
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft('Expired');
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
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  return <span className="text-amber-400 font-semibold">{timeLeft || '...'}</span>;
};

export default function UnifiedUserManagement({
  isAdmin,
  adminRole,
  adminUser,
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
  
  // Modals state
  const [boostModal, setBoostModal] = useState({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' });
  const [resetModal, setResetModal] = useState({ isOpen: false, username: '', newPassword: '', isSubmitting: false });

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
  });

  const handleDeleteUser = async (nim) => {
    if (!confirm(`Hapus user NIM ${nim} dari sistem secara permanen? Semua sesi OS akan dihentikan.`)) return;
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
        showToast(data.detail || 'Gagal menghapus user', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

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
        showToast(`NIM ${boostModal.nim} berhasil di-boost ke Level 1!`, 'success');
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
    if (!confirm(`Kembalikan NIM ${nim} ke Mode Standard Level 2?`)) return;
    try {
      const res = await fetch('/api/users/unboost', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nim })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`NIM ${nim} dikembalikan ke Mode Standard Level 2.`, 'info');
        fetchStudents();
      } else {
        showToast(data.detail || 'Gagal unboost', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleSetRole = async (nim, newRole) => {
    try {
      const res = await fetch('/api/users/set-role', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nim, role: newRole })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Role NIM ${nim} berhasil diubah ke ${newRole.toUpperCase()}.`, 'success');
        fetchStudents();
      } else {
        showToast(data.detail || 'Gagal mengubah role pengguna', 'error');
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
        showToast(data.message || 'Status akun berhasil diperbarui.', 'success');
        fetchStudents();
      } else {
        showToast(data.detail || 'Gagal mengubah status', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetModal.newPassword) {
      showToast('Password baru tidak boleh kosong.', 'error');
      return;
    }
    setResetModal(prev => ({ ...prev, isSubmitting: true }));
    const result = await onResetPassword(resetModal.username, resetModal.newPassword);
    setResetModal({ isOpen: false, username: '', newPassword: '', isSubmitting: false });
    if (result.success) {
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }
  };

  const fetchAuditLogs = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs]);

  // Combine Users & Deduplicate SIMTIK accounts with OS telemetry
  const unifiedList = useMemo(() => {
    const list = [];
    
    // 1. Pure System Users (labriset, training1-10, etc.)
    const pureSystemUsers = (systemUsers || []).filter(
      su => !(su.username?.startsWith('m') && /^\d+$/.test(su.username.slice(1)))
    );
    pureSystemUsers.forEach(su => {
      list.push({ ...su, type: 'system' });
    });

    // 2. Map OS telemetry for students by NIM
    const studentTelemetryMap = new Map();
    (systemUsers || []).forEach(su => {
      if (su.username?.startsWith('m') && /^\d+$/.test(su.username.slice(1))) {
        const nim = su.username.slice(1);
        studentTelemetryMap.set(nim, su);
      }
    });

    // 3. Process SIMTIK students
    (students || []).forEach(st => {
      const osUser = studentTelemetryMap.get(st.nim);
      const isOnline = Boolean(st.is_active && (osUser?.is_online || (osUser?.total_process_count > 0)));
      list.push({
        ...st,
        type: 'student',
        is_online: isOnline,
        os_user: osUser || null,
        ram_used_mb: osUser?.ram_used_mb || 0,
        ram_max_mb: osUser?.ram_max_mb || (st.is_priority ? 71680 : 3072),
        vram_used_mb: osUser?.vram_used_mb || 0,
        cpu_percent: osUser?.cpu_percent || 0,
        processes: osUser?.processes || []
      });
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
        const uname = item.username?.toLowerCase() || '';
        const isRiset = item.username === 'labriset';
        const label = isRiset ? 'riset skripsi' : 'dosen pelatihan';
        return uname.includes(q) || label.includes(q);
      } else {
        return (item.nim?.toLowerCase() || '').includes(q) || (item.nama?.toLowerCase() || '').includes(q);
      }
    });
  }, [unifiedList, filterType, searchQuery]);

  // Metrics
  const totalStudents = students?.length || 0;
  const onlineStudents = students?.filter(s => s.is_active && systemUsers?.some(su => su.username === `m${s.nim}` && (su.is_online || su.total_process_count > 0)))?.length || 0;
  const boostedStudents = students?.filter(s => s.is_priority)?.length || 0;
  const aslabStudents = students?.filter(s => s.role === 'aslab')?.length || 0;
  const onlineSystem = (systemUsers || []).filter(u => u.is_online && !u.username?.startsWith('m'))?.length || 0;
  
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
            {/* Operator Mode Alert (if logged in as Aslab) */}
            {adminRole === 'aslab' && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#4cd7f6]/10 border border-[#4cd7f6]/20 text-[#4cd7f6] text-xs font-mono">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Mode Operator Aslab ({adminUser?.nama || 'Asisten'}):</strong> Anda memiliki hak akses untuk memantau aktivitas server dan menghentikan (Kill Sesi) notebook mahasiswa yang over-quota/stuck. Aksi konfigurasi role, boost, blokir, dan reset password dilindungi hak Super Admin.
                </span>
              </div>
            )}

            {/* Metrics Bar */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 px-1 text-sm text-[#908fa0]">
              <span><strong className="text-[#dfe2ef] text-base">{totalStudents}</strong> akun SIMTIK</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#4edea3]"></span><strong className="text-[#dfe2ef] text-base">{onlineStudents}</strong> mahasiswa online</span>
              <span><strong className="text-[#dfe2ef] text-base">{boostedStudents}/1</strong> slot GPU prioritas</span>
              <span><strong className="text-[#4cd7f6] text-base">{aslabStudents}</strong> aslab terdaftar</span>
              <span><strong className="text-[#dfe2ef] text-base">{onlineSystem}/11</strong> akun dosen & riset aktif</span>
            </div>

            {/* Filter & Search Header */}
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
                    {f === 'System' ? 'Dosen & Riset (Local)' : f === 'Simtik' ? 'Mahasiswa SIMTIK' : 'Semua Akun'}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari NIM, nama, dosen, atau riset..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0a0e17] border border-[#46455430] rounded-xl py-2 pl-9 pr-4 text-sm text-[#dfe2ef] placeholder:text-[#908fa0] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                />
              </div>
            </div>

            {/* Unified Table */}
            <div className="bg-[#181b25] rounded-2xl border border-[#46455430] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0a0e17]/80 font-mono text-[10px] uppercase tracking-wider text-[#908fa0] border-b border-[#46455430]">
                      <th className="px-5 py-3.5">Akun & Pengguna</th>
                      <th className="px-5 py-3.5">Identitas & Status</th>
                      <th className="px-5 py-3.5">Role / Hak Akses</th>
                      <th className="px-5 py-3.5">QoS & Cgroup Slice</th>
                      <th className="px-5 py-3.5">Alokasi Hardware</th>
                      <th className="px-5 py-3.5">Penggunaan RAM</th>
                      <th className="px-5 py-3.5 text-right">Aksi Manajemen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-slate-500 text-sm">
                          Tidak ada data akun yang ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((item) => {
                        if (item.type === 'student') {
                          const ramMax = item.is_priority ? 71680 : 3072;
                          const ramPct = item.is_online ? Math.min(Math.round(((item.ram_used_mb || 0) / ramMax) * 100), 100) : 0;
                          const userRole = item.role || (item.is_admin ? 'admin' : 'mahasiswa');

                          return (
                            <tr key={`student-${item.nim}`} className="hover:bg-[#1c1f29]/70 transition-colors border-b border-[#46455420] group">
                              {/* 1. Akun & Pengguna */}
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase font-mono border ${
                                    item.is_priority 
                                      ? 'bg-[#4cd7f6]/20 text-[#4cd7f6] border-[#4cd7f6]/40' 
                                      : 'bg-[#1c1f29] text-[#c0c1ff] border-[#46455430]'
                                  }`}>
                                    {item.nama ? item.nama.slice(0, 2).toUpperCase() : item.nim.slice(-2)}
                                  </div>
                                  <div>
                                    <div className="font-medium text-[#dfe2ef] text-sm flex items-center gap-2">
                                      {item.nama || 'Mahasiswa SIMTIK'}
                                    </div>
                                    <div className="text-[11px] text-[#908fa0] font-mono mt-0.5">mhs.{item.nim}@umpo.ac.id</div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. Identitas & Status */}
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-mono text-xs font-semibold text-[#4cd7f6]">{item.nim}</span>
                                  {item.is_active ? (
                                    item.is_online ? (
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-mono text-[#4edea3] flex items-center gap-1.5" title="Notebook sedang aktif">
                                          <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span> Online
                                        </span>
                                        {item.active_ip && (
                                          <span className="text-[9px] font-mono text-[#908fa0]" title="IP Perangkat Aktif">
                                            {item.active_ip}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] font-mono text-[#908fa0] flex items-center gap-1.5" title="Akun terdaftar (offline)">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#908fa0]"></span> Offline
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-[10px] font-mono text-[#ffb4ab] flex items-center gap-1.5" title="Akses dinonaktifkan/diblokir">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab]"></span> Blocked
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 3. Role / Hak Akses */}
                              <td className="px-5 py-3.5">
                                {adminRole === 'admin' ? (
                                  <select
                                    value={userRole}
                                    onChange={(e) => handleSetRole(item.nim, e.target.value)}
                                    className="bg-[#0a0e17] border border-[#46455430] hover:border-[#c0c1ff]/50 text-[#dfe2ef] rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                    title="Pilih Role Akun Mahasiswa"
                                  >
                                    <option value="mahasiswa">Mahasiswa</option>
                                    <option value="aslab">Asisten Lab (Aslab)</option>
                                    <option value="admin">Super Admin</option>
                                  </select>
                                ) : (
                                  <div>
                                    {userRole === 'admin' ? (
                                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                                        ADMIN
                                      </span>
                                    ) : userRole === 'aslab' ? (
                                      <span className="px-2 py-0.5 rounded bg-[#4cd7f6]/15 text-[#4cd7f6] border border-[#4cd7f6]/30 text-[10px] font-mono font-bold">
                                        ASLAB
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded bg-[#262a34] text-[#908fa0] border border-[#46455430] text-[10px] font-mono">
                                        MAHASISWA
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* 4. QoS & Cgroup Slice */}
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col gap-0.5">
                                  {item.is_priority ? (
                                    <>
                                      <span className="px-2 py-0.5 rounded bg-[#4cd7f6]/20 text-[#4cd7f6] border border-[#4cd7f6]/40 font-mono text-[9px] font-bold w-fit shadow-sm">
                                        Level 1 (Priority)
                                      </span>
                                      <span className="text-[10px] text-[#908fa0] font-mono">compute-level1.slice</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="px-2 py-0.5 rounded bg-[#262a34] text-[#c7c4d7] border border-[#46455440] font-mono text-[9px] font-medium w-fit">
                                        Level 2 (Standard)
                                      </span>
                                      <span className="text-[10px] text-[#908fa0] font-mono">compute-level2.slice</span>
                                    </>
                                  )}
                                </div>
                              </td>

                              {/* 5. Alokasi Hardware */}
                              <td className="px-5 py-3.5">
                                {item.is_priority ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-mono font-bold text-[#4cd7f6] flex items-center gap-1">
                                      <Zap className="w-3.5 h-3.5" fill="currentColor"/> GPU 0 (Dedicated)
                                    </span>
                                    <span className="text-[10px] text-[#908fa0] font-mono">20 Cores | 70GB RAM</span>
                                    {item.priority_expires_at && (
                                      <div className="text-[10px] text-[#fbbf24] font-mono">
                                        Sisa: <LiveCountdown expiresAt={item.priority_expires_at} />
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-mono text-[#c7c4d7] font-medium">GPU 1 (Shared Pool)</span>
                                    <span className="text-[10px] text-[#908fa0] font-mono">2 Cores | 3GB RAM</span>
                                  </div>
                                )}
                              </td>

                              {/* 6. RAM & Quota */}
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col gap-1 w-28">
                                  <div className="flex justify-between text-[10px] font-mono">
                                    <span className="text-[#908fa0]">{item.is_priority ? '70GB' : '3GB'}</span>
                                    <span className={item.is_priority ? 'text-[#4cd7f6] font-bold' : 'text-[#c7c4d7]'}>
                                      {item.is_online ? `${Math.round(item.ram_used_mb || 0)} MB` : '0 MB'}
                                    </span>
                                  </div>
                                  <div className="w-full bg-[#262a34] h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${item.is_priority ? 'bg-[#4cd7f6]' : 'bg-[#c0c1ff]'}`}
                                      style={{ width: `${item.is_online ? Math.max(ramPct, 5) : 0}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>

                              {/* 7. Root Actions */}
                              <td className="px-5 py-3.5 text-right">
                                {isAdmin ? (
                                  <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                    {/* Kill Session (Allowed for both Aslab and Super Admin) */}
                                    {item.is_online && (
                                      <button
                                        onClick={() => onKillAllUser(`m${item.nim}`)}
                                        className="px-2 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 text-xs font-mono transition-colors flex items-center gap-1"
                                        title="Hentikan sesi Jupyter notebook mahasiswa yang aktif/stuck"
                                      >
                                        <Ban className="w-3.5 h-3.5" /> Kill Sesi
                                      </button>
                                    )}

                                    {/* Super Admin Only Actions */}
                                    {adminRole === 'admin' && (
                                      <>
                                        {item.is_priority ? (
                                          <button
                                            onClick={() => handleUnboost(item.nim)}
                                            className="px-2 py-1 rounded-lg bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30 hover:bg-[#fbbf24]/25 text-xs font-mono transition-colors flex items-center gap-1"
                                            title="Kembalikan alokasi ke Level 2 (Standard)"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5" /> Revert
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => setBoostModal({ isOpen: true, nim: item.nim, nama: item.nama, hours: 4, reason: '' })}
                                            className="px-2 py-1 rounded-lg bg-[#4cd7f6]/15 text-[#4cd7f6] border border-[#4cd7f6]/30 hover:bg-[#4cd7f6]/25 text-xs font-mono font-medium transition-colors flex items-center gap-1 shadow-sm"
                                            title="Boost resource ke Level 1 (Dedicated GPU 0)"
                                          >
                                            <Zap className="w-3.5 h-3.5" /> Boost
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleToggleActive(item.nim)}
                                          className={`px-2 py-1 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1 ${
                                            item.is_active
                                              ? 'bg-[#ffb4ab]/15 text-[#ffb4ab] border-[#ffb4ab]/30 hover:bg-[#ffb4ab]/25'
                                              : 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/30 hover:bg-[#4edea3]/25'
                                          }`}
                                          title={item.is_active ? 'Blokir akun & hentikan sesi' : 'Buka blokir akun'}
                                        >
                                          {item.is_active ? <UserX className="w-3.5 h-3.5"/> : <UserCheck className="w-3.5 h-3.5"/>}
                                        </button>
                                        <button
                                          onClick={() => handleDeleteUser(item.nim)}
                                          className="px-2 py-1 rounded-lg border border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 transition-colors"
                                          title="Hapus akun mahasiswa dari sistem"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-mono text-[#908fa0]">// READ_ONLY</span>
                                )}
                              </td>
                            </tr>
                          );
                        } else {
                          // System User: labriset atau training1-10
                          const isRiset = item.username === 'labriset';
                          const isOverQuota = item.status_color === 'red';

                          return (
                            <tr key={`system-${item.username}`} className="hover:bg-[#1c1f29]/70 transition-colors border-b border-[#46455420] group">
                              {/* 1. Akun & Pengguna */}
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase font-mono border ${
                                    isRiset
                                      ? 'bg-[#4cd7f6]/15 text-[#4cd7f6] border-[#4cd7f6]/30'
                                      : 'bg-[#c0c1ff]/15 text-[#c0c1ff] border-[#c0c1ff]/30'
                                  }`}>
                                    {isRiset ? <Database className="w-4 h-4" /> : <Server className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <div className="font-medium text-[#dfe2ef] text-sm flex items-center gap-2">
                                      {item.username}
                                      {isRiset ? (
                                        <span className="text-[9px] bg-[#4cd7f6]/20 text-[#4cd7f6] px-1.5 py-0.5 rounded border border-[#4cd7f6]/30 font-mono font-bold uppercase">
                                          RISET & SKRIPSI
                                        </span>
                                      ) : (
                                        <span className="text-[9px] bg-[#c0c1ff]/20 text-[#c0c1ff] px-1.5 py-0.5 rounded border border-[#c0c1ff]/30 font-mono font-bold uppercase">
                                          DOSEN / PELATIHAN
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-[#908fa0] font-mono mt-0.5">
                                      {isRiset ? 'Akun Riset & Skripsi Mahasiswa/Dosen' : 'Akun Dosen & Pelatihan Praktikum'}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. Identitas & Status */}
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-mono text-xs font-semibold text-[#c0c1ff]">{item.username}</span>
                                  {isOverQuota ? (
                                    <span className="text-[10px] font-mono text-[#ffb4ab] flex items-center gap-1.5">
                                      <AlertTriangle className="w-3 h-3"/> Over Quota
                                    </span>
                                  ) : item.is_online ? (
                                    <span className="text-[10px] font-mono text-[#4edea3] flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span> Online ({item.total_process_count || 1} Proc)
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono text-[#908fa0] flex items-center gap-1.5">
                                      <Clock className="w-3 h-3"/> Idle
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 3. Role / Hak Akses */}
                              <td className="px-5 py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                                  isRiset
                                    ? 'bg-[#4cd7f6]/15 text-[#4cd7f6] border-[#4cd7f6]/30'
                                    : 'bg-[#c0c1ff]/15 text-[#c0c1ff] border-[#c0c1ff]/30'
                                }`}>
                                  {isRiset ? 'Riset Khusus' : 'Dosen Pengampu'}
                                </span>
                              </td>

                              {/* 4. QoS & Cgroup Slice */}
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col gap-0.5">
                                  <span className={`px-2 py-0.5 rounded border font-mono text-[9px] font-bold w-fit ${
                                    isRiset
                                      ? 'bg-[#4cd7f6]/20 text-[#4cd7f6] border-[#4cd7f6]/40'
                                      : 'bg-[#262a34] text-[#c7c4d7] border-[#46455440]'
                                  }`}>
                                    {isRiset ? 'Level 1 (Priority)' : 'Level 2 (Standard)'}
                                  </span>
                                  <span className="text-[10px] text-[#908fa0] font-mono">
                                    {isRiset ? 'compute-level1.slice' : 'compute-level2.slice'}
                                  </span>
                                </div>
                              </td>

                              {/* 5. Alokasi Hardware */}
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col gap-0.5 font-mono text-xs">
                                  <span className={isRiset ? 'text-[#4cd7f6] font-bold' : 'text-[#c7c4d7]'}>
                                    {isRiset ? 'GPU 0 (Dedicated)' : 'GPU 1 (Shared Pool)'}
                                  </span>
                                  <span className="text-[10px] text-[#908fa0]">
                                    {isRiset ? '20 Cores | 70GB RAM' : '2 Cores | 3GB RAM'}
                                  </span>
                                </div>
                              </td>

                              {/* 6. RAM & Quota */}
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col gap-1 w-28 font-mono">
                                  <div className="flex justify-between text-[10px]">
                                    <span className="text-[#908fa0]">{isRiset ? '70GB' : '3GB'}</span>
                                    <span className={item.ram_percent > 80 ? 'text-[#fbbf24] font-bold' : 'text-[#c7c4d7]'}>
                                      {item.ram_percent || 0}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-[#262a34] h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${item.ram_percent > 80 ? 'bg-[#fbbf24]' : isRiset ? 'bg-[#4cd7f6]' : 'bg-[#4edea3]'}`}
                                      style={{ width: `${Math.min(item.ram_percent || 0, 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>

                              {/* 7. Root Actions */}
                              <td className="px-5 py-3.5 text-right">
                                {isAdmin ? (
                                  <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                    {item.is_online && (
                                      <button
                                        onClick={() => onKillAllUser(item.username)}
                                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 text-xs font-mono transition-colors flex items-center gap-1.5"
                                        title="Hentikan seluruh sesi & proses akun ini"
                                      >
                                        <Ban className="w-3.5 h-3.5" /> Terminate
                                      </button>
                                    )}
                                    {adminRole === 'admin' && (
                                      <button
                                        onClick={() => setResetModal({ isOpen: true, username: item.username, newPassword: '', isSubmitting: false })}
                                        className="px-2 py-1 rounded-lg bg-[#c0c1ff]/15 text-[#c0c1ff] border border-[#c0c1ff]/30 hover:bg-[#c0c1ff]/25 text-xs font-mono transition-colors flex items-center gap-1"
                                        title={`Reset Password Linux akun ${item.username}`}
                                      >
                                        <KeyRound className="w-3.5 h-3.5" /> Reset Pass
                                      </button>
                                    )}
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
        {activeTab === 'audit' && (
          <AuditLogView logs={auditLogs} />
        )}
      </div>

      {/* Boost Modal (Super Admin Only) */}
      {boostModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-[#181b25] border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#46455430] flex items-center justify-between bg-[#0a0e17]/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4cd7f6]/10 flex items-center justify-center border border-[#4cd7f6]/20">
                  <Zap className="w-5 h-5 text-[#4cd7f6]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#dfe2ef]">Boost Resource Level 1</h3>
                  <p className="text-[11px] text-[#908fa0]">Alokasi 20 Cores, 70G RAM & GPU 0 Dedicated</p>
                </div>
              </div>
              <button
                onClick={() => setBoostModal({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' })}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1c1f29] border border-[#46455430] text-[#908fa0] hover:text-[#dfe2ef]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleBoost} className="p-5 space-y-4">
              <div>
                <p className="text-xs text-[#908fa0] mb-3">
                  Target: <span className="text-[#4cd7f6] font-mono font-bold">{boostModal.nim}</span> {boostModal.nama ? `(${boostModal.nama})` : ''}
                </p>
                <label className="block text-xs font-mono font-medium text-[#c7c4d7] mb-2 uppercase tracking-wider">Durasi Boost (Jam)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={boostModal.hours}
                  onChange={e => setBoostModal({...boostModal, hours: e.target.value})}
                  className="w-full bg-[#0a0e17] border border-[#46455430] rounded-xl p-2.5 text-sm font-mono text-[#dfe2ef] focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBoostModal({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' })}
                  className="px-4 py-2.5 rounded-xl bg-[#1c1f29] border border-[#46455430] text-xs font-semibold text-[#908fa0] hover:text-[#dfe2ef]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#4cd7f6]/20 text-[#4cd7f6] border border-[#4cd7f6]/40 hover:bg-[#4cd7f6]/30 flex items-center gap-2"
                >
                  <Zap className="w-4 h-4"/> Aktifkan Mode Level 1
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal (Local Linux Accounts: training1-10 & labriset) */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-[#181b25] border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#46455430] flex items-center justify-between bg-[#0a0e17]/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#c0c1ff]/10 flex items-center justify-center border border-[#c0c1ff]/20 text-[#c0c1ff]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#dfe2ef]">Reset Password Akun Linux</h3>
                  <p className="text-[11px] text-[#908fa0]">Kelola autentikasi akun PAM lokal server</p>
                </div>
              </div>
              <button
                onClick={() => setResetModal({ isOpen: false, username: '', newPassword: '', isSubmitting: false })}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1c1f29] border border-[#46455430] text-[#908fa0] hover:text-[#dfe2ef]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleResetPasswordSubmit} className="p-5 space-y-4">
              <div>
                <p className="text-xs text-[#908fa0] mb-3">
                  Target Akun: <span className="text-[#c0c1ff] font-mono font-bold">{resetModal.username}</span>
                </p>
                <label className="block text-xs font-mono font-medium text-[#c7c4d7] mb-2 uppercase tracking-wider">Password Baru</label>
                <input
                  type="password"
                  placeholder="Ketik password baru..."
                  value={resetModal.newPassword}
                  onChange={e => setResetModal({...resetModal, newPassword: e.target.value})}
                  className="w-full bg-[#0a0e17] border border-[#46455430] rounded-xl p-2.5 text-sm font-mono text-[#dfe2ef] focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModal({ isOpen: false, username: '', newPassword: '', isSubmitting: false })}
                  className="px-4 py-2.5 rounded-xl bg-[#1c1f29] border border-[#46455430] text-xs font-semibold text-[#908fa0] hover:text-[#dfe2ef]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetModal.isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center gap-2"
                >
                  <KeyRound className="w-4 h-4"/> {resetModal.isSubmitting ? 'Menyimpan...' : 'Perbarui Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
