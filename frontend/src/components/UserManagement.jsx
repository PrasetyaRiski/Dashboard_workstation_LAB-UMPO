import React, { useState } from 'react';
import { Users, Key, Check, Shield, AlertCircle } from 'lucide-react';

export default function UserManagement({ users, onResetPassword }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenReset = (uname) => {
    setSelectedUser(uname);
    setNewPassword('');
    setStatusMsg(null);
  };

  const handleClose = () => {
    setSelectedUser(null);
    setNewPassword('');
    setStatusMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      setStatusMsg({ type: 'error', text: 'Password minimal 4 karakter' });
      return;
    }
    setIsSubmitting(true);
    const res = await onResetPassword(selectedUser, newPassword);
    setIsSubmitting(false);
    if (res.success) {
      setStatusMsg({ type: 'success', text: res.message });
      setTimeout(() => {
        handleClose();
      }, 1500);
    } else {
      setStatusMsg({ type: 'error', text: res.message || 'Gagal mereset password' });
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white tracking-tight">Lab User Management & Quotas</h2>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Total Users: {users ? users.length : 0}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
              <th className="pb-3 font-semibold">User</th>
              <th className="pb-3 font-semibold">Tier</th>
              <th className="pb-3 font-semibold">GPU Target</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold">IP / Terminal</th>
              <th className="pb-3 font-semibold">RAM Usage</th>
              <th className="pb-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {users && users.map((u) => (
              <tr key={u.uid} className="hover:bg-slate-800/30 transition">
                <td className="py-3 font-bold text-white">
                  {u.username}
                  <span className="text-[10px] text-slate-500 font-normal ml-1.5">({u.uid})</span>
                </td>
                <td className="py-3">
                  <span className={'px-2 py-0.5 rounded text-[10px] font-semibold ' + (u.tier === 'Riset' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-300')}>
                    {u.tier}
                  </span>
                </td>
                <td className="py-3 font-semibold">
                  <span className={u.gpu === 'GPU 0' ? 'text-indigo-400' : 'text-emerald-400'}>
                    {u.gpu}
                  </span>
                </td>
                <td className="py-3">
                  <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ' + (u.status === 'Online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800/60 text-slate-500')}>
                    <span className={'w-1.5 h-1.5 rounded-full ' + (u.status === 'Online' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500')} />
                    {u.status}
                  </span>
                </td>
                <td className="py-3 text-slate-400">
                  {u.status === 'Online' ? `${u.ip} (${u.terminal})` : '-'}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min(u.ram_percent || 0, 100)}%` }}
                      />
                    </div>
                    <span className="text-slate-300">
                      {u.ram_used_mb > 1024 ? `${(u.ram_used_mb / 1024).toFixed(1)} GB` : `${u.ram_used_mb} MB`}
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      / {u.ram_max_mb > 1024 ? `${(u.ram_max_mb / 1024).toFixed(0)} GB` : `${u.ram_max_mb} MB`}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => handleOpenReset(u.username)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Reset Pass
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset Password Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset Password Pengguna</h3>
                <p className="text-xs text-slate-400 font-mono">User: <span className="text-indigo-400 font-semibold">{selectedUser}</span></p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password Baru
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password baru..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500 transition font-mono"
                  autoFocus
                />
              </div>

              {statusMsg && (
                <div className={'p-3 rounded-xl text-xs flex items-center gap-2 ' + (statusMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400')}>
                  {statusMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition disabled:opacity-50 shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
