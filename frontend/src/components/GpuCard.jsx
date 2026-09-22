import React, { memo, useRef } from 'react';
import { Thermometer, Wind, XCircle, Lock, Shield } from 'lucide-react';

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
          const color = proc ? colorMap[proc.username] : 'var(--surface-3)';
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
              style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}
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
    : 'var(--text-primary)';

  return (
    <div className="panel-raised flex flex-col gap-0 overflow-hidden fade-in-up">
      {/* Header strip */}
      <div
        className="flex items-start justify-between gap-3 p-5 pb-4"
        style={{ borderBottom: '1px solid var(--border-sub)' }}
      >
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="metric-value font-bold"
              style={{
                fontSize: '0.5625rem',
                padding: '1px 6px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-base)',
                borderRadius: 4,
                color: 'var(--text-secondary)',
              }}
            >
              GPU {gpu.index}
            </span>
            <span
              className="badge"
              style={{
                fontSize: '0.5625rem',
                background: `${accentColor.replace('var(', '').replace(')', '')}14`,
                color: accentColor,
                borderColor: `${accentColor}30`,
              }}
            >
              {isLevel1 ? 'Tier 1 — Riset Dosen' : 'Tier 2 — Praktikum Mhs'}
            </span>
          </div>
          <h2
            className="font-bold truncate"
            style={{ fontSize: '0.875rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
          >
            {gpu.name}
          </h2>
          <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
            {isLevel1 ? 'labriset — Dedicated 16 GB VRAM' : 'training1–10 — Shared Pool 16 GB VRAM'}
          </p>
        </div>

        {/* Big compute % + sparkline */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className="metric-value font-black"
            style={{
              fontSize: '1.5rem',
              color: computePct > 0 ? accentColor : 'var(--text-muted)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            {computePct}%
          </span>
          <span className="section-label" style={{ letterSpacing: '0.04em' }}>Compute</span>
          <Sparkline
            data={sparkHistory.map(h => isLevel1 ? h?.gpu0_compute : h?.gpu1_compute)}
            color={accentColor.includes('indigo') ? '#6366f1' : '#10b981'}
            width={80}
            height={24}
          />
        </div>
      </div>

      {/* Compute + VRAM bars */}
      <div className="p-5 pb-4 flex flex-col gap-4" style={{ borderBottom: '1px solid var(--border-sub)' }}>
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
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 3 }}>
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
            style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}
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
          borderBottom: '1px solid var(--border-sub)',
          ['--tw-divide-opacity']: 1,
          borderTopColor: 'var(--border-sub)',
          ['--divide-color']: 'var(--border-sub)',
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
            color: 'var(--text-primary)',
          },
          {
            icon: <Wind className="w-3 h-3" style={{ color: 'var(--accent-blue)' }} />,
            label: 'Kipas',
            value: `${gpu.fan_speed_percent}%`,
            color: 'var(--text-primary)',
          },
        ].map((sensor, i) => (
          <div
            key={i}
            className="flex flex-col items-center py-3 gap-0.5"
            style={{ borderColor: 'var(--border-sub)' }}
          >
            <div className="flex items-center gap-1 mb-0.5">
              {sensor.icon}
              <span className="section-label" style={{ letterSpacing: '0.04em' }}>{sensor.label}</span>
            </div>
            <span className="metric-value font-bold" style={{ fontSize: '0.9375rem', color: sensor.color }}>
              {sensor.value}
            </span>
            {sensor.sub && (
              <span className="metric-value" style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
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
          <span className="metric-value" style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
            Real-time telemetry
          </span>
        </div>

        {gpu.processes && gpu.processes.length > 0 ? (
          <div className="overflow-x-auto" style={{ borderRadius: 8, border: '1px solid var(--border-base)' }}>
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
                    <td style={{ color: 'var(--text-muted)' }}>{proc.pid}</td>
                    <td>
                      <div
                        className="truncate font-medium"
                        style={{ maxWidth: 140, color: 'var(--text-primary)', fontSize: '0.6875rem' }}
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
                    <td style={{ color: 'var(--text-secondary)' }}>{proc.cpu_percent}%</td>
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
              border: '1px dashed var(--border-base)',
              borderRadius: 8,
              fontSize: '0.6875rem',
              color: 'var(--text-muted)',
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
