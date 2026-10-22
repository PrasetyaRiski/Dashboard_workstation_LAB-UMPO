import React, { memo, useState } from 'react';
import { Shield, Copy, Check } from 'lucide-react';

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

  // Temperature status
  const tempStatus = temp >= 85 ? 'rose' : temp >= 75 ? 'amber' : 'emerald';

  const copyToClipboard = (text, pid) => {
    navigator.clipboard?.writeText(String(text));
    setCopiedPid(pid);
    setTimeout(() => setCopiedPid(null), 1500);
  };

  // ── VRAM Block Allocation Grid ──
  const totalGbInt = Math.max(1, Math.round(vramTotalMb / 1024));
  const totalBlocks = Math.min(32, Math.max(16, totalGbInt));
  const mbPerBlock = vramTotalMb / totalBlocks;

  const processes = gpu.processes || [];
  const allocatedBlocks = [];
  let remainingProcessBlocks = processes.map(p => ({
    ...p,
    neededBlocks: Math.max(1, Math.round((p.vram_mb || 0) / mbPerBlock))
  }));

  for (let i = 0; i < totalBlocks; i++) {
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
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors flex flex-col gap-4">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Akselerator GPU {gpu.index}
            </h2>
            <span className="text-[11px] font-mono font-medium text-slate-700 px-2 py-0.2 rounded bg-slate-100 border border-slate-200">
              {gpu.name || 'NVIDIA RTX'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Lab Komputasi AI · Dual Arch Workstation
          </p>
        </div>

        {/* Telemetry Pills: Temperature, Fan, Power */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700">
            <span className={`w-2 h-2 rounded-full ${
              tempStatus === 'rose' ? 'bg-rose-500' : tempStatus === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
            <span className="text-slate-500">Suhu:</span>
            <span className={`tabular-nums font-bold ${
              tempStatus === 'rose' ? 'text-rose-600' : tempStatus === 'amber' ? 'text-amber-600' : 'text-slate-900'
            }`}>
              {temp}°C
            </span>
          </div>

          <div className="px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-600">
            Kipas: <span className="tabular-nums font-bold text-slate-800">{fan}%</span>
          </div>

          <div className="px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-600">
            Daya: <span className="tabular-nums font-bold text-slate-800">{power}W</span>
          </div>
        </div>
      </div>

      {/* Primary Metrics: Compute & VRAM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Compute Load */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex justify-between items-baseline text-xs mb-1.5">
            <span className="text-slate-600 font-medium">Beban Komputasi (Compute)</span>
            <span className="font-mono tabular-nums font-bold text-slate-900">{computePct}%</span>
          </div>
          <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden border border-slate-200">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                computePct >= 90 ? 'bg-rose-600' : 
                computePct >= 75 ? 'bg-amber-500' : 
                'bg-[#1a73e8]'
              }`}
              style={{ width: `${computePct}%` }}
            />
          </div>
        </div>

        {/* VRAM Memory Summary */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex justify-between items-baseline text-xs mb-1.5">
            <span className="text-slate-600 font-medium">Alokasi VRAM</span>
            <span className="font-mono tabular-nums font-bold text-slate-900">
              {vramUsedGb} <span className="text-slate-400 font-normal">/ {vramTotalGb} GB</span> ({vramPct}%)
            </span>
          </div>
          <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden border border-slate-200">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                vramPct >= 90 ? 'bg-rose-600' : 
                vramPct >= 75 ? 'bg-amber-500' : 
                'bg-[#1a73e8]'
              }`}
              style={{ width: `${vramPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* VRAM Block Allocation Grid */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
            Grid Alokasi VRAM ({totalBlocks} Blok @ {(mbPerBlock / 1024).toFixed(1)} GB)
          </span>
          <span className="text-slate-800 tabular-nums font-semibold">
            {vramUsedGb} / {vramTotalGb} GB · {vramPct}%
          </span>
        </div>

        {/* The Blocks Grid */}
        <div className="relative">
          <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 lg:grid-cols-24 gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
            {allocatedBlocks.map((block) => {
              const { index, occupied, isResearch, proc } = block;
              return (
                <div
                  key={index}
                  onMouseEnter={() => setHoveredBlock(block)}
                  onMouseLeave={() => setHoveredBlock(null)}
                  className={`h-5 rounded transition-colors cursor-pointer ${
                    occupied
                      ? isResearch
                        ? 'bg-indigo-600 border border-indigo-700 hover:bg-indigo-500'
                        : 'bg-[#1a73e8] border border-blue-700 hover:bg-blue-500'
                      : 'bg-white border border-slate-200 hover:border-slate-400'
                  }`}
                  title={occupied ? `PID ${proc?.pid} (${proc?.username}) · ${proc?.vram_mb} MB` : `Blok ${index + 1} Kosong`}
                />
              );
            })}
          </div>

          {/* Block Tooltip overlay if hovered */}
          {hoveredBlock && (
            <div className="mt-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-white flex items-center justify-between shadow-md">
              {hoveredBlock.occupied ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${hoveredBlock.isResearch ? 'bg-indigo-400' : 'bg-blue-400'}`} />
                    <span className="font-bold">PID {hoveredBlock.proc?.pid}</span>
                    <span className="text-slate-400">({hoveredBlock.proc?.username})</span>
                    <span className="text-slate-300 truncate max-w-[200px]">{hoveredBlock.proc?.name}</span>
                  </div>
                  <span className="font-bold text-blue-400">{hoveredBlock.proc?.vram_mb || 0} MB</span>
                </>
              ) : (
                <span className="text-slate-300">Blok Kosong (Tersedia untuk alokasi proses baru)</span>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 mt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-indigo-600 border border-indigo-700" />
            <span>Riset (<code className="text-indigo-700 font-semibold">labriset</code>)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#1a73e8] border border-blue-700" />
            <span>Praktikum (<code className="text-blue-700 font-semibold">training1-10</code>)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-white border border-slate-300" />
            <span>Idle / Siap Pakai</span>
          </div>
        </div>
      </div>

      {/* Dense Process Table */}
      <div className="mt-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-900 tracking-tight">
            Tabel Proses Aktif ({processes.length})
          </h3>
          <span className="text-[10px] font-mono text-slate-400">
            Diurutkan berdasarkan alokasi VRAM
          </span>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-mono text-[11px]">
              <tr>
                <th className="px-3 py-2 font-semibold">User</th>
                <th className="px-3 py-2 font-semibold text-right">PID</th>
                <th className="px-3 py-2 font-semibold">Proses / Command</th>
                <th className="px-3 py-2 font-semibold text-right">VRAM</th>
                {isAdmin && <th className="px-3 py-2 font-semibold text-right">Aksi</th>}
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
                      <td className="px-3 py-2 text-slate-900 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isResearch ? 'bg-indigo-600' : 'bg-[#1a73e8]'
                          }`} />
                          <span className="truncate max-w-[90px] font-semibold">{proc.username}</span>
                        </div>
                      </td>

                      {/* PID with copy button */}
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => copyToClipboard(proc.pid, proc.pid)}
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-[#1a73e8] transition-colors group"
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
                      <td className="px-3 py-2 max-w-[180px] sm:max-w-[240px] truncate text-slate-600" title={proc.cmdline || proc.name}>
                        <div className="flex items-center gap-1.5">
                          {isProtected && <Shield className="w-3 h-3 text-slate-400 shrink-0" title="Proses Sistem Terproteksi" />}
                          <span className="truncate">{proc.name}</span>
                        </div>
                      </td>

                      {/* VRAM in MB */}
                      <td className="px-3 py-2 text-right tabular-nums text-slate-900 font-bold">
                        {proc.vram_mb || 0} <span className="text-slate-400 text-[10px] font-normal">MB</span>
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
                              className="px-2 py-0.5 text-[11px] font-mono font-medium rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
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
  );
}

export default memo(GpuCard);
