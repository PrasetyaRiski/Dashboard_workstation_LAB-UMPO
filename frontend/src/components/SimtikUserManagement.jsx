import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Zap,
  RotateCcw,
  Shield,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  UserX,
  Sparkles,
  KeyRound,
  RefreshCw
} from 'lucide-react';

export default function SimtikUserManagement({ isAdmin, showToast }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal Boost State
  const [boostModal, setBoostModal] = useState({
    isOpen: false,
    nim: null,
    nama: '',
    hours: 4,
    reason: 'Kebutuhan Skripsi & Training Model AI'
  });

  // Modal Test Login SIMTIK
  const [testLoginModal, setTestLoginModal] = useState({
    isOpen: false,
    nim: '',
    password: '',
    loading: false,
    result: null
  });

  // Fetch daftar mahasiswa dari backend
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users/students');
      const data = await res.json();
      if (res.ok && data.success) {
        setStudents(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
    const interval = setInterval(fetchStudents, 15000); // Polling update status tiap 15 detik
    return () => clearInterval(interval);
  }, [fetchStudents]);

  // Handler Boost Mahasiswa
  const handleBoost = async (e) => {
    e.preventDefault();
    if (!boostModal.nim) return;
    try {
      const res = await fetch('/api/users/boost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nim: boostModal.nim,
          hours: Number(boostModal.hours),
          reason: boostModal.reason
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast?.(`NIM ${boostModal.nim} berhasil di-boost ke Mode Prioritas (20 Core / 70GB / GPU 0)!`, 'success');
        setBoostModal({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' });
        fetchStudents();
      } else {
        showToast?.(data.detail || 'Gagal melakukan boost prioritas.', 'error');
      }
    } catch (err) {
      showToast?.('Error: ' + err.message, 'error');
    }
  };

  // Handler Unboost (Kembali ke Normal)
  const handleUnboost = async (nim) => {
    if (!confirm(`Kembalikan NIM ${nim} ke Mode Normal (2 Core, 3GB RAM, GPU 1)?`)) return;
    try {
      const res = await fetch('/api/users/unboost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast?.(`NIM ${nim} dikembalikan ke Mode Normal.`, 'info');
        fetchStudents();
      } else {
        showToast?.(data.detail || 'Gagal unboost.', 'error');
      }
    } catch (err) {
      showToast?.('Error: ' + err.message, 'error');
    }
  };

  // Handler Toggle Admin
  const handleToggleAdmin = async (nim) => {
    try {
      const res = await fetch('/api/users/toggle-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Handler Toggle Active
  const handleToggleActive = async (nim) => {
    try {
      const res = await fetch('/api/users/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Handler Test Login SIMTIK
  const handleTestSimtik = async (e) => {
    e.preventDefault();
    setTestLoginModal((prev) => ({ ...prev, loading: true, result: null }));
    try {
      const res = await fetch('/api/auth/simtik', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.nim.toLowerCase().includes(q) || (s.nama && s.nama.toLowerCase().includes(q));
  });

  const priorityCount = students.filter((s) => s.is_priority).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner & Action */}
      <div className="panel-raised p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Manajemen Pengguna Terintegrasi SIMTIK UMPO
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Mahasiswa otomatis terdaftar saat login pertama kali menggunakan NIM & Password SIMTIK. Admin dapat memprioritaskan performa (Dynamic QoS).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTestLoginModal({ isOpen: true, nim: '', password: '', loading: false, result: null })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 transition text-xs font-medium cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Uji Otentikasi SIMTIK
          </button>
          <button
            onClick={fetchStudents}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition text-xs font-medium cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="panel-raised p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase">Total Mahasiswa Terdaftar</span>
            <div className="text-xl font-bold text-white mt-0.5">{students.length}</div>
          </div>
          <Users className="w-6 h-6 text-slate-600" />
        </div>

        <div className="panel-raised p-4 flex items-center justify-between border-l-2 border-l-amber-500">
          <div>
            <span className="text-[11px] font-mono text-amber-400 uppercase">Mode Prioritas Aktif (Boosted)</span>
            <div className="text-xl font-bold text-amber-300 mt-0.5">{priorityCount} User</div>
            <span className="text-[10px] text-slate-400">Jatah: 20 Core, 70G RAM, GPU 0</span>
          </div>
          <Zap className="w-6 h-6 text-amber-400 animate-pulse" />
        </div>

        <div className="panel-raised p-4 flex items-center justify-between border-l-2 border-l-emerald-500">
          <div>
            <span className="text-[11px] font-mono text-emerald-400 uppercase">Mode Normal (Praktikan)</span>
            <div className="text-xl font-bold text-emerald-300 mt-0.5">{students.length - priorityCount} User</div>
            <span className="text-[10px] text-slate-400">Jatah: 2 Core, 3G RAM, GPU 1</span>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>
      </div>

      {/* Student Table Panel */}
      <div className="panel-raised p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari NIM atau Nama mahasiswa..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Menampilkan {filteredStudents.length} dari {students.length} mahasiswa
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                <th className="pb-3 font-semibold">NIM & Mahasiswa</th>
                <th className="pb-3 font-semibold">Mode Hardware (QoS)</th>
                <th className="pb-3 font-semibold">Sisa Waktu Boost</th>
                <th className="pb-3 font-semibold">Hak Dashboard</th>
                <th className="pb-3 font-semibold">Status Akun</th>
                <th className="pb-3 font-semibold">Login Terakhir</th>
                <th className="pb-3 text-right font-semibold">Aksi Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    Belum ada data mahasiswa terdaftar. Mahasiswa akan otomatis muncul saat login ke JupyterHub dengan akun SIMTIK.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.nim} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/20">
                          {s.nim.slice(-2)}
                        </div>
                        <div>
                          <div>{s.nim}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{s.nama}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3">
                      {s.is_priority ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10">
                          <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                          PRIORITAS (20C / 70G / GPU 0)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          Normal (2C / 3G / GPU 1)
                        </span>
                      )}
                    </td>

                    <td className="py-3 text-slate-300 text-[11px]">
                      {s.is_priority && s.priority_expires_at ? (
                        <span className="text-amber-400 flex items-center gap-1 font-semibold">
                          <Clock className="w-3 h-3" />
                          s/d {s.priority_expires_at.slice(11, 16)} WIB
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    <td className="py-3">
                      {s.is_admin ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Admin Lab
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Mahasiswa</span>
                      )}
                    </td>

                    <td className="py-3">
                      {s.is_active ? (
                        <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Aktif
                        </span>
                      ) : (
                        <span className="text-rose-400 text-[10px] font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Diblokir
                        </span>
                      )}
                    </td>

                    <td className="py-3 text-slate-400 text-[10px]">
                      {s.last_login ? s.last_login.slice(0, 16) : '-'}
                    </td>

                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {s.is_priority ? (
                          <button
                            onClick={() => handleUnboost(s.nim)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer text-[11px]"
                            title="Kembalikan ke Mode Normal"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reset
                          </button>
                        ) : (
                          <button
                            onClick={() => setBoostModal({ isOpen: true, nim: s.nim, nama: s.nama, hours: 4, reason: 'Kebutuhan Riset / Skripsi' })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition cursor-pointer text-[11px] font-bold"
                            title="Tingkatkan performa ke Monster Mode"
                          >
                            <Zap className="w-3 h-3 text-amber-400" />
                            Boost
                          </button>
                        )}

                        <button
                          onClick={() => handleToggleAdmin(s.nim)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${s.is_admin ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
                          title={s.is_admin ? 'Cabut hak Admin' : 'Jadikan Admin Dashboard'}
                        >
                          <Shield className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => handleToggleActive(s.nim)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${s.is_active ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-rose-400' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}
                          title={s.is_active ? 'Blokir Akses' : 'Buka Blokir'}
                        >
                          {s.is_active ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Boost Prioritas */}
      {boostModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Zap className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Aktifkan Mode Prioritas (Boost)</h3>
                <p className="text-xs text-slate-400 font-mono">
                  Mahasiswa: <span className="text-amber-400 font-semibold">{boostModal.nim}</span> ({boostModal.nama})
                </p>
              </div>
            </div>

            <form onSubmit={handleBoost} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                <div className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Spesifikasi yang Akan Didapat:
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                  <div className="bg-slate-900 p-2 rounded-lg text-center border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">CPU</span>
                    <span className="text-white font-bold">20 Core</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg text-center border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">RAM</span>
                    <span className="text-white font-bold">70 GB</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg text-center border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">GPU</span>
                    <span className="text-amber-400 font-bold">GPU 0 (16G)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Durasi Mode Prioritas
                </label>
                <select
                  value={boostModal.hours}
                  onChange={(e) => setBoostModal((prev) => ({ ...prev, hours: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-500 transition"
                >
                  <option value={1}>1 Jam</option>
                  <option value={2}>2 Jam</option>
                  <option value={4}>4 Jam (Rekomendasi Skripsi)</option>
                  <option value={6}>6 Jam</option>
                  <option value={12}>12 Jam (Training Semalaman)</option>
                  <option value={24}>24 Jam (1 Hari Penuh)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Catatan / Alasan Prioritas
                </label>
                <input
                  type="text"
                  value={boostModal.reason}
                  onChange={(e) => setBoostModal((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Contoh: Training YOLO Skripsi..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-amber-500 transition font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBoostModal({ isOpen: false, nim: null, nama: '', hours: 4, reason: '' })}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Aktifkan Mode Prioritas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Uji Otentikasi SIMTIK */}
      {testLoginModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Uji Otentikasi SIMTIK UMPO</h3>
                <p className="text-xs text-slate-400">
                  Tes simulasi pengecekan NIM & Password langsung ke portal <span className="text-indigo-400 font-mono">simtik.umpo.ac.id</span>.
                </p>
              </div>
            </div>

            <form onSubmit={handleTestSimtik} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">NIM Mahasiswa</label>
                <input
                  type="text"
                  required
                  value={testLoginModal.nim}
                  onChange={(e) => setTestLoginModal((prev) => ({ ...prev, nim: e.target.value }))}
                  placeholder="Contoh: 21533001"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password SIMTIK</label>
                <input
                  type="password"
                  required
                  value={testLoginModal.password}
                  onChange={(e) => setTestLoginModal((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Masukkan password akun SIMTIK..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 transition font-mono"
                />
              </div>

              {testLoginModal.result && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${testLoginModal.result.success ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'}`}>
                  {testLoginModal.result.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{testLoginModal.result.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTestLoginModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={testLoginModal.loading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition disabled:opacity-50 shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  {testLoginModal.loading ? 'Memeriksa SIMTIK...' : 'Uji Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
