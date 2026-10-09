import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, Zap, ShieldCheck, Search, CheckCircle2,
  AlertCircle, AlertTriangle, Clock, UserCheck, UserX, KeyRound, RefreshCw,
  Cpu, Trash2, X, HardDrive, Layers, Database, Server, Download, Eraser
} from 'lucide-react';

/* ── Live Countdown Timer Component ── */
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
  return <span className="text-neon-amber font-mono font-bold">{timeLeft || '...'}</span>;
};

export default function UnifiedUserManagement({
  isAdmin,
  adminRole,
  adminUser,
  students = [],
  systemUsers = [],
  onOpenKillModal,
  onResetPassword,
  onKillAllUser,
  fetchStudents,
  showToast
}) {
  const isSuperAdmin = Boolean(isAdmin && adminRole === 'admin');
  const isOperator   = Boolean(isAdmin && adminRole === 'aslab');

  const [filterType, setFilterType] = useState('all'); // 'all' | 'mhs' | 'dosen' | 'overquota'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('all'); // 'all' | '21' | '22' | '23' dll
  const [capacity, setCapacity] = useState({ used_slots: 0, total_slots: 1 });

  // Modals state
  const [boostModal, setBoostModal] = useState({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' });
  const [resetModal, setResetModal] = useState({ isOpen: false, username: '', newPassword: '', isSubmitting: false });

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
  });

  const handleClearCache = async (nim) => {
    if (!confirm(`Bersihkan cache disk (PIP & Checkpoints) untuk NIM ${nim}?`)) return;
    try {
      const res = await fetch('/api/users/clear-cache', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nim })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Cache NIM ${nim} berhasil dibersihkan.`, 'success');
        fetchStudents();
      } else {
        showToast(data.detail || 'Gagal membersihkan cache', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleExportCSV = () => {
    // Determine which data to export based on current view (unifiedList)
    const headers = ['NIM/Username', 'Nama', 'Tipe', 'Role', 'Status', 'Prioritas', 'Sisa Waktu Prioritas', 'Kuota Disk MB', 'IP Sesi Aktif'];
    const rows = filteredData.map(u => {
      const isSystem = u.type === 'system';
      const uname = isSystem ? u.username : u.nim;
      const nama = isSystem ? (u.username === 'labriset' ? 'Lab Riset / Dosen' : 'Pelatihan Dasar') : (u.nama || '');
      const role = isSystem ? 'System' : (u.role === 'admin' ? 'Super Admin' : u.role === 'aslab' ? 'Aslab' : 'Mahasiswa');
      const status = u.active_ip ? 'ONLINE' : (u.is_active ? 'OFFLINE' : 'BLOCKED');
      const prio = isSystem ? (u.username === 'labriset' ? 'Dedicated GPU 0' : 'Shared GPU 1') : (u.is_priority ? 'Prioritas' : 'Standar');
      const exp = u.priority_expires_at ? new Date(u.priority_expires_at).toLocaleString('id-ID') : '-';
      const disk = u.disk_usage_mb || 0;
      const ip = u.active_ip || '-';
      return [uname, `"${nama}"`, u.type, role, status, prio, `"${exp}"`, disk, ip].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Lab_AI_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fetch Admission Capacity
  const fetchCapacity = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats/capacity?_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        setCapacity(json);
      }
    } catch (e) {
      console.error('Fetch capacity error:', e);
    }
  }, []);

  useEffect(() => {
    fetchCapacity();
    const interval = setInterval(fetchCapacity, 10000);
    return () => clearInterval(interval);
  }, [fetchCapacity]);

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
        fetchCapacity();
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
        fetchCapacity();
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
        fetchCapacity();
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
        showToast(data.message || `Role NIM ${nim} diubah ke ${newRole.toUpperCase()}.`, 'success');
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

  // Combine Users & Deduplicate SIMTIK accounts with OS telemetry
  const unifiedList = useMemo(() => {
    const list = [];
    
    // 1. Pure System Users (labriset, training1-10, etc.)
    const pureSystemUsers = (systemUsers || []).filter(
      su => !(su?.username && su.username.startsWith('m') && /^\d+$/.test(su.username.slice(1)))
    );
    pureSystemUsers.forEach(su => {
      const isRiset = su.username === 'labriset';
      const diskQuotaGb = su.disk_quota_gb ?? (isRiset ? 50 : 10);
      const diskUsedMb = su.disk_used_mb ?? 0;
      const diskQuotaMb = diskQuotaGb * 1024;
      const diskPercent = su.disk_percent ?? (diskQuotaMb > 0 ? Math.round((diskUsedMb / diskQuotaMb) * 100) : 0);
      const isOverQuota = su.is_over_quota ?? (diskUsedMb > diskQuotaMb);
      list.push({
        ...su,
        type: 'system',
        disk_used_mb: diskUsedMb,
        disk_quota_gb: diskQuotaGb,
        disk_quota_mb: diskQuotaMb,
        disk_percent: diskPercent,
        is_over_quota: isOverQuota
      });
    });

    // 2. Map OS telemetry for students by NIM
    const studentTelemetryMap = new Map();
    (systemUsers || []).forEach(su => {
      if (su?.username && su.username.startsWith('m') && /^\d+$/.test(su.username.slice(1))) {
        const nim = String(su.username.slice(1));
        studentTelemetryMap.set(nim, su);
      }
    });

    // 3. Process SIMTIK students
    (students || []).forEach(st => {
      const nimStr = String(st.nim || '');
      const osUser = studentTelemetryMap.get(nimStr);
      const isOnline = Boolean(st.is_active && (osUser?.is_online || ((osUser?.total_process_count || 0) > 0)));
      const diskQuotaGb = st.disk_quota_gb ?? osUser?.disk_quota_gb ?? (st.is_priority ? 50 : 10);
      const diskUsedMb = st.disk_used_mb ?? osUser?.disk_used_mb ?? 0;
      const diskQuotaMb = diskQuotaGb * 1024;
      const diskPercent = st.disk_percent ?? (diskQuotaMb > 0 ? Math.round((diskUsedMb / diskQuotaMb) * 100) : 0);
      const isOverQuota = st.is_over_quota ?? (diskUsedMb > diskQuotaMb);
      list.push({
        ...st,
        nim: nimStr,
        type: 'student',
        is_online: isOnline,
        os_user: osUser || null,
        ram_used_mb: osUser?.ram_used_mb || 0,
        ram_max_mb: osUser?.ram_max_mb || (st.is_priority ? 71680 : 3072),
        vram_used_mb: osUser?.vram_used_mb || 0,
        cpu_percent: osUser?.cpu_percent || 0,
        active_ip: st.active_ip || osUser?.active_ip || null,
        processes: osUser?.processes || [],
        disk_used_mb: diskUsedMb,
        disk_quota_gb: diskQuotaGb,
        disk_quota_mb: diskQuotaMb,
        disk_percent: diskPercent,
        is_over_quota: isOverQuota
      });
    });

    return list;
  }, [systemUsers, students]);

  // Counts & Metrics
  const totalStudents = students?.length || 0;
  const pureSystemCount = useMemo(() => {
    return (systemUsers || []).filter(
      su => !(su?.username && su.username.startsWith('m') && /^\d+$/.test(su.username.slice(1)))
    ).length;
  }, [systemUsers]);

  const boostedStudents = students?.filter(s => s.is_priority)?.length || 0;
  const totalSlots = capacity?.total_slots || 1;
  const usedSlots = capacity?.used_slots || boostedStudents;
  const availableSlots = Math.max(0, totalSlots - usedSlots);
  const isSlotsFull = availableSlots <= 0;
  const slotUtilPct = totalSlots > 0 ? Math.min(100, Math.round((usedSlots / totalSlots) * 100)) : 0;

  const overQuotaCount = useMemo(() => unifiedList.filter(u => u.is_over_quota).length, [unifiedList]);

  // Filtered List
  const filteredData = useMemo(() => {
    return unifiedList.filter(item => {
      if (filterType === 'dosen' && item.type !== 'system') return false;
      if (filterType === 'mhs' && item.type !== 'student') return false;
      if (filterType === 'overquota' && !item.is_over_quota) return false;

      if (selectedCohort !== 'all' && item.type === 'student') {
        const nimStr = String(item.nim || '');
        if (!nimStr.startsWith(selectedCohort)) return false;
      }

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      if (item.type === 'system') {
        const uname = String(item.username || '').toLowerCase();
        const isRiset = item.username === 'labriset';
        const label = isRiset ? 'labriset dosen skripsi' : 'pelatihan training';
        return uname.includes(q) || label.includes(q);
      } else {
        const nimStr = String(item.nim || '').toLowerCase();
        const namaStr = String(item.nama || '').toLowerCase();
        const ipStr = String(item.active_ip || '').toLowerCase();
        return nimStr.includes(q) || namaStr.includes(q) || ipStr.includes(q);
      }
    });
  }, [unifiedList, filterType, searchQuery]);

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-[#fafafa] tracking-tight">
            Manajemen Pengguna Terpadu
          </h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Manajemen akun Linux OS, integrasi SSO SIMTIK, dan isolasi kuota komputasi
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-[#fafafa] transition-colors border border-[rgba(255,255,255,0.08)] text-xs font-medium"
              type="button"
            >
              <Download className="w-3.5 h-3.5 text-neon-emerald" />
              <span>Export CSV</span>
            </button>
          )}
          <button
            onClick={() => { fetchStudents(); fetchCapacity(); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-[#fafafa] transition-colors border border-[rgba(255,255,255,0.08)] text-xs font-medium"
            type="button"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Sinkronisasi SIMTIK</span>
          </button>
        </div>
      </div>

      {/* Operator Mode Banner (If logged in as Operator/Aslab) */}
      {isOperator && (
        <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-[rgba(14,165,233,0.1)] border border-[rgba(14,165,233,0.25)] text-[#38bdf8] text-xs font-mono">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>
            <strong>Mode Operator Aslab ({adminUser?.nama || 'Asisten'}):</strong> Akses monitoring dan penghentian sesi aktif.
          </span>
        </div>
      )}

      {/* 3 High-Density KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Card 1: Total Akun Terdaftar */}
        <div className="bg-[#111114] rounded-xl p-4 border border-[rgba(255,255,255,0.08)] flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="text-xs font-medium text-[#fafafa]">Total Akun Terdaftar</span>
              <p className="text-[11px] text-[#a1a1aa]">Tenant Directory</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#18181b] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#818cf8]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-baseline justify-between">
              <span className="font-mono tabular-nums text-2xl font-bold text-[#fafafa]">
                {unifiedList.length} <span className="text-[#71717a] text-xs font-normal">Akun</span>
              </span>
              <span className="font-mono text-[11px] text-[#818cf8] px-1.5 py-0.2 rounded bg-[#6366f1]/10 border border-[#6366f1]/20">
                SIMTIK & OS
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#18181b] overflow-hidden flex border border-[rgba(255,255,255,0.06)]">
              <div
                className="h-full bg-[#38bdf8]"
                style={{ width: `${Math.round((totalStudents / (unifiedList.length || 1)) * 100)}%` }}
              />
              <div
                className="h-full bg-[#818cf8]"
                style={{ width: `${Math.round((pureSystemCount / (unifiedList.length || 1)) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[#a1a1aa] font-mono text-[11px]">
              <span>{totalStudents} Mhs SIMTIK</span>
              <span>{pureSystemCount} Dosen & Lab</span>
            </div>
          </div>
        </div>

        {/* Card 2: Akun Riset & Prioritas Aktif */}
        <div className="bg-[#111114] rounded-xl p-4 border border-[rgba(255,255,255,0.08)] flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="text-xs font-medium text-[#fafafa]">Akun Riset & Prioritas</span>
              <p className="text-[11px] text-[#a1a1aa]">QoS Dedicated GPU</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#18181b] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#fbbf24]">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-baseline justify-between">
              <span className="font-mono tabular-nums text-2xl font-bold text-[#fbbf24]">
                {boostedStudents} <span className="text-[#71717a] text-xs font-normal">Akun</span>
              </span>
              <span className="font-mono text-[11px] text-[#34d399] px-1.5 py-0.2 rounded bg-[#10b981]/10 border border-[#10b981]/20">
                Level 1 QoS
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#18181b] overflow-hidden border border-[rgba(255,255,255,0.06)]">
              <div
                className="h-full bg-[#fbbf24]"
                style={{ width: `${slotUtilPct}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#a1a1aa]">
              <Layers className="w-3 h-3 text-[#38bdf8]" />
              <span className="truncate">Hak Akses Dedicated <code className="text-[#38bdf8]">compute-level1</code></span>
            </div>
          </div>
        </div>

        {/* Card 3: Peringatan Storage (Over Quota) */}
        <div className="bg-[#111114] rounded-xl p-4 border border-[rgba(255,255,255,0.08)] flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="text-xs font-medium text-[#fafafa]">Peringatan Storage</span>
              <p className="text-[11px] text-[#a1a1aa]">Disk Limit Policy</p>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              overQuotaCount > 0
                ? 'bg-[rgba(244,63,94,0.12)] text-[#fb7185] border-[rgba(244,63,94,0.25)]'
                : 'bg-[#18181b] text-[#34d399] border-[rgba(255,255,255,0.08)]'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-baseline justify-between">
              <span className={`font-mono tabular-nums text-2xl font-bold ${overQuotaCount > 0 ? 'text-[#fb7185]' : 'text-[#fafafa]'}`}>
                {overQuotaCount} <span className="text-[#71717a] text-xs font-normal">Akun</span>
              </span>
              {overQuotaCount > 0 ? (
                <span className="font-mono text-[11px] text-[#fb7185] bg-[rgba(244,63,94,0.12)] px-1.5 py-0.2 rounded border border-[rgba(244,63,94,0.25)]">
                  Over Quota
                </span>
              ) : (
                <span className="font-mono text-[11px] text-[#34d399] bg-[#10b981]/10 px-1.5 py-0.2 rounded border border-[#10b981]/20">
                  Normal
                </span>
              )}
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#18181b] overflow-hidden border border-[rgba(255,255,255,0.06)]">
              <div
                className={`h-full ${overQuotaCount > 0 ? 'bg-[#f43f5e]' : 'bg-[#10b981]'}`}
                style={{ width: overQuotaCount > 0 ? '100%' : '15%' }}
              />
            </div>
            <div className={`flex items-center gap-1.5 text-[11px] font-mono ${overQuotaCount > 0 ? 'text-[#fb7185]' : 'text-[#a1a1aa]'}`}>
              <HardDrive className="w-3 h-3" />
              <span>{overQuotaCount > 0 ? 'Batas soft quota terlampaui' : 'Semua kuota aman terisolasi'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar & Search Module */}
      <div className="bg-[#111114] rounded-xl p-3 border border-[rgba(255,255,255,0.08)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Segmented Controls */}
        <div className="flex flex-wrap items-center gap-1 bg-[#18181b] p-1 rounded-lg border border-[rgba(255,255,255,0.06)] font-mono text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterType === 'all'
                ? 'bg-[#27272a] text-[#fafafa] font-semibold border border-[rgba(255,255,255,0.12)]'
                : 'text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
            type="button"
          >
            Semua ({unifiedList.length})
          </button>
          <button
            onClick={() => setFilterType('mhs')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterType === 'mhs'
                ? 'bg-[#27272a] text-[#fafafa] font-semibold border border-[rgba(255,255,255,0.12)]'
                : 'text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
            type="button"
          >
            Mahasiswa ({totalStudents})
          </button>
          <button
            onClick={() => setFilterType('dosen')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterType === 'dosen'
                ? 'bg-[#27272a] text-[#fafafa] font-semibold border border-[rgba(255,255,255,0.12)]'
                : 'text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
            type="button"
          >
            Dosen & Riset ({pureSystemCount})
          </button>
          <button
            onClick={() => setFilterType('overquota')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterType === 'overquota'
                ? 'bg-[#27272a] text-[#fb7185] font-semibold border border-[rgba(244,63,94,0.3)]'
                : 'text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
            type="button"
          >
            Over Quota ({overQuotaCount})
          </button>
        </div>

        {/* Cohort & Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCohort}
            onChange={(e) => setSelectedCohort(e.target.value)}
            className="bg-[#18181b] border border-[rgba(255,255,255,0.08)] text-[#fafafa] text-xs font-mono rounded-md py-1 px-2 focus:outline-none focus:border-[#38bdf8] transition-colors"
          >
            <option value="all">Semua Angkatan</option>
            <option value="20">Angkatan 2020</option>
            <option value="21">Angkatan 2021</option>
            <option value="22">Angkatan 2022</option>
            <option value="23">Angkatan 2023</option>
            <option value="24">Angkatan 2024</option>
          </select>

          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#71717a]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari NIM, nama, atau IP…"
              className="w-full bg-[#18181b] border border-[rgba(255,255,255,0.08)] focus:border-[#38bdf8] rounded-md py-1 pl-8 pr-3 text-xs font-mono text-[#fafafa] placeholder:text-[#71717a] outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Precision 8-Column Data Table Container */}
      <div className="bg-surface-container-low rounded-xl shadow-sm overflow-hidden border border-border-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1240px]">
            <thead>
              <tr className="bg-surface-1 text-text-muted  font-mono text-xs  border-b border-border-subtle">
                <th className="py-3 px-5" scope="col">Akun & Pengguna</th>
                <th className="py-3 px-4" scope="col">Identitas & Status</th>
                <th className="py-3 px-4" scope="col">Role / Hak Akses</th>
                <th className="py-3 px-4" scope="col">QoS & Cgroup Slice</th>
                <th className="py-3 px-4" scope="col">Alokasi Hardware & Timer</th>
                <th className="py-3 px-4" scope="col">Penggunaan RAM</th>
                <th className="py-3 px-4" scope="col">Storage & Quota</th>
                <th className="py-3 px-5 text-right" scope="col">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-text-muted text-xs font-mono">
                    Tidak ada akun yang sesuai dengan filter atau kata kunci pencarian.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  if (item.type === 'student') {
                    const ramMaxMb = item.is_priority ? 71680 : 3072;
                    const ramUsedGb = ((item.ram_used_mb || 0) / 1024).toFixed(1);
                    const ramMaxGb = (ramMaxMb / 1024).toFixed(0);
                    const ramPct = item.is_online ? Math.min(100, Math.round(((item.ram_used_mb || 0) / ramMaxMb) * 100)) : 0;
                    const userRole = item.role || (item.is_admin ? 'admin' : 'mahasiswa');

                    const diskUsedGb = ((item.disk_used_mb || 0) / 1024).toFixed(1);
                    const diskQuotaGb = item.disk_quota_gb || (item.is_priority ? 50 : 10);
                    const diskPct = Math.min(100, Math.round(((item.disk_used_mb || 0) / (diskQuotaGb * 1024)) * 100));

                    const initials = item.nama
                      ? (item.nama.trim().split(/\s+/).map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'M')
                      : String(item.nim || 'M').slice(-2).toUpperCase();

                    return (
                      <tr
                        key={`std-${item.nim}`}
                        className={`hover:bg-surface-3/80 transition-colors group ${
                          item.is_priority ? 'bg-surface-container-low/60' : 'bg-surface-container-low/20'
                        }`}
                      >
                        {/* 1. Akun & Pengguna */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-md flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                              item.is_priority
                                ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40'
                                : 'bg-secondary-container text-secondary-fixed'
                            }`}>
                              {initials}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-xs text-text-primary truncate">
                                {item.nama || 'Mahasiswa SIMTIK'}
                              </span>
                              <span className="font-mono text-xs text-text-muted truncate">
                                mhs.{item.nim}@umpo.ac.id
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Identitas & Status */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-xs text-neon-cyan font-bold tracking-tight">
                              {item.nim}
                            </span>
                            {item.is_active ? (
                              item.is_online ? (
                                <div className="flex items-center gap-1.5 font-mono text-xs">
                                  <span className="w-1.5 h-1.5 rounded-md bg-neon-emerald animate-pulse"></span>
                                  <span className="text-neon-emerald font-semibold">Online</span>
                                  {item.active_ip && (
                                    <span className="text-outline text-[9px]">({item.active_ip})</span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 font-mono text-xs text-text-muted">
                                  <span className="w-1.5 h-1.5 rounded-md bg-outline"></span>
                                  <span>⚪ Offline</span>
                                </div>
                              )
                            ) : (
                              <div className="flex items-center gap-1.5 font-mono text-xs text-neon-rose font-semibold">
                                <span className="w-1.5 h-1.5 rounded-md bg-neon-rose"></span>
                                <span> Blocked</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 3. Role / Hak Akses */}
                        <td className="py-3.5 px-4">
                          {isSuperAdmin ? (
                            <select
                              value={userRole}
                              onChange={(e) => handleSetRole(item.nim, e.target.value)}
                              className="bg-surface-2 text-text-primary text-sm font-mono rounded px-2 py-1 focus:outline-none border border-border-base cursor-pointer hover:bg-surface-3 transition-colors"
                            >
                              <option value="mahasiswa">Mahasiswa</option>
                              <option value="aslab">Aslab</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-xs font-mono  font-semibold ${
                              userRole === 'admin'
                                ? 'bg-secondary-container text-secondary-fixed'
                                : userRole === 'aslab'
                                ? 'bg-neon-cyan/20 text-neon-cyan'
                                : 'bg-surface-2 text-on-surface-variant'
                            }`}>
                              {userRole}
                            </span>
                          )}
                        </td>

                        {/* 4. QoS & Cgroup Slice */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5">
                            {item.is_priority ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-container/20 text-neon-cyan w-fit shadow-sm border border-neon-cyan/20">
                                <Zap className="w-3 h-3 text-neon-cyan" />
                                <span className="font-mono text-xs font-semibold">Level 1 (Priority)</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-variant text-on-surface-variant w-fit">
                                <span className="font-mono text-xs">Level 2 (Standard)</span>
                              </div>
                            )}
                            <span className="font-mono text-xs text-outline mt-0.5">
                              {item.is_priority ? 'compute-level1.slice' : 'compute-level2.slice'}
                            </span>
                          </div>
                        </td>

                        {/* 5. Alokasi Hardware & Timer */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-xs text-text-primary font-medium">
                              {item.is_priority ? 'GPU 0 (Dedicated) | 20 Cores | 70GB' : 'GPU 1 (Shared Pool) | 2 Cores | 3GB'}
                            </span>
                            {item.is_priority && item.priority_expires_at ? (
                              <div className="inline-flex items-center gap-1 text-neon-amber font-mono text-sm font-bold">
                                <Clock className="w-3 h-3" />
                                <span>Sisa: <LiveCountdown expiresAt={item.priority_expires_at} /></span>
                              </div>
                            ) : (
                              <span className="font-mono text-xs text-outline">
                                {item.is_online ? 'Fair-share FairQ active' : 'Tidak ada proses aktif'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Penggunaan RAM */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 w-28">
                            <div className="flex justify-between font-mono text-xs">
                              <span className="text-text-primary font-semibold">{ramUsedGb} GB</span>
                              <span className="text-outline">/ {ramMaxGb} GB</span>
                            </div>
                            <div className="w-full h-1.5 rounded-md bg-surface-variant overflow-hidden">
                              <div
                                className={`h-full rounded-md transition-all duration-300 ${
                                  ramPct >= 85 ? 'bg-neon-rose' : ramPct >= 60 ? 'bg-neon-amber' : 'bg-neon-cyan'
                                }`}
                                style={{ width: `${ramPct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* 7. Storage & Quota */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 w-32">
                            <div className="flex justify-between font-mono text-xs">
                              <span className={`font-semibold ${item.is_over_quota ? 'text-neon-rose' : 'text-text-primary'}`}>
                                {diskUsedGb} GB
                              </span>
                              <span className="text-outline">/ {diskQuotaGb} GB</span>
                            </div>
                            <div className="w-full h-1.5 rounded-md bg-surface-variant overflow-hidden">
                              <div
                                className={`h-full rounded-md transition-all duration-300 ${
                                  item.is_over_quota
                                    ? 'bg-neon-rose shadow-[0_0_8px_rgba(255,180,171,0.8)]'
                                    : diskPct >= 80
                                    ? 'bg-neon-amber'
                                    : 'bg-neon-cyan'
                                }`}
                                style={{ width: `${diskPct}%` }}
                              />
                            </div>
                            {item.is_over_quota ? (
                              <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-error-container/30 text-neon-rose font-mono text-[9px] w-fit font-bold">
                                <span>⚠️ Over Quota</span>
                              </div>
                            ) : (
                              <span className="font-mono text-[9px] text-neon-emerald">
                                Normal ({diskPct}%)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 8. Aksi Manajemen */}
                        <td className="py-3.5 px-5 text-right">
                          {!isAdmin ? (
                            <span className="font-mono text-xs text-outline">// READ_ONLY</span>
                          ) : (
                            <div className="inline-flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                              {isSuperAdmin && (
                                item.is_priority ? (
                                  <button
                                    onClick={() => handleUnboost(item.nim)}
                                    className="px-2 py-1 rounded bg-secondary-container/40 text-neon-amber hover:bg-secondary-container transition-colors text-xs font-mono font-semibold"
                                    title="Kembalikan ke Level 2 Standard"
                                    type="button"
                                  >
                                    ↺ Revert
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setBoostModal({ isOpen: true, nim: item.nim, nama: item.nama || '', hours: 4, reason: '' })}
                                    disabled={isSlotsFull}
                                    className="px-2 py-1 rounded bg-primary-container text-on-primary-container hover:bg-neon-cyan transition-colors text-xs font-mono font-bold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                    title={isSlotsFull ? 'Slot Prioritas GPU 0 Penuh' : 'Boost ke Level 1 Dedicated'}
                                    type="button"
                                  >
                                    ⚡ Boost
                                  </button>
                                )
                              )}

                              {/* Kill Sesi (Available for Operator Aslab and Admin) */}
                              <button
                                onClick={() => onKillAllUser(`m${item.nim}`)}
                                disabled={!item.is_online}
                                className="p-1 rounded bg-error-container/20 text-neon-rose hover:bg-error-container/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Kill Sesi OS Aktif"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                              </button>

                              {/* Super Admin Advanced Actions */}
                              {isSuperAdmin && (
                                <>
                                  <button
                                    onClick={() => handleClearCache(item.nim)}
                                    className="p-1 rounded bg-surface-2 text-on-surface-variant hover:text-neon-amber hover:bg-surface-3 transition-colors"
                                    title="Bersihkan Cache Disk"
                                    type="button"
                                  >
                                    <Eraser className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setResetModal({ isOpen: true, username: `m${item.nim}`, newPassword: '', isSubmitting: false })}
                                    className="p-1 rounded bg-surface-2 text-on-surface-variant hover:text-text-primary hover:bg-surface-3 transition-colors"
                                    title="Reset Password Linux"
                                    type="button"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleActive(item.nim)}
                                    className="p-1 rounded bg-surface-2 text-on-surface-variant hover:text-neon-rose hover:bg-surface-3 transition-colors"
                                    title={item.is_active ? 'Blokir Akun' : 'Aktifkan Akun'}
                                    type="button"
                                  >
                                    {item.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5 text-neon-emerald" />}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(item.nim)}
                                    className="p-1 rounded bg-surface-2 text-on-surface-variant hover:text-neon-rose hover:bg-surface-3 transition-colors"
                                    title="Hapus Akun Permanen"
                                    type="button"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  // System Users (training1-10, labriset)
                  const isRiset = item.username === 'labriset';
                  const isOnline = item.is_online || (item.total_process_count > 0);
                  const ramMaxMb = isRiset ? 71680 : 3072;
                  const ramUsedGb = ((item.ram_used_mb || 0) / 1024).toFixed(1);
                  const ramMaxGb = (ramMaxMb / 1024).toFixed(0);
                  const ramPct = isOnline ? Math.min(100, Math.round(((item.ram_used_mb || 0) / ramMaxMb) * 100)) : 0;

                  const diskUsedGb = ((item.disk_used_mb || 0) / 1024).toFixed(1);
                  const diskQuotaGb = item.disk_quota_gb || (isRiset ? 50 : 10);
                  const diskPct = Math.min(100, Math.round(((item.disk_used_mb || 0) / (diskQuotaGb * 1024)) * 100));

                  return (
                    <tr
                      key={`sys-${item.username}`}
                      className="hover:bg-surface-3/80 transition-colors bg-surface-container-low/30 group"
                    >
                      {/* 1. Akun & Pengguna */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border ${
                            isRiset
                              ? 'bg-primary-container/20 text-neon-cyan border-neon-cyan/30'
                              : 'bg-secondary-container/40 text-secondary-fixed border-secondary/30'
                          }`}>
                            {isRiset ? <Database className="w-4 h-4" /> : <Server className="w-4 h-4" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs text-text-primary truncate flex items-center gap-2">
                              {item.username}
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold  border ${
                                isRiset
                                  ? 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30'
                                  : 'bg-secondary-container text-secondary-fixed border-secondary/30'
                              }`}>
                                {isRiset ? 'RISET & SKRIPSI' : 'DOSEN / PELATIHAN'}
                              </span>
                            </span>
                            <span className="font-mono text-xs text-text-muted truncate">
                              {isRiset ? 'Akun Riset & Skripsi Mahasiswa/Dosen' : 'Akun Dosen & Pelatihan Praktikum'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Identitas & Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs text-outline font-bold tracking-tight">
                            {item.username}
                          </span>
                          {isOnline ? (
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              <span className="w-1.5 h-1.5 rounded-md bg-neon-emerald animate-pulse"></span>
                              <span className="text-neon-emerald font-semibold">Online</span>
                              <span className="text-outline text-[9px]">({item.active_ip || '127.0.0.1'})</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 font-mono text-xs text-text-muted">
                              <span className="w-1.5 h-1.5 rounded-md bg-outline"></span>
                              <span>⚪ Offline</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. Role / Hak Akses */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono  font-semibold ${
                          isRiset
                            ? 'bg-secondary-container text-secondary-fixed'
                            : 'bg-surface-2 text-on-surface-variant'
                        }`}>
                          {isRiset ? 'Dosen Riset' : 'Batch Service'}
                        </span>
                      </td>

                      {/* 4. QoS & Cgroup Slice */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          {isRiset ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-container/20 text-neon-cyan w-fit shadow-sm border border-neon-cyan/20">
                              <Zap className="w-3 h-3 text-neon-cyan" />
                              <span className="font-mono text-xs font-semibold">Level 1 (Priority)</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-variant text-on-surface-variant w-fit">
                              <span className="font-mono text-xs">Level 2 (Standard)</span>
                            </div>
                          )}
                          <span className="font-mono text-xs text-outline mt-0.5">
                            {isRiset ? 'compute-level1.slice' : 'compute-level2.slice'}
                          </span>
                        </div>
                      </td>

                      {/* 5. Alokasi Hardware & Timer */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs text-text-primary font-medium">
                            {isRiset ? 'GPU 0 (Dedicated) | 20 Cores | 70GB' : 'GPU 1 (Shared Pool) | 2 Cores | 3GB'}
                          </span>
                          <span className="font-mono text-xs text-outline">
                            {isRiset ? 'Riset Dosen Tetap' : 'Batch Job Pipeline'}
                          </span>
                        </div>
                      </td>

                      {/* 6. Penggunaan RAM */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 w-28">
                          <div className="flex justify-between font-mono text-xs">
                            <span className="text-text-primary font-semibold">{ramUsedGb} GB</span>
                            <span className="text-outline">/ {ramMaxGb} GB</span>
                          </div>
                          <div className="w-full h-1.5 rounded-md bg-surface-variant overflow-hidden">
                            <div
                              className={`h-full rounded-md transition-all duration-300 ${
                                ramPct >= 85 ? 'bg-neon-rose' : 'bg-neon-cyan'
                              }`}
                              style={{ width: `${ramPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 7. Storage & Quota */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 w-32">
                          <div className="flex justify-between font-mono text-xs">
                            <span className={`font-semibold ${item.is_over_quota ? 'text-neon-rose' : 'text-text-primary'}`}>
                              {diskUsedGb} GB
                            </span>
                            <span className="text-outline">/ {diskQuotaGb} GB</span>
                          </div>
                          <div className="w-full h-1.5 rounded-md bg-surface-variant overflow-hidden">
                            <div
                              className={`h-full rounded-md transition-all duration-300 ${
                                item.is_over_quota
                                  ? 'bg-neon-rose shadow-[0_0_8px_rgba(255,180,171,0.8)]'
                                  : 'bg-neon-cyan'
                              }`}
                              style={{ width: `${diskPct}%` }}
                            />
                          </div>
                          {item.is_over_quota ? (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-error-container/30 text-neon-rose font-mono text-[9px] w-fit font-bold">
                              <span>⚠️ Over Quota</span>
                            </div>
                          ) : (
                            <span className="font-mono text-[9px] text-neon-emerald">
                              Normal ({diskPct}%)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 8. Aksi Manajemen */}
                      <td className="py-3.5 px-5 text-right">
                        {!isAdmin ? (
                          <span className="font-mono text-xs text-outline">// SYSTEM_PROTECTED</span>
                        ) : (
                          <div className="inline-flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onKillAllUser(item.username)}
                              disabled={!isOnline}
                              className="p-1 rounded bg-error-container/20 text-neon-rose hover:bg-error-container/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Kill Seluruh Proses Akun"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                            </button>
                            {isSuperAdmin && (
                              <button
                                onClick={() => setResetModal({ isOpen: true, username: item.username, newPassword: '', isSubmitting: false })}
                                className="p-1 rounded bg-surface-2 text-on-surface-variant hover:text-text-primary hover:bg-surface-3 transition-colors"
                                title="Reset Password Akun Sistem"
                                type="button"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
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

      {/* Boost QoS Modal */}
      {boostModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-[#0f131c]/80  flex items-center justify-center p-4">
          <div className="bg-[#181b25] border border-[#46455440] rounded-xl shadow-sm p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-neon-cyan/20 border border-neon-cyan/40 flex items-center justify-center text-neon-cyan">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#dfe2ef]">Boost Akses ke GPU 0 (Level 1)</h3>
                  <p className="text-xs text-[#908fa0] font-mono">NIM: {boostModal.nim} ({boostModal.nama})</p>
                </div>
              </div>
              <button
                onClick={() => setBoostModal({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' })}
                className="text-text-muted hover:text-on-surface p-1"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBoost} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-mono text-text-muted mb-2">
                  Durasi Hak Akses Dedicated GPU 0:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 4, 8, 12, 24].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setBoostModal(prev => ({ ...prev, hours: h }))}
                      className={`py-2 rounded-lg text-xs font-mono transition-all border ${
                        boostModal.hours === h
                          ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan font-bold shadow-sm'
                          : 'bg-surface-3 border-border-base text-text-muted hover:text-on-surface'
                      }`}
                    >
                      {h} Jam
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5">
                  Alasan / Keterangan Boost:
                </label>
                <input
                  type="text"
                  placeholder="Misal: Training Model Skripsi ResNet-50"
                  value={boostModal.reason}
                  onChange={(e) => setBoostModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full bg-surface-3 rounded-lg px-3 py-2 text-xs font-mono text-text-primary border border-border-base focus:outline-none focus:border-neon-cyan"
                />
              </div>

              <div className="p-3 rounded-lg bg-surface-container text-xs font-mono text-text-muted border border-border-subtle flex flex-col gap-1">
                <span className="text-neon-cyan font-semibold">Benefit Level 1 QoS:</span>
                <span>• Akses Dedicated GPU 0 (Direct VRAM Mapping)</span>
                <span>• Jatah RAM Host ditingkatkan hingga 70 GB (Cgroup isolated)</span>
                <span>• Prioritas CPU Scheduler CFS 20 Cores</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBoostModal({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' })}
                  className="flex-1 py-2 rounded-lg bg-surface-3 hover:bg-surface-2 text-text-muted hover:text-on-surface font-mono text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-neon-cyan hover:bg-primary-fixed text-on-primary font-mono text-xs font-bold transition-colors shadow-sm"
                >
                  Konfirmasi Boost
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Linux Password Modal */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-[#0f131c]/80  flex items-center justify-center p-4">
          <div className="bg-[#181b25] border border-[#46455440] rounded-xl shadow-sm p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-secondary-container flex items-center justify-center text-secondary-fixed">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#dfe2ef]">Reset Password Linux OS</h3>
                  <p className="text-xs text-[#908fa0] font-mono">User: {resetModal.username}</p>
                </div>
              </div>
              <button
                onClick={() => setResetModal({ isOpen: false, username: '', newPassword: '', isSubmitting: false })}
                className="text-text-muted hover:text-on-surface p-1"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5">
                  Password Linux Baru:
                </label>
                <input
                  type="password"
                  placeholder="Masukkan password baru..."
                  value={resetModal.newPassword}
                  onChange={(e) => setResetModal(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  className="w-full bg-surface-3 rounded-lg px-3 py-2 text-xs font-mono text-text-primary border border-border-base focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModal({ isOpen: false, username: '', newPassword: '', isSubmitting: false })}
                  className="flex-1 py-2 rounded-lg bg-surface-3 hover:bg-surface-2 text-text-muted hover:text-on-surface font-mono text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetModal.isSubmitting}
                  className="flex-1 py-2 rounded-lg bg-secondary hover:bg-secondary-fixed text-surface-dim font-mono text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {resetModal.isSubmitting ? 'Memproses...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
