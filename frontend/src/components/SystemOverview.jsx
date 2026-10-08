import React, { memo, useState, useEffect } from 'react';
import { Cpu, HardDrive, ShieldCheck, DatabaseBackup, Loader2, Layers } from 'lucide-react';

function SystemOverview({ system = {}, gpus = [], onTriggerBackup, isBackingUp, backups = [], isAdmin }) {
  const [capacity, setCapacity] = useState({ used_slots: 0, total_slots: 1 });

  useEffect(() => {
    const fetchCapacity = async () => {
      try {
        const res = await fetch(`/api/stats/capacity?_t=${Date.now()}`);
        if (res.ok) {
          const json = await res.json();
          setCapacity(json);
        }
      } catch (e) {
        console.error('Fetch capacity error:', e);
      }
    };
    fetchCapacity();
    const interval = setInterval(fetchCapacity, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!system) return null;

  const cpu = system?.cpu || {};
  const memory = system?.memory || {};
  const disks = system?.disks || {};
  const homeDisk = disks.home || disks.root || {};

  const cpuPercent = cpu.overall_percent || 0;
  const memoryPercent = memory.percent || 0;
  
  const isStorageSafe = (homeDisk.percent || 0) < 90;
  const latestBackup = backups.length > 0 ? backups[0] : null;

  const usedSlots = capacity.used_slots || 0;
  const totalSlots = capacity.total_slots || 1;
  const availableSlots = Math.max(0, totalSlots - usedSlots);
  const isSlotsFull = usedSlots >= totalSlots;
  const slotUtilPct = totalSlots > 0 ? Math.min(100, Math.round((usedSlots / totalSlots) * 100)) : 0;

  let backupText = 'Belum ada backup';
  if (latestBackup) {
    const d = new Date(latestBackup.created_at || latestBackup.timestamp);
    if (!isNaN(d)) {
      backupText = `Backup: ${d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
    } else {
      backupText = 'Backup: Berhasil disimpan';
    }
  }

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Ringkasan Sistem</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Metric 1: CPU & RAM */}
        <div className="bg-surface-2 p-5 rounded-xl border border-border-subtle flex flex-col">
          <div className="flex items-center gap-3 mb-5 text-text-secondary">
            <Cpu className="w-4 h-4 text-text-primary" />
            <h2 className="font-medium text-text-primary text-sm">Beban Komputasi</h2>
          </div>
          
          <div className="space-y-4 mt-auto">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary">CPU ({cpu.core_count || 24} Core)</span>
                <span className="font-mono font-medium text-text-primary">{cpuPercent}%</span>
              </div>
              <div className="w-full bg-surface-1 h-1.5 rounded-md overflow-hidden border border-border-base">
                <div 
                  className={`h-full transition-all duration-500 ${cpuPercent > 85 ? 'bg-error' : 'bg-primary'}`}
                  style={{ width: `${cpuPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary">Memori ({memory.total_gb || 128} GB)</span>
                <span className="font-mono font-medium text-text-primary">{memoryPercent}%</span>
              </div>
              <div className="w-full bg-surface-1 h-1.5 rounded-md overflow-hidden border border-border-base">
                <div 
                  className={`h-full transition-all duration-500 ${memoryPercent > 85 ? 'bg-error' : 'bg-tertiary'}`}
                  style={{ width: `${memoryPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Penyimpanan / Storage */}
        <div className="bg-surface-2 p-5 rounded-xl border border-border-subtle flex flex-col">
          <div className="flex items-center gap-3 mb-4 text-text-secondary">
            <HardDrive className="w-4 h-4 text-text-primary" />
            <h2 className="font-medium text-text-primary text-sm">Penyimpanan Utama</h2>
          </div>
          
          <div className="mt-auto">
            <div className="flex items-end gap-2 mb-3">
              <span className="text-3xl font-semibold font-mono text-text-primary tracking-tight">
                {homeDisk.used_gb || 0}
              </span>
              <span className="text-text-secondary mb-1 text-sm">GB terpakai</span>
            </div>

            <div className="w-full bg-surface-1 h-1.5 rounded-md overflow-hidden border border-border-base mb-2">
              <div 
                className={`h-full transition-all duration-500 ${!isStorageSafe ? 'bg-error' : 'bg-primary'}`}
                style={{ width: `${homeDisk.percent || 0}%` }}
              />
            </div>
            <p className="text-xs text-text-secondary">
              Sisa kapasitas: <span className="font-mono font-medium text-text-primary">{homeDisk.free_gb || 0} GB</span>
            </p>
          </div>
        </div>

        {/* Metric 3: Quota Prioritas GPU */}
        <div className="bg-surface-2 p-5 rounded-xl border border-border-subtle flex flex-col relative overflow-hidden">
          {isSlotsFull && <div className="absolute top-0 left-0 right-0 h-0.5 bg-error"></div>}
          <div className="flex items-center gap-3 mb-4 text-text-secondary">
            <Layers className={`w-4 h-4 ${isSlotsFull ? 'text-error' : 'text-neon-cyan'}`} />
            <h2 className="font-medium text-text-primary text-sm">Slot GPU Prioritas</h2>
          </div>
          
          <div className="mt-auto">
            <div className="flex items-end gap-2 mb-3">
              <span className={`text-3xl font-semibold font-mono tracking-tight ${isSlotsFull ? 'text-error' : 'text-neon-cyan'}`}>
                {usedSlots}
              </span>
              <span className="text-text-secondary mb-1 text-sm">/ {totalSlots} Slot</span>
            </div>

            <div className="w-full bg-surface-1 h-1.5 rounded-md overflow-hidden border border-border-base mb-2">
              <div 
                className={`h-full transition-all duration-500 ${isSlotsFull ? 'bg-error' : 'bg-neon-cyan'}`}
                style={{ width: `${slotUtilPct}%` }}
              />
            </div>
            <p className="text-xs text-text-secondary">
              Status: <span className="font-mono font-medium text-text-primary">{isSlotsFull ? 'Penuh' : `${availableSlots} Tersedia`}</span>
            </p>
          </div>
        </div>

        {/* Metric 4: Keamanan & Backup */}
        <div className="bg-surface-2 p-5 rounded-xl border border-border-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4 text-text-secondary">
              <ShieldCheck className="w-4 h-4 text-text-primary" />
              <h2 className="font-medium text-text-primary text-sm">Keamanan</h2>
            </div>
            
            <ul className="space-y-2 mb-4">
              <li className="flex items-center gap-2 text-xs text-text-secondary">
                <span className={`w-1.5 h-1.5 rounded-full ${isStorageSafe ? 'bg-tertiary' : 'bg-error'}`}></span>
                Kapasitas aman
              </li>
              <li className="flex items-center gap-2 text-xs text-text-secondary">
                <span className={`w-1.5 h-1.5 rounded-full ${latestBackup ? 'bg-tertiary' : 'bg-amber-400'}`}></span>
                {backupText}
              </li>
            </ul>
          </div>
          
          {isAdmin && (
            <button
              onClick={onTriggerBackup}
              disabled={isBackingUp}
              className="w-full py-2 px-3 bg-surface-1 hover:bg-surface-3 border border-border-base rounded-md text-xs font-medium text-text-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-text-muted" />
                  Mencadangkan...
                </>
              ) : (
                <>
                  <DatabaseBackup className="w-3 h-3 text-text-muted" />
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
