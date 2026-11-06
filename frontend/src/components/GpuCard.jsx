import React, { memo, useState } from 'react';
import { Shield, Copy, Check, Sparkles, Loader2 } from 'lucide-react';

function GpuCard({ gpu, onOpenKillModal, isAdmin = false, onSweepZombies }) {
  const [copiedPid, setCopiedPid] = useState(null);
  const [hoveredBlock, setHoveredBlock] = useState(null);
  const [isSweeping, setIsSweeping] = useState(false);

  if (!gpu) return null;

  const vramPct = Math.round(gpu.vram_percent || 0);
  const computePct = Math.round(gpu.compute_percent || 0);
  const vramUsedMb = gpu.vram_used_mb || 0;
  const vramTotalMb = gpu.vram_total_mb || 16384;
  const vramUsedGb = (vramUsedMb / 1024).toFixed(1);
  const vramTotalGb = (vramTotalMb / 1024).toFixed(0);

  const temp = gpu.temperature_c ?? 0;
  const fan = gpu.fan_speed_percent ?? 0;
  const power = gpu.power_w ?? 0;
  const maxPower = gpu.power_limit_w ?? 250;

  const isHighCompute = computePct >= 85;
  const isHighVram = vramPct >= 90;
  const isHighTemp = temp >= 80;

  const processes = gpu.processes || [];

  const copyToClipboard = (text, pid) => {
    navigator.clipboard?.writeText?.(String(text));
    setCopiedPid(pid);
    setTimeout(() => setCopiedPid(null), 1500);
  };

  const handleSweepZombies = async () => {
    if (!onSweepZombies || isSweeping) return;
    if (!confirm(
      'Sapu proses Python/IPython orphan di GPU 1?\n\n' +
      'Hanya proses milik mahasiswa yang sesi notebook-nya sudah tidak aktif yang akan dihentikan. ' +
      'Sesi yang masih berjalan, akun aslab, dan mahasiswa Level 1 tidak disentuh.'
    )) return;
    setIsSweeping(true);
    try {
      await onSweepZombies();
    } finally {
      setIsSweeping(false);
    }
  };

  // Generate 32 VRAM blocks representation
  const TOTAL_BLOCKS = 32;
  const occupiedBlocksCount = Math.min(TOTAL_BLOCKS, Math.round((vramPct / 100) * TOTAL_BLOCKS));

  const sortedProcesses = [...processes].sort((a, b) => (b.vram_mb || 0) - (a.vram_mb || 0));
  
  const blocks = Array.from({ length: TOTAL_BLOCKS }).map((_, i) => {
    if (i >= occupiedBlocksCount) {
      return { id: i, type: 'free', proc: null, label: 'Siap Pakai' };
    }
    
    let cumBlocks = 0;
    for (const proc of sortedProcesses) {
      const procBlocks = Math.max(1, Math.round(((proc.vram_mb || 0) / vramTotalMb) * TOTAL_BLOCKS));
      if (i < cumBlocks + procBlocks) {
        const isPriority = proc.username === 'labriset' || proc.username?.includes('riset');
        return {
          id: i,
          type: isPriority ? 'priority' : 'training',
          proc,
          label: `${proc.username} (${proc.vram_mb || 0} MB)`
        };
      }
      cumBlocks += procBlocks;
    }

    return { id: i, type: 'system', proc: null, label: 'Sistem / Cache' };
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col gap-4 font-sans hover:border-slate-300 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs shrink-0">
            {gpu.index}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-sans text-sm font-bold text-slate-900 tracking-tight">
                {gpu.name || `NVIDIA RTX ${gpu.index}`}
              </h2>
              {gpu.index === 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                  Prioritas Riset (Dedicated)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Praktikum (Shared Pool)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Slot PCIe · Bus ID: {gpu.bus_id || '0000:01:00.0'}
            </p>
          </div>
        </div>

        {/* Vital Telemetry Badges */}
        <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
          <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
            isHighTemp 
              ? 'bg-rose-50 border-rose-200 text-rose-700' 
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <span className="text-[10px] uppercase font-sans font-semibold text-slate-400">Suhu</span>
            <span className="font-bold">{temp}°C</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl border bg-slate-50 border-slate-200 text-slate-700 flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-sans font-semibold text-slate-400">Kipas</span>
            <span className="font-bold">{fan}%</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl border bg-slate-50 border-slate-200 text-slate-700 flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-sans font-semibold text-slate-400">Daya</span>
            <span className="font-bold">{power}W</span>
            <span className="text-[10px] text-slate-400">/{maxPower}W</span>
          </div>

          {gpu.index === 1 && isAdmin && onSweepZombies && (
            <div className="flex items-center pl-1 border-l border-slate-200">
              <button
                onClick={handleSweepZombies}
                disabled={isSweeping}
                className="px-3 py-1.5 rounded-lg border-2 border-amber-400 hover:border-amber-500 bg-amber-50 hover:bg-amber-100 text-amber-900 shadow-xs transition-all active:scale-[0.98] flex items-center gap-1.5 font-mono text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                type="button"
                title="Bersihkan proses zombie/orphan yang menahan VRAM di GPU 1"
              >
                {isSweeping ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>Sapu Zombie</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Primary Metrics: Compute & VRAM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Compute Load */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex justify-between items-baseline text-xs mb-1.5">
            <span className="text-slate-500 font-medium">Beban Komputasi (Compute)</span>
            <span className="font-mono tabular-nums font-bold text-slate-900">{computePct}%</span>
          </div>
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-slate-200">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                computePct >= 90 ? 'bg-rose-500' : 
                computePct >= 75 ? 'bg-amber-500' : 
                'bg-sky-600'
              }`}
              style={{ width: `${computePct}%` }}
            />
          </div>
        </div>

        {/* VRAM Memory Summary */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex justify-between items-baseline text-xs mb-1.5">
            <span className="text-slate-500 font-medium">Alokasi VRAM</span>
            <span className="font-mono tabular-nums font-bold text-slate-900">
              {vramUsedGb} <span className="text-slate-400 font-normal">/ {vramTotalGb} GB</span> ({vramPct}%)
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-slate-200">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                vramPct >= 90 ? 'bg-rose-500' : 
                vramPct >= 75 ? 'bg-amber-500' : 
                'bg-emerald-600'
              }`}
              style={{ width: `${vramPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* VRAM Block Allocation Grid (Tactile 32-slot) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-sans font-semibold text-slate-400 uppercase tracking-wider">
            Peta Alokasi Blok VRAM (32 Slot · 512MB/Slot)
          </span>
          <span className="text-[10px] font-mono text-emerald-600 font-semibold">
            {hoveredBlock ? hoveredBlock.label : `${occupiedBlocksCount}/32 Slot Terisi`}
          </span>
        </div>

        <div className="grid grid-cols-16 sm:grid-cols-32 gap-1 p-2 rounded-xl bg-slate-50 border border-slate-200">
          {blocks.map((b) => {
            let color = 'bg-white border-slate-200';
            if (b.type === 'priority') color = 'bg-violet-600 border-violet-700 shadow-xs';
            else if (b.type === 'training') color = 'bg-emerald-500 border-emerald-600 shadow-xs';
            else if (b.type === 'system') color = 'bg-slate-400 border-slate-500';

            return (
              <div
                key={b.id}
                onMouseEnter={() => setHoveredBlock(b)}
                onMouseLeave={() => setHoveredBlock(null)}
                className={`h-4 sm:h-5 rounded-[4px] border transition-colors duration-150 cursor-pointer hover:brightness-110 hover:border-slate-400 ${color}`}
                title={b.label}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 pt-1 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-violet-600 border border-violet-700" />
            <span>Riset (<code className="text-slate-800 font-bold">labriset</code>)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-emerald-500 border border-emerald-600" />
            <span>Praktikum (<code className="text-slate-800 font-bold">training1-10</code>)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-white border border-slate-200" />
            <span>Idle / Siap Pakai</span>
          </div>
        </div>
      </div>

      {/* Process Table with Responsive Overflow */}
      <div className="mt-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-900 tracking-tight">
            Tabel Proses Aktif ({processes.length})
          </h3>
          <span className="text-[10px] font-mono text-slate-400">
            Diurutkan berdasarkan alokasi VRAM
          </span>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[500px]">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-mono text-[11px]">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">User</th>
                  <th className="px-3 py-2.5 font-semibold text-right">PID</th>
                  <th className="px-3 py-2.5 font-semibold">Proses / Command</th>
                  <th className="px-3 py-2.5 font-semibold text-right">VRAM</th>
                  {isAdmin && <th className="px-3 py-2.5 font-semibold text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {processes.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="px-3 py-6 text-center text-xs text-slate-400">
                      Tidak ada proses komputasi aktif pada GPU ini.
                    </td>
                  </tr>
                ) : (
                  processes.map((proc) => {
                    const isProtected = proc.is_system || !proc.is_killable;
                    const isResearch = proc.username === 'labriset' || proc.username?.includes('riset');
                    return (
                      <tr key={proc.pid} className="hover:bg-slate-50 transition-colors">
                        {/* User with dot indicator */}
                        <td className="px-3 py-2.5 text-slate-900 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isResearch ? 'bg-violet-600' : 'bg-emerald-500'
                            }`} />
                            <span className="truncate max-w-[100px] font-semibold">{proc.username}</span>
                          </div>
                        </td>

                        {/* PID with copy button */}
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => copyToClipboard(proc.pid, proc.pid)}
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors group p-1 cursor-pointer"
                            title="Salin PID"
                            type="button"
                          >
                            <span className="tabular-nums font-mono">{proc.pid}</span>
                            {copiedPid === proc.pid ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                            )}
                          </button>
                        </td>

                        {/* Process Command */}
                        <td className="px-3 py-2.5 max-w-[200px] sm:max-w-[260px] truncate text-slate-600" title={proc.cmdline || proc.name}>
                          <div className="flex items-center gap-1.5">
                            {isProtected && <Shield className="w-3 h-3 text-slate-400 shrink-0" title="Proses Sistem Terproteksi" />}
                            <span className="truncate font-sans">{proc.name}</span>
                          </div>
                        </td>

                        {/* VRAM in MB */}
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-900 font-bold">
                          {proc.vram_mb || 0} <span className="text-slate-400 text-[10px] font-normal">MB</span>
                        </td>

                        {/* Admin Kill Action */}
                        {isAdmin && (
                          <td className="px-3 py-2.5 text-right">
                            {!isProtected ? (
                              <button
                                onClick={() => onOpenKillModal({
                                  pid: proc.pid,
                                  username: proc.username,
                                  procName: proc.name,
                                  cmdline: proc.cmdline,
                                  vramMb: proc.vram_mb,
                                  is_system: proc.is_system
                                })}
                                className="px-2.5 py-1 text-[11px] font-mono font-medium rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors min-h-[32px] inline-flex items-center justify-center cursor-pointer"
                                title="Hentikan Proses (Terminate)"
                                type="button"
                              >
                                Hentikan
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(GpuCard);
