import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import GpuCard from './components/GpuCard';
import SystemOverview from './components/SystemOverview';
import LiveChart from './components/LiveChart';
import AuditLogView from './components/AuditLogView';
import KillConfirmModal from './components/KillConfirmModal';
import UnifiedUserManagement from './components/UnifiedUserManagement';
import AdminPinModal from './components/AdminPinModal';
import ErrorBoundary from './components/ErrorBoundary';

import {
  WifiOff, RefreshCw, Layers, ShieldCheck,
  CheckCircle2, AlertCircle, Info, Menu, Database, Archive, HardDrive, Cpu, Terminal
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

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [students, setStudents]             = useState([]);
  const [isConnected, setIsConnected]       = useState(false);
  const [isRefreshing, setIsRefreshing]     = useState(false);
  const [toast, setToast]                   = useState(null);
  const [activeTab, setActiveTab]           = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen]   = useState(true);
  const [isSimulating, setIsSimulating]     = useState(false);

  // Database Backup States
  const [backups, setBackups]               = useState([]);
  const [isBackingUp, setIsBackingUp]       = useState(false);

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
    showToast('Logout berhasil', 'info');
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

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    ...(adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {})
  });

  const handleOpenKillModal = (proc) => {
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

  // Reset Password
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

  // Kill All User Jobs / Active Sessions
  const handleKillAllUser = async (username) => {
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

  // Stop Simulation
  const handleStopSimulation = async () => {
    showToast('Membersihkan proses simulasi...', 'info');
    try {
      const res = await fetch('/api/stop-simulation', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });
      const result = await res.json();
      if (res.ok && result.success) { showToast(result.message, 'success'); fetchStatus(); }
      else showToast(result.detail || 'Gagal menghentikan simulasi', 'error');
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  return (
    <div className="dark min-h-screen bg-bg-void text-on-surface font-body-md antialiased selection:bg-neon-cyan/20 selection:text-neon-cyan">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isConnected={isConnected}
        timeStr={data?.time_str}
        onManualRefresh={fetchStatus}
        isRefreshing={isRefreshing}
        isAdmin={isAdmin}
        auditCount={data?.audit_logs?.length || 0}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        gpus={data?.gpus || []}
      />

      {/* Main App Container */}
      <div
        className="flex flex-col min-h-screen transition-all duration-300"
        style={{ paddingLeft: isSidebarOpen ? '16rem' : '0' }}
      >
        {/* Fixed Header — Google Stitch Design */}
        <header
          className="fixed top-0 right-0 h-16 bg-surface-1/80  border-b border-border-subtle z-40 flex items-center justify-between px-6 shadow-sm transition-all duration-300"
          style={{ left: isSidebarOpen ? '16rem' : '0' }}
        >
          {/* Left Title & Breadcrumbs */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              title="Toggle Sidebar"
              type="button"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="font-headline-md text-label-lg text-on-surface font-bold tracking-tight">
                Lab Komputasi AI UMPO
              </span>
            </div>
          </div>

          {/* Center / Telemetry Ping Pill */}
          <div className="hidden md:flex items-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-surface-container-lowest border border-border-subtle">
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
              <span className="font-mono-code-xs text-mono-code-xs text-on-surface-variant">
                {isConnected ? 'WebSocket Live (12ms)' : 'Koneksi Offline'}
              </span>
            </div>
          </div>

          {/* Right Mode Pill, Clock, and Auth Action */}
          <div className="flex items-center gap-3">
            {/* RBAC Mode Pill */}
            {!isAdmin ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-surface-2 text-text-muted border border-border-subtle text-xs font-mono">
                <Info className="w-3.5 h-3.5 text-secondary-fixed" />
                <span>Public Monitoring</span>
              </div>
            ) : isOperator ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 text-xs font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Operator: {adminUser?.nama ? adminUser.nama.split(' ')[0] : 'Aslab'}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-secondary-container text-secondary-fixed text-xs font-mono shadow-sm">
                <span className="material-symbols-outlined text-[16px] text-neon-amber">bolt</span>
                <span>Super Admin{adminUser?.nama ? `: ${adminUser.nama.split(' ')[0]}` : ''}</span>
              </div>
            )}

            {/* WIB Clock */}
            <div className="hidden lg:flex items-center px-3 py-1 rounded-lg bg-surface-2 font-mono-code-sm text-mono-code-sm text-primary-fixed-dim border border-border-subtle">
              <span className="text-outline mr-1.5">WIB:</span>
              {data?.time_str || '--:--:--'}
            </div>

            {/* Login / Logout Button */}
            {!isAdmin ? (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-3 text-primary-fixed text-xs font-medium border border-border-base transition-colors"
                title="Login Operator / Admin"
                type="button"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-neon-cyan" />
                <span>Login Admin</span>
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors"
                title="Keluar dari Konsol"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </button>
            )}
          </div>
        </header>

        {/* Floating Disconnect Alert Banner */}
        {!isConnected && (
          <div className="pt-20 px-6">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-error-container/20 border border-error-container/40 text-neon-rose text-xs font-mono shadow-sm">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
                <span>Koneksi telemetri WebSocket terputus — mencoba menghubungkan kembali secara otomatis…</span>
              </div>
              <button
                onClick={fetchStatus}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-error-container/40 text-neon-rose hover:bg-error-container/60 font-semibold transition-colors"
                type="button"
              >
                <RefreshCw className="w-3 h-3" />
                Coba Ulang
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Main Content Canvas */}
        <main className="flex-1 pt-20 px-6 lg:px-8 pb-12 w-full max-w-[1600px] mx-auto">
          {activeTab === 'overview' && (
            <ErrorBoundary title="Kendala Modul Ringkasan Sistem">
              <div className="flex flex-col gap-6 fade-in-up">
                <SystemOverview system={data?.system} gpus={data?.gpus} onTriggerBackup={handleTriggerBackup} isBackingUp={isBackingUp} backups={backups} isAdmin={isAdmin} />
                <LiveChart history={data?.history} theme="dark" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <GpuCard
                    gpu={data?.gpus?.[0]}
                    isAdmin={isAdmin}
                    onOpenKillModal={handleOpenKillModal}
                    sparkHistory={data?.history || []}
                  />
                  <GpuCard
                    gpu={data?.gpus?.[1]}
                    isAdmin={isAdmin}
                    onOpenKillModal={handleOpenKillModal}
                    sparkHistory={data?.history || []}
                  />
                </div>
              </div>
            </ErrorBoundary>
          )}

          {activeTab === 'students' && (
            <ErrorBoundary title="Kendala Modul Manajemen User">
              <div className="fade-in-up">
                <UnifiedUserManagement
                  isAdmin={isAdmin}
                  adminRole={adminRole}
                  adminUser={adminUser}
                  students={students}
                  systemUsers={data?.users || []}
                  onOpenKillModal={handleOpenKillModal}
                  onResetPassword={handleResetPassword}
                  onKillAllUser={handleKillAllUser}
                  fetchStudents={fetchStudents}
                  showToast={showToast}
                />
              </div>
            </ErrorBoundary>
          )}

          {activeTab === 'audit' && (
            <ErrorBoundary title="Kendala Modul Audit Log">
              <div className="fade-in-up">
                <AuditLogView logs={data?.audit_logs || []} />
              </div>
            </ErrorBoundary>
          )}
        </main>
      </div>

      {/* Toast Notification — Google Stitch Floating Style */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in- duration-300">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-2 border border-border-base shadow-sm text-xs font-mono text-on-surface">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-neon-emerald shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-neon-rose shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-neon-cyan shrink-0" />
            )}
            <span className="font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-text-muted hover:text-on-surface transition-colors"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
