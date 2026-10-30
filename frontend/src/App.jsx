import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import GpuCard from './components/GpuCard';
import SystemOverview from './components/SystemOverview';
import LiveChart from './components/LiveChart';
import AuditLogView from './components/AuditLogView';
import KillConfirmModal from './components/KillConfirmModal';
import UnifiedUserManagement from './components/UnifiedUserManagement';
import AdminFileExplorer from './components/AdminFileExplorer';
import AdminPinModal from './components/AdminPinModal';
import CommandPalette from './components/CommandPalette';
import ErrorBoundary from './components/ErrorBoundary';

import {
  Menu, WifiOff, RefreshCw, ShieldCheck,
  CheckCircle2, AlertCircle, Info, LogOut,
  Search
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

  const [loginModalOpen, setLoginModalOpen]         = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [students, setStudents]                     = useState([]);
  const [isConnected, setIsConnected]               = useState(false);
  const [isRefreshing, setIsRefreshing]             = useState(false);
  const [toast, setToast]                           = useState(null);
  const [activeTab, setActiveTab]                   = useState('overview');
  const [isMobile, setIsMobile]                     = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [isSidebarOpen, setIsSidebarOpen]           = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Stale Telemetry Detection (> 15 seconds)
  const [lastDataTimestamp, setLastDataTimestamp] = useState(() => Date.now());
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
    setActiveTab('overview');
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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
        return;
      }

      if (!isInputFocused) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveTab('overview');
        } else if (e.key === '2') {
          e.preventDefault();
          setActiveTab('students');
        } else if (e.key === '4') {
          e.preventDefault();
          if (isAdmin) setActiveTab('files'); else setLoginModalOpen(true);
        } else if (e.key === '3') {
          e.preventDefault();
          if (isAdmin) setActiveTab('audit'); else setLoginModalOpen(true);
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
  }, [fetchStatus, isAdmin]);

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
    <div className="min-h-screen bg-[#FAF6EF] text-[#3B2E26] font-sans antialiased selection:bg-[#E4D8C3] selection:text-[#2E2018]">
      {/* Mobile Drawer Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-[#2E2018]/60 backdrop-blur-xs z-30 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation Drawer */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (isMobile) setIsSidebarOpen(false);
        }}
        isConnected={isConnected && !isDataStale}
        timeStr={data?.time_str}
        onManualRefresh={fetchStatus}
        isRefreshing={isRefreshing}
        auditCount={data?.audit_logs?.length || 0}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isAdmin={isAdmin}
        onOpenLogin={() => setLoginModalOpen(true)}
      />

      {/* Main Console Canvas */}
      <div
        className="flex flex-col min-h-screen transition-all duration-200"
        style={{ paddingLeft: (!isMobile && isSidebarOpen) ? '16rem' : '0' }}
      >
        {/* Enterprise Fixed Top Bar (GCP Style) */}
        <header
          className="fixed top-0 right-0 h-16 bg-[#FAF6EF]/95 backdrop-blur-md border-b border-[#E4D8C3] z-40 flex items-center justify-between px-3 sm:px-6 transition-all duration-200 shadow-warm-xs"
          style={{ left: (!isMobile && isSidebarOpen) ? '16rem' : '0' }}
        >
          {/* Breadcrumbs & Mobile Hamburger */}
          <div className="flex items-center gap-2 min-w-0">
            {isMobile && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-[#3B2E26] hover:bg-[#EFE6D8] hover:text-[#2E2018] border border-[#E4D8C3] mr-1"
                aria-label="Buka Menu Navigasi"
                type="button"
              >
                <Menu className="w-5 h-5 text-[#6F4E37]" />
              </button>
            )}
            <span className="text-xs font-semibold text-[#2E2018] font-serif font-bold tracking-tight truncate">
              <span className="hidden sm:inline">Lab Komputasi AI UMPO</span>
              <span className="sm:hidden">Lab AI UMPO</span>
            </span>
            <span className="text-[#D5C5AC] text-xs">/</span>
            <span className="text-xs font-semibold text-[#6F4E37] truncate">
              {activeTab === 'overview' ? 'Ringkasan Sistem' : activeTab === 'students' ? 'Manajemen Pengguna' : activeTab === 'files' ? 'File Explorer' : 'Log Audit'}
            </span>
          </div>

          {/* Quick Command & Actions */}
          <div className="flex items-center gap-3">
            {/* Command Palette Trigger */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs text-[#7A6A5C] bg-[#F3EBDD] hover:bg-[#EFE6D8] border border-[#E4D8C3] hover:border-[#6F4E37] rounded-xl font-mono transition-colors"
              title="Buka Command Palette (Ctrl+K)"
              type="button"
            >
              <Search className="w-3.5 h-3.5 text-[#7A6A5C]" />
              <span>Cari proses / pintasan...</span>
              <kbd className="px-1.5 py-0.2 text-[10px] bg-white border border-slate-200 rounded text-[#7A6A5C]">⌘K</kbd>
            </button>

            {/* Connection Warning */}
            {isDataStale ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FEE2E2] border border-[#FCA5A5] text-[#C53030] text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Data Stale · {staleSeconds}s</span>
              </div>
            ) : !isConnected ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FEF3C7] border border-[#FDE68A] text-[#B45309] text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Menyambung ulang…</span>
              </div>
            ) : null}

            {/* User Role Indicator */}
            {isOperator ? (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EFE6D8] text-[#2E2018] border border-[#E4D8C3] text-xs font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-[#6F4E37]" />
                <span>Operator: {adminUser?.nama ? adminUser.nama.split(' ')[0] : 'Aslab'}</span>
              </div>
            ) : isSuperAdmin ? (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EFE6D8] text-[#2E2018] border border-[#E4D8C3] text-xs font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1a73e8]" />
                <span>Super Admin</span>
              </div>
            ) : null}

            {/* Auth Button */}
            {!isAdmin ? (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6F4E37] hover:bg-[#4A3426] text-[#FAF6EF] text-xs font-semibold transition-colors shadow-xs min-h-[40px] cursor-pointer"
                title="Login Operator / Admin"
                type="button"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Login Admin</span>
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#7A6A5C] hover:text-[#C53030] hover:bg-[#FEE2E2] border border-[#E4D8C3] transition-colors cursor-pointer"
                title="Keluar dari Konsol"
                type="button"
                aria-label="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </header>

        {/* Telemetry Disconnected Banner */}
        {!isConnected && (
          <div className="pt-16 px-6">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-[#FEE2E2] border border-[#FCA5A5] text-[#C53030] text-xs font-mono">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>Koneksi telemetri terputus — mencoba menghubungkan kembali secara otomatis…</span>
              </div>
              <button
                onClick={fetchStatus}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FAF6EF] hover:bg-[#FDE68A] text-[#B45309] border border-[#FDE68A] font-semibold transition-colors"
                type="button"
              >
                <RefreshCw className="w-3 h-3" />
                Coba Ulang
              </button>
            </div>
          </div>
        )}

        {/* Main Content View Container */}
        <main className="flex-1 pt-18 px-4 sm:px-6 lg:px-8 pb-12 w-full max-w-[1600px] mx-auto">
          {activeTab === 'overview' && (
            <div key="overview" className="motion-view-enter">
              <ErrorBoundary title="Kendala Modul Ringkasan Sistem">
                <div className="flex flex-col gap-5">
                  <SystemOverview
                    system={data?.system}
                    gpus={data?.gpus}
                    users={data?.users || []}
                    students={students || []}
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
            </div>
          )}

          {activeTab === 'students' && (
            <div key="students" className="motion-view-enter">
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
            </div>
          )}

          {activeTab === 'files' && (
            <div key="files" className="motion-view-enter">
              <ErrorBoundary title="Kendala File Explorer">
                <AdminFileExplorer
                  isAdmin={isAdmin}
                  adminToken={adminToken}
                  students={students}
                  systemUsers={data?.users || []}
                  showToast={showToast}
                  onOpenLogin={() => setLoginModalOpen(true)}
                />
              </ErrorBoundary>
            </div>
          )}

          {activeTab === 'audit' && (
            <div key="audit" className="motion-view-enter">
              <ErrorBoundary title="Kendala Modul Log Audit">
                <AuditLogView logs={data?.audit_logs || []} />
              </ErrorBoundary>
            </div>
          )}
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white border border-slate-200 shadow-md text-xs font-mono text-slate-800">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-[#B45309] shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-[#1a73e8] shrink-0" />
            )}
            <span className="font-semibold">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-[#7A6A5C] hover:text-slate-700 transition-colors"
              type="button"
              aria-label="Tutup Notifikasi"
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
