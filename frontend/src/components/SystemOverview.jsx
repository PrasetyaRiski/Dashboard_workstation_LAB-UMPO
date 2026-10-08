import React, { memo } from 'react';
import { HardDrive, Server, MemoryStick as Memory, Cpu, Zap, Activity } from 'lucide-react';

function MetricCard({ icon: Icon, iconColor, label, title, subtitle, value, unit, percent, barColor, subRows }) {
  const safePercent = Math.min(Math.max(percent || 0, 0), 100);
  const barBg = barColor || (safePercent >= 85 ? '#ffb4ab' : safePercent >= 65 ? '#fbbf24' : '#4cd7f6');

  return (
    <div className="bg-surface-2 rounded-xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:bg-surface-3 transition-colors border border-border-subtle">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] uppercase text-text-muted tracking-wider">
            {label}
          </span>
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        {title && (
          <div className="font-semibold text-xs text-text-primary truncate mb-0.5">
            {title}
          </div>
        )}
        {subtitle && (
          <div className="font-mono text-[10px] text-outline mb-2">
            {subtitle}
          </div>
        )}
        <div className="flex items-baseline gap-1 mb-2">
          <span className="font-mono text-2xl font-bold" style={{ color: iconColor }}>
            {value}
          </span>
          {unit && <span className="font-mono text-xs text-outline font-normal">{unit}</span>}
        </div>
      </div>

      <div className="space-y-1.5 mt-auto">
        <div className="w-full bg-surface-container-high h-1.5 rounded-md overflow-hidden">
          <div
            className="h-full rounded-md transition-all duration-500"
            style={{ width: `${safePercent}%`, background: barBg, boxShadow: `0 0 8px ${barBg}80` }}
          />
        </div>
        {subRows && (
          <div className="flex justify-between font-mono text-[10px] text-outline pt-0.5">
            {subRows}
          </div>
        )}
      </div>
    </div>
  );
}

function SystemOverview({ system = {}, gpus = [] }) {
  if (!system) return null;

  const cpu = system?.cpu || {};
  const memory = system?.memory || {};
  const disks = system?.disks || {};
  const homeDisk = disks.home || disks.root || {};

  const gpu0 = gpus?.[0] || {};
  const gpu1 = gpus?.[1] || {};
  const totalVramUsedGb = (((gpu0?.vram_used_mb || 0) + (gpu1?.vram_used_mb || 0)) / 1024).toFixed(1);
  const totalVramMaxGb  = (((gpu0?.vram_total_mb || 16384) + (gpu1?.vram_total_mb || 16384)) / 1024).toFixed(0);
  const totalVramPct    = Math.round((Number(totalVramUsedGb) / (Number(totalVramMaxGb) || 1)) * 100) || 0;
  const totalGpuCompute = Math.round(((gpu0?.compute_percent || 0) + (gpu1?.compute_percent || 0)) / 2);

  const coreCount = cpu.core_count || 24;
  const cpuPercent = cpu.overall_percent || 0;
  const memoryPercent = memory.percent || 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Cluster Sub-Header & Live Breadcrumb Zone */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-1">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] text-outline tracking-wider uppercase">Cluster Node:</span>
            <span className="font-mono text-xs text-primary-fixed bg-surface-2 px-2 py-0.5 rounded border border-border-base">
              gpu-server-01.lab.umpo.ac.id
            </span>
            <span className="text-outline-variant font-mono text-xs">/</span>
            <span className="font-mono text-xs text-text-muted">cgroup-v2.hybrid</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-headline-lg text-2xl font-bold text-text-primary tracking-tight">
              Ringkasan Sistem & Telemetri Komputasi
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-md bg-surface-2 border border-border-subtle shadow-sm">
              <span className="w-2 h-2 rounded-md bg-neon-emerald animate-pulse"></span>
              <span className="font-mono text-[10px] text-neon-emerald uppercase font-semibold">
                Operational Normal
              </span>
            </div>
          </div>
        </div>

        {/* Cluster Quick Status Ticker */}
        <div className="flex items-center gap-4 bg-surface-1 px-4 py-2 rounded-lg border border-border-subtle shadow-sm">
          <div className="flex flex-col text-right">
            <span className="font-mono text-[10px] text-text-muted">TOTAL VCPU</span>
            <span className="font-mono text-sm text-text-primary font-bold">{coreCount} Threads</span>
          </div>
          <div className="h-6 w-px bg-surface-variant"></div>
          <div className="flex flex-col text-right">
            <span className="font-mono text-[10px] text-text-muted">SCHEDULER</span>
            <span className="font-mono text-xs text-neon-cyan flex items-center justify-end gap-1 font-semibold">
              <Zap className="w-3 h-3" /> ACTIVE
            </span>
          </div>
        </div>
      </div>

      {/* Bento Row 1: Hardware & Tenant Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: CPU Host */}
        <MetricCard
          icon={Cpu}
          iconColor="#4cd7f6"
          label="HOST COMPUTE CORE"
          title="AMD EPYC / Intel Xeon"
          subtitle={`${coreCount} Threads @ 2.45GHz`}
          value={cpuPercent}
          unit="%"
          percent={cpuPercent}
          barColor={cpuPercent >= 85 ? '#ffb4ab' : '#4cd7f6'}
          subRows={
            <>
              <span>Avg Load: {cpuPercent}%</span>
              <span>Total Cores: {coreCount}</span>
            </>
          }
        />

        {/* Card 2: RAM Host */}
        <MetricCard
          icon={Memory}
          iconColor="#4edea3"
          label="SYSTEM MEMORY ALLOCATION"
          title="DDR4 ECC Server Registered"
          subtitle={`user.slice Limit: ${memory.user_slice_max_gb || 100} GB`}
          value={memory.used_gb || 0}
          unit={`/ ${memory.total_gb || 128} GB`}
          percent={memoryPercent}
          barColor={memoryPercent >= 85 ? '#ffb4ab' : '#4edea3'}
          subRows={
            <>
              <span>user.slice: {memory.user_slice_used_gb || 0} GB</span>
              <span>{memoryPercent}% Digunakan</span>
            </>
          }
        />

        {/* Card 3: GPU Cluster (Dual) */}
        <MetricCard
          icon={Zap}
          iconColor="#fbbf24"
          label="DUAL ACCELERATOR CLUSTER"
          title="NVIDIA RTX 5060 Ti Dual Arch"
          subtitle={`Compute Avg: ${totalGpuCompute}%`}
          value={totalVramUsedGb}
          unit={`/ ${totalVramMaxGb} GB VRAM`}
          percent={totalVramPct}
          barColor={totalVramPct >= 85 ? '#ffb4ab' : '#fbbf24'}
          subRows={
            <>
              <span>GPU 0: {((gpu0?.vram_used_mb || 0) / 1024).toFixed(1)} GB</span>
              <span>GPU 1: {((gpu1?.vram_used_mb || 0) / 1024).toFixed(1)} GB</span>
            </>
          }
        />

        {/* Card 4: Dataset & Model Storage (/home) */}
        <MetricCard
          icon={HardDrive}
          iconColor="#c0c1ff"
          label="DATASET & STORAGE POOL"
          title="High-Speed NVMe Storage (/home)"
          subtitle={`Sisa Kuota: ${homeDisk.free_gb || 0} GB Free`}
          value={homeDisk.used_gb || 0}
          unit="GB Digunakan"
          percent={homeDisk.percent || 0}
          barColor={(homeDisk.percent || 0) >= 85 ? '#ffb4ab' : '#c0c1ff'}
          subRows={
            <>
              <span>{homeDisk.percent || 0}% Terpakai</span>
              <span>NVMe Shared Pool</span>
            </>
          }
        />
      </div>

      {/* CPU Core Heat Matrix */}
      <div className="bg-surface-2 rounded-xl p-5 border border-border-subtle shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs text-text-muted uppercase tracking-wider font-semibold">
            CPU Core Load Matrix — {coreCount} Threads
          </span>
          <span className="font-mono text-[10px] text-outline">
            CFS Scheduler Real-time
          </span>
        </div>
        <div className="flex items-end gap-1 h-7">
          {Array.isArray(cpu.cores_percent) && cpu.cores_percent.map((c, idx) => {
            const color = c > 80 ? '#ffb4ab' : c > 50 ? '#fbbf24' : '#4cd7f6';
            return (
              <div
                key={idx}
                className="flex-1 rounded-sm transition-all duration-300"
                style={{
                  height: `${Math.max(12, c)}%`,
                  backgroundColor: color,
                  opacity: c > 5 ? 0.9 : 0.35,
                }}
                title={`Core #${idx}: ${c}%`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(SystemOverview);
