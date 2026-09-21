import React, { memo } from 'react';
import { HardDrive, Server, MemoryStick as Memory, Cpu, Zap } from 'lucide-react';

function MetricCard({ icon: Icon, iconColor, label, value, unit, sub, percent, barColor }) {
  const safePercent = Math.min(Math.max(percent || 0, 0), 100);
  const barBg = barColor || getBarColor(percent);

  function getBarColor(p) {
    if (p >= 85) return 'var(--accent-rose)';
    if (p >= 65) return 'var(--accent-amber)';
    return 'var(--accent-indigo)';
  }

  return (
    <div
      className="panel-raised flex flex-col gap-3"
      style={{ padding: '16px 18px' }}
    >
      {/* Row 1: label + value */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-lg shrink-0"
            style={{
              width: 32,
              height: 32,
              background: `color-mix(in srgb, ${iconColor} 12%, transparent)`,
              color: iconColor,
            }}
          >
            <Icon className="w-4 h-4" />
          </div>
          <span
            className="font-semibold"
            style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}
          >
            {label}
          </span>
        </div>
        <span
          className="metric-value font-bold shrink-0"
          style={{ fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
        >
          {value}<span style={{ fontSize: '0.6875rem', fontWeight: 500, marginLeft: 2, color: 'var(--text-muted)' }}>{unit}</span>
        </span>
      </div>

      {/* Progress track */}
      <div className="progress-track" style={{ height: 6 }}>
        <div
          className="progress-fill"
          style={{ width: `${safePercent}%`, height: 6, background: barBg }}
        />
      </div>

      {/* Sub row */}
      {sub && (
        <p
          className="metric-value"
          style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: -4 }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function SystemOverview({ system, gpus = [] }) {
  if (!system) return null;

  const { cpu, memory, disks } = system;
  const gpu0 = gpus[0];
  const gpu1 = gpus[1];
  const totalVramUsedGb = (((gpu0?.vram_used_mb || 0) + (gpu1?.vram_used_mb || 0)) / 1024).toFixed(1);
  const totalVramMaxGb  = (((gpu0?.vram_total_mb || 16311) + (gpu1?.vram_total_mb || 16311)) / 1024).toFixed(0);
  const totalVramPct    = Math.round((totalVramUsedGb / totalVramMaxGb) * 100) || 0;
  const totalGpuCompute = Math.round(((gpu0?.compute_percent || 0) + (gpu1?.compute_percent || 0)) / 2);

  const cpuBar = cpu.overall_percent >= 85
    ? 'var(--accent-rose)'
    : cpu.overall_percent >= 65
    ? 'var(--accent-amber)'
    : 'var(--accent-violet)';

  const ramBar = memory.percent >= 85
    ? 'var(--accent-rose)'
    : memory.percent >= 65
    ? 'var(--accent-amber)'
    : 'var(--accent-blue)';

  return (
    <div className="panel-raised fade-in-up" style={{ padding: '24px 28px 28px' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 32,
              height: 32,
              background: 'color-mix(in srgb, var(--accent-indigo) 12%, transparent)',
              color: 'var(--accent-indigo)',
            }}
          >
            <Server className="w-4 h-4" />
          </div>
          <h2
            className="font-bold"
            style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            Infrastruktur Triad — CPU · RAM · GPU · Storage
          </h2>
        </div>
        <span
          className="metric-value"
          style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}
        >
          24 vCPU · 128 GB RAM · Dual RTX 5060 Ti (32 GB VRAM)
        </span>
      </div>

      {/* 4-column metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={Cpu}
          iconColor="var(--accent-violet)"
          label={`CPU (${cpu.core_count} Threads)`}
          value={cpu.overall_percent}
          unit="%"
          percent={cpu.overall_percent}
          barColor={cpuBar}
          sub={`Utilisasi saat ini · Riset: 20 Core | Mhs: 2 Core`}
        />
        <MetricCard
          icon={Memory}
          iconColor="var(--accent-blue)"
          label="Host RAM & Cgroups"
          value={memory.used_gb}
          unit="GB"
          percent={memory.percent}
          barColor={ramBar}
          sub={`${memory.percent}% dari ${memory.total_gb} GB · user.slice: ${memory.user_slice_used_gb || 0}/${memory.user_slice_max_gb || 100} GB`}
        />
        <MetricCard
          icon={Zap}
          iconColor="var(--accent-amber)"
          label="GPU Cluster (Dual)"
          value={totalVramUsedGb}
          unit="GB VRAM"
          percent={totalVramPct}
          barColor={totalVramPct >= 85 ? 'var(--accent-rose)' : 'var(--accent-amber)'}
          sub={`${totalVramPct}% · Compute avg: ${totalGpuCompute}%`}
        />
        <MetricCard
          icon={HardDrive}
          iconColor="var(--accent-emerald)"
          label="Dataset & Model (/home)"
          value={disks.home ? disks.home.used_gb : 0}
          unit="GB"
          percent={disks.home ? disks.home.percent : 0}
          sub={`${disks.home ? disks.home.percent : 0}% · Sisa: ${disks.home ? disks.home.free_gb : 0} GB · NVMe Shared Pool`}
        />
      </div>

      {/* CPU Core Heat Matrix */}
      <div>
        <div className="section-label mb-2.5">
          CPU Core Load Matrix — {cpu.core_count} Threads
        </div>
        <div className="flex items-end gap-0.5" style={{ height: 28 }}>
          {cpu.cores_percent && cpu.cores_percent.map((c, idx) => {
            const color = c > 80
              ? 'var(--accent-rose)'
              : c > 50
              ? 'var(--accent-amber)'
              : c > 15
              ? 'var(--accent-violet)'
              : 'var(--surface-3)';
            const h = Math.max(4, Math.round((c / 100) * 28));
            return (
              <div
                key={idx}
                title={`Core #${idx}: ${c}%`}
                style={{
                  flex: 1,
                  height: `${h}px`,
                  background: color,
                  borderRadius: '3px',
                  transition: 'height 0.5s ease, background 0.5s ease',
                  cursor: 'default',
                }}
              />
            );
          })}
        </div>
        <div
          className="flex justify-between metric-value mt-1.5"
          style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}
        >
          <span>Core #0</span>
          <span>Core #{(cpu.core_count || 24) - 1}</span>
        </div>
      </div>
    </div>
  );
}

export default memo(SystemOverview);
