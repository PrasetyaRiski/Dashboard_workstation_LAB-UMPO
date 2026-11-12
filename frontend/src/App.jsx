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
import ModeSwitchModal from './components/ModeSwitchModal';
import CommandPalette from './components/CommandPalette';
import ErrorBoundary from './components/ErrorBoundary';
import LoginView from './components/LoginView';

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

  const [isAuthChecked, setIsAuthChecked]           = useState(() => !localStorage.getItem('adminToken'));
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

  // Mode Switch Modal
  const [modeSwitchModal, setModeSwitchModal] = useState({
    isOpen: false,
    targetMode: null,
    isSubmitting: false
  });

  const wsRef = useRef(null);

  const showToast = useCallback((toastData, type = 'info') => {
    if (typeof toastData === 'string') {
      setToast({ message: toastData, type });
    } else if (toastData && typeof toastData === 'object') {
      setToast({
        title: toastData.title,
        message: toastData.message || '',
        details: toastData.details || '',
        type: toastData.type || type,
      });
    }
    setTimeout(() => setToast(null), 5500);
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
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminUser');
    setAdminToken('');
    setAdminRole('');
    setAdminUser(null);
    setData(null);
    setStudents([]);
    setActiveTab('overview');
    showToast('Logout berhasil. Silakan login untuk masuk ke konsol admin.', 'info');
  };

  // Verifikasi Sesi Admin saat pertama kali memuat halaman
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setIsAuthChecked(true);
      return;
    }

    fetch('/api/admin/session', {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    })
      .then(async (res) => {
        if (res.ok) {
          const json = await res.json();
          if (json.authenticated) {
            setAdminRole(json.role || 'admin');
            if (json.user) {
              setAdminUser(json.user);
              localStorage.setItem('adminUser', JSON.stringify(json.user));
            }
          }
        } else {
          // Token kedaluwarsa atau tidak valid di backend
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminRole');
          localStorage.removeItem('adminUser');
          setAdminToken('');
          setAdminRole('');
          setAdminUser(null);
          showToast('Sesi Anda telah kedaluwarsa. Silakan login kembali.', 'warning');
        }
      })
      .catch((err) => {
        console.error('Session validation error:', err);
      })
      .finally(() => {
        setIsAuthChecked(true);
      });
  }, [showToast]);

  const fetchStudents = useCallback(async () => {
    if (!isAdmin) return;
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
  }, [isAdmin, adminToken]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchStudents();
    const interval = setInterval(fetchStudents, 5000);
    return () => clearInterval(interval);
  }, [isAdmin, fetchStudents]);

  const fetchStatus = useCallback(async () => {
    if (!isAdmin) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/status?_t=${Date.now()}`, { 
        headers: adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {},
        cache: 'no-store' 
      });
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
  }, [isAdmin, adminToken]);

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

  // WebSocket Telemetry Stream (Hanya terhubung saat Admin/Operator login)
  useEffect(() => {
    if (!isAdmin) {
      setIsConnected(false);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    let ws;
    let timer;
    let stopped = false;
    let retryDelay = 3000;

    const scheduleReconnect = () => {
      if (stopped) return;
      timer = setTimeout(connect, retryDelay);
      retryDelay = Math.min(Math.round(retryDelay * 1.5), 30000);
    };

    const connect = async () => {
      if (stopped) return;

      try {
        const ticketRes = await fetch('/api/ws-ticket', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${adminToken}` },
          cache: 'no-store',
        });

        if (!ticketRes.ok) {
          if (ticketRes.status === 401 || ticketRes.status === 403) {
            stopped = true;
            setIsConnected(false);
            showToast('Sesi admin berakhir. Silakan login kembali untuk melanjutkan pemantauan.', 'error');
            return;
          }
          throw new Error(`Gagal mengambil tiket WebSocket (${ticketRes.status})`);
        }

        const ticketData = await ticketRes.json();
        if (!ticketData?.ticket) {
          throw new Error('Tiket WebSocket tidak valid');
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/telemetry?ticket=${encodeURIComponent(ticketData.ticket)}`;
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          retryDelay = 3000;
          setIsConnected(true);
        };

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
          wsRef.current = null;
          scheduleReconnect();
        };

        ws.onerror = () => ws.close();
      } catch (err) {
        console.error('WebSocket connect error:', err);
        setIsConnected(false);
        scheduleReconnect();
      }
    };

    connect();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (ws) ws.close();
      wsRef.current = null;
    };
  }, [isAdmin, adminToken, showToast]);

  useEffect(() => {
    if (isAdmin) {
      fetchStatus();
    }
  }, [isAdmin, fetchStatus]);

  // Global Keyboard Shortcuts (Hanya aktif saat login)
  useEffect(() => {
    if (!isAdmin) return;
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

  const handleEmergencyReleaseIdle = async () => {
    if (!isAdmin) {
      setLoginModalOpen(true);
      return;
    }
    try {
      const res = await fetch('/api/admin/emergency-release-idle', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(
          json.message || 'Sesi idle berhasil dibebaskan.',
          json.released_count > 0 ? 'success' : 'info'
        );
        fetchStatus();
      } else {
        showToast(json.detail || 'Gagal membebaskan slot idle', 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  const handleSweepZombies = async () => {
    if (!isAdmin) {
      setLoginModalOpen(true);
      return;
    }
    try {
      const res = await fetch('/api/gpu/sweep-zombies', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(
          json.message || 'Sweep zombie GPU selesai.',
          json.killed_count > 0 ? 'success' : 'info'
        );
        fetchStatus();
      } else {
        showToast(json.detail || 'Gagal menyapu zombie GPU', 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  const handleSwitchLabMode = (newMode) => {
    if (!isAdmin) {
      showToast({
        title: 'Akses Dibatasi',
        message: 'Silakan login sebagai Admin atau Asisten Lab untuk mengubah mode operasional lab.',
        type: 'warning'
      });
      setLoginModalOpen(true);
      return;
    }
    setModeSwitchModal({
      isOpen: true,
      targetMode: newMode,
      isSubmitting: false,
    });
  };

  const handleConfirmModeSwitch = async () => {
    if (!modeSwitchModal.targetMode) return;
    setModeSwitchModal((prev) => ({ ...prev, isSubmitting: true }));
    const newMode = modeSwitchModal.targetMode;
    const modeLabel = newMode === 'basic' ? 'Mode Pemrograman Dasar (60 Slot)' : 'Mode Praktikum AI (30 Slot)';

    try {
      const res = await fetch('/api/lab/profile', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ mode: newMode }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setModeSwitchModal({ isOpen: false, targetMode: null, isSubmitting: false });
        showToast({
          title: 'Mode Operasional Klaster Diperbarui',
          message: json.message || `Mode Lab berhasil dialihkan ke ${modeLabel}`,
          details: newMode === 'basic' 
            ? 'Kapasitas 60 Slot aktif (Murni CPU & RAM). Akses GPU 1 dialihkan ke status Standby untuk mencegah OOM.' 
            : 'Kapasitas 30 Slot aktif dengan akselerasi GPU 1 (NVIDIA RTX 5060 Ti) untuk praktikum AI.',
          type: 'success',
        });
        fetchStatus();
      } else {
        showToast({
          title: 'Gagal Mengubah Mode Lab',
          message: json.detail || 'Terjadi kendala saat memperbarui profil lab.',
          type: 'error',
        });
        setModeSwitchModal((prev) => ({ ...prev, isSubmitting: false }));
      }
    } catch (e) {
      showToast({
        title: 'Error Koneksi Server',
        message: e.message || 'Gagal terhubung ke API profil lab.',
        type: 'error',
      });
      setModeSwitchModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

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

  if (!isAuthChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-slate-700">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-mono text-slate-500">Memverifikasi sesi konsol admin...</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        {/* Floating Modern Toast Notification */}
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 max-w-md w-full px-4 sm:px-0 motion-view-enter">
            <div className={`p-4 rounded-xl border shadow-lg flex items-start gap-3.5 bg-white transition-all ${
              toast.type === 'success' ? 'border-emerald-200' :
              toast.type === 'error' ? 'border-rose-200' :
              toast.type === 'warning' ? 'border-amber-200' :
              'border-sky-200'
            }`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                toast.type === 'error' ? 'bg-rose-50 text-rose-600' :
                toast.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                'bg-sky-50 text-sky-600'
              }`}>
                {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                 toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> :
                 toast.type === 'warning' ? <AlertCircle className="w-4 h-4" /> :
                 <Info className="w-4 h-4" />}
              </div>

              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h4 className="font-sans font-bold text-xs text-slate-900 tracking-tight mb-0.5">
                    {toast.title}
                  </h4>
                )}
                <p className="font-sans text-xs text-slate-700 leading-relaxed">
                  {toast.message}
                </p>
                {toast.details && (
                  <p className="font-sans text-[11px] text-slate-500 mt-1.5 leading-normal border-t border-slate-100 pt-1.5">
                    {toast.details}
                  </p>
                )}
              </div>

              <button
                onClick={() => setToast(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                type="button"
                aria-label="Tutup Notifikasi"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-700 font-sans antialiased selection:bg-slate-200 selection:text-slate-900">
      {/* Mobile Drawer Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden transition-opacity"
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
        {/* Enterprise Fixed Top Bar (Modern Cloud Console Style) */}
        <header
          className="fixed top-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-3 sm:px-6 transition-all duration-200 shadow-xs"
          style={{ left: (!isMobile && isSidebarOpen) ? '16rem' : '0' }}
        >
          {/* Breadcrumbs & Mobile Hamburger */}
          <div className="flex items-center gap-2 min-w-0">
            {isMobile && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 mr-1 cursor-pointer"
                aria-label="Buka Menu Navigasi"
                type="button"
              >
                <Menu className="w-5 h-5 text-slate-800" />
              </button>
            )}
            <span className="text-xs font-semibold text-slate-900 font-sans font-bold tracking-tight truncate">
              <span className="hidden sm:inline">Lab Komputasi AI UMPO</span>
              <span className="sm:hidden">Lab AI UMPO</span>
            </span>
            <span className="text-slate-300 text-xs">/</span>
            <span className="text-xs font-semibold text-sky-600 truncate">
              {activeTab === 'overview' ? 'Ringkasan Sistem' : activeTab === 'students' ? 'Manajemen Pengguna' : activeTab === 'files' ? 'File Explorer' : 'Log Audit'}
            </span>
          </div>

          {/* Quick Command & Actions */}
          <div className="flex items-center gap-3">
            {/* Command Palette Trigger */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl font-mono transition-colors cursor-pointer"
              title="Buka Command Palette (Ctrl+K)"
              type="button"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Cari proses / pintasan...</span>
              <kbd className="px-1.5 py-0.2 text-[10px] bg-white border border-slate-200 rounded text-slate-500 shadow-xs">⌘K</kbd>
            </button>

            {/* Connection Warning */}
            {isDataStale ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Data Stale · {staleSeconds}s</span>
              </div>
            ) : !isConnected ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Menyambung ulang…</span>
              </div>
            ) : null}

            {/* User Role Indicator */}
            {isOperator ? (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-xs font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                <span>Operator: {adminUser?.nama ? adminUser.nama.split(' ')[0] : 'Aslab'}</span>
              </div>
            ) : isSuperAdmin ? (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-xs font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Super Admin</span>
              </div>
            ) : null}

            {/* Auth Button */}
            {!isAdmin ? (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-xs min-h-[40px] cursor-pointer"
                title="Login Operator / Admin"
                type="button"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Login Admin</span>
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
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
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>Koneksi telemetri terputus — mencoba menghubungkan kembali secara otomatis…</span>
              </div>
              <button
                onClick={fetchStatus}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 font-semibold transition-colors cursor-pointer"
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
                    level2Slots={data?.level2_slots}
                    onEmergencyReleaseIdle={handleEmergencyReleaseIdle}
                    onSwitchLabMode={handleSwitchLabMode}
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
                      onSweepZombies={handleSweepZombies}
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
                  level2Slots={data?.level2_slots}
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

      {/* Floating Modern Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md w-full px-4 sm:px-0 motion-view-enter">
          <div className={`p-4 rounded-xl border shadow-lg flex items-start gap-3.5 bg-white transition-all ${
            toast.type === 'success' ? 'border-emerald-200' :
            toast.type === 'error' ? 'border-rose-200' :
            toast.type === 'warning' ? 'border-amber-200' :
            'border-sky-200'
          }`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
              toast.type === 'error' ? 'bg-rose-50 text-rose-600' :
              toast.type === 'warning' ? 'bg-amber-50 text-amber-600' :
              'bg-sky-50 text-sky-600'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
               toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> :
               toast.type === 'warning' ? <AlertCircle className="w-4 h-4" /> :
               <Info className="w-4 h-4" />}
            </div>

            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className="font-sans font-bold text-xs text-slate-900 tracking-tight mb-0.5">
                  {toast.title}
                </h4>
              )}
              <p className="font-sans text-xs text-slate-700 leading-relaxed">
                {toast.message}
              </p>
              {toast.details && (
                <p className="font-sans text-[11px] text-slate-500 mt-1.5 leading-normal border-t border-slate-100 pt-1.5">
                  {toast.details}
                </p>
              )}
            </div>

            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
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
      <ModeSwitchModal
        isOpen={modeSwitchModal.isOpen}
        targetMode={modeSwitchModal.targetMode}
        currentMode={data?.level2_slots?.lab_mode || 'ai'}
        activeCount={data?.level2_slots?.active_count || 0}
        onConfirm={handleConfirmModeSwitch}
        onClose={() => setModeSwitchModal({ isOpen: false, targetMode: null, isSubmitting: false })}
        isSubmitting={modeSwitchModal.isSubmitting}
      />
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
