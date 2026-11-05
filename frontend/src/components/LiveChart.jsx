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
  { key: 'gpu0_compute', name: 'GPU 0 Compute', color: '#7C3AED' },
  { key: 'gpu1_compute', name: 'GPU 1 Compute', color: '#10B981' },
  { key: 'cpu',          name: 'Host CPU',      color: '#0284C7' },
  { key: 'ram',          name: 'Host RAM',      color: '#F59E0B' },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-md font-mono text-xs z-50">
      <div className="text-[11px] font-semibold text-slate-400 mb-1.5 border-b border-slate-100 pb-1">
        Waktu: {label}
      </div>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-[3px]" style={{ background: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-bold tabular-nums text-slate-900">
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
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col gap-4 font-sans hover:border-slate-300 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-sans text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Telemetri Beban Komputasi Real-time
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[10px] font-semibold text-slate-500 border border-slate-200">
              BUFFER T-60s
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Sampling 1000ms stream via kernel telemetry &amp; NVML
          </p>
        </div>

        {/* Controls & Quick Stats */}
        <div className="flex items-center gap-2 flex-wrap">
          {latest && (
            <div className="hidden md:flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 font-mono text-xs">
              <span className="text-slate-400">GPU 0:</span>
              <span className="text-violet-600 tabular-nums font-bold">{latest.gpu0_compute?.toFixed(0) || 0}%</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-400">CPU:</span>
              <span className="text-sky-600 tabular-nums font-bold">{latest.cpu?.toFixed(0) || 0}%</span>
            </div>
          )}

          {/* Metric Filter Segmented Control */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 font-mono text-xs">
            <button
              onClick={() => setMetricFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                metricFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              type="button"
            >
              Semua
            </button>
            <button
              onClick={() => setMetricFilter('GPU')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                metricFilter === 'GPU'
                  ? 'bg-slate-900 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              type="button"
            >
              Dual GPU
            </button>
            <button
              onClick={() => setMetricFilter('HOST')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                metricFilter === 'HOST'
                  ? 'bg-slate-900 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              type="button"
            >
              CPU &amp; RAM
            </button>
          </div>

          {/* Pause Button */}
          <button
            onClick={togglePause}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-mono font-medium transition-colors min-h-[32px] cursor-pointer ${
              isPaused
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title={isPaused ? 'Lanjutkan Stream' : 'Jeda Grafik'}
            type="button"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-amber-600" /> : <Pause className="w-3.5 h-3.5 text-slate-600" />}
            <span>{isPaused ? 'Jeda' : 'Stream'}</span>
          </button>

          {/* Segmented Range Control */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 font-mono text-xs">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                  range === opt.value
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas with Clean Cloud Grid */}
      <div className="w-full h-48 bg-slate-50/60 rounded-xl p-2 border border-slate-200 relative overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#64748B"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              fontFamily="var(--font-mono)"
            />
            <YAxis
              domain={[0, 100]}
              stroke="#64748B"
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
      <div className="flex items-center justify-between px-1 font-mono text-[11px] text-slate-500 flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          {visibleSeries.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 rounded-[3px]" style={{ background: s.color }} />
              <span className="font-medium text-slate-800">{s.name}</span>
            </div>
          ))}
        </div>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
          {isPaused ? 'STREAM DIBEKUKAN' : 'TELEMETRI AKTIF'}
        </span>
      </div>
    </div>
  );
}

export default memo(LiveChart);
