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
  { key: 'gpu0_compute', name: 'GPU 0 Compute', color: '#1a73e8' },
  { key: 'gpu1_compute', name: 'GPU 1 Compute', color: '#4338ca' },
  { key: 'cpu',          name: 'CPU Host',      color: '#0284c7' },
  { key: 'ram',          name: 'RAM Host',      color: '#059669' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-slate-300 rounded-lg p-2.5 shadow-md font-mono min-w-[160px]">
      <p className="text-[10px] text-slate-500 mb-1.5 font-semibold uppercase tracking-wider">
        Waktu: {label || '—'}
      </p>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <span className="w-2 h-2 rounded-xs" style={{ background: entry.color }} />
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
  const [metricFilter, setMetricFilter] = useState('ALL');
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

  const visibleSeries = React.useMemo(() => {
    return SERIES.filter((s) => {
      if (metricFilter === 'GPU') return s.key.startsWith('gpu');
      if (metricFilter === 'HOST') return s.key === 'cpu' || s.key === 'ram';
      return true;
    });
  }, [metricFilter]);

  const latest = formattedData[formattedData.length - 1];

  if (!Array.isArray(history) || history.length === 0) {
    return (
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-center text-xs font-mono text-slate-400">
        <span>Menunggu telemetri real-time buffer…</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Telemetri Beban Komputasi Real-time
            </h2>
            <span className="px-2 py-0.2 rounded bg-slate-100 font-mono text-[10px] font-semibold text-slate-700 border border-slate-200">
              BUFFER T-60s
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Sampling 1000ms stream via kernel telemetry & NVML
          </p>
        </div>

        {/* Controls & Quick Stats */}
        <div className="flex items-center gap-2 flex-wrap">
          {latest && (
            <div className="hidden md:flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 font-mono text-xs">
              <span className="text-slate-500">GPU 0:</span>
              <span className="text-[#1a73e8] tabular-nums font-bold">{latest.gpu0_compute?.toFixed(0) || 0}%</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">CPU:</span>
              <span className="text-slate-800 tabular-nums font-bold">{latest.cpu?.toFixed(0) || 0}%</span>
            </div>
          )}

          {/* Metric Filter Segmented Control */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 font-mono text-xs">
            <button
              onClick={() => setMetricFilter('ALL')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                metricFilter === 'ALL'
                  ? 'bg-white text-[#1a73e8] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              type="button"
            >
              Semua
            </button>
            <button
              onClick={() => setMetricFilter('GPU')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                metricFilter === 'GPU'
                  ? 'bg-white text-[#1a73e8] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              type="button"
            >
              Dual GPU
            </button>
            <button
              onClick={() => setMetricFilter('HOST')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                metricFilter === 'HOST'
                  ? 'bg-white text-[#1a73e8] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              type="button"
            >
              CPU & RAM
            </button>
          </div>

          {/* Pause Button */}
          <button
            onClick={togglePause}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-mono font-medium transition-colors ${
              isPaused
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
            title={isPaused ? 'Lanjutkan Stream' : 'Jeda Grafik'}
            type="button"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Jeda' : 'Stream'}</span>
          </button>

          {/* Segmented Range Control */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 font-mono text-xs">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  range === opt.value
                    ? 'bg-white text-[#1a73e8] shadow-xs'
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

      {/* Chart Canvas with Clean Light Grid */}
      <div className="w-full h-48 bg-slate-50 rounded-lg p-2 border border-slate-200 relative overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              fontFamily="'JetBrains Mono', monospace"
            />
            <YAxis
              domain={[0, 100]}
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              fontFamily="'JetBrains Mono', monospace"
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
                strokeWidth={1.5}
                fill={s.color}
                fillOpacity={0.08}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Footer */}
      <div className="flex items-center justify-between px-1 font-mono text-[11px] text-slate-500">
        <div className="flex items-center gap-4 flex-wrap">
          {visibleSeries.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 rounded-xs" style={{ background: s.color }} />
              <span className="font-medium text-slate-700">{s.name}</span>
            </div>
          ))}
        </div>
        <span className="text-[10px] text-slate-400 font-medium">
          {isPaused ? 'STREAM DIBEKUKAN' : 'TELEMETRI AKTIF'}
        </span>
      </div>
    </div>
  );
}

export default memo(LiveChart);
