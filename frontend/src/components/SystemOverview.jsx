import React, { memo } from 'react';
import { Cpu, HardDrive, ShieldCheck, DatabaseBackup, Loader2, Layers } from 'lucide-react';

function SystemOverview({ system = {}, gpus = [], onTriggerBackup, isBackingUp, backups = [], isAdmin }) {
  if (!system) return null;

  const cpu = system?.cpu || {};
  const memory = system?.memory || {};
  const disks = system?.disks || {};
  const homeDisk = disks.home || disks.root || {};

  const cpuPercent = Math.round(cpu.overall_percent || 0);
  const memoryPercent = Math.round(memory.percent || 0);
  
  const isStorageSafe = (homeDisk.percent || 0) < 90;
  const latestBackup = backups && backups.length > 0 ? backups[0] : null;

  // Aggregate Dual GPU VRAM
  const gpu0 = gpus[0];
  const gpu1 = gpus[1];
  const totalVramUsedMb = (gpu0?.vram_used_mb || 0) + (gpu1?.vram_used_mb || 0);
  const totalVramMaxMb = (gpu0?.vram_total_mb || 16384) + (gpu1?.vram_total_mb || 16384);
  const vramUsedGb = (totalVramUsedMb / 1024).toFixed(1);
  const vramTotalGb = (totalVramMaxMb / 1024).toFixed(0);
  const vramPct = totalVramMaxMb > 0 ? Math.min(100, Math.round((totalVramUsedMb / totalVramMaxMb) * 100)) : 0;

  let backupText = 'Belum ada snapshot backup';
  if (latestBackup) {
    const rawDate = latestBackup.created_at || latestBackup.timestamp;
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      backupText = `Backup: ${d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
    } else {
      backupText = 'Backup: Tersimpan di local';
    }
  }

  return (
    <div className="mb-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-[#fafafa] tracking-tight">Ringkasan Sistem</h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">Telemetri sumber daya komputasi dan status klaster DGX UMPO</p>
        </div>
      </div>
      
      {/* High-Density 4-Column KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Beban Komputasi CPU & RAM */}
        <div className="bg-[#111114] p-4 rounded-xl border border-[rgba(255,255,255,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#a1a1aa] mb-3">
            <span className="text-xs font-medium text-[#fafafa] flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-[#38bdf8]" /> Beban Komputasi
            </span>
            <span className="text-[10px] font-mono text-[#71717a]">{cpu.core_count || 24} Cores</span>
          </div>
          
          <div className="space-y-3 mt-1">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#a1a1aa]">CPU Host</span>
                <span className="font-mono tabular-nums font-semibold text-[#fafafa]">{cpuPercent}%</span>
              </div>
              <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden border border-[rgba(255,255,255,0.06)]">
                <div 
                  className={`h-full transition-all duration-300 ${cpuPercent >= 90 ? 'bg-[#f43f5e]' : cpuPercent >= 75 ? 'bg-[#f59e0b]' : 'bg-[#38bdf8]'}`}
                  style={{ width: `${cpuPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#a1a1aa]">RAM Host ({memory.total_gb || 128} GB)</span>
                <span className="font-mono tabular-nums font-semibold text-[#fafafa]">{memoryPercent}%</span>
              </div>
              <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden border border-[rgba(255,255,255,0.06)]">
                <div 
                  className={`h-full transition-all duration-300 ${memoryPercent >= 90 ? 'bg-[#f43f5e]' : memoryPercent >= 75 ? 'bg-[#f59e0b]' : 'bg-[#10b981]'}`}
                  style={{ width: `${memoryPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Penyimpanan /home */}
        <div className="bg-[#111114] p-4 rounded-xl border border-[rgba(255,255,255,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#a1a1aa] mb-2">
            <span className="text-xs font-medium text-[#fafafa] flex items-center gap-2">
              <HardDrive className="w-3.5 h-3.5 text-[#818cf8]" /> Penyimpanan /home
            </span>
            <span className="text-[10px] font-mono text-[#71717a]">{homeDisk.mount || '/home'}</span>
          </div>
          
          <div className="mt-2">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-semibold font-mono tabular-nums text-[#fafafa] tracking-tight">
                {homeDisk.used_gb || 0}
              </span>
              <span className="text-xs text-[#a1a1aa] font-mono">/ {homeDisk.total_gb || 0} GB</span>
            </div>

            <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden border border-[rgba(255,255,255,0.06)] mb-2">
              <div 
                className={`h-full transition-all duration-300 ${!isStorageSafe ? 'bg-[#f43f5e]' : 'bg-[#818cf8]'}`}
                style={{ width: `${homeDisk.percent || 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#a1a1aa] font-mono">
              <span>Sisa: {homeDisk.free_gb || 0} GB</span>
              <span className={!isStorageSafe ? 'text-[#fb7185] font-semibold' : 'text-[#34d399]'}>
                {isStorageSafe ? 'Kapasitas Normal' : 'Mendekati Penuh'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: VRAM Quota Cluster (Dual GPU) */}
        <div className="bg-[#111114] p-4 rounded-xl border border-[rgba(255,255,255,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#a1a1aa] mb-2">
            <span className="text-xs font-medium text-[#fafafa] flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#34d399]" /> VRAM Quota Cluster
            </span>
            <span className="text-[10px] font-mono text-[#71717a]">Dual GPU</span>
          </div>
          
          <div className="mt-2">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-semibold font-mono tabular-nums text-[#fafafa] tracking-tight">
                {vramUsedGb}
              </span>
              <span className="text-xs text-[#a1a1aa] font-mono">/ {vramTotalGb} GB · {vramPct}%</span>
            </div>

            <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden border border-[rgba(255,255,255,0.06)] mb-2">
              <div 
                className={`h-full transition-all duration-300 ${
                  vramPct >= 90 ? 'bg-[#f43f5e]' : vramPct >= 75 ? 'bg-[#f59e0b]' : 'bg-[#10b981]'
                }`}
                style={{ width: `${vramPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#a1a1aa] font-mono">
              <span className="truncate">node-dgx-umpo01</span>
              <span className="text-[#34d399] font-medium">{gpus.length} Kartu Aktif</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Keamanan & Status Backup */}
        <div className="bg-[#111114] p-4 rounded-xl border border-[rgba(255,255,255,0.08)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#a1a1aa] mb-2">
              <span className="text-xs font-medium text-[#fafafa] flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" /> Keamanan & Backup
              </span>
              <span className="text-[10px] font-mono text-[#34d399] px-1.5 py-0.2 rounded bg-[#10b981]/10 border border-[#10b981]/20">
                WAL Active
              </span>
            </div>
            
            <ul className="space-y-1.5 my-2">
              <li className="flex items-center gap-2 text-[11px] text-[#a1a1aa] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                <span className="truncate">Integritas SQLite Aman</span>
              </li>
              <li className="flex items-center gap-2 text-[11px] text-[#a1a1aa] font-mono">
                <span className={`w-1.5 h-1.5 rounded-full ${latestBackup ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}`}></span>
                <span className="truncate">{backupText}</span>
              </li>
            </ul>
          </div>
          
          {isAdmin ? (
            <button
              onClick={onTriggerBackup}
              disabled={isBackingUp}
              className="w-full mt-2 py-1.5 px-3 bg-[#18181b] hover:bg-[#27272a] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] rounded-lg text-xs font-medium text-[#fafafa] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              type="button"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#a1a1aa]" />
                  <span>Mencadangkan…</span>
                </>
              ) : (
                <>
                  <DatabaseBackup className="w-3.5 h-3.5 text-[#a1a1aa]" />
                  <span>Snapshot Database</span>
                </>
              )}
            </button>
          ) : (
            <div className="mt-2 py-1 px-2 rounded bg-[#18181b] border border-[rgba(255,255,255,0.06)] text-[10px] text-[#71717a] font-mono text-center">
              Mode Monitoring (Read-Only)
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default memo(SystemOverview);
