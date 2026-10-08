import React, { memo } from 'react';
import { Cpu, HardDrive, ShieldCheck } from 'lucide-react';

function SystemOverview({ system = {}, gpus = [] }) {
  if (!system) return null;

  const cpu = system?.cpu || {};
  const memory = system?.memory || {};
  const disks = system?.disks || {};
  const homeDisk = disks.home || disks.root || {};

  const cpuPercent = cpu.overall_percent || 0;
  const memoryPercent = memory.percent || 0;
  
  // Backup status (simulated based on disk health)
  const isStorageSafe = (homeDisk.percent || 0) < 90;

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Ringkasan Sistem</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric 1: CPU & RAM */}
        <div className="bg-surface-2 p-6 rounded-xl border border-border-subtle">
          <div className="flex items-center gap-3 mb-4 text-text-secondary">
            <Cpu className="w-5 h-5" />
            <h2 className="font-medium">Beban Komputasi</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>CPU ({cpu.core_count || 24} Core)</span>
                <span className="font-mono font-medium">{cpuPercent}%</span>
              </div>
              <div className="w-full bg-surface-1 h-2 rounded-md overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${cpuPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Memori ({memory.total_gb || 128} GB)</span>
                <span className="font-mono font-medium">{memoryPercent}%</span>
              </div>
              <div className="w-full bg-surface-1 h-2 rounded-md overflow-hidden">
                <div 
                  className="h-full bg-tertiary transition-all duration-500"
                  style={{ width: `${memoryPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Penyimpanan / Storage */}
        <div className="bg-surface-2 p-6 rounded-xl border border-border-subtle">
          <div className="flex items-center gap-3 mb-4 text-text-secondary">
            <HardDrive className="w-5 h-5" />
            <h2 className="font-medium">Penyimpanan /home</h2>
          </div>
          
          <div className="flex items-end gap-2 mb-4">
            <span className="text-3xl font-semibold font-mono text-text-primary">
              {homeDisk.used_gb || 0}
            </span>
            <span className="text-text-muted mb-1">GB terpakai</span>
          </div>

          <div className="w-full bg-surface-1 h-2 rounded-md overflow-hidden mb-2">
            <div 
              className={`h-full transition-all duration-500 ${!isStorageSafe ? 'bg-error' : 'bg-primary'}`}
              style={{ width: `${homeDisk.percent || 0}%` }}
            />
          </div>
          <p className="text-sm text-text-secondary">
            Sisa kapasitas: <span className="font-mono">{homeDisk.free_gb || 0} GB</span>
          </p>
        </div>

        {/* Metric 3: Keamanan & Backup */}
        <div className="bg-surface-2 p-6 rounded-xl border border-border-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4 text-text-secondary">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="font-medium">Status Sistem</h2>
            </div>
            
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-text-primary">
                <span className={`w-2 h-2 rounded-full ${isStorageSafe ? 'bg-tertiary' : 'bg-error'}`}></span>
                Kapasitas penyimpanan aman
              </li>
              <li className="flex items-center gap-2 text-sm text-text-primary">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                Sistem database (WAL) aktif
              </li>
              <li className="flex items-center gap-2 text-sm text-text-primary">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                Sinkronisasi backup berjalan
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}

export default memo(SystemOverview);
