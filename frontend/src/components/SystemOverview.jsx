import React, { memo, useState } from 'react';
import { 
  Cpu, HardDrive, ShieldCheck, DatabaseBackup, Loader2, Layers, 
  Zap, Users, UserCheck
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
  onEmergencyReleaseIdle
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
  let healthClass = 'border-[#2E7D32]/30 bg-[#E8F5E9] text-[#2E7D32]';
  let dotClass = 'bg-[#2E7D32]';

  if (isCpuHigh || isMemHigh || isVramHigh || isDiskHigh) {
    healthStatus = 'warning';
    healthLabel = 'Beban Komputasi Tinggi';
    healthClass = 'border-[#B45309]/30 bg-[#FEF3C7] text-[#B45309]';
    dotClass = 'bg-[#B45309]';
  }

  const latestBackup = backups && backups.length > 0 ? backups[0] : null;

  // Level 2 Practical Student Slots (Max 30)
  const maxSlots = level2Slots?.max_slots || 30;
  const activeSlots = level2Slots?.active_count ?? 0;
  const availableSlots = level2Slots?.available_slots ?? Math.max(0, maxSlots - activeSlots);
  const slotPercent = Math.min(100, Math.round((activeSlots / maxSlots) * 100));

  const handleReleaseClick = async () => {
    if (!isAdmin || isReleasing) return;
    if (!confirm("Bebaskan sesi mahasiswa praktikum yang idle (komputasi 0% / ditinggalkan)?\nAkun Dosen, Aslab, dan Mahasiswa Riset (Level 1) tidak akan terpengaruh.")) return;
    
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F3EBDD] border border-[#E4D8C3] p-4 rounded-2xl shadow-warm-xs">
        <div>
          <h1 className="font-serif text-lg sm:text-xl font-bold text-[#2E2018] tracking-tight">
            Ringkasan Sistem & Klaster Komputasi
          </h1>
          <p className="text-xs text-[#7A6A5C] mt-0.5">
            Telemetri sumber daya komputasi dan status klaster Workstation DGX Lab AI UMPO
          </p>
        </div>

        {/* Cluster Health Banner */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium shadow-xs ${healthClass}`}>
          <span className={`w-2 h-2 rounded-full pulse-dot ${dotClass}`} />
          <span className="font-semibold">{healthLabel}</span>
        </div>
      </div>

      {/* Level 2 Slot Praktikum (30 Kuota) Banner & Emergency Release */}
      <div className="bg-[#F3EBDD] p-4 rounded-2xl border border-[#E4D8C3] shadow-warm-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
            activeSlots >= 29 
              ? 'bg-[#FEE2E2] text-[#C53030] border-[#FCA5A5]' 
              : activeSlots >= 20 
              ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]' 
              : 'bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]/30'
          }`}>
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif text-sm font-bold text-[#2E2018]">
                Slot Praktikum Kelas (Level 2 Shared GPU 1)
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                activeSlots >= 29 
                  ? 'bg-[#FEE2E2] text-[#C53030] border-[#FCA5A5]' 
                  : activeSlots >= 20 
                  ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]' 
                  : 'bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]/30'
              }`}>
                {activeSlots >= 30 ? 'KUOTA PENUH' : `${availableSlots} SLOT TERSEDIA`}
              </span>
            </div>
            
            <div className="flex items-center gap-3 mt-1.5">
              <div className="w-48 sm:w-64 bg-[#FAF6EF] h-2 rounded-full overflow-hidden border border-[#E4D8C3]">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    activeSlots >= 29 ? 'bg-[#C53030]' : activeSlots >= 20 ? 'bg-[#B45309]' : 'bg-[#2E7D32]'
                  }`}
                  style={{ width: `${Math.max(slotPercent, 3)}%` }}
                />
              </div>
              <span className="font-mono text-xs font-bold text-[#2E2018] tabular-nums">
                {activeSlots} <span className="text-[#7A6A5C] font-normal">/ {maxSlots} Sesi</span>
              </span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={handleReleaseClick}
            disabled={isReleasing || activeSlots === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold font-mono bg-[#FAF6EF] hover:bg-[#EFE6D8] text-[#6F4E37] border border-[#E4D8C3] hover:border-[#6F4E37] shadow-warm-xs transition-all active:translate-y-0.5 flex items-center justify-center gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            type="button"
            title="Hentikan sesi mahasiswa praktikum yang idle untuk membuka slot antrean"
          >
            {isReleasing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6F4E37]" />
                <span>Membebaskan...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-[#B45309]" />
                <span>Bebaskan Slot Idle</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Cluster Workload & Priority Slot Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Slot Prioritas GPU 0 */}
        <div className="bg-[#F3EBDD] px-4 py-3.5 rounded-2xl border border-[#E4D8C3] shadow-warm-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
              priorityStudent 
                ? 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]' 
                : 'bg-[#FAF6EF] text-[#6F4E37] border border-[#E4D8C3]'
            }`}>
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-sans font-semibold text-[#7A6A5C] uppercase tracking-wider block">
                Slot Akselerasi Prioritas (GPU 0 Dedicated)
              </span>
              {priorityStudent ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono font-bold text-[#2E2018]">
                    NIM {priorityStudent.nim}
                  </span>
                  <span className="text-xs text-[#3B2E26] truncate max-w-[180px]">
                    ({priorityStudent.nama ? priorityStudent.nama.split(' ')[0] : 'Mahasiswa Riset'})
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                    Aktif
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#2E7D32]" />
                  <span className="text-xs font-medium text-[#2E7D32]">
                    Tersedia untuk Riset / Skripsi Mahasiswa
                  </span>
                </div>
              )}
            </div>
          </div>
          <span className="text-[11px] font-mono text-[#7A6A5C] font-semibold hidden sm:inline">
            {priorityStudent ? 'Slot 1/1 Terisi' : 'Slot 0/1 Kosong'}
          </span>
        </div>

        {/* Pengguna & Beban Sesi Komputasi */}
        <div className="bg-[#F3EBDD] px-4 py-3.5 rounded-2xl border border-[#E4D8C3] shadow-warm-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FAF6EF] text-[#6F4E37] border border-[#E4D8C3] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-[#6F4E37]" />
            </div>
            <div>
              <span className="text-[10px] font-sans font-semibold text-[#7A6A5C] uppercase tracking-wider block">
                Aktivitas Sesi Mahasiswa & Riset
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-[#2E2018] font-mono">
                  {totalOnlineCount} Pengguna Aktif
                </span>
                <span className="text-xs text-[#7A6A5C] font-mono">
                  (SIMTIK: {onlineStudentsCount} · Lab: {activeSystemUsers.length})
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#2E7D32] bg-[#E8F5E9] px-2.5 py-1 rounded-full border border-[#2E7D32]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] pulse-dot" />
            <span className="font-semibold">Aktif</span>
          </div>
        </div>
      </div>
      
      {/* 4-Column Warm Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: CPU & RAM Host */}
        <div className="bg-[#F3EBDD] p-4 rounded-2xl border border-[#E4D8C3] shadow-warm-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7A6A5C] mb-2">
            <span className="text-xs font-semibold text-[#2E2018] flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#6F4E37]" /> Beban Komputasi Host
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-[#FAF6EF] text-[#3B2E26] border border-[#E4D8C3]">
              {cpu.core_count || 24} Cores
            </span>
          </div>
          
          <div className="space-y-3 mt-1">
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-[#7A6A5C]">CPU Load</span>
                <span className="font-mono tabular-nums font-bold text-[#2E2018]">{cpuPercent}%</span>
              </div>
              <div className="w-full bg-[#FAF6EF] h-2 rounded-full overflow-hidden border border-[#E4D8C3]">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    cpuPercent >= 90 ? 'bg-[#C53030]' : 
                    cpuPercent >= 75 ? 'bg-[#B45309]' : 
                    'bg-[#6F4E37]'
                  }`}
                  style={{ width: `${cpuPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-[#7A6A5C]">Host RAM</span>
                <span className="font-mono tabular-nums font-bold text-[#2E2018]">
                  {memUsedGb} <span className="text-[#7A6A5C] font-normal">/ {memTotalGb} GB</span> ({memPercent}%)
                </span>
              </div>
              <div className="w-full bg-[#FAF6EF] h-2 rounded-full overflow-hidden border border-[#E4D8C3]">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    memPercent >= 90 ? 'bg-[#C53030]' : 
                    memPercent >= 75 ? 'bg-[#B45309]' : 
                    'bg-[#C8794A]'
                  }`}
                  style={{ width: `${memPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Penyimpanan Disk Host */}
        <div className="bg-[#F3EBDD] p-4 rounded-2xl border border-[#E4D8C3] shadow-warm-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7A6A5C] mb-2">
            <span className="text-xs font-semibold text-[#2E2018] flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-[#6F4E37]" /> Penyimpanan NVMe
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-[#FAF6EF] text-[#3B2E26] border border-[#E4D8C3]">
              Workspace Lab
            </span>
          </div>

          <div className="mt-1">
            <div className="flex justify-between text-xs mb-1 font-medium">
              <span className="text-[#7A6A5C]">Kapasitas Terpakai</span>
              <span className="font-mono tabular-nums font-bold text-[#2E2018]">
                {diskUsedGb} <span className="text-[#7A6A5C] font-normal">/ {diskTotalGb} GB</span> ({diskPercent}%)
              </span>
            </div>
            <div className="w-full bg-[#FAF6EF] h-2 rounded-full overflow-hidden border border-[#E4D8C3] mb-3">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  diskPercent >= 90 ? 'bg-[#C53030]' : 
                  diskPercent >= 75 ? 'bg-[#B45309]' : 
                  'bg-[#6F4E37]'
                }`}
                style={{ width: `${diskPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-[#7A6A5C] bg-[#FAF6EF] p-2 rounded-xl border border-[#E4D8C3]">
              <span>Sisa Ruang:</span>
              <span className="font-bold text-[#2E2018]">{(diskTotalGb - diskUsedGb).toFixed(0)} GB</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Status GPU Klaster */}
        <div className="bg-[#F3EBDD] p-4 rounded-2xl border border-[#E4D8C3] shadow-warm-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7A6A5C] mb-2">
            <span className="text-xs font-semibold text-[#2E2018] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#6F4E37]" /> Akselerator GPU
            </span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#E8F5E9] text-[#2E7D32] border border-[#2E7D32]/30">
              {activeGpus} / {totalGpus} Online
            </span>
          </div>

          <div className="mt-1">
            <div className="flex justify-between text-xs mb-1 font-medium">
              <span className="text-[#7A6A5C]">Total Alokasi VRAM</span>
              <span className="font-mono tabular-nums font-bold text-[#2E2018]">
                {(totalVramUsedMb / 1024).toFixed(1)} <span className="text-[#7A6A5C] font-normal">/ {(totalVramTotalMb / 1024).toFixed(0)} GB</span> ({totalVramPct}%)
              </span>
            </div>
            <div className="w-full bg-[#FAF6EF] h-2 rounded-full overflow-hidden border border-[#E4D8C3] mb-3">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  totalVramPct >= 90 ? 'bg-[#C53030]' : 
                  totalVramPct >= 75 ? 'bg-[#B45309]' : 
                  'bg-[#6F4E37]'
                }`}
                style={{ width: `${totalVramPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-[#7A6A5C] bg-[#FAF6EF] p-2 rounded-xl border border-[#E4D8C3]">
              <span>Proses AI Running:</span>
              <span className="font-bold text-[#2E2018]">{totalGpuProcesses} Proses</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Backup Snapshot System */}
        <div className="bg-[#F3EBDD] p-4 rounded-2xl border border-[#E4D8C3] shadow-warm-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7A6A5C] mb-2">
            <span className="text-xs font-semibold text-[#2E2018] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#2E7D32]" /> Database & Backup
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-[#FAF6EF] text-[#3B2E26] border border-[#E4D8C3]">
              Auto 02:00 WIB
            </span>
          </div>

          <div className="space-y-2.5 mt-1">
            <div className="text-[11px] font-mono text-[#7A6A5C] bg-[#FAF6EF] p-2 rounded-xl border border-[#E4D8C3]">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] uppercase font-sans font-semibold text-[#7A6A5C]">Snapshot Terakhir:</span>
                <span className="font-bold text-[#2E7D32]">
                  {latestBackup?.size_kb ? `${latestBackup.size_kb} KB` : 'Tersinkron'}
                </span>
              </div>
              <span className="text-[10px] text-[#2E2018] truncate block font-medium">
                {latestBackup?.timestamp ? latestBackup.timestamp : 'Otomatis Harian Aktif'}
              </span>
            </div>

            <button
              onClick={onTriggerBackup}
              disabled={isBackingUp || !isAdmin}
              className={`w-full min-h-[44px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all duration-200 ${
                !isAdmin
                  ? 'bg-[#FAF6EF] text-[#7A6A5C] border-[#E4D8C3] cursor-not-allowed opacity-70'
                  : 'bg-[#6F4E37] hover:bg-[#4A3426] text-[#FAF6EF] border-transparent shadow-xs cursor-pointer active:translate-y-0.5'
              }`}
              type="button"
              title={isAdmin ? "Buat cadangan snapshot database sekarang" : "Login Administrator untuk mencadangkan database"}
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#FAF6EF]" />
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
