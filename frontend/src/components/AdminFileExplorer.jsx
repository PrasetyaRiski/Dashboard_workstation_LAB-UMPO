import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Folder, File, ArrowUp, ArrowLeft, Download, Copy, X, Search, User,
  Trash2, Edit, Scissors, Upload, FolderPlus, Clipboard, Database,
  AlertCircle, RefreshCw, Share2, Lock
} from 'lucide-react';

export default function AdminFileExplorer({ 
  isAdmin, 
  adminToken, 
  students = [], 
  systemUsers = [],
  showToast,
  onOpenLogin
}) {
  const [selectedUserForFiles, setSelectedUserForFiles] = useState(null);
  const [explorerPath, setExplorerPath] = useState('');
  const [explorerFiles, setExplorerFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [notCreatedMsg, setNotCreatedMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Clipboard state for Copy/Cut/Paste
  const [clipboard, setClipboard] = useState({ path: null, type: null, user: null }); // type: 'copy' | 'cut'
  
  // Modals state
  const [renameModal, setRenameModal] = useState({ isOpen: false, oldPath: '', currentName: '', newName: '', isSubmitting: false });
  const [newFolderModal, setNewFolderModal] = useState({ isOpen: false, folderName: '', isSubmitting: false });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, path: '', name: '', isSubmitting: false });

  const fileInputRef = useRef(null);

  const getAuthHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken || localStorage.getItem('adminToken') || ''}`
    };
  }, [adminToken]);

  const fetchExplorerFiles = useCallback(async (username, path) => {
    if (!username) return;
    setIsLoadingFiles(true);
    setNotCreatedMsg(null);
    try {
      const res = await fetch(`/api/users/${username}/files?path=${encodeURIComponent(path)}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.not_created) {
          setExplorerFiles([]);
          setNotCreatedMsg(data.message || 'Direktori pengguna belum dibuat di sistem.');
        } else {
          setExplorerFiles(data.files || []);
        }
      } else {
        setExplorerFiles([]);
        showToast(data.detail || 'Gagal memuat daftar file', 'error');
      }
    } catch (err) {
      showToast('Gagal menghubungi server: ' + err.message, 'error');
    } finally {
      setIsLoadingFiles(false);
    }
  }, [getAuthHeaders, showToast]);

  useEffect(() => {
    if (selectedUserForFiles) {
      fetchExplorerFiles(selectedUserForFiles, explorerPath);
    }
  }, [selectedUserForFiles, explorerPath, fetchExplorerFiles]);

  const reloadFiles = () => {
    if (selectedUserForFiles) fetchExplorerFiles(selectedUserForFiles, explorerPath);
  };

  const handleDownloadFile = async (filepath) => {
    showToast('Menyiapkan berkas untuk diunduh…', 'info');
    try {
      const res = await fetch(`/api/users/${selectedUserForFiles}/download?filepath=${encodeURIComponent(filepath)}`, {
        headers: { 'Authorization': `Bearer ${adminToken || localStorage.getItem('adminToken') || ''}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filepath.split('/').pop() || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast('Berkas berhasil diunduh.', 'success');
      } else {
        const errJson = await res.json().catch(() => ({}));
        showToast(errJson.detail || 'Gagal mengunduh berkas', 'error');
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
        showToast('Berkas berhasil disalin ke direktori bersama (dataset_shared)', 'success');
      } else {
        showToast(data.detail || 'Gagal menyalin ke dataset_shared', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', explorerPath);

    showToast(`Mengunggah berkas ${file.name}…`, 'info');
    try {
      const res = await fetch(`/api/users/${selectedUserForFiles}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken || localStorage.getItem('adminToken') || ''}`
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Berkas ${file.name} berhasil diunggah.`, 'success');
        reloadFiles();
      } else {
        showToast(data.detail || 'Gagal mengunggah berkas', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
    e.target.value = '';
  };

  const handleCreateFolder = async (e) => {
    e?.preventDefault();
    if (!newFolderModal.folderName.trim()) return;
    setNewFolderModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      const res = await fetch(`/api/users/${selectedUserForFiles}/create-folder`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ path: explorerPath, folder_name: newFolderModal.folderName.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Folder "${newFolderModal.folderName}" berhasil dibuat.`, 'success');
        setNewFolderModal({ isOpen: false, folderName: '', isSubmitting: false });
        reloadFiles();
      } else {
        showToast(data.detail || 'Gagal membuat folder', 'error');
        setNewFolderModal(prev => ({ ...prev, isSubmitting: false }));
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
      setNewFolderModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleDelete = async () => {
    setDeleteConfirmModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      const res = await fetch(`/api/users/${selectedUserForFiles}/delete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ path: deleteConfirmModal.path })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`"${deleteConfirmModal.name}" berhasil dihapus.`, 'success');
        setDeleteConfirmModal({ isOpen: false, path: '', name: '', isSubmitting: false });
        reloadFiles();
      } else {
        showToast(data.detail || 'Gagal menghapus', 'error');
        setDeleteConfirmModal(prev => ({ ...prev, isSubmitting: false }));
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
      setDeleteConfirmModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleRename = async (e) => {
    e?.preventDefault();
    if (!renameModal.newName.trim()) return;
    setRenameModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      const res = await fetch(`/api/users/${selectedUserForFiles}/rename`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ old_path: renameModal.oldPath, new_name: renameModal.newName.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Nama file/folder berhasil diubah.', 'success');
        setRenameModal({ isOpen: false, oldPath: '', currentName: '', newName: '', isSubmitting: false });
        reloadFiles();
      } else {
        showToast(data.detail || 'Gagal mengubah nama', 'error');
        setRenameModal(prev => ({ ...prev, isSubmitting: false }));
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
      setRenameModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handlePaste = async () => {
    if (!clipboard.path) return;
    try {
      const res = await fetch(`/api/users/${selectedUserForFiles}/move`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          source_path: clipboard.path, 
          target_dir: explorerPath, 
          is_copy: clipboard.type === 'copy' 
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(clipboard.type === 'copy' ? 'Berkas berhasil disalin.' : 'Berkas berhasil dipindahkan.', 'success');
        if (clipboard.type === 'cut') {
          setClipboard({ path: null, type: null, user: null });
        }
        reloadFiles();
      } else {
        showToast(data.detail || 'Gagal menempelkan berkas', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const allUsers = [];

    // 1. Shared dataset public entry
    allUsers.push({
      id: 'dataset_shared',
      nama: 'Direktori Bersama Publik',
      nim: 'dataset_shared',
      type: 'shared'
    });

    // 2. Mahasiswa SIMTIK
    (students || []).forEach(s => {
      allUsers.push({
        id: s.nim,
        nama: s.nama,
        nim: s.nim,
        is_priority: s.is_priority,
        type: 'student'
      });
    });

    // 3. Akun Sistem (labriset, training1-10)
    (systemUsers || []).forEach(s => {
      const isMhs = s.username && s.username.startsWith('m') && /^\d+$/.test(s.username.slice(1));
      if (!isMhs && !allUsers.find(u => u.id === s.username)) {
        allUsers.push({
          id: s.username,
          nama: s.username === 'labriset' ? 'Akun Riset Dosen' : `Akun Sistem ${s.username}`,
          nim: s.username,
          type: 'system'
        });
      }
    });

    if (!q) return allUsers;

    return allUsers.filter(u => {
      const name = (u.nama || '').toLowerCase();
      const nim = (u.nim || '').toLowerCase();
      return name.includes(q) || nim.includes(q);
    });
  }, [searchQuery, students, systemUsers]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] p-8 bg-white border border-slate-200/90 rounded-xl shadow-xs text-center">
        <div className="w-16 h-16 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4 shadow-sm">
          <Folder className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          File Explorer Memerlukan Autentikasi
        </h2>
        <p className="text-xs text-slate-500 max-w-md mt-1 mb-5">
          Penjelajahan direktori kerja mahasiswa dan berkas server hanya dapat diakses oleh Super Admin dan Asisten Laboratorium (Operator) yang terotentikasi.
        </p>
        <button
          onClick={onOpenLogin}
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm active:translate-y-0.5 transition-all"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Masuk Sebagai Admin / Aslab</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-600" />
            File Explorer Mahasiswa & Server
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Jelajahi, unduh, dan kelola direktori kerja /home pengguna serta dataset bersama
          </p>
        </div>

        {selectedUserForFiles && (
          <div className="flex items-center gap-2">
            <button
              onClick={reloadFiles}
              disabled={isLoadingFiles}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 shadow-sm active:translate-y-0.5 transition-all text-xs"
              type="button"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLoadingFiles ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row min-h-[580px] gap-5 w-full">
        {/* Left Pane - User Directory List */}
        <div className={`w-full lg:w-1/3 lg:min-w-[320px] lg:max-w-sm flex flex-col bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden ${selectedUserForFiles ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Daftar Akun Pengguna ({filteredUsers.length})
              </span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari NIM atau Nama…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl pl-8.5 pr-3.5 py-1.5 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredUsers.map(u => {
              const identifier = u.id;
              const isSelected = selectedUserForFiles === identifier;
              const isShared = u.type === 'shared';
              const isSystem = u.type === 'system';

              return (
                <button
                  key={identifier}
                  onClick={() => {
                    setSelectedUserForFiles(identifier);
                    setExplorerPath('');
                  }}
                  className={`w-full text-left flex items-center justify-between p-3 rounded-xl transition-all duration-150 motion-press ${
                    isSelected 
                      ? 'bg-blue-50/90 border border-blue-200 shadow-sm translate-x-0.5' 
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      isShared 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : isSystem 
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                        : isSelected 
                        ? 'bg-blue-100 text-blue-800 border-blue-300' 
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {isShared ? <Database className="w-4 h-4" /> : isSystem ? <Folder className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-xs font-bold truncate ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>
                          {identifier}
                        </span>
                        {isShared && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Shared
                          </span>
                        )}
                        {isSystem && (
                          <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            System
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 truncate mt-0.5">
                        {u.nama}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane - Active Workspace Explorer */}
        <div className={`flex-1 flex flex-col bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden ${!selectedUserForFiles ? 'hidden lg:flex' : 'flex'}`}>
          {selectedUserForFiles ? (
            <>
              {/* Header Navigation Strip */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => { setSelectedUserForFiles(null); setExplorerPath(''); setExplorerFiles([]); setClipboard({path:null,type:null,user:null}); }}
                    className="lg:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-mono font-semibold shadow-sm shrink-0"
                    type="button"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Daftar Akun</span>
                  </button>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                    <Folder className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs text-slate-900 truncate">
                      Penyimpanan: <span className="font-mono text-blue-600">{selectedUserForFiles}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                      Jalur: <span className="text-slate-800 font-semibold">/{explorerPath || ''}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedUserForFiles(null); setExplorerPath(''); setExplorerFiles([]); setClipboard({path:null,type:null,user:null}); }}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                  title="Tutup Explorer"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Action Toolbar */}
              <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 hover:border-blue-300 shadow-sm motion-press active:translate-y-0.5 transition-all text-xs font-semibold"
                  type="button"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>Upload Berkas</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                />

                <button
                  onClick={() => setNewFolderModal({ isOpen: true, folderName: '', isSubmitting: false })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 hover:border-emerald-300 shadow-sm motion-press active:translate-y-0.5 transition-all text-xs font-semibold"
                  type="button"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Folder Baru</span>
                </button>

                {clipboard.path && (
                  <button
                    onClick={handlePaste}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 shadow-sm motion-press active:translate-y-0.5 transition-all text-xs font-mono font-semibold ml-auto"
                    type="button"
                  >
                    <Clipboard className="w-3.5 h-3.5 text-purple-600" />
                    <span>Paste ({clipboard.type})</span>
                  </button>
                )}
              </div>
              
              {/* File Table Content */}
              <div className="flex-1 overflow-auto p-4">
                {isLoadingFiles ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2 font-mono text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                    <span>Memuat berkas…</span>
                  </div>
                ) : notCreatedMsg ? (
                  <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col items-center justify-center text-center gap-2 max-w-md mx-auto my-8 shadow-sm">
                    <AlertCircle className="w-8 h-8 text-amber-600" />
                    <h4 className="font-bold text-sm">Direktori Pengguna Belum Dibuat</h4>
                    <p className="text-xs text-amber-800 leading-relaxed font-mono">
                      {notCreatedMsg}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-2">
                      Folder kerja home akan dibuat secara otomatis saat pengguna pertama kali masuk dan membuka sesi notebook di JupyterLab.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[620px]">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-500 font-mono text-[11px] font-semibold border-b border-slate-200">
                        <th className="py-2.5 px-4" scope="col">Nama Berkas / Folder</th>
                        <th className="py-2.5 px-4" scope="col">Ukuran</th>
                        <th className="py-2.5 px-4" scope="col">Terakhir Diubah</th>
                        <th className="py-2.5 px-4 text-right" scope="col">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-xs">
                      {explorerPath !== '' && (
                        <tr 
                          className="hover:bg-blue-50/40 motion-row cursor-pointer group" 
                          onClick={() => {
                            const parts = explorerPath.split('/').filter(Boolean);
                            parts.pop();
                            setExplorerPath(parts.join('/'));
                          }}
                        >
                          <td className="py-2.5 px-4 flex items-center gap-2 text-blue-600 font-bold group-hover:underline">
                            <ArrowUp className="w-4 h-4" />
                            <span>.. (Folder Induk)</span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-400">—</td>
                          <td className="py-2.5 px-4 text-slate-400">—</td>
                          <td className="py-2.5 px-4"></td>
                        </tr>
                      )}

                      {explorerFiles.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-12 text-center text-slate-400 font-mono">
                            Direktori ini kosong.
                          </td>
                        </tr>
                      ) : (
                        explorerFiles.map((file, idx) => {
                          const isDir = file.is_dir;
                          const fullPath = explorerPath ? `${explorerPath}/${file.name}` : file.name;
                          const sizeStr = isDir 
                            ? '—' 
                            : (file.size >= 1048576 
                              ? (file.size / 1048576).toFixed(1) + ' MB' 
                              : (file.size >= 1024 
                                ? (file.size / 1024).toFixed(1) + ' KB' 
                                : file.size + ' B'));

                          return (
                            <tr 
                              key={idx} 
                              className={`hover:bg-blue-50/40 motion-row ${isDir ? 'cursor-pointer' : ''}`} 
                              onClick={() => {
                                if (isDir) {
                                  setExplorerPath(fullPath);
                                }
                              }}
                            >
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-2">
                                  {isDir ? (
                                    <Folder className="w-4 h-4 text-amber-500 fill-amber-100 shrink-0" />
                                  ) : (
                                    <File className="w-4 h-4 text-slate-400 shrink-0" />
                                  )}
                                  <span className={`truncate max-w-[280px] sm:max-w-xs ${
                                    isDir ? 'text-blue-700 font-semibold hover:underline' : 'text-slate-800'
                                  }`}>
                                    {file.name}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-slate-600 tabular-nums">
                                {sizeStr}
                              </td>
                              <td className="py-2.5 px-4 text-slate-500 text-[11px] tabular-nums">
                                {file.mtime ? new Date(file.mtime * 1000).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <div className="inline-flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                  {/* Rename */}
                                  <button
                                    onClick={() => setRenameModal({ isOpen: true, oldPath: fullPath, currentName: file.name, newName: file.name, isSubmitting: false })}
                                    className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-sm active:translate-y-0.5 transition-all"
                                    title="Ubah Nama"
                                    type="button"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  
                                  {/* Copy */}
                                  <button
                                    onClick={() => { 
                                      setClipboard({ path: fullPath, type: 'copy', user: selectedUserForFiles }); 
                                      showToast('Disalin ke clipboard.', 'info');
                                    }}
                                    className="p-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 shadow-sm active:translate-y-0.5 transition-all"
                                    title="Salin (Copy)"
                                    type="button"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  
                                  {/* Cut */}
                                  <button
                                    onClick={() => { 
                                      setClipboard({ path: fullPath, type: 'cut', user: selectedUserForFiles }); 
                                      showToast('Dipindahkan ke clipboard (Cut).', 'info');
                                    }}
                                    className="p-1.5 rounded-lg bg-white hover:bg-amber-50 text-amber-600 border border-slate-200 shadow-sm active:translate-y-0.5 transition-all"
                                    title="Potong (Cut)"
                                    type="button"
                                  >
                                    <Scissors className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Copy to Shared */}
                                  <button
                                    onClick={() => handleCopyToShared(fullPath)}
                                    className="p-1.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-600 border border-slate-200 shadow-sm active:translate-y-0.5 transition-all"
                                    title="Salin ke dataset_shared"
                                    type="button"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Download (Files only) */}
                                  {!isDir && (
                                    <button
                                      onClick={() => handleDownloadFile(fullPath)}
                                      className="p-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-600 border border-slate-200 shadow-sm active:translate-y-0.5 transition-all"
                                      title="Unduh Berkas"
                                      type="button"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Delete */}
                                  <button
                                    onClick={() => setDeleteConfirmModal({ isOpen: true, path: fullPath, name: file.name, isSubmitting: false })}
                                    className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 shadow-sm active:translate-y-0.5 transition-all"
                                    title="Hapus"
                                    type="button"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                <Folder className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">Pilih Akun Pengguna</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                Pilih salah satu akun mahasiswa, akun sistem, atau direktori bersama pada panel sebelah kiri untuk melihat dan mengelola berkas.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Rename Modal */}
      {renameModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-lg w-full max-w-sm motion-modal-pop">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Ubah Nama File / Folder</h3>
            <p className="text-xs text-slate-500 mb-4 font-mono truncate">{renameModal.currentName}</p>
            <form onSubmit={handleRename}>
              <input 
                type="text" 
                value={renameModal.newName} 
                onChange={e => setRenameModal(prev => ({ ...prev, newName: e.target.value }))}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none mb-4 font-mono transition-all shadow-sm"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => setRenameModal({ isOpen: false, oldPath: '', currentName: '', newName: '', isSubmitting: false })}
                  className="px-3.5 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors text-xs font-semibold"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={renameModal.isSubmitting || !renameModal.newName.trim()}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-sm text-xs disabled:opacity-50"
                >
                  {renameModal.isSubmitting ? 'Menyimpan…' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {newFolderModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-lg w-full max-w-sm motion-modal-pop">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Buat Folder Baru</h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">Lokasi: /{explorerPath || ''}</p>
            <form onSubmit={handleCreateFolder}>
              <input 
                type="text" 
                placeholder="Nama folder…"
                value={newFolderModal.folderName} 
                onChange={e => setNewFolderModal(prev => ({ ...prev, folderName: e.target.value }))}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none mb-4 font-mono transition-all shadow-sm"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => setNewFolderModal({ isOpen: false, folderName: '', isSubmitting: false })}
                  className="px-3.5 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors text-xs font-semibold"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={newFolderModal.isSubmitting || !newFolderModal.folderName.trim()}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold shadow-sm text-xs disabled:opacity-50"
                >
                  {newFolderModal.isSubmitting ? 'Membuat…' : 'Buat Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white border border-rose-200 p-6 rounded-xl shadow-lg w-full max-w-sm motion-modal-pop">
            <h3 className="text-sm font-bold text-rose-600 mb-1">Konfirmasi Penghapusan</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong className="font-mono text-slate-900">{deleteConfirmModal.name}</strong> secara permanen?
            </p>
            <div className="flex justify-end gap-2">
              <button 
                type="button"
                onClick={() => setDeleteConfirmModal({ isOpen: false, path: '', name: '', isSubmitting: false })}
                className="px-3.5 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors text-xs font-semibold"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleDelete}
                disabled={deleteConfirmModal.isSubmitting}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold shadow-sm text-xs disabled:opacity-50"
              >
                {deleteConfirmModal.isSubmitting ? 'Menghapus…' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
