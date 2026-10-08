import React from 'react';
import {
  RefreshCw,
  LayoutDashboard,
  Users,
  Server,
  FileText,
  Cpu,
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
  auditCount = 0,
  isOpen = true,
  onToggle,
  gpus = []
}) {
  const tabs = [
    { id: 'overview',  label: 'Ringkasan',       icon: LayoutDashboard, badgeText: 'SYS' },
    { id: 'students',  label: 'User',            icon: Users,            badgeText: 'RBAC' },
        { id: 'audit',     label: 'Audit Log',       icon: FileText,         badgeCount: auditCount },
  ];

  // Calculate VRAM Quota
  const gpu0 = gpus[0];
  const gpu1 = gpus[1];
  const totalVramUsedMb = (gpu0?.vram_used_mb || 0) + (gpu1?.vram_used_mb || 0);
  const totalVramMaxMb = (gpu0?.vram_total_mb || 16384) + (gpu1?.vram_total_mb || 16384);
  const vramUsedGb = (totalVramUsedMb / 1024).toFixed(1);
  const vramTotalGb = (totalVramMaxMb / 1024).toFixed(0);
  const vramPct = totalVramMaxMb > 0 ? Math.min(100, Math.round((totalVramUsedMb / totalVramMaxMb) * 100)) : 0;

  return (
    <>
      {/* Collapse/Expand toggle — fixed, centered on sidebar edge */}
      <button
        onClick={onToggle}
        className={`fixed z-50 flex items-center justify-center w-7 h-7 rounded-md bg-surface-2 border border-border-base text-text-muted hover:text-text-primary hover:border-secondary shadow-sm transition-all duration-300 ${
          !isOpen ? 'shadow-[0_0_12px_rgba(76,215,246,0.3)] text-neon-cyan' : ''
        }`}
        style={{
          top: '50%',
          left: isOpen ? 'calc(16rem - 14px)' : '10px',
          transform: 'translateY(-50%)',
        }}
        title={isOpen ? 'Sembunyikan Sidebar' : 'Tampilkan Sidebar'}
        type="button"
      >
        {isOpen
          ? <PanelLeftClose className="w-3.5 h-3.5" />
          : <PanelLeftOpen className="w-3.5 h-3.5" />
        }
      </button>

      {/* Fixed Sidebar — Stitch Console Aesthetic */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-surface-1 z-40 flex flex-col justify-between border-r border-border-subtle shadow-sm transition-colors duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header Brand */}
          <div className="h-16 px-4 flex items-center gap-3 bg-surface-1  border-b border-border-subtle shrink-0">
            <div className="w-9 h-9 rounded-lg bg-surface-2 border border-border-base flex items-center justify-center shrink-0 p-1 overflow-hidden shadow-sm">
              <img src="/ti-umpo-logo.png" alt="Logo Teknik Informatika" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline-md text-sm text-on-surface font-bold truncate leading-tight">
                Lab Komputasi
              </span>
              <span className="font-mono-code-xs text-sm text-primary-fixed-dim truncate leading-tight">
                Teknik Informatika
              </span>
            </div>
          </div>

          {/* Section Label */}
          <div className="px-5 pt-4 pb-2 shrink-0">
            <div className="font-mono-code-xs text-mono-code-xs text-text-muted   px-1">
              Navigasi Telemetri
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-3 flex flex-col gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-left transition-all text-xs ${
                    isActive
                      ? 'bg-surface-3 text-primary-fixed font-bold  border-l-2 border-neon-cyan'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-neon-cyan' : 'text-text-muted'}`} />
                    <span className="font-label-lg text-label-lg tracking-tight">{tab.label}</span>
                  </div>
                  {tab.badgeText && (
                    <span className="font-mono-code-xs text-mono-code-xs text-outline px-1.5 py-0.5 rounded bg-surface-2/60">
                      {tab.badgeText}
                    </span>
                  )}
                  {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-md font-mono-code-xs text-mono-code-xs ${
                        tab.badgeHighlight
                          ? 'bg-surface-container-high text-neon-cyan'
                          : 'bg-surface-container-high text-text-muted'
                      }`}
                    >
                      {tab.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: VRAM Quota Widget & Live Status */}
        <div className="shrink-0 p-3 flex flex-col gap-2.5 border-t border-border-subtle bg-surface-dim/40">
          {/* VRAM Quota Meter */}
          <div className="p-3 bg-surface-container-lowest/80 rounded-lg border border-border-subtle flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono-code-xs text-mono-code-xs text-text-muted">VRAM QUOTA</span>
              <span
                className={`font-mono-code-xs text-mono-code-xs font-semibold ${
                  vramPct >= 85 ? 'text-neon-rose' : vramPct >= 65 ? 'text-neon-amber' : 'text-neon-emerald'
                }`}
              >
                {vramPct}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-variant rounded-md overflow-hidden">
              <div
                className={`h-full rounded-md transition-all duration-500 ${
                  vramPct >= 85
                    ? 'bg-neon-rose shadow-[0_0_8px_rgba(255,180,171,0.8)]'
                    : '  '
                }`}
                style={{ width: `${vramPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between pt-0.5 text-mono-code-xs font-mono-code-xs text-outline">
              <span className="truncate">node-dgx-umpo01</span>
              <span>{vramUsedGb}/{vramTotalGb} GB</span>
            </div>
          </div>

          {/* Quick Telemetry & Refresh Row */}
          <div className="flex items-center justify-between px-2 py-1 bg-surface-2 rounded-lg border border-border-subtle font-mono text-sm">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {isConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-md bg-neon-emerald opacity-75"></span>
                    <span className="relative inline-flex rounded-md h-2 w-2 bg-neon-emerald"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-md h-2 w-2 bg-neon-rose"></span>
                )}
              </span>
              <span className={isConnected ? 'text-neon-emerald font-semibold' : 'text-neon-rose font-semibold'}>
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-text-muted">
              <span>{timeStr || '--:--:--'}</span>
              <button
                onClick={onManualRefresh}
                disabled={isRefreshing}
                className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors disabled:opacity-40"
                title="Muat Ulang Telemetri"
                type="button"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-neon-cyan' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
