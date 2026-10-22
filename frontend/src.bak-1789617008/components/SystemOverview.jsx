import React, { memo } from 'react';
import { HardDrive, Server, Layers, MemoryStick as Memory } from 'lucide-react';

function SystemOverview({ system }) {
  if (!system) return null;

  const { cpu, memory, disks } = system;

  const getUsageColor = (pct) => {
    if (pct >= 85) return 'bg-rose-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white tracking-tight">
            Infrastruktur Server Laboratorium Komputasi TI UMPO
          </h2>
        </div>
        <span className="text-xs font-mono text-slate-400">
          24 vCPU Threads • 128 GB RAM Server
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Host Total RAM */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Memory className="w-3.5 h-3.5 text-blue-400" />
              Total RAM Server
            </span>
            <span className="text-xs font-mono font-bold text-white">{memory.percent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
            <div
              className={'h-full transition-all duration-500 rounded-full ' + getUsageColor(memory.percent)}
              style={{ width: `${Math.min(memory.percent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>Terpakai: {memory.used_gb} GB</span>
            <span>Total: {memory.total_gb} GB</span>
          </div>
        </div>

        {/* Umbrella user.slice (100G) */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Batas Payung Kuota User
            </span>
            <span className="text-xs font-mono font-bold text-indigo-300">
              {memory.user_slice_percent || 0}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
            <div
              className="h-full bg-indigo-500 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(memory.user_slice_percent || 0, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>Terpakai: {memory.user_slice_used_gb || 0} GB</span>
            <span>Maks: {memory.user_slice_max_gb || 100} GB</span>
          </div>
        </div>

        {/* CPU Overall & Cores */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              Beban CPU ({cpu.core_count} Threads)
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">{cpu.overall_percent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
            <div
              className={'h-full transition-all duration-500 rounded-full ' + getUsageColor(cpu.overall_percent)}
              style={{ width: `${Math.min(cpu.overall_percent, 100)}%` }}
            />
          </div>
          {/* Mini 24 core indicator */}
          <div className="flex items-center gap-0.5 pt-0.5">
            {cpu.cores_percent && cpu.cores_percent.map((c, idx) => (
              <div
                key={idx}
                className={'h-2.5 flex-1 rounded-xs transition-colors ' + (c > 80 ? 'bg-rose-500' : c > 50 ? 'bg-amber-500' : c > 20 ? 'bg-emerald-500' : 'bg-slate-800')}
                title={`Core ${idx}: ${c}%`}
              />
            ))}
          </div>
        </div>

        {/* Home Storage (Datasets & Models) */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-purple-400" />
              Dataset & Model (/home)
            </span>
            <span className="text-xs font-mono font-bold text-white">{disks.home ? disks.home.percent : 0}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
            <div
              className={'h-full transition-all duration-500 rounded-full ' + getUsageColor(disks.home ? disks.home.percent : 0)}
              style={{ width: `${Math.min(disks.home ? disks.home.percent : 0, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>Terpakai: {disks.home ? disks.home.used_gb : 0} GB</span>
            <span>Sisa: {disks.home ? disks.home.free_gb : 0} GB</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(SystemOverview);
