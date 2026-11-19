import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, Zap, ShieldCheck, Search,
  AlertTriangle, Clock, UserCheck, UserX, KeyRound, RefreshCw,
  Cpu, Trash2, X, HardDrive, Layers, Database, Server, Download, Eraser,
  Edit2, Square
} from 'lucide-react';

/* ── Live Countdown Timer Component ── */
const LiveCountdown = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!expiresAt) return;
    const cleanDate = typeof expiresAt === 'string' ? expiresAt.replace(' ', 'T') : expiresAt;
    const targetDate = new Date(cleanDate);
    const target = targetDate.getTime();
    if (isNaN(target)) {
      setTimeLeft('—');
      return;
    }
    if (targetDate.getFullYear() >= 2090) {
      setTimeLeft('∞ Unlimited');
      return;
    }
    const updateCountdown = () => {
      const now = new Date().getTime();
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
  return <span className="text-amber-700 font-mono font-bold tabular-nums">{timeLeft || '...'}</span>;
};

export default function UnifiedUserManagement({
  isAdmin,
  adminRole,
  adminUser,
  students = [],
  systemUsers = [],
  gpus = [],
  level2Slots = {},
  _onOpenKillModal,
  onResetPassword,
  onKillAllUser,
  fetchStudents,
  showToast
}) {
  const isSuperAdmin = Boolean(isAdmin && adminRole === 'admin');
  const isOperator   = Boolean(isAdmin && adminRole === 'aslab');
  const l2HardwareLabel = 'CPU Only | 1 Core | 1.5 GB';

  const [filterType, setFilterType] = useState('all'); // 'all' | 'mhs' | 'dosen' | 'overquota'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('all'); // 'all' | '21' | '22' | '23' dll
  const [capacity, setCapacity] = useState({ used_slots: 0, total_slots: 1 });

  const gpuBoostMax = Number(level2Slots?.gpu_boost_max ?? capacity?.gpu_boost?.total_slots ?? 3);
  const gpuBoostAllowed = level2Slots?.gpu_boost_allowed ?? capacity?.gpu_boost_allowed ?? (capacity?.lab_mode !== 'cpu60');
  const gpuBoostEnabled = Boolean(level2Slots?.gpu_boost_enabled ?? capacity?.gpu_boost?.enabled ?? true) && gpuBoostAllowed;
  const gpuBoostVramMb = Number(level2Slots?.gpu_boost_vram_mb ?? capacity?.gpu_boost?.vram_mb ?? 4800);

  // Map per-user GPU telemetry (GPU index, VRAM used, VRAM total, active processes)
  const userGpuMap = useMemo(() => {
    const map = {};
    (gpus || []).forEach(gpu => {
      const gpuIdx = gpu.index ?? 0;
      const totalMb = gpu.vram_total_mb || gpu.memory?.total_mb || 16384;
      (gpu.processes || []).forEach(proc => {
        const u = proc.username || '';
        if (!u) return;
        if (!map[u]) {
          map[u] = {
            vramMb: 0,
            gpuIndex: gpuIdx,
            gpuTotalMb: totalMb,
            processCount: 0,
            processes: []
          };
        }
        map[u].vramMb += (proc.vram_mb || proc.gpu_mem_mb || 0);
        map[u].processCount += 1;
        map[u].processes.push(proc);
      });
    });
    return map;
  }, [gpus]);

  // Helper render 3D tactile mini-bar for per-user GPU/VRAM load
  const renderGpuVramCell = (item) => {
    const isRisetUser = item.type === 'system' && item.username === 'labriset';
    const hasGpu = Boolean(item.is_priority || isRisetUser || item.gpu_boost_active);
    if (!hasGpu) {
      return (
        <div className="flex flex-col gap-0.5 w-32">
          <div className="flex items-center gap-1.5 font-mono text-xs text-[#64748B]">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            <span className="text-[#64748B] font-medium">CPU only</span>
          </div>
          <span className="font-mono text-[10px] text-[#64748B]">
            GPU tidak dialokasikan
          </span>
        </div>
      );
    }

    const vramMb = item.vram_used_mb || 0;
    const gpuIdx = item.gpu_index ?? (item.is_priority || isRisetUser ? 0 : 1);
    const gpuTotalMb = item.gpu_total_mb || 16384;
    const vramUsedGb = (vramMb / 1024).toFixed(1);
    const vramTotalGb = (gpuTotalMb / 1024).toFixed(0);
    const vramPct = gpuTotalMb > 0 ? Math.min(100, Math.round((vramMb / gpuTotalMb) * 100)) : 0;
    const procCount = item.gpu_process_count || 0;
    const procs = item.gpu_processes || [];
    const procTitle = procs.length > 0
      ? procs.map(p => `PID ${p.pid}: ${p.name || 'process'} (${Math.round(p.vram_mb || 0)} MB)`).join('\n')
      : '';

    if (vramMb > 0) {
      return (
        <div className="flex flex-col gap-1 w-32" title={procTitle || undefined}>
          <div className="flex justify-between items-center font-mono text-xs">
            <span className="font-bold text-[#0F172A] flex items-center gap-1">
              <span className={`px-1 py-0.2 rounded border text-[9px] font-bold ${
                gpuIdx === 0
                  ? 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0]'
                  : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0]'
              }`}>
                GPU {gpuIdx}
              </span>
              <span>{vramUsedGb} GB</span>
            </span>
            <span className="text-[#64748B] text-[11px]">/ {vramTotalGb} GB</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden border border-[#E2E8F0]/50 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                vramPct >= 50
                  ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]'
                  : vramPct >= 25
                  ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]'
                  : 'bg-sky-500 shadow-[0_0_6px_rgba(59,130,246,0.3)]'
              }`}
              style={{ width: `${Math.max(vramPct, 3)}%` }}
            />
          </div>
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className={`font-semibold ${
              vramPct >= 50 ? 'text-[#C53030]' : vramPct >= 25 ? 'text-[#B45309]' : 'text-[#0F172A]'
            }`}>
              {vramPct}% VRAM
            </span>
            {procCount > 0 && (
              <span className="text-[#64748B] text-[9px]">
                {procCount} {procCount === 1 ? 'proc' : 'procs'}
              </span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-0.5 w-32">
        <div className="flex items-center gap-1.5 font-mono text-xs text-[#64748B]">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
          <span className="text-[#64748B] font-medium">Idle (0 MB)</span>
        </div>
        <span className="font-mono text-[10px] text-[#64748B]">
          GPU {gpuIdx} · Standby
        </span>
      </div>
    );
  };

  // Modals state
  const [boostModal, setBoostModal] = useState({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' });
  const [gpuBoostModal, setGpuBoostModal] = useState({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' });
  const [resetModal, setResetModal] = useState({ isOpen: false, username: '', newPassword: '', isSubmitting: false });
  const [editNameModal, setEditNameModal] = useState({ isOpen: false, nim: null, currentName: '', newName: '', isSubmitting: false });

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
  });





  const handleClearCache = async (nim) => {
    if (!confirm(`Bersihkan cache disk untuk NIM ${nim}?\n\n• Cache PIP, Torch, dan HuggingFace\n• Checkpoint notebook (.ipynb_checkpoints)\n• Berkas sementara di ~/.tmp yang lebih dari 1 hari\n\nSesi notebook yang sedang berjalan tidak akan dihentikan.`)) return;
    try {
      const res = await fetch('/api/users/clear-cache', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nim })
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => '');
        data = { detail: text || `Server HTTP Error ${res.status}` };
      }
      if (res.ok && data.success) {
        showToast(data.message || `Cache NIM ${nim} berhasil dibersihkan.`, 'success');
        fetchStudents();
      } else {
        showToast(data.detail || data.message || 'Gagal membersihkan cache', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleExportCSV = () => {
    // Determine which data to export based on current view (unifiedList)
    const headers = ['NIM/Username', 'Nama', 'Tipe', 'Role', 'Status', 'Prioritas', 'Sisa Waktu Prioritas', 'GPU Boost', 'GPU', 'VRAM MB', 'Persen VRAM', 'RAM MB', 'Kuota Disk MB', 'IP Sesi Aktif'];
    const rows = filteredData.map(u => {
      const isSystem = u.type === 'system';
      const uname = isSystem ? u.username : u.nim;
      const nama = isSystem ? (u.username === 'labriset' ? 'Lab Riset / Dosen' : 'Pelatihan Dasar') : (u.nama || '');
      const role = isSystem ? 'System' : (u.role === 'admin' ? 'Super Admin' : u.role === 'aslab' ? 'Aslab' : 'Mahasiswa');
      const status = u.active_ip ? 'ONLINE' : (u.is_active ? 'OFFLINE' : 'BLOCKED');
      const prio = isSystem ? (u.username === 'labriset' ? 'Dedicated GPU 0' : 'Level 2 CPU-only') : (u.is_priority ? 'Level 1' : 'Level 2');
      const exp = u.priority_expires_at ? new Date(u.priority_expires_at).toLocaleString('id-ID') : '-';
      const boost = u.gpu_boost_active
        ? (u.gpu_boost_expires_at
            ? (new Date(u.gpu_boost_expires_at).getFullYear() >= 2090
                ? 'Aktif (Unlimited)'
                : `Aktif s.d. ${new Date(u.gpu_boost_expires_at).toLocaleString('id-ID')}`)
            : 'Aktif')
        : '-';
      const hasGpu = Boolean(u.is_priority || (isSystem && u.username === 'labriset') || u.gpu_boost_active);
      const gpuIdx = u.gpu_index ?? (u.is_priority || (isSystem && u.username === 'labriset') ? 0 : (u.gpu_boost_active ? 1 : null));
      const vramMb = u.vram_used_mb || 0;
      const vramPct = `${u.vram_percent || 0}%`;
      const ram = u.ram_used_mb || 0;
      const disk = u.disk_used_mb || u.disk_usage_mb || 0;
      const ip = u.active_ip || '-';
      return [uname, `"${nama}"`, u.type, role, status, prio, `"${exp}"`, `"${boost}"`, hasGpu ? `GPU ${gpuIdx}` : 'CPU only', vramMb, `"${vramPct}"`, ram, disk, ip].join(',');
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
    if (!confirm(`Kembalikan NIM ${nim} ke profil Level 2 (CPU-only)?`)) return;
    try {
      const res = await fetch('/api/users/unboost', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nim })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`NIM ${nim} dikembalikan ke profil Level 2 (CPU-only).`, 'info');
        fetchStudents();
        fetchCapacity();
      } else {
        showToast(data.detail || 'Gagal unboost', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleGpuBoost = async (e) => {
    e.preventDefault();
    if (!gpuBoostModal.nim) return;
    try {
      const res = await fetch('/api/users/gpu-boost', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          nim: gpuBoostModal.nim,
          hours: Number(gpuBoostModal.hours),
          reason: gpuBoostModal.reason
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`NIM ${gpuBoostModal.nim} mendapatkan GPU Boost Level 2.`, 'success');
        setGpuBoostModal({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' });
        fetchStudents();
        fetchCapacity();
      } else {
        showToast(data.detail || 'Gagal memberi GPU Boost', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleGpuUnboost = async (nim) => {
    if (!confirm(`Cabut GPU Boost NIM ${nim}? Sesi akan dihentikan dan kembali CPU-only.`)) return;
    try {
      const res = await fetch('/api/users/gpu-unboost', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nim })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`GPU Boost NIM ${nim} dicabut.`, 'info');
        fetchStudents();
        fetchCapacity();
      } else {
        showToast(data.detail || 'Gagal mencabut GPU Boost', 'error');
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

      const gpuData = userGpuMap[su.username];
      const defaultGpuIdx = isRiset ? 0 : null;
      const vramUsedMb = gpuData ? gpuData.vramMb : (su.vram_used_mb || 0);
      const gpuIndex = gpuData ? gpuData.gpuIndex : (su.gpu_index ?? defaultGpuIdx);
      const gpuTotalMb = gpuData ? gpuData.gpuTotalMb : (gpuIndex != null ? ((gpus && gpus[gpuIndex]?.vram_total_mb) || 16384) : 0);
      const vramPct = gpuTotalMb > 0 ? Math.min(100, Math.round((vramUsedMb / gpuTotalMb) * 100)) : 0;

      list.push({
        ...su,
        type: 'system',
        disk_used_mb: diskUsedMb,
        disk_quota_gb: diskQuotaGb,
        disk_quota_mb: diskQuotaMb,
        disk_percent: diskPercent,
        is_over_quota: isOverQuota,
        gpu_index: gpuIndex,
        gpu_total_mb: gpuTotalMb,
        vram_used_mb: vramUsedMb,
        vram_percent: vramPct,
        gpu_process_count: gpuData ? gpuData.processCount : 0,
        gpu_processes: gpuData ? gpuData.processes : []
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

      const studentLinuxUser = `m${nimStr}`;
      const isBoosted = Boolean(st.gpu_boost_active);
      const gpuData = userGpuMap[studentLinuxUser] || userGpuMap[nimStr];
      const defaultGpuIdx = st.is_priority ? 0 : (isBoosted ? 1 : null);
      const vramUsedMb = gpuData ? gpuData.vramMb : (osUser?.vram_used_mb || 0);
      const gpuIndex = gpuData ? gpuData.gpuIndex : (osUser?.gpu_index ?? defaultGpuIdx);
      const gpuTotalMb = gpuData ? gpuData.gpuTotalMb : (gpuIndex != null ? ((gpus && gpus[gpuIndex]?.vram_total_mb) || 16384) : 0);
      const vramPct = gpuTotalMb > 0 ? Math.min(100, Math.round((vramUsedMb / gpuTotalMb) * 100)) : 0;

      const ramMaxMb = st.is_priority ? 61440 : (isBoosted ? 6144 : 1536);

      list.push({
        ...st,
        nim: nimStr,
        type: 'student',
        is_online: isOnline,
        gpu_boost_active: isBoosted,
        os_user: osUser || null,
        ram_used_mb: osUser?.ram_used_mb || 0,
        ram_max_mb: osUser?.ram_max_mb || ramMaxMb,
        gpu_index: gpuIndex,
        gpu_total_mb: gpuTotalMb,
        vram_used_mb: vramUsedMb,
        vram_percent: vramPct,
        gpu_process_count: gpuData ? gpuData.processCount : (osUser?.processes?.filter(p => p.vram_mb > 0)?.length || 0),
        gpu_processes: gpuData ? gpuData.processes : [],
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
  }, [systemUsers, students, userGpuMap, gpus]);

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

  const gpuBoostActive = students?.filter(s => s.gpu_boost_active)?.length
    ?? capacity?.gpu_boost?.used_slots
    ?? 0;
  const gpuBoostFull = gpuBoostActive >= gpuBoostMax;

  const overQuotaCount = useMemo(() => unifiedList.filter(u => u.is_over_quota).length, [unifiedList]);

  // Cluster GPU Telemetry Metrics
  const totalActiveGpuUsers = useMemo(() => {
    return unifiedList.filter(u => (u.vram_used_mb || 0) > 0).length;
  }, [unifiedList]);

  const totalVramUsedMb = useMemo(() => {
    return (gpus || []).reduce((acc, g) => acc + (g.vram_used_mb || 0), 0);
  }, [gpus]);

  const totalVramMaxMb = useMemo(() => {
    return (gpus || []).reduce((acc, g) => acc + (g.vram_total_mb || 16384), 0);
  }, [gpus]);

  const totalVramPct = totalVramMaxMb > 0 ? Math.min(100, Math.round((totalVramUsedMb / totalVramMaxMb) * 100)) : 0;

  // Ekstrak angkatan yang tersedia secara dinamis dari data mahasiswa
  const availableCohorts = useMemo(() => {
    const cohorts = new Set();
    (students || []).forEach(st => {
      const nimStr = String(st.nim || '');
      if (nimStr.length >= 2) {
        const prefix = nimStr.substring(0, 2);
        if (!isNaN(prefix)) {
          cohorts.add(prefix);
        }
      }
    });
    // Urutkan dari angkatan terbaru (descending)
    return Array.from(cohorts).sort((a, b) => b.localeCompare(a));
  }, [students]);

  // Filtered List
  const filteredData = useMemo(() => {
    return unifiedList.filter(item => {
      if (filterType === 'dosen' && item.type !== 'system') return false;
      if (filterType === 'mhs' && item.type !== 'student') return false;
      if (filterType === 'overquota' && !item.is_over_quota) return false;

      if (selectedCohort !== 'all') {
        if (item.type !== 'student') return false;
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
  }, [unifiedList, filterType, searchQuery, selectedCohort]);

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Section Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="academic-eyebrow">Direktori Akun &amp; Sesi</span>
            <h1 className="font-academic text-xl sm:text-2xl text-slate-900 leading-tight">
              Manajemen Pengguna Terpadu
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Akun Linux OS, integrasi SSO SIMTIK, dan isolasi kuota komputasi
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isAdmin && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 shadow-xs transition-colors duration-150 text-xs"
                type="button"
              >
                <Download className="w-3.5 h-3.5 text-slate-800" />
                <span>Export CSV</span>
              </button>
            )}
            <button
              onClick={() => { fetchStudents(); fetchCapacity(); }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-[0_1px_2px_rgba(15,23,42,0.12),0_6px_16px_-10px_rgba(15,23,42,0.5)] transition-colors duration-150 text-xs"
              type="button"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronisasi SIMTIK</span>
            </button>
          </div>
        </div>
        <div className="academic-rule" />
      </div>

      {/* Operator Mode Banner (If logged in as Operator/Aslab) */}
      {isOperator && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono shadow-xs">
          <ShieldCheck className="w-4 h-4 shrink-0 text-slate-800" />
          <span>
            <strong>Mode Operator Aslab ({adminUser?.nama || 'Asisten'}):</strong> Akses monitoring dan penghentian sesi aktif.
          </span>
        </div>
      )}

      {/* 4 High-Density KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 1: Total Akun Terdaftar */}
        <div className="surface-card p-5 flex flex-col gap-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">Total Akun</span>
              <span className="font-academic text-[13px] text-slate-800">Tenant Directory</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono tabular-nums text-[26px] leading-none font-bold text-slate-900">
              {unifiedList.length} <span className="text-slate-400 text-xs font-normal">Akun</span>
            </span>
            <span className="font-mono text-[10.5px] font-semibold text-slate-600 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 whitespace-nowrap">
              SIMTIK &amp; OS
            </span>
          </div>
          <div className="meter-track w-full h-1.5 rounded-full flex">
            <div
              className="meter-fill h-full bg-sky-500"
              style={{ width: `${Math.round((totalStudents / (unifiedList.length || 1)) * 100)}%` }}
            />
            <div
              className="meter-fill h-full bg-slate-700"
              style={{ width: `${Math.round((pureSystemCount / (unifiedList.length || 1)) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
            <span>{totalStudents} Mhs SIMTIK</span>
            <span>{pureSystemCount} Dosen &amp; Lab</span>
          </div>
        </div>

        {/* Card 2: Akun Riset & Prioritas Aktif */}
        <div className="surface-card p-5 flex flex-col gap-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">Akun Riset</span>
              <span className="font-academic text-[13px] text-slate-800">QoS Dedicated &amp; Boost</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-700 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono tabular-nums text-[26px] leading-none font-bold text-amber-800">
              {boostedStudents} <span className="text-slate-400 text-xs font-normal">Akun</span>
            </span>
            <span className="font-mono text-[10.5px] font-semibold text-amber-700 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 whitespace-nowrap">
              Level 1 QoS
            </span>
          </div>
          <div className="meter-track w-full h-1.5 rounded-full">
            <div
              className="meter-fill h-full bg-amber-500"
              style={{ width: `${slotUtilPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <code className="text-slate-900 font-semibold">compute-level1</code>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className={gpuBoostFull ? 'text-rose-700 font-bold' : 'text-slate-700 font-semibold'}>
                GPU Boost {gpuBoostActive}/{gpuBoostMax}
              </span>
            </span>
          </div>
        </div>

        {/* Card 3: Beban Komputasi GPU */}
        <div className="surface-card p-5 flex flex-col gap-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">Beban GPU</span>
              <span className="font-academic text-[13px] text-slate-800">2× RTX 5060 Ti</span>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
              totalActiveGpuUsers > 0
                ? 'bg-sky-50 text-sky-700 border-sky-200/70'
                : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}>
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono tabular-nums text-[26px] leading-none font-bold text-slate-900">
              {totalActiveGpuUsers} <span className="text-slate-400 text-xs font-normal">Sesi</span>
            </span>
            <span className="font-mono text-[10.5px] font-semibold text-slate-600 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 whitespace-nowrap">
              {(totalVramUsedMb / 1024).toFixed(1)} GB · {totalVramPct}%
            </span>
          </div>
          <div className="meter-track w-full h-1.5 rounded-full">
            <div
              className={`meter-fill h-full ${
                totalVramPct >= 75
                  ? 'bg-rose-600'
                  : totalVramPct >= 40
                  ? 'bg-amber-500'
                  : 'bg-sky-600'
              }`}
              style={{ width: `${Math.max(totalVramPct, totalActiveGpuUsers > 0 ? 5 : 0)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
            <span>GPU 0: {((gpus?.[0]?.vram_used_mb || 0) / 1024).toFixed(1)}G · Riset</span>
            <span>GPU 1: {((gpus?.[1]?.vram_used_mb || 0) / 1024).toFixed(1)}G · Boost</span>
          </div>
        </div>

        {/* Card 4: Peringatan Storage (Over Quota) */}
        <div className="surface-card p-5 flex flex-col gap-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">Storage</span>
              <span className="font-academic text-[13px] text-slate-800">Disk Limit Policy</span>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
              overQuotaCount > 0
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className={`font-mono tabular-nums text-[26px] leading-none font-bold ${overQuotaCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {overQuotaCount} <span className="text-slate-400 text-xs font-normal">Akun</span>
            </span>
            {overQuotaCount > 0 ? (
              <span className="font-mono text-[10.5px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 whitespace-nowrap">
                Over Quota
              </span>
            ) : (
              <span className="font-mono text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 whitespace-nowrap">
                Normal
              </span>
            )}
          </div>
          <div className="meter-track w-full h-1.5 rounded-full">
            <div
              className={`meter-fill h-full ${overQuotaCount > 0 ? 'bg-rose-600' : 'bg-emerald-600'}`}
              style={{ width: overQuotaCount > 0 ? '100%' : '15%' }}
            />
          </div>
          <div className={`flex items-center gap-1.5 text-[11px] font-mono ${overQuotaCount > 0 ? 'text-rose-700 font-semibold' : 'text-slate-500'}`}>
            <HardDrive className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{overQuotaCount > 0 ? 'Batas soft quota terlampaui' : 'Semua kuota aman terisolasi'}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar & Search Module */}
      <div className="surface-card p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Segmented Controls */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70 font-sans text-xs">
          {[
            { id: 'all', label: `Semua (${unifiedList.length})`, tone: 'default' },
            { id: 'mhs', label: `Mahasiswa (${totalStudents})`, tone: 'default' },
            { id: 'dosen', label: `Dosen & Riset (${pureSystemCount})`, tone: 'default' },
            { id: 'overquota', label: `Over Quota (${overQuotaCount})`, tone: 'danger' },
          ].map((filter) => {
            const isActive = filterType === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setFilterType(filter.id)}
                className={`px-3 py-1.5 rounded-lg transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isActive
                    ? filter.tone === 'danger'
                      ? 'bg-white text-rose-700 font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                      : 'bg-white text-slate-900 font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                    : filter.tone === 'danger'
                      ? 'text-slate-500 hover:text-rose-700'
                      : 'text-slate-500 hover:text-slate-900'
                }`}
                type="button"
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Cohort & Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCohort}
            onChange={(e) => setSelectedCohort(e.target.value)}
            className="bg-slate-50/80 border border-slate-200 text-slate-800 text-xs font-mono rounded-lg py-1.5 px-3 focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
          >
            <option value="all">Semua Angkatan</option>
            {availableCohorts.map(c => (
              <option key={c} value={c}>Angkatan 20{c}</option>
            ))}
          </select>

          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari NIM, nama, atau IP…"
              className="w-full bg-slate-50/80 border border-slate-200 focus:border-slate-900 focus:bg-white rounded-lg py-1.5 pl-8 pr-3 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Precision 9-Column Data Table Container */}
      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1360px]">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] border-b border-slate-200">
                <th className="py-4 px-5" scope="col">Akun & Pengguna</th>
                <th className="py-4 px-4" scope="col">Identitas & Status</th>
                <th className="py-4 px-4" scope="col">Role / Hak Akses</th>
                <th className="py-4 px-4" scope="col">QoS & Cgroup Slice</th>
                <th className="py-4 px-4" scope="col">Alokasi Hardware & Timer</th>
                <th className="py-4 px-4" scope="col">Penggunaan RAM</th>
                <th className="py-4 px-4" scope="col">Beban GPU (VRAM)</th>
                <th className="py-4 px-4" scope="col">Storage & Quota</th>
                <th className="py-4 px-5 text-right" scope="col">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-[#64748B] font-mono">
                    Tidak ada akun yang sesuai dengan filter atau kata kunci pencarian.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  if (item.type === 'student') {
                    const defaultL2RamMb = ((level2Slots?.lab_mode || capacity?.lab_mode) === 'cpu60') ? 1536 : 3072;
                    const ramMaxMb = item.is_priority ? 61440 : (item.ram_max_mb || defaultL2RamMb);
                    const ramUsedGb = ((item.ram_used_mb || 0) / 1024).toFixed(1);
                    const ramMaxGb = (ramMaxMb / 1024).toFixed(1);
                    const ramPct = item.is_online ? Math.min(100, Math.round(((item.ram_used_mb || 0) / ramMaxMb) * 100)) : 0;
                    const userRole = item.role || (item.is_admin ? 'admin' : 'mahasiswa');

                    const diskUsedGb = ((item.disk_used_mb || 0) / 1024).toFixed(1);
                    const diskQuotaGb = item.disk_quota_gb || (item.is_priority ? 50 : 10);
                    const diskPct = Math.min(100, Math.round(((item.disk_used_mb || 0) / (diskQuotaGb * 1024)) * 100));

                    const initials = item.nama
                      ? (item.nama.trim().split(/\s+/).map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'M')
                      : String(item.nim || 'M').slice(-2).toUpperCase();

                    const isBoosted = Boolean(item.gpu_boost_active);
                    const hardwareLabel = item.is_priority
                      ? 'GPU 0 (Dedicated) · 20 Cores · 60 GB'
                      : isBoosted
                        ? 'GPU 1 (Boost) · 4 Cores · 6 GB'
                        : l2HardwareLabel;

                    return (
                      <tr
                        key={`std-${item.nim}`}
                        className={`directory-row group ${
                          item.is_priority ? 'bg-amber-50/30' : isBoosted ? 'bg-sky-50/20' : 'bg-white'
                        }`}
                      >
                        {/* 1. Akun & Pengguna */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${
                              item.is_priority
                                ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                                : isBoosted
                                  ? 'bg-sky-50 text-sky-800 border-sky-200/80'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {initials}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 group/name">
                                <span className="font-bold text-xs text-slate-900 truncate" title={item.nama || 'Mahasiswa SIMTIK'}>
                                  {item.nama || 'Mahasiswa SIMTIK'}
                                </span>
                                {isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditNameModal({
                                        isOpen: true,
                                        nim: item.nim,
                                        currentName: item.nama || '',
                                        newName: item.nama || '',
                                        isSubmitting: false
                                      });
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Ubah Nama Mahasiswa"
                                    type="button"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <span className="font-mono text-[11px] text-slate-500 truncate">
                                mhs.{item.nim}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Identitas & Status */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-xs text-[#0F172A] font-bold tracking-tight">
                              {item.nim}
                            </span>
                            {item.is_active ? (
                              item.is_online ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10.5px] font-semibold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-ring" />
                                    Online
                                  </span>
                                  {item.active_ip && (
                                    <span className="text-slate-400 text-[10px] font-mono">({item.active_ip})</span>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200 font-mono text-[10.5px] font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                  Offline
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-mono text-[10.5px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Blocked
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Role / Hak Akses */}
                        <td className="py-4 px-4">
                          {isSuperAdmin ? (
                            <select
                              value={userRole}
                              onChange={(e) => handleSetRole(item.nim, e.target.value)}
                              className="bg-white text-[#0F172A] text-xs font-mono rounded-lg px-2 py-1 focus:outline-none border border-[#E2E8F0] shadow-xs cursor-pointer hover:border-blue-300 transition-colors"
                            >
                              <option value="mahasiswa">Mahasiswa</option>
                              <option value="aslab">Aslab</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold border ${
                              userRole === 'admin'
                                ? 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0]'
                                : userRole === 'aslab'
                                ? 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0]'
                                : 'bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]'
                            }`}>
                              {userRole}
                            </span>
                          )}
                        </td>

                        {/* 4. QoS & Cgroup Slice */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5">
                            {item.is_priority ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 w-fit">
                                <Zap className="w-3 h-3 text-amber-700" />
                                <span className="font-mono text-[10.5px] font-bold">Level 1 (Priority)</span>
                              </div>
                            ) : isBoosted ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 w-fit">
                                <Zap className="w-3 h-3 text-sky-700" />
                                <span className="font-mono text-[10.5px] font-bold">Level 2 + GPU Boost</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200 w-fit">
                                <span className="font-mono text-[10.5px] font-medium">Level 2 (CPU only)</span>
                              </div>
                            )}
                            <span className="font-mono text-[10px] text-slate-400 mt-0.5">
                              {item.is_priority ? 'compute-level1.slice' : 'compute-level2.slice'}
                            </span>
                          </div>
                        </td>

                        {/* 5. Alokasi Hardware & Timer */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-xs text-slate-900 font-semibold">
                              {hardwareLabel}
                            </span>
                            {item.is_priority && item.priority_expires_at ? (
                              <div className="inline-flex items-center gap-1 text-amber-700 font-mono text-[11px] font-bold">
                                <Clock className="w-3 h-3" />
                                <span>Sisa: <LiveCountdown expiresAt={item.priority_expires_at} /></span>
                              </div>
                            ) : isBoosted && item.gpu_boost_expires_at ? (
                              <div className="inline-flex items-center gap-1 text-sky-700 font-mono text-[11px] font-bold">
                                <Clock className="w-3 h-3" />
                                <span>Boost: <LiveCountdown expiresAt={item.gpu_boost_expires_at} /></span>
                              </div>
                            ) : (
                              <span className="font-mono text-[11px] text-slate-500">
                                {item.is_online ? 'Fair-share FairQ active' : 'Tidak ada proses aktif'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Penggunaan RAM */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1 w-28">
                            <div className="flex justify-between font-mono text-xs">
                              <span className="text-slate-900 font-bold">{ramUsedGb} GB</span>
                              <span className="text-slate-500">/ {ramMaxGb} GB</span>
                            </div>
                            <div className="meter-track w-full h-1.5 rounded-full">
                              <div
                                className={`meter-fill h-full rounded-full ${
                                  ramPct >= 85 ? 'bg-rose-600' : ramPct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${ramPct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* 7. Beban GPU (VRAM) */}
                        <td className="py-4 px-4">
                          {renderGpuVramCell(item)}
                        </td>

                        {/* 8. Storage & Quota */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1 w-32">
                            <div className="flex justify-between font-mono text-xs">
                              <span className={`font-bold ${item.is_over_quota ? 'text-rose-700' : 'text-slate-900'}`}>
                                {diskUsedGb} GB
                              </span>
                              <span className="text-slate-500">/ {diskQuotaGb} GB</span>
                            </div>
                            <div className="meter-track w-full h-1.5 rounded-full">
                              <div
                                className={`meter-fill h-full rounded-full ${
                                  item.is_over_quota
                                    ? 'bg-rose-600'
                                    : diskPct >= 80
                                    ? 'bg-amber-500'
                                    : 'bg-sky-600'
                                }`}
                                style={{ width: `${diskPct}%` }}
                              />
                            </div>
                            {item.is_over_quota ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 font-mono text-[9.5px] w-fit font-bold border border-rose-200">
                                Over Quota
                              </span>
                            ) : (
                              <span className="font-mono text-[10px] text-emerald-700 font-semibold">
                                Normal · {diskPct}%
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 8. Aksi Manajemen with 3D Tactile Buttons */}
                        <td className="py-4 px-5 text-right">
                          {!isAdmin ? (
                            <span className="font-mono text-xs text-[#64748B]">// READ_ONLY</span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                              {item.is_priority ? (
                                <button
                                  onClick={() => handleUnboost(item.nim)}
                                  className="px-2.5 py-1 rounded-lg bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] hover:bg-amber-100 shadow-xs transition-colors duration-150 text-xs font-mono font-semibold"
                                  title="Kembalikan ke Level 2 (CPU-only)"
                                  type="button"
                                >
                                  ↺ L1
                                </button>
                              ) : (
                                <button
                                  onClick={() => setBoostModal({ isOpen: true, nim: item.nim, nama: item.nama || '', hours: 4, reason: '' })}
                                  disabled={isSlotsFull}
                                  className="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-xs transition-colors duration-150 text-xs font-mono font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                                  title={isSlotsFull ? 'Slot Prioritas GPU 0 Penuh' : 'Boost ke Level 1 Dedicated'}
                                  type="button"
                                >
                                  ⚡ L1
                                </button>
                              )}

                              {!item.is_priority && (
                                isBoosted ? (
                                  <button
                                    onClick={() => handleGpuUnboost(item.nim)}
                                    className="px-2.5 py-1 rounded-lg bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] hover:bg-sky-100 shadow-xs transition-colors duration-150 text-xs font-mono font-semibold"
                                    title="Cabut GPU Boost Level 2"
                                    type="button"
                                  >
                                    ↺ GPU
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setGpuBoostModal({ isOpen: true, nim: item.nim, nama: item.nama || '', hours: 4, reason: '' })}
                                    disabled={!gpuBoostEnabled || gpuBoostFull}
                                    className="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-xs transition-colors duration-150 text-xs font-mono font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                                    title={
                                      !gpuBoostAllowed
                                        ? 'GPU Boost dikunci nonaktif pada Mode 60'
                                        : !gpuBoostEnabled
                                        ? 'GPU Boost dinonaktifkan global'
                                        : gpuBoostFull
                                          ? `Slot GPU Boost penuh (${gpuBoostActive}/${gpuBoostMax})`
                                          : 'Beri GPU Boost Level 2 (GPU 1)'
                                    }
                                    type="button"
                                  >
                                    🎮 GPU
                                  </button>
                                )
                              )}

                              {/* Ubah Nama Mahasiswa */}
                              <button
                                onClick={() => setEditNameModal({
                                  isOpen: true,
                                  nim: item.nim,
                                  currentName: item.nama || '',
                                  newName: item.nama || '',
                                  isSubmitting: false
                                })}
                                className="p-1.5 rounded-lg bg-white hover:bg-[#F1F5F9] text-[#334155] hover:text-[#0F172A] border border-[#E2E8F0] shadow-xs transition-colors duration-150"
                                title="Ubah Nama Lengkap"
                                type="button"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Kill Sesi */}
                              <button
                                onClick={() => onKillAllUser(`m${item.nim}`)}
                                disabled={!item.is_online}
                                className="p-1.5 rounded-lg bg-[#FEE2E2] text-[#C53030] hover:bg-[#FEE2E2] border border-[#FCA5A5] shadow-xs transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Kill Sesi OS Aktif"
                                type="button"
                              >
                                <Square className="w-3.5 h-3.5 fill-current" />
                              </button>

                              {/* Super Admin Advanced Actions */}
                              {isSuperAdmin && (
                                <>
                                  <button
                                    onClick={() => handleClearCache(item.nim)}
                                    className="p-1.5 rounded-lg bg-white hover:bg-[#FEF3C7] text-[#334155] hover:text-[#B45309] border border-[#E2E8F0] shadow-xs transition-colors duration-150"
                                    title="Bersihkan Cache Disk"
                                    type="button"
                                  >
                                    <Eraser className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleActive(item.nim)}
                                    className="p-1.5 rounded-lg bg-white hover:bg-[#F1F5F9] text-[#334155] hover:text-[#0F172A] border border-[#E2E8F0] shadow-xs transition-colors duration-150"
                                    title={item.is_active ? 'Blokir Akun' : 'Aktifkan Akun'}
                                    type="button"
                                  >
                                    {item.is_active ? <UserX className="w-3.5 h-3.5 text-[#C53030]" /> : <UserCheck className="w-3.5 h-3.5 text-[#2E7D32]" />}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(item.nim)}
                                    className="p-1.5 rounded-lg bg-white hover:bg-[#FEE2E2] text-[#334155] hover:text-[#C53030] border border-[#E2E8F0] shadow-xs transition-colors duration-150"
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
                  const ramMaxMb = isRiset ? 61440 : (item.ram_max_mb || 1536);
                  const ramUsedGb = ((item.ram_used_mb || 0) / 1024).toFixed(1);
                  const ramMaxGb = (ramMaxMb / 1024).toFixed(1);
                  const ramPct = isOnline ? Math.min(100, Math.round(((item.ram_used_mb || 0) / ramMaxMb) * 100)) : 0;

                  const diskUsedGb = ((item.disk_used_mb || 0) / 1024).toFixed(1);
                  const diskQuotaGb = item.disk_quota_gb || (isRiset ? 50 : 10);
                  const diskPct = Math.min(100, Math.round(((item.disk_used_mb || 0) / (diskQuotaGb * 1024)) * 100));

                  return (
                    <tr
                      key={`sys-${item.username}`}
                      className="directory-row bg-slate-50/30 group"
                    >
                      {/* 1. Akun & Pengguna */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                            isRiset
                              ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {isRiset ? <Database className="w-4 h-4" /> : <Server className="w-4 h-4" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-xs text-slate-900 truncate flex items-center gap-2">
                              {item.username}
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold border whitespace-nowrap ${
                                isRiset
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {isRiset ? 'RISET & SKRIPSI' : 'DOSEN / PELATIHAN'}
                              </span>
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 truncate">
                              {isRiset ? 'Akun Riset & Skripsi Mahasiswa/Dosen' : 'Akun Dosen & Pelatihan Praktikum'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Identitas & Status */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs text-[#334155] font-bold tracking-tight">
                            {item.username}
                          </span>
                          {isOnline ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10.5px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-ring" />
                                Online
                              </span>
                              <span className="text-slate-400 text-[10px] font-mono">({item.active_ip || '127.0.0.1'})</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200 font-mono text-[10.5px] font-semibold w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                              Offline
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Role / Hak Akses */}
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-mono font-semibold border ${
                          isRiset
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {isRiset ? 'Dosen Riset' : 'Batch Service'}
                        </span>
                      </td>

                      {/* 4. QoS & Cgroup Slice */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-0.5">
                          {isRiset ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 w-fit">
                              <Zap className="w-3 h-3 text-amber-700" />
                              <span className="font-mono text-[10.5px] font-bold">Level 1 (Priority)</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200 w-fit">
                              <span className="font-mono text-[10.5px] font-medium">Level 2 (CPU only)</span>
                            </div>
                          )}
                          <span className="font-mono text-[10px] text-slate-400 mt-0.5">
                            {isRiset ? 'compute-level1.slice' : 'compute-level2.slice'}
                          </span>
                        </div>
                      </td>

                      {/* 5. Alokasi Hardware & Timer */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs text-slate-900 font-semibold">
                            {isRiset ? 'GPU 0 (Dedicated) | 20 Cores | 60GB' : l2HardwareLabel}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {isRiset ? 'Riset Dosen Tetap' : 'Batch Job Pipeline'}
                          </span>
                        </div>
                      </td>

                      {/* 6. Penggunaan RAM */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 w-28">
                          <div className="flex justify-between font-mono text-xs">
                            <span className="text-slate-900 font-bold">{ramUsedGb} GB</span>
                            <span className="text-slate-500">/ {ramMaxGb} GB</span>
                          </div>
                          <div className="meter-track w-full h-1.5 rounded-full">
                            <div
                              className={`meter-fill h-full rounded-full ${
                                ramPct >= 85 ? 'bg-rose-600' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${ramPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 7. Beban GPU (VRAM) */}
                      <td className="py-4 px-4">
                        {renderGpuVramCell(item)}
                      </td>

                      {/* 8. Storage & Quota */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 w-32">
                          <div className="flex justify-between font-mono text-xs">
                            <span className={`font-bold ${item.is_over_quota ? 'text-rose-700' : 'text-slate-900'}`}>
                              {diskUsedGb} GB
                            </span>
                            <span className="text-slate-500">/ {diskQuotaGb} GB</span>
                          </div>
                          <div className="meter-track w-full h-1.5 rounded-full">
                            <div
                              className={`meter-fill h-full rounded-full ${
                                item.is_over_quota
                                  ? 'bg-rose-600'
                                  : 'bg-sky-600'
                              }`}
                              style={{ width: `${diskPct}%` }}
                            />
                          </div>
                          {item.is_over_quota ? (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#FEE2E2] text-[#C53030] font-mono text-[9px] w-fit font-bold border border-[#FCA5A5]">
                              <span>⚠️ Over Quota</span>
                            </div>
                          ) : (
                            <span className="font-mono text-[10px] text-[#2E7D32] font-semibold">
                              Normal ({diskPct}%)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 8. Aksi Manajemen */}
                      <td className="py-4 px-5 text-right">
                        {!isAdmin ? (
                          <span className="font-mono text-xs text-[#64748B]">// SYSTEM_PROTECTED</span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onKillAllUser(item.username)}
                              disabled={!isOnline}
                              className="p-1.5 rounded-lg bg-[#FEE2E2] text-[#C53030] hover:bg-[#FEE2E2] border border-[#FCA5A5] shadow-xs transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Kill Seluruh Proses Akun"
                              type="button"
                            >
                              <Square className="w-3.5 h-3.5 fill-current" />
                            </button>
                            {isSuperAdmin && (
                              <button
                                onClick={() => setResetModal({ isOpen: true, username: item.username, newPassword: '', isSubmitting: false })}
                                className="p-1.5 rounded-lg bg-white hover:bg-[#F1F5F9] text-[#334155] hover:text-[#0F172A] border border-[#E2E8F0] shadow-xs transition-colors duration-150"
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

      {/* Boost QoS Modal with 3D Depth */}
      {boostModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/60 flex items-center justify-center p-4">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl shadow-warm-modal p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#0F172A] shadow-xs">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0F172A]">Boost Akses ke GPU 0 (Level 1)</h3>
                  <p className="text-xs text-[#64748B] font-mono">NIM: {boostModal.nim} ({boostModal.nama})</p>
                </div>
              </div>
              <button
                onClick={() => setBoostModal({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' })}
                className="text-[#64748B] hover:text-[#334155] p-1 rounded-lg hover:bg-[#F1F5F9] transition-colors"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBoost} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#334155] font-semibold mb-2">
                  Durasi Hak Akses Dedicated GPU 0:
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 4, 8, 12].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setBoostModal(prev => ({ ...prev, hours: h }))}
                      className={`py-2 rounded-xl text-xs font-mono font-semibold transition-all border ${
                        boostModal.hours === h
                          ? 'bg-[#0F172A] text-white border-blue-700 shadow-xs'
                          : 'bg-white border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] shadow-xs'
                      }`}
                    >
                      {h} Jam
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#334155] font-semibold mb-1.5">
                  Alasan / Keterangan Boost:
                </label>
                <input
                  type="text"
                  placeholder="Misal: Training Model Skripsi ResNet-50"
                  value={boostModal.reason}
                  onChange={(e) => setBoostModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full bg-[#F8FAFC] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#0F172A] border border-[#E2E8F0] focus:outline-none focus:border-[#0F172A] focus:bg-white transition-all shadow-inner"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAFC]/70 text-xs font-mono text-blue-900 border border-[#E2E8F0] flex flex-col gap-1">
                <span className="text-[#0F172A] font-bold">Benefit Level 1 QoS:</span>
                <span>• Akses Dedicated GPU 0 (Direct VRAM Mapping)</span>
                <span>• Jatah RAM Host ditingkatkan hingga 60 GB (Cgroup isolated)</span>
                <span>• Prioritas CPU Scheduler CFS 20 Cores</span>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setBoostModal({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' })}
                  className="flex-1 py-2.5 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#334155] border border-[#E2E8F0] font-mono text-xs font-semibold shadow-xs transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-mono text-xs font-medium shadow-xs transition-colors"
                >
                  Konfirmasi Boost
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GPU Boost Level 2 Modal */}
      {gpuBoostModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/60 flex items-center justify-center p-4">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl shadow-warm-modal p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shadow-xs">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0F172A]">GPU Boost Level 2 (GPU 1)</h3>
                  <p className="text-xs text-[#64748B] font-mono">NIM: {gpuBoostModal.nim} ({gpuBoostModal.nama})</p>
                </div>
              </div>
              <button
                onClick={() => setGpuBoostModal({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' })}
                className="text-[#64748B] hover:text-[#334155] p-1 rounded-lg hover:bg-[#F1F5F9] transition-colors"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGpuBoost} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#334155] font-semibold mb-2">
                  Durasi GPU Boost:
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {[1, 2, 4, 8, 12].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setGpuBoostModal(prev => ({ ...prev, hours: h }))}
                      className={`py-2 rounded-xl text-xs font-mono font-semibold transition-all border ${
                        gpuBoostModal.hours === h
                          ? 'bg-[#0F172A] text-white border-blue-700 shadow-xs'
                          : 'bg-white border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] shadow-xs'
                      }`}
                    >
                      {h} Jam
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setGpuBoostModal(prev => ({ ...prev, hours: 0 }))}
                    className={`py-2 rounded-xl text-xs font-mono font-semibold transition-all border ${
                      gpuBoostModal.hours === 0
                        ? 'bg-[#0F172A] text-white border-blue-700 shadow-xs'
                        : 'bg-white border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] shadow-xs'
                    }`}
                    title="Akses GPU 1 tanpa batas waktu kedaluwarsa otomatis"
                  >
                    ∞ Unlimited
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#334155] font-semibold mb-1.5">
                  Alasan / Keterangan Boost:
                </label>
                <input
                  type="text"
                  placeholder="Misal: Praktikum Deep Learning sesi 3"
                  value={gpuBoostModal.reason}
                  onChange={(e) => setGpuBoostModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full bg-[#F8FAFC] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#0F172A] border border-[#E2E8F0] focus:outline-none focus:border-[#0F172A] focus:bg-white transition-all shadow-inner"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-sky-50/60 text-xs font-mono text-sky-900 border border-sky-200/70 flex flex-col gap-1">
                <span className="text-[#0F172A] font-bold">Alokasi GPU Boost:</span>
                <span>• Akses GPU 1 (VRAM {gpuBoostVramMb} MB)</span>
                <span>• CPU & RAM tetap mengikuti profil kelas (tidak diubah)</span>
                <span>
                  • {gpuBoostModal.hours === 0 
                      ? 'Durasi: ∞ Unlimited (aktif sampai dicabut manual oleh Aslab/Admin)' 
                      : `Durasi: ${gpuBoostModal.hours} Jam (otomatis berakhir sesuai durasi)`}
                </span>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setGpuBoostModal({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' })}
                  className="flex-1 py-2.5 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#334155] border border-[#E2E8F0] font-mono text-xs font-semibold shadow-xs transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-mono text-xs font-medium shadow-xs transition-colors"
                >
                  Konfirmasi GPU Boost
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Linux Password Modal */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/60 flex items-center justify-center p-4">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl shadow-warm-modal p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#0F172A] shadow-xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0F172A]">Reset Password Linux OS</h3>
                  <p className="text-xs text-[#64748B] font-mono">User: {resetModal.username}</p>
                </div>
              </div>
              <button
                onClick={() => setResetModal({ isOpen: false, username: '', newPassword: '', isSubmitting: false })}
                className="text-[#64748B] hover:text-[#334155] p-1 rounded-lg hover:bg-[#F1F5F9] transition-colors"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#334155] font-semibold mb-1.5">
                  Password Linux Baru:
                </label>
                <input
                  type="password"
                  placeholder="Masukkan password baru..."
                  value={resetModal.newPassword}
                  onChange={(e) => setResetModal(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  className="w-full bg-[#F8FAFC] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#0F172A] border border-[#E2E8F0] focus:outline-none focus:border-slate-900 focus:bg-white transition-all shadow-inner"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModal({ isOpen: false, username: '', newPassword: '', isSubmitting: false })}
                  className="flex-1 py-2.5 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#334155] border border-[#E2E8F0] font-mono text-xs font-semibold shadow-xs transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetModal.isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-mono text-xs font-medium shadow-xs transition-colors disabled:opacity-50"
                >
                  {resetModal.isSubmitting ? 'Memproses...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ubah Nama Mahasiswa */}
      {editNameModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/60 animate-fade-in">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] text-[#0F172A] flex items-center justify-center border border-[#E2E8F0]">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0F172A]">Ubah Identitas Mahasiswa</h3>
                  <p className="font-mono text-xs text-[#64748B]">NIM: {editNameModal.nim}</p>
                </div>
              </div>
              <button
                onClick={() => setEditNameModal({ isOpen: false, nim: null, currentName: '', newName: '', isSubmitting: false })}
                className="text-[#64748B] hover:text-[#334155] p-1 rounded-lg hover:bg-[#F1F5F9] transition-colors"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editNameModal.newName.trim()) {
                  showToast('Nama tidak boleh kosong', 'error');
                  return;
                }
                setEditNameModal(prev => ({ ...prev, isSubmitting: true }));
                try {
                  const res = await fetch(`/api/users/${editNameModal.nim}/update-name`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ nama: editNameModal.newName.trim() })
                  });
                  const data = await res.json();
                  if (res.ok && data.success) {
                    showToast(data.message || 'Nama berhasil diperbarui.', 'success');
                    setEditNameModal({ isOpen: false, nim: null, currentName: '', newName: '', isSubmitting: false });
                    fetchStudents();
                  } else {
                    showToast(data.detail || data.message || 'Gagal memperbarui nama.', 'error');
                    setEditNameModal(prev => ({ ...prev, isSubmitting: false }));
                  }
                } catch (err) {
                  showToast('Error: ' + err.message, 'error');
                  setEditNameModal(prev => ({ ...prev, isSubmitting: false }));
                }
              }}
              className="p-5 flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs font-semibold text-[#334155]">
                  Nama Lengkap Sesuai SIMTIK
                </label>
                <input
                  type="text"
                  value={editNameModal.newName}
                  onChange={(e) => setEditNameModal(prev => ({ ...prev, newName: e.target.value }))}
                  placeholder="Masukkan nama lengkap mahasiswa..."
                  className="w-full px-3.5 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#0F172A] focus:bg-white transition-all font-sans"
                  autoFocus
                  required
                />
                <span className="text-[11px] font-mono text-[#64748B]">
                  Nama ini akan ditampilkan pada Dashboard Monitoring Lab AI & Buku Rekap.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setEditNameModal({ isOpen: false, nim: null, currentName: '', newName: '', isSubmitting: false })}
                  className="px-4 py-2 text-xs font-mono text-[#334155] hover:bg-[#F1F5F9] rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editNameModal.isSubmitting}
                  className="px-4 py-2 text-xs font-mono font-bold text-white bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  {editNameModal.isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Nama</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
