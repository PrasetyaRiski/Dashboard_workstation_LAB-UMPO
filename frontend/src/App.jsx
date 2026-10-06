import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import GpuCard from './components/GpuCard';
import SystemOverview from './components/SystemOverview';
import LiveChart from './components/LiveChart';
import UserGpuMonitor from './components/UserGpuMonitor';
import ProcessManager from './components/ProcessManager';
import AuditLogView from './components/AuditLogView';
import KillConfirmModal from './components/KillConfirmModal';
import UnifiedUserManagement from './components/UnifiedUserManagement';
import AdminPinModal from './components/AdminPinModal';


import {
  WifiOff, RefreshCw, Layers, ShieldCheck,
  CheckCircle2, AlertCircle, Info, Menu
} from 'lucide-react';

export default function App() {
  const [data, setData]               = useState(null);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken') || '');
  const isAdmin = !!adminToken;
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast]             = useState(null);
  const [activeTab, setActiveTab]     = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Theme State (Dark Mode default, persists in localStorage)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('lab_theme') || 'dark';
  });

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('lab_theme', theme);
  }, [theme]);

  const [pendingAction, setPendingAction]   = useState(null);
  const [isSimulating, setIsSimulating]     = useState(false);



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

  const handleLoginSuccess = (token) => {
    localStorage.setItem('adminToken', token);
    setAdminToken(token);
    showToast('Login berhasil', 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken('');
    showToast('Logout berhasil', 'info');
  };

  const fetchStudents = useCallback(async () => {
    try {
      const headers = adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {};
      const res = await fetch('/api/users/students', { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setStudents(json.users || []);
      }
    } catch (e) {
      console.error('Fetch students error:', e);
    }
  }, [adminToken]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const fetchStatus = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/status');
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

  const handleOpenKillModal = (proc) => {
    setKillModal({ isOpen: true, processInfo: proc, isSubmitting: false });
  };

  const handleConfirmKill = async () => {
    if (!killModal.processInfo) return;
    setKillModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      const res = await fetch('/api/kill-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
    const user = (data?.users || []).find((u) => u.username === username);
    const userProcs = (data?.all_processes || []).filter((p) => p.username === username);

    const confirmMsg = userProcs.length > 0
      ? `Hentikan seluruh (${userProcs.length}) proses komputasi dan sesi milik ${username}?`
      : `User ${username} sedang online. Hentikan seluruh sesi aktif dan proses milik ${username}?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/kill-user-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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

  // Page header metadata per tab
  const tabMeta = {
    overview:  { title: 'Ringkasan',       desc: 'Ikhtisar penggunaan CPU, RAM, GPU, dan storage server secara real-time.' },
    jobs:      { title: 'Manajemen Job',   desc: 'Kelola dan pantau seluruh proses komputasi yang sedang berjalan.' },
    students:  { title: 'User',            desc: 'Monitor aktivitas dan alokasi sumber daya per user.' },
    system:    { title: 'Infrastruktur',   desc: 'Detail konfigurasi hardware, driver, dan isolasi resource.' },
    audit:     { title: 'Audit Log',       desc: 'Riwayat seluruh aksi administratif pada server.' },
  };

  const currentTab = tabMeta[activeTab] || tabMeta.overview;

  return (
    <div
      className="flex h-screen overflow-hidden font-sans"
      style={{ background: 'var(--surface-0)', color: 'var(--text-primary)' }}
    >
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isConnected={isConnected}
        timeStr={data?.time_str}
        onManualRefresh={fetchStatus}
        isRefreshing={isRefreshing}
        isAdmin={isAdmin}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        auditCount={data?.audit_logs?.length || 0}
        processCount={activeProcesses.length}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col h-full overflow-hidden"
        style={{
          marginLeft: isSidebarOpen ? 'var(--sidebar-width)' : '0',
          transition: 'margin-left var(--transition-slow)',
        }}
      >
        {/* Global Header / Top-bar — Stitch Style */}
        <header className="flex items-center justify-between px-6 py-3 bg-[#0a0e17]/90 backdrop-blur-md border-b border-[#46455430] z-30 select-none">
          <div className="flex items-center gap-4">
            <Menu className="w-5 h-5 text-[#c7c4d7] cursor-pointer lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)} />
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-[#4edea3] animate-ping absolute opacity-75"></div>
                <div className="w-2 h-2 rounded-full bg-[#4edea3] relative"></div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="text-[#dfe2ef] font-semibold">UMPO AI Workstation</span>
                  <span className="text-[#464554]">//</span>
                  <span className="text-[#4cd7f6]">node-dgx-umpo01</span>
                </div>
                <span className="text-[10px] text-[#908fa0] hidden sm:inline">AI Research Lab & Compute Cluster</span>
              </div>
            </div>

            {/* Live Telemetry Pills */}
            <div className="hidden xl:flex items-center gap-2 border-l border-[#46455430] pl-4 font-mono text-[10px]">
              <div className="flex items-center gap-1.5 bg-[#181b25] px-2.5 py-1 rounded-lg border border-[#46455430] text-[#4edea3]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
                <span>Live Telemetry</span>
                <span className="text-[#464554]">·</span>
                <span className="text-[#c7c4d7]">Cgroups v2 Active</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#181b25] px-2.5 py-1 rounded-lg border border-[#46455430] text-[#dfe2ef]">
                <span className="text-[#4cd7f6]">⚡</span>
                <span className="text-[#908fa0]">GPU 0 Slot:</span>
                <span className="text-[#4cd7f6] font-semibold">{students.filter(s => s.is_boosted).length}/1 Occupied</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center p-0.5 rounded-xl bg-[#181b25] border border-[#46455430]">
              <div className={`px-2.5 py-1 rounded-lg font-mono text-xs font-medium flex items-center gap-1.5 transition-all ${!isAdmin ? 'bg-[#262a34] text-[#c0c1ff] shadow-sm' : 'text-[#908fa0]'}`}>
                <Info className="w-3.5 h-3.5" />
                <span>Public View</span>
              </div>
              {!isAdmin ? (
                <button
                  onClick={() => setLoginModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg font-mono text-xs text-[#dfe2ef] hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Login Admin</span>
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1 rounded-lg font-mono text-xs bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>Logout</span>
                </button>
              )}
            </div>
          </div>
        </header>
        {/* Floating Disconnect Banner */}
        {!isConnected && (
          <div className="px-6 pt-3">
            <div className="disconnect-banner flex items-center justify-center gap-3 px-4 py-2.5">
              <WifiOff className="w-3.5 h-3.5 animate-pulse" style={{ color: 'var(--accent-rose)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontWeight: 600 }}>
                Koneksi telemetri terputus — mencoba menghubungkan kembali…
              </span>
              <button
                onClick={fetchStatus}
                className="cursor-pointer flex items-center gap-1 font-bold"
                style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', fontSize: '0.75rem' }}
              >
                <RefreshCw className="w-3 h-3" />
                Coba Sekarang
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Main Content — Stitch Layout */}
        <main className="flex-1 overflow-y-auto bg-[#0f131c]">
          <div className="w-full mx-auto p-6 lg:p-8" style={{ maxWidth: 1440 }}>

            {/* Mode Switcher Banner (Stitch Screen 1) */}
            <div className="relative overflow-hidden rounded-2xl bg-[#181b25] border border-[#46455430] p-4 shadow-xl mb-6">
              <div className="absolute -right-16 -top-16 w-56 h-56 bg-[#4cd7f6]/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1c1f29] border border-[#4cd7f6]/30 flex items-center justify-center text-[#4cd7f6] shadow-sm shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap font-mono">
                      <span className="text-sm font-semibold text-[#dfe2ef]">
                        {isAdmin ? 'Protected Admin Console' : 'Public Monitoring Mode'}
                      </span>
                      <span className="text-[10px] text-[#908fa0]">// {isAdmin ? 'AUTHENTICATED' : 'READ_ONLY'}</span>
                      <span className="px-2 py-0.5 rounded bg-[#262a34] text-[#c7c4d7] text-[10px] flex items-center gap-1.5 border border-[#46455440]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4cd7f6] animate-pulse"></span> Telemetry Unlocked
                      </span>
                    </div>
                    <p className="text-xs text-[#c7c4d7] mt-0.5">
                      Real-time PCIe telemetry & Cgroups v2 dynamic QoS allocations for Lab AI UMPO.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isAdmin ? (
                    <button
                      onClick={() => setLoginModalOpen(true)}
                      className="px-4 py-2 rounded-xl font-mono text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Unlock Admin Mode
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30 font-mono text-xs font-semibold">
                        Admin Session Active
                      </span>
                      <button
                        onClick={handleLogout}
                        className="px-3 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-mono text-xs transition"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Page Header */}
            <div className="page-header">
              <h1 className="page-header-title">{currentTab.title}</h1>
              <p className="page-header-desc">{currentTab.desc}</p>
            </div>

            {activeTab === 'overview' && (
              <div className="flex flex-col gap-6 fade-in-up">
                <SystemOverview system={data?.system} gpus={data?.gpus} />
                <LiveChart history={data?.history} theme={theme} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <GpuCard
                    gpu={data?.gpus?.[0]}
                    isAdmin={isAdmin}
                    sparkHistory={data?.history || []}
                  />
                  <GpuCard
                    gpu={data?.gpus?.[1]}
                    isAdmin={isAdmin}
                    sparkHistory={data?.history || []}
                  />
                </div>
                <ProcessManager
                  processes={activeProcesses}
                  isAdmin={isAdmin}
                  onRunSimulation={handleRunSimulation}
                  onStopSimulation={handleStopSimulation}
                  isSimulating={isSimulating}
                  onOpenPinModal={() => setLoginModalOpen(true)}
                />
              </div>
            )}

            {activeTab === 'jobs' && (
              <div className="fade-in-up">
                <ProcessManager
                  processes={activeProcesses}
                  isAdmin={isAdmin}
                  onRunSimulation={handleRunSimulation}
                  onStopSimulation={handleStopSimulation}
                  isSimulating={isSimulating}
                  onOpenPinModal={() => setLoginModalOpen(true)}
                />
              </div>
            )}

            {activeTab === 'students' && (
              <div className="fade-in-up">
                <UnifiedUserManagement
                  isAdmin={isAdmin}
                  students={students}
                  systemUsers={data?.users || []}
                  onOpenKillModal={handleOpenKillModal}
                  onResetPassword={handleResetPassword}
                  onKillAllUser={handleKillAllUser}
                  fetchStudents={fetchStudents}
                  showToast={showToast}
                />
              </div>
            )}

            {activeTab === 'system' && (
              <div className="flex flex-col gap-5 fade-in-up">
                <SystemOverview system={data?.system} gpus={data?.gpus} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Cgroups v2 info */}
                  <div className="panel-raised" style={{ padding: '20px 24px' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Layers className="w-4 h-4" style={{ color: 'var(--accent-indigo)' }} />
                      <h3 className="font-bold" style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                        Alokasi Payung Cgroups v2 (RAM)
                      </h3>
                    </div>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                      Isolasi memori dilakukan pada kernel Linux untuk mencegah satu mahasiswa menghabiskan seluruh memori server.
                    </p>
                    <div className="flex flex-col" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-base)' }}>
                      {[
                        { label: 'user.slice (Umbrella Limit)', sub: 'Batas total seluruh user & riset',     value: '100 GB RAM', color: 'var(--accent-indigo)' },
                        { label: 'user-1021.slice (labriset)',   sub: 'Riset Dosen & Skripsi Informatika',   value: '70 GB RAM',  color: 'var(--accent-indigo)' },
                        { label: 'training1 s.d training10',     sub: 'Kuota aman per user',                 value: '3 GB / user', color: 'var(--accent-emerald)' },
                      ].map((row, i) => (
                        <div key={i} className="flex justify-between items-center" style={{ padding: '10px 14px', borderBottom: i < 2 ? '1px solid var(--border-sub)' : 'none' }}>
                          <div>
                            <span className="metric-value font-bold block" style={{ fontSize: '0.6875rem', color: row.color }}>{row.label}</span>
                            <span style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>{row.sub}</span>
                          </div>
                          <span className="metric-value font-bold shrink-0" style={{ fontSize: '0.6875rem', color: 'var(--text-primary)', marginLeft: 12 }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CUDA & Driver info */}
                  <div className="panel-raised" style={{ padding: '20px 24px' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldCheck className="w-4 h-4" style={{ color: 'var(--accent-emerald)' }} />
                      <h3 className="font-bold" style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                        Konfigurasi CUDA & Driver
                      </h3>
                    </div>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                      Status lingkungan eksekusi PyTorch, driver GPU, dan framework komputasi kecerdasan buatan.
                    </p>
                    <div className="flex flex-col" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-base)' }}>
                      {[
                        { label: 'NVIDIA Driver Version', value: '595.84',                          color: 'var(--accent-emerald)' },
                        { label: 'CUDA Runtime Version',  value: 'CUDA 13.2',                       color: 'var(--text-primary)' },
                        { label: 'Python Environment',    value: 'Python 3.12.3 (/opt/ai_env)',      color: 'var(--accent-indigo)' },
                        { label: 'PyTorch Acceleration',  value: 'cu128 (RTX 5060 Ti Dual Arch)',   color: 'var(--text-primary)' },
                      ].map((row, i, arr) => (
                        <div key={i} className="flex justify-between items-center" style={{ padding: '9px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border-sub)' : 'none' }}>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{row.label}</span>
                          <span className="metric-value font-bold" style={{ fontSize: '0.6875rem', color: row.color }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="fade-in-up">
                <AuditLogView logs={data?.audit_logs || []} />
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 toast-enter"
          style={{ maxWidth: 400, minWidth: 280 }}
        >
          <div className="toast-container">
            <div className="flex items-center gap-3 px-4 py-3">
              {toast.type === 'success'
                ? <CheckCircle2 className="w-4.5 h-4.5 shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                : toast.type === 'error'
                ? <AlertCircle className="w-4.5 h-4.5 shrink-0" style={{ color: 'var(--accent-rose)' }} />
                : <Info className="w-4.5 h-4.5 shrink-0" style={{ color: 'var(--accent-indigo)' }} />
              }
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 500 }}>{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                className="ml-auto shrink-0 cursor-pointer"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '2px' }}
              >
                ✕
              </button>
            </div>
            <div
              className="toast-progress-bar"
              style={{
                background: toast.type === 'success'
                  ? 'var(--accent-emerald)'
                  : toast.type === 'error'
                  ? 'var(--accent-rose)'
                  : 'var(--accent-indigo)'
              }}
            />
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

