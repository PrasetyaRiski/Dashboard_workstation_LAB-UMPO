import React, { memo, useState } from 'react';
import { 
  Cpu, HardDrive, ShieldCheck, DatabaseBackup, Loader2, Layers, 
  Zap, Users, UserCheck, SlidersHorizontal, Sparkles, Terminal
} from 'lucide-react';

function SystemOverview({ 
  system = {}, 
  gpus = [], 
  users = [], 
  students = [], 
  onTriggerBackup, 
  isBackingUp, 
  backups = [], 
  isAdmin,
  level2Slots = {},
  onEmergencyReleaseIdle,
  onSwitchLabMode,
}) {
  const [isReleasing, setIsReleasing] = useState(false);

  if (!system) return null;

  const cpu = system?.cpu || {};
  const mem = system?.memory || {};
  const disk = system?.disk || {};

  const cpuPercent = Math.round(cpu.percent || 0);
  const memPercent = Math.round(mem.percent || 0);
  const memUsedGb = (mem.used_gb || 0).toFixed(1);
  const memTotalGb = (mem.total_gb || 0).toFixed(0);

  const diskPercent = Math.round(disk.percent || 0);
  const diskUsedGb = (disk.used_gb || 0).toFixed(0);
  const diskTotalGb = (disk.total_gb || 0).toFixed(0);

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

  let healthStatus = 'healthy';
  let healthLabel = 'Klaster Beroperasi Normal';
  let healthClass = 'border-emerald-200 bg-emerald-50 text-emerald-700';
  let dotClass = 'bg-emerald-500';

  if (isCpuHigh || isMemHigh || isVramHigh || isDiskHigh) {
    healthStatus = 'warning';
    healthLabel = 'Beban Komputasi Tinggi';
    healthClass = 'border-amber-200 bg-amber-50 text-amber-700';
    dotClass = 'bg-amber-500';
  }

  const latestBackup = backups && backups.length > 0 ? backups[0] : null;

  // Level 2 Practical Student Slots (Kapasitas Dinamis: Mode AI 30 vs Mode Dasar 60)
  const labMode = level2Slots?.lab_mode || 'ai';
  const isBasicMode = labMode === 'basic';
  const maxSlots = level2Slots?.max_slots || (isBasicMode ? 60 : 30);
  const activeSlots = level2Slots?.active_count ?? 0;
  const availableSlots = level2Slots?.available_slots ?? Math.max(0, maxSlots - activeSlots);
  const slotPercent = Math.min(100, Math.round((activeSlots / maxSlots) * 100));
  const idleMinutesSetting = level2Slots?.idle_release_minutes || 15;

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
        <div>
          <h1 className="font-sans text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Ringkasan Sistem & Klaster Komputasi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Telemetri sumber daya komputasi dan status klaster Workstation DGX Lab AI UMPO
          </p>
        </div>

        {/* Cluster Health Banner */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium shadow-2xs ${healthClass}`}>
          <span className={`w-2 h-2 rounded-full pulse-dot ${dotClass}`} />
          <span className="font-semibold">{healthLabel}</span>
        </div>
      </div>

      {/* Profil Operasional Lab (Mode Switcher) & Level 2 Slot Praktikum Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-4">
        {/* Row 1: Profile Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-700" />
              Mode Lab:
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${
              isBasicMode
                ? 'bg-sky-50 text-sky-700 border-sky-200'
                : 'bg-violet-50 text-violet-700 border-violet-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isBasicMode ? 'bg-sky-500' : 'bg-violet-500'}`} />
              {isBasicMode ? 'Mode Pemrograman Dasar (60 Slot)' : 'Mode Praktikum AI (30 Slot)'}
            </span>
            <span className="text-[11px] font-mono text-slate-500 hidden md:inline">
              {isBasicMode ? '• 2 Kelas (Murni CPU & RAM, GPU Standby)' : '• 1 Kelas AI (Akselerasi GPU 1 Shared Pool)'}
            </span>
          </div>

          {/* Toggle Buttons (Always visible, prompts login if guest) */}
          <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl self-start sm:self-auto shadow-xs">
            <button
              type="button"
              onClick={() => onSwitchLabMode && onSwitchLabMode('ai')}
              disabled={!isBasicMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-all flex items-center gap-1.5 active:translate-y-0.5 cursor-pointer disabled:cursor-default ${
                !isBasicMode
                  ? 'bg-white text-violet-700 font-bold shadow-xs border border-violet-200'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title={isAdmin ? "Batas 30 mahasiswa, akses GPU 1 diaktifkan untuk PyTorch / Deep Learning" : "Klik untuk beralih ke Mode Praktikum AI (Perlu Login Admin)"}
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              <span>Praktikum AI (30)</span>
              {!isBasicMode && <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />}
            </button>
            <button
              type="button"
              onClick={() => onSwitchLabMode && onSwitchLabMode('basic')}
              disabled={isBasicMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-all flex items-center gap-1.5 active:translate-y-0.5 cursor-pointer disabled:cursor-default ${
                isBasicMode
                  ? 'bg-white text-sky-700 font-bold shadow-xs border border-sky-200'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title={isAdmin ? "Batas 60 mahasiswa (2 kelas), GPU dinonaktifkan (murni CPU & RAM)" : "Klik untuk beralih ke Mode Pemrograman Dasar (Perlu Login Admin)"}
            >
              <Terminal className="w-3.5 h-3.5 text-sky-600" />
              <span>Dasar / 2 Kelas (60)</span>
              {isBasicMode && <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />}
            </button>
          </div>
        </div>

        {/* Row 2: Slot Progress & Emergency Release */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              activeSlots >= maxSlots - 1
                ? 'bg-rose-50 text-rose-600 border-rose-200' 
                : activeSlots >= maxSlots * 0.7 
                ? 'bg-amber-50 text-amber-600 border-amber-200' 
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}>
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-sans text-sm font-bold text-slate-900">
                  {isBasicMode
                    ? 'Slot Praktikum Kelas (Level 2 CPU Only - 2 Kelas)'
                    : 'Slot Praktikum Kelas (Level 2 Shared GPU 1)'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  activeSlots >= maxSlots 
                    ? 'bg-rose-50 text-rose-600 border-rose-200' 
                    : activeSlots >= maxSlots * 0.7 
                    ? 'bg-amber-50 text-amber-600 border-amber-200' 
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`}>
                  {activeSlots >= maxSlots ? 'KUOTA PENUH' : `${availableSlots} SLOT TERSEDIA`}
                </span>
              </div>
              
              <div className="flex items-center gap-3 mt-1.5 flex-wrap sm:flex-nowrap">
                <div className="w-48 sm:w-64 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      activeSlots >= maxSlots - 1 ? 'bg-rose-500' : activeSlots >= maxSlots * 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(slotPercent, 3)}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                  {activeSlots} <span className="text-slate-500 font-normal">/ {maxSlots} Sesi</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                  • {isBasicMode ? 'Jatah 2 GB RAM (CPU Only)' : 'Jatah 3 GB RAM + GPU 1 Shared'}
                </span>
              </div>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={handleReleaseClick}
              disabled={isReleasing || activeSlots === 0}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold font-mono bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 shadow-xs transition-all active:translate-y-0.5 flex items-center justify-center gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              type="button"
              title={`Hentikan sesi mahasiswa praktikum yang idle (≥${idleMinutesSetting} menit) untuk membuka slot antrean`}
            >
              {isReleasing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                  <span>Membebaskan...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Bebaskan Slot Idle</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Cluster Workload & Priority Slot Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Slot Prioritas GPU 0 */}
        <div className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
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

        {/* Pengguna & Beban Sesi Komputasi */}
        <div className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
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
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
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
                    'bg-violet-600'
                  }`}
                  style={{ width: `${memPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Penyimpanan Disk Host */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
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
                {diskUsedGb} <span className="text-slate-400 font-normal">/ {diskTotalGb} GB</span> ({diskPercent}%)
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
              <span className="font-bold text-slate-900">{(diskTotalGb - diskUsedGb).toFixed(0)} GB</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Status GPU Klaster */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
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
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
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

            <button
              onClick={onTriggerBackup}
              disabled={isBackingUp || !isAdmin}
              className={`w-full min-h-[42px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all duration-200 ${
                !isAdmin
                  ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-70'
                  : 'bg-slate-900 hover:bg-slate-800 text-white border-transparent shadow-xs cursor-pointer active:translate-y-0.5'
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
                  <span>{isAdmin ? 'Cadangkan Database' : 'Login untuk Backup'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}

export default memo(SystemOverview);
