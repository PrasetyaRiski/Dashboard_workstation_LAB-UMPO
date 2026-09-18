import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  LayoutDashboard,
  Cpu,
  Users,
  Server,
  FileText,
  Sun,
  Moon,
  ShieldCheck,
  Lock,
  XCircle,
  Key,
  Play,
  Square,
  X
} from 'lucide-react';

const TABS = [
  { id: 'overview',  label: 'Ringkasan',     icon: LayoutDashboard },
  { id: 'jobs',      label: 'Manajemen Job',  icon: Cpu },
  { id: 'students',  label: 'Praktikan',      icon: Users },
  { id: 'system',    label: 'Infrastruktur',  icon: Server },
  { id: 'audit',     label: 'Audit Log',      icon: FileText },
];

function highlight(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(99, 102, 241, 0.25)', color: 'var(--accent-indigo)', borderRadius: 2 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function CommandPalette({
  isOpen,
  onClose,
  onTabChange,
  onToggleTheme,
  theme,
  isAdmin,
  onOpenPinModal,
  onLogoutAdmin,
  onRunSimulation,
  onStopSimulation,
  processes = [],
}) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build all commands
  const allCommands = useMemo(() => {
    const cmds = [];

    // Navigation
    TABS.forEach((tab) => {
      cmds.push({
        group: 'Navigasi',
        id: `nav-${tab.id}`,
        label: `Buka: ${tab.label}`,
        icon: tab.icon,
        shortcut: null,
        action: () => { onTabChange(tab.id); onClose(); }
      });
    });

    // Admin actions
    if (isAdmin) {
      cmds.push({
        group: 'Admin',
        id: 'logout-admin',
        label: 'Kunci Admin — Kembali ke Mode Read-Only',
        icon: Lock,
        action: () => { onLogoutAdmin(); onClose(); }
      });
      cmds.push({
        group: 'Admin',
        id: 'run-sim',
        label: 'Jalankan Simulasi Beban (11 User)',
        icon: Play,
        action: () => { onRunSimulation(); onClose(); }
      });
      cmds.push({
        group: 'Admin',
        id: 'stop-sim',
        label: 'Hentikan & Bersihkan Semua Simulasi',
        icon: Square,
        action: () => { onStopSimulation(); onClose(); }
      });
    } else {
      cmds.push({
        group: 'Admin',
        id: 'login-admin',
        label: 'Masuk Mode Admin — Masukkan PIN',
        icon: ShieldCheck,
        action: () => { onOpenPinModal(); onClose(); }
      });
    }

    // Theme
    cmds.push({
      group: 'Preferensi',
      id: 'toggle-theme',
      label: theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap',
      icon: theme === 'dark' ? Sun : Moon,
      shortcut: null,
      action: () => { onToggleTheme(); onClose(); }
    });

    // Active processes (admin kill)
    if (isAdmin && processes.length > 0) {
      processes
        .filter(p => !p.is_system && p.is_killable)
        .slice(0, 10)
        .forEach((proc) => {
          cmds.push({
            group: 'Proses Aktif',
            id: `kill-${proc.pid}`,
            label: `Kill PID ${proc.pid} — ${proc.username} · ${proc.name}`,
            icon: XCircle,
            danger: true,
            action: () => { /* Will trigger kill modal outside */ onClose(); }
          });
        });
    }

    return cmds;
  }, [isAdmin, theme, processes]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase();
    return allCommands.filter(cmd =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.group.toLowerCase().includes(q)
    );
  }, [query, allCommands]);

  // Group by category
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(cmd => {
      if (!map[cmd.group]) map[cmd.group] = [];
      map[cmd.group].push(cmd);
    });
    return map;
  }, [filtered]);

  const flatFiltered = filtered;

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, flatFiltered.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      flatFiltered[selectedIdx]?.action?.();
    }
  }, [flatFiltered, selectedIdx, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="palette-enter w-full max-w-xl overflow-hidden"
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border-emph)',
          borderRadius: 14,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4"
          style={{ borderBottom: '1px solid var(--border-base)', height: 52 }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari perintah, navigasi, proses…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              fontFamily: "'Inter', sans-serif",
            }}
          />
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface-3)',
              border: 'none',
              borderRadius: 6,
              padding: '2px 6px',
              fontSize: '0.5625rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflowY: 'auto', padding: '6px 0' }}>
          {flatFiltered.length === 0 ? (
            <div
              className="text-center py-8 metric-value"
              style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
            >
              Tidak ada hasil untuk "{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([group, cmds]) => (
              <div key={group}>
                <div
                  className="section-label px-4 py-2"
                  style={{ fontSize: '0.5625rem' }}
                >
                  {group}
                </div>
                {cmds.map((cmd) => {
                  const Icon = cmd.icon;
                  const globalIdx = flatFiltered.indexOf(cmd);
                  const isSelected = globalIdx === selectedIdx;
                  return (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIdx(globalIdx)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 transition cursor-pointer text-left"
                      style={{
                        background: isSelected ? 'var(--surface-2)' : 'transparent',
                        border: 'none',
                        outline: 'none',
                      }}
                    >
                      <div
                        className="flex items-center justify-center rounded-md shrink-0"
                        style={{
                          width: 28,
                          height: 28,
                          background: cmd.danger
                            ? 'rgba(244, 63, 94, 0.1)'
                            : 'var(--surface-3)',
                          color: cmd.danger ? 'var(--accent-rose)' : 'var(--text-secondary)',
                          border: `1px solid ${cmd.danger ? 'rgba(244,63,94,0.2)' : 'var(--border-base)'}`,
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          color: cmd.danger ? 'var(--accent-rose)' : 'var(--text-primary)',
                          flex: 1,
                        }}
                      >
                        {highlight(cmd.label, query)}
                      </span>
                      {isSelected && (
                        <span
                          className="metric-value rounded shrink-0"
                          style={{
                            fontSize: '0.5625rem',
                            background: 'var(--surface-3)',
                            border: '1px solid var(--border-base)',
                            padding: '1px 6px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          ↵
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center gap-4 px-4 py-2.5"
          style={{ borderTop: '1px solid var(--border-sub)' }}
        >
          {[['↑↓', 'navigasi'], ['↵', 'pilih'], ['ESC', 'tutup']].map(([key, label]) => (
            <span
              key={key}
              className="metric-value flex items-center gap-1.5"
              style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}
            >
              <span
                style={{
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border-base)',
                  borderRadius: 4,
                  padding: '0 5px',
                  fontSize: '0.5625rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'var(--text-secondary)',
                }}
              >
                {key}
              </span>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
