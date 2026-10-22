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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-[#2E2018]/60 backdrop-blur-xs font-sans">
      <div 
        className="w-full max-w-xl bg-[#F3EBDD] border border-[#E4D8C3] rounded-2xl shadow-warm-modal overflow-hidden flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E4D8C3] bg-[#FAF6EF]">
          <Search className="w-4 h-4 text-[#7A6A5C] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Cari perintah, navigasi tab, atau PID proses… (↑ ↓ Enter)"
            className="flex-1 bg-transparent text-xs text-[#2E2018] placeholder:text-[#7A6A5C] outline-none font-medium"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono bg-[#EFE6D8] text-[#3B2E26] rounded-md border border-[#E4D8C3]">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[#E4D8C3] bg-[#FAF6EF]">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#7A6A5C]">
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
                      ? 'bg-[#6F4E37] text-[#FAF6EF] font-semibold shadow-xs' 
                      : 'text-[#3B2E26] hover:bg-[#F3EBDD]'
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#FAF6EF]' : 'text-[#6F4E37]'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className={`text-[10px] uppercase tracking-wider font-mono ${
                      isSelected ? 'text-[#FAF6EF]/80' : 'text-[#7A6A5C]'
                    }`}>
                      {item.category}
                    </span>
                    {item.shortcut && (
                      <kbd className={`px-2 py-0.5 text-[10px] font-mono rounded border ${
                        isSelected 
                          ? 'bg-[#FAF6EF]/20 border-[#FAF6EF]/30 text-[#FAF6EF]' 
                          : 'bg-[#EFE6D8] text-[#3B2E26] border-[#E4D8C3]'
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
        <div className="px-4 py-2.5 bg-[#EFE6D8]/60 border-t border-[#E4D8C3] flex items-center justify-between text-[11px] text-[#7A6A5C] font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigasi</span>
            <span>↵ Eksekusi</span>
            <span>Esc Tutup</span>
          </div>
          <span className="text-[#3B2E26] font-medium hidden sm:inline">Lab Komputasi AI · TI UMPO</span>
        </div>
      </div>
    </div>
  );
}
