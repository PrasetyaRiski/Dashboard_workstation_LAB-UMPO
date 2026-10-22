import React from 'react';
import {
  FolderOpen,
  Lock,
  RefreshCw,
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
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
  isAdmin,
  onOpenLogin
}) {
  const tabs = [
    { id: 'overview', label: 'Ringkasan Sistem',     icon: LayoutDashboard, shortcut: '1', requiresAdmin: false },
    { id: 'students', label: 'Manajemen Pengguna',  icon: Users,           shortcut: '2', requiresAdmin: false },
    { id: 'files',    label: 'File Explorer',       icon: FolderOpen,      shortcut: '4', requiresAdmin: true },
    { id: 'audit',    label: 'Log Audit',           icon: FileText,        shortcut: '3', badgeCount: auditCount, requiresAdmin: true },
    { id: 'docs',     label: 'Buku Panduan',        icon: BookOpen,        shortcut: '5', requiresAdmin: false },
  ];

  return (
    <>
      {/* Collapse/Expand Toggle — Enterprise Stitch Minimalist */}
      <div
        className="fixed z-50 transition-all duration-200"
        style={{
          top: '50%',
          left: isOpen ? 'calc(16rem - 13px)' : '10px',
          transform: 'translateY(-50%)',
        }}
      >
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-600 hover:text-blue-600 hover:border-slate-400 hover:bg-slate-50 shadow-xs transition-colors"
          title={isOpen ? 'Sembunyikan Navigasi' : 'Tampilkan Navigasi'}
          type="button"
          aria-label={isOpen ? 'Sembunyikan Navigasi' : 'Tampilkan Navigasi'}
        >
          {isOpen
            ? <PanelLeftClose className="w-3.5 h-3.5" />
            : <PanelLeftOpen className="w-3.5 h-3.5" />
          }
        </button>
      </div>

      {/* GCP Console Navigation Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white z-40 flex flex-col justify-between border-r border-slate-200 shadow-xs transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header Brand */}
          <div className="h-14 px-4 flex items-center gap-3 bg-white border-b border-slate-200 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 p-1">
              <img src="/ti-umpo-logo.png" alt="TI UMPO" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 tracking-tight truncate leading-tight">
                Lab Komputasi AI
              </span>
              <span className="font-mono text-[10px] text-slate-500 font-medium truncate leading-tight">
                Teknik Informatika UMPO
              </span>
            </div>
          </div>

          {/* Navigation Section */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-1">
            <div className="px-3 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
              Konsol Manajemen
            </div>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isLocked = tab.requiresAdmin && !isAdmin;
              
              const handleClick = () => {
                if (isLocked) {
                  onOpenLogin();
                } else {
                  onTabChange(tab.id);
                }
              };
              
              return (
                <button
                  key={tab.id}
                  onClick={handleClick}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50/80 text-blue-700 font-semibold border-l-3 border-[#1a73e8]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-3 border-transparent'
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1a73e8]' : 'text-slate-400'}`} />
                    <span className="truncate">{tab.label}</span>
                    {isLocked && <Lock className="w-3.5 h-3.5 ml-1 text-slate-400 shrink-0" />}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                        {tab.badgeCount}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded border border-slate-200/60">
                      {tab.shortcut}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Cluster Telemetry Status & Clock */}
        <div className="shrink-0 p-3 border-t border-slate-200 bg-slate-50/70 flex flex-col gap-2">
          <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-xs font-mono text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isConnected ? 'bg-emerald-500 pulse-dot' : 'bg-rose-500'
                }`}
              />
              <span className={`text-[10px] font-semibold tracking-wide ${isConnected ? 'text-emerald-700' : 'text-rose-600'}`}>
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-500 text-[11px]">
              <span className="tabular-nums font-medium text-slate-700">{timeStr || '--:--:--'}</span>
              <button
                onClick={onManualRefresh}
                disabled={isRefreshing}
                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
                title="Refresh Telemetry (Shortcut: R)"
                type="button"
                aria-label="Refresh Telemetry"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
