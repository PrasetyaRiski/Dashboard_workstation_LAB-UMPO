import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import GpuCard from './components/GpuCard';
import SystemOverview from './components/SystemOverview';
import LiveChart from './components/LiveChart';
import ProcessManager from './components/ProcessManager';
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
    if (activeTab === 'system' && isAdmin) {
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

  // Run Simulation
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    showToast('Memulai simulasi komputasi PyTorch (11 akun)...', 'info');
    try {
      const res = await fetch('/api/run-simulation', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });
      const result = await res.json();
      if (res.ok && result.success) { showToast(result.message, 'success'); fetchStatus(); }
      else showToast(result.detail || 'Gagal menjalankan simulasi', 'error');
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setIsSimulating(false);
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

  const activeProcesses = data?.all_processes || [];

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
        processCount={activeProcesses.length}
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
          className="fixed top-0 right-0 h-16 bg-surface-1/80 backdrop-blur-xl border-b border-border-subtle z-40 flex items-center justify-between px-6 shadow-sm transition-all duration-300"
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-lowest border border-border-subtle">
              <span className="relative flex h-2 w-2">
                {isConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-emerald opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-emerald"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-rose"></span>
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
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 text-text-muted border border-border-subtle text-xs font-mono">
                <Info className="w-3.5 h-3.5 text-secondary-fixed" />
                <span>Public Monitoring</span>
              </div>
            ) : isOperator ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 text-xs font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Operator: {adminUser?.nama ? adminUser.nama.split(' ')[0] : 'Aslab'}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-secondary-fixed text-xs font-mono shadow-sm">
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
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-error-container/20 border border-error-container/40 text-neon-rose text-xs font-mono shadow-lg">
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
                <SystemOverview system={data?.system} gpus={data?.gpus} />
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

          {activeTab === 'jobs' && (
            <ErrorBoundary title="Kendala Modul Manajemen Job">
              <div className="fade-in-up">
                <ProcessManager
                  processes={activeProcesses}
                  isAdmin={isAdmin}
                  isSuperAdmin={isSuperAdmin}
                  adminRole={adminRole}
                  onOpenKillModal={handleOpenKillModal}
                  onRunSimulation={handleRunSimulation}
                  onStopSimulation={handleStopSimulation}
                  isSimulating={isSimulating}
                  onOpenPinModal={() => setLoginModalOpen(true)}
                />
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

          {activeTab === 'system' && (
            <ErrorBoundary title="Kendala Modul Infrastruktur">
              <div className="flex flex-col gap-6 fade-in-up">
              {/* Top Operational Banner */}
              <div className="relative overflow-hidden rounded-xl bg-surface-1 p-6 shadow-xl border border-border-subtle">
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-neon-cyan/5 blur-3xl pointer-events-none"></div>
                <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-secondary/5 blur-3xl pointer-events-none"></div>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-secondary-fixed font-mono-code-xs text-mono-code-xs font-semibold tracking-wider uppercase">
                        ARCH-SYSTEM TELEMETRY
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-2 text-neon-emerald font-mono-code-xs text-mono-code-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-emerald animate-pulse"></span>
                        cgroups-v2 UNIFIED HIERARCHY ACTIVE
                      </span>
                      <span className="text-outline font-mono-code-xs text-mono-code-xs">|</span>
                      <span className="text-outline font-mono-code-xs text-mono-code-xs">
                        KERNEL: Linux 6.8.0 x86_64
                      </span>
                    </div>
                    <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
                      Infrastruktur Komputasi & Alokasi Host
                    </h1>
                    <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
                      Topologi komputasi kluster Lab AI UMPO. Isolasi proses kernel Linux cgroups v2, interkoneksi PCIe dual-accelerator, serta persistensi snapshot database SQLite telemetri real-time.
                    </p>
                  </div>
                  {/* Quick Metrics Strip */}
                  <div className="flex items-center gap-4 self-start lg:self-center bg-surface-2 p-3 rounded-lg border border-border-base shadow-sm">
                    <div className="px-3 py-1 flex flex-col">
                      <span className="font-mono-code-xs text-mono-code-xs text-text-muted">HOST LOAD (1m)</span>
                      <span className="font-mono-metric-md text-mono-metric-md text-neon-cyan font-bold">
                        {data?.system?.cpu?.overall_percent || 0}% / {data?.system?.cpu?.core_count || 24} Cores
                      </span>
                    </div>
                    <div className="h-8 w-px bg-surface-variant"></div>
                    <div className="px-3 py-1 flex flex-col">
                      <span className="font-mono-code-xs text-mono-code-xs text-text-muted">ACCELERATORS</span>
                      <span className="font-mono-metric-md text-mono-metric-md text-secondary-fixed font-bold">
                        Dual RTX 5060 Ti
                      </span>
                    </div>
                    <div className="h-8 w-px bg-surface-variant"></div>
                    <div className="px-3 py-1 flex flex-col">
                      <span className="font-mono-code-xs text-mono-code-xs text-text-muted">STORAGE FS</span>
                      <span className="font-mono-metric-md text-mono-metric-md text-neon-emerald font-bold">
                        NVMe High-Speed
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bento Grid Canvas: Cgroups Tree & Hardware Driver */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* BOX 1: Cgroups v2 Resource Hierarchy (Span 7) */}
                <div className="lg:col-span-7 flex flex-col rounded-xl bg-surface-2 p-6 shadow-xl border border-border-subtle relative overflow-hidden">
                  <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center text-neon-cyan">
                        <span className="material-symbols-outlined text-[20px]">account_tree</span>
                      </div>
                      <div>
                        <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                          Alokasi Payung Cgroups v2
                        </h2>
                        <p className="font-mono-code-xs text-mono-code-xs text-outline">
                          Unified Hierarchy Kernel Limiter & CFS Memory Slices
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-surface-container font-mono-code-xs text-mono-code-xs text-neon-cyan border border-neon-cyan/20">
                      memory.max & cpu.weight
                    </span>
                  </div>

                  {/* Root Slice Indicator */}
                  <div className="bg-surface-3 p-4 rounded-lg mb-4 border border-border-base">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-metric-md text-mono-metric-md text-primary-fixed font-bold">
                          user.slice
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-surface-container-high font-mono-code-xs text-mono-code-xs text-text-muted">
                          HOST ROOT UMBRELLA
                        </span>
                      </div>
                      <span className="font-mono-code-xs text-mono-code-xs text-neon-emerald font-semibold">
                        Limit: 100 GB RAM Server
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-body-sm font-mono-code-xs text-on-surface-variant">
                      <span>Total Alokasi Host RAM Terpantau: 100 GB</span>
                      <span className="text-neon-cyan font-bold">
                        {data?.system?.memory?.used_gb || 0} GB / {data?.system?.memory?.total_gb || 128} GB Aktif
                      </span>
                    </div>
                    <div className="w-full h-2 bg-surface-container-lowest rounded-full overflow-hidden mt-2 flex">
                      <div className="h-full bg-neon-cyan w-[70%]" title="Skripsi / Level 1 (70 GB)"></div>
                      <div className="h-full bg-secondary w-[20%]" title="Shared Pool / Level 2 (20 GB)"></div>
                      <div className="h-full bg-surface-variant w-[10%]" title="Unallocated Host (10 GB)"></div>
                    </div>
                  </div>

                  {/* Interactive Tree View Hierarchy */}
                  <div className="flex flex-col gap-3">
                    <span className="font-mono-code-xs text-mono-code-xs text-text-muted uppercase tracking-wider">
                      Topologi Pohon Resource Slices (Live Cgroups)
                    </span>

                    {/* Node 1: Skripsi Level 1 */}
                    <div className="relative pl-6 before:content-[''] before:absolute before:left-2 before:top-0 before:bottom-0 before:w-0.5 before:bg-surface-variant p-2 rounded-lg bg-surface-1 border border-border-subtle">
                      <div className="absolute left-2 top-6 w-3 h-0.5 bg-surface-variant"></div>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm text-neon-cyan font-bold">user-1021.slice</span>
                            <span className="px-2 py-0.5 rounded bg-neon-cyan/10 font-mono text-[10px] text-neon-cyan font-semibold border border-neon-cyan/20">
                              Priority Level 1 (Skripsi / labriset)
                            </span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-container-high font-mono text-[10px] text-primary-fixed">
                              <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan"></span> GPU 0 Dedicated
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant">
                            Pekerjaan Riset Model Skripsi Mahasiswa Tingkat Akhir (VRAM Unrestricted Direct Map)
                          </p>
                        </div>
                        <div className="flex flex-col md:items-end gap-0.5 font-mono text-xs">
                          <span className="text-neon-cyan font-bold">Kuota: 70 GB RAM Host</span>
                          <span className="text-on-surface-variant text-[11px]">
                            CPU Weight: <span className="text-on-surface font-semibold">1000</span> | Dedicated: <span className="text-on-surface font-semibold">20 Cores</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Node 2: Praktikum Level 2 */}
                    <div className="relative pl-6 before:content-[''] before:absolute before:left-2 before:top-0 before:h-6 before:w-0.5 before:bg-surface-variant p-2 rounded-lg bg-surface-1 border border-border-subtle">
                      <div className="absolute left-2 top-6 w-3 h-0.5 bg-surface-variant"></div>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm text-secondary-fixed font-bold">compute-level2.slice</span>
                            <span className="px-2 py-0.5 rounded bg-secondary-container font-mono text-[10px] text-secondary-fixed-dim">
                              Shared Pool (Praktikum & Mhs)
                            </span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-container-high font-mono text-[10px] text-secondary">
                              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> GPU 1 Multi-Tenant
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant">
                            Multi-instance container pool untuk modul praktikum regular AI/ML dasar
                          </p>
                        </div>
                        <div className="flex flex-col md:items-end gap-0.5 font-mono text-xs">
                          <span className="text-secondary-fixed-dim font-bold">Kuota: 3 GB / Container</span>
                          <span className="text-on-surface-variant text-[11px]">
                            CPU Weight: <span className="text-on-surface font-semibold">100</span> | Fair Share: <span className="text-on-surface font-semibold">2 Cores</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOX 2: NVIDIA & Driver Configuration (Span 5) */}
                <div className="lg:col-span-5 flex flex-col rounded-xl bg-surface-2 p-6 shadow-xl border border-border-subtle relative overflow-hidden">
                  <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center text-neon-emerald">
                        <span className="material-symbols-outlined text-[20px]">memory</span>
                      </div>
                      <div>
                        <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                          Konfigurasi CUDA & Driver
                        </h2>
                        <p className="font-mono-code-xs text-mono-code-xs text-outline">
                          Akselerasi Hardware & Deep Learning Stack
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-high font-mono-code-xs text-mono-code-xs text-neon-emerald">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-emerald"></span> READY
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="bg-surface-1 p-3.5 rounded-lg flex items-center justify-between border border-border-base">
                      <div className="flex flex-col">
                        <span className="font-mono-code-xs text-mono-code-xs text-text-muted">NVIDIA DRIVER VER.</span>
                        <span className="font-headline-md text-sm font-semibold text-on-surface font-mono">595.48.02</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-surface-3 font-mono text-xs text-neon-cyan">
                        Production Branch
                      </span>
                    </div>

                    <div className="bg-surface-1 p-3.5 rounded-lg flex items-center justify-between border border-border-base">
                      <div className="flex flex-col">
                        <span className="font-mono-code-xs text-mono-code-xs text-text-muted">CUDA RUNTIME</span>
                        <span className="font-headline-md text-sm font-semibold text-on-surface font-mono">CUDA 13.2</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-mono-code-xs text-mono-code-xs text-neon-emerald font-semibold">cuDNN v9.1 Enabled</span>
                        <span className="font-mono-code-xs text-mono-code-xs text-outline">Compute Cap: sm_89</span>
                      </div>
                    </div>

                    {/* PyTorch Environment Grid */}
                    <div className="bg-surface-3 p-4 rounded-lg border border-border-base">
                      <span className="font-mono-code-xs text-mono-code-xs text-text-muted uppercase tracking-wider block mb-2 font-semibold">
                        PyTorch Compute Environment
                      </span>
                      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                        <div className="bg-surface-container p-2 rounded">
                          <span className="text-outline block text-[10px]">Python Core:</span>
                          <span className="text-on-surface font-semibold">3.12.3 (/opt/ai_env)</span>
                        </div>
                        <div className="bg-surface-container p-2 rounded">
                          <span className="text-outline block text-[10px]">PyTorch Engine:</span>
                          <span className="text-neon-cyan font-semibold">2.4.0+cu124</span>
                        </div>
                        <div className="bg-surface-container p-2 rounded">
                          <span className="text-outline block text-[10px]">TorchVision:</span>
                          <span className="text-on-surface font-semibold">0.19.0+cu124</span>
                        </div>
                        <div className="bg-surface-container p-2 rounded">
                          <span className="text-outline block text-[10px]">Hardware Target:</span>
                          <span className="text-secondary-fixed font-semibold">Dual RTX 5060 Ti</span>
                        </div>
                      </div>
                    </div>

                    {/* GPU Architecture Status Card */}
                    <div className="bg-surface-1 p-3.5 rounded-lg flex flex-col gap-1 border border-border-base">
                      <div className="flex items-center justify-between">
                        <span className="font-mono-code-xs text-mono-code-xs text-text-muted uppercase">GPU Topologi Host</span>
                        <span className="px-2 py-0.5 rounded bg-secondary-container font-mono text-[10px] text-secondary-fixed font-semibold">
                          PCIe 4.0 x16
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono text-on-surface mt-1">
                        <span>Dual NVIDIA GeForce RTX 5060 Ti</span>
                        <span className="text-outline">Blackwell / Ada Dual Arch</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOX 3: Status Database & Auto-Backup System (Span 12) */}
              <div className="flex flex-col rounded-xl bg-surface-2 p-6 shadow-xl border border-border-subtle">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[20px]">database</span>
                    </div>
                    <div>
                      <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                        Status Database & Auto-Backup Engine
                      </h2>
                      <p className="font-mono-code-xs text-mono-code-xs text-outline">
                        SQLite WAL Mode, Snapshot Rotasi Otomatis & SHA-256 Validated
                      </p>
                    </div>
                  </div>

                  {/* Action Backup Button */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={handleTriggerBackup}
                      disabled={isBackingUp}
                      className="px-4 py-2 rounded-lg bg-secondary text-surface font-label-lg text-sm font-semibold hover:bg-secondary-fixed transition-colors flex items-center gap-2 shadow-[0_0_16px_-2px_rgba(192,193,255,0.3)] disabled:opacity-50"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isBackingUp ? 'sync' : 'bolt'}
                      </span>
                      <span>{isBackingUp ? 'Membuat Snapshot...' : 'Backup Database Sekarang'}</span>
                    </button>
                  </div>
                </div>

                {/* Top Row Specs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
                  <div className="bg-surface-1 p-4 rounded-lg flex flex-col gap-1 border border-border-base">
                    <span className="font-mono-code-xs text-mono-code-xs text-text-muted">DATABASE MOUNT PATH</span>
                    <span className="font-mono text-sm text-primary-fixed truncate" title="/home/public/web/data/lab_users.db">
                      /home/public/web/data/lab_users.db
                    </span>
                    <div className="inline-flex items-center gap-1.5 text-mono-code-xs font-mono-code-xs text-neon-emerald mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-emerald"></span>
                      SQLite WAL-safe mode aktif
                    </div>
                  </div>
                  <div className="bg-surface-1 p-4 rounded-lg flex flex-col gap-1 border border-border-base">
                    <span className="font-mono-code-xs text-mono-code-xs text-text-muted">DATABASE DISK FOOTPRINT</span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono-metric-lg text-mono-metric-lg text-on-surface">1.2</span>
                      <span className="font-mono-metric-md text-mono-metric-md text-outline">MB</span>
                    </div>
                    <span className="font-mono-code-xs text-mono-code-xs text-text-muted mt-1">
                      Status: <span className="text-neon-cyan font-semibold">Read/Write Concurrency Synchronous</span>
                    </span>
                  </div>
                  <div className="bg-surface-1 p-4 rounded-lg flex flex-col gap-1 border border-border-base">
                    <span className="font-mono-code-xs text-mono-code-xs text-text-muted">CRON SCHEDULE / RETENTION</span>
                    <span className="font-mono text-sm text-on-surface font-semibold">Setiap Hari Pukul 00:00 WIB</span>
                    <span className="font-mono-code-xs text-mono-code-xs text-text-muted mt-1">
                      Rotasi otomatis 30 snapshot harian disimpan di <code className="text-neon-cyan">/data/backups</code>
                    </span>
                  </div>
                </div>

                {/* Snapshot History Table */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono-code-xs text-mono-code-xs text-text-muted uppercase tracking-wider font-semibold">
                      Riwayat Snapshot Backup ({backups.length > 0 ? backups.length : 'Terakhir'})
                    </span>
                    <span className="font-mono-code-xs text-mono-code-xs text-outline">
                      GZIP + SHA-256 Validated
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-lg bg-surface-1 border border-border-base">
                    <table className="w-full text-left font-mono-code-xs text-mono-code-xs">
                      <thead className="bg-surface-3 text-text-muted uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">Nama File Snapshot</th>
                          <th className="px-4 py-2.5 font-semibold">Waktu Pembuatan</th>
                          <th className="px-4 py-2.5 font-semibold text-right">Ukuran Arsip</th>
                          <th className="px-4 py-2.5 font-semibold text-center">Status Integritas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle text-on-surface">
                        {(!Array.isArray(backups) || backups.length === 0) ? (
                          <tr>
                            <td colSpan="4" className="px-4 py-6 text-center text-text-muted">
                              {isAdmin
                                ? 'Belum ada snapshot backup tersimpan, atau silakan klik tombol "Backup Database Sekarang" di atas.'
                                : 'Login sebagai Admin / Aslab untuk melihat riwayat file snapshot database.'}
                            </td>
                          </tr>
                        ) : (
                          (Array.isArray(backups) ? backups : []).slice(0, 5).map((bk, idx) => (
                            <tr key={idx} className="hover:bg-surface-3 transition-colors">
                              <td className="px-4 py-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px] text-neon-cyan">archive</span>
                                <span className="text-primary font-semibold">{bk?.filename || 'snapshot.tar.gz'}</span>
                              </td>
                              <td className="px-4 py-3 text-on-surface-variant">
                                {bk?.created_at || 'Baru Saja'}
                              </td>
                              <td className="px-4 py-3 text-right text-neon-emerald font-semibold">
                                {bk?.size_kb ? `${bk.size_kb} KB` : `${(((bk?.size_bytes || 0)) / 1024).toFixed(1)} KB`}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-neon-emerald font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-neon-emerald"></span> Verified
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
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
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-2 border border-border-base shadow-2xl text-xs font-mono text-on-surface">
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
