import React from 'react';
import {
  FolderOpen,
  Lock,
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
  onToggle,
  isAdmin,
  onOpenLogin
}) {
  const tabs = [
    { id: 'overview', label: 'Ringkasan Sistem',     icon: LayoutDashboard, shortcut: '1', requiresAdmin: false },
    { id: 'students', label: 'Manajemen Pengguna',  icon: Users,           shortcut: '2', requiresAdmin: false },
    { id: 'files',    label: 'File Explorer',       icon: FolderOpen,      shortcut: '4', requiresAdmin: true },
    { id: 'audit',    label: 'Log Audit',           icon: FileText,        shortcut: '3', badgeCount: auditCount, requiresAdmin: true },
  ];

  return (
    <>
      {/* Collapse/Expand Toggle — Warm Minimalist with 44px touch target */}
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
          className="flex items-center justify-center w-7 h-7 sm:w-6 sm:h-6 rounded-md bg-[#FAF6EF] border border-[#E4D8C3] text-[#3B2E26] hover:text-[#6F4E37] hover:border-[#6F4E37] hover:bg-[#F3EBDD] shadow-xs transition-colors"
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

      {/* Warm Cream Navigation Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-[#F3EBDD] z-40 flex flex-col justify-between border-r border-[#E4D8C3] shadow-warm-sm transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header Brand */}
          <div className="h-16 px-4 flex items-center gap-3 bg-[#FAF6EF] border-b border-[#E4D8C3] shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#F3EBDD] border border-[#E4D8C3] flex items-center justify-center shrink-0 p-1 shadow-xs">
              <img src="/ti-umpo-logo.png" alt="TI UMPO" className="w-full h-full object-contain max-w-full" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-serif text-sm font-bold text-[#2E2018] tracking-tight truncate leading-tight">
                Lab Komputasi AI
              </span>
              <span className="font-sans text-[11px] text-[#7A6A5C] font-medium truncate leading-tight mt-0.5">
                Teknik Informatika UMPO
              </span>
            </div>
          </div>

          {/* Navigation Section */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-1.5">
            <div className="px-3 pb-1 text-[11px] font-sans font-semibold uppercase tracking-wider text-[#7A6A5C]">
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
                  className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[#6F4E37] text-[#FAF6EF] font-semibold shadow-xs'
                      : 'text-[#3B2E26] hover:bg-[#EFE6D8] hover:text-[#2E2018]'
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FAF6EF]' : 'text-[#6F4E37]'}`} />
                    <span className="truncate">{tab.label}</span>
                    {isLocked && <Lock className="w-3.5 h-3.5 ml-1 text-[#7A6A5C] shrink-0" />}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                        isActive 
                          ? 'bg-[#FAF6EF] text-[#6F4E37]' 
                          : 'bg-[#C8794A] text-white'
                      }`}>
                        {tab.badgeCount}
                      </span>
                    )}
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      isActive 
                        ? 'border-[#FAF6EF]/30 text-[#FAF6EF]/80 bg-[#FAF6EF]/10' 
                        : 'border-[#E4D8C3] text-[#7A6A5C] bg-[#FAF6EF]'
                    }`}>
                      {tab.shortcut}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Cluster Telemetry Status & Clock */}
        <div className="shrink-0 p-3 border-t border-[#E4D8C3] bg-[#EFE6D8]/60 flex flex-col gap-2">
          <div className="flex items-center justify-between px-3 py-2 bg-[#FAF6EF] rounded-xl border border-[#E4D8C3] shadow-xs font-mono text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isConnected ? 'bg-[#2E7D32] pulse-dot' : 'bg-[#C53030]'
                }`}
              />
              <span className={`text-[10px] font-bold tracking-wide ${isConnected ? 'text-[#2E7D32]' : 'text-[#C53030]'}`}>
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[#7A6A5C] text-[11px]">
              <span className="tabular-nums font-semibold text-[#2E2018]">{timeStr || '--:--:--'}</span>
              <button
                onClick={onManualRefresh}
                disabled={isRefreshing}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#7A6A5C] hover:text-[#6F4E37] hover:bg-[#EFE6D8] transition-colors disabled:opacity-40"
                title="Refresh Telemetry (Shortcut: R)"
                type="button"
                aria-label="Refresh Telemetry"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#6F4E37]' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
