import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  Users,
  FileText,
  FolderOpen,
  ShieldCheck,
  LogOut,
  RefreshCw,
  DatabaseBackup,
  Terminal
} from 'lucide-react';

export default function CommandPalette({
  isOpen,
  onClose,
  _activeTab,
  onTabChange,
  isAdmin,
  onOpenLogin,
  onLogout,
  onTriggerBackup,
  onRefreshTelemetry,
  processes = []
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const baseCommands = [
    {
      id: 'nav-overview',
      category: 'Navigasi',
      label: 'Buka Ringkasan Sistem & GPU',
      shortcut: '1',
      icon: LayoutDashboard,
      action: () => { onTabChange('overview'); onClose(); }
    },
    {
      id: 'nav-students',
      category: 'Navigasi',
      label: 'Buka Manajemen Pengguna SIMTIK',
      shortcut: '2',
      icon: Users,
      action: () => { onTabChange('students'); onClose(); }
    },
    {
      id: 'nav-files',
      category: 'Navigasi',
      label: 'Buka Admin File Explorer',
      shortcut: '4',
      icon: FolderOpen,
      action: () => {
        if (!isAdmin) {
          onOpenLogin?.();
        } else {
          onTabChange('files');
        }
        onClose();
      }
    },
    {
      id: 'nav-audit',
      category: 'Navigasi',
      label: 'Buka Log Audit Sistem',
      shortcut: '3',
      icon: FileText,
      action: () => {
        if (!isAdmin) {
          onOpenLogin?.();
        } else {
          onTabChange('audit');
        }
        onClose();
      }
    },
    {
      id: 'action-refresh',
      category: 'Aksi Sistem',
      label: 'Segarkan Telemetri Secara Manual',
      shortcut: 'R',
      icon: RefreshCw,
      action: () => { onRefreshTelemetry?.(); onClose(); }
    },
    {
      id: 'action-backup',
      category: 'Aksi Sistem',
      label: 'Buat Cadangan Snapshot Database Baru',
      shortcut: 'B',
      icon: DatabaseBackup,
      action: () => {
        if (!isAdmin) {
          onOpenLogin?.();
        } else {
          onTriggerBackup?.();
        }
        onClose();
      }
    },
    isAdmin ? {
      id: 'action-logout',
      category: 'Keamanan',
      label: 'Kunci Konsol / Logout Sesi Admin',
      shortcut: 'Esc',
      icon: LogOut,
      action: () => { onLogout?.(); onClose(); }
    } : {
      id: 'action-login',
      category: 'Keamanan',
      label: 'Otentikasi Admin / Operator',
      shortcut: 'L',
      icon: ShieldCheck,
      action: () => { onOpenLogin?.(); onClose(); }
    }
  ];

  // Map running processes if user searches for PID or process name
  const processCommands = (processes || []).map(proc => ({
    id: `proc-${proc.pid}`,
    category: 'Proses Aktif',
    label: `PID ${proc.pid} · ${proc.username} (${proc.name}) · ${proc.vram_mb || 0} MB`,
    shortcut: `GPU ${proc.gpu_index ?? 0}`,
    icon: Terminal,
    action: () => {
      onTabChange('overview');
      onClose();
    }
  }));

  const allItems = [...baseCommands, ...processCommands];

  const filtered = allItems.filter(item => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
  });

  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(0);
    }
  }, [filtered.length, selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/50 font-sans">
      <div 
        className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-white">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Cari perintah, navigasi tab, atau PID proses… (↑ ↓ Enter)"
            className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 outline-none font-medium"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-600 rounded-md border border-slate-200">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100 bg-white">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Tidak ada hasil yang cocok dengan &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs transition-colors min-h-[44px] cursor-pointer ${
                    isSelected 
                      ? 'bg-slate-900 text-white font-semibold shadow-xs' 
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className={`text-[10px] uppercase tracking-wider font-mono ${
                      isSelected ? 'text-slate-300' : 'text-slate-400'
                    }`}>
                      {item.category}
                    </span>
                    {item.shortcut && (
                      <kbd className={`px-2 py-0.5 text-[10px] font-mono rounded border ${
                        isSelected 
                          ? 'bg-white/20 border-white/30 text-white' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {item.shortcut}
                      </kbd>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigasi</span>
            <span>↵ Eksekusi</span>
            <span>Esc Tutup</span>
          </div>
          <span className="text-slate-700 font-medium hidden sm:inline">Lab Komputasi AI · TI UMPO</span>
        </div>
      </div>
    </div>
  );
}
