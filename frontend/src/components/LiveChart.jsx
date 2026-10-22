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
  { key: 'gpu0_compute', name: 'GPU 0 Compute', color: '#6F4E37' },
  { key: 'gpu1_compute', name: 'GPU 1 Compute', color: '#C8794A' },
  { key: 'cpu',          name: 'Host CPU',      color: '#B45309' },
  { key: 'ram',          name: 'Host RAM',      color: '#2E7D32' },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-[#FAF6EF] border border-[#E4D8C3] rounded-xl px-3 py-2 shadow-warm-md font-mono text-xs z-50">
      <div className="text-[11px] font-semibold text-[#7A6A5C] mb-1.5 border-b border-[#E4D8C3] pb-1">
        Waktu: {label}
      </div>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#3B2E26]">
              <span className="w-2 h-2 rounded-[3px]" style={{ background: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-bold tabular-nums text-[#2E2018]">
              {Number(entry.value).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveChart({ history = [] }) {
  const [range, setRange] = useState(60);
  const [isPaused, setIsPaused] = useState(false);
  const [metricFilter, setMetricFilter] = useState('ALL'); // 'ALL' | 'GPU' | 'HOST'

  // Format data for Recharts
  const rawData = Array.isArray(history) ? history : [];
  const slicedData = rawData.slice(-range);

  const formattedData = slicedData.map((d, i) => {
    let timeLabel = '';
    if (d.timestamp) {
      const parts = String(d.timestamp).split(' ');
      timeLabel = parts[1] || parts[0];
    } else {
      timeLabel = `T-${slicedData.length - i}s`;
    }

    return {
      time: timeLabel,
      gpu0_compute: d.gpu0_compute ?? d.gpu0_compute_pct ?? 0,
      gpu1_compute: d.gpu1_compute ?? d.gpu1_compute_pct ?? 0,
      cpu: d.cpu_percent ?? d.cpu ?? 0,
      ram: d.ram_percent ?? d.ram ?? 0,
    };
  });

  const latest = formattedData[formattedData.length - 1];

  const visibleSeries = SERIES.filter((s) => {
    if (metricFilter === 'GPU') return s.key.startsWith('gpu');
    if (metricFilter === 'HOST') return s.key === 'cpu' || s.key === 'ram';
    return true;
  });

  const togglePause = () => setIsPaused(!isPaused);

  return (
    <div className="bg-[#F3EBDD] rounded-2xl p-4 sm:p-5 border border-[#E4D8C3] shadow-warm-xs flex flex-col gap-4 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-sm sm:text-base font-bold text-[#2E2018] tracking-tight">
              Telemetri Beban Komputasi Real-time
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-[#FAF6EF] font-mono text-[10px] font-semibold text-[#7A6A5C] border border-[#E4D8C3]">
              BUFFER T-60s
            </span>
          </div>
          <p className="text-xs text-[#7A6A5C] mt-0.5">
            Sampling 1000ms stream via kernel telemetry &amp; NVML
          </p>
        </div>

        {/* Controls & Quick Stats */}
        <div className="flex items-center gap-2 flex-wrap">
          {latest && (
            <div className="hidden md:flex items-center gap-2 bg-[#FAF6EF] px-2.5 py-1 rounded-xl border border-[#E4D8C3] font-mono text-xs">
              <span className="text-[#7A6A5C]">GPU 0:</span>
              <span className="text-[#6F4E37] tabular-nums font-bold">{latest.gpu0_compute?.toFixed(0) || 0}%</span>
              <span className="text-[#E4D8C3]">·</span>
              <span className="text-[#7A6A5C]">CPU:</span>
              <span className="text-[#2E2018] tabular-nums font-bold">{latest.cpu?.toFixed(0) || 0}%</span>
            </div>
          )}

          {/* Metric Filter Segmented Control */}
          <div className="flex items-center bg-[#FAF6EF] p-0.5 rounded-xl border border-[#E4D8C3] font-mono text-xs">
            <button
              onClick={() => setMetricFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                metricFilter === 'ALL'
                  ? 'bg-[#6F4E37] text-[#FAF6EF] shadow-xs font-semibold'
                  : 'text-[#3B2E26] hover:text-[#2E2018]'
              }`}
              type="button"
            >
              Semua
            </button>
            <button
              onClick={() => setMetricFilter('GPU')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                metricFilter === 'GPU'
                  ? 'bg-[#6F4E37] text-[#FAF6EF] shadow-xs font-semibold'
                  : 'text-[#3B2E26] hover:text-[#2E2018]'
              }`}
              type="button"
            >
              Dual GPU
            </button>
            <button
              onClick={() => setMetricFilter('HOST')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                metricFilter === 'HOST'
                  ? 'bg-[#6F4E37] text-[#FAF6EF] shadow-xs font-semibold'
                  : 'text-[#3B2E26] hover:text-[#2E2018]'
              }`}
              type="button"
            >
              CPU &amp; RAM
            </button>
          </div>

          {/* Pause Button */}
          <button
            onClick={togglePause}
            className={`flex items-center gap-1 px-3 py-1 rounded-xl border text-xs font-mono font-medium transition-colors min-h-[32px] ${
              isPaused
                ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#B45309]'
                : 'bg-[#FAF6EF] border-[#E4D8C3] text-[#3B2E26] hover:bg-[#EFE6D8]'
            }`}
            title={isPaused ? 'Lanjutkan Stream' : 'Jeda Grafik'}
            type="button"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Jeda' : 'Stream'}</span>
          </button>

          {/* Segmented Range Control */}
          <div className="flex items-center bg-[#FAF6EF] p-0.5 rounded-xl border border-[#E4D8C3] font-mono text-xs">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  range === opt.value
                    ? 'bg-[#6F4E37] text-[#FAF6EF] shadow-xs font-semibold'
                    : 'text-[#3B2E26] hover:text-[#2E2018]'
                }`}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas with Warm Clean Grid */}
      <div className="w-full h-48 bg-[#FAF6EF] rounded-xl p-2 border border-[#E4D8C3] relative overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#E4D8C3" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#7A6A5C"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              fontFamily="var(--font-mono)"
            />
            <YAxis
              domain={[0, 100]}
              stroke="#7A6A5C"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              fontFamily="var(--font-mono)"
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            {visibleSeries.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={1.75}
                fill={s.color}
                fillOpacity={0.12}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Footer */}
      <div className="flex items-center justify-between px-1 font-mono text-[11px] text-[#7A6A5C] flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          {visibleSeries.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 rounded-[3px]" style={{ background: s.color }} />
              <span className="font-medium text-[#2E2018]">{s.name}</span>
            </div>
          ))}
        </div>
        <span className="text-[10px] text-[#7A6A5C] font-semibold">
          {isPaused ? 'STREAM DIBEKUKAN' : 'TELEMETRI AKTIF'}
        </span>
      </div>
    </div>
  );
}

export default memo(LiveChart);
