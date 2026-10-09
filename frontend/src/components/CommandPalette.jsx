import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  Users,
  FileText,
  ShieldCheck,
  LogOut,
  RefreshCw,
  DatabaseBackup,
  Layers,
  Terminal,
  X,
  Keyboard
} from 'lucide-react';

export default function CommandPalette({
  isOpen,
  onClose,
  activeTab,
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

  // Command items definitions
  const baseCommands = [
    {
      id: 'tab-overview',
      category: 'Navigasi',
      label: 'Buka Ringkasan Sistem (Overview)',
      shortcut: '1',
      icon: LayoutDashboard,
      action: () => { onTabChange('overview'); onClose(); }
    },
    {
      id: 'tab-users',
      category: 'Navigasi',
      label: 'Buka Manajemen Pengguna (Users)',
      shortcut: '2',
      icon: Users,
      action: () => { onTabChange('users'); onClose(); }
    },
    {
      id: 'tab-audit',
      category: 'Navigasi',
      label: 'Buka Log Audit (Audit Trail)',
      shortcut: '3',
      icon: FileText,
      action: () => { onTabChange('audit'); onClose(); }
    },
    {
      id: 'action-refresh',
      category: 'Aksi Sistem',
      label: 'Muat Ulang Telemetri (Refresh)',
      shortcut: 'R',
      icon: RefreshCw,
      action: () => { onRefreshTelemetry?.(); onClose(); }
    },
    {
      id: 'action-backup',
      category: 'Aksi Sistem',
      label: 'Snapshot Backup Database SQLite',
      shortcut: 'B',
      icon: DatabaseBackup,
      action: () => { onTriggerBackup?.(); onClose(); }
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/75">
      <div 
        className="w-full max-w-xl bg-[#111114] border border-[rgba(255,255,255,0.14)] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.45)] overflow-hidden flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[rgba(255,255,255,0.08)] bg-[#18181b]">
          <Search className="w-4 h-4 text-[#a1a1aa] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Cari perintah, navigasi tab, atau PID proses… (↑ ↓ Enter)"
            className="flex-1 bg-transparent text-sm text-[#fafafa] placeholder:text-[#71717a] outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-[11px] font-mono bg-[#27272a] text-[#a1a1aa] rounded border border-[rgba(255,255,255,0.08)]">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[rgba(255,255,255,0.04)]">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#71717a]">
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
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs transition-colors ${
                    isSelected 
                      ? 'bg-[#27272a] text-[#fafafa]' 
                      : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#fafafa]'
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#38bdf8]' : 'text-[#71717a]'}`} />
                    <span className="truncate font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] text-[#71717a] uppercase tracking-wider font-mono">
                      {item.category}
                    </span>
                    {item.shortcut && (
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#18181b] text-[#a1a1aa] rounded border border-[rgba(255,255,255,0.08)]">
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
        <div className="px-4 py-2 bg-[#09090b] border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between text-[11px] text-[#71717a] font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Pilih</span>
            <span>↵ Eksekusi</span>
            <span>Esc Tutup</span>
          </div>
          <span>Obsidian Console v1.0</span>
        </div>
      </div>
    </div>
  );
}
