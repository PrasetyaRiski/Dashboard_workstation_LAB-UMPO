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
    <div className="bg-[#F3EBDD] rounded-2xl border border-[#E4D8C3] p-4 sm:p-5 shadow-warm-xs flex flex-col gap-4 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4D8C3] pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FAF6EF] text-[#6F4E37] border border-[#E4D8C3] flex items-center justify-center font-serif font-bold text-sm shadow-xs shrink-0">
            {gpu.index}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-sm font-bold text-[#2E2018] tracking-tight">
                {gpu.name || `NVIDIA RTX ${gpu.index}`}
              </h2>
              {gpu.index === 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                  Prioritas Riset
                </span>
              )}
            </div>
            <p className="text-xs text-[#7A6A5C] font-mono mt-0.5">
              Slot PCIe · Bus ID: {gpu.bus_id || '0000:01:00.0'}
            </p>
          </div>
        </div>

        {/* Vital Telemetry Badges */}
        <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
          <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
            isHighTemp 
              ? 'bg-[#FEE2E2] border-[#FCA5A5] text-[#C53030]' 
              : 'bg-[#FAF6EF] border-[#E4D8C3] text-[#3B2E26]'
          }`}>
            <span className="text-[10px] uppercase font-sans font-semibold text-[#7A6A5C]">Suhu</span>
            <span className="font-bold">{temp}°C</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl border bg-[#FAF6EF] border-[#E4D8C3] text-[#3B2E26] flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-sans font-semibold text-[#7A6A5C]">Kipas</span>
            <span className="font-bold">{fan}%</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl border bg-[#FAF6EF] border-[#E4D8C3] text-[#3B2E26] flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-sans font-semibold text-[#7A6A5C]">Daya</span>
            <span className="font-bold">{power}W</span>
            <span className="text-[10px] text-[#7A6A5C]">/{maxPower}W</span>
          </div>

          {gpu.index === 1 && isAdmin && onSweepZombies && (
            <button
              onClick={handleSweepZombies}
              disabled={isSweeping}
              className="px-2.5 py-1 rounded-xl border bg-[#FAF6EF] hover:bg-[#EFE6D8] text-[#6F4E37] hover:text-[#2E2018] border-[#E4D8C3] shadow-warm-xs transition-all active:translate-y-0.5 flex items-center gap-1.5 font-sans font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              title="Bersihkan proses zombie/orphan yang menahan VRAM di GPU 1"
            >
              {isSweeping ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[#B45309]" />
              )}
              <span className="text-[10px] uppercase tracking-wide">Sapu Zombie</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Metrics: Compute & VRAM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Compute Load */}
        <div className="p-3 bg-[#FAF6EF] rounded-xl border border-[#E4D8C3]">
          <div className="flex justify-between items-baseline text-xs mb-1.5">
            <span className="text-[#7A6A5C] font-medium">Beban Komputasi (Compute)</span>
            <span className="font-mono tabular-nums font-bold text-[#2E2018]">{computePct}%</span>
          </div>
          <div className="w-full bg-[#EFE6D8] h-2.5 rounded-full overflow-hidden border border-[#E4D8C3]">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                computePct >= 90 ? 'bg-[#C53030]' : 
                computePct >= 75 ? 'bg-[#B45309]' : 
                'bg-[#6F4E37]'
              }`}
              style={{ width: `${computePct}%` }}
            />
          </div>
        </div>

        {/* VRAM Memory Summary */}
        <div className="p-3 bg-[#FAF6EF] rounded-xl border border-[#E4D8C3]">
          <div className="flex justify-between items-baseline text-xs mb-1.5">
            <span className="text-[#7A6A5C] font-medium">Alokasi VRAM</span>
            <span className="font-mono tabular-nums font-bold text-[#2E2018]">
              {vramUsedGb} <span className="text-[#7A6A5C] font-normal">/ {vramTotalGb} GB</span> ({vramPct}%)
            </span>
          </div>
          <div className="w-full bg-[#EFE6D8] h-2.5 rounded-full overflow-hidden border border-[#E4D8C3]">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                vramPct >= 90 ? 'bg-[#C53030]' : 
                vramPct >= 75 ? 'bg-[#B45309]' : 
                'bg-[#C8794A]'
              }`}
              style={{ width: `${vramPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* VRAM Block Allocation Grid (Tactile 32-slot) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-sans font-semibold text-[#7A6A5C] uppercase tracking-wider">
            Peta Alokasi Blok VRAM (32 Slot · 512MB/Slot)
          </span>
          <span className="text-[10px] font-mono text-[#6F4E37] font-semibold">
            {hoveredBlock ? hoveredBlock.label : `${occupiedBlocksCount}/32 Slot Terisi`}
          </span>
        </div>

        <div className="grid grid-cols-16 sm:grid-cols-32 gap-1 p-2 rounded-xl bg-[#FAF6EF] border border-[#E4D8C3]">
          {blocks.map((b) => {
            let color = 'bg-[#FAF6EF] border-[#E4D8C3]';
            if (b.type === 'priority') color = 'bg-[#C8794A] border-[#A8582C]';
            else if (b.type === 'training') color = 'bg-[#6F4E37] border-[#4A3426]';
            else if (b.type === 'system') color = 'bg-[#7A6A5C] border-[#5A4A3E]';

            return (
              <div
                key={b.id}
                onMouseEnter={() => setHoveredBlock(b)}
                onMouseLeave={() => setHoveredBlock(null)}
                className={`h-4 sm:h-5 rounded-[4px] border transition-all duration-150 cursor-pointer hover:scale-110 ${color}`}
                title={b.label}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-[#7A6A5C] pt-1 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-[#C8794A] border border-[#A8582C]" />
            <span>Riset (<code className="text-[#2E2018] font-bold">labriset</code>)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-[#6F4E37] border border-[#4A3426]" />
            <span>Praktikum (<code className="text-[#2E2018] font-bold">training1-10</code>)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-[#FAF6EF] border border-[#E4D8C3]" />
            <span>Idle / Siap Pakai</span>
          </div>
        </div>
      </div>

      {/* Process Table with Responsive Overflow */}
      <div className="mt-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-[#2E2018] tracking-tight">
            Tabel Proses Aktif ({processes.length})
          </h3>
          <span className="text-[10px] font-mono text-[#7A6A5C]">
            Diurutkan berdasarkan alokasi VRAM
          </span>
        </div>

        <div className="border border-[#E4D8C3] rounded-xl overflow-hidden bg-[#FAF6EF] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[500px]">
              <thead className="bg-[#EFE6D8] text-[#2E2018] border-b border-[#E4D8C3] font-mono text-[11px]">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">User</th>
                  <th className="px-3 py-2.5 font-semibold text-right">PID</th>
                  <th className="px-3 py-2.5 font-semibold">Proses / Command</th>
                  <th className="px-3 py-2.5 font-semibold text-right">VRAM</th>
                  {isAdmin && <th className="px-3 py-2.5 font-semibold text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4D8C3] font-mono text-[#3B2E26]">
                {processes.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="px-3 py-6 text-center text-xs text-[#7A6A5C]">
                      Tidak ada proses komputasi aktif pada GPU ini.
                    </td>
                  </tr>
                ) : (
                  processes.map((proc) => {
                    const isProtected = proc.is_system || !proc.is_killable;
                    const isResearch = proc.username === 'labriset' || proc.username?.includes('riset');
                    return (
                      <tr key={proc.pid} className="hover:bg-[#F3EBDD] transition-colors">
                        {/* User with dot indicator */}
                        <td className="px-3 py-2.5 text-[#2E2018] font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isResearch ? 'bg-[#C8794A]' : 'bg-[#6F4E37]'
                            }`} />
                            <span className="truncate max-w-[100px] font-semibold">{proc.username}</span>
                          </div>
                        </td>

                        {/* PID with copy button */}
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => copyToClipboard(proc.pid, proc.pid)}
                            className="inline-flex items-center gap-1 text-[#7A6A5C] hover:text-[#6F4E37] transition-colors group p-1"
                            title="Salin PID"
                            type="button"
                          >
                            <span className="tabular-nums font-mono">{proc.pid}</span>
                            {copiedPid === proc.pid ? (
                              <Check className="w-3 h-3 text-[#2E7D32]" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#7A6A5C]" />
                            )}
                          </button>
                        </td>

                        {/* Process Command */}
                        <td className="px-3 py-2.5 max-w-[200px] sm:max-w-[260px] truncate text-[#3B2E26]" title={proc.cmdline || proc.name}>
                          <div className="flex items-center gap-1.5">
                            {isProtected && <Shield className="w-3 h-3 text-[#7A6A5C] shrink-0" title="Proses Sistem Terproteksi" />}
                            <span className="truncate font-sans">{proc.name}</span>
                          </div>
                        </td>

                        {/* VRAM in MB */}
                        <td className="px-3 py-2.5 text-right tabular-nums text-[#2E2018] font-bold">
                          {proc.vram_mb || 0} <span className="text-[#7A6A5C] text-[10px] font-normal">MB</span>
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
                                className="px-2.5 py-1 text-[11px] font-mono font-medium rounded-lg bg-[#FEE2E2] hover:bg-[#FCA5A5] text-[#C53030] border border-[#FCA5A5] transition-colors min-h-[32px] inline-flex items-center justify-center cursor-pointer"
                                title="Hentikan Proses (Terminate)"
                                type="button"
                              >
                                Hentikan
                              </button>
                            ) : (
                              <span className="text-[#7A6A5C] text-[11px]">—</span>
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
