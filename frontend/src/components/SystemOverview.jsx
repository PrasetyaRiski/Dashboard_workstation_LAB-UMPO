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
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Ringkasan Sistem</h1>
          <p className="text-xs text-slate-500 mt-0.5">Telemetri sumber daya komputasi dan status klaster DGX UMPO</p>
        </div>
      </div>
      
      {/* High-Density 4-Column 3D KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Beban Komputasi CPU & RAM */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(37,99,235,0.06),0_2px_4px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_28px_-4px_rgba(37,99,235,0.12)] hover:-translate-y-0.5 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" /> Beban Komputasi
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80">
              {cpu.core_count || 24} Cores
            </span>
          </div>
          
          <div className="space-y-3 mt-1">
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-slate-500">CPU Host</span>
                <span className="font-mono tabular-nums font-bold text-slate-900">{cpuPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    cpuPercent >= 90 ? 'bg-gradient-to-r from-rose-500 to-rose-600' : 
                    cpuPercent >= 75 ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 
                    'bg-gradient-to-r from-blue-500 to-blue-600'
                  }`}
                  style={{ width: `${cpuPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-slate-500">RAM Host ({memory.total_gb || 128} GB)</span>
                <span className="font-mono tabular-nums font-bold text-slate-900">{memoryPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    memoryPercent >= 90 ? 'bg-gradient-to-r from-rose-500 to-rose-600' : 
                    memoryPercent >= 75 ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 
                    'bg-gradient-to-r from-emerald-500 to-emerald-600'
                  }`}
                  style={{ width: `${memoryPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Penyimpanan /home */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(37,99,235,0.06),0_2px_4px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_28px_-4px_rgba(37,99,235,0.12)] hover:-translate-y-0.5 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-900 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-600" /> Penyimpanan /home
            </span>
            <span className="text-[10px] font-mono text-slate-400">{homeDisk.mount || '/home'}</span>
          </div>
          
          <div className="mt-2">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
                {homeDisk.used_gb || 0}
              </span>
              <span className="text-xs text-slate-500 font-mono">/ {homeDisk.total_gb || 0} GB</span>
            </div>

            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] mb-2">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  !isStorageSafe ? 'bg-gradient-to-r from-rose-500 to-rose-600' : 'bg-gradient-to-r from-indigo-500 to-indigo-600'
                }`}
                style={{ width: `${homeDisk.percent || 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Sisa: {homeDisk.free_gb || 0} GB</span>
              <span className={!isStorageSafe ? 'text-rose-600 font-bold' : 'text-emerald-600 font-semibold'}>
                {isStorageSafe ? 'Kapasitas Normal' : 'Mendekati Penuh'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: VRAM Quota Cluster (Dual GPU) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(37,99,235,0.06),0_2px_4px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_28px_-4px_rgba(37,99,235,0.12)] hover:-translate-y-0.5 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600" /> VRAM Quota Cluster
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/80">
              Dual GPU
            </span>
          </div>
          
          <div className="mt-2">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
                {vramUsedGb}
              </span>
              <span className="text-xs text-slate-500 font-mono">/ {vramTotalGb} GB · {vramPct}%</span>
            </div>

            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] mb-2">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  vramPct >= 90 ? 'bg-gradient-to-r from-rose-500 to-rose-600' : 
                  vramPct >= 75 ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 
                  'bg-gradient-to-r from-sky-500 to-blue-600'
                }`}
                style={{ width: `${vramPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span className="truncate text-slate-600">node-dgx-umpo01</span>
              <span className="text-blue-600 font-semibold">{gpus.length} Kartu Aktif</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Keamanan & Status Backup */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(37,99,235,0.06),0_2px_4px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_28px_-4px_rgba(37,99,235,0.12)] hover:-translate-y-0.5 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Keamanan & Backup
              </span>
              <span className="text-[10px] font-mono font-semibold text-emerald-700 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                WAL Active
              </span>
            </div>
            
            <ul className="space-y-1.5 my-2">
              <li className="flex items-center gap-2 text-[11px] text-slate-600 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="truncate">Integritas SQLite Aman</span>
              </li>
              <li className="flex items-center gap-2 text-[11px] text-slate-600 font-mono">
                <span className={`w-1.5 h-1.5 rounded-full ${latestBackup ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span className="truncate">{backupText}</span>
              </li>
            </ul>
          </div>
          
          {isAdmin ? (
            <button
              onClick={onTriggerBackup}
              disabled={isBackingUp}
              className="w-full mt-2 py-2 px-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-semibold shadow-[0_2px_0_#cbd5e1,0_2px_4px_rgba(0,0,0,0.03)] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              type="button"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Mencadangkan…</span>
                </>
              ) : (
                <>
                  <DatabaseBackup className="w-3.5 h-3.5 text-blue-600" />
                  <span>Snapshot Database</span>
                </>
              )}
            </button>
          ) : (
            <div className="mt-2 py-1 px-2 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-500 font-mono text-center">
              Mode Monitoring (Read-Only)
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default memo(SystemOverview);
