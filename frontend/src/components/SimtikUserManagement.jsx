import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Zap, RotateCcw, Shield, ShieldCheck, Search, CheckCircle2,
  AlertCircle, Clock, UserCheck, UserX, Sparkles, KeyRound, RefreshCw,
  Lock, LogOut, ChevronLeft, ChevronRight, Activity, Cpu, MoreVertical,
  Database, Server, Ban
} from 'lucide-react';

const LiveCountdown = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(expiresAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        let timeString = '';
        if (h > 0) timeString += `${h}h `;
        if (m > 0 || h > 0) timeString += `${m}m `;
        timeString += `${s}s`;
        setTimeLeft(timeString);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return <span className="text-amber-400 font-semibold">{timeLeft || '...'}</span>;
};

export default function SimtikUserManagement({ isAdmin, showToast }) {
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeTab, setActiveTab] = useState('users');
  const [auditLogs, setAuditLogs] = useState([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [capacity, setCapacity] = useState({ used_slots: 0, total_slots: 0 });

  const [boostModal, setBoostModal] = useState({
    isOpen: false,
    nim: null,
    nama: '',
    hours: 4,
    reason: 'Kebutuhan Skripsi & Training Model AI'
  });

  const [testLoginModal, setTestLoginModal] = useState({
    isOpen: false,
    nim: '',
    password: '',
    loading: false,
    result: null
  });

  const getAuthHeaders = useCallback((isJson = true) => {
    const headers = { 'Authorization': `Bearer ${adminToken}` };
    if (isJson) headers['Content-Type'] = 'application/json';
    return headers;
  }, [adminToken]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        localStorage.setItem('adminToken', data.token);
        setAdminToken(data.token);
      } else {
        setLoginError('PIN salah atau gagal login.');
      }
    } catch (err) {
      setLoginError('Error: ' + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken('');
    window.location.reload();
  };

  const fetchCapacity = useCallback(async () => {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/stats/capacity', { headers: getAuthHeaders(false) });
      if (res.ok) {
        const data = await res.json();
        setCapacity({ used_slots: data.used_slots || 0, total_slots: data.total_slots || 0 });
      }
    } catch (e) {
      console.error(e);
    }
  }, [adminToken, getAuthHeaders]);

  const fetchStudents = useCallback(async () => {
    if (!adminToken) return;
    try {
      setLoading(true);
      const res = await fetch('/api/users/students', { headers: getAuthHeaders(false) });
      const data = await res.json();
      if (res.ok && data.success) {
        setStudents(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  }, [adminToken, getAuthHeaders]);

  const fetchAuditLogs = useCallback(async () => {
    if (!adminToken) return;
    try {
      setLoading(true);
      const res = await fetch('/api/audit-logs', { headers: getAuthHeaders(false) });
      const data = await res.json();
      if (res.ok) {
        setAuditLogs(data.logs || data || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [adminToken, getAuthHeaders]);

  useEffect(() => {
    if (adminToken) {
      fetchCapacity();
      fetchStudents();
      const capInterval = setInterval(fetchCapacity, 10000);
      const studInterval = setInterval(fetchStudents, 15000);
      return () => {
        clearInterval(capInterval);
        clearInterval(studInterval);
      };
    }
  }, [adminToken, fetchCapacity, fetchStudents]);

  useEffect(() => {
    if (activeTab === 'audit' && adminToken) {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs, adminToken]);

  const handleBoost = async (e) => {
    e.preventDefault();
    if (!boostModal.nim) return;
    try {
      const res = await fetch('/api/users/boost', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          nim: boostModal.nim,
          hours: Number(boostModal.hours),
          reason: boostModal.reason
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast?.(`NIM ${boostModal.nim} berhasil di-boost!`, 'success');
        setBoostModal({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' });
        fetchStudents();
        fetchCapacity();
      } else {
        showToast?.(data.detail || 'Gagal melakukan boost.', 'error');
      }
    } catch (err) {
      showToast?.('Error: ' + err.message, 'error');
    }
  };

  const handleUnboost = async (nim) => {
    if (!confirm(`Kembalikan NIM ${nim} ke Mode Normal?`)) return;
    try {
      const res = await fetch('/api/users/unboost', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nim })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast?.(`NIM ${nim} dikembalikan ke Mode Normal.`, 'info');
        fetchStudents();
        fetchCapacity();
      } else {
        showToast?.(data.detail || 'Gagal unboost.', 'error');
      }
    } catch (err) {
      showToast?.('Error: ' + err.message, 'error');
    }
  };

  const handleToggleAdmin = async (nim) => {
    try {
      const res = await fetch('/api/users/toggle-admin', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nim })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast?.(data.message, 'success');
        fetchStudents();
      }
    } catch (err) {
      showToast?.('Error: ' + err.message, 'error');
    }
  };

  const handleToggleActive = async (nim) => {
    try {
      const res = await fetch('/api/users/toggle-active', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nim })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast?.(data.message, 'info');
        fetchStudents();
      }
    } catch (err) {
      showToast?.('Error: ' + err.message, 'error');
    }
  };

  const handleTestSimtik = async (e) => {
    e.preventDefault();
    setTestLoginModal((prev) => ({ ...prev, loading: true, result: null }));
    try {
      const res = await fetch('/api/auth/simtik', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          nim: testLoginModal.nim,
          password: testLoginModal.password
        })
      });
      const data = await res.json();
      setTestLoginModal((prev) => ({
        ...prev,
        loading: false,
        result: {
          success: res.ok && data.success,
          message: data.message || 'Gagal login ke SIMTIK'
        }
      }));
      if (res.ok && data.success) {
        fetchStudents();
      }
    } catch (err) {
      setTestLoginModal((prev) => ({
        ...prev,
        loading: false,
        result: { success: false, message: 'Error: ' + err.message }
      }));
    }
  };

  if (!adminToken) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-5 z-50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-slate-950"></div>
        <div className="relative p-10 max-w-sm w-full text-center bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-6 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]">
            <Lock className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Admin Portal</h2>
          <p className="text-sm text-slate-400 mb-8">Secure access required</p>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter PIN"
                className="w-full px-5 py-3.5 rounded-2xl bg-slate-950/50 border border-slate-700 text-center text-white text-xl tracking-[0.5em] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono placeholder:tracking-normal placeholder:text-slate-600"
                autoFocus
              />
            </div>
            {loginError && <div className="text-rose-400 text-sm font-medium bg-rose-500/10 py-2 rounded-lg">{loginError}</div>}
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] cursor-pointer"
            >
              Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.nim.toLowerCase().includes(q) || (s.nama && s.nama.toLowerCase().includes(q));
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const priorityCount = students.filter((s) => s.is_priority).length;
  
  const isCapacityFull = capacity.used_slots >= capacity.total_slots && capacity.total_slots > 0;
  const capacityPercent = capacity.total_slots > 0 ? (capacity.used_slots / capacity.total_slots) * 100 : 0;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-300 font-sans">
      {/* Left Sidebar */}
      <aside className="w-64 flex flex-col justify-between border-r border-slate-800 bg-slate-950">
        <div>
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Database className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight">AI Lab UMPO</h1>
              <p className="text-xs text-slate-500 font-medium">Console</p>
            </div>
          </div>
          
          <nav className="px-4 space-y-2 mt-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'users' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" /> User Management
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'audit' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" /> Audit Logs
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-900 rounded-l-3xl border-l border-slate-800 shadow-2xl relative">
        <header className="px-8 py-6 flex items-center justify-between border-b border-slate-800/50">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {activeTab === 'users' ? 'User Management' : 'Audit Logs'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {activeTab === 'users' ? 'Manage access and system resources.' : 'Monitor system activity and changes.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTestLoginModal({ isOpen: true, nim: '', password: '', loading: false, result: null })}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 transition text-slate-300 hover:text-white"
              title="Test Authentication"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button
              onClick={() => { fetchStudents(); fetchCapacity(); }}
              disabled={loading}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 transition text-slate-300 hover:text-white"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {activeTab === 'users' && (
            <>
              {/* Metrics Bar (Bento Grid) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: GPU Capacity */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Cpu className="w-4 h-4" />
                      <h3 className="text-sm font-medium">GPU 0 Capacity</h3>
                    </div>
                    <span className="text-xs font-bold text-white">{capacity.used_slots} / {capacity.total_slots} Slots</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2.5 mt-2 border border-slate-800 overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full ${capacityPercent >= 100 ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                      style={{ width: `${Math.min(100, capacityPercent)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Card 2: Total Users */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-1">Total Users</h3>
                    <div className="text-3xl font-bold text-white">{students.length}</div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
                    <Users className="w-6 h-6 text-slate-400" />
                  </div>
                </div>

                {/* Card 3: Active Priority Users */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-1">Priority Users</h3>
                    <div className="text-3xl font-bold text-amber-400">{priorityCount}</div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <Zap className="w-6 h-6 text-amber-400" />
                  </div>
                </div>
              </div>

              {/* Table Area */}
              <div className="bg-slate-800/30 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                  <div className="relative max-w-sm w-full">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      placeholder="Search users..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider font-medium">
                        <th className="px-6 py-4 border-b border-slate-700/50">User Info</th>
                        <th className="px-6 py-4 border-b border-slate-700/50">Badges</th>
                        <th className="px-6 py-4 border-b border-slate-700/50">Boost Timer</th>
                        <th className="px-6 py-4 border-b border-slate-700/50">Last Login</th>
                        <th className="px-6 py-4 border-b border-slate-700/50 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {paginatedStudents.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-sm">
                            No matching users found.
                          </td>
                        </tr>
                      ) : (
                        paginatedStudents.map((s) => (
                          <tr key={s.nim} className="hover:bg-slate-800/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                                  {s.nama ? s.nama.charAt(0) : s.nim.slice(-1)}
                                </div>
                                <div>
                                  <div className="font-semibold text-white text-sm">
                                    {s.nama || 'No Name'}
                                  </div>
                                  <div className="text-xs text-slate-500">{s.nim}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {s.is_active ? (
                                  <span className="rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    Active
                                  </span>
                                ) : (
                                  <span className="rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                    Blocked
                                  </span>
                                )}
                                {s.is_priority && (
                                  <span className="rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    Priority
                                  </span>
                                )}
                                {s.is_admin && (
                                  <span className="rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    Admin
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-4 text-xs font-mono">
                              {s.is_priority && s.priority_expires_at ? (
                                <LiveCountdown expiresAt={s.priority_expires_at} />
                              ) : (
                                <span className="text-slate-600">--</span>
                              )}
                            </td>

                            <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                              {s.last_login ? s.last_login.slice(0, 16).replace('T', ' ') : 'Never'}
                            </td>

                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {s.is_priority ? (
                                  <button
                                    onClick={() => handleUnboost(s.nim)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                                    title="Revoke Priority"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setBoostModal({ isOpen: true, nim: s.nim, nama: s.nama, hours: 4, reason: 'Kebutuhan Riset / Skripsi' })}
                                    disabled={isCapacityFull}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                      isCapacityFull 
                                        ? 'text-slate-600 cursor-not-allowed' 
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-amber-400'
                                    }`}
                                    title={isCapacityFull ? 'Capacity Full' : 'Boost User'}
                                  >
                                    <Zap className="w-4 h-4" />
                                  </button>
                                )}

                                <button
                                  onClick={() => handleToggleAdmin(s.nim)}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-indigo-400 transition-colors"
                                  title="Toggle Admin Status"
                                >
                                  <Shield className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleToggleActive(s.nim)}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
                                  title={s.is_active ? "Block User" : "Activate User"}
                                >
                                  {s.is_active ? <Ban className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                {totalPages > 0 && (
                  <div className="p-4 border-t border-slate-700/50 flex items-center justify-between bg-slate-900/20">
                    <span className="text-xs text-slate-500">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-800 text-slate-400 disabled:opacity-30 hover:bg-slate-700 transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-white font-medium px-2">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-800 text-slate-400 disabled:opacity-30 hover:bg-slate-700 transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'audit' && (
            <div className="bg-slate-800/30 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider font-medium">
                      <th className="px-6 py-4 border-b border-slate-700/50">Timestamp</th>
                      <th className="px-6 py-4 border-b border-slate-700/50">Admin</th>
                      <th className="px-6 py-4 border-b border-slate-700/50">Action</th>
                      <th className="px-6 py-4 border-b border-slate-700/50 w-full">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-slate-500 text-sm">
                          No audit logs found.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log, i) => (
                        <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : '--'}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-white">
                            {log.admin_username || log.admin_nim || '--'}
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-600 tracking-wide">
                              {log.action || '--'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400">
                            {log.details || log.target || '--'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      
      {/* Boost Modal */}
      {boostModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Zap className="w-6 h-6 text-amber-400 fill-current" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Enable Priority</h3>
                <p className="text-sm text-slate-400">Target: <span className="text-white font-mono">{boostModal.nim}</span></p>
              </div>
            </div>

            <form onSubmit={handleBoost} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Duration</label>
                <select
                  value={boostModal.hours}
                  onChange={(e) => setBoostModal((prev) => ({ ...prev, hours: Number(e.target.value) }))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 transition-all appearance-none"
                >
                  <option value={1}>1 Hour</option>
                  <option value={2}>2 Hours</option>
                  <option value={4}>4 Hours (Recommended)</option>
                  <option value={6}>6 Hours</option>
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Justification</label>
                <input
                  type="text"
                  value={boostModal.reason}
                  onChange={(e) => setBoostModal((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 transition-all"
                  placeholder="e.g. Model Training"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setBoostModal({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' })}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/20 transition-colors"
                >
                  Confirm Boost
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test SIMTIK Modal */}
      {testLoginModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <KeyRound className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Test Authentication</h3>
                <p className="text-sm text-slate-400">Validate SIMTIK connection</p>
              </div>
            </div>

            <form onSubmit={handleTestSimtik} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">NIM</label>
                <input
                  type="text"
                  required
                  value={testLoginModal.nim}
                  onChange={(e) => setTestLoginModal((prev) => ({ ...prev, nim: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:border-indigo-500 transition-all"
                  placeholder="Enter NIM"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={testLoginModal.password}
                  onChange={(e) => setTestLoginModal((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:border-indigo-500 transition-all"
                  placeholder="Enter Password"
                />
              </div>

              {testLoginModal.result && (
                <div className={`p-4 rounded-xl text-sm flex items-start gap-3 border ${
                  testLoginModal.result.success 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {testLoginModal.result.success ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                  <span className="leading-relaxed">{testLoginModal.result.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setTestLoginModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={testLoginModal.loading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-600/20 transition-colors disabled:opacity-50 disabled:shadow-none"
                >
                  {testLoginModal.loading ? 'Authenticating...' : 'Test Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
