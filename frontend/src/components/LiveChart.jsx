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
import { Activity } from 'lucide-react';

const RANGE_OPTIONS = [
  { label: '1m',  value: 1  },
  { label: '15m', value: 15 },
  { label: '60m', value: 60 },
];

const SERIES = [
  { key: 'cpu',         name: 'CPU',       color: '#a78bfa', dashArray: null },
  { key: 'ram',         name: 'RAM',       color: '#60a5fa', dashArray: null },
  { key: 'gpu0_compute',name: 'GPU 0',     color: '#818cf8', dashArray: null },
  { key: 'gpu1_compute',name: 'GPU 1',     color: '#34d399', dashArray: null },
  { key: 'gpu0_vram',   name: 'VRAM 0',    color: '#fbbf24', dashArray: '4 4' },
  { key: 'gpu1_vram',   name: 'VRAM 1',    color: '#67e8f9', dashArray: '4 4' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      className="panel-raised"
      style={{
        minWidth: 160,
        padding: '10px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <p
        className="metric-value mb-2"
        style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}
      >
        {label}
      </p>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span
              className="flex items-center gap-1.5"
              style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, background: entry.color, display: 'inline-block' }} />
              {entry.name}
            </span>
            <span
              className="metric-value font-bold"
              style={{ fontSize: '0.6875rem', color: entry.color }}
            >
              {entry.value?.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

function LiveChart({ history, theme = 'dark' }) {
  const [range, setRange] = useState(60);
  const isDark = theme === 'dark';

  const slicedData = history
    ? history.slice(-range)
    : [];

  if (!history || history.length === 0) {
    return (
      <div
        className="panel-raised flex items-center justify-center fade-in-up"
        style={{ height: 200, fontSize: '0.6875rem', color: 'var(--text-muted)' }}
      >
        <span className="metric-value">Menunggu stream data telemetri real-time…</span>
      </div>
    );
  }

  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const axisColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)';

  return (
    <div className="panel-raised fade-in-up" style={{ padding: '20px 24px 20px' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: 'var(--accent-indigo)' }} />
          <h2
            className="font-bold"
            style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
          >
            Telemetri Real-Time — CPU · RAM · GPU
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend pills */}
          <div className="hidden sm:flex items-center gap-3 flex-wrap">
            {SERIES.map((s) => (
              <span
                key={s.key}
                className="metric-value flex items-center gap-1.5"
                style={{ fontSize: '0.5625rem', color: 'var(--text-secondary)' }}
              >
                {s.dashArray ? (
                  <svg width="12" height="6">
                    <line x1="0" y1="3" x2="12" y2="3" stroke={s.color} strokeWidth="1.5" strokeDasharray={s.dashArray} />
                  </svg>
                ) : (
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block' }} />
                )}
                {s.name}
              </span>
            ))}
          </div>

          {/* Range selector */}
          <div
            className="flex rounded-lg overflow-hidden shrink-0"
            style={{ border: '1px solid var(--border-base)' }}
          >
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className="cursor-pointer transition"
                style={{
                  padding: '3px 10px',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace",
                  background: range === opt.value ? 'var(--accent-indigo)' : 'var(--surface-2)',
                  color: range === opt.value ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 200, marginLeft: -8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={slicedData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {SERIES.filter(s => !s.dashArray).map((s) => (
                <linearGradient key={`grad-${s.key}`} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={s.color} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0.01} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke={gridColor} strokeDasharray="none" vertical={false} />
            <XAxis
              dataKey="time"
              stroke={axisColor}
              fontSize={9}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              fontFamily="'JetBrains Mono', monospace"
              tick={{ fontVariantNumeric: 'tabular-nums' }}
            />
            <YAxis
              domain={[0, 100]}
              stroke={axisColor}
              fontSize={9}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              fontFamily="'JetBrains Mono', monospace"
              width={32}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Solid lines (CPU, RAM, GPU compute) */}
            {SERIES.filter(s => !s.dashArray).map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#grad-${s.key})`}
                dot={false}
                isAnimationActive={false}
              />
            ))}

            {/* Dashed VRAM lines */}
            {SERIES.filter(s => s.dashArray).map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={1.2}
                strokeDasharray={s.dashArray}
                fill="none"
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default memo(LiveChart);
