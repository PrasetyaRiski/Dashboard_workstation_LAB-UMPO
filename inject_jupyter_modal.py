#!/usr/bin/env python3
"""
inject_jupyter_modal.py
Skrip otomatis untuk menanamkan Pop-Up Modal pemberitahuan dan pusat bantuan
ke dalam antarmuka JupyterLab Laboratorium AI UMPO (Hanya muncul saat pengguna sudah login).
"""

import os
import sys
import glob
import re

MODAL_HTML_SNIPPET = r'''<!-- === BEGIN LAB AI UMPO MODAL ANNOUNCEMENT === -->
<!-- 1. POPUP MODAL PUSAT BANTUAN & REAL-TIME PERFORMANCE BENTO CONSOLE -->
<div id="lab-ai-popup-overlay" style="display:none; position:fixed; inset:0; z-index:9999999; background:rgba(4,7,13,0.78); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); align-items:center; justify-content:center; padding:16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Inter',sans-serif;">
  <div id="lab-ai-popup-card" style="background:#0d1117; color:#f0f6fc; width:100%; max-width:560px; border-radius:18px; border:1px solid rgba(255,255,255,0.12); box-shadow:0 24px 64px -12px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04); overflow:hidden; animation:labModalFadeIn 0.2s cubic-bezier(0.16,1,0.3,1); box-sizing:border-box;">
    
    <!-- Modal Header -->
    <div style="background:#161b22; padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:10px;">
        <div style="width:32px; height:32px; border-radius:8px; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.25); display:flex; align-items:center; justify-content:center; color:#38bdf8;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
        </div>
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <h3 style="margin:0; font-size:14.5px; font-weight:600; letter-spacing:-0.01em; color:#f0f6fc;">
              Workstation Resource Monitor
            </h3>
            <span style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; background:rgba(63,185,80,0.15); color:#3fb950; border:1px solid rgba(63,185,80,0.3); padding:1px 6px; border-radius:4px; display:inline-flex; align-items:center; gap:4px;">
              <span class="lab-live-dot" style="width:5px; height:5px; border-radius:50%; background:#3fb950;"></span> Aktif
            </span>
          </div>
          <p style="margin:2px 0 0; font-size:11px; color:#8b949e;">
            Laboratorium Komputasi AI &bull; FT Universitas Muhammadiyah Ponorogo
          </p>
        </div>
      </div>
      <button id="btn-close-x" style="background:transparent; border:none; color:#8b949e; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; transition:color 0.15s ease;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>

    <!-- Modal Content Body -->
    <div style="padding:18px 20px; font-size:12px; line-height:1.5; color:#c9d1d9; max-height:80vh; overflow-y:auto;">
      
      <!-- Account Info Strip -->
      <div style="display:flex; justify-content:space-between; align-items:center; background:#161b22; border-radius:8px; padding:8px 12px; margin-bottom:14px; font-size:11.5px; border:1px solid rgba(255,255,255,0.06);">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="color:#8b949e;">User:</span>
          <strong id="modal-user-name" style="font-family:ui-monospace, monospace; color:#58a6ff; font-weight:600;">Detecting...</strong>
          <span style="color:rgba(255,255,255,0.15);">&bull;</span>
          <span id="modal-user-tier" style="color:#8b949e;">Standard Tier (2C / 4GB)</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="color:#8b949e;">Updated:</span>
          <span id="modal-sync-time" style="font-family:ui-monospace, monospace; color:#f0f6fc;">--:--:--</span>
        </div>
      </div>

      <!-- Overquota Critical Alert (Minimalist & Serious) -->
      <div id="overquota-alert-box" style="display:none; background:rgba(248,81,73,0.08); border:1px solid rgba(248,81,73,0.35); border-radius:10px; padding:12px 14px; margin-bottom:14px;">
        <div style="display:flex; align-items:flex-start; gap:10px;">
          <div style="color:#f85149; margin-top:1px; flex-shrink:0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
          <div style="flex:1;">
            <div style="font-weight:600; font-size:12px; color:#ff7b72; margin-bottom:3px;">
              Peringatan: Kapasitas Penyimpanan Melebihi Kuota (Overquota)
            </div>
            <div style="font-size:11.5px; color:#c9d1d9; line-height:1.5;">
              Penggunaan disk Anda telah mencapai <strong id="oq-used-val" style="color:#ff7b72;">-- GB</strong> dari kuota <strong id="oq-quota-val">10.00 GB</strong> (<span id="oq-pct-val">--%</span>).
            </div>
            <div style="margin-top:8px; font-size:11px; color:#8b949e; line-height:1.5; background:#0d1117; padding:8px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.06);">
              <strong style="color:#f0f6fc;">Tindakan Diperlukan:</strong>
              <div style="margin-top:3px;">1. Segera unduh (download) notebook <code>.ipynb</code> dan berkas penting ke perangkat lokal.</div>
              <div>2. Hapus file checkpoint model (<code>.pt</code>, <code>.ckpt</code>) dan cache tidak terpakai dari panel File Browser.</div>
              <div style="margin-top:4px; color:#ff7b72;">&bull; Berkas berukuran besar dapat dihapus otomatis oleh Administrator jika kuota tidak dirapikan.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bento Grid: 4 Metric Cards -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">
        
        <!-- Metric 1: CPU -->
        <div style="background:#161b22; border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:#8b949e;">CPU Allocation</span>
            <span id="gauge-txt-cpu-cores" style="font-size:10.5px; font-family:ui-monospace, monospace; color:#8b949e;">0.0 / 2.0 Cores</span>
          </div>
          <div id="gauge-txt-cpu-pct" style="font-size:20px; font-weight:700; color:#f0f6fc; font-family:ui-monospace, monospace; margin-bottom:8px;">
            0%
          </div>
          <div style="width:100%; height:4px; background:rgba(255,255,255,0.08); border-radius:999px; overflow:hidden;">
            <div id="gauge-bar-cpu" style="width:0%; height:100%; background:#38bdf8; border-radius:999px; transition:width 0.3s ease;"></div>
          </div>
        </div>

        <!-- Metric 2: Memory (RAM) -->
        <div style="background:#161b22; border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:#8b949e;">Memory (RAM)</span>
            <span id="gauge-txt-ram-limit" style="font-size:10.5px; font-family:ui-monospace, monospace; color:#8b949e;">Limit 4.0 GB</span>
          </div>
          <div id="gauge-txt-ram-val" style="font-size:20px; font-weight:700; color:#f0f6fc; font-family:ui-monospace, monospace; margin-bottom:8px;">
            0.00 GB <span style="font-size:12px; font-weight:500; color:#8b949e;">(0%)</span>
          </div>
          <div style="width:100%; height:4px; background:rgba(255,255,255,0.08); border-radius:999px; overflow:hidden;">
            <div id="gauge-bar-ram" style="width:0%; height:100%; background:#3fb950; border-radius:999px; transition:width 0.3s ease;"></div>
          </div>
        </div>

        <!-- Metric 3: GPU Acceleration -->
        <div style="background:#161b22; border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:#8b949e;">Akselerasi GPU</span>
            <span id="gauge-txt-gpu-name" style="font-size:10px; color:#58a6ff; font-family:ui-monospace, monospace; font-weight:500;">RTX 5060 Ti</span>
          </div>
          <div id="gauge-txt-gpu-comp" style="font-size:20px; font-weight:700; color:#f0f6fc; font-family:ui-monospace, monospace; margin-bottom:8px;">
            0% <span style="font-size:11px; font-weight:400; color:#8b949e;">(VRAM 0 MB)</span>
          </div>
          <div style="width:100%; height:4px; background:rgba(255,255,255,0.08); border-radius:999px; overflow:hidden;">
            <div id="gauge-bar-gpu" style="width:0%; height:100%; background:#d29922; border-radius:999px; transition:width 0.3s ease;"></div>
          </div>
        </div>

        <!-- Metric 4: Storage Quota -->
        <div style="background:#161b22; border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:#8b949e;">Home Storage</span>
            <span id="gauge-txt-disk-quota" style="font-size:10.5px; font-family:ui-monospace, monospace; color:#8b949e;">Kuota 10 GB</span>
          </div>
          <div id="gauge-txt-disk-val" style="font-size:20px; font-weight:700; color:#f0f6fc; font-family:ui-monospace, monospace; margin-bottom:8px;">
            0.00 GB <span style="font-size:12px; font-weight:500; color:#8b949e;">(0%)</span>
          </div>
          <div style="width:100%; height:4px; background:rgba(255,255,255,0.08); border-radius:999px; overflow:hidden;">
            <div id="gauge-bar-disk" style="width:0%; height:100%; background:#38bdf8; border-radius:999px; transition:width 0.3s ease;"></div>
          </div>
        </div>

      </div>

      <!-- Panduan Aturan Operasional (Engineering Standards) -->
      <div style="background:#161b22; border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:14px;">
        <div style="font-weight:600; color:#f0f6fc; font-size:12px; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          SOP & Regulasi Penggunaan Server AI
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:11.5px; line-height:1.5;">
          <div style="background:#0d1117; padding:9px 11px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
            <strong style="color:#f0f6fc; display:block; margin-bottom:2px;">1. Single-Device Policy</strong>
            <span style="color:#8b949e;">Satu akun hanya boleh aktif pada 1 perangkat browser secara bersamaan untuk mencegah bentrok data.</span>
          </div>
          <div style="background:#0d1117; padding:9px 11px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
            <strong style="color:#f0f6fc; display:block; margin-bottom:2px;">2. Idle Culler 30 Menit</strong>
            <span style="color:#8b949e;">Notebook tanpa aktivitas komputasi selama 30 menit akan dimatikan otomatis untuk membebaskan VRAM.</span>
          </div>
          <div style="background:#0d1117; padding:9px 11px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
            <strong style="color:#f0f6fc; display:block; margin-bottom:2px;">3. Folder dataset_shared</strong>
            <span style="color:#8b949e;">Gunakan pintasan <code>~/dataset_shared</code> untuk membaca dataset publik tanpa mengurangi kuota storage.</span>
          </div>
          <div style="background:#0d1117; padding:9px 11px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
            <strong style="color:#f0f6fc; display:block; margin-bottom:2px;">4. Alokasi Prioritas Skripsi</strong>
            <span style="color:#8b949e;">Mahasiswa skripsi/riset dapat mengajukan Dedicated GPU 0 (Level 1) ke Asisten Laboratorium.</span>
          </div>
        </div>
      </div>

    </div>

    <!-- Modal Footer -->
    <div style="padding:12px 20px; background:#161b22; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:11px; font-family:ui-monospace, monospace; color:#8b949e;">
        Node: ai-ftumpo-01 &bull; cgroups v2
      </span>
      <button id="btn-dismiss-lab-popup" style="background:#238636; color:#ffffff; border:1px solid rgba(240,246,252,0.1); padding:7px 16px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; transition:background 0.15s ease;">
        Tutup Monitor
      </button>
    </div>

  </div>
</div>

<!-- 2. FLOATING PERFORMANCE TOOLBAR (Default: hidden, hanya muncul jika sudah login) -->
<div id="lab-ai-status-pill" title="Workstation Telemetry & Resource Monitor (Klik untuk membuka rincian)" style="display:none; position:fixed; bottom:22px; right:18px; z-index:99999; align-items:center; gap:8px; background:rgba(13,17,23,0.92); color:#c9d1d9; border:1px solid rgba(255,255,255,0.14); box-shadow:0 8px 24px rgba(0,0,0,0.5); padding:5px 12px; border-radius:999px; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace; font-size:11px; cursor:pointer; backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); user-select:none; transition:all 0.2s cubic-bezier(0.16,1,0.3,1);">
  
  <span class="lab-live-dot" style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#3fb950; shrink:0;"></span>
  
  <div id="lab-ai-live-tags" style="display:flex; align-items:center; gap:8px;">
    <span>CPU <strong id="pill-val-cpu" style="color:#f0f6fc;">--%</strong></span>
    <span style="color:rgba(255,255,255,0.15);">&bull;</span>
    <span>RAM <strong id="pill-val-ram" style="color:#f0f6fc;">--/4G</strong></span>
    <span style="color:rgba(255,255,255,0.15);">&bull;</span>
    <span>GPU <strong id="pill-val-gpu" style="color:#f0f6fc;">--%</strong></span>
    <span style="color:rgba(255,255,255,0.15);">&bull;</span>
    <span id="pill-disk-container">Disk <strong id="pill-val-disk" style="color:#f0f6fc;">--/10G</strong></span>
  </div>

  <span style="background:rgba(255,255,255,0.08); color:#8b949e; font-size:9.5px; padding:1.5px 6px; border-radius:4px; margin-left:2px; font-weight:600;">
    Console
  </span>
</div>

<style>
@keyframes labModalFadeIn {
  from { opacity: 0; transform: scale(0.97) translateY(6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes labDotPulse {
  0% { transform: scale(0.9); opacity: 0.7; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.7; }
}
.lab-live-dot {
  animation: labDotPulse 2s infinite ease-in-out;
}
#lab-ai-status-pill:hover {
  transform: translateY(-1.5px);
  background: rgba(22, 27, 34, 0.98);
  border-color: rgba(255, 255, 255, 0.28);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.6);
}
#btn-dismiss-lab-popup:hover {
  background: #2ea043;
}
#btn-close-x:hover {
  color: #f0f6fc;
}
</style>

<script>
(function() {
  // Fungsi presisi untuk memastikan pengguna benar-benar berada di dalam workspace yang sudah login
  function isUserLoggedInJupyter() {
    var path = window.location.pathname || '';

    // 1. Jika masih berada di menu login /hub/login atau form login terdeteksi
    if (path.indexOf('/hub/login') !== -1 || path.indexOf('/login') !== -1) {
      return null;
    }
    if (document.querySelector('form[action*="login"]') || document.getElementById('login_submit_btn')) {
      return null;
    }

    // 2. Deteksi dari URL path notebook user: /user/<username>/...
    var m = path.match(/\/user\/([^\/]+)/);
    if (m && m[1] && m[1] !== 'hub') {
      return m[1];
    }

    // 3. Deteksi dari konfigurasi internal runtime JupyterLab
    try {
      var el = document.getElementById('jupyter-config-data');
      if (el && el.textContent) {
        var cfg = JSON.parse(el.textContent);
        if (cfg.baseUrl) {
          var m2 = cfg.baseUrl.match(/\/user\/([^\/]+)/);
          if (m2 && m2[1] && m2[1] !== 'hub') return m2[1];
        }
        if (cfg.userName && cfg.userName !== 'hub') return cfg.userName;
      }
    } catch(e) {}

    return null;
  }

  function initLabNotice() {
    var username = isUserLoggedInJupyter();
    var overlay = document.getElementById('lab-ai-popup-overlay');
    var pill = document.getElementById('lab-ai-status-pill');

    // JIKA BELUM LOGIN (misalnya di menu login /hub/login):
    // Matikan dan sembunyikan seluruh elemen modal dan floating pill!
    if (!username) {
      if (overlay) overlay.style.display = 'none';
      if (pill) pill.style.display = 'none';
      return; // Berhenti total! Pop-up tidak akan pernah muncul di menu login.
    }

    // JIKA SUDAH LOGIN DI JUPYTERLAB:
    var btnDismiss = document.getElementById('btn-dismiss-lab-popup');
    var btnCloseX = document.getElementById('btn-close-x');
    var userNameEl = document.getElementById('modal-user-name');
    var userTierEl = document.getElementById('modal-user-tier');

    if (userNameEl) userNameEl.innerText = username;
    if (pill) pill.style.display = 'flex';

    // Munculkan pop-up modal sekali saat sesi baru dimulai setelah login
    var sessionKey = 'lab_ai_popup_seen_' + username;
    if (!sessionStorage.getItem(sessionKey)) {
      setTimeout(function() {
        if (overlay) overlay.style.display = 'flex';
      }, 1500);
    }

    function hideModal() {
      if (overlay) overlay.style.display = 'none';
      sessionStorage.setItem(sessionKey, 'true');
    }

    if (btnDismiss) btnDismiss.onclick = hideModal;
    if (btnCloseX) btnCloseX.onclick = hideModal;

    if (pill && overlay) {
      pill.onclick = function() {
        overlay.style.display = 'flex';
      };
    }

    // Engine Monitoring Real-Time (Polling tiap 3 detik)
    function updateTelemetry() {
      var u = isUserLoggedInJupyter();
      if (!u) return;
      var host = window.location.hostname || '76.76.76.188';

      // 1. Coba path relatif (/api/user-telemetry/...) via reverse proxy Nginx (Port 80/443)
      fetch('/api/user-telemetry/' + u)
        .then(function(res) {
          if (!res.ok) throw new Error(res.status);
          return res.json();
        })
        .then(function(data) {
          applyTelemetry(data);
        })
        .catch(function() {
          // 2. Fallback: coba akses langsung ke port 8888 jika tanpa Nginx
          var directUrl = window.location.protocol + '//' + host + ':8888/api/user-telemetry/' + u;
          fetch(directUrl)
            .then(function(res) {
              if (!res.ok) throw new Error(res.status);
              return res.json();
            })
            .then(function(data) {
              applyTelemetry(data);
            })
            .catch(function() {
              // 3. Fallback: baca metrik internal JupyterLab
              fallbackJupyterMetrics();
            });
        });
    }

    function applyTelemetry(d) {
      var cpuPct = Math.round(d.cpu_percent || 0);
      var cpuUsed = (d.cpu_cores_used || 0).toFixed(1);
      var cpuLimit = d.cpu_cores_limit || 2;
      var ramUsedMB = Math.round(d.ram_used_mb || 0);
      var ramMaxMB = Math.round(d.ram_max_mb || 4096);
      var ramPct = Math.min(100, Math.round((ramUsedMB / ramMaxMB) * 100));
      var gpuComp = Math.round(d.gpu_compute_percent || 0);
      var vramUsed = Math.round(d.vram_used_mb || 0);
      var vramLimit = Math.round(d.vram_limit_mb || 4893);
      var diskUsedMB = Math.round(d.disk_used_mb || 0);
      var diskQuotaGB = d.disk_quota_gb || 10;
      var diskPct = Math.min(100, Math.round(d.disk_percent || 0));

      if (userTierEl && d.tier) userTierEl.innerText = d.tier;

      // 1. Update Floating Pill Toolbar
      var pillCpu = document.getElementById('pill-val-cpu');
      var pillRam = document.getElementById('pill-val-ram');
      var pillGpu = document.getElementById('pill-val-gpu');
      var pillDisk = document.getElementById('pill-val-disk');
      var pillDiskContainer = document.getElementById('pill-disk-container');

      if (pillCpu) pillCpu.innerText = cpuPct + '%';
      if (pillRam) {
        var ramDisplay = ramUsedMB >= 1024 ? (ramUsedMB/1024).toFixed(1) + 'G' : ramUsedMB + 'M';
        var ramLimitDisplay = (ramMaxMB/1024).toFixed(0) + 'G';
        pillRam.innerText = ramDisplay + '/' + ramLimitDisplay;
      }
      if (pillGpu) pillGpu.innerText = gpuComp + '%';
      if (pillDisk) {
        var diskGB = (diskUsedMB/1024).toFixed(1);
        pillDisk.innerText = diskGB + '/' + diskQuotaGB + 'G';
      }

      // 2. Update Bento Grid Cards
      var elCpuPct = document.getElementById('gauge-txt-cpu-pct');
      var elCpuCores = document.getElementById('gauge-txt-cpu-cores');
      var barCpu = document.getElementById('gauge-bar-cpu');
      if (elCpuPct) elCpuPct.innerText = cpuPct + '%';
      if (elCpuCores) elCpuCores.innerText = cpuUsed + ' / ' + cpuLimit + ' Cores';
      if (barCpu) barCpu.style.width = Math.min(100, (cpuPct / (cpuLimit * 100)) * 100) + '%';

      var elRamVal = document.getElementById('gauge-txt-ram-val');
      var elRamPct = document.getElementById('gauge-txt-ram-pct');
      var barRam = document.getElementById('gauge-bar-ram');
      if (elRamVal) {
        var ramValStr = (ramUsedMB/1024).toFixed(2) + ' GB ';
        elRamVal.innerHTML = ramValStr + '<span style="font-size:12px; font-weight:500; color:#8b949e;">(' + ramPct + '%)</span>';
      }
      if (barRam) {
        barRam.style.width = ramPct + '%';
        barRam.style.background = ramPct > 85 ? '#f85149' : '#3fb950';
      }

      var elGpuComp = document.getElementById('gauge-txt-gpu-comp');
      var elGpuName = document.getElementById('gauge-txt-gpu-name');
      var barGpu = document.getElementById('gauge-bar-gpu');
      if (elGpuName && d.gpu_name) elGpuName.innerText = d.gpu_name;
      if (elGpuComp) {
        elGpuComp.innerHTML = gpuComp + '% <span style="font-size:11px; font-weight:400; color:#8b949e;">(VRAM ' + vramUsed + ' MB)</span>';
      }
      if (barGpu) barGpu.style.width = Math.max(gpuComp, Math.round((vramUsed/vramLimit)*100)) + '%';

      var elDiskVal = document.getElementById('gauge-txt-disk-val');
      var barDisk = document.getElementById('gauge-bar-disk');
      if (elDiskVal) {
        var diskValStr = (diskUsedMB/1024).toFixed(2) + ' GB ';
        elDiskVal.innerHTML = diskValStr + '<span style="font-size:12px; font-weight:500; color:#8b949e;">(' + diskPct + '%)</span>';
      }
      if (barDisk) {
        barDisk.style.width = diskPct + '%';
        barDisk.style.background = diskPct >= 100 ? '#f85149' : (diskPct > 80 ? '#d29922' : '#38bdf8');
      }

      var syncTime = document.getElementById('modal-sync-time');
      if (syncTime) syncTime.innerText = d.server_time || new Date().toLocaleTimeString();

      // 3. Logika Overquota Peringatan Bersih
      var oqBox = document.getElementById('overquota-alert-box');
      var oqUsed = document.getElementById('oq-used-val');
      var oqQuota = document.getElementById('oq-quota-val');
      var oqPct = document.getElementById('oq-pct-val');

      var isOverQuota = d.is_over_quota || (d.over_quota_warning && d.over_quota_warning.is_over_quota) || (diskPct >= 100);
      if (isOverQuota) {
        if (oqBox) oqBox.style.display = 'block';
        if (oqUsed) oqUsed.innerText = (diskUsedMB / 1024).toFixed(2) + ' GB';
        if (oqQuota) oqQuota.innerText = diskQuotaGB + '.00 GB';
        if (oqPct) oqPct.innerText = diskPct + '%';

        if (!window._labHasAlertedOverquota) {
          window._labHasAlertedOverquota = true;
          if (overlay) overlay.style.display = 'flex';
        }

        if (pill) {
          pill.style.borderColor = 'rgba(248,81,73,0.6)';
          pill.style.background = 'rgba(24,14,17,0.96)';
        }
        if (pillDiskContainer) {
          pillDiskContainer.innerHTML = '<span style="color:#ff7b72; font-weight:600;">Disk ' + (diskUsedMB/1024).toFixed(1) + '/' + diskQuotaGB + 'G (Overquota)</span>';
        }
      } else {
        if (oqBox) oqBox.style.display = 'none';
        if (pill) {
          pill.style.borderColor = 'rgba(255,255,255,0.14)';
          pill.style.background = 'rgba(13,17,23,0.92)';
        }
        if (pillDiskContainer) {
          pillDiskContainer.innerHTML = 'Disk <strong id="pill-val-disk" style="color:#f0f6fc;">' + (diskUsedMB/1024).toFixed(1) + '/' + diskQuotaGB + 'G</strong>';
        }
      }
    }

    function fallbackJupyterMetrics() {
      try {
        var baseMatch = window.location.pathname.match(/^(\/user\/[^\/]+)/);
        var prefix = baseMatch ? baseMatch[1] : '';
        if (!prefix) return;
        fetch(prefix + '/api/metrics/v1', { credentials: 'same-origin' })
          .then(function(res) { if (!res.ok) throw new Error(res.status); return res.json(); })
          .then(function(data) {
            if (!data) return;
            var rssMB = Math.round((data.rss || 0) / (1024 * 1024));
            var limitBytes = data.limits && data.limits.memory && data.limits.memory.rss;
            var maxMB = limitBytes ? Math.round(limitBytes / (1024 * 1024)) : 4096;
            var cpuPct = Math.round(data.cpu_percent || 0);
            applyTelemetry({
              cpu_percent: cpuPct,
              cpu_cores_used: (cpuPct / 100),
              cpu_cores_limit: 2,
              ram_used_mb: rssMB,
              ram_max_mb: maxMB,
              gpu_compute_percent: 0,
              vram_used_mb: 0,
              vram_limit_mb: 4893,
              disk_used_mb: 1024,
              disk_quota_gb: 10,
              disk_percent: 10,
              server_time: new Date().toLocaleTimeString()
            });
          })
          .catch(function(e) {});
      } catch(e) {}
    }

    updateTelemetry();
    setInterval(updateTelemetry, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLabNotice);
  } else {
    initLabNotice();
  }
})();
</script>
<!-- === END LAB AI UMPO MODAL ANNOUNCEMENT === -->'''


def is_hub_login_template(filepath: str) -> bool:
    """Mengecek apakah berkas merupakan template login / portal hub JupyterHub."""
    fp = filepath.replace("\\", "/").lower()
    return "jupyterhub/templates" in fp or "hub/templates" in fp or fp.endswith("/login.html")


def clean_hub_templates():
    """Membersihkan sisa injection modal dari template login / hub JupyterHub jika sebelumnya pernah tersisip."""
    hub_candidates = set()
    for root in ["/opt/jupyterhub", "/usr/local", "/usr", sys.prefix]:
        if os.path.exists(root):
            for dirpath, _, filenames in os.walk(root):
                dp = dirpath.replace("\\", "/").lower()
                if "jupyterhub" in dp and "templates" in dp:
                    for fn in filenames:
                        if fn.endswith(".html"):
                            hub_candidates.add(os.path.join(dirpath, fn))

    pattern = re.compile(r"<!-- === BEGIN LAB AI UMPO MODAL ANNOUNCEMENT === -->.*?<!-- === END LAB AI UMPO MODAL ANNOUNCEMENT === -->", re.DOTALL)
    cleaned_count = 0
    for hf in hub_candidates:
        try:
            with open(hf, "r", encoding="utf-8") as f:
                c = f.read()
            if "BEGIN LAB AI UMPO MODAL ANNOUNCEMENT" in c:
                new_c = re.sub(pattern, "", c)
                with open(hf, "w", encoding="utf-8") as f:
                    f.write(new_c)
                print(f"🧹 Berhasil membersihkan pop-up dari template login Hub: {hf}")
                cleaned_count += 1
        except Exception as e:
            print(f"⚠️ Gagal membersihkan {hf}: {e}")
    if cleaned_count > 0:
        print(f"✅ Selesai membersihkan {cleaned_count} berkas template login JupyterHub.")


def find_candidate_html_files():
    """Mencari seluruh file index.html dan page.html yang digunakan oleh JupyterLab / Jupyter Server (Single User Workspace)."""
    candidates = set()
    
    # 1. Lokasi standar /opt/jupyterhub (HANYA jupyterlab dan jupyter_server)
    candidates.update(glob.glob("/opt/jupyterhub/share/jupyter/lab/static/index.html"))
    candidates.update(glob.glob("/opt/jupyterhub/share/jupyter/lab/templates/page.html"))
    candidates.update(glob.glob("/opt/jupyterhub/lib/**/jupyterlab/static/index.html", recursive=True))
    candidates.update(glob.glob("/opt/jupyterhub/lib/**/jupyter_server/templates/page.html", recursive=True))

    # 2. Lokasi /usr dan /usr/local
    candidates.update(glob.glob("/usr/local/share/jupyter/lab/static/index.html"))
    candidates.update(glob.glob("/usr/share/jupyter/lab/static/index.html"))
    candidates.update(glob.glob("/usr/local/lib/**/jupyterlab/static/index.html", recursive=True))
    candidates.update(glob.glob("/usr/lib/**/jupyterlab/static/index.html", recursive=True))
    candidates.update(glob.glob("/usr/local/lib/**/jupyter_server/templates/page.html", recursive=True))
    candidates.update(glob.glob("/usr/lib/**/jupyter_server/templates/page.html", recursive=True))

    # 3. Lokasi Python environment aktif
    prefix = sys.prefix
    candidates.update(glob.glob(f"{prefix}/share/jupyter/lab/static/index.html"))
    candidates.update(glob.glob(f"{prefix}/share/jupyter/lab/templates/page.html"))
    candidates.update(glob.glob(f"{prefix}/lib/**/jupyterlab/static/index.html", recursive=True))
    candidates.update(glob.glob(f"{prefix}/lib/**/jupyter_server/templates/page.html", recursive=True))

    # 4. Pencarian dinamis di direktori server (Kecualikan jupyterhub templates)
    for root in ["/opt", "/usr/local", "/etc/jupyter", "/home/public"]:
        if os.path.exists(root):
            for dirpath, _, filenames in os.walk(root):
                dp = dirpath.replace("\\", "/").lower()
                if "jupyterhub/templates" in dp or "hub/templates" in dp:
                    continue
                if "index.html" in filenames and ("lab/static" in dp or "jupyterlab" in dp):
                    candidates.add(os.path.join(dirpath, "index.html"))
                if "page.html" in filenames and ("templates" in dp and ("lab" in dp or "jupyter_server" in dp)):
                    candidates.add(os.path.join(dirpath, "page.html"))

    return [c for c in candidates if os.path.isfile(c) and not is_hub_login_template(c)]


def inject_into_file(filepath: str) -> bool:
    """Menyisipkan atau memperbarui snippet modal pengumuman di file target."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        # Bersihkan versi lama jika ada
        pattern = re.compile(r"<!-- === BEGIN LAB AI UMPO MODAL ANNOUNCEMENT === -->.*?<!-- === END LAB AI UMPO MODAL ANNOUNCEMENT === -->", re.DOTALL)
        content_cleaned = re.sub(pattern, "", content)

        # Sisipkan sebelum </body> atau </html>
        if "</body>" in content_cleaned:
            new_content = content_cleaned.replace("</body>", f"\n{MODAL_HTML_SNIPPET}\n</body>")
        elif "</html>" in content_cleaned:
            new_content = content_cleaned.replace("</html>", f"\n{MODAL_HTML_SNIPPET}\n</html>")
        else:
            new_content = content_cleaned + f"\n{MODAL_HTML_SNIPPET}\n"

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)

        print(f"✅ Berhasil menanamkan Pop-up Modal Lab AI ke: {filepath}")
        return True
    except Exception as e:
        print(f"⚠️ Gagal menyisipkan ke {filepath}: {e}")
        return False


def main():
    print("🧹 Mensterilkan template halaman login JupyterHub...")
    clean_hub_templates()

    print("🔍 Memindai berkas antarmuka JupyterLab workspace di sistem server...")
    files = find_candidate_html_files()
    
    if not files:
        print("ℹ️ Tidak ditemukan berkas statis JupyterLab di direktori lokal saat ini.")
        print("   (Skrip ini siap dieksekusi di server produksi via deploy_simtik.sh).")
        return 0

    success_count = 0
    for f in files:
        if inject_into_file(f):
            success_count += 1

    print(f"✨ Selesai: {success_count} berkas antarmuka JupyterLab berhasil diperbarui (hanya aktif setelah login).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
