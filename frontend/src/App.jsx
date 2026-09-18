import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import GpuCard from './components/GpuCard';
import SystemOverview from './components/SystemOverview';
import LiveChart from './components/LiveChart';
import UserGpuMonitor from './components/UserGpuMonitor';
import ProcessManager from './components/ProcessManager';
import AuditLogView from './components/AuditLogView';
import KillConfirmModal from './components/KillConfirmModal';
import AdminPinModal from './components/AdminPinModal';
import CommandPalette from './components/CommandPalette';
import {
  WifiOff, RefreshCw, Layers, ShieldCheck,
  CheckCircle2, AlertCircle, Info
} from 'lucide-react';

export default function App() {
  const [data, setData]               = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast]             = useState(null);
  const [activeTab, setActiveTab]     = useState('overview');

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

  // Admin PIN Session
  const [adminPin, setAdminPin]     = useState(() => sessionStorage.getItem('lab_admin_pin') || '');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingAction, setPendingAction]   = useState(null);
  const [isSimulating, setIsSimulating]     = useState(false);

  // Command Palette
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Kill Modal
  const [killModal, setKillModal] = useState({
    isOpen: false,
    processInfo: null,
    isSubmitting: false
  });

  const wsRef = useRef(null);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(open => !open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

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

  // Admin PIN Success callback
  const handlePinSuccess = (pin) => {
    setAdminPin(pin);
    sessionStorage.setItem('lab_admin_pin', pin);
    showToast('Mode Admin aktif. Kontrol administratif terbuka.', 'success');
    if (pendingAction) {
      if (pendingAction.type === 'kill') {
        setKillModal({ isOpen: true, processInfo: pendingAction.payload, isSubmitting: false });
      }
      setPendingAction(null);
    }
  };

  const handleLogoutAdmin = () => {
    setAdminPin('');
    sessionStorage.removeItem('lab_admin_pin');
    showToast('Kembali ke Mode Tamu (Read-Only).', 'info');
  };

  // Kill Process — Admin Guard
  const handleOpenKillModal = (proc) => {
    if (!adminPin) {
      setPendingAction({ type: 'kill', payload: proc });
      setIsPinModalOpen(true);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid: killModal.processInfo.pid, admin_pin: adminPin }),
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
        if (result.detail?.includes('PIN')) handleLogoutAdmin();
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
      setKillModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Reset Password
  const handleResetPassword = async (username, newPassword) => {
    if (!adminPin) {
      setIsPinModalOpen(true);
      return { success: false, message: 'Harus login PIN Admin terlebih dahulu.' };
    }
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, new_password: newPassword, admin_pin: adminPin }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        fetchStatus();
        return { success: true, message: `Password praktikan ${username} berhasil diperbarui.` };
      } else {
        return { success: false, message: result.detail || 'Gagal mereset password' };
      }
    } catch (err) {
      return { success: false, message: 'Error: ' + err.message };
    }
  };

  // Kill All User Jobs
  const handleKillAllUser = async (username) => {
    if (!adminPin) { setIsPinModalOpen(true); return; }
    const userProcs = (data?.all_processes || []).filter((p) => p.username === username);
    if (userProcs.length === 0) {
      showToast(`Tidak ada proses aktif untuk ${username}`, 'info');
      return;
    }
    if (!confirm(`Hentikan seluruh (${userProcs.length}) proses komputasi milik ${username}?`)) return;

    let killed = 0;
    for (const proc of userProcs) {
      try {
        const res = await fetch('/api/kill-process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pid: proc.pid, admin_pin: adminPin }),
        });
        if (res.ok) killed++;
      } catch (e) { console.error(e); }
    }
    showToast(`Berhasil menghentikan ${killed} proses milik ${username}.`, 'success');
    fetchStatus();
  };

  // Run Simulation
  const handleRunSimulation = async () => {
    if (!adminPin) { setIsPinModalOpen(true); return; }
    setIsSimulating(true);
    showToast('Memulai simulasi komputasi PyTorch (11 akun)...', 'info');
    try {
      const res = await fetch('/api/run-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_pin: adminPin }),
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
    if (!adminPin) { setIsPinModalOpen(true); return; }
    showToast('Membersihkan proses simulasi...', 'info');
    try {
      const res = await fetch('/api/stop-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_pin: adminPin }),
      });
      const result = await res.json();
      if (res.ok && result.success) { showToast(result.message, 'success'); fetchStatus(); }
      else showToast(result.detail || 'Gagal menghentikan simulasi', 'error');
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  const isAdmin        = Boolean(adminPin);
  const activeProcesses = data?.all_processes || [];

  return (
    <div
      className="min-h-screen flex flex-col font-sans"
      style={{ background: 'var(--surface-0)', color: 'var(--text-primary)', transition: 'background 0.2s, color 0.2s' }}
    >
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isConnected={isConnected}
        timeStr={data?.time_str}
        onManualRefresh={fetchStatus}
        isRefreshing={isRefreshing}
        isAdmin={isAdmin}
        onOpenPinModal={() => setIsPinModalOpen(true)}
        onLogoutAdmin={handleLogoutAdmin}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        auditCount={data?.audit_logs?.length || 0}
        processCount={activeProcesses.length}
        onOpenCommandPalette={() => setIsPaletteOpen(true)}
      />

      {/* Disconnected banner */}
      {!isConnected && (
        <div
          className="px-4 py-2 text-center flex items-center justify-center gap-2"
          style={{
            background: 'rgba(244,63,94,0.07)',
            borderBottom: '1px solid rgba(244,63,94,0.2)',
            fontSize: '0.6875rem',
            color: 'var(--accent-rose)',
            fontWeight: 600,
          }}
        >
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>Koneksi telemetri terputus — sistem sedang mencoba menghubungkan kembali…</span>
          <button
            onClick={fetchStatus}
            className="cursor-pointer flex items-center gap-1 underline"
            style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', fontWeight: 700 }}
          >
            <RefreshCw className="w-3 h-3" />
            Coba Sekarang
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 toast-enter"
          style={{ maxWidth: 360 }}
        >
          <div
            className="flex items-center gap-2.5 panel-raised"
            style={{
              padding: '10px 16px',
              borderColor: toast.type === 'success'
                ? 'rgba(16,185,129,0.25)'
                : toast.type === 'error'
                ? 'rgba(244,63,94,0.25)'
                : 'var(--border-emph)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {toast.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-emerald)' }} />
              : toast.type === 'error'
              ? <AlertCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-rose)' }} />
              : <Info className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-indigo)' }} />
            }
            <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main content */}
      <main
        className="flex-1 w-full mx-auto"
        style={{ maxWidth: 1280, padding: '24px 24px 40px' }}
      >
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6 fade-in-up">
            <SystemOverview system={data?.system} gpus={data?.gpus} />
            <LiveChart history={data?.history} theme={theme} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GpuCard
                gpu={data?.gpus?.[0]}
                onOpenKillModal={handleOpenKillModal}
                isAdmin={isAdmin}
                sparkHistory={data?.history || []}
              />
              <GpuCard
                gpu={data?.gpus?.[1]}
                onOpenKillModal={handleOpenKillModal}
                isAdmin={isAdmin}
                sparkHistory={data?.history || []}
              />
            </div>
            <ProcessManager
              processes={activeProcesses}
              isAdmin={isAdmin}
              onOpenKillModal={handleOpenKillModal}
              onRunSimulation={handleRunSimulation}
              onStopSimulation={handleStopSimulation}
              isSimulating={isSimulating}
              onOpenPinModal={() => setIsPinModalOpen(true)}
            />
          </div>
        )}

        {/* TAB 2: JOBS */}
        {activeTab === 'jobs' && (
          <div className="fade-in-up">
            <ProcessManager
              processes={activeProcesses}
              isAdmin={isAdmin}
              onOpenKillModal={handleOpenKillModal}
              onRunSimulation={handleRunSimulation}
              onStopSimulation={handleStopSimulation}
              isSimulating={isSimulating}
              onOpenPinModal={() => setIsPinModalOpen(true)}
            />
          </div>
        )}

        {/* TAB 3: STUDENTS */}
        {activeTab === 'students' && (
          <div className="fade-in-up">
            <UserGpuMonitor
              users={data?.users}
              isAdmin={isAdmin}
              onOpenKillModal={handleOpenKillModal}
              onResetPassword={handleResetPassword}
              onKillAllUser={handleKillAllUser}
            />
          </div>
        )}

        {/* TAB 4: INFRASTRUCTURE */}
        {activeTab === 'system' && (
          <div className="flex flex-col gap-5 fade-in-up">
            <SystemOverview system={data?.system} gpus={data?.gpus} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Cgroups v2 info */}
              <div className="panel-raised" style={{ padding: '20px 24px' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4" style={{ color: 'var(--accent-indigo)' }} />
                  <h3
                    className="font-bold"
                    style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
                  >
                    Alokasi Payung Cgroups v2 (RAM)
                  </h3>
                </div>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                  Isolasi memori dilakukan pada kernel Linux untuk mencegah satu mahasiswa menghabiskan seluruh memori server.
                </p>
                <div className="flex flex-col" style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-base)' }}>
                  {[
                    { label: 'user.slice (Umbrella Limit)', sub: 'Batas total seluruh praktikan & riset', value: '100 GB RAM', color: 'var(--accent-indigo)' },
                    { label: 'user-1021.slice (labriset)',   sub: 'Riset Dosen & Skripsi Informatika',   value: '70 GB RAM',  color: 'var(--accent-indigo)' },
                    { label: 'training1 s.d training10',     sub: 'Kuota aman per praktikan',             value: '3 GB / user', color: 'var(--accent-emerald)' },
                  ].map((row, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center"
                      style={{ padding: '10px 14px', borderBottom: i < 2 ? '1px solid var(--border-sub)' : 'none' }}
                    >
                      <div>
                        <span
                          className="metric-value font-bold block"
                          style={{ fontSize: '0.6875rem', color: row.color }}
                        >
                          {row.label}
                        </span>
                        <span style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
                          {row.sub}
                        </span>
                      </div>
                      <span
                        className="metric-value font-bold shrink-0"
                        style={{ fontSize: '0.6875rem', color: 'var(--text-primary)', marginLeft: 12 }}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CUDA & Driver info */}
              <div className="panel-raised" style={{ padding: '20px 24px' }}>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-4 h-4" style={{ color: 'var(--accent-emerald)' }} />
                  <h3
                    className="font-bold"
                    style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
                  >
                    Konfigurasi CUDA & Driver
                  </h3>
                </div>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                  Status lingkungan eksekusi PyTorch, driver GPU, dan framework komputasi kecerdasan buatan.
                </p>
                <div className="flex flex-col" style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-base)' }}>
                  {[
                    { label: 'NVIDIA Driver Version', value: '595.84',                          color: 'var(--accent-emerald)' },
                    { label: 'CUDA Runtime Version',  value: 'CUDA 13.2',                       color: 'var(--text-primary)' },
                    { label: 'Python Environment',    value: 'Python 3.12.3 (/opt/ai_env)',      color: 'var(--accent-indigo)' },
                    { label: 'PyTorch Acceleration',  value: 'cu128 (RTX 5060 Ti Dual Arch)',   color: 'var(--text-primary)' },
                  ].map((row, i, arr) => (
                    <div
                      key={i}
                      className="flex justify-between items-center"
                      style={{
                        padding: '9px 14px',
                        borderBottom: i < arr.length - 1 ? '1px solid var(--border-sub)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{row.label}</span>
                      <span
                        className="metric-value font-bold"
                        style={{ fontSize: '0.6875rem', color: row.color }}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOG */}
        {activeTab === 'audit' && (
          <div className="fade-in-up">
            <AuditLogView logs={data?.audit_logs || []} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="text-center"
        style={{
          borderTop: '1px solid var(--border-base)',
          padding: '16px 24px',
          background: 'var(--surface-0)',
        }}
      >
        <p
          className="font-semibold"
          style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}
        >
          Laboratorium Komputasi AI & Riset Informatika · Fakultas Teknik · Universitas Muhammadiyah Ponorogo
        </p>
        <p
          className="metric-value mt-1"
          style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}
        >
          Node: ai.umpo.ac.id (103.79.91.188) · Ubuntu Linux 24.04 LTS · PyTorch CUDA 13.2
        </p>
      </footer>

      {/* Modals */}
      <KillConfirmModal
        isOpen={killModal.isOpen}
        processInfo={killModal.processInfo}
        onConfirm={handleConfirmKill}
        onClose={() => setKillModal({ isOpen: false, processInfo: null, isSubmitting: false })}
        isSubmitting={killModal.isSubmitting}
      />

      <AdminPinModal
        isOpen={isPinModalOpen}
        onSuccess={handlePinSuccess}
        onClose={() => setIsPinModalOpen(false)}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onTabChange={setActiveTab}
        onToggleTheme={handleToggleTheme}
        theme={theme}
        isAdmin={isAdmin}
        onOpenPinModal={() => { setIsPaletteOpen(false); setIsPinModalOpen(true); }}
        onLogoutAdmin={() => { handleLogoutAdmin(); setIsPaletteOpen(false); }}
        onRunSimulation={() => { handleRunSimulation(); setIsPaletteOpen(false); }}
        onStopSimulation={() => { handleStopSimulation(); setIsPaletteOpen(false); }}
        processes={activeProcesses}
      />
    </div>
  );
}
