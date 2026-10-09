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
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(37,99,235,0.06),0_2px_4px_rgba(0,0,0,0.03)] flex flex-col gap-5">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              GPU {gpu.index}
            </h2>
            <span className="text-[10px] font-mono font-semibold text-blue-700 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200">
              {gpu.name || 'NVIDIA RTX'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Lab Komputasi AI · Dual Arch Workstation
          </p>
        </div>

        {/* Telemetry Pills: Temperature, Fan, Power */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 shadow-sm">
            <span className={`w-2 h-2 rounded-full ${
              tempStatus === 'rose' ? 'bg-rose-500' : tempStatus === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
            <span className="text-slate-500">Suhu:</span>
            <span className={`tabular-nums font-bold ${
              tempStatus === 'rose' ? 'text-rose-600' : tempStatus === 'amber' ? 'text-amber-600' : 'text-slate-800'
            }`}>
              {temp}°C
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 shadow-sm">
            Kipas: <span className="tabular-nums font-bold text-slate-800">{fan}%</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 shadow-sm">
            Daya: <span className="tabular-nums font-bold text-slate-800">{power}W</span>
          </div>
        </div>
      </div>

      {/* Primary Metrics: Compute & VRAM with 3D Depth */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Compute Load */}
        <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-baseline text-xs mb-2">
            <span className="text-slate-600 font-semibold">Beban Komputasi (Compute)</span>
            <span className="font-mono tabular-nums font-bold text-blue-700">{computePct}%</span>
          </div>
          <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden border border-slate-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                computePct >= 90 ? 'bg-gradient-to-r from-rose-500 to-rose-600' : 
                computePct >= 75 ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 
                'bg-gradient-to-r from-blue-500 to-blue-600'
              }`}
              style={{ width: `${computePct}%` }}
            />
          </div>
        </div>

        {/* VRAM Memory Summary */}
        <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-baseline text-xs mb-2">
            <span className="text-slate-600 font-semibold">Penggunaan VRAM</span>
            <span className="font-mono tabular-nums font-bold text-slate-900">
              {vramUsedGb} <span className="text-slate-400 font-normal">/ {vramTotalGb} GB</span> ({vramPct}%)
            </span>
          </div>
          <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden border border-slate-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                vramPct >= 90 ? 'bg-gradient-to-r from-rose-500 to-rose-600' : 
                vramPct >= 75 ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 
                'bg-gradient-to-r from-sky-500 to-blue-600'
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
            Alokasi Grid VRAM ({totalBlocks} Blok @ {(mbPerBlock / 1024).toFixed(1)} GB)
          </span>
          <span className="text-slate-800 tabular-nums font-semibold">
            {vramUsedGb} / {vramTotalGb} GB · {vramPct}%
          </span>
        </div>

        {/* The Blocks Grid */}
        <div className="relative">
          <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 lg:grid-cols-24 gap-1.5 p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 shadow-inner">
            {allocatedBlocks.map((block) => {
              const { index, occupied, isResearch, proc } = block;
              return (
                <div
                  key={index}
                  onMouseEnter={() => setHoveredBlock(block)}
                  onMouseLeave={() => setHoveredBlock(null)}
                  className={`h-6 rounded-md transition-all cursor-pointer ${
                    occupied
                      ? isResearch
                        ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 border border-indigo-700 shadow-[0_2px_4px_rgba(79,70,229,0.3)] hover:scale-105'
                        : 'bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-700 shadow-[0_2px_4px_rgba(37,99,235,0.3)] hover:scale-105'
                      : 'bg-white border border-slate-200/80 hover:border-blue-400 shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
                  }`}
                  title={occupied ? `PID ${proc?.pid} (${proc?.username}) · ${proc?.vram_mb} MB` : `Blok ${index + 1} Kosong`}
                />
              );
            })}
          </div>

          {/* Block Tooltip overlay if hovered */}
          {hoveredBlock && (
            <div className="mt-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-white flex items-center justify-between shadow-lg animate-in fade-in duration-150">
              {hoveredBlock.occupied ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${hoveredBlock.isResearch ? 'bg-indigo-400' : 'bg-blue-400'}`} />
                    <span>PID {hoveredBlock.proc?.pid}</span>
                    <span className="text-slate-400">({hoveredBlock.proc?.username})</span>
                    <span className="text-slate-300 truncate max-w-[200px]">{hoveredBlock.proc?.name}</span>
                  </div>
                  <span className="font-bold text-blue-400">{hoveredBlock.proc?.vram_mb || 0} MB</span>
                </>
              ) : (
                <span className="text-slate-300">Blok Kosong (Tersedia untuk komputasi)</span>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-indigo-600 border border-indigo-700 shadow-sm" />
            <span>Riset (<code className="text-indigo-600 font-semibold">labriset</code>)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-600 border border-blue-700 shadow-sm" />
            <span>Praktikum (<code className="text-blue-600 font-semibold">training1-10</code>)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-white border border-slate-300 shadow-sm" />
            <span>Idle / Kosong</span>
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
            Diurutkan berdasarkan VRAM
          </span>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-mono text-[11px]">
              <tr>
                <th className="px-3.5 py-2.5 font-semibold">User</th>
                <th className="px-3.5 py-2.5 font-semibold text-right">PID</th>
                <th className="px-3.5 py-2.5 font-semibold">Proses / Command</th>
                <th className="px-3.5 py-2.5 font-semibold text-right">VRAM</th>
                {isAdmin && <th className="px-3.5 py-2.5 font-semibold text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {processes.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="px-3.5 py-6 text-center text-xs text-slate-400">
                    Tidak ada proses komputasi aktif pada GPU ini.
                  </td>
                </tr>
              ) : (
                processes.map((proc) => {
                  const isProtected = proc.is_system || !proc.is_killable;
                  const isResearch = proc.username === 'labriset' || proc.username?.includes('riset');
                  return (
                    <tr key={proc.pid} className="hover:bg-blue-50/40 transition-colors">
                      {/* User with dot indicator */}
                      <td className="px-3.5 py-2.5 text-slate-900 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            isResearch ? 'bg-indigo-600' : 'bg-blue-600'
                          }`} />
                          <span className="truncate max-w-[90px] font-semibold">{proc.username}</span>
                        </div>
                      </td>

                      {/* PID with copy button */}
                      <td className="px-3.5 py-2.5 text-right">
                        <button
                          onClick={() => copyToClipboard(proc.pid, proc.pid)}
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors group"
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
                      <td className="px-3.5 py-2.5 max-w-[180px] sm:max-w-[240px] truncate text-slate-600" title={proc.cmdline || proc.name}>
                        <div className="flex items-center gap-1.5">
                          {isProtected && <Shield className="w-3 h-3 text-slate-400 shrink-0" title="Proses Sistem Terproteksi" />}
                          <span className="truncate">{proc.name}</span>
                        </div>
                      </td>

                      {/* VRAM in MB */}
                      <td className="px-3.5 py-2.5 text-right tabular-nums text-slate-900 font-bold">
                        {proc.vram_mb || 0} <span className="text-slate-400 text-[10px] font-normal">MB</span>
                      </td>

                      {/* Admin Kill Action */}
                      {isAdmin && (
                        <td className="px-3.5 py-2.5 text-right">
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
                              className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-[0_1px_2px_rgba(225,29,72,0.1)] active:translate-y-0.5 transition-all"
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
