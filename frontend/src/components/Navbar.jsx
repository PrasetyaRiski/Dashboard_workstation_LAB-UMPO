import React, { useState } from 'react';
import {
  GraduationCap,
  RefreshCw,
  LayoutDashboard,
  Users,
  Server,
  FileText,
  Shield,
  ShieldCheck,
  Lock,
  LogOut,
  Cpu,
  Sun,
  Moon,
  Search,
  Terminal
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
  theme = 'dark',
  onToggleTheme,
  auditCount = 0,
  processCount = 0,
  onOpenCommandPalette
}) {
  const tabs = [
    { id: 'overview',  label: 'Ringkasan',         icon: LayoutDashboard },
    { id: 'jobs',      label: 'Manajemen Job',       icon: Cpu,      badge: processCount, badgePulse: processCount > 0 },
    { id: 'students',  label: 'Praktikan',           icon: Users },
    { id: 'system',    label: 'Infrastruktur',       icon: Server },
    { id: 'audit',     label: 'Audit Log',           icon: FileText, badge: auditCount },
  ];

  return (
    <header
      className="sticky top-0 z-40 transition-colors duration-200"
      style={{
        background: 'var(--surface-0)',
        borderBottom: '1px solid var(--border-base)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Top bar: Brand + Right controls */}
      <div
        className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6"
        style={{ height: '52px' }}
      >
        {/* ── Brand ── */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="flex items-center justify-center rounded-lg shrink-0"
            style={{
              width: 32,
              height: 32,
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
            }}
          >
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span
                className="font-bold tracking-tight"
                style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
              >
                Lab Komputasi AI
              </span>
              <span
                className="badge badge-indigo"
                style={{ fontSize: '0.5625rem' }}
              >
                TI UMPO
              </span>
            </div>
            <div
              className="font-mono flex items-center gap-1"
              style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: 1 }}
            >
              <Terminal className="w-2.5 h-2.5" />
              <span>ai.umpo.ac.id</span>
            </div>
          </div>
        </div>

        {/* ── Right Controls ── */}
        <div className="flex items-center gap-1.5">
          {/* Command Palette trigger */}
          <button
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-base)',
              color: 'var(--text-muted)',
              fontSize: '0.6875rem',
            }}
            title="Command Palette (Ctrl+K)"
          >
            <Search className="w-3 h-3" />
            <span>Cari…</span>
            <span
              className="font-mono rounded"
              style={{
                fontSize: '0.5625rem',
                background: 'var(--surface-3)',
                border: '1px solid var(--border-base)',
                padding: '0 4px',
                color: 'var(--text-muted)',
              }}
            >
              ⌘K
            </span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="flex items-center justify-center rounded-lg transition cursor-pointer"
            style={{
              width: 32,
              height: 32,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-base)',
              color: 'var(--text-secondary)',
            }}
            title={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
          >
            {theme === 'dark'
              ? <Sun className="w-3.5 h-3.5 text-amber-400" />
              : <Moon className="w-3.5 h-3.5 text-indigo-500" />
            }
          </button>

          {/* Admin badge / toggle */}
          {isAdmin ? (
            <div className="flex items-center gap-1">
              <span
                className="badge badge-emerald hidden sm:inline-flex"
                style={{ gap: 4, fontSize: '0.6875rem' }}
              >
                <ShieldCheck className="w-3 h-3" />
                Mode Admin
              </span>
              <button
                onClick={onLogoutAdmin}
                className="flex items-center justify-center rounded-lg transition cursor-pointer"
                style={{
                  width: 32,
                  height: 32,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-base)',
                  color: 'var(--text-secondary)',
                }}
                title="Kunci kembali ke Mode Read-Only"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenPinModal}
              className="flex items-center gap-1.5 rounded-lg transition cursor-pointer"
              style={{
                padding: '0.3rem 0.6rem',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                color: '#f59e0b',
                fontSize: '0.6875rem',
                fontWeight: 600,
              }}
              title="Masukkan PIN Admin"
            >
              <Shield className="w-3 h-3" />
              <span className="hidden sm:inline">Masuk Admin</span>
            </button>
          )}

          {/* Live indicator */}
          <div
            className="flex items-center gap-2 rounded-lg"
            style={{
              padding: '0.3rem 0.6rem',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-base)',
            }}
          >
            <span className="relative flex shrink-0" style={{ width: 7, height: 7 }}>
              {isConnected ? (
                <>
                  <span
                    className="absolute inset-0 rounded-full radar-ping"
                    style={{ background: 'var(--accent-emerald)', opacity: 0 }}
                  />
                  <span
                    className="relative rounded-full status-dot status-dot-live"
                    style={{ width: 7, height: 7 }}
                  />
                </>
              ) : (
                <span
                  className="rounded-full"
                  style={{ width: 7, height: 7, background: 'var(--accent-rose)' }}
                />
              )}
            </span>
            <span
              className="metric-value"
              style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', minWidth: 52 }}
            >
              {timeStr || '--:--:--'}
            </span>
          </div>

          {/* Refresh */}
          <button
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center rounded-lg transition cursor-pointer disabled:opacity-40"
            style={{
              width: 32,
              height: 32,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-base)',
              color: 'var(--text-secondary)',
            }}
            title="Segarkan Data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              style={isRefreshing ? { color: 'var(--accent-indigo)' } : {}}
            />
          </button>
        </div>
      </div>

      {/* Tab navigation bar */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-0 overflow-x-auto"
        style={{ borderTop: '1px solid var(--border-sub)' }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`tab-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span
                  className={`metric-value rounded-full text-center inline-block ${tab.badgePulse ? 'animate-pulse' : ''}`}
                  style={{
                    fontSize: '0.5625rem',
                    fontWeight: 700,
                    padding: '0 5px',
                    minWidth: 18,
                    height: 16,
                    lineHeight: '16px',
                    background: tab.badgePulse
                      ? 'rgba(244, 63, 94, 0.15)'
                      : 'var(--surface-3)',
                    color: tab.badgePulse ? 'var(--accent-rose)' : 'var(--text-secondary)',
                    border: `1px solid ${tab.badgePulse ? 'rgba(244, 63, 94, 0.25)' : 'var(--border-base)'}`,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Guest / Admin mode chip on far right */}
        <div className="ml-auto pl-3 py-2 shrink-0">
          {isAdmin ? (
            <span className="badge badge-emerald" style={{ fontSize: '0.5625rem' }}>
              <ShieldCheck className="w-2.5 h-2.5" />
              Admin Aktif
            </span>
          ) : (
            <span className="badge badge-neutral" style={{ fontSize: '0.5625rem' }}>
              <Lock className="w-2.5 h-2.5" />
              Read-Only
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
