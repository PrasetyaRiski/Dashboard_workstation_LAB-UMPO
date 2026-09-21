import React from 'react';
import {
  RefreshCw,
  LayoutDashboard,
  Users,
  Server,
  FileText,
  Cpu,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  onTabChange,
  isConnected,
  timeStr,
  onManualRefresh,
  isRefreshing,
  theme = 'dark',
  onToggleTheme,
  auditCount = 0,
  processCount = 0,
  isOpen = true,
  onToggle
}) {
  const tabs = [
    { id: 'overview',  label: 'Ringkasan',       icon: LayoutDashboard },
    { id: 'jobs',      label: 'Manajemen Job',   icon: Cpu,      badge: processCount, badgePulse: processCount > 0 },
    { id: 'students',  label: 'User',            icon: Users },
    { id: 'system',    label: 'Infrastruktur',   icon: Server },
    { id: 'audit',     label: 'Audit Log',       icon: FileText, badge: auditCount },
  ];

  return (
    <>
      {/* Collapse/Expand toggle — fixed, centered on sidebar edge */}
      <button
        onClick={onToggle}
        className={`icon-btn fixed z-50 ${!isOpen ? 'sidebar-toggle-glow' : ''}`}
        style={{
          top: '50%',
          left: isOpen ? 'calc(var(--sidebar-width) - 14px)' : '10px',
          transform: 'translateY(-50%)',
          width: 28,
          height: 28,
          borderRadius: '50%',
          boxShadow: 'var(--shadow-lg)',
          transition: 'left var(--transition-slow), box-shadow 0.3s ease',
        }}
        title={isOpen ? 'Sembunyikan Sidebar' : 'Tampilkan Sidebar'}
      >
        {isOpen
          ? <PanelLeftClose className="w-3.5 h-3.5" />
          : <PanelLeftOpen className="w-3.5 h-3.5" />
        }
      </button>

    <aside
      className={`sidebar fixed inset-y-0 left-0 flex flex-col z-40 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      style={{ transition: 'transform var(--transition-slow)' }}
    >

      {/* ── Brand ── */}
      <div
        className="flex items-center gap-3 px-5 shrink-0"
        style={{ height: 64, borderBottom: '1px solid var(--border-sub)' }}
      >
        <div
          className="flex items-center justify-center shrink-0 overflow-hidden"
          style={{ width: 36, height: 36 }}
        >
          <img src="/ti-umpo-logo.png" alt="TI UMPO" className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-bold tracking-tight truncate"
            style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            Lab Komputasi AI
          </div>
          <div
            className="truncate"
            style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: -1 }}
          >
            TI UMPO
          </div>
        </div>
      </div>

      {/* ── Section label ── */}
      <div className="px-5 pt-5 pb-2">
        <span className="section-label" style={{ fontSize: '0.5625rem' }}>Menu</span>
      </div>

      {/* ── Tab navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 flex flex-col gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="nav-icon" />
              <span className="flex-1 text-left truncate">{tab.label}</span>
              {tab.badge > 0 && (
                <span className={`sidebar-nav-badge ${tab.badgePulse ? 'pulse' : ''}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Bottom controls ── */}
      <div
        className="p-3 flex flex-col gap-2.5 shrink-0"
        style={{ borderTop: '1px solid var(--border-sub)' }}
      >
        {/* Live status row */}
        <div
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-sub)',
          }}
        >
          <span className="relative flex shrink-0" style={{ width: 8, height: 8 }}>
            {isConnected ? (
              <>
                <span
                  className="absolute inset-0 rounded-full radar-ping"
                  style={{ background: 'var(--accent-emerald)' }}
                />
                <span className="relative rounded-full status-dot status-dot-active" />
              </>
            ) : (
              <span
                className="rounded-full"
                style={{ width: 8, height: 8, background: 'var(--accent-rose)' }}
              />
            )}
          </span>
          <span style={{ fontSize: '0.75rem', color: isConnected ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontWeight: 600 }}>
            {isConnected ? 'Live' : 'Offline'}
          </span>
          <span className="flex-1" />
          <span
            className="metric-value"
            style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}
          >
            {timeStr || '--:--:--'}
          </span>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="icon-btn flex-1"
            style={{ width: 'auto', height: 34 }}
            title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          >
            {theme === 'dark'
              ? <Sun className="w-4 h-4" style={{ color: 'var(--accent-amber)' }} />
              : <Moon className="w-4 h-4" style={{ color: 'var(--accent-indigo)' }} />
            }
          </button>

          <button
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className="icon-btn flex-1 disabled:opacity-40"
            style={{ width: 'auto', height: 34 }}
            title="Muat Ulang Data"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              style={isRefreshing ? { color: 'var(--accent-indigo)' } : {}}
            />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
