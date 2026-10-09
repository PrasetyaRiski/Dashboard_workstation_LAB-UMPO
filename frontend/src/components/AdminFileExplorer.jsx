import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Folder, File, ArrowUp, Download, Copy, X, Search, User 
} from 'lucide-react';

export default function AdminFileExplorer({ 
  isAdmin, 
  adminToken, 
  students, 
  showToast 
}) {
  const [selectedUserForFiles, setSelectedUserForFiles] = useState(null);
  const [explorerPath, setExplorerPath] = useState('');
  const [explorerFiles, setExplorerFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const getAuthHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken || localStorage.getItem('adminToken') || ''}`
    };
  }, [adminToken]);

  const fetchExplorerFiles = useCallback(async (username, path) => {
    try {
      const res = await fetch(`/api/users/${username}/files?path=${encodeURIComponent(path)}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setExplorerFiles(data.files || []);
      } else {
        showToast(data.detail || 'Gagal mengambil file', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }, [getAuthHeaders, showToast]);

  useEffect(() => {
    if (selectedUserForFiles) {
      fetchExplorerFiles(selectedUserForFiles, explorerPath);
    }
  }, [selectedUserForFiles, explorerPath, fetchExplorerFiles]);

  const handleDownloadFile = async (filepath) => {
    try {
      const res = await fetch(`/api/users/${selectedUserForFiles}/download?filepath=${encodeURIComponent(filepath)}`, {
        headers: { 'Authorization': `Bearer ${adminToken || localStorage.getItem('adminToken') || ''}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filepath.split('/').pop();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        showToast('Gagal mendownload file', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleCopyToShared = async (filepath) => {
    try {
      const res = await fetch(`/api/users/${selectedUserForFiles}/copy-to-shared`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ filepath })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Berhasil disalin ke shared', 'success');
      } else {
        showToast(data.detail || 'Gagal menyalin', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (students || []).filter(u => {
      const name = (u.nama || '').toLowerCase();
      const nim = (u.nim || '').toLowerCase();
      const username = (u.username || '').toLowerCase();
      return name.includes(q) || nim.includes(q) || username.includes(q);
    });
  }, [searchQuery, students]);

  return (
    <div className="flex h-full min-h-[500px] gap-4 w-full">
      {/* Left Pane - User List */}
      <div className="w-1/3 min-w-[300px] max-w-sm flex flex-col bg-[#181b25] border border-[#46455430] rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-[#46455430] bg-[#1a1d27]">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-blue-400" />
            Users
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari NIM atau Nama..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0f111a] border border-[#46455430] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredUsers.map(u => {
            const identifier = u.nim || u.username;
            const isSelected = selectedUserForFiles === identifier;
            return (
              <button
                key={identifier}
                onClick={() => {
                  setSelectedUserForFiles(identifier);
                  setExplorerPath('');
                }}
                className={`w-full text-left flex flex-col p-3 rounded-xl transition-colors ${
                  isSelected 
                    ? 'bg-blue-500/10 border-blue-500/30 border' 
                    : 'hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className={`font-bold font-mono text-sm ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>
                    {identifier}
                  </span>
                  {u.dataset_shared && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Shared
                    </span>
                  )}
                </div>
                {u.nama && (
                  <span className="text-xs text-slate-400 truncate mt-1">
                    {u.nama}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right Pane - File Explorer */}
      <div className="flex-1 flex flex-col bg-[#181b25] border border-[#46455430] rounded-2xl shadow-xl overflow-hidden">
        {selectedUserForFiles ? (
          <>
            <div className="p-4 border-b border-[#46455430] bg-[#1a1d27] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900/30 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">File Explorer: {selectedUserForFiles}</h3>
                  <p className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                    Path: /{explorerPath}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedUserForFiles(null); setExplorerPath(''); setExplorerFiles([]); }}
                className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition-colors"
                title="Close Explorer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#181b25] z-10">
                  <tr className="text-slate-400 font-mono text-xs font-semibold border-b border-[#46455430]">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Modified</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#46455430] font-mono text-xs">
                  {explorerPath !== '' && (
                    <tr className="hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => {
                      const parts = explorerPath.split('/').filter(Boolean);
                      parts.pop();
                      setExplorerPath(parts.join('/'));
                    }}>
                      <td className="py-3 px-4 flex items-center gap-2 text-blue-400 font-bold">
                        <ArrowUp className="w-4 h-4" />
                        ..
                      </td>
                      <td className="py-3 px-4 text-slate-500">-</td>
                      <td className="py-3 px-4 text-slate-500">-</td>
                      <td className="py-3 px-4"></td>
                    </tr>
                  )}
                  {explorerFiles.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-500">Folder ini kosong.</td>
                    </tr>
                  ) : (
                    explorerFiles.map((file, idx) => {
                      const isDir = file.is_dir;
                      const fullPath = explorerPath ? `${explorerPath}/${file.name}` : file.name;
                      return (
                        <tr key={idx} className={`hover:bg-slate-800/50 transition-colors ${isDir ? 'cursor-pointer' : ''}`} onClick={() => {
                          if (isDir) {
                            setExplorerPath(fullPath);
                          }
                        }}>
                          <td className="py-3 px-4 flex items-center gap-2">
                            {isDir ? <Folder className="w-4 h-4 text-amber-400" /> : <File className="w-4 h-4 text-slate-300" />}
                            <span className={isDir ? 'text-amber-400 font-bold' : 'text-slate-200'}>{file.name}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">{isDir ? '-' : (file.size >= 1048576 ? (file.size / 1048576).toFixed(1) + ' MB' : (file.size >= 1024 ? (file.size / 1024).toFixed(1) + ' KB' : file.size + ' B'))}</td>
                          <td className="py-3 px-4 text-slate-400">
                            {file.mtime ? new Date(file.mtime * 1000).toLocaleString() : '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!isDir && (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDownloadFile(fullPath); }}
                                  className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-all"
                                  title="Download File"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCopyToShared(fullPath); }}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all"
                                  title="Copy to Shared"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Folder className="w-16 h-16 text-slate-700 mb-4" />
            <p className="text-lg">Pilih user dari panel kiri untuk membuka File Explorer</p>
          </div>
        )}
      </div>
    </div>
  );
}
