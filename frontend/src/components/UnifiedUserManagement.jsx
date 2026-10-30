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
  gpus = [],
  _onOpenKillModal,
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
    const vramMb = item.vram_used_mb || 0;
    const gpuIdx = item.gpu_index ?? (item.is_priority || item.username === 'labriset' ? 0 : 1);
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
            <span className="font-bold text-[#2E2018] flex items-center gap-1">
              <span className={`px-1 py-0.2 rounded border text-[9px] font-bold ${
                gpuIdx === 0
                  ? 'bg-[#FAF6EF] text-[#6F4E37] border-[#E4D8C3]'
                  : 'bg-[#FAF6EF] text-[#6F4E37] border-[#E4D8C3]'
              }`}>
                GPU {gpuIdx}
              </span>
              <span>{vramUsedGb} GB</span>
            </span>
            <span className="text-[#7A6A5C] text-[11px]">/ {vramTotalGb} GB</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#EFE6D8] overflow-hidden border border-[#E4D8C3]/50 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                vramPct >= 50
                  ? 'bg-[#FEE2E2]0 shadow-[0_0_6px_rgba(244,63,94,0.4)]'
                  : vramPct >= 25
                  ? 'bg-[#FEF3C7]0 shadow-[0_0_6px_rgba(245,158,11,0.4)]'
                  : 'bg-[#FAF6EF]0 shadow-[0_0_6px_rgba(59,130,246,0.3)]'
              }`}
              style={{ width: `${Math.max(vramPct, 3)}%` }}
            />
          </div>
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className={`font-semibold ${
              vramPct >= 50 ? 'text-[#C53030]' : vramPct >= 25 ? 'text-[#B45309]' : 'text-[#6F4E37]'
            }`}>
              {vramPct}% VRAM
            </span>
            {procCount > 0 && (
              <span className="text-[#7A6A5C] text-[9px]">
                {procCount} {procCount === 1 ? 'proc' : 'procs'}
              </span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-0.5 w-32">
        <div className="flex items-center gap-1.5 font-mono text-xs text-[#7A6A5C]">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
          <span className="text-[#7A6A5C] font-medium">Idle (0 MB)</span>
        </div>
        <span className="font-mono text-[10px] text-[#7A6A5C]">
          GPU {gpuIdx} · Standby
        </span>
      </div>
    );
  };

  // Modals state
  const [boostModal, setBoostModal] = useState({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' });
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
    const headers = ['NIM/Username', 'Nama', 'Tipe', 'Role', 'Status', 'Prioritas', 'Sisa Waktu Prioritas', 'GPU', 'VRAM MB', 'Persen VRAM', 'RAM MB', 'Kuota Disk MB', 'IP Sesi Aktif'];
    const rows = filteredData.map(u => {
      const isSystem = u.type === 'system';
      const uname = isSystem ? u.username : u.nim;
      const nama = isSystem ? (u.username === 'labriset' ? 'Lab Riset / Dosen' : 'Pelatihan Dasar') : (u.nama || '');
      const role = isSystem ? 'System' : (u.role === 'admin' ? 'Super Admin' : u.role === 'aslab' ? 'Aslab' : 'Mahasiswa');
      const status = u.active_ip ? 'ONLINE' : (u.is_active ? 'OFFLINE' : 'BLOCKED');
      const prio = isSystem ? (u.username === 'labriset' ? 'Dedicated GPU 0' : 'Shared GPU 1') : (u.is_priority ? 'Prioritas' : 'Standar');
      const exp = u.priority_expires_at ? new Date(u.priority_expires_at).toLocaleString('id-ID') : '-';
      const gpuIdx = u.gpu_index ?? (u.is_priority || uname === 'labriset' ? 0 : 1);
      const vramMb = u.vram_used_mb || 0;
      const vramPct = `${u.vram_percent || 0}%`;
      const ram = u.ram_used_mb || 0;
      const disk = u.disk_used_mb || u.disk_usage_mb || 0;
      const ip = u.active_ip || '-';
      return [uname, `"${nama}"`, u.type, role, status, prio, `"${exp}"`, `GPU ${gpuIdx}`, vramMb, `"${vramPct}"`, ram, disk, ip].join(',');
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

      const gpuData = userGpuMap[su.username];
      const defaultGpuIdx = isRiset ? 0 : 1;
      const vramUsedMb = gpuData ? gpuData.vramMb : (su.vram_used_mb || 0);
      const gpuIndex = gpuData ? gpuData.gpuIndex : (su.gpu_index ?? defaultGpuIdx);
      const gpuTotalMb = gpuData ? gpuData.gpuTotalMb : ((gpus && gpus[gpuIndex]?.vram_total_mb) || 16384);
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
      const gpuData = userGpuMap[studentLinuxUser] || userGpuMap[nimStr];
      const defaultGpuIdx = st.is_priority ? 0 : 1;
      const vramUsedMb = gpuData ? gpuData.vramMb : (osUser?.vram_used_mb || 0);
      const gpuIndex = gpuData ? gpuData.gpuIndex : (osUser?.gpu_index ?? defaultGpuIdx);
      const gpuTotalMb = gpuData ? gpuData.gpuTotalMb : ((gpus && gpus[gpuIndex]?.vram_total_mb) || 16384);
      const vramPct = gpuTotalMb > 0 ? Math.min(100, Math.round((vramUsedMb / gpuTotalMb) * 100)) : 0;

      list.push({
        ...st,
        nim: nimStr,
        type: 'student',
        is_online: isOnline,
        os_user: osUser || null,
        ram_used_mb: osUser?.ram_used_mb || 0,
        ram_max_mb: osUser?.ram_max_mb || (st.is_priority ? 61440 : 6144),
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-lg sm:text-xl font-bold text-[#2E2018] tracking-tight">
            Manajemen Pengguna Terpadu
          </h1>
          <p className="text-xs text-[#7A6A5C] mt-0.5">
            Manajemen akun Linux OS, integrasi SSO SIMTIK, dan isolasi kuota komputasi
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF6EF] text-[#3B2E26] font-semibold border border-[#E4D8C3] shadow-warm-xs transition-colors motion-press text-xs"
              type="button"
            >
              <Download className="w-3.5 h-3.5 text-[#6F4E37]" />
              <span>Export CSV</span>
            </button>
          )}
          <button
            onClick={() => { fetchStudents(); fetchCapacity(); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#6F4E37] hover:bg-[#4A3426] text-white font-medium shadow-warm-xs transition-colors motion-press text-xs"
            type="button"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sinkronisasi SIMTIK</span>
          </button>
        </div>
      </div>

      {/* Operator Mode Banner (If logged in as Operator/Aslab) */}
      {isOperator && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#FAF6EF] border border-[#E4D8C3] text-[#6F4E37] text-xs font-mono shadow-warm-xs">
          <ShieldCheck className="w-4 h-4 shrink-0 text-[#6F4E37]" />
          <span>
            <strong>Mode Operator Aslab ({adminUser?.nama || 'Asisten'}):</strong> Akses monitoring dan penghentian sesi aktif.
          </span>
        </div>
      )}

      {/* 4 High-Density 3D KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 1: Total Akun Terdaftar */}
        <div className="bg-[#F3EBDD] rounded-2xl p-5 border border-[#E4D8C3] shadow-warm-xs motion-card flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-[#2E2018]">Total Akun Terdaftar</span>
              <p className="text-[11px] text-[#7A6A5C]">Tenant Directory</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#FAF6EF] border border-[#E4D8C3] flex items-center justify-center text-[#6F4E37] shadow-warm-xs">
              <Users className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-baseline justify-between">
              <span className="font-mono tabular-nums text-2xl font-bold text-[#2E2018]">
                {unifiedList.length} <span className="text-[#7A6A5C] text-xs font-normal">Akun</span>
              </span>
              <span className="font-mono text-[11px] font-semibold text-[#6F4E37] px-2 py-0.5 rounded-full bg-[#FAF6EF] border border-[#E4D8C3]">
                SIMTIK & OS
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#EFE6D8] overflow-hidden flex border border-[#E4D8C3] shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
              <div
                className="h-full bg-[#FAF6EF]0"
                style={{ width: `${Math.round((totalStudents / (unifiedList.length || 1)) * 100)}%` }}
              />
              <div
                className="h-full bg-[#FAF6EF]0"
                style={{ width: `${Math.round((pureSystemCount / (unifiedList.length || 1)) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[#7A6A5C] font-mono text-[11px]">
              <span>{totalStudents} Mhs SIMTIK</span>
              <span>{pureSystemCount} Dosen & Lab</span>
            </div>
          </div>
        </div>

        {/* Card 2: Akun Riset & Prioritas Aktif */}
        <div className="bg-[#F3EBDD] rounded-2xl p-5 border border-[#E4D8C3] shadow-warm-xs motion-card flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-[#2E2018]">Akun Riset & Prioritas</span>
              <p className="text-[11px] text-[#7A6A5C]">QoS Dedicated GPU</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#B45309] shadow-warm-xs">
              <Zap className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-baseline justify-between">
              <span className="font-mono tabular-nums text-2xl font-bold text-[#B45309]">
                {boostedStudents} <span className="text-[#7A6A5C] text-xs font-normal">Akun</span>
              </span>
              <span className="font-mono text-[11px] font-semibold text-[#2E7D32] px-2 py-0.5 rounded-full bg-[#E8F5E9] border border-[#2E7D32]/30">
                Level 1 QoS
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#EFE6D8] overflow-hidden border border-[#E4D8C3] shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
              <div
                className="h-full bg-[#FEF3C7]0 motion-bar"
                style={{ width: `${slotUtilPct}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#7A6A5C]">
              <Layers className="w-3.5 h-3.5 text-[#6F4E37]" />
              <span className="truncate">Hak Akses Dedicated <code className="text-[#6F4E37] font-semibold">compute-level1</code></span>
            </div>
          </div>
        </div>

        {/* Card 3: Beban Komputasi GPU */}
        <div className="bg-[#F3EBDD] rounded-2xl p-5 border border-[#E4D8C3] shadow-warm-xs motion-card flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-[#2E2018]">Beban Komputasi GPU</span>
              <p className="text-[11px] text-[#7A6A5C]">2x RTX 5060 Ti (32 GB)</p>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-warm-xs ${
              totalActiveGpuUsers > 0
                ? 'bg-[#FAF6EF] text-[#6F4E37] border-[#E4D8C3]'
                : 'bg-[#FAF6EF] text-[#7A6A5C] border-[#E4D8C3]'
            }`}>
              <Cpu className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-baseline justify-between">
              <span className="font-mono tabular-nums text-2xl font-bold text-[#2E2018]">
                {totalActiveGpuUsers} <span className="text-[#7A6A5C] text-xs font-normal">Sesi Aktif</span>
              </span>
              <span className="font-mono text-[11px] font-semibold text-[#6F4E37] px-2 py-0.5 rounded-full bg-[#FAF6EF] border border-[#E4D8C3]">
                {(totalVramUsedMb / 1024).toFixed(1)} GB ({totalVramPct}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#EFE6D8] overflow-hidden border border-[#E4D8C3] shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
              <div
                className={`h-full motion-bar ${
                  totalVramPct >= 75
                    ? 'bg-rose-600'
                    : totalVramPct >= 40
                    ? 'bg-[#FEF3C7]0'
                    : 'bg-[#6F4E37]'
                }`}
                style={{ width: `${Math.max(totalVramPct, totalActiveGpuUsers > 0 ? 5 : 0)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[#7A6A5C] font-mono text-[11px]">
              <span>GPU 0: {((gpus?.[0]?.vram_used_mb || 0) / 1024).toFixed(1)}G</span>
              <span>GPU 1: {((gpus?.[1]?.vram_used_mb || 0) / 1024).toFixed(1)}G</span>
            </div>
          </div>
        </div>

        {/* Card 4: Peringatan Storage (Over Quota) */}
        <div className="bg-[#F3EBDD] rounded-2xl p-5 border border-[#E4D8C3] shadow-warm-xs motion-card flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-[#2E2018]">Peringatan Storage</span>
              <p className="text-[11px] text-[#7A6A5C]">Disk Limit Policy</p>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-warm-xs ${
              overQuotaCount > 0
                ? 'bg-[#FEE2E2] text-[#C53030] border-[#FCA5A5]'
                : 'bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]/30'
            }`}>
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-baseline justify-between">
              <span className={`font-mono tabular-nums text-2xl font-bold ${overQuotaCount > 0 ? 'text-[#C53030]' : 'text-[#2E2018]'}`}>
                {overQuotaCount} <span className="text-[#7A6A5C] text-xs font-normal">Akun</span>
              </span>
              {overQuotaCount > 0 ? (
                <span className="font-mono text-[11px] font-semibold text-[#C53030] bg-[#FEE2E2] px-2 py-0.5 rounded-full border border-[#FCA5A5]">
                  Over Quota
                </span>
              ) : (
                <span className="font-mono text-[11px] font-semibold text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full border border-[#2E7D32]/30">
                  Normal
                </span>
              )}
            </div>
            <div className="w-full h-2 rounded-full bg-[#EFE6D8] overflow-hidden border border-[#E4D8C3] shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
              <div
                className={`h-full motion-bar ${overQuotaCount > 0 ? 'bg-rose-600' : 'bg-emerald-600'}`}
                style={{ width: overQuotaCount > 0 ? '100%' : '15%' }}
              />
            </div>
            <div className={`flex items-center gap-1.5 text-[11px] font-mono ${overQuotaCount > 0 ? 'text-[#C53030] font-semibold' : 'text-[#7A6A5C]'}`}>
              <HardDrive className="w-3.5 h-3.5" />
              <span>{overQuotaCount > 0 ? 'Batas soft quota terlampaui' : 'Semua kuota aman terisolasi'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar & Search Module */}
      <div className="bg-white rounded-xl p-3.5 border border-[#E4D8C3] shadow-warm-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Segmented Controls */}
        <div className="flex flex-wrap items-center gap-1 bg-[#EFE6D8] p-1 rounded-xl border border-[#E4D8C3] font-mono text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === 'all'
                ? 'bg-white text-[#6F4E37] font-bold shadow-warm-xs border border-[#E4D8C3]'
                : 'text-[#3B2E26] hover:text-[#2E2018]'
            }`}
            type="button"
          >
            Semua ({unifiedList.length})
          </button>
          <button
            onClick={() => setFilterType('mhs')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === 'mhs'
                ? 'bg-white text-[#6F4E37] font-bold shadow-warm-xs border border-[#E4D8C3]'
                : 'text-[#3B2E26] hover:text-[#2E2018]'
            }`}
            type="button"
          >
            Mahasiswa ({totalStudents})
          </button>
          <button
            onClick={() => setFilterType('dosen')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === 'dosen'
                ? 'bg-white text-[#6F4E37] font-bold shadow-warm-xs border border-[#E4D8C3]'
                : 'text-[#3B2E26] hover:text-[#2E2018]'
            }`}
            type="button"
          >
            Dosen & Riset ({pureSystemCount})
          </button>
          <button
            onClick={() => setFilterType('overquota')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === 'overquota'
                ? 'bg-white text-[#C53030] font-bold shadow-warm-xs border border-[#FCA5A5]'
                : 'text-[#3B2E26] hover:text-[#C53030]'
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
            className="bg-[#FAF6EF] border border-[#E4D8C3] text-[#2E2018] text-xs font-mono rounded-xl py-1.5 px-3 focus:outline-none focus:border-[#6F4E37] focus:bg-white transition-all shadow-warm-xs"
          >
            <option value="all">Semua Angkatan</option>
            {availableCohorts.map(c => (
              <option key={c} value={c}>Angkatan 20{c}</option>
            ))}
          </select>

          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7A6A5C]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari NIM, nama, atau IP…"
              className="w-full bg-[#FAF6EF] border border-[#E4D8C3] focus:border-[#6F4E37] focus:bg-white rounded-xl py-1.5 pl-8.5 pr-3 text-xs font-mono text-[#2E2018] placeholder:text-[#7A6A5C] outline-none transition-all shadow-warm-xs"
            />
          </div>
        </div>
      </div>

      {/* Precision 9-Column Data Table Container */}
      <div className="bg-white rounded-xl shadow-warm-xs overflow-hidden border border-[#E4D8C3]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1360px]">
            <thead>
              <tr className="bg-[#FAF6EF]/90 text-[#3B2E26] font-mono text-xs font-semibold border-b border-[#E4D8C3]">
                <th className="py-3.5 px-5" scope="col">Akun & Pengguna</th>
                <th className="py-3.5 px-4" scope="col">Identitas & Status</th>
                <th className="py-3.5 px-4" scope="col">Role / Hak Akses</th>
                <th className="py-3.5 px-4" scope="col">QoS & Cgroup Slice</th>
                <th className="py-3.5 px-4" scope="col">Alokasi Hardware & Timer</th>
                <th className="py-3.5 px-4" scope="col">Penggunaan RAM</th>
                <th className="py-3.5 px-4" scope="col">Beban GPU (VRAM)</th>
                <th className="py-3.5 px-4" scope="col">Storage & Quota</th>
                <th className="py-3.5 px-5 text-right" scope="col">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4D8C3] font-mono text-xs">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-[#7A6A5C] font-mono">
                    Tidak ada akun yang sesuai dengan filter atau kata kunci pencarian.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  if (item.type === 'student') {
                    const ramMaxMb = item.is_priority ? 61440 : (item.ram_max_mb || 6144);
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
                        className={`hover:bg-[#EFE6D8]/40 motion-row group ${
                          item.is_priority ? 'bg-[#FAF6EF]/20' : 'bg-white'
                        }`}
                      >
                        {/* 1. Akun & Pengguna */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-warm-xs border ${
                              item.is_priority
                                ? 'bg-[#FAF6EF] text-[#6F4E37] border-[#E4D8C3]'
                                : 'bg-[#EFE6D8] text-[#3B2E26] border-[#E4D8C3]'
                            }`}>
                              {initials}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 group/name">
                                <span className="font-bold text-xs text-[#2E2018] truncate" title={item.nama || 'Mahasiswa SIMTIK'}>
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
                                    className="p-1 text-[#7A6A5C] hover:text-[#6F4E37] hover:bg-[#EFE6D8] rounded-lg transition-all"
                                    title="Ubah Nama Mahasiswa"
                                    type="button"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <span className="font-mono text-xs text-[#7A6A5C] truncate">
                                mhs.{item.nim}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Identitas & Status */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-xs text-[#6F4E37] font-bold tracking-tight">
                              {item.nim}
                            </span>
                            {item.is_active ? (
                              item.is_online ? (
                                <div className="flex items-center gap-1.5 font-mono text-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#E8F5E9]0 pulse-dot"></span>
                                  <span className="text-[#2E7D32] font-bold">Online</span>
                                  {item.active_ip && (
                                    <span className="text-[#7A6A5C] text-[10px]">({item.active_ip})</span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 font-mono text-xs text-[#7A6A5C]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                  <span>⚪ Offline</span>
                                </div>
                              )
                            ) : (
                              <div className="flex items-center gap-1.5 font-mono text-xs text-[#C53030] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FEE2E2]0"></span>
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
                              className="bg-white text-[#2E2018] text-xs font-mono rounded-lg px-2 py-1 focus:outline-none border border-[#E4D8C3] shadow-warm-xs cursor-pointer hover:border-blue-300 transition-colors"
                            >
                              <option value="mahasiswa">Mahasiswa</option>
                              <option value="aslab">Aslab</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold border ${
                              userRole === 'admin'
                                ? 'bg-[#FAF6EF] text-[#6F4E37] border-[#E4D8C3]'
                                : userRole === 'aslab'
                                ? 'bg-[#FAF6EF] text-[#6F4E37] border-[#E4D8C3]'
                                : 'bg-[#EFE6D8] text-[#3B2E26] border-[#E4D8C3]'
                            }`}>
                              {userRole}
                            </span>
                          )}
                        </td>

                        {/* 4. QoS & Cgroup Slice */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5">
                            {item.is_priority ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FAF6EF] text-[#6F4E37] border border-[#E4D8C3] w-fit shadow-warm-xs">
                                <Zap className="w-3 h-3 text-[#6F4E37]" />
                                <span className="font-mono text-xs font-bold">Level 1 (Priority)</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFE6D8] text-[#3B2E26] border border-[#E4D8C3] w-fit">
                                <span className="font-mono text-xs font-medium">Level 2 (Standard)</span>
                              </div>
                            )}
                            <span className="font-mono text-[10px] text-[#7A6A5C] mt-0.5">
                              {item.is_priority ? 'compute-level1.slice' : 'compute-level2.slice'}
                            </span>
                          </div>
                        </td>

                        {/* 5. Alokasi Hardware & Timer */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-xs text-[#2E2018] font-semibold">
                              {item.is_priority ? 'GPU 0 (Dedicated) | 20 Cores | 60GB' : 'GPU 1 (Shared Pool) | 2 Cores | 6GB'}
                            </span>
                            {item.is_priority && item.priority_expires_at ? (
                              <div className="inline-flex items-center gap-1 text-[#B45309] font-mono text-xs font-bold">
                                <Clock className="w-3 h-3" />
                                <span>Sisa: <LiveCountdown expiresAt={item.priority_expires_at} /></span>
                              </div>
                            ) : (
                              <span className="font-mono text-xs text-[#7A6A5C]">
                                {item.is_online ? 'Fair-share FairQ active' : 'Tidak ada proses aktif'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Penggunaan RAM */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 w-28">
                            <div className="flex justify-between font-mono text-xs">
                              <span className="text-[#2E2018] font-bold">{ramUsedGb} GB</span>
                              <span className="text-[#7A6A5C]">/ {ramMaxGb} GB</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[#EFE6D8] overflow-hidden border border-[#E4D8C3]/50 shadow-inner">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  ramPct >= 85 ? 'bg-[#FEE2E2]0' : ramPct >= 60 ? 'bg-[#FEF3C7]0' : 'bg-[#FAF6EF]0'
                                }`}
                                style={{ width: `${ramPct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* 7. Beban GPU (VRAM) */}
                        <td className="py-3.5 px-4">
                          {renderGpuVramCell(item)}
                        </td>

                        {/* 8. Storage & Quota */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 w-32">
                            <div className="flex justify-between font-mono text-xs">
                              <span className={`font-bold ${item.is_over_quota ? 'text-[#C53030]' : 'text-[#2E2018]'}`}>
                                {diskUsedGb} GB
                              </span>
                              <span className="text-[#7A6A5C]">/ {diskQuotaGb} GB</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[#EFE6D8] overflow-hidden border border-[#E4D8C3]/50 shadow-inner">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  item.is_over_quota
                                    ? 'bg-[#FEE2E2]0'
                                    : diskPct >= 80
                                    ? 'bg-[#FEF3C7]0'
                                    : 'bg-[#FAF6EF]0'
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

                        {/* 8. Aksi Manajemen with 3D Tactile Buttons */}
                        <td className="py-3.5 px-5 text-right">
                          {!isAdmin ? (
                            <span className="font-mono text-xs text-[#7A6A5C]">// READ_ONLY</span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                              {isSuperAdmin && (
                                item.is_priority ? (
                                  <button
                                    onClick={() => handleUnboost(item.nim)}
                                    className="px-2.5 py-1 rounded-lg bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] hover:bg-amber-100 shadow-warm-xs active:translate-y-0.5 transition-all text-xs font-mono font-semibold"
                                    title="Kembalikan ke Level 2 Standard"
                                    type="button"
                                  >
                                    ↺ Revert
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setBoostModal({ isOpen: true, nim: item.nim, nama: item.nama || '', hours: 4, reason: '' })}
                                    disabled={isSlotsFull}
                                    className="px-2.5 py-1 rounded-lg bg-[#6F4E37] hover:bg-[#4A3426] text-white shadow-warm-xs transition-colors text-xs font-mono font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                                    title={isSlotsFull ? 'Slot Prioritas GPU 0 Penuh' : 'Boost ke Level 1 Dedicated'}
                                    type="button"
                                  >
                                    ⚡ Boost
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
                                className="p-1.5 rounded-lg bg-white hover:bg-[#EFE6D8] text-[#3B2E26] hover:text-[#6F4E37] border border-[#E4D8C3] shadow-warm-xs active:translate-y-0.5 transition-all"
                                title="Ubah Nama Lengkap"
                                type="button"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Kill Sesi */}
                              <button
                                onClick={() => onKillAllUser(`m${item.nim}`)}
                                disabled={!item.is_online}
                                className="p-1.5 rounded-lg bg-[#FEE2E2] text-[#C53030] hover:bg-[#FEE2E2] border border-[#FCA5A5] shadow-warm-xs active:translate-y-0.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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
                                    className="p-1.5 rounded-lg bg-white hover:bg-[#FEF3C7] text-[#3B2E26] hover:text-[#B45309] border border-[#E4D8C3] shadow-warm-xs active:translate-y-0.5 transition-all"
                                    title="Bersihkan Cache Disk"
                                    type="button"
                                  >
                                    <Eraser className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleActive(item.nim)}
                                    className="p-1.5 rounded-lg bg-white hover:bg-[#EFE6D8] text-[#3B2E26] hover:text-[#2E2018] border border-[#E4D8C3] shadow-warm-xs active:translate-y-0.5 transition-all"
                                    title={item.is_active ? 'Blokir Akun' : 'Aktifkan Akun'}
                                    type="button"
                                  >
                                    {item.is_active ? <UserX className="w-3.5 h-3.5 text-[#C53030]" /> : <UserCheck className="w-3.5 h-3.5 text-[#2E7D32]" />}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(item.nim)}
                                    className="p-1.5 rounded-lg bg-white hover:bg-[#FEE2E2] text-[#3B2E26] hover:text-[#C53030] border border-[#E4D8C3] shadow-warm-xs active:translate-y-0.5 transition-all"
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
                  const ramMaxMb = isRiset ? 61440 : (item.ram_max_mb || 6144);
                  const ramUsedGb = ((item.ram_used_mb || 0) / 1024).toFixed(1);
                  const ramMaxGb = (ramMaxMb / 1024).toFixed(0);
                  const ramPct = isOnline ? Math.min(100, Math.round(((item.ram_used_mb || 0) / ramMaxMb) * 100)) : 0;

                  const diskUsedGb = ((item.disk_used_mb || 0) / 1024).toFixed(1);
                  const diskQuotaGb = item.disk_quota_gb || (isRiset ? 50 : 10);
                  const diskPct = Math.min(100, Math.round(((item.disk_used_mb || 0) / (diskQuotaGb * 1024)) * 100));

                  return (
                    <tr
                      key={`sys-${item.username}`}
                      className="hover:bg-[#EFE6D8]/40 motion-row bg-[#FAF6EF]/30 group"
                    >
                      {/* 1. Akun & Pengguna */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-warm-xs border ${
                            isRiset
                              ? 'bg-[#FAF6EF] text-[#6F4E37] border-[#E4D8C3]'
                              : 'bg-[#FAF6EF] text-[#6F4E37] border-[#E4D8C3]'
                          }`}>
                            {isRiset ? <Database className="w-4 h-4" /> : <Server className="w-4 h-4" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-xs text-[#2E2018] truncate flex items-center gap-2">
                              {item.username}
                              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold border ${
                                isRiset
                                  ? 'bg-[#FAF6EF] text-[#6F4E37] border-[#E4D8C3]'
                                  : 'bg-[#FAF6EF] text-[#6F4E37] border-[#E4D8C3]'
                              }`}>
                                {isRiset ? 'RISET & SKRIPSI' : 'DOSEN / PELATIHAN'}
                              </span>
                            </span>
                            <span className="font-mono text-xs text-[#7A6A5C] truncate">
                              {isRiset ? 'Akun Riset & Skripsi Mahasiswa/Dosen' : 'Akun Dosen & Pelatihan Praktikum'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Identitas & Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs text-[#3B2E26] font-bold tracking-tight">
                            {item.username}
                          </span>
                          {isOnline ? (
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#E8F5E9]0 pulse-dot"></span>
                              <span className="text-[#2E7D32] font-bold">Online</span>
                              <span className="text-[#7A6A5C] text-[10px]">({item.active_ip || '127.0.0.1'})</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 font-mono text-xs text-[#7A6A5C]">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                              <span>⚪ Offline</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. Role / Hak Akses */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold border ${
                          isRiset
                            ? 'bg-[#FAF6EF] text-[#6F4E37] border-[#E4D8C3]'
                            : 'bg-[#EFE6D8] text-[#3B2E26] border-[#E4D8C3]'
                        }`}>
                          {isRiset ? 'Dosen Riset' : 'Batch Service'}
                        </span>
                      </td>

                      {/* 4. QoS & Cgroup Slice */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          {isRiset ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FAF6EF] text-[#6F4E37] border border-[#E4D8C3] w-fit shadow-warm-xs">
                              <Zap className="w-3 h-3 text-[#6F4E37]" />
                              <span className="font-mono text-xs font-bold">Level 1 (Priority)</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFE6D8] text-[#3B2E26] border border-[#E4D8C3] w-fit">
                              <span className="font-mono text-xs font-medium">Level 2 (Standard)</span>
                            </div>
                          )}
                          <span className="font-mono text-[10px] text-[#7A6A5C] mt-0.5">
                            {isRiset ? 'compute-level1.slice' : 'compute-level2.slice'}
                          </span>
                        </div>
                      </td>

                      {/* 5. Alokasi Hardware & Timer */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs text-[#2E2018] font-semibold">
                            {isRiset ? 'GPU 0 (Dedicated) | 20 Cores | 60GB' : 'GPU 1 (Shared Pool) | 2 Cores | 6GB'}
                          </span>
                          <span className="font-mono text-xs text-[#7A6A5C]">
                            {isRiset ? 'Riset Dosen Tetap' : 'Batch Job Pipeline'}
                          </span>
                        </div>
                      </td>

                      {/* 6. Penggunaan RAM */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 w-28">
                          <div className="flex justify-between font-mono text-xs">
                            <span className="text-[#2E2018] font-bold">{ramUsedGb} GB</span>
                            <span className="text-[#7A6A5C]">/ {ramMaxGb} GB</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#EFE6D8] overflow-hidden border border-[#E4D8C3]/50 shadow-inner">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                ramPct >= 85 ? 'bg-[#FEE2E2]0' : 'bg-[#FAF6EF]0'
                              }`}
                              style={{ width: `${ramPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 7. Beban GPU (VRAM) */}
                      <td className="py-3.5 px-4">
                        {renderGpuVramCell(item)}
                      </td>

                      {/* 8. Storage & Quota */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 w-32">
                          <div className="flex justify-between font-mono text-xs">
                            <span className={`font-bold ${item.is_over_quota ? 'text-[#C53030]' : 'text-[#2E2018]'}`}>
                              {diskUsedGb} GB
                            </span>
                            <span className="text-[#7A6A5C]">/ {diskQuotaGb} GB</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#EFE6D8] overflow-hidden border border-[#E4D8C3]/50 shadow-inner">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                item.is_over_quota
                                  ? 'bg-[#FEE2E2]0'
                                  : 'bg-[#FAF6EF]0'
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
                      <td className="py-3.5 px-5 text-right">
                        {!isAdmin ? (
                          <span className="font-mono text-xs text-[#7A6A5C]">// SYSTEM_PROTECTED</span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onKillAllUser(item.username)}
                              disabled={!isOnline}
                              className="p-1.5 rounded-lg bg-[#FEE2E2] text-[#C53030] hover:bg-[#FEE2E2] border border-[#FCA5A5] shadow-warm-xs active:translate-y-0.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Kill Seluruh Proses Akun"
                              type="button"
                            >
                              <Square className="w-3.5 h-3.5 fill-current" />
                            </button>
                            {isSuperAdmin && (
                              <button
                                onClick={() => setResetModal({ isOpen: true, username: item.username, newPassword: '', isSubmitting: false })}
                                className="p-1.5 rounded-lg bg-white hover:bg-[#EFE6D8] text-[#3B2E26] hover:text-[#6F4E37] border border-[#E4D8C3] shadow-warm-xs active:translate-y-0.5 transition-all"
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
        <div className="fixed inset-0 z-50 bg-[#2E2018]/60 flex items-center justify-center p-4">
          <div className="bg-[#FAF6EF] border border-[#E4D8C3] rounded-xl shadow-warm-modal p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4D8C3]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF6EF] border border-[#E4D8C3] flex items-center justify-center text-[#6F4E37] shadow-warm-xs">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#2E2018]">Boost Akses ke GPU 0 (Level 1)</h3>
                  <p className="text-xs text-[#7A6A5C] font-mono">NIM: {boostModal.nim} ({boostModal.nama})</p>
                </div>
              </div>
              <button
                onClick={() => setBoostModal({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' })}
                className="text-[#7A6A5C] hover:text-[#3B2E26] p-1 rounded-lg hover:bg-[#EFE6D8] transition-colors"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBoost} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#3B2E26] font-semibold mb-2">
                  Durasi Hak Akses Dedicated GPU 0:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 4, 8, 12, 24].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setBoostModal(prev => ({ ...prev, hours: h }))}
                      className={`py-2 rounded-xl text-xs font-mono font-semibold transition-all border ${
                        boostModal.hours === h
                          ? 'bg-[#6F4E37] text-white border-blue-700 shadow-warm-xs'
                          : 'bg-white border-[#E4D8C3] text-[#3B2E26] hover:bg-[#FAF6EF] shadow-warm-xs'
                      }`}
                    >
                      {h} Jam
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#3B2E26] font-semibold mb-1.5">
                  Alasan / Keterangan Boost:
                </label>
                <input
                  type="text"
                  placeholder="Misal: Training Model Skripsi ResNet-50"
                  value={boostModal.reason}
                  onChange={(e) => setBoostModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full bg-[#FAF6EF] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#2E2018] border border-[#E4D8C3] focus:outline-none focus:border-[#6F4E37] focus:bg-white transition-all shadow-inner"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF6EF]/70 text-xs font-mono text-blue-900 border border-[#E4D8C3] flex flex-col gap-1">
                <span className="text-[#6F4E37] font-bold">Benefit Level 1 QoS:</span>
                <span>• Akses Dedicated GPU 0 (Direct VRAM Mapping)</span>
                <span>• Jatah RAM Host ditingkatkan hingga 60 GB (Cgroup isolated)</span>
                <span>• Prioritas CPU Scheduler CFS 20 Cores</span>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setBoostModal({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' })}
                  className="flex-1 py-2.5 rounded-xl bg-white hover:bg-[#FAF6EF] text-[#3B2E26] border border-[#E4D8C3] font-mono text-xs font-semibold shadow-warm-xs active:translate-y-0.5 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#6F4E37] hover:bg-[#4A3426] text-white font-mono text-xs font-medium shadow-warm-xs transition-colors"
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
        <div className="fixed inset-0 z-50 bg-[#2E2018]/60 flex items-center justify-center p-4">
          <div className="bg-[#FAF6EF] border border-[#E4D8C3] rounded-xl shadow-warm-modal p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4D8C3]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF6EF] border border-[#E4D8C3] flex items-center justify-center text-[#6F4E37] shadow-warm-xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#2E2018]">Reset Password Linux OS</h3>
                  <p className="text-xs text-[#7A6A5C] font-mono">User: {resetModal.username}</p>
                </div>
              </div>
              <button
                onClick={() => setResetModal({ isOpen: false, username: '', newPassword: '', isSubmitting: false })}
                className="text-[#7A6A5C] hover:text-[#3B2E26] p-1 rounded-lg hover:bg-[#EFE6D8] transition-colors"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#3B2E26] font-semibold mb-1.5">
                  Password Linux Baru:
                </label>
                <input
                  type="password"
                  placeholder="Masukkan password baru..."
                  value={resetModal.newPassword}
                  onChange={(e) => setResetModal(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  className="w-full bg-[#FAF6EF] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#2E2018] border border-[#E4D8C3] focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModal({ isOpen: false, username: '', newPassword: '', isSubmitting: false })}
                  className="flex-1 py-2.5 rounded-xl bg-white hover:bg-[#FAF6EF] text-[#3B2E26] border border-[#E4D8C3] font-mono text-xs font-semibold shadow-warm-xs active:translate-y-0.5 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetModal.isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#6F4E37] hover:bg-[#4A3426] text-white font-mono text-xs font-medium shadow-warm-xs transition-colors disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2E2018]/60 animate-fade-in">
          <div className="bg-white rounded-xl border border-[#E4D8C3] shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-[#E4D8C3] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FAF6EF] text-[#6F4E37] flex items-center justify-center border border-[#E4D8C3]">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#2E2018]">Ubah Identitas Mahasiswa</h3>
                  <p className="font-mono text-xs text-[#7A6A5C]">NIM: {editNameModal.nim}</p>
                </div>
              </div>
              <button
                onClick={() => setEditNameModal({ isOpen: false, nim: null, currentName: '', newName: '', isSubmitting: false })}
                className="text-[#7A6A5C] hover:text-[#3B2E26] p-1 rounded-lg hover:bg-[#EFE6D8] transition-colors"
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
                <label className="font-mono text-xs font-semibold text-[#3B2E26]">
                  Nama Lengkap Sesuai SIMTIK
                </label>
                <input
                  type="text"
                  value={editNameModal.newName}
                  onChange={(e) => setEditNameModal(prev => ({ ...prev, newName: e.target.value }))}
                  placeholder="Masukkan nama lengkap mahasiswa..."
                  className="w-full px-3.5 py-2 text-xs bg-[#FAF6EF] border border-[#E4D8C3] rounded-xl focus:outline-none focus:border-[#6F4E37] focus:bg-white transition-all font-sans"
                  autoFocus
                  required
                />
                <span className="text-[11px] font-mono text-[#7A6A5C]">
                  Nama ini akan ditampilkan pada Dashboard Monitoring Lab AI & Buku Rekap.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E4D8C3]">
                <button
                  type="button"
                  onClick={() => setEditNameModal({ isOpen: false, nim: null, currentName: '', newName: '', isSubmitting: false })}
                  className="px-4 py-2 text-xs font-mono text-[#3B2E26] hover:bg-[#EFE6D8] rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editNameModal.isSubmitting}
                  className="px-4 py-2 text-xs font-mono font-bold text-white bg-[#6F4E37] hover:bg-[#4A3426] disabled:opacity-50 rounded-xl shadow-warm-xs transition-all flex items-center gap-1.5"
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
