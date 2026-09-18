import React from 'react';
import {
  GraduationCap,
  RefreshCw,
  LayoutDashboard,
  Users,
  Server,
  FileText,
  Shield,
  ShieldCheck,
  Download,
  Lock,
  LogOut,
  Cpu
} from 'lucide-react';

export default function Navbar({
  activeTab,
  onTabChange,
  isConnected,
  timeStr,
  onManualRefresh,
  isRefreshing,
  isAdmin,
  onOpenPinModal,
  onLogoutAdmin,
  onExportSnapshot,
  auditCount = 0,
  processCount = 0
}) {
  return (
    <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Brand & Mode Status */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white">
                  Lab Komputasi AI
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  TI UMPO
                </span>
              </div>

            </div>
          </div>

          {/* Mode Indicator Badge */}
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold font-sans animate-in fade-in">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Mode Admin (Aktif)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-medium font-sans">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Mode Tamu (Read-Only)</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Tabs Navigation */}
        <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 w-full md:w-auto overflow-x-auto">
          {[
            { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
            { id: 'jobs', label: 'Manajemen Job', icon: Cpu, badge: processCount, badgeColor: processCount > 0 ? 'bg-rose-500 text-white animate-pulse' : null },
            { id: 'students', label: 'Praktikan & Kuota', icon: Users },
            { id: 'system', label: 'Infrastruktur', icon: Server },
            { id: 'audit', label: 'Audit Log', icon: FileText, badge: auditCount }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex-1 md:flex-initial justify-center ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    tab.badgeColor || (isActive ? 'bg-indigo-800 text-indigo-200' : 'bg-slate-800 text-slate-300')
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Actions, Admin Mode & Live Status */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Export Button */}
          <button
            onClick={onExportSnapshot}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white border border-slate-700/70 text-xs font-medium hidden sm:flex items-center gap-1.5 transition cursor-pointer"
            title="Ekspor Snapshot Telemetri JSON"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ekspor</span>
          </button>

          {/* Admin Lock / Unlock Button */}
          {isAdmin ? (
            <button
              onClick={onLogoutAdmin}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-500/30 hover:bg-rose-900/60 flex items-center gap-1.5 transition cursor-pointer shadow-md"
              title="Kunci kembali dashboard ke mode Read-Only"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Kunci Admin</span>
            </button>
          ) : (
            <button
              onClick={onOpenPinModal}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 flex items-center gap-1.5 transition cursor-pointer shadow-md"
              title="Masukkan PIN Admin untuk membuka fitur Kill & Reset Password"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Masuk Admin</span>
            </button>
          )}

          {/* Live Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <span className="relative flex h-2 w-2">
              {isConnected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              )}
            </span>
            <span className="text-slate-300 text-[11px]">{timeStr || "--:--:--"}</span>
          </div>

          <button
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-50 cursor-pointer"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
