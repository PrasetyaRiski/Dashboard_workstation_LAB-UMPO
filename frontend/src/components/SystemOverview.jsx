import React, { memo } from 'react';
import { HardDrive, Server, MemoryStick as Memory, Cpu, Zap } from 'lucide-react';

function MetricCard({ icon: Icon, iconColor, label, value, unit, sub, percent, barColor }) {
  const safePercent = Math.min(Math.max(percent || 0, 0), 100);
  const barBg = barColor || (safePercent >= 85 ? '#ffb4ab' : safePercent >= 65 ? '#fbbf24' : '#4cd7f6');

  return (
    <div className="rounded-xl bg-[#1c1f29] border border-[#46455430] p-4 flex flex-col justify-between shadow-md">
      {/* Row 1: label + value */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#262a34] border border-[#46455440] flex items-center justify-center shrink-0" style={{ color: iconColor }}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="font-mono text-xs font-medium text-[#c7c4d7]">
            {label}
          </span>
        </div>
        <span className="font-mono font-bold text-base text-[#dfe2ef]">
          {value}<span className="text-xs font-normal text-[#908fa0] ml-1">{unit}</span>
        </span>
      </div>

      {/* Progress track - Stitch Glow */}
      <div className="w-full bg-[#262a34] h-2 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${safePercent}%`, background: barBg, boxShadow: `0 0 8px ${barBg}80` }}
        />
      </div>

      {/* Sub row */}
      {sub && (
        <p className="text-[11px] text-[#908fa0] truncate">
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
    <div className="rounded-2xl bg-[#181b25] border border-[#46455430] shadow-xl fade-in-up" style={{ padding: '24px 28px 28px' }}>
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
            style={{ fontSize: '0.9375rem', color: '#dfe2ef', letterSpacing: '-0.02em' }}
          >
            Infrastruktur Triad — CPU · RAM · GPU · Storage
          </h2>
        </div>
        <span
          className="metric-value"
          style={{ fontSize: '0.6875rem', color: '#908fa0' }}
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
              : '#262a34';
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
          style={{ fontSize: '0.5625rem', color: '#908fa0' }}
        >
          <span>Core #0</span>
          <span>Core #{(cpu.core_count || 24) - 1}</span>
        </div>
      </div>
    </div>
  );
}

export default memo(SystemOverview);
