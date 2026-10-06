import React, { memo, useRef } from 'react';
import { Thermometer, Wind, XCircle, Lock, Shield, Zap, Users, Flame } from 'lucide-react';

/* Sparkline mini SVG — last 20 compute% readings */
function Sparkline({ data = [], color = '#6366f1', height = 28, width = 80 }) {
  if (!data || data.length < 2) return null;
  const max = 100;
  const pts = data.slice(-20);
  const w = width / (pts.length - 1);
  const points = pts
    .map((v, i) => `${i * w},${height - (v / max) * height}`)
    .join(' ');
  return (
    <svg width={width} height={height} style={{ overflow: 'visible', display: 'block' }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
        style={{ opacity: 0.85 }}
      />
    </svg>
  );
}

/* VRAM Block Allocation Grid — 16 blocks = 16 GB */
function VramBlockGrid({ processes = [], totalMb = 16311 }) {
  const BLOCKS = 16;
  const blockMb = totalMb / BLOCKS;

  // Build a map of blocks → process
  const blockMap = new Array(BLOCKS).fill(null);
  let filledMb = 0;

  processes.forEach((proc, procIdx) => {
    const mb = proc.vram_mb || 0;
    const blocks = Math.ceil(mb / blockMb);
    for (let i = 0; i < blocks; i++) {
      const slot = Math.floor(filledMb / blockMb) + i;
      if (slot < BLOCKS) blockMap[slot] = proc;
    }
    filledMb += mb;
  });

  const procColors = [
    '#6366f1', '#10b981', '#f59e0b', '#f43f5e',
    '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6',
    '#f97316', '#84cc16', '#a78bfa'
  ];

  // Assign color per unique username
  const colorMap = {};
  let colorIdx = 0;
  processes.forEach((p) => {
    if (!(p.username in colorMap)) {
      colorMap[p.username] = procColors[colorIdx % procColors.length];
      colorIdx++;
    }
  });

  return (
    <div>
      <div
        className="section-label mb-2 text-slate-500 font-medium"
      >
        VRAM Allocation ({totalMb > 16311 ? '16 GB' : '16 GB'})
      </div>
      <div className="flex items-end gap-0.5">
        {blockMap.map((proc, idx) => {
          const color = proc ? colorMap[proc.username] : '#262a34';
          const title = proc
            ? `${proc.username} — ${proc.name}\nVRAM: ${proc.vram_mb} MB`
            : `Blok #${idx + 1}: Kosong`;
          return (
            <div
              key={idx}
              title={title}
              className="vram-block"
              style={{
                background: color,
                opacity: proc ? 0.85 : 0.35,
                height: proc ? 20 : 12,
                alignSelf: 'flex-end',
                cursor: proc ? 'pointer' : 'default',
              }}
            />
          );
        })}
      </div>
      {/* Legend */}
      {Object.keys(colorMap).length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(colorMap).map(([username, color]) => (
            <span
              key={username}
              className="metric-value flex items-center gap-1"
              style={{ fontSize: '0.5625rem', color: '#908fa0' }}
            >
              <span
                style={{
                  width: 8, height: 8,
                  borderRadius: 2,
                  background: color,
                  display: 'inline-block'
                }}
              />
              {username}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function GpuCard({ gpu, onOpenKillModal, isAdmin = false, sparkHistory = [] }) {
  if (!gpu) return null;

  const isLevel1   = gpu.index === 0;
  const vramPct    = gpu.vram_percent || 0;
  const computePct = gpu.compute_percent || 0;

  const accentColor = isLevel1 ? 'var(--accent-indigo)' : 'var(--accent-emerald)';

  const computeBar = computePct >= 85
    ? 'var(--accent-rose)'
    : computePct >= 65
    ? 'var(--accent-amber)'
    : accentColor;
  const vramBar = vramPct >= 85
    ? 'var(--accent-rose)'
    : vramPct >= 65
    ? 'var(--accent-amber)'
    : accentColor;

  const tempColor = gpu.temperature_c >= 80
    ? 'var(--accent-rose)'
    : gpu.temperature_c >= 65
    ? 'var(--accent-amber)'
    : '#dfe2ef';

  const topProc = gpu.processes && gpu.processes[0];
  const uniqueUsers = Array.from(new Set((gpu.processes || []).map(p => p.username)));

  return (
    <div className="rounded-2xl bg-[#181b25] border border-[#46455430] p-5 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:shadow-2xl transition-all fade-in-up">
      {/* Stitch ambient glow */}
      <div className={`absolute -top-12 -right-12 w-40 h-40 ${isLevel1 ? 'bg-[#4cd7f6]/10' : 'bg-[#c0c1ff]/10'} rounded-full pointer-events-none`}></div>

      <div className="flex flex-col gap-4 relative z-10">
        {/* Header - Stitch Style */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${isLevel1 ? 'text-[#4cd7f6]' : 'text-[#c0c1ff]'}`}>
                GPU NODE {gpu.index}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${isLevel1 ? 'bg-[#4cd7f6]' : 'bg-[#4edea3]'}`}></span>
              <span className="font-mono text-[10px] text-[#908fa0]">PCIe 4.0 @ 16x</span>
            </div>
            <h3 className="font-bold text-base text-[#dfe2ef] mt-0.5 tracking-tight">{gpu.name}</h3>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 shadow-sm border ${
            isLevel1 
              ? 'bg-[#4cd7f6]/15 text-[#4cd7f6] border-[#4cd7f6]/30' 
              : 'bg-[#262a34] text-[#dfe2ef] border-[#46455440]'
          }`}>
            {isLevel1 ? (
              <><Zap className="w-3.5 h-3.5" fill="currentColor"/> Dedicated Monster</>
            ) : (
              <><Users className="w-3.5 h-3.5"/> Shared Practicum Pool</>
            )}
          </span>
        </div>

        {/* Active Holder Highlight - Stitch Card Banner */}
        <div className="p-3 rounded-xl bg-[#1c1f29] border border-[#46455425] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {isLevel1 ? (
              topProc ? (
                <>
                  <div className="w-8 h-8 rounded-lg bg-[#4cd7f6]/20 border border-[#4cd7f6]/40 flex items-center justify-center text-[#4cd7f6] font-mono text-xs font-bold shrink-0">
                    {topProc.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono text-xs text-[#dfe2ef] font-semibold truncate">{topProc.username}</span>
                    <span className="text-[10px] text-[#c7c4d7] truncate">{topProc.name} (PID {topProc.pid})</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg bg-[#262a34] flex items-center justify-center text-[#908fa0] font-mono text-xs shrink-0">--</div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono text-xs text-[#4edea3] font-semibold">Slot Tersedia (Idle)</span>
                    <span className="text-[10px] text-[#908fa0]">Siap untuk Boost Prioritas</span>
                  </div>
                </>
              )
            ) : (
              <>
                <div className="flex -space-x-1.5">
                  {uniqueUsers.slice(0, 3).map((u, i) => (
                    <div key={u} className="w-6 h-6 rounded-full bg-[#8083ff] text-white font-mono text-[9px] font-bold flex items-center justify-center border border-[#1c1f29]">
                      {u.slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {uniqueUsers.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-[#353943] text-[#dfe2ef] font-mono text-[9px] font-bold flex items-center justify-center border border-[#1c1f29]">
                      +{uniqueUsers.length - 3}
                    </div>
                  )}
                  {uniqueUsers.length === 0 && (
                    <div className="w-6 h-6 rounded-full bg-[#262a34] text-[#908fa0] font-mono text-[9px] flex items-center justify-center">0</div>
                  )}
                </div>
                <span className="text-xs text-[#c7c4d7] font-medium">{uniqueUsers.length} Mahasiswa Terkoneksi</span>
              </>
            )}
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#262a34] text-[#c0c1ff] border border-[#46455430] shrink-0">
            {isLevel1 ? "20C / 70GB Monster" : "2C / 3GB QoS Cap"}
          </span>
        </div>
      </div>

      {/* Compute + VRAM bars */}
      <div className="p-5 pb-4 flex flex-col gap-4" style={{ borderBottom: '1px solid #46455430' }}>
        {/* CUDA Compute */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="section-label">GPU Usage</span>
            <span className="metric-value font-bold" style={{ fontSize: '0.6875rem', color: computeBar }}>
              {computePct}%
            </span>
          </div>
          <div className="progress-track" style={{ height: 5 }}>
            <div
              className="progress-fill"
              style={{ width: `${Math.min(computePct, 100)}%`, height: 5, background: computeBar }}
            />
          </div>
        </div>

        {/* VRAM */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="section-label">Memori VRAM GDDR7</span>
            <span className="metric-value font-bold" style={{ fontSize: '0.6875rem', color: vramBar }}>
              {(gpu.vram_used_mb / 1024).toFixed(2)} GB
              <span style={{ fontWeight: 400, color: '#908fa0', marginLeft: 3 }}>
                / {(gpu.vram_total_mb / 1024).toFixed(1)} GB ({vramPct}%)
              </span>
            </span>
          </div>
          <div className="progress-track" style={{ height: 5 }}>
            <div
              className="progress-fill"
              style={{ width: `${Math.min(vramPct, 100)}%`, height: 5, background: vramBar }}
            />
          </div>
          <div
            className="metric-value flex justify-between mt-1"
            style={{ fontSize: '0.5625rem', color: '#908fa0' }}
          >
            <span>Tersedia: {(gpu.vram_free_mb / 1024).toFixed(2)} GB</span>
            <span>Mem Controller: {gpu.memory_util_percent}%</span>
          </div>
        </div>

        {/* VRAM Block Grid */}
        <VramBlockGrid processes={gpu.processes || []} totalMb={gpu.vram_total_mb || 16311} />
      </div>

      {/* Sensor row */}
      <div
        className="grid grid-cols-3 divide-x"
        style={{
          borderBottom: '1px solid #46455430',
          ['--tw-divide-opacity']: 1,
          borderTopColor: '#46455430',
          ['--divide-color']: '#46455430',
        }}
      >
        {[
          {
            icon: <Thermometer className="w-3 h-3" style={{ color: tempColor }} />,
            label: 'Suhu',
            value: `${gpu.temperature_c}°C`,
            color: tempColor,
          },
          {
            icon: <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--accent-amber)' }}>W</span>,
            label: 'Daya',
            value: `${gpu.power_w}W`,
            sub: `/ ${gpu.power_limit_w}W`,
            color: '#dfe2ef',
          },
          {
            icon: <Wind className="w-3 h-3" style={{ color: 'var(--accent-blue)' }} />,
            label: 'Kipas',
            value: `${gpu.fan_speed_percent}%`,
            color: '#dfe2ef',
          },
        ].map((sensor, i) => (
          <div
            key={i}
            className="flex flex-col items-center py-3 gap-0.5"
            style={{ borderColor: '#46455430' }}
          >
            <div className="flex items-center gap-1 mb-0.5">
              {sensor.icon}
              <span className="section-label" style={{ letterSpacing: '0.04em' }}>{sensor.label}</span>
            </div>
            <span className="metric-value font-bold" style={{ fontSize: '0.9375rem', color: sensor.color }}>
              {sensor.value}
            </span>
            {sensor.sub && (
              <span className="metric-value" style={{ fontSize: '0.5625rem', color: '#908fa0' }}>
                {sensor.sub}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Process list — flat table */}
      <div className="p-5 pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="section-label">
            Proses Aktif ({gpu.processes?.length || 0})
          </span>
          <span className="metric-value" style={{ fontSize: '0.5625rem', color: '#908fa0' }}>
            Real-time telemetry
          </span>
        </div>

        {gpu.processes && gpu.processes.length > 0 ? (
          <div className="overflow-x-auto" style={{ borderRadius: 8, border: '1px solid #46455430' }}>
            <table className="data-table" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>PID</th>
                  <th>Task</th>
                  <th>VRAM</th>
                  <th>CPU%</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {gpu.processes.map((proc) => (
                  <tr key={proc.pid}>
                    <td>
                      <span className="font-bold" style={{ color: accentColor }}>
                        {proc.username}
                      </span>
                    </td>
                    <td style={{ color: '#908fa0' }}>{proc.pid}</td>
                    <td>
                      <div
                        className="truncate font-medium"
                        style={{ maxWidth: 140, color: '#dfe2ef', fontSize: '0.6875rem' }}
                        title={proc.cmdline || proc.name}
                      >
                        {proc.name}
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
                        {proc.vram_mb} MB
                      </span>
                    </td>
                    <td style={{ color: '#c7c4d7' }}>{proc.cpu_percent}%</td>
                    <td style={{ textAlign: 'right' }}>
                      {proc.is_system || !proc.is_killable ? (
                        <span
                          className="badge badge-neutral"
                          style={{ fontSize: '0.5625rem' }}
                          title="Proses sistem terproteksi"
                        >
                          <Shield className="w-2.5 h-2.5" style={{ color: 'var(--accent-emerald)' }} />
                          Sistem
                        </span>
                      ) : (
                        <span
                          className="badge badge-emerald"
                          style={{ fontSize: '0.5625rem' }}
                        >
                          Aktif
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className="text-center py-5 metric-value"
            style={{
              border: '1px dashed #46455430',
              borderRadius: 8,
              fontSize: '0.6875rem',
              color: '#908fa0',
            }}
          >
            Tidak ada proses aktif di GPU ini.
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(GpuCard);
