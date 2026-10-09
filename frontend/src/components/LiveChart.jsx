import React, { memo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Pause, Play } from 'lucide-react';

const RANGE_OPTIONS = [
  { label: '1m',  value: 10 },
  { label: '15m', value: 30 },
  { label: '60m', value: 60 },
];

const SERIES = [
  { key: 'gpu0_compute',name: 'GPU 0 Compute', color: '#38bdf8' },
  { key: 'gpu1_compute',name: 'GPU 1 Compute', color: '#818cf8' },
  { key: 'cpu',         name: 'CPU Host',      color: '#c0c1ff' },
  { key: 'ram',         name: 'RAM Host',      color: '#34d399' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#18181b] border border-[rgba(255,255,255,0.14)] rounded-lg p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] font-mono min-w-[170px]">
      <p className="text-[10px] text-[#a1a1aa] mb-2 font-medium uppercase tracking-wider">
        Waktu: {label || '—'}
      </p>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-[#a1a1aa]">
              <span className="w-2 h-2 rounded-sm" style={{ background: entry.color }} />
              {entry.name}
            </span>
            <span className="font-bold tabular-nums" style={{ color: entry.color }}>
              {Number(entry.value || 0).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

function LiveChart({ history = [] }) {
  const [range, setRange] = useState(60);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedSnapshot, setPausedSnapshot] = useState(null);

  const togglePause = () => {
    if (!isPaused) {
      setPausedSnapshot([...history]);
      setIsPaused(true);
    } else {
      setIsPaused(false);
      setPausedSnapshot(null);
    }
  };

  const dataSource = isPaused && pausedSnapshot ? pausedSnapshot : history;

  const formattedData = React.useMemo(() => {
    if (!Array.isArray(dataSource)) return [];
    return dataSource.slice(-range).map((item) => ({
      ...item,
      time: item.time || item.timestamp || '',
      cpu: Number(item.cpu || 0),
      ram: Number(item.ram || 0),
      gpu0_compute: Number(item.gpu0_compute || 0),
      gpu1_compute: Number(item.gpu1_compute || 0),
      gpu0_vram: Number(item.gpu0_vram || 0),
      gpu1_vram: Number(item.gpu1_vram || 0),
    }));
  }, [dataSource, range]);

  const latest = formattedData[formattedData.length - 1];

  if (!Array.isArray(history) || history.length === 0) {
    return (
      <div className="bg-[#111114] rounded-xl p-6 border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-xs font-mono text-[#71717a]">
        <span>Menunggu telemetri real-time buffer…</span>
      </div>
    );
  }

  return (
    <div className="bg-[#111114] rounded-xl p-5 border border-[rgba(255,255,255,0.08)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#fafafa] tracking-tight">
              Telemetri Beban Komputasi Real-time
            </h2>
            <span className="px-1.5 py-0.2 rounded bg-[#18181b] font-mono text-[10px] text-[#38bdf8] border border-[rgba(255,255,255,0.08)]">
              T-60s BUFFER
            </span>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Sampling 1000ms stream via kernel telemetry & NVML
          </p>
        </div>

        {/* Controls & Quick Stats */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {latest && (
            <div className="hidden md:flex items-center gap-2 bg-[#18181b] px-2.5 py-1 rounded-md border border-[rgba(255,255,255,0.06)] font-mono text-xs">
              <span className="text-[#a1a1aa]">GPU 0:</span>
              <span className="text-[#38bdf8] tabular-nums font-semibold">{latest.gpu0_compute?.toFixed(0) || 0}%</span>
              <span className="text-[#71717a]">·</span>
              <span className="text-[#a1a1aa]">CPU:</span>
              <span className="text-[#fafafa] tabular-nums font-semibold">{latest.cpu?.toFixed(0) || 0}%</span>
            </div>
          )}

          {/* Pause Button */}
          <button
            onClick={togglePause}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono transition-colors ${
              isPaused
                ? 'bg-[rgba(245,158,11,0.12)] border-[rgba(245,158,11,0.3)] text-[#fbbf24]'
                : 'bg-[#18181b] border-[rgba(255,255,255,0.08)] text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
            title={isPaused ? 'Lanjutkan Stream (Live)' : 'Bekukan Grafik (Pause)'}
            type="button"
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span>{isPaused ? 'BEKU (PAUSED)' : 'LIVE'}</span>
          </button>

          {/* Segmented Range Control */}
          <div className="flex items-center bg-[#18181b] p-0.5 rounded-md border border-[rgba(255,255,255,0.08)] font-mono text-xs">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  range === opt.value
                    ? 'bg-[#27272a] text-[#fafafa] font-semibold'
                    : 'text-[#a1a1aa] hover:text-[#fafafa]'
                }`}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas with Clean Hairline Grid & Subtle Fill (8-12% opacity) */}
      <div className="w-full h-52 bg-[#09090b] rounded-lg p-2 border border-[rgba(255,255,255,0.06)] relative overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#71717a"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              fontFamily="'JetBrains Mono', monospace"
            />
            <YAxis
              domain={[0, 100]}
              stroke="#71717a"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              fontFamily="'JetBrains Mono', monospace"
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* 8-12% Area Fill as mandated by Section 6.C */}
            <Area
              type="monotone"
              dataKey="gpu0_compute"
              name="GPU 0 Compute"
              stroke="#38bdf8"
              strokeWidth={1.5}
              fill="#38bdf8"
              fillOpacity={0.1}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="gpu1_compute"
              name="GPU 1 Compute"
              stroke="#818cf8"
              strokeWidth={1.5}
              fill="#818cf8"
              fillOpacity={0.08}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="cpu"
              name="CPU Host"
              stroke="#c0c1ff"
              strokeWidth={1.2}
              fill="#c0c1ff"
              fillOpacity={0.06}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="ram"
              name="RAM Host"
              stroke="#34d399"
              strokeWidth={1.2}
              fill="#34d399"
              fillOpacity={0.06}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Footer */}
      <div className="flex items-center justify-between px-1 font-mono text-[11px] text-[#a1a1aa]">
        <div className="flex items-center gap-4 flex-wrap">
          {SERIES.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 rounded-sm" style={{ background: s.color }} />
              <span>{s.name}</span>
            </div>
          ))}
        </div>
        <span className="text-[10px] text-[#71717a]">
          {isPaused ? 'STREAM DIBEKUKAN' : 'T-0s SEKARANG'}
        </span>
      </div>
    </div>
  );
}

export default memo(LiveChart);
