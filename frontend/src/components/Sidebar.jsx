import React from 'react';
import {
  FolderOpen,
  RefreshCw,
  LayoutDashboard,
  Users,
  FileText,
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
  onToggle
}) {
  const tabs = [
    { id: 'overview', label: 'Ringkasan',   icon: LayoutDashboard, shortcut: '1' },
    { id: 'students', label: 'Pengguna',    icon: Users,           shortcut: '2' },
    { id: 'files',    label: 'File Explorer', icon: FolderOpen,      shortcut: '4' },
    { id: 'audit',    label: 'Log Audit',   icon: FileText,        shortcut: '3', badgeCount: auditCount },
  ];

  return (
    <>
      {/* Collapse/Expand toggle — 3D tactile button */}
      <button
        onClick={onToggle}
        className="fixed z-50 flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 shadow-[0_2px_6px_rgba(0,0,0,0.08)] active:translate-y-0.5 transition-all duration-200"
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

      {/* Azure & White 3D Navigation Rail */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white z-40 flex flex-col justify-between border-r border-slate-200/90 shadow-[4px_0_24px_rgba(37,99,235,0.03)] transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header Brand */}
          <div className="h-16 px-4 flex items-center gap-3 bg-white border-b border-slate-200/80 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center shrink-0 p-1.5 shadow-sm overflow-hidden">
              <img src="/ti-umpo-logo.png" alt="TI UMPO" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 tracking-tight truncate leading-tight">
                Lab Komputasi AI
              </span>
              <span className="font-mono text-[10px] text-blue-600 font-medium truncate leading-tight">
                Teknik Informatika UMPO
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
            <div className="px-2 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
              Navigasi Konsol
            </div>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all text-xs font-medium ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50/50 text-blue-700 font-semibold border border-blue-200/90 shadow-[0_2px_4px_rgba(37,99,235,0.06)]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="truncate">{tab.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                        {tab.badgeCount}
                      </span>
                    )}
                    <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-400 bg-slate-100 border border-slate-200">
                      {tab.shortcut}
                    </kbd>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Live Status & WIB Clock */}
        <div className="shrink-0 p-3 border-t border-slate-200/80 bg-slate-50/60 flex flex-col gap-2">
          <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-slate-200 shadow-sm font-mono text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isConnected ? 'bg-emerald-500 pulse-dot' : 'bg-rose-500'
                }`}
              />
              <span className={`text-[11px] font-bold ${isConnected ? 'text-emerald-700' : 'text-rose-600'}`}>
                {isConnected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-500 text-[11px]">
              <span className="tabular-nums font-semibold text-slate-700">{timeStr || '--:--:--'}</span>
              <button
                onClick={onManualRefresh}
                disabled={isRefreshing}
                className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40"
                title="Muat Ulang Telemetri (R)"
                type="button"
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
