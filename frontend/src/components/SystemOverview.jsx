import React, { memo } from 'react';
import { 
  Cpu, HardDrive, ShieldCheck, DatabaseBackup, Loader2, Layers, 
  Zap, Users
} from 'lucide-react';

function SystemOverview({ 
  system = {}, 
  gpus = [], 
  users = [], 
  students = [], 
  onTriggerBackup, 
  isBackingUp, 
  backups = [], 
  isAdmin 
}) {
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

  // Workload & Priority Slot Analysis
  const priorityStudent = Array.isArray(students) ? students.find(s => Boolean(s.is_priority)) : null;
  const onlineStudentsCount = Array.isArray(students) ? students.filter(s => Boolean(s.is_online)).length : 0;
  const activeSystemUsers = Array.isArray(users) ? users.filter(u => (u.total_process_count || 0) > 0) : [];
  const totalOnlineCount = onlineStudentsCount + activeSystemUsers.length;

  // Cluster Health Calculation
  let healthStatus = 'healthy';
  let healthLabel = '';
  let healthClass = '';
  let dotClass = '';

  if (cpuPercent >= 90 || memoryPercent >= 90 || !isStorageSafe || vramPct >= 95) {
    healthStatus = 'critical';
    healthLabel = 'Kapasitas Mendekati Batas Kritis (Perlu Pemantauan)';
    healthClass = 'bg-rose-50 text-rose-700 border-rose-200';
    dotClass = 'bg-rose-500';
  } else if (cpuPercent >= 75 || memoryPercent >= 80 || vramPct >= 80) {
    healthStatus = 'warning';
    healthLabel = 'Beban Komputasi Tinggi';
    healthClass = 'bg-amber-50 text-amber-700 border-amber-200';
    dotClass = 'bg-amber-500';
  }

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
    <div className="flex flex-col gap-4">
      {/* Section Header & Cluster Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">Ringkasan Infrastruktur</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-sans">
            Telemetri sumber daya komputasi dan status klaster Workstation DGX Lab AI UMPO
          </p>
        </div>

        {/* Dynamic Cluster Health Banner */}
        {healthStatus !== 'healthy' ? (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-medium shadow-xs ${healthClass}`}>
            <span className={`w-2 h-2 rounded-full pulse-dot ${dotClass}`} />
            <span className="font-semibold">{healthLabel}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-mono font-medium shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
            <span>Klaster Beroperasi Normal</span>
          </div>
        )}
      </div>

      {/* Cluster Workload & Priority Slot Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Slot Prioritas GPU 0 */}
        <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              priorityStudent ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider block">
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
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                    Aktif
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-emerald-700">
                    Tersedia untuk Riset / Skripsi Mahasiswa
                  </span>
                </div>
              )}
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400 font-medium hidden sm:inline">
            {priorityStudent ? 'Slot 1/1 Terisi' : 'Slot 0/1 Kosong'}
          </span>
        </div>

        {/* Pengguna & Beban Sesi Komputasi */}
        <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-[#1a73e8]" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider block">
                Aktivitas Sesi Mahasiswa & Riset
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-slate-900 font-mono">
                  {totalOnlineCount} Pengguna Aktif
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  (SIMTIK: {onlineStudentsCount} · Lab: {activeSystemUsers.length})
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
            <span className="font-semibold">Aktif</span>
          </div>
        </div>
      </div>
      
      {/* High-Density 4-Column Enterprise KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: CPU & RAM Host */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#1a73e8]" /> Beban Komputasi Host
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
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
                    cpuPercent >= 90 ? 'bg-rose-600' : 
                    cpuPercent >= 75 ? 'bg-amber-500' : 
                    'bg-[#1a73e8]'
                  }`}
                  style={{ width: `${cpuPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-slate-500">RAM ({memory.total_gb || 128} GB)</span>
                <span className="font-mono tabular-nums font-bold text-slate-900">{memoryPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    memoryPercent >= 90 ? 'bg-rose-600' : 
                    memoryPercent >= 75 ? 'bg-amber-500' : 
                    'bg-emerald-600'
                  }`}
                  style={{ width: `${memoryPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Penyimpanan /home */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-slate-600" /> Penyimpanan /home
            </span>
            <span className="text-[10px] font-mono text-slate-400">{homeDisk.mount || '/home'}</span>
          </div>
          
          <div className="mt-1">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
                {homeDisk.used_gb || 0}
              </span>
              <span className="text-xs text-slate-500 font-mono">/ {homeDisk.total_gb || 0} GB</span>
            </div>

            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200 mb-2">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  !isStorageSafe ? 'bg-rose-600' : 'bg-slate-700'
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
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#1a73e8]" /> Total VRAM Klaster
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Dual GPU
            </span>
          </div>
          
          <div className="mt-1">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
                {vramUsedGb}
              </span>
              <span className="text-xs text-slate-500 font-mono">/ {vramTotalGb} GB · {vramPct}%</span>
            </div>

            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200 mb-2">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  vramPct >= 90 ? 'bg-rose-600' : 
                  vramPct >= 75 ? 'bg-amber-500' : 
                  'bg-[#1a73e8]'
                }`}
                style={{ width: `${vramPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span className="truncate text-slate-600">node-dgx-umpo01</span>
              <span className="text-[#1a73e8] font-semibold">{gpus.length} Kartu Aktif</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Keamanan & Status Layanan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Layanan & Backup
              </span>
            </div>
            
            <ul className="space-y-1.5 my-1.5">
              <li className="flex items-center justify-between text-[11px] font-mono text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  JupyterHub (:8090)
                </span>
                <span className="text-emerald-700 font-semibold text-[10px]">Ready</span>
              </li>
              <li className="flex items-center justify-between text-[11px] font-mono text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  SIMTIK Auth SSO
                </span>
                <span className="text-emerald-700 font-semibold text-[10px]">Synced</span>
              </li>
              <li className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                <span className={`w-1.5 h-1.5 rounded-full ${latestBackup ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span className="truncate">{backupText}</span>
              </li>
            </ul>
          </div>
          
          {isAdmin ? (
            <button
              onClick={onTriggerBackup}
              disabled={isBackingUp}
              className="w-full mt-2 py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 rounded-lg text-xs font-medium shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              type="button"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1a73e8]" />
                  <span>Mencadangkan…</span>
                </>
              ) : (
                <>
                  <DatabaseBackup className="w-3.5 h-3.5 text-[#1a73e8]" />
                  <span>Snapshot Database</span>
                </>
              )}
            </button>
          ) : (
            <div className="mt-2 py-1 px-2 rounded-md bg-slate-50 border border-slate-200 text-[10px] text-slate-500 font-mono text-center">
              Mode Monitoring (Read-Only)
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default memo(SystemOverview);
