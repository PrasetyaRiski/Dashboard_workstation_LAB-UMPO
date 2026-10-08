import React, { memo } from 'react';
import { Shield, ShieldAlert } from 'lucide-react';

function GpuCard({ gpu, onOpenKillModal, isAdmin = false }) {
  if (!gpu) return null;

  const vramPct = gpu.vram_percent || 0;
  const computePct = gpu.compute_percent || 0;
  const vramUsedGb = (((gpu.vram_used_mb || 0)) / 1024).toFixed(2);
  const vramTotalGb = (((gpu.vram_total_mb || 16384)) / 1024).toFixed(1);

  return (
    <div className="bg-surface-2 rounded-xl p-6 border border-border-subtle flex flex-col gap-6">
      
      {/* Header Info */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">GPU {gpu.index}</h2>
          <p className="text-sm text-text-secondary mt-1">Suhu: {gpu.temperature_c ?? 0}°C · Kipas: {gpu.fan_speed_percent ?? 0}% · Daya: {gpu.power_w ?? 0}W</p>
        </div>
      </div>

      {/* Utilization Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-secondary">Komputasi</span>
            <span className="font-mono font-medium">{computePct}%</span>
          </div>
          <div className="w-full bg-surface-1 h-2 rounded-md overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${computePct > 85 ? 'bg-error' : 'bg-primary'}`}
              style={{ width: `${computePct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-secondary">VRAM ({vramUsedGb} / {vramTotalGb} GB)</span>
            <span className="font-mono font-medium">{vramPct}%</span>
          </div>
          <div className="w-full bg-surface-1 h-2 rounded-md overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${vramPct > 85 ? 'bg-error' : 'bg-primary'}`}
              style={{ width: `${vramPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Process Table */}
      <div>
        <h3 className="text-base font-medium text-text-primary mb-3">Penggunaan VRAM Saat Ini</h3>
        <div className="border border-border-subtle rounded-lg overflow-hidden bg-surface-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-3 text-text-secondary border-b border-border-subtle">
              <tr>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">PID</th>
                <th className="px-4 py-2 font-medium">Proses</th>
                <th className="px-4 py-2 font-medium text-right">Memori</th>
                {isAdmin && <th className="px-4 py-2 font-medium text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {!gpu.processes || gpu.processes.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="px-4 py-6 text-center text-text-secondary">
                    GPU sedang dalam keadaan siaga.
                  </td>
                </tr>
              ) : (
                gpu.processes.map((proc) => {
                  const isProtected = proc.is_system || !proc.is_killable;
                  return (
                    <tr key={proc.pid} className="hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-2 font-medium text-text-primary">
                        {proc.username}
                      </td>
                      <td className="px-4 py-2 font-mono text-text-secondary">
                        {proc.pid}
                      </td>
                      <td className="px-4 py-2 max-w-[200px] truncate text-text-secondary" title={proc.cmdline || proc.name}>
                        <div className="flex items-center gap-2">
                          {isProtected && <Shield className="w-3 h-3 text-text-muted" title="Proses Sistem (Dilindungi)" />}
                          {proc.name}
                        </div>
                      </td>
                      <td className="px-4 py-2 font-mono text-right text-text-primary">
                        {proc.vram_mb} MB
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-2 text-right">
                          {!isProtected ? (
                            <button
                              onClick={() => onOpenKillModal({
                                pid: proc.pid,
                                username: proc.username,
                                procName: proc.name,
                                cmdline: proc.cmdline,
                                vramMb: proc.vram_mb,
                                is_system: proc.is_system
                              })}
                              className="text-error hover:text-red-400 font-medium px-2 py-1 rounded transition-colors"
                              title="Hentikan Proses"
                              type="button"
                            >
                              Hentikan
                            </button>
                          ) : (
                            <span className="text-text-muted text-xs px-2">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default memo(GpuCard);
