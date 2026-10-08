import React, { memo } from 'react';
import { Thermometer, Wind, XCircle, Lock, Shield, Zap, Users, Flame, Cpu } from 'lucide-react';

/* VRAM Block Allocation Grid — 16 blocks = 16 GB */
function VramBlockGrid({ processes = [], totalMb = 16384 }) {
  const BLOCKS = 16;
  const blockMb = totalMb / BLOCKS;

  const blockMap = new Array(BLOCKS).fill(null);
  let filledMb = 0;

  processes.forEach((proc) => {
    const mb = proc.vram_mb || 0;
    const blocks = Math.ceil(mb / blockMb);
    for (let i = 0; i < blocks; i++) {
      const slot = Math.floor(filledMb / blockMb) + i;
      if (slot < BLOCKS) blockMap[slot] = proc;
    }
    filledMb += mb;
  });

  const procColors = [
    '#4cd7f6', '#4edea3', '#fbbf24', '#ffb4ab',
    '#c0c1ff', '#acedff', '#e1e0ff', '#6ffbbe'
  ];

  const colorMap = {};
  let colorIdx = 0;
  processes.forEach((p) => {
    if (!(p.username in colorMap)) {
      colorMap[p.username] = procColors[colorIdx % procColors.length];
      colorIdx++;
    }
  });

  return (
    <div className="flex flex-col gap-1.5 mt-2">
      <div className="flex justify-between items-center text-[10px] font-mono text-text-muted">
        <span>VRAM Blocks ({BLOCKS} Slices)</span>
        <span>~1 GB / block</span>
      </div>
      <div className="flex items-end gap-1 h-5">
        {blockMap.map((proc, idx) => {
          const color = proc ? colorMap[proc.username] : '#262a34';
          const title = proc
            ? `${proc.username} — ${proc.name}\nVRAM: ${proc.vram_mb} MB`
            : `Blok #${idx + 1}: Kosong`;
          return (
            <div
              key={idx}
              title={title}
              className="flex-1 rounded-sm transition-all duration-300"
              style={{
                background: color,
                opacity: proc ? 0.9 : 0.3,
                height: proc ? '100%' : '50%',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function GpuCard({ gpu, onOpenKillModal, isAdmin = false }) {
  if (!gpu) return null;

  const isLevel1 = gpu.index === 0;
  const vramPct = gpu.vram_percent || 0;
  const computePct = gpu.compute_percent || 0;

  const vramUsedGb = (((gpu.vram_used_mb || 0)) / 1024).toFixed(2);
  const vramTotalGb = (((gpu.vram_total_mb || 16384)) / 1024).toFixed(1);

  const topProc = gpu.processes && gpu.processes[0];
  const uniqueUsers = Array.from(new Set((gpu.processes || []).map(p => p.username).filter(Boolean)));

  return (
    <div className={`bg-surface-2 rounded-xl p-6 shadow-xl relative flex flex-col justify-between border-t-2 ${
      isLevel1 ? 'border-neon-cyan' : 'border-secondary'
    } border-x border-b border-border-subtle`}>
      <div className="flex flex-col gap-4">
        {/* Card Header & Badge — Stitch Style */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-surface-1 flex items-center justify-center border ${
              isLevel1 ? 'border-neon-cyan/30 text-neon-cyan' : 'border-secondary/30 text-secondary'
            }`}>
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline-md text-base font-bold text-text-primary">
                  GPU {gpu.index}
                </span>
                <span className="font-mono text-xs text-outline font-normal">
                  {gpu.name || 'NVIDIA GeForce RTX 5060 Ti'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                  isLevel1
                    ? 'bg-surface-container-high text-neon-cyan border border-neon-cyan/20'
                    : 'bg-surface-container-high text-secondary-fixed border border-secondary/20'
                }`}>
                  {isLevel1 ? 'Level 1 (Priority / Skripsi)' : 'Level 2 (Standard / Praktikum)'}
                </span>
                <span className="font-mono text-[10px] text-outline">
                  {isLevel1 ? 'compute-level1.slice' : 'compute-level2.slice'}
                </span>
              </div>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 text-neon-emerald bg-surface-1 px-2.5 py-1 rounded border border-border-base">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-emerald animate-pulse"></span>
            <span className="font-mono text-[10px] font-semibold uppercase">ONLINE</span>
          </div>
        </div>

        {/* Level 1: Admission Control Slot Banner | Level 2: Multi-Tenant Visual */}
        {isLevel1 ? (
          <div className="bg-surface-1 p-3.5 rounded-lg border border-border-base">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
                Admission Control Quota
              </span>
              <span className={`font-mono text-xs font-semibold ${topProc ? 'text-neon-amber' : 'text-neon-emerald'}`}>
                {topProc ? `[Slot Prioritas: 1/1 Terpakai - ${topProc.username || 'User'}]` : '[Slot Prioritas: 0/1 Tersedia]'}
              </span>
            </div>
            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden flex">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  topProc ? 'bg-neon-cyan' : 'bg-neon-emerald'
                }`}
                style={{ width: topProc ? '100%' : '0%' }}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5 font-mono text-[10px] text-outline">
              <span>Maks: 1 Mahasiswa Dedicated Paralel</span>
              <span className={topProc ? 'text-neon-amber font-medium' : 'text-neon-emerald font-medium'}>
                {topProc ? 'Slot Terpakai untuk Skripsi' : '1 Slot Tersedia untuk Reservasi'}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-surface-1 p-3.5 rounded-lg border border-border-base">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
                Multi-Tenant Fair-Share Pool
              </span>
              <span className="font-mono text-xs font-semibold text-secondary-fixed">
                [{uniqueUsers.length} Mahasiswa / Akun Aktif]
              </span>
            </div>
            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden flex gap-0.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-full flex-1 rounded-sm ${
                    i < uniqueUsers.length ? 'bg-secondary' : 'bg-surface-variant'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between items-center mt-1.5 font-mono text-[10px] text-outline">
              <span>Time-sliced GPU Virtualization</span>
              <span className="text-secondary-fixed font-medium">FairQ Scheduler Active</span>
            </div>
          </div>
        )}

        {/* Detailed Hardware Telemetry Grid (4 Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Temperature */}
          <div className="bg-surface-1 p-2.5 rounded-lg flex flex-col border border-border-subtle">
            <div className="flex items-center gap-1 mb-0.5">
              <Thermometer className="w-3 h-3 text-neon-rose" />
              <span className="font-mono text-[9px] text-text-muted uppercase">TEMPERATURE</span>
            </div>
            <span className="font-mono text-sm font-bold text-text-primary">
              {gpu.temperature_c ?? 0}°C
            </span>
            <span className="font-mono text-[9px] text-outline">Max: 89°C</span>
          </div>

          {/* Fan Speed */}
          <div className="bg-surface-1 p-2.5 rounded-lg flex flex-col border border-border-subtle">
            <div className="flex items-center gap-1 mb-0.5">
              <Wind className="w-3 h-3 text-neon-cyan" />
              <span className="font-mono text-[9px] text-text-muted uppercase">FAN SPEED</span>
            </div>
            <span className="font-mono text-sm font-bold text-text-primary">
              {gpu.fan_speed_percent ?? 0}%
            </span>
            <span className="font-mono text-[9px] text-outline">Auto Curve</span>
          </div>

          {/* Power Draw */}
          <div className="bg-surface-1 p-2.5 rounded-lg flex flex-col border border-border-subtle">
            <div className="flex items-center gap-1 mb-0.5">
              <Zap className="w-3 h-3 text-neon-amber" />
              <span className="font-mono text-[9px] text-text-muted uppercase">POWER DRAW</span>
            </div>
            <span className="font-mono text-sm font-bold text-text-primary">
              {gpu.power_w ?? 0} W
            </span>
            <span className="font-mono text-[9px] text-outline">TDP: {gpu.power_limit_w ?? 285} W</span>
          </div>

          {/* VRAM Allocation */}
          <div className="bg-surface-1 p-2.5 rounded-lg flex flex-col border border-border-subtle">
            <div className="flex items-center gap-1 mb-0.5">
              <Cpu className="w-3 h-3 text-tertiary" />
              <span className="font-mono text-[9px] text-text-muted uppercase">VRAM USAGE</span>
            </div>
            <span className="font-mono text-sm font-bold text-text-primary">
              {vramUsedGb} GB
            </span>
            <span className="font-mono text-[9px] text-outline">{vramPct}% / {vramTotalGb} GB</span>
          </div>
        </div>

        {/* VRAM Block Allocation Grid */}
        <div className="bg-surface-1 p-3 rounded-lg border border-border-subtle">
          <VramBlockGrid processes={gpu.processes || []} totalMb={gpu.vram_total_mb || 16384} />
        </div>

        {/* Active AI Processes Table */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider font-semibold">
              Proses Komputasi Aktif ({gpu.processes?.length || 0})
            </span>
            <span className="font-mono text-[10px] text-outline">
              GPU Compute: <strong className="text-neon-cyan">{computePct}%</strong>
            </span>
          </div>

          <div className="rounded-lg bg-surface-1 border border-border-base overflow-hidden">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="bg-surface-3 text-text-muted text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">PID</th>
                  <th className="px-3 py-2">Task / Command</th>
                  <th className="px-3 py-2 text-right">VRAM</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  {isAdmin && <th className="px-3 py-2 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {!gpu.processes || gpu.processes.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-3 py-4 text-center text-text-muted text-[11px]">
                      Tidak ada proses yang sedang berjalan di GPU ini.
                    </td>
                  </tr>
                ) : (
                  gpu.processes.map((proc) => {
                    const isProtected = proc.is_system || !proc.is_killable;
                    return (
                      <tr key={proc.pid} className="hover:bg-surface-3 transition-colors">
                        <td className="px-3 py-2 text-primary-fixed font-bold">
                          {proc.username}
                        </td>
                        <td className="px-3 py-2 text-text-muted">
                          {proc.pid}
                        </td>
                        <td className="px-3 py-2 max-w-[140px] truncate text-on-surface" title={proc.cmdline || proc.name}>
                          {proc.name}
                        </td>
                        <td className="px-3 py-2 text-right text-neon-amber font-semibold">
                          {proc.vram_mb} MB
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isProtected ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-surface-3 text-neon-emerald text-[9px] font-semibold">
                              <Shield className="w-2.5 h-2.5" /> Sys
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-neon-cyan/10 text-neon-cyan text-[9px] font-semibold">
                              User
                            </span>
                          )}
                        </td>
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
                                className="p-1 rounded text-neon-rose hover:bg-error-container/30 transition-colors"
                                title="Hentikan Proses"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[14px]">stop</span>
                              </button>
                            ) : (
                              <span className="text-text-muted text-[10px]">—</span>
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
