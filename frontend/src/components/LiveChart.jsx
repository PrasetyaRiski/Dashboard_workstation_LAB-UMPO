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
  { label: '1m',  value: 10 },
  { label: '15m', value: 30 },
  { label: '60m', value: 60 },
];

const SERIES = [
  { key: 'cpu',         name: 'CPU Host',      color: '#c0c1ff', dashArray: null },
  { key: 'ram',         name: 'RAM Host',      color: '#4edea3', dashArray: null },
  { key: 'gpu0_compute',name: 'GPU 0 Compute', color: '#4cd7f6', dashArray: null },
  { key: 'gpu1_compute',name: 'GPU 1 Compute', color: '#818cf8', dashArray: null },
  { key: 'gpu0_vram',   name: 'VRAM 0',        color: '#fbbf24', dashArray: '4 4' },
  { key: 'gpu1_vram',   name: 'VRAM 1',        color: '#acedff', dashArray: '4 4' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-surface-1 border border-border-base rounded-xl p-3 shadow-sm font-mono min-w-[170px]">
      <p className="text-[10px] text-text-muted mb-2 font-bold uppercase tracking-wider">
        Waktu: {label || '—'}
      </p>
      <div className="flex flex-col gap-1.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-text-muted">
              <span className="w-2 h-2 rounded-sm" style={{ background: entry.color }} />
              {entry.name}
            </span>
            <span className="font-bold font-mono" style={{ color: entry.color }}>
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

  const formattedData = React.useMemo(() => {
    if (!Array.isArray(history)) return [];
    return history.slice(-range).map((item) => ({
      ...item,
      time: item.time || item.timestamp || '',
      cpu: Number(item.cpu || 0),
      ram: Number(item.ram || 0),
      gpu0_compute: Number(item.gpu0_compute || 0),
      gpu1_compute: Number(item.gpu1_compute || 0),
      gpu0_vram: Number(item.gpu0_vram || 0),
      gpu1_vram: Number(item.gpu1_vram || 0),
    }));
  }, [history, range]);

  const latest = formattedData[formattedData.length - 1];

  if (!Array.isArray(history) || history.length === 0) {
    return (
      <div className="bg-surface-2 rounded-xl p-8 border border-border-subtle flex items-center justify-center text-xs font-mono text-text-muted">
        <span>Menunggu stream data telemetri real-time…</span>
      </div>
    );
  }

  return (
    <div className="bg-surface-2 rounded-xl p-6 shadow-sm border border-border-subtle relative overflow-hidden flex flex-col gap-4">
      {/* Header — Stitch Style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-headline-md text-base font-bold text-text-primary tracking-tight">
              Telemetri Beban Komputasi Real-time
            </span>
            <span className="px-2 py-0.5 rounded bg-surface-container-high font-mono text-[10px] text-neon-cyan border border-neon-cyan/20">
              T-60s BUFFER
            </span>
          </div>
          <div className="text-xs text-text-muted">
            Sampling interval 1000ms via Slurm & Prometheus telemetry stream
          </div>
        </div>

        {/* Live Ticker & Legends */}
        <div className="flex items-center gap-3 flex-wrap">
          {latest && (
            <>
              <div className="flex items-center gap-1.5 bg-surface-1 px-3 py-1 rounded-lg border border-border-base font-mono text-xs">
                <div className="w-2.5 h-0.5 bg-neon-cyan rounded-md"></div>
                <span className="text-text-muted">GPU 0:</span>
                <span className="text-neon-cyan font-bold">{latest.gpu0_compute?.toFixed(1) || 0}%</span>
              </div>
              <div className="flex items-center gap-1.5 bg-surface-1 px-3 py-1 rounded-lg border border-border-base font-mono text-xs">
                <div className="w-2.5 h-0.5 bg-secondary-fixed-dim rounded-md"></div>
                <span className="text-text-muted">CPU:</span>
                <span className="text-secondary-fixed-dim font-bold">{latest.cpu?.toFixed(1) || 0}%</span>
              </div>
            </>
          )}
          <div className="flex items-center gap-1.5 text-neon-emerald font-mono text-xs font-semibold">
            <span className="w-2 h-2 rounded-md bg-neon-emerald animate-pulse"></span>
            <span>STREAMING</span>
          </div>

          {/* Range pills */}
          <div className="flex items-center gap-1 bg-surface-1 p-0.5 rounded-lg border border-border-base font-mono text-[11px]">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  range === opt.value
                    ? 'bg-surface-3 text-neon-cyan font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-56 bg-surface-container-lowest/80 rounded-lg p-2 border border-border-subtle relative overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gpuGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4cd7f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#4cd7f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c0c1ff" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#c0c1ff" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4edea3" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#4edea3" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(70, 69, 84, 0.15)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#869397"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              fontFamily="'JetBrains Mono', monospace"
            />
            <YAxis
              domain={[0, 100]}
              stroke="#869397"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              fontFamily="'JetBrains Mono', monospace"
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="gpu0_compute"
              name="GPU 0 Compute"
              stroke="#4cd7f6"
              strokeWidth={2}
              fill="url(#gpuGrad)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="cpu"
              name="CPU Host"
              stroke="#c0c1ff"
              strokeWidth={1.5}
              fill="url(#cpuGrad)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="ram"
              name="RAM Host"
              stroke="#4edea3"
              strokeWidth={1.5}
              fill="url(#ramGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Pills */}
      <div className="flex items-center justify-between px-1 font-mono text-[11px] text-text-muted">
        <div className="flex items-center gap-4 flex-wrap">
          {SERIES.slice(0, 4).map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 rounded-sm" style={{ background: s.color }} />
              <span>{s.name}</span>
            </div>
          ))}
        </div>
        <span className="text-neon-cyan font-semibold">T-0s SEKARANG</span>
      </div>
    </div>
  );
}

export default memo(LiveChart);
