import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Folder, File, ArrowUp, Download, Copy, X, Search, User,
  Trash2, Edit, Scissors, Upload, FolderPlus, Clipboard
} from 'lucide-react';

export default function AdminFileExplorer({ 
  isAdmin, 
  adminToken, 
  students, 
  systemUsers,
  showToast 
}) {
  const [selectedUserForFiles, setSelectedUserForFiles] = useState(null);
  const [explorerPath, setExplorerPath] = useState('');
  const [explorerFiles, setExplorerFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // New states
  const [clipboard, setClipboard] = useState({ path: null, type: null }); // type: 'copy' | 'cut'
  
  // Modals
  const [renameModal, setRenameModal] = useState({ isOpen: false, oldPath: '', currentName: '', newName: '' });
  const [newFolderModal, setNewFolderModal] = useState({ isOpen: false, folderName: '' });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, path: '', name: '' });

  const fileInputRef = useRef(null);

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

  const reloadFiles = () => {
    if (selectedUserForFiles) fetchExplorerFiles(selectedUserForFiles, explorerPath);
  };

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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', explorerPath);

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
        showToast('File berhasil diupload', 'success');
        reloadFiles();
      } else {
        showToast(data.detail || 'Gagal upload file', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
    // reset input
    e.target.value = '';
  };

  const handleCreateFolder = async () => {
    if (!newFolderModal.folderName) return;
    try {
      const res = await fetch(`/api/users/${selectedUserForFiles}/create-folder`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ path: explorerPath, folder_name: newFolderModal.folderName })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Folder berhasil dibuat', 'success');
        setNewFolderModal({ isOpen: false, folderName: '' });
        reloadFiles();
      } else {
        showToast(data.detail || 'Gagal membuat folder', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/users/${selectedUserForFiles}/delete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ path: deleteConfirmModal.path })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Berhasil dihapus', 'success');
        setDeleteConfirmModal({ isOpen: false, path: '', name: '' });
        reloadFiles();
      } else {
        showToast(data.detail || 'Gagal menghapus', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleRename = async () => {
    if (!renameModal.newName) return;
    try {
      const res = await fetch(`/api/users/${selectedUserForFiles}/rename`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ old_path: renameModal.oldPath, new_name: renameModal.newName })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Berhasil di-rename', 'success');
        setRenameModal({ isOpen: false, oldPath: '', currentName: '', newName: '' });
        reloadFiles();
      } else {
        showToast(data.detail || 'Gagal me-rename', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
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
        showToast('Paste berhasil', 'success');
        if (clipboard.type === 'cut') {
          setClipboard({ path: null, type: null });
        }
        reloadFiles();
      } else {
        showToast(data.detail || 'Gagal paste', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    
    const allUsers = [];
    
    (students || []).forEach(s => allUsers.push({
      id: s.nim,
      nama: s.nama,
      nim: s.nim,
      type: 'student'
    }));

    (systemUsers || []).forEach(s => {
      if (!allUsers.find(u => u.nim === s.username || `m${u.nim}` === s.username)) {
         allUsers.push({
           id: s.username,
           nama: s.username,
           nim: s.username,
           type: 'system'
         });
      }
    });

    if (!allUsers.find(u => u.id === 'dataset_shared')) {
      allUsers.push({
        id: 'dataset_shared',
        nama: 'Dataset Shared',
        nim: 'dataset_shared',
        type: 'system'
      });
    }

    return allUsers.filter(u => {
      const name = (u.nama || '').toLowerCase();
      const nim = (u.nim || '').toLowerCase();
      return name.includes(q) || nim.includes(q);
    });
  }, [searchQuery, students, systemUsers]);

  return (
    <div className="flex h-full min-h-[500px] gap-4 w-full relative">
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
                className={`w-full text-left flex flex-col p-3 rounded-xl transition-all duration-150 motion-press hover:translate-x-1 ${
                  isSelected 
                    ? 'bg-blue-500/10 border-blue-500/30 border shadow-sm' 
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
                onClick={() => { setSelectedUserForFiles(null); setExplorerPath(''); setExplorerFiles([]); setClipboard({path:null,type:null}); }}
                className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition-colors"
                title="Close Explorer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Action Bar */}
            <div className="px-4 py-3 border-b border-[#46455430] bg-[#1a1d27] flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 motion-press transition-all text-xs font-mono font-bold"
              >
                <Upload className="w-4 h-4" />
                Upload File
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => setNewFolderModal({ isOpen: true, folderName: '' })}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 motion-press transition-all text-xs font-mono font-bold"
              >
                <FolderPlus className="w-4 h-4" />
                New Folder
              </button>

              {clipboard.path && (
                <button
                  onClick={handlePaste}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 motion-press transition-all text-xs font-mono font-bold ml-auto"
                >
                  <Clipboard className="w-4 h-4" />
                  Paste ({clipboard.type})
                </button>
              )}
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
                        <tr key={idx} className={`hover:bg-slate-800/50 motion-row ${isDir ? 'cursor-pointer' : ''}`} onClick={() => {
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
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setRenameModal({ isOpen: true, oldPath: fullPath, currentName: file.name, newName: file.name });
                                }}
                                className="p-1.5 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 border border-slate-500/30 motion-press active:scale-95 transition-all"
                                title="Rename"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setClipboard({ path: fullPath, type: 'copy' }); 
                                  showToast('Dicopy ke clipboard', 'success');
                                }}
                                className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 motion-press active:scale-95 transition-all"
                                title="Copy"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setClipboard({ path: fullPath, type: 'cut' }); 
                                  showToast('Di-cut ke clipboard', 'success');
                                }}
                                className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 motion-press active:scale-95 transition-all"
                                title="Cut"
                              >
                                <Scissors className="w-3.5 h-3.5" />
                              </button>

                              {!isDir && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDownloadFile(fullPath); }}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 motion-press active:scale-95 transition-all"
                                  title="Download File"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setDeleteConfirmModal({ isOpen: true, path: fullPath, name: file.name });
                                }}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 motion-press active:scale-95 transition-all"
                                title="Delete"
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
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Folder className="w-16 h-16 text-slate-700 mb-4" />
            <p className="text-lg">Pilih user dari panel kiri untuk membuka File Explorer</p>
          </div>
        )}
      </div>

      {/* Modals */}
      
      {/* Rename Modal */}
      {renameModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[#181b25] border border-[#46455430] p-6 rounded-2xl shadow-xl w-full max-w-sm">
            <h3 className="text-slate-100 font-bold mb-4">Rename {renameModal.currentName}</h3>
            <input 
              type="text" 
              value={renameModal.newName} 
              onChange={e => setRenameModal({...renameModal, newName: e.target.value})}
              className="w-full bg-[#0f111a] border border-[#46455430] rounded-xl px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 mb-4 font-mono"
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setRenameModal({isOpen: false, oldPath: '', currentName: '', newName: ''})}
                className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors text-sm font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleRename}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors text-sm font-bold shadow-lg shadow-blue-500/20"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {newFolderModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[#181b25] border border-[#46455430] p-6 rounded-2xl shadow-xl w-full max-w-sm">
            <h3 className="text-slate-100 font-bold mb-4">New Folder</h3>
            <input 
              type="text" 
              placeholder="Folder Name"
              value={newFolderModal.folderName} 
              onChange={e => setNewFolderModal({...newFolderModal, folderName: e.target.value})}
              className="w-full bg-[#0f111a] border border-[#46455430] rounded-xl px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 mb-4 font-mono"
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setNewFolderModal({isOpen: false, folderName: ''})}
                className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors text-sm font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateFolder}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors text-sm font-bold shadow-lg shadow-emerald-500/20"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[#181b25] border border-[#46455430] p-6 rounded-2xl shadow-xl w-full max-w-sm">
            <h3 className="text-red-400 font-bold mb-2">Confirm Delete</h3>
            <p className="text-slate-300 text-sm mb-6">Are you sure you want to delete <span className="font-bold font-mono text-slate-200">{deleteConfirmModal.name}</span>?</p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setDeleteConfirmModal({isOpen: false, path: '', name: ''})}
                className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors text-sm font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-bold shadow-lg shadow-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
