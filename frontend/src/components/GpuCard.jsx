import React, { memo, useState } from 'react';
import { Shield, ShieldAlert, Copy, Check, Terminal } from 'lucide-react';

function GpuCard({ gpu, onOpenKillModal, isAdmin = false }) {
  const [copiedPid, setCopiedPid] = useState(null);
  const [hoveredBlock, setHoveredBlock] = useState(null);

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

  // Temperature threshold
  const tempStatus = temp >= 85 ? 'rose' : temp >= 75 ? 'amber' : 'emerald';

  const copyToClipboard = (text, pid) => {
    navigator.clipboard?.writeText(String(text));
    setCopiedPid(pid);
    setTimeout(() => setCopiedPid(null), 1500);
  };

  // ── VRAM Block Allocation Grid (Manifesto Section 6.A) ──
  // Calculate total blocks (e.g. 24 blocks or total GB blocks)
  const totalGbInt = Math.max(1, Math.round(vramTotalMb / 1024));
  const totalBlocks = Math.min(32, Math.max(16, totalGbInt)); // 16 to 32 blocks
  const mbPerBlock = vramTotalMb / totalBlocks;

  // Distribute processes into blocks
  const processes = gpu.processes || [];
  const allocatedBlocks = [];
  let remainingProcessBlocks = processes.map(p => ({
    ...p,
    neededBlocks: Math.max(1, Math.round((p.vram_mb || 0) / mbPerBlock))
  }));

  for (let i = 0; i < totalBlocks; i++) {
    // Find process that can claim this block
    const proc = remainingProcessBlocks.find(p => p.neededBlocks > 0);
    if (proc) {
      proc.neededBlocks -= 1;
      const isResearch = proc.username === 'labriset' || proc.username?.includes('riset');
      allocatedBlocks.push({
        index: i,
        occupied: true,
        isResearch,
        proc
      });
    } else {
      allocatedBlocks.push({
        index: i,
        occupied: false,
        proc: null
      });
    }
  }

  return (
    <div className="bg-[#111114] rounded-xl p-5 border border-[rgba(255,255,255,0.08)] flex flex-col gap-5">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgba(255,255,255,0.06)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#fafafa] tracking-tight">
              GPU {gpu.index}
            </h2>
            <span className="text-[10px] font-mono text-[#a1a1aa] px-1.5 py-0.2 rounded bg-[#18181b] border border-[rgba(255,255,255,0.06)]">
              {gpu.name || 'NVIDIA RTX'}
            </span>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Lab Komputasi AI · Dual Arch Workstation
          </p>
        </div>

        {/* Telemetry Pills: Temperature, Fan, Power */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#18181b] border border-[rgba(255,255,255,0.06)]">
            <span className={`w-1.5 h-1.5 rounded-full ${
              tempStatus === 'rose' ? 'bg-[#f43f5e]' : tempStatus === 'amber' ? 'bg-[#f59e0b]' : 'bg-[#10b981]'
            }`} />
            <span className="text-[#a1a1aa]">Suhu:</span>
            <span className={`tabular-nums font-semibold ${
              tempStatus === 'rose' ? 'text-[#fb7185]' : tempStatus === 'amber' ? 'text-[#fbbf24]' : 'text-[#fafafa]'
            }`}>
              {temp}°C
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-md bg-[#18181b] border border-[rgba(255,255,255,0.06)] text-[#a1a1aa]">
            Kipas: <span className="tabular-nums font-semibold text-[#fafafa]">{fan}%</span>
          </div>

          <div className="px-2.5 py-1 rounded-md bg-[#18181b] border border-[rgba(255,255,255,0.06)] text-[#a1a1aa]">
            Daya: <span className="tabular-nums font-semibold text-[#fafafa]">{power}W</span>
          </div>
        </div>
      </div>

      {/* Primary Metrics: Compute & VRAM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Compute Load */}
        <div className="p-3 bg-[#18181b] rounded-lg border border-[rgba(255,255,255,0.06)]">
          <div className="flex justify-between items-baseline text-xs mb-1.5">
            <span className="text-[#a1a1aa] font-medium">Beban Komputasi (Compute)</span>
            <span className="font-mono tabular-nums font-bold text-[#fafafa]">{computePct}%</span>
          </div>
          <div className="w-full bg-[#111114] h-1.5 rounded-full overflow-hidden border border-[rgba(255,255,255,0.06)]">
            <div 
              className={`h-full transition-all duration-300 ${computePct >= 90 ? 'bg-[#f43f5e]' : computePct >= 75 ? 'bg-[#f59e0b]' : 'bg-[#38bdf8]'}`}
              style={{ width: `${computePct}%` }}
            />
          </div>
        </div>

        {/* VRAM Memory Summary */}
        <div className="p-3 bg-[#18181b] rounded-lg border border-[rgba(255,255,255,0.06)]">
          <div className="flex justify-between items-baseline text-xs mb-1.5">
            <span className="text-[#a1a1aa] font-medium">Penggunaan VRAM</span>
            <span className="font-mono tabular-nums font-bold text-[#fafafa]">
              {vramUsedGb} <span className="text-[#71717a] font-normal">/ {vramTotalGb} GB</span> ({vramPct}%)
            </span>
          </div>
          <div className="w-full bg-[#111114] h-1.5 rounded-full overflow-hidden border border-[rgba(255,255,255,0.06)]">
            <div 
              className={`h-full transition-all duration-300 ${vramPct >= 90 ? 'bg-[#f43f5e]' : vramPct >= 75 ? 'bg-[#f59e0b]' : 'bg-[#10b981]'}`}
              style={{ width: `${vramPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* VRAM Block Allocation Grid (Manifesto Section 6.A) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#a1a1aa] text-[11px] uppercase tracking-wider">
            Alokasi Grid VRAM ({totalBlocks} Blok @ {(mbPerBlock / 1024).toFixed(1)} GB)
          </span>
          <span className="text-[#fafafa] tabular-nums font-medium">
            {vramUsedGb} / {vramTotalGb} GB · {vramPct}%
          </span>
        </div>

        {/* The Blocks Grid */}
        <div className="relative">
          <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 lg:grid-cols-24 gap-1 p-2 bg-[#18181b] rounded-lg border border-[rgba(255,255,255,0.06)]">
            {allocatedBlocks.map((block) => {
              const { index, occupied, isResearch, proc } = block;
              return (
                <div
                  key={index}
                  onMouseEnter={() => setHoveredBlock(block)}
                  onMouseLeave={() => setHoveredBlock(null)}
                  className={`h-5 rounded-sm transition-all cursor-pointer ${
                    occupied
                      ? isResearch
                        ? 'bg-[#6366f1] border border-[#818cf8]' // Research (Indigo)
                        : 'bg-[#0ea5e9] border border-[#38bdf8]' // Practicum (Sky)
                      : 'bg-[#111114] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.2)]'
                  }`}
                  title={occupied ? `PID ${proc?.pid} (${proc?.username}) · ${proc?.vram_mb} MB` : `Blok ${index + 1} Kosong`}
                />
              );
            })}
          </div>

          {/* Block Tooltip overlay if hovered */}
          {hoveredBlock && (
            <div className="mt-1.5 px-2.5 py-1 rounded bg-[#27272a] border border-[rgba(255,255,255,0.12)] text-[11px] font-mono text-[#fafafa] flex items-center justify-between shadow-md">
              {hoveredBlock.occupied ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${hoveredBlock.isResearch ? 'bg-[#818cf8]' : 'bg-[#38bdf8]'}`} />
                    <span>PID {hoveredBlock.proc?.pid}</span>
                    <span className="text-[#a1a1aa]">({hoveredBlock.proc?.username})</span>
                    <span className="text-[#71717a] truncate max-w-[200px]">{hoveredBlock.proc?.name}</span>
                  </div>
                  <span className="font-semibold text-[#38bdf8]">{hoveredBlock.proc?.vram_mb || 0} MB</span>
                </>
              ) : (
                <span className="text-[#a1a1aa]">Blok Kosong (Tersedia untuk komputasi)</span>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-[#a1a1aa] mt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#6366f1] border border-[#818cf8]" />
            <span>Riset (<code className="text-[#818cf8]">labriset</code>)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#0ea5e9] border border-[#38bdf8]" />
            <span>Praktikum (<code className="text-[#38bdf8]">training1-10</code>)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#111114] border border-[rgba(255,255,255,0.1)]" />
            <span>Idle / Kosong</span>
          </div>
        </div>
      </div>

      {/* Dense Process Table (Manifesto Section 6.D) */}
      <div className="mt-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-[#fafafa] tracking-tight">
            Tabel Proses Aktif ({processes.length})
          </h3>
          <span className="text-[10px] font-mono text-[#71717a]">
            Diurutkan berdasarkan VRAM
          </span>
        </div>

        <div className="border border-[rgba(255,255,255,0.08)] rounded-lg overflow-hidden bg-[#111114]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#18181b] text-[#a1a1aa] border-b border-[rgba(255,255,255,0.08)] font-mono text-[11px]">
              <tr>
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium text-right">PID</th>
                <th className="px-3 py-2 font-medium">Proses / Command</th>
                <th className="px-3 py-2 font-medium text-right">VRAM</th>
                {isAdmin && <th className="px-3 py-2 font-medium text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.04)] font-mono">
              {processes.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="px-3 py-6 text-center text-xs text-[#71717a]">
                    Tidak ada proses komputasi aktif pada GPU ini.
                  </td>
                </tr>
              ) : (
                processes.map((proc) => {
                  const isProtected = proc.is_system || !proc.is_killable;
                  const isResearch = proc.username === 'labriset' || proc.username?.includes('riset');
                  return (
                    <tr key={proc.pid} className="hover:bg-[#18181b] transition-colors">
                      {/* User with dot indicator */}
                      <td className="px-3 py-2 text-[#fafafa] font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isResearch ? 'bg-[#818cf8]' : 'bg-[#38bdf8]'
                          }`} />
                          <span className="truncate max-w-[90px]">{proc.username}</span>
                        </div>
                      </td>

                      {/* PID with copy button */}
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => copyToClipboard(proc.pid, proc.pid)}
                          className="inline-flex items-center gap-1 text-[#a1a1aa] hover:text-[#fafafa] transition-colors group"
                          title="Salin PID"
                          type="button"
                        >
                          <span className="tabular-nums font-mono">{proc.pid}</span>
                          {copiedPid === proc.pid ? (
                            <Check className="w-3 h-3 text-[#34d399]" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#71717a]" />
                          )}
                        </button>
                      </td>

                      {/* Process Command */}
                      <td className="px-3 py-2 max-w-[180px] sm:max-w-[240px] truncate text-[#a1a1aa]" title={proc.cmdline || proc.name}>
                        <div className="flex items-center gap-1.5">
                          {isProtected && <Shield className="w-3 h-3 text-[#71717a] shrink-0" title="Proses Sistem Terproteksi" />}
                          <span className="truncate">{proc.name}</span>
                        </div>
                      </td>

                      {/* VRAM in MB */}
                      <td className="px-3 py-2 text-right tabular-nums text-[#fafafa] font-semibold">
                        {proc.vram_mb || 0} <span className="text-[#71717a] text-[10px] font-normal">MB</span>
                      </td>

                      {/* Admin Kill Action */}
                      {isAdmin && (
                        <td className="px-3 py-2 text-right">
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
                              className="px-2 py-0.8 text-[11px] font-mono rounded bg-[rgba(244,63,94,0.1)] hover:bg-[rgba(244,63,94,0.2)] text-[#fb7185] border border-[rgba(244,63,94,0.2)] transition-colors"
                              title="Hentikan Proses (Terminate)"
                              type="button"
                            >
                              Hentikan
                            </button>
                          ) : (
                            <span className="text-[#71717a] text-[11px]">—</span>
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
  );
}

export default memo(GpuCard);
