import React, { memo } from 'react';
import { Cpu, HardDrive, ShieldCheck, DatabaseBackup, Loader2 } from 'lucide-react';

function SystemOverview({ system = {}, gpus = [], onTriggerBackup, isBackingUp, backups = [], isAdmin }) {
  if (!system) return null;

  const cpu = system?.cpu || {};
  const memory = system?.memory || {};
  const disks = system?.disks || {};
  const homeDisk = disks.home || disks.root || {};

  const cpuPercent = cpu.overall_percent || 0;
  const memoryPercent = memory.percent || 0;
  
  const isStorageSafe = (homeDisk.percent || 0) < 90;
  const latestBackup = backups.length > 0 ? backups[0] : null;

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Ringkasan Sistem</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric 1: CPU & RAM */}
        <div className="bg-surface-2 p-6 rounded-xl border border-border-subtle flex flex-col">
          <div className="flex items-center gap-3 mb-6 text-text-secondary">
            <Cpu className="w-5 h-5 text-text-primary" />
            <h2 className="font-medium text-text-primary">Beban Komputasi</h2>
          </div>
          
          <div className="space-y-5 mt-auto">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-secondary">CPU ({cpu.core_count || 24} Core)</span>
                <span className="font-mono font-medium">{cpuPercent}%</span>
              </div>
              <div className="w-full bg-surface-1 h-2 rounded-md overflow-hidden border border-border-base">
                <div 
                  className={`h-full transition-all duration-500 ${cpuPercent > 85 ? 'bg-error' : 'bg-primary'}`}
                  style={{ width: `${cpuPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-secondary">Memori ({memory.total_gb || 128} GB)</span>
                <span className="font-mono font-medium">{memoryPercent}%</span>
              </div>
              <div className="w-full bg-surface-1 h-2 rounded-md overflow-hidden border border-border-base">
                <div 
                  className={`h-full transition-all duration-500 ${memoryPercent > 85 ? 'bg-error' : 'bg-tertiary'}`}
                  style={{ width: `${memoryPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Penyimpanan / Storage */}
        <div className="bg-surface-2 p-6 rounded-xl border border-border-subtle flex flex-col">
          <div className="flex items-center gap-3 mb-4 text-text-secondary">
            <HardDrive className="w-5 h-5 text-text-primary" />
            <h2 className="font-medium text-text-primary">Penyimpanan /home</h2>
          </div>
          
          <div className="mt-auto">
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-semibold font-mono text-text-primary tracking-tight">
                {homeDisk.used_gb || 0}
              </span>
              <span className="text-text-secondary mb-1 font-medium">GB terpakai</span>
            </div>

            <div className="w-full bg-surface-1 h-2 rounded-md overflow-hidden border border-border-base mb-2">
              <div 
                className={`h-full transition-all duration-500 ${!isStorageSafe ? 'bg-error' : 'bg-primary'}`}
                style={{ width: `${homeDisk.percent || 0}%` }}
              />
            </div>
            <p className="text-sm text-text-secondary">
              Sisa kapasitas: <span className="font-mono font-medium text-text-primary">{homeDisk.free_gb || 0} GB</span>
            </p>
          </div>
        </div>

        {/* Metric 3: Keamanan & Backup */}
        <div className="bg-surface-2 p-6 rounded-xl border border-border-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-text-primary" />
                <h2 className="font-medium text-text-primary">Kesehatan & Backup</h2>
              </div>
            </div>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm text-text-secondary">
                <span className={`w-2 h-2 rounded-md ${isStorageSafe ? 'bg-tertiary' : 'bg-error'}`}></span>
                Kapasitas server aman
              </li>
              <li className="flex items-center gap-2 text-sm text-text-secondary">
                <span className="w-2 h-2 rounded-md bg-tertiary"></span>
                Mode SQLite WAL aktif
              </li>
              <li className="flex items-center gap-2 text-sm text-text-secondary">
                <span className={`w-2 h-2 rounded-md ${latestBackup ? 'bg-tertiary' : 'bg-amber-400'}`}></span>
                {latestBackup ? `Backup terakhir: ${new Date(latestBackup.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Belum ada backup'}
              </li>
            </ul>
          </div>
          
          {isAdmin && (
            <button
              onClick={onTriggerBackup}
              disabled={isBackingUp}
              className="w-full py-2.5 px-4 bg-surface-1 hover:bg-surface-3 border border-border-base rounded-lg text-sm font-medium text-text-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
                  Memproses Backup...
                </>
              ) : (
                <>
                  <DatabaseBackup className="w-4 h-4 text-text-muted" />
                  Backup Database
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

export default memo(SystemOverview);
