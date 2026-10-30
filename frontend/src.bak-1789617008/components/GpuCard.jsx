import React, { memo } from 'react';
import { Cpu, Zap, Thermometer, Wind, XCircle, Lock } from 'lucide-react';

function GpuCard({ gpu, onOpenKillModal, isAdmin = false }) {
  if (!gpu) return null;

  const isLevel1 = gpu.index === 0;
  const vramPct = gpu.vram_percent || 0;
  const computePct = gpu.compute_percent || 0;

  const getProgressColor = (pct) => {
    if (pct >= 85) return 'bg-rose-500';
    if (pct >= 70) return 'bg-amber-500';
    return isLevel1 ? 'bg-indigo-500' : 'bg-emerald-500';
  };

  const getTempColor = (temp) => {
    if (temp >= 80) return 'text-rose-400';
    if (temp >= 65) return 'text-amber-400';
    return 'text-slate-300';
  };

  const tierTitle = isLevel1
    ? 'Tier 1: Riset Dosen & Skripsi TI UMPO'
    : 'Tier 2: Praktikum Mahasiswa TI UMPO';

  const userRole = isLevel1
    ? 'Akun: labriset (Dedicated 16 GB VRAM)'
    : 'Akun: training1-10 (Shared Pool 16 GB VRAM)';

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
      <div className={'absolute -right-16 -top-16 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none ' + (isLevel1 ? 'bg-indigo-500' : 'bg-emerald-500')} />

      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                GPU {gpu.index}
              </span>
              <span className={'text-xs font-semibold px-2.5 py-0.5 rounded-full border ' + (isLevel1 ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30')}>
                {tierTitle}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              {gpu.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Peruntukan: <span className="font-mono text-slate-200">{userRole}</span>
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className={'text-2xl font-extrabold font-mono tracking-tight ' + (computePct > 0 ? (isLevel1 ? 'text-indigo-400' : 'text-emerald-400') : 'text-slate-400')}>
              {computePct}%
            </span>
            <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Compute Load
            </span>
          </div>
        </div>

        {/* Compute Load Bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              Utilisasi CUDA Compute
            </span>
            <span className="font-mono font-medium text-slate-300">{computePct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={'h-full transition-all duration-500 rounded-full ' + getProgressColor(computePct)}
              style={{ width: `${Math.min(computePct, 100)}%` }}
            />
          </div>
        </div>

        {/* VRAM Memory Usage */}
        <div className="mb-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Memori VRAM GDDR7
            </span>
            <div className="text-xs font-mono">
              <span className="font-bold text-white">{(gpu.vram_used_mb / 1024).toFixed(2)} GB</span>
              <span className="text-slate-500"> / {(gpu.vram_total_mb / 1024).toFixed(1)} GB</span>
              <span className="text-slate-400 ml-1.5 font-semibold">({vramPct}%)</span>
            </div>
          </div>

          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden mb-2">
            <div
              className={'h-full transition-all duration-500 rounded-full ' + getProgressColor(vramPct)}
              style={{ width: `${Math.min(vramPct, 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>Tersedia: {(gpu.vram_free_mb / 1024).toFixed(2)} GB</span>
            <span>Bus Controller: {gpu.memory_util_percent}%</span>
          </div>
        </div>

        {/* Hardware Sensors */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-center gap-1 mb-1">
              <Thermometer className="w-3 h-3 text-rose-400" /> Suhu
            </span>
            <span className={`text-base font-bold font-mono ${getTempColor(gpu.temperature_c)}`}>
              {gpu.temperature_c}°C
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-center gap-1 mb-1">
              <Zap className="w-3 h-3 text-amber-400" /> Daya
            </span>
            <span className="text-base font-bold font-mono text-slate-200">
              {gpu.power_w} W
            </span>
            <span className="text-[10px] text-slate-500 block">/ {gpu.power_limit_w} W</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-center gap-1 mb-1">
              <Wind className="w-3 h-3 text-blue-400" /> Kipas
            </span>
            <span className="text-base font-bold font-mono text-slate-200">
              {gpu.fan_speed_percent}%
            </span>
          </div>
        </div>

        {/* Active GPU Processes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">
              Proses Komputasi Berjalan ({gpu.processes?.length || 0})
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Real-time telemetry</span>
          </div>

          {gpu.processes && gpu.processes.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {gpu.processes.map((proc) => (
                <div
                  key={proc.pid}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs font-mono"
                >
                  <div className="truncate pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-indigo-400">{proc.username}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300 truncate font-semibold">{proc.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      PID: {proc.pid} | VRAM: {proc.vram_mb} MB | CPU: {proc.cpu_percent}%
                    </div>
                  </div>

                  {isAdmin ? (
                    <button
                      onClick={() =>
                        onOpenKillModal({
                          pid: proc.pid,
                          username: proc.username,
                          procName: proc.name,
                          cmdline: proc.cmdline,
                          vramMb: proc.vram_mb
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-sans text-xs font-bold shadow-md transition shrink-0 flex items-center gap-1 cursor-pointer"
                      title="Hentikan Proses (SIGKILL)"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Kill</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-sans flex items-center gap-1 shrink-0">
                      <Lock className="w-3 h-3 text-slate-600" />
                      <span>Read-Only</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              Tidak ada proses aktif yang berjalan di GPU ini.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(GpuCard);
