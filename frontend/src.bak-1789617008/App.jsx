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
import { WifiOff, RefreshCw, Layers, ShieldCheck, Play, Lock } from 'lucide-react';

export default function App() {
  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Admin PIN Session (Empty string = Mode Tamu / Read-Only)
  const [adminPin, setAdminPin] = useState(() => sessionStorage.getItem('lab_admin_pin') || '');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Kill Process Modal State
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
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/telemetry`;

      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const snapshot = JSON.parse(event.data);
          setData(snapshot);
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        timer = setTimeout(connect, 2500);
      };

      ws.onerror = (err) => {
        console.error('WS error:', err);
        ws.close();
      };
    };

    fetchStatus();
    connect();

    return () => {
      if (ws) ws.close();
      if (timer) clearTimeout(timer);
    };
  }, [fetchStatus]);

  // Handle Admin PIN verification success
  const handlePinSuccess = (verifiedPin) => {
    setAdminPin(verifiedPin);
    sessionStorage.setItem('lab_admin_pin', verifiedPin);
    showToast('Akses Admin Aktif! Anda kini dapat mematikan proses dan mereset password.', 'success');
    if (pendingAction) {
      pendingAction(verifiedPin);
      setPendingAction(null);
    }
  };

  const handleLogoutAdmin = () => {
    setAdminPin('');
    sessionStorage.removeItem('lab_admin_pin');
    showToast('Sesi Admin ditutup. Dashboard beralih ke Mode Tamu (Read-Only).', 'info');
  };

  // Open Kill Modal with Admin Verification check
  const handleOpenKillModal = (procInfo) => {
    if (!adminPin) {
      setPendingAction(() => (pin) => {
        setKillModal({ isOpen: true, processInfo: procInfo, isSubmitting: false });
      });
      setIsPinModalOpen(true);
      showToast('Akses Ditolak: Masukkan PIN Admin terlebih dahulu untuk menghentikan proses.', 'warning');
      return;
    }
    setKillModal({ isOpen: true, processInfo: procInfo, isSubmitting: false });
  };

  // Execute Kill Single Process
  const handleConfirmKill = async () => {
    if (!killModal.processInfo) return;
    const { pid } = killModal.processInfo;
    setKillModal((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const res = await fetch('/api/kill-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': adminPin
        },
        body: JSON.stringify({ pid, admin_pin: adminPin })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showToast(result.message, 'success');
        setKillModal({ isOpen: false, processInfo: null, isSubmitting: false });
        fetchStatus();
      } else {
        if (res.status === 401) {
          setAdminPin('');
          sessionStorage.removeItem('lab_admin_pin');
          showToast('PIN Admin tidak valid atau kedaluwarsa.', 'error');
        } else {
          showToast(result.detail || result.message || 'Gagal mematikan proses', 'error');
        }
        setKillModal((prev) => ({ ...prev, isSubmitting: false }));
      }
    } catch (e) {
      showToast('Kesalahan jaringan: ' + e.message, 'error');
      setKillModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Kill All Processes of a User
  const handleKillAllUser = async (username) => {
    if (!adminPin) {
      setIsPinModalOpen(true);
      showToast('Masukkan PIN Admin untuk menghentikan semua job user ini.', 'warning');
      return;
    }

    if (!window.confirm(`Hentikan SEMUA proses komputasi milik praktikan ${username}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/kill-user-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': adminPin
        },
        body: JSON.stringify({ username, admin_pin: adminPin })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast(result.message, 'success');
        fetchStatus();
      } else {
        showToast(result.detail || 'Gagal menghentikan job praktikan', 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  // Reset Password with Admin Verification check
  const handleResetPassword = async (username, new_password) => {
    if (!adminPin) {
      setIsPinModalOpen(true);
      return { success: false, message: 'Masukkan PIN Admin untuk mengubah password praktikan.' };
    }

    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': adminPin
        },
        body: JSON.stringify({ username, new_password, admin_pin: adminPin })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showToast(result.message, 'success');
        fetchStatus();
        return result;
      } else {
        if (res.status === 401) {
          setAdminPin('');
          sessionStorage.removeItem('lab_admin_pin');
        }
        return { success: false, message: result.detail || result.message || 'Gagal mengubah password' };
      }
    } catch (e) {
      return { success: false, message: e.message };
    }
  };

  // Run Simulation for testing
  const handleRunSimulation = async () => {
    if (!adminPin) {
      setPendingAction(() => () => handleRunSimulation());
      setIsPinModalOpen(true);
      showToast('Masukkan PIN Admin untuk meluncurkan simulasi beban komputasi.', 'warning');
      return;
    }

    setIsSimulating(true);
    try {
      const res = await fetch('/api/run-simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': adminPin
        },
        body: JSON.stringify({ admin_pin: adminPin })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast(result.message, 'success');
        setActiveTab('jobs'); // Otomatis pindah ke tab Manajemen Job agar proses langsung terlihat!
      } else {
        showToast(result.detail || 'Gagal meluncurkan simulasi', 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setTimeout(() => setIsSimulating(false), 3000);
    }
  };

  // Stop Simulation
  const handleStopSimulation = async () => {
    if (!adminPin) {
      setIsPinModalOpen(true);
      return;
    }
    try {
      const res = await fetch('/api/stop-simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': adminPin
        },
        body: JSON.stringify({ admin_pin: adminPin })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast(result.message, 'success');
        fetchStatus();
      } else {
        showToast(result.detail || 'Gagal menghentikan simulasi', 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  // Export Snapshot Telemetry JSON
  const handleExportSnapshot = () => {
    if (!data) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `telemetry-umpo-lab-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Snapshot telemetri berhasil diunduh.', 'info');
  };

  const isAdmin = Boolean(adminPin);
  const activeProcesses = data?.all_processes || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
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
        onExportSnapshot={handleExportSnapshot}
        auditCount={data?.audit_logs?.length || 0}
        processCount={activeProcesses.length}
      />

      {/* Floating Disconnected Banner */}
      {!isConnected && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2 text-center text-xs text-rose-300 font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top">
          <WifiOff className="w-4 h-4 text-rose-400 animate-pulse" />
          <span>Koneksi telemetri terputus. Sistem sedang mencoba menghubungkan kembali...</span>
          <button
            onClick={fetchStatus}
            className="underline hover:text-white ml-2 flex items-center gap-1 font-semibold cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Coba Sekarang
          </button>
        </div>
      )}

      {/* Role Banner for Normal Viewers */}
      {!isAdmin && (
        <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-1.5 text-center text-[11px] text-slate-400 font-sans flex items-center justify-center gap-2">
          <Lock className="w-3 h-3 text-slate-500" />
          <span>Anda berada pada <strong>Mode Tamu (Read-Only)</strong>. Tombol penghentian proses & reset password dikunci khusus untuk Admin.</span>
          <button
            onClick={() => setIsPinModalOpen(true)}
            className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer ml-1"
          >
            Masuk dengan PIN Admin
          </button>
        </div>
      )}

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6 flex-1">
        {/* Toast Notification */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
            <div
              className={`px-4 py-3 rounded-xl shadow-2xl text-xs font-medium flex items-center gap-2.5 border ${
                toast.type === 'success'
                  ? 'bg-emerald-950/95 text-emerald-300 border-emerald-500/40 shadow-emerald-950/50'
                  : toast.type === 'error'
                  ? 'bg-rose-950/95 text-rose-300 border-rose-500/40 shadow-rose-950/50'
                  : toast.type === 'warning'
                  ? 'bg-amber-950/95 text-amber-300 border-amber-500/40 shadow-amber-950/50'
                  : 'bg-slate-900/95 text-slate-200 border-slate-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  toast.type === 'success'
                    ? 'bg-emerald-400'
                    : toast.type === 'error'
                    ? 'bg-rose-400'
                    : toast.type === 'warning'
                    ? 'bg-amber-400'
                    : 'bg-indigo-400'
                }`}
              />
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Dual GPU Engine Cards */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Mesin Komputasi Dual GPU — Lab TI UMPO
                  </h2>
                  <p className="text-xs text-slate-400">
                    Dual NVIDIA GeForce RTX 5060 Ti (Total 32 GB VRAM GDDR7) • Partisi Riset & Praktikum
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GpuCard
                  gpu={data?.gpus?.[0]}
                  onOpenKillModal={handleOpenKillModal}
                  isAdmin={isAdmin}
                />
                <GpuCard
                  gpu={data?.gpus?.[1]}
                  onOpenKillModal={handleOpenKillModal}
                  isAdmin={isAdmin}
                />
              </div>
            </section>

            {/* Performance Timeline Chart */}
            <section>
              <LiveChart history={data?.history} />
            </section>

            {/* Quick Process Manager overview if any processes exist */}
            <section>
              <ProcessManager
                processes={activeProcesses}
                isAdmin={isAdmin}
                onOpenKillModal={handleOpenKillModal}
                onRunSimulation={handleRunSimulation}
                onStopSimulation={handleStopSimulation}
                isSimulating={isSimulating}
                onOpenPinModal={() => setIsPinModalOpen(true)}
              />
            </section>

            {/* Quick System Overview Snapshot */}
            <section>
              <SystemOverview system={data?.system} />
            </section>
          </div>
        )}

        {/* TAB 2: JOBS / PROCESS MANAGER */}
        {activeTab === 'jobs' && (
          <div className="space-y-6 animate-in fade-in duration-200">
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

        {/* TAB 3: STUDENTS / PER-USER GPU USAGE */}
        {activeTab === 'students' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <UserGpuMonitor
              users={data?.users}
              isAdmin={isAdmin}
              onOpenKillModal={handleOpenKillModal}
              onResetPassword={handleResetPassword}
              onKillAllUser={handleKillAllUser}
            />
          </div>
        )}

        {/* TAB 4: SERVER INFRASTRUCTURE & HARDWARE */}
        {activeTab === 'system' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <SystemOverview system={data?.system} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-white">Alokasi Payung Cgroups v2 (RAM)</h3>
                </div>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Isolasi memori dilakukan pada kernel Linux untuk mencegah satu mahasiswa menghabiskan seluruh memori server.
                </p>
                <div className="space-y-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="text-indigo-400 font-bold block">user.slice (Umbrella Limit)</span>
                      <span className="text-[11px] text-slate-500">Batas total seluruh praktikan & riset</span>
                    </div>
                    <span className="text-slate-200 font-bold">100 GB RAM Limit</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="text-indigo-400 font-bold block">user-1021.slice (labriset)</span>
                      <span className="text-[11px] text-slate-500">Riset Dosen & Skripsi Informatika</span>
                    </div>
                    <span className="text-slate-200 font-bold">70 GB RAM Limit</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="text-emerald-400 font-bold block">training1 s.d training10</span>
                      <span className="text-[11px] text-slate-500">Kuota aman per praktikan</span>
                    </div>
                    <span className="text-slate-200 font-bold">3 GB RAM / user</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Konfigurasi Hardware CUDA & Driver</h3>
                </div>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Status lingkungan eksekusi PyTorch, driver GPU, dan framework komputasi kecerdasan buatan.
                </p>
                <div className="space-y-2.5 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex justify-between">
                    <span className="text-slate-500">NVIDIA Driver Version :</span>
                    <span className="text-emerald-400 font-bold">595.84</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex justify-between">
                    <span className="text-slate-500">CUDA Runtime Version :</span>
                    <span className="text-slate-200 font-bold">CUDA 13.2</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex justify-between">
                    <span className="text-slate-500">Python Environment :</span>
                    <span className="text-indigo-400 font-bold">Python 3.12.3 (/opt/ai_env)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex justify-between">
                    <span className="text-slate-500">PyTorch Acceleration :</span>
                    <span className="text-slate-200 font-bold">cu128 (RTX 5060 Ti Dual Arch)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOG */}
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AuditLogView logs={data?.audit_logs || []} />
          </div>
        )}
      </main>

      {/* Kill Process Modal */}
      <KillConfirmModal
        isOpen={killModal.isOpen}
        processInfo={killModal.processInfo}
        onConfirm={handleConfirmKill}
        onClose={() => setKillModal({ isOpen: false, processInfo: null, isSubmitting: false })}
        isSubmitting={killModal.isSubmitting}
      />

      {/* Admin PIN Verification Modal */}
      <AdminPinModal
        isOpen={isPinModalOpen}
        onSuccess={handlePinSuccess}
        onClose={() => setIsPinModalOpen(false)}
      />

      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-400 space-y-1">
        <p className="font-semibold text-slate-300">
          Laboratorium Komputasi AI & Riset Informatika • Fakultas Teknik • Universitas Muhammadiyah Ponorogo
        </p>
        <p className="text-slate-500 font-mono text-[11px]">
          Node: ai.umpo.ac.id (103.79.91.188) • Ubuntu Linux 24.04 LTS • PyTorch CUDA 13.2
        </p>
      </footer>
    </div>
  );
}
