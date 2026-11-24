import React, { memo, useState } from 'react';
import { 
  Cpu, HardDrive, ShieldCheck, DatabaseBackup, Loader2, Layers, 
  Zap, Users, UserCheck, AlertTriangle, Check, X, RotateCcw
} from 'lucide-react';

function SystemOverview({ 
  system = {}, 
  gpus = [], 
  users = [], 
  students = [], 
  onTriggerBackup, 
  onOpenBackupModal,
  isBackingUp, 
  backups = [], 
  isAdmin,
  level2Slots = {},
  onEmergencyReleaseIdle,
  onSwitchMode,
  isSwitchingMode = false,
  isLive = true,
  staleSeconds = 0,
}) {
  const [isReleasing, setIsReleasing] = useState(false);

  if (!system) return null;

  const cpu = system?.cpu || {};
  const mem = system?.memory || {};
  // Backend mengirim `system.disks.{root,home}`; pertahankan fallback `system.disk`
  // agar dashboard tetap kompatibel dengan payload versi lama.
  const disks = system?.disks || {};
  const disk = system?.disk || disks.home || disks.root || {};

  const cpuPercent = Math.round(cpu.percent || 0);
  const memPercent = Math.round(mem.percent || 0);
  const memUsedGb = (mem.used_gb || 0).toFixed(1);
  const memTotalGb = (mem.total_gb || 0).toFixed(0);

  const diskPercent = Math.round(disk.percent || 0);
  const diskUsedGb = Number(disk.used_gb || 0);
  const diskTotalGb = Number(disk.total_gb || 0);
  const diskFreeGb = disk.free_gb != null
    ? Number(disk.free_gb)
    : Math.max(0, diskTotalGb - diskUsedGb);

  // Calculate cluster totals
  const totalGpus = gpus.length;
  const activeGpus = gpus.filter(g => (g.compute_percent || 0) > 0 || (g.processes?.length || 0) > 0).length;
  const totalGpuProcesses = gpus.reduce((acc, g) => acc + (g.processes?.length || 0), 0);
  const totalVramUsedMb = gpus.reduce((acc, g) => acc + (g.vram_used_mb || 0), 0);
  const totalVramTotalMb = gpus.reduce((acc, g) => acc + (g.vram_total_mb || 16384), 0);
  const totalVramPct = totalVramTotalMb > 0 ? Math.round((totalVramUsedMb / totalVramTotalMb) * 100) : 0;

  // Active lab users
  const activeSystemUsers = (users || []).filter(u => u.gpu_processes > 0 || u.memory_mb > 500);
  const onlineStudentsCount = (students || []).filter(s => s.is_online).length;
  const totalOnlineCount = onlineStudentsCount + activeSystemUsers.length;
  const priorityStudent = (students || []).find(s => s.is_priority);

  // Overall Cluster Health
  const isCpuHigh = cpuPercent >= 90;
  const isMemHigh = memPercent >= 90;
  const isVramHigh = totalVramPct >= 95;
  const isDiskHigh = diskPercent >= 90;

  let healthLabel = 'Klaster Beroperasi Normal';
  let healthClass = 'border-emerald-200 bg-emerald-50 text-emerald-700';
  let dotClass = 'bg-emerald-500';

  if (isCpuHigh || isMemHigh || isVramHigh || isDiskHigh) {
    healthLabel = 'Beban Komputasi Tinggi';
    healthClass = 'border-amber-200 bg-amber-50 text-amber-700';
    dotClass = 'bg-amber-500';
  }

  const latestBackup = backups && backups.length > 0 ? backups[0] : null;

  // Level 2 practical slots & modes (Mode 30 vs Mode 60).
  const labMode = level2Slots?.lab_mode || 'boost30';
  const isMode30 = labMode === 'boost30' || labMode === 'ai';
  const gpuBoostAllowed = level2Slots?.gpu_boost_allowed ?? isMode30;
  const maxSlots = level2Slots?.max_slots || (isMode30 ? 30 : 60);
  const activeSlots = level2Slots?.active_count ?? 0;
  const activeBypass = level2Slots?.active_bypass_count ?? 0;
  const isOverCapacity = activeSlots > maxSlots;
  const availableSlots = level2Slots?.available_slots ?? Math.max(0, maxSlots - activeSlots);
  const slotPercent = Math.min(100, Math.round((activeSlots / maxSlots) * 100));
  const idleMinutesSetting = level2Slots?.idle_release_minutes || 15;

  // GPU Boost pool (GPU 1). Nilai agregat, tanpa identitas di endpoint publik.
  const gpuBoostMax = Number(level2Slots?.gpu_boost_max ?? 3);
  const gpuBoostActive = Number(level2Slots?.gpu_boost_active ?? 0);
  const gpuBoostEnabled = Boolean(level2Slots?.gpu_boost_enabled) && gpuBoostAllowed;
  const gpuBoostVramMb = Number(level2Slots?.gpu_boost_vram_mb ?? 4800);
  const gpuBoostPercent = gpuBoostMax > 0 ? Math.min(100, Math.round((gpuBoostActive / gpuBoostMax) * 100)) : 0;

  const handleReleaseClick = async () => {
    if (!isAdmin || isReleasing) return;
    if (!confirm(`Bebaskan sesi mahasiswa praktikum yang idle (≥${idleMinutesSetting} menit komputasi 0% / ditinggalkan)?\nAkun Dosen, Aslab, dan Mahasiswa Riset (Level 1) tidak akan terpengaruh.`)) return;
    
    setIsReleasing(true);
    try {
      if (onEmergencyReleaseIdle) {
        await onEmergencyReleaseIdle();
      }
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 font-sans">
      {/* Header bar */}
      <div className="surface-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="academic-eyebrow">Telemetri Klaster</span>
          <h1 className="font-academic text-xl sm:text-2xl text-slate-900 leading-tight">
            Ringkasan Sistem &amp; Klaster Komputasi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Status sumber daya Workstation DGX · Lab Komputasi UMPO
          </p>
        </div>

        {/* Cluster Health Banner */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono tabular-nums font-medium ${healthClass}`}>
          <span className={`w-1.5 h-1.5 rounded-full live-ring ${dotClass}`} />
          <span className="font-semibold">{healthLabel}</span>
        </div>
      </div>

      {/* Profil Operasional (Mode 30 vs 60) */}
      <div className="surface-card p-4 sm:p-5 flex flex-col gap-4">
        {/* Row 1: Profil Lab & Segmented Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-700" />
              Profil Lab:
            </span>

            {/* Mode Indicator Badge */}
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${
              isMode30
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-sky-50 text-sky-700 border-sky-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isMode30 ? 'bg-emerald-500' : 'bg-sky-500'}`} />
              {isMode30 ? 'Mode 30 (GPU Boost)' : 'Mode 60 (CPU Only)'}
            </span>

            {/* Segmented Switcher for Aslab/Admin */}
            {isAdmin && (
              <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => !isMode30 && onSwitchMode && onSwitchMode('boost30')}
                  disabled={isSwitchingMode}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all ${
                    isMode30
                      ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200/60'
                      : 'text-slate-500 hover:text-slate-900 cursor-pointer'
                  } disabled:opacity-50`}
                  title="Mode 30: Maks 30 slot Level 2, GPU Boost aktif (maks 3 slot GPU 1)"
                >
                  Mode 30
                </button>
                <button
                  type="button"
                  onClick={() => isMode30 && onSwitchMode && onSwitchMode('cpu60')}
                  disabled={isSwitchingMode}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all ${
                    !isMode30
                      ? 'bg-white text-sky-700 shadow-xs border border-sky-200/60'
                      : 'text-slate-500 hover:text-slate-900 cursor-pointer'
                  } disabled:opacity-50`}
                  title="Mode 60: Maks 60 slot Level 2, GPU Boost dinonaktifkan"
                >
                  Mode 60
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold ${
                isLive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={
                isLive
                  ? 'Data telemetri diperbarui real-time via WebSocket'
                  : `Data terakhir ${staleSeconds} detik lalu. Sinkronisasi HTTP otomatis tiap 10 detik.`
              }
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {isLive
                ? 'LIVE'
                : staleSeconds > 15
                ? `TERTUNDA ${staleSeconds}s`
                : 'SINKRON HTTP'}
            </span>
            <span className="text-xs font-mono text-slate-500">
              {isMode30 ? '• 2 Core · 3.0 GB RAM · GPU 1 Boost 3 Slot' : '• 1 Core · 1.5 GB RAM · CPU-only murni'}
            </span>
          </div>
        </div>

        {/* Row 2: Slot Progress & Emergency Release */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isOverCapacity
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : activeSlots >= maxSlots - 1
                ? 'bg-rose-50 text-rose-600 border-rose-200' 
                : activeSlots >= maxSlots * 0.7 
                ? 'bg-amber-50 text-amber-600 border-amber-200' 
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}>
              {isOverCapacity ? <AlertTriangle className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-sans text-sm font-bold text-slate-900">
                  {isMode30 ? 'Slot Praktikum Kelas (Mode 30 · GPU Boost)' : 'Slot Praktikum Kelas (Mode 60 · CPU-only)'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  isOverCapacity
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : activeSlots >= maxSlots 
                    ? 'bg-rose-50 text-rose-600 border-rose-200' 
                    : activeSlots >= maxSlots * 0.7 
                    ? 'bg-amber-50 text-amber-600 border-amber-200' 
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`}>
                  {isOverCapacity
                    ? `OVER CAPACITY (${activeSlots}/${maxSlots})`
                    : activeSlots >= maxSlots 
                    ? 'KUOTA PENUH' 
                    : `${availableSlots} SLOT TERSEDIA`}
                </span>
              </div>
              
              <div className="flex items-center gap-3 mt-1.5 flex-wrap sm:flex-nowrap">
                <div className="meter-track w-48 sm:w-64 h-2 rounded-full">
                  <div 
                    className={`meter-fill h-full rounded-full ${
                      isOverCapacity || activeSlots >= maxSlots - 1 ? 'bg-rose-600' : activeSlots >= maxSlots * 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(slotPercent, 3)}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                  {activeSlots} <span className="text-slate-500 font-normal">/ {maxSlots} Sesi</span>
                </span>
                {activeBypass > 0 && (
                  <span
                    className="text-[10px] font-mono text-slate-500 hidden md:inline"
                    title="Sesi Admin, Aslab, dan mahasiswa Level 1 (prioritas riset) tidak memakai kuota praktikum."
                  >
                    • {activeBypass} sesi admin/aslab (tidak dihitung)
                  </span>
                )}
                <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                  • Jatah {isMode30 ? '2 Core · 3.0 GB RAM · GPU via Boost (Maks 3)' : '1 Core · 1.5 GB RAM · CPU-only (Boost dikunci)'}
                </span>
              </div>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={handleReleaseClick}
              disabled={isReleasing || activeSlots === 0}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold font-mono bg-slate-900 hover:bg-slate-800 text-white border border-slate-950 shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              type="button"
              title={`Hentikan sesi mahasiswa praktikum yang idle (≥${idleMinutesSetting} menit) untuk membuka slot antrean`}
            >
              {isReleasing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Membebaskan...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Bebaskan Slot Idle</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Row 3: Kapasitas & Batasan Beban Kerja Teknis */}
        <div className={`p-3 rounded-xl border text-xs flex flex-col md:flex-row md:items-start gap-3 ${
          isMode30
            ? 'bg-emerald-50/40 border-emerald-200/70 text-emerald-950'
            : 'bg-sky-50/40 border-sky-200/70 text-sky-950'
        }`}>
          <div className="flex items-center gap-1.5 font-bold shrink-0 text-slate-800">
            <Cpu className="w-3.5 h-3.5 text-slate-600" />
            <span>Kapasitas Spesifikasi {isMode30 ? 'Mode 30 (2 Core · 3.0 GB)' : 'Mode 60 (1 Core · 1.5 GB)'}:</span>
          </div>
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-2.5 text-[11px] leading-relaxed text-slate-700 font-sans">
            <div className="flex items-start gap-1.5">
              <span className="font-bold text-emerald-700 shrink-0 flex items-center gap-0.5">
                <Check className="w-3 h-3 text-emerald-600" />
                Mampu:
              </span>
              <span>
                {isMode30
                  ? 'Analisis data menengah (Pandas/Numpy), Machine Learning klasik (Scikit-Learn/XGBoost), OpenCV, multi-core (2 Core). Opsi GPU Boost (VRAM 4.8 GB) untuk model AI kecil.'
                  : 'Scripting & pemrograman umum (Python/C/Java/Bash), algoritma standar, struktur data, pengolahan file CSV/JSON kecil (< 50 MB), visualisasi data sederhana.'}
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="font-bold text-rose-700 shrink-0 flex items-center gap-0.5">
                <X className="w-3 h-3 text-rose-600" />
                Batas:
              </span>
              <span>
                {isMode30
                  ? 'Beban memori > 3.0 GB RAM akan dihentikan cgroup. Tidak mendukung model AI besar / LLM (>7B) yang butuh VRAM > 4.8 GB.'
                  : 'Dilarang untuk Machine Learning / Deep Learning (PyTorch/TensorFlow). Dataset > 200 MB akan melebihi RAM 1.5 GB dan memicu OOM Kill otomatis. GPU diblokir.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cluster Workload & Priority Slot Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Slot Prioritas GPU 0 */}
        <div className="bg-white px-4 py-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
              priorityStudent 
                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                : 'bg-slate-50 text-slate-700 border border-slate-200'
            }`}>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <span className="text-[10px] font-sans font-semibold text-slate-400 uppercase tracking-wider block">
                Slot Akselerasi Prioritas (GPU 0 Dedicated)
              </span>
              {priorityStudent ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono font-bold text-slate-900">
                    NIM {priorityStudent.nim}
                  </span>
                  <span className="text-xs text-slate-600 truncate max-w-[180px]">
                    ({priorityStudent.nama ? priorityStudent.nama.split(' ')[0] : 'Mahasiswa Riset'})
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Aktif
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-emerald-700">
                    Tersedia untuk Riset / Skripsi Mahasiswa
                  </span>
                </div>
              )}
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-500 font-semibold hidden sm:inline">
            {priorityStudent ? 'Slot 1/1 Terisi' : 'Slot 0/1 Kosong'}
          </span>
        </div>

        {/* GPU Boost Pool (GPU 1) */}
        <div className="bg-white px-4 py-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
              !gpuBoostAllowed
                ? 'bg-slate-50 text-slate-400 border border-slate-200'
                : gpuBoostActive > 0
                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                : 'bg-slate-50 text-slate-700 border border-slate-200'
            }`}>
              <Zap className={`w-4 h-4 ${!gpuBoostAllowed ? 'text-slate-400' : 'text-sky-600'}`} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-sans font-semibold text-slate-400 uppercase tracking-wider block">
                GPU Boost Pool (GPU 1 Sementara)
              </span>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-900">
                  {gpuBoostActive}/{gpuBoostMax} Slot
                </span>
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                  !gpuBoostAllowed
                    ? 'bg-slate-100 text-slate-500 border-slate-200'
                    : !gpuBoostEnabled
                    ? 'bg-slate-50 text-slate-600 border-slate-200'
                    : gpuBoostActive >= gpuBoostMax
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-sky-50 text-sky-700 border-sky-200'
                }`}>
                  {!gpuBoostAllowed
                    ? 'Dikunci (Mode 60)'
                    : !gpuBoostEnabled
                    ? 'Nonaktif'
                    : gpuBoostActive >= gpuBoostMax
                    ? 'Penuh'
                    : 'Tersedia'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="meter-track w-28 h-1.5 rounded-full">
                  <div
                    className={`meter-fill h-full rounded-full ${!gpuBoostAllowed ? 'bg-slate-300' : 'bg-sky-600'}`}
                    style={{ width: `${Math.max(gpuBoostPercent, gpuBoostActive > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {!gpuBoostAllowed ? 'Nonaktif di Mode 60' : `Akses GPU 1 · ${gpuBoostVramMb} MB VRAM (CPU/RAM tetap)`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pengguna & Beban Sesi Komputasi */}
        <div className="bg-white px-4 py-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <span className="text-[10px] font-sans font-semibold text-slate-400 uppercase tracking-wider block">
                Aktivitas Sesi Mahasiswa & Riset
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-slate-900 font-mono">
                  {totalOnlineCount} Pengguna Aktif
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  (SIMTIK: {onlineStudentsCount} · Lab: {activeSystemUsers.length})
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
            <span className="font-semibold">Aktif</span>
          </div>
        </div>
      </div>
      
      {/* 4-Column Modern Cloud Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: CPU & RAM Host */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-sky-600" /> Beban Komputasi Host
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
              {cpu.core_count || 24} Cores
            </span>
          </div>
          
          <div className="space-y-3 mt-1">
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-slate-500">CPU Load</span>
                <span className="font-mono tabular-nums font-bold text-slate-900">{cpuPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    cpuPercent >= 90 ? 'bg-rose-500' : 
                    cpuPercent >= 75 ? 'bg-amber-500' : 
                    'bg-sky-600'
                  }`}
                  style={{ width: `${cpuPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-slate-500">Host RAM</span>
                <span className="font-mono tabular-nums font-bold text-slate-900">
                  {memUsedGb} <span className="text-slate-400 font-normal">/ {memTotalGb} GB</span> ({memPercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    memPercent >= 90 ? 'bg-rose-500' : 
                    memPercent >= 75 ? 'bg-amber-500' : 
                    'bg-sky-600'
                  }`}
                  style={{ width: `${memPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Penyimpanan Disk Host */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-cyan-600" /> Penyimpanan NVMe
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
              Workspace Lab
            </span>
          </div>

          <div className="mt-1">
            <div className="flex justify-between text-xs mb-1 font-medium">
              <span className="text-slate-500">Kapasitas Terpakai</span>
              <span className="font-mono tabular-nums font-bold text-slate-900">
                {diskUsedGb.toFixed(0)} <span className="text-slate-400 font-normal">/ {diskTotalGb.toFixed(0)} GB</span> ({diskPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200 mb-3">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  diskPercent >= 90 ? 'bg-rose-500' : 
                  diskPercent >= 75 ? 'bg-amber-500' : 
                  'bg-cyan-600'
                }`}
                style={{ width: `${diskPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span>Sisa Ruang:</span>
              <span className="font-bold text-slate-900">{diskFreeGb.toFixed(0)} GB</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Status GPU Klaster */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" /> Akselerator GPU
            </span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              {activeGpus} / {totalGpus} Online
            </span>
          </div>

          <div className="mt-1">
            <div className="flex justify-between text-xs mb-1 font-medium">
              <span className="text-slate-500">Total Alokasi VRAM</span>
              <span className="font-mono tabular-nums font-bold text-slate-900">
                {(totalVramUsedMb / 1024).toFixed(1)} <span className="text-slate-400 font-normal">/ {(totalVramTotalMb / 1024).toFixed(0)} GB</span> ({totalVramPct}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200 mb-3">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  totalVramPct >= 90 ? 'bg-rose-500' : 
                  totalVramPct >= 75 ? 'bg-amber-500' : 
                  'bg-emerald-600'
                }`}
                style={{ width: `${totalVramPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span>Proses AI Running:</span>
              <span className="font-bold text-slate-900">{totalGpuProcesses} Proses</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Backup Snapshot System */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Database & Backup
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
              Auto 02:00 WIB
            </span>
          </div>

          <div className="space-y-2.5 mt-1">
            <div className="text-[11px] font-mono text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] uppercase font-sans font-semibold text-slate-400">Snapshot Terakhir:</span>
                <span className="font-bold text-emerald-600">
                  {latestBackup?.size_kb ? `${latestBackup.size_kb} KB` : 'Tersinkron'}
                </span>
              </div>
              <span className="text-[10px] text-slate-800 truncate block font-medium">
                {latestBackup?.timestamp ? latestBackup.timestamp : 'Otomatis Harian Aktif'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onTriggerBackup}
                disabled={isBackingUp || !isAdmin}
                className={`flex-1 min-h-[40px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all duration-200 ${
                  !isAdmin
                    ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-70'
                    : 'bg-slate-900 hover:bg-slate-800 text-white border-transparent shadow-xs cursor-pointer'
                }`}
                type="button"
                title={isAdmin ? "Buat cadangan snapshot database sekarang" : "Login Administrator untuk mencadangkan database"}
              >
                {isBackingUp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Mencadangkan...</span>
                  </>
                ) : (
                  <>
                    <DatabaseBackup className="w-4 h-4" />
                    <span>{isAdmin ? 'Cadangkan' : 'Login'}</span>
                  </>
                )}
              </button>

              {isAdmin && (
                <button
                  onClick={onOpenBackupModal}
                  className="px-3 min-h-[40px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
                  title="Lihat riwayat snapshot dan opsi pemulihan (restore) database"
                  type="button"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Pulihkan</span>
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

export default memo(SystemOverview);
