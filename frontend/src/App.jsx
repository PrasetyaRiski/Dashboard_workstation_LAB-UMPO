import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import GpuCard from './components/GpuCard';
import SystemOverview from './components/SystemOverview';
import LiveChart from './components/LiveChart';
import AuditLogView from './components/AuditLogView';
import KillConfirmModal from './components/KillConfirmModal';
import UnifiedUserManagement from './components/UnifiedUserManagement';
import AdminPinModal from './components/AdminPinModal';
import CommandPalette from './components/CommandPalette';
import ErrorBoundary from './components/ErrorBoundary';

import {
  WifiOff, RefreshCw, Layers, ShieldCheck,
  CheckCircle2, AlertCircle, Info, Menu, LogOut,
  Search, ShieldAlert
} from 'lucide-react';

export default function App() {
  const [data, setData]               = useState(null);
  const [adminToken, setAdminToken]   = useState(() => localStorage.getItem('adminToken') || '');
  const [adminRole, setAdminRole]     = useState(() => localStorage.getItem('adminRole') || '');
  const [adminUser, setAdminUser]     = useState(() => {
    try {
      const stored = localStorage.getItem('adminUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const isAdmin = Boolean(adminToken && (adminRole === 'admin' || adminRole === 'aslab'));
  const isSuperAdmin = Boolean(adminToken && adminRole === 'admin');
  const isOperator = Boolean(adminToken && adminRole === 'aslab');

  const [loginModalOpen, setLoginModalOpen]       = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [students, setStudents]                   = useState([]);
  const [isConnected, setIsConnected]             = useState(false);
  const [isRefreshing, setIsRefreshing]           = useState(false);
  const [toast, setToast]                         = useState(null);
  const [activeTab, setActiveTab]                 = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen]         = useState(true);

  // Stale Telemetry Detection (> 15 seconds)
  const [lastDataTimestamp, setLastDataTimestamp] = useState(Date.now());
  const [staleSeconds, setStaleSeconds]           = useState(0);

  // Database Backup States
  const [backups, setBackups]                     = useState([]);
  const [isBackingUp, setIsBackingUp]             = useState(false);

  // Kill Modal
  const [killModal, setKillModal] = useState({
    isOpen: false,
    processInfo: null,
    isSubmitting: false
  });

  const wsRef = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleLoginSuccess = (token, role = 'admin', user = null) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminRole', role);
    if (user) {
      localStorage.setItem('adminUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('adminUser');
    }
    setAdminToken(token);
    setAdminRole(role);
    setAdminUser(user);
    const roleTitle = role === 'admin' ? 'Super Admin' : 'Asisten Lab (Operator)';
    const nameStr = user?.nama ? ` (${user.nama})` : '';
    showToast(`Login berhasil sebagai ${roleTitle}${nameStr}`, 'success');
  };

  const handleLogout = async () => {
    if (adminToken) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
      } catch (e) {
        console.error('Logout error:', e);
      }
    }
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminUser');
    setAdminToken('');
    setAdminRole('');
    setAdminUser(null);
    showToast('Logout berhasil. Mode monitoring publik aktif.', 'info');
  };

  const fetchStudents = useCallback(async () => {
    try {
      const headers = adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {};
      const res = await fetch(`/api/users/students?_t=${Date.now()}`, { 
        headers,
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setStudents(json.users || []);
      }
    } catch (e) {
      console.error('Fetch students error:', e);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchStudents();
    const interval = setInterval(fetchStudents, 5000);
    return () => clearInterval(interval);
  }, [fetchStudents]);

  const fetchStatus = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/status?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastDataTimestamp(Date.now());
      }
    } catch (e) {
      console.error('Fetch status error:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Fetch Backups
  const fetchBackups = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/admin/backups?_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setBackups(json.backups || []);
      }
    } catch (e) {
      console.error('Fetch backups error:', e);
    }
  }, [isAdmin, adminToken]);

  useEffect(() => {
    if (activeTab === 'overview' && isAdmin) {
      fetchBackups();
    }
  }, [activeTab, isAdmin, fetchBackups]);

  const handleTriggerBackup = async () => {
    if (!isAdmin) {
      setLoginModalOpen(true);
      return;
    }
    setIsBackingUp(true);
    showToast('Membuat snapshot backup database lab_users.db...', 'info');
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(json.message || 'Backup database SQLite WAL berhasil dibuat!', 'success');
        fetchBackups();
      } else {
        showToast(json.detail || 'Gagal membuat backup database', 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Check Stale Telemetry every second
  useEffect(() => {
    const timer = setInterval(() => {
      const diffSec = Math.floor((Date.now() - lastDataTimestamp) / 1000);
      setStaleSeconds(diffSec);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastDataTimestamp]);

  // WebSocket Telemetry Stream
  useEffect(() => {
    let ws;
    let timer;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setIsConnected(true);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setData(payload);
          setLastDataTimestamp(Date.now());
        } catch (err) {
          console.error('Error parsing WS data:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        timer = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      if (timer) clearTimeout(timer);
      if (ws) ws.close();
    };
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Global Keyboard Shortcuts (Section 6.G)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

      // Ctrl + K or Cmd + K: Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
        return;
      }

      // Single-key shortcuts only active when NOT typing in input
      if (!isInputFocused) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveTab('overview');
        } else if (e.key === '2') {
          e.preventDefault();
          setActiveTab('students');
        } else if (e.key === '3') {
          e.preventDefault();
          setActiveTab('audit');
        } else if (e.key === '?') {
          e.preventDefault();
          setCommandPaletteOpen(true);
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          fetchStatus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchStatus]);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    ...(adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {})
  });

  const handleOpenKillModal = (proc) => {
    if (staleSeconds > 15) {
      showToast('Aksi dinonaktifkan: Data telemetri basi (>15 detik). Sambungkan ulang server.', 'error');
      return;
    }
    setKillModal({ isOpen: true, processInfo: proc, isSubmitting: false });
  };

  const handleConfirmKill = async () => {
    if (!killModal.processInfo) return;
    setKillModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      const res = await fetch('/api/kill-process', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ pid: killModal.processInfo.pid }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast(
          `Proses ${killModal.processInfo.procName} (PID ${killModal.processInfo.pid}) berhasil dihentikan.`,
          'success'
        );
        setKillModal({ isOpen: false, processInfo: null, isSubmitting: false });
        fetchStatus();
      } else {
        showToast(result.detail || 'Gagal menghentikan proses.', 'error');
        setKillModal((prev) => ({ ...prev, isSubmitting: false }));
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
      setKillModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleResetPassword = async (username, newPassword) => {
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ username, new_password: newPassword }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        fetchStatus();
        return { success: true, message: `Password user ${username} berhasil diperbarui.` };
      } else {
        return { success: false, message: result.detail || 'Gagal mereset password' };
      }
    } catch (err) {
      return { success: false, message: 'Error: ' + err.message };
    }
  };

  const handleKillAllUser = async (username) => {
    if (staleSeconds > 15) {
      showToast('Aksi dinonaktifkan: Data telemetri basi (>15 detik).', 'error');
      return;
    }
    const userProcs = (data?.all_processes || []).filter((p) => p.username === username);
    const confirmMsg = userProcs.length > 0
      ? `Hentikan seluruh (${userProcs.length}) proses komputasi dan sesi milik ${username}?`
      : `User ${username} sedang online. Hentikan seluruh sesi aktif dan proses milik ${username}?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/kill-user-all', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ username }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast(result.message || `Seluruh sesi dan proses milik ${username} berhasil dihentikan.`, 'success');
        fetchStatus();
      } else {
        showToast(result.detail || result.message || 'Gagal menghentikan user', 'error');
      }
    } catch (err) {
      showToast('Gagal menghubungi server: ' + err.message, 'error');
    }
  };

  // Collect all running processes across GPUs for command palette search
  const allGpuProcesses = (data?.gpus || []).flatMap(g => 
    (g.processes || []).map(p => ({ ...p, gpu_index: g.index }))
  );

  const isDataStale = staleSeconds > 15;

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#0f172a] font-sans antialiased selection:bg-blue-100 selection:text-blue-700">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isConnected={isConnected && !isDataStale}
        timeStr={data?.time_str}
        onManualRefresh={fetchStatus}
        isRefreshing={isRefreshing}
        auditCount={data?.audit_logs?.length || 0}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Canvas Area */}
      <div
        className="flex flex-col min-h-screen transition-all duration-200"
        style={{ paddingLeft: isSidebarOpen ? '16rem' : '0' }}
      >
        {/* Sticky Header with 3D Depth */}
        <header
          className="fixed top-0 right-0 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] z-40 flex items-center justify-between px-5 transition-all duration-200"
          style={{ left: isSidebarOpen ? '16rem' : '0' }}
        >
          {/* Left Brand & Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Toggle Sidebar"
              type="button"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 tracking-tight">
                Lab Komputasi AI UMPO
              </span>
              <span className="text-slate-400 text-xs">/</span>
              <span className="text-xs font-medium text-blue-600 capitalize">
                {activeTab === 'overview' ? 'Ringkasan' : activeTab === 'students' ? 'Pengguna' : 'Log Audit'}
              </span>
            </div>
          </div>

          {/* Right Mode Pill, Clock, and Auth Action */}
          <div className="flex items-center gap-2.5">
            {/* Status Telemetri Pill */}
            {isDataStale ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Data Basi · {staleSeconds}s</span>
              </div>
            ) : isConnected ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-700 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
                <span className="font-semibold">Live</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-mono shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Menyambung ulang…</span>
              </div>
            )}

            {/* Role Badge */}
            {isOperator ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-mono shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Operator: {adminUser?.nama ? adminUser.nama.split(' ')[0] : 'Aslab'}</span>
              </div>
            ) : isSuperAdmin ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-mono shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Super Admin</span>
              </div>
            ) : null}

            {/* Login / Logout Action */}
            {!isAdmin ? (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-semibold shadow-[0_2px_0_#1d4ed8,0_4px_10px_rgba(37,99,235,0.25)] active:translate-y-0.5 transition-all"
                title="Login Operator / Admin"
                type="button"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Login Admin</span>
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 shadow-sm active:translate-y-0.5 transition-all"
                title="Keluar dari Konsol"
                type="button"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </header>

        {/* Persistent Warning Banner (Manifesto Section 7.C) */}
        {!isConnected && (
          <div className="pt-16 px-6">
            <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-lg bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.25)] text-[#fb7185] text-xs font-mono">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>Koneksi telemetri WebSocket terputus — mencoba menghubungkan kembali secara otomatis…</span>
              </div>
              <button
                onClick={fetchStatus}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[rgba(244,63,94,0.2)] hover:bg-[rgba(244,63,94,0.3)] font-semibold transition-colors"
                type="button"
              >
                <RefreshCw className="w-3 h-3" />
                Coba Ulang
              </button>
            </div>
          </div>
        )}

        {/* Main Content View Container */}
        <main className="flex-1 pt-18 px-5 lg:px-7 pb-12 w-full max-w-[1600px] mx-auto">
          {activeTab === 'overview' && (
            <ErrorBoundary title="Kendala Modul Ringkasan Sistem">
              <div className="flex flex-col gap-6">
                <SystemOverview
                  system={data?.system}
                  gpus={data?.gpus}
                  onTriggerBackup={handleTriggerBackup}
                  isBackingUp={isBackingUp}
                  backups={backups}
                  isAdmin={isAdmin && !isDataStale}
                />
                <LiveChart history={data?.history} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <GpuCard
                    gpu={data?.gpus?.[0]}
                    isAdmin={isAdmin && !isDataStale}
                    onOpenKillModal={handleOpenKillModal}
                  />
                  <GpuCard
                    gpu={data?.gpus?.[1]}
                    isAdmin={isAdmin && !isDataStale}
                    onOpenKillModal={handleOpenKillModal}
                  />
                </div>
              </div>
            </ErrorBoundary>
          )}

          {activeTab === 'students' && (
            <ErrorBoundary title="Kendala Modul Manajemen Pengguna">
              <UnifiedUserManagement
                isAdmin={isAdmin && !isDataStale}
                adminRole={adminRole}
                adminUser={adminUser}
                students={students}
                systemUsers={data?.users || []}
                gpus={data?.gpus || []}
                onOpenKillModal={handleOpenKillModal}
                onResetPassword={handleResetPassword}
                onKillAllUser={handleKillAllUser}
                fetchStudents={fetchStudents}
                showToast={showToast}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'audit' && (
            <ErrorBoundary title="Kendala Modul Log Audit">
              <AuditLogView logs={data?.audit_logs || []} />
            </ErrorBoundary>
          )}
        </main>
      </div>

      {/* Floating Toast Notification (Manifesto Section 7.C) */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.1),0_2px_6px_rgba(37,99,235,0.08)] text-xs font-mono text-slate-800">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span className="font-semibold">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-slate-700 transition-colors"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAdmin={isAdmin}
        onOpenLogin={() => setLoginModalOpen(true)}
        onLogout={handleLogout}
        onTriggerBackup={handleTriggerBackup}
        onRefreshTelemetry={fetchStatus}
        processes={allGpuProcesses}
      />

      {/* Modals */}
      <AdminPinModal
        isOpen={loginModalOpen}
        onSuccess={handleLoginSuccess}
        onClose={() => setLoginModalOpen(false)}
      />
      <KillConfirmModal
        isOpen={killModal.isOpen}
        processInfo={killModal.processInfo}
        onConfirm={handleConfirmKill}
        onClose={() => setKillModal({ isOpen: false, processInfo: null, isSubmitting: false })}
        isSubmitting={killModal.isSubmitting}
      />
    </div>
  );
}
