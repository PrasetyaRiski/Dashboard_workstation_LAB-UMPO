#!/usr/bin/env python3
"""
inject_jupyter_modal.py
Skrip otomatis untuk:
1. Membersihkan secara tuntas segala pop-up / modal dari seluruh template halaman login JupyterHub.
2. Menanamkan Resource Monitor Modal HANYA pada antarmuka berkas statis JupyterLab workspace (index.html),
   sehingga pop-up 100% TIDAK PERNAH muncul di menu login dan HANYA aktif saat mahasiswa sudah login.
"""

import os
import sys
import glob
import re

MODAL_HTML_SNIPPET = r'''<!-- === BEGIN LAB AI UMPO MODAL ANNOUNCEMENT === -->
<!-- 1. POPUP MODAL PUSAT BANTUAN & REAL-TIME PERFORMANCE BENTO CONSOLE -->
<div id="lab-ai-popup-overlay" style="display:none; position:fixed; inset:0; z-index:9999999; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); align-items:center; justify-content:center; padding:16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif; box-sizing:border-box;">
  <div id="lab-ai-popup-card" style="background:#0d1117; color:#e6edf3; width:100%; max-width:580px; border-radius:12px; border:1px solid #30363d; box-shadow:0 16px 36px rgba(0,0,0,0.6); overflow:hidden; animation:labModalFadeIn 0.15s ease-out; box-sizing:border-box;">
    
    <!-- Modal Header -->
    <div style="background:#161b22; padding:14px 18px; border-bottom:1px solid #30363d; display:flex; align-items:center; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:10px;">
        <div style="width:28px; height:28px; border-radius:6px; background:#21262d; border:1px solid #30363d; display:flex; align-items:center; justify-content:center; color:#38bdf8;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
        </div>
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <h3 style="margin:0; font-size:14px; font-weight:600; letter-spacing:-0.01em; color:#f0f6fc;">
              Workstation Resource Monitor
            </h3>
            <span style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; background:rgba(63,185,80,0.1); color:#3fb950; border:1px solid rgba(63,185,80,0.3); padding:1px 6px; border-radius:4px; display:inline-flex; align-items:center; gap:4px;">
              <span style="width:5px; height:5px; border-radius:50%; background:#3fb950;"></span> LIVE
            </span>
          </div>
          <p style="margin:2px 0 0; font-size:11px; color:#8b949e;">
            Laboratorium Komputasi AI &bull; FT Universitas Muhammadiyah Ponorogo
          </p>
        </div>
      </div>
      <button id="btn-close-x" class="lab-btn-close" title="Tutup">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>

    <!-- Modal Content Body -->
    <div style="padding:16px 18px; font-size:12px; line-height:1.5; color:#c9d1d9; max-height:calc(85vh - 110px); overflow-y:auto; box-sizing:border-box;">
      
      <!-- Account Info Strip -->
      <div class="lab-account-strip" style="display:flex; justify-content:space-between; align-items:center; background:#161b22; border-radius:6px; padding:8px 12px; margin-bottom:12px; font-size:11.5px; border:1px solid #21262d;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="color:#8b949e;">User:</span>
          <strong id="modal-user-name" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace; color:#58a6ff; font-weight:600;">Detecting...</strong>
          <span style="color:#30363d;">&bull;</span>
          <span id="modal-user-tier" style="color:#8b949e;">--</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="color:#8b949e;">Updated:</span>
          <span id="modal-sync-time" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace; color:#f0f6fc;">--:--:--</span>
        </div>
      </div>

      <!-- Overquota Critical Alert -->
      <div id="overquota-alert-box" style="display:none; background:#161b22; border:1px solid #f85149; border-radius:8px; padding:12px 14px; margin-bottom:12px;">
        <div style="display:flex; align-items:flex-start; gap:10px;">
          <div style="color:#f85149; margin-top:2px; flex-shrink:0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
          <div style="flex:1;">
            <div style="font-weight:600; font-size:12px; color:#ff7b72; margin-bottom:3px;">
              Peringatan: Kapasitas Penyimpanan Melebihi Kuota (Overquota)
            </div>
            <div style="font-size:11.5px; color:#c9d1d9; line-height:1.5;">
              Penggunaan disk akun Anda telah mencapai <strong id="oq-used-val" style="color:#ff7b72; font-family:ui-monospace,monospace;">-- GB</strong> dari kuota <strong id="oq-quota-val" style="font-family:ui-monospace,monospace;">-- GB</strong> (<span id="oq-pct-val" style="font-family:ui-monospace,monospace;">--%</span>).
            </div>
            <div style="margin-top:8px; font-size:11px; color:#8b949e; line-height:1.5; background:#0d1117; padding:8px 10px; border-radius:6px; border:1px solid #21262d;">
              <strong style="color:#f0f6fc;">Tindakan Diperlukan:</strong>
              <div style="margin-top:2px;">1. Unduh berkas notebook <code>.ipynb</code> dan dataset penting ke komputer lokal.</div>
              <div>2. Hapus file checkpoint model (<code>.pt</code>, <code>.ckpt</code>) dan cache lama yang tidak digunakan.</div>
              <div style="margin-top:2px; color:#ff7b72;">&bull; Berkas berukuran besar dapat dihapus oleh Admin jika kuota tidak segera dirapikan.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bento Grid: 4 Metric Cards (Responsive) -->
      <div class="lab-bento-grid">
        
        <!-- Metric 1: CPU -->
        <div class="lab-metric-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; color:#8b949e;">CPU Allocation</span>
            <span id="gauge-txt-cpu-cores" style="font-size:10.5px; font-family:ui-monospace,monospace; color:#8b949e;">0.0 / 2.0 Cores</span>
          </div>
          <div id="gauge-txt-cpu-pct" style="font-size:20px; font-weight:700; color:#f0f6fc; font-family:ui-monospace,monospace; margin:4px 0 8px;">
            0%
          </div>
          <div style="width:100%; height:4px; background:#21262d; border-radius:2px; overflow:hidden;">
            <div id="gauge-bar-cpu" style="width:0%; height:100%; background:#38bdf8; transition:width 0.2s ease;"></div>
          </div>
        </div>

        <!-- Metric 2: Memory (RAM) -->
        <div class="lab-metric-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; color:#8b949e;">Memory (RAM)</span>
            <span id="gauge-txt-ram-limit" style="font-size:10.5px; font-family:ui-monospace,monospace; color:#8b949e;">Limit 6.0 GB</span>
          </div>
          <div id="gauge-txt-ram-val" style="font-size:20px; font-weight:700; color:#f0f6fc; font-family:ui-monospace,monospace; margin:4px 0 8px;">
            0.00 GB <span style="font-size:11.5px; font-weight:400; color:#8b949e;">(0%)</span>
          </div>
          <div style="width:100%; height:4px; background:#21262d; border-radius:2px; overflow:hidden;">
            <div id="gauge-bar-ram" style="width:0%; height:100%; background:#3fb950; transition:width 0.2s ease;"></div>
          </div>
        </div>

        <!-- Metric 3: GPU Acceleration -->
        <div class="lab-metric-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; color:#8b949e;">Akselerasi GPU</span>
            <span id="gauge-txt-gpu-name" style="font-size:10.5px; color:#58a6ff; font-family:ui-monospace,monospace; font-weight:500;">GPU 1</span>
          </div>
          <div id="gauge-txt-gpu-comp" style="font-size:20px; font-weight:700; color:#f0f6fc; font-family:ui-monospace,monospace; margin:4px 0 8px;">
            0% <span style="font-size:11px; font-weight:400; color:#8b949e;">(VRAM 0 MB)</span>
          </div>
          <div style="width:100%; height:4px; background:#21262d; border-radius:2px; overflow:hidden;">
            <div id="gauge-bar-gpu" style="width:0%; height:100%; background:#38bdf8; transition:width 0.2s ease;"></div>
          </div>
        </div>

        <!-- Metric 4: Storage Quota -->
        <div class="lab-metric-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; color:#8b949e;">Home Storage</span>
            <span id="gauge-txt-disk-quota" style="font-size:10.5px; font-family:ui-monospace,monospace; color:#8b949e;">Kuota 10 GB</span>
          </div>
          <div id="gauge-txt-disk-val" style="font-size:20px; font-weight:700; color:#f0f6fc; font-family:ui-monospace,monospace; margin:4px 0 8px;">
            0.00 GB <span style="font-size:11.5px; font-weight:400; color:#8b949e;">(0%)</span>
          </div>
          <div style="width:100%; height:4px; background:#21262d; border-radius:2px; overflow:hidden;">
            <div id="gauge-bar-disk" style="width:0%; height:100%; background:#38bdf8; transition:width 0.2s ease;"></div>
          </div>
        </div>

      </div>

      <!-- SOP & Engineering Standards -->
      <div style="background:#161b22; border:1px solid #21262d; border-radius:8px; padding:12px 14px;">
        <div style="font-weight:600; color:#f0f6fc; font-size:12px; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          SOP & Regulasi Penggunaan Server AI
        </div>
        <div class="lab-sop-grid">
          <div style="background:#0d1117; padding:8px 10px; border-radius:6px; border:1px solid #21262d; font-size:11px; line-height:1.45;">
            <strong style="color:#f0f6fc; display:block; margin-bottom:2px;">1. Single-Device Policy</strong>
            <span style="color:#8b949e;">Satu akun hanya aktif pada 1 perangkat browser secara bersamaan untuk mencegah bentrok data.</span>
          </div>
          <div style="background:#0d1117; padding:8px 10px; border-radius:6px; border:1px solid #21262d; font-size:11px; line-height:1.45;">
            <strong style="color:#f0f6fc; display:block; margin-bottom:2px;">2. Idle Culler Otomatis</strong>
            <span style="color:#8b949e;">Server notebook tanpa aktivitas komputasi akan dihentikan otomatis untuk melepaskan RAM & VRAM.</span>
          </div>
          <div style="background:#0d1117; padding:8px 10px; border-radius:6px; border:1px solid #21262d; font-size:11px; line-height:1.45;">
            <strong style="color:#f0f6fc; display:block; margin-bottom:2px;">3. Folder dataset_shared</strong>
            <span style="color:#8b949e;">Gunakan pintasan <code>~/dataset_shared</code> untuk membaca dataset publik tanpa memotong kuota storage.</span>
          </div>
          <div style="background:#0d1117; padding:8px 10px; border-radius:6px; border:1px solid #21262d; font-size:11px; line-height:1.45;">
            <strong style="color:#f0f6fc; display:block; margin-bottom:2px;">4. Dedicated GPU Riset</strong>
            <span style="color:#8b949e;">Mahasiswa skripsi/riset dapat mengajukan alokasi Dedicated GPU 0 (Level 1) ke Asisten Laboratorium.</span>
          </div>
        </div>
      </div>

    </div>

    <!-- Modal Footer -->
    <div style="padding:12px 18px; background:#161b22; border-top:1px solid #30363d; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
      <span id="lab-gemini-chip" style="display:none; font-size:10.5px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; border:1px solid #30363d; border-radius:999px; padding:2px 9px; color:#8b949e;">
        Gemini: --
      </span>
      <div style="display:flex; align-items:center; gap:8px; margin-left:auto;">
        <button id="btn-open-gemini-key" class="lab-btn-secondary" type="button">
          Gemini API Key
        </button>
        <button id="btn-dismiss-lab-popup" class="lab-btn-primary" type="button">
          Tutup Monitor
        </button>
      </div>
    </div>

  </div>
</div>

<!-- 1b. GEMINI API KEY MODAL (KEY MILIK MAHASISWA SENDIRI) -->
<div id="lab-gemini-overlay" style="display:none; position:fixed; inset:0; z-index:10000000; background:rgba(0,0,0,0.78); align-items:center; justify-content:center; padding:16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif; box-sizing:border-box;">
  <div id="lab-gemini-card" style="background:#0d1117; color:#e6edf3; width:100%; max-width:520px; border-radius:12px; border:1px solid #30363d; box-shadow:0 16px 36px rgba(0,0,0,0.65); overflow:hidden; animation:labModalFadeIn 0.15s ease-out; box-sizing:border-box;">

    <div style="background:#161b22; padding:14px 18px; border-bottom:1px solid #30363d; display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div style="display:flex; align-items:center; gap:10px;">
        <div style="width:28px; height:28px; border-radius:6px; background:#21262d; border:1px solid #30363d; display:flex; align-items:center; justify-content:center; color:#a371f7;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"></path></svg>
        </div>
        <div>
          <h3 style="margin:0; font-size:14px; font-weight:600; letter-spacing:-0.01em; color:#f0f6fc;">
            Gemini API Key
          </h3>
          <p style="margin:2px 0 0; font-size:11px; color:#8b949e;">
            Hubungkan notebook Anda ke Google Gemini
          </p>
        </div>
      </div>
      <button id="gemini-close-x" class="lab-btn-close" title="Tutup" type="button">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>

    <div style="padding:16px 18px; font-size:12px; line-height:1.5; color:#c9d1d9; max-height:calc(85vh - 140px); overflow-y:auto; box-sizing:border-box;">

      <div id="gemini-alert" style="display:none; border-radius:8px; padding:10px 12px; margin-bottom:12px; font-size:11.5px; line-height:1.45;"></div>

      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; background:#161b22; border:1px solid #21262d; border-radius:8px; padding:9px 12px; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:8px; min-width:0;">
          <span id="gemini-status-dot" style="width:7px; height:7px; border-radius:50%; background:#8b949e; flex-shrink:0;"></span>
          <span id="gemini-status-text" style="font-size:11.5px; color:#c9d1d9;">Memeriksa status…</span>
        </div>
        <span id="gemini-status-masked" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:10.5px; color:#8b949e; white-space:nowrap;"></span>
      </div>

      <label for="gemini-key-input" style="display:block; font-size:11px; font-weight:600; color:#c9d1d9; margin-bottom:6px;">
        API Key AI Studio
      </label>
      <input id="gemini-key-input" type="password" autocomplete="off" spellcheck="false" autocapitalize="off"
             placeholder="AIza..."
             style="width:100%; box-sizing:border-box; background:#0d1117; border:1px solid #30363d; border-radius:8px; color:#f0f6fc; padding:9px 12px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; outline:none;" />
      <p style="margin:7px 0 0; font-size:11px; color:#8b949e; line-height:1.5;">
        Key disimpan di server dengan izin <code style="color:#c9d1d9;">0600</code> dan hanya bisa dibaca akun Anda.
        Key <strong style="color:#c9d1d9;">tidak</strong> tersimpan di dalam notebook.
      </p>
      <p style="margin:7px 0 0; font-size:11px; color:#8b949e; line-height:1.5;">
        Chat Gemini ada di <strong style="color:#c9d1d9;">sidebar kiri JupyterLab</strong> (ikon chat).
        Key yang sama dipakai untuk notebook dan chat.
      </p>

      <div style="margin-top:14px; background:#161b22; border:1px solid #21262d; border-radius:8px; padding:10px 12px;">
        <div style="display:flex; justify-content:space-between; align-items:baseline; gap:8px;">
          <span style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; color:#8b949e;">Token hari ini</span>
          <span id="gemini-usage-total" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:15px; font-weight:700; color:#f0f6fc;">0</span>
        </div>
        <div id="gemini-usage-detail" style="margin-top:3px; font-size:10.5px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; color:#8b949e;">
          prompt 0 &bull; output 0 &bull; 0 request
        </div>
      </div>

    </div>

    <div style="padding:12px 18px; background:#161b22; border-top:1px solid #30363d; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
      <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
         style="font-size:11px; color:#58a6ff; text-decoration:none;">
        Buat key di AI Studio &nearr;
      </a>
      <div style="display:flex; align-items:center; gap:8px; margin-left:auto;">
        <button id="gemini-delete" class="lab-btn-danger" type="button" style="display:none;">Hapus</button>
        <button id="gemini-later" class="lab-btn-secondary" type="button">Nanti</button>
        <button id="gemini-save" class="lab-btn-primary" type="button">Simpan &amp; Uji</button>
      </div>
    </div>

  </div>
</div>

<!-- 2. FLOATING PERFORMANCE TOOLBAR -->
<div id="lab-ai-status-pill" title="Workstation Telemetry & Resource Monitor (Klik untuk membuka rincian)" style="display:none;">
  <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#3fb950; flex-shrink:0;"></span>
  <div id="lab-ai-live-tags" style="display:flex; align-items:center; gap:8px;">
    <span>CPU <strong id="pill-val-cpu" style="color:#f0f6fc;">--%</strong></span>
    <span style="color:#30363d;">&bull;</span>
    <span>RAM <strong id="pill-val-ram" style="color:#f0f6fc;">--G</strong></span>
    <span style="color:#30363d;">&bull;</span>
    <span>GPU <strong id="pill-val-gpu" style="color:#f0f6fc;">--%</strong></span>
    <span style="color:#30363d;">&bull;</span>
    <span id="pill-disk-container">Disk <strong id="pill-val-disk" style="color:#f0f6fc;">--G</strong></span>
  </div>
  <span style="background:#21262d; border:1px solid #30363d; color:#8b949e; font-size:9.5px; padding:1px 5px; border-radius:3px; margin-left:2px; font-weight:600;">
    Monitor
  </span>
</div>

<style>
@keyframes labModalFadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

.lab-bento-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.lab-sop-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.lab-metric-card {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 8px;
  padding: 12px 14px;
  box-sizing: border-box;
}

.lab-btn-primary {
  background: #238636;
  color: #ffffff;
  border: 1px solid rgba(240,246,252,0.1);
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
  font-family: inherit;
}
.lab-btn-primary:hover {
  background: #2ea043;
}

.lab-btn-close {
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease, background-color 0.15s ease;
}
.lab-btn-close:hover {
  color: #e6edf3;
  background: #21262d;
}

.lab-btn-secondary {
  background: #21262d;
  color: #e6edf3;
  border: 1px solid #30363d;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
  font-family: inherit;
}
.lab-btn-secondary:hover {
  background: #30363d;
  border-color: #484f58;
}

.lab-btn-danger {
  background: transparent;
  color: #ff7b72;
  border: 1px solid rgba(248,81,73,0.45);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
  font-family: inherit;
}
.lab-btn-danger:hover {
  background: rgba(248,81,73,0.12);
}

#gemini-key-input:focus {
  border-color: #58a6ff !important;
  box-shadow: 0 0 0 3px rgba(88,166,255,0.15);
}

.lab-btn-primary[disabled],
.lab-btn-secondary[disabled] {
  opacity: 0.55;
  cursor: not-allowed;
}

#lab-ai-status-pill {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 99999;
  align-items: center;
  gap: 8px;
  background: #161b22;
  color: #c9d1d9;
  border: 1px solid #30363d;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  padding: 6px 14px;
  border-radius: 20px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  cursor: pointer;
  user-select: none;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
#lab-ai-status-pill:hover {
  background: #21262d;
  border-color: #58a6ff;
  color: #ffffff;
}

@media (max-width: 620px) {
  #lab-ai-popup-overlay {
    padding: 10px !important;
  }
  #lab-ai-popup-card {
    max-width: 100% !important;
  }
  .lab-bento-grid {
    grid-template-columns: 1fr !important;
  }
  .lab-sop-grid {
    grid-template-columns: 1fr !important;
  }
  .lab-account-strip {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 6px !important;
  }
  #lab-ai-status-pill {
    bottom: 12px !important;
    right: 12px !important;
    padding: 4px 10px !important;
    font-size: 10px !important;
  }
}
</style>

<script>
(function() {
  function isUserLoggedInJupyter() {
    var path = window.location.pathname || '';

    if (path.indexOf('/hub/login') !== -1 || path.indexOf('/login') !== -1 || path === '/' || path === '/hub' || path === '/hub/') {
      return null;
    }
    if (document.querySelector('form[action*="login"]') || document.getElementById('login_submit_btn')) {
      return null;
    }

    var m = path.match(/\/user\/([^\/]+)/);
    if (m && m[1] && m[1] !== 'hub') {
      return m[1];
    }

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

    if (!username) {
      if (overlay) overlay.style.display = 'none';
      if (pill) pill.style.display = 'none';
      return;
    }

    var btnDismiss = document.getElementById('btn-dismiss-lab-popup');
    var btnCloseX = document.getElementById('btn-close-x');
    var userNameEl = document.getElementById('modal-user-name');
    var userTierEl = document.getElementById('modal-user-tier');

    if (userNameEl) userNameEl.innerText = username;
    if (pill) pill.style.display = 'flex';

    try {
      sessionStorage.removeItem('lab_ai_popup_seen_' + username);
    } catch(e) {}

    var resourceShown = false;
    function showResourceModal() {
      if (overlay) overlay.style.display = 'flex';
    }
    function showResourceOnce() {
      if (resourceShown) return;
      resourceShown = true;
      showResourceModal();
    }

    function hideModal() {
      if (overlay) overlay.style.display = 'none';
    }

    if (btnDismiss) btnDismiss.onclick = hideModal;
    if (btnCloseX) btnCloseX.onclick = hideModal;

    if (pill && overlay) {
      pill.onclick = function() {
        overlay.style.display = 'flex';
        loadGeminiStatus(null, null);
      };
    }

    // Urutan startup: utamakan permintaan API key Gemini, baru tampilkan
    // resource monitor agar dua modal tidak bertumpuk.
    setTimeout(function() {
      loadGeminiStatus(function (d) {
        var skipped = false;
        try {
          skipped = sessionStorage.getItem('lab_gemini_skipped_' + username) === '1';
        } catch (e) {}
        if (d && !d.configured && !skipped) {
          openGemini('first');
        } else if (d && d.needs_attention) {
          openGemini('quota');
        } else {
          showResourceOnce();
        }
      }, function () {
        showResourceOnce();
      });
    }, 1500);

    function updateTelemetry() {
      var u = isUserLoggedInJupyter();
      if (!u) return;

      fetch('/api/user-telemetry/' + u)
        .then(function(res) {
          if (!res.ok) throw new Error(res.status);
          return res.json();
        })
        .then(function(data) {
          applyTelemetry(data);
        })
        .catch(function() {
          fallbackJupyterMetrics();
        });
    }

    function applyTelemetry(d) {
      var cpuPct = Math.round(d.cpu_percent || 0);
      var cpuUsed = (d.cpu_cores_used || 0).toFixed(1);
      var cpuLimit = d.cpu_cores_limit || 2;
      var ramUsedMB = Math.round(d.ram_used_mb || 0);
      var ramMaxMB = Math.round(d.ram_max_mb || 6144);
      var ramPct = Math.min(100, Math.round((ramUsedMB / ramMaxMB) * 100));
      var gpuComp = Math.round(d.gpu_compute_percent || 0);
      var vramUsed = Math.round(d.vram_used_mb || 0);
      var vramLimit = Math.round(d.vram_limit_mb || 4893);
      var diskUsedMB = Math.round(d.disk_used_mb || 0);
      var diskQuotaGB = Math.round(d.disk_quota_gb || 10);
      var diskPct = Math.min(100, Math.round(d.disk_percent || 0));

      if (userTierEl && d.tier) userTierEl.innerText = d.tier;

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

      var elCpuPct = document.getElementById('gauge-txt-cpu-pct');
      var elCpuCores = document.getElementById('gauge-txt-cpu-cores');
      var barCpu = document.getElementById('gauge-bar-cpu');
      if (elCpuPct) elCpuPct.innerText = cpuPct + '%';
      if (elCpuCores) elCpuCores.innerText = cpuUsed + ' / ' + cpuLimit + ' Cores';
      if (barCpu) barCpu.style.width = Math.min(100, (cpuPct / (cpuLimit * 100)) * 100) + '%';

      var elRamLimit = document.getElementById('gauge-txt-ram-limit');
      if (elRamLimit) {
        var ramLimitGB = (ramMaxMB / 1024);
        var ramLimitStr = ramLimitGB >= 1 ? (Number.isInteger(ramLimitGB) ? ramLimitGB + '.0 GB' : ramLimitGB.toFixed(1) + ' GB') : ramMaxMB + ' MB';
        elRamLimit.innerText = 'Limit ' + ramLimitStr;
      }

      var elRamVal = document.getElementById('gauge-txt-ram-val');
      var barRam = document.getElementById('gauge-bar-ram');
      if (elRamVal) {
        var ramValStr = (ramUsedMB/1024).toFixed(2) + ' GB ';
        elRamVal.innerHTML = ramValStr + '<span style="font-size:11.5px; font-weight:400; color:#8b949e;">(' + ramPct + '%)</span>';
      }
      if (barRam) {
        barRam.style.width = ramPct + '%';
        barRam.style.background = ramPct > 85 ? '#f85149' : '#3fb950';
      }

      var elGpuComp = document.getElementById('gauge-txt-gpu-comp');
      var elGpuName = document.getElementById('gauge-txt-gpu-name');
      var barGpu = document.getElementById('gauge-bar-gpu');
      if (elGpuName) elGpuName.innerText = d.gpu_name || d.gpu_assigned || 'GPU';
      if (elGpuComp) {
        elGpuComp.innerHTML = gpuComp + '% <span style="font-size:11px; font-weight:400; color:#8b949e;">(VRAM ' + vramUsed + ' / ' + vramLimit + ' MB)</span>';
      }
      if (barGpu) barGpu.style.width = Math.max(gpuComp, Math.round((vramUsed/vramLimit)*100)) + '%';

      var elDiskQuota = document.getElementById('gauge-txt-disk-quota');
      if (elDiskQuota) {
        elDiskQuota.innerText = 'Kuota ' + diskQuotaGB + ' GB';
      }

      var elDiskVal = document.getElementById('gauge-txt-disk-val');
      var barDisk = document.getElementById('gauge-bar-disk');
      if (elDiskVal) {
        var diskValStr = (diskUsedMB/1024).toFixed(2) + ' GB ';
        elDiskVal.innerHTML = diskValStr + '<span style="font-size:11.5px; font-weight:400; color:#8b949e;">(' + diskPct + '%)</span>';
      }
      if (barDisk) {
        barDisk.style.width = diskPct + '%';
        barDisk.style.background = diskPct >= 100 ? '#f85149' : (diskPct > 80 ? '#d29922' : '#38bdf8');
      }

      var syncTime = document.getElementById('modal-sync-time');
      if (syncTime) syncTime.innerText = d.server_time || new Date().toLocaleTimeString();

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
          if (overlay && !(geminiOverlay && geminiOverlay.style.display === 'flex')) {
            overlay.style.display = 'flex';
          }
        }

        if (pill) {
          pill.style.borderColor = '#f85149';
          pill.style.background = '#211517';
        }
        if (pillDiskContainer) {
          pillDiskContainer.innerHTML = '<span style="color:#ff7b72; font-weight:600;">Disk ' + (diskUsedMB/1024).toFixed(1) + '/' + diskQuotaGB + 'G (Overquota)</span>';
        }
      } else {
        if (oqBox) oqBox.style.display = 'none';
        if (pill) {
          pill.style.borderColor = '#30363d';
          pill.style.background = '#161b22';
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
            var maxMB = limitBytes ? Math.round(limitBytes / (1024 * 1024)) : 6144;
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

    // =====================================================================
    // GEMINI API KEY (per user)
    // =====================================================================
    var geminiOverlay      = document.getElementById('lab-gemini-overlay');
    var geminiInput        = document.getElementById('gemini-key-input');
    var geminiSaveBtn      = document.getElementById('gemini-save');
    var geminiLaterBtn     = document.getElementById('gemini-later');
    var geminiDeleteBtn    = document.getElementById('gemini-delete');
    var geminiCloseX       = document.getElementById('gemini-close-x');
    var geminiOpenBtn      = document.getElementById('btn-open-gemini-key');
    var geminiAlert        = document.getElementById('gemini-alert');
    var geminiStatusText   = document.getElementById('gemini-status-text');
    var geminiStatusDot    = document.getElementById('gemini-status-dot');
    var geminiStatusMasked = document.getElementById('gemini-status-masked');
    var geminiUsageTotal   = document.getElementById('gemini-usage-total');
    var geminiUsageDetail  = document.getElementById('gemini-usage-detail');
    var geminiChip         = document.getElementById('lab-gemini-chip');

    var geminiBusy = false;
    var geminiState = null;
    var geminiOpenedByStartup = false;

    var geminiXsrfPromise = null;

    // Cookie `_xsrf` di halaman Lab milik single-user server (path
    // `/user/<nama>/`), bukan milik Hub. Token Hub harus diambil dari halaman
    // Hub yang same-origin; situs lain tidak bisa membaca respons ini
    // karena SOP/CORS.
    function getHubXsrf() {
      if (geminiXsrfPromise) return geminiXsrfPromise;
      geminiXsrfPromise = fetch('/hub/home', { credentials: 'same-origin' })
        .then(function (res) { return res.ok ? res.text() : ''; })
        .then(function (html) {
          var m = html.match(/xsrf_token:\s*"([^"]+)"/);
          return m ? m[1] : '';
        })
        .catch(function () { return ''; });
      return geminiXsrfPromise;
    }

    function geminiHeaders(json, token) {
      var headers = {};
      if (json) headers['Content-Type'] = 'application/json';
      if (token) headers['X-XSRFToken'] = token;
      return headers;
    }

    function fmtNum(n) {
      try {
        return Number(n || 0).toLocaleString('id-ID');
      } catch (e) {
        return String(n || 0);
      }
    }

    function showGeminiAlert(kind, text) {
      if (!geminiAlert) return;
      var palette = {
        error:   { bg: 'rgba(248,81,73,0.10)',  border: '#f85149', color: '#ff7b72' },
        warning: { bg: 'rgba(210,153,34,0.10)', border: '#d29922', color: '#e3b341' },
        success: { bg: 'rgba(63,185,80,0.10)',  border: '#3fb950', color: '#7ee787' },
        info:    { bg: 'rgba(88,166,255,0.08)', border: '#388bfd', color: '#79c0ff' }
      };
      var p = palette[kind] || palette.info;
      geminiAlert.style.display = 'block';
      geminiAlert.style.background = p.bg;
      geminiAlert.style.border = '1px solid ' + p.border;
      geminiAlert.style.color = p.color;
      geminiAlert.textContent = text;
    }

    function hideGeminiAlert() {
      if (geminiAlert) geminiAlert.style.display = 'none';
    }

    function renderGemini(d) {
      geminiState = d || null;
      var configured = !!(d && d.configured);
      var quota = !!(d && d.needs_attention);
      var usage = (d && d.usage) || {};

      if (geminiStatusText) {
        geminiStatusText.textContent = configured
          ? (quota ? 'Key terpasang, tetapi kuota sedang habis' : 'Key aktif dan siap dipakai')
          : 'Belum ada key terpasang';
      }
      if (geminiStatusDot) {
        geminiStatusDot.style.background = configured ? (quota ? '#d29922' : '#3fb950') : '#8b949e';
      }
      if (geminiStatusMasked) {
        geminiStatusMasked.textContent = configured ? (d.masked || '') : '';
      }
      if (geminiUsageTotal) {
        geminiUsageTotal.textContent = fmtNum(usage.total_tokens);
      }
      if (geminiUsageDetail) {
        geminiUsageDetail.textContent =
          'prompt ' + fmtNum(usage.prompt_tokens) +
          ' \u2022 output ' + fmtNum(usage.output_tokens) +
          ' \u2022 ' + fmtNum(usage.requests) + ' request';
      }
      if (geminiDeleteBtn) {
        geminiDeleteBtn.style.display = configured ? 'inline-block' : 'none';
      }
      if (geminiInput) {
        geminiInput.placeholder = configured ? (d.masked || 'AIza...') : 'AIza...';
      }

      if (geminiChip) {
        geminiChip.style.display = 'inline-flex';
        if (!configured) {
          geminiChip.textContent = 'Gemini: belum aktif';
          geminiChip.style.color = '#d29922';
          geminiChip.style.borderColor = 'rgba(210,153,34,0.4)';
        } else if (quota) {
          geminiChip.textContent = 'Gemini: limit';
          geminiChip.style.color = '#ff7b72';
          geminiChip.style.borderColor = 'rgba(248,81,73,0.4)';
        } else {
          geminiChip.textContent = 'Gemini: ' + fmtNum(usage.total_tokens) + ' token';
          geminiChip.style.color = '#8b949e';
          geminiChip.style.borderColor = '#30363d';
        }
      }
    }

    function openGemini(reason) {
      if (!geminiOverlay) return;
      hideGeminiAlert();
      geminiOpenedByStartup = (reason === 'first' || reason === 'quota');

      if (reason === 'first') {
        showGeminiAlert('info', 'Belum ada key. Tempel API key AI Studio Anda lalu klik Simpan & Uji, atau tekan Nanti.');
      } else if (reason === 'quota' || (geminiState && geminiState.needs_attention)) {
        showGeminiAlert('warning', 'Kuota key ini habis (HTTP 429). Buat key baru di AI Studio lalu simpan di sini.');
      }

      geminiOverlay.style.display = 'flex';
      if (geminiInput) {
        geminiInput.value = '';
        setTimeout(function () {
          try { geminiInput.focus(); } catch (e) {}
        }, 60);
      }
    }

    function closeGemini(action) {
      if (geminiOverlay) geminiOverlay.style.display = 'none';
      if (geminiInput) geminiInput.value = '';
      hideGeminiAlert();
      if (action === 'later') {
        try { sessionStorage.setItem('lab_gemini_skipped_' + username, '1'); } catch (e) {}
      }
      if (geminiOpenedByStartup) {
        geminiOpenedByStartup = false;
        showResourceOnce();
      }
    }

    function setGeminiBusy(busy) {
      geminiBusy = busy;
      if (geminiSaveBtn) {
        geminiSaveBtn.disabled = busy;
        geminiSaveBtn.textContent = busy ? 'Menguji\u2026' : 'Simpan & Uji';
      }
      if (geminiDeleteBtn) geminiDeleteBtn.disabled = busy;
      if (geminiLaterBtn) geminiLaterBtn.disabled = busy;
    }

    function loadGeminiStatus(onDone, onFail) {
      fetch('/hub/api/gemini-key', { credentials: 'same-origin' })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (data) {
          renderGemini(data);
          if (onDone) onDone(data);
        })
        .catch(function () {
          if (onFail) onFail();
        });
    }

    function saveGeminiKey() {
      if (geminiBusy) return;
      var value = ((geminiInput && geminiInput.value) || '').trim();
      if (!value) {
        showGeminiAlert('error', 'API key wajib diisi.');
        return;
      }
      hideGeminiAlert();
      setGeminiBusy(true);

      getHubXsrf()
        .then(function (token) {
          return fetch('/hub/api/gemini-key', {
            method: 'POST',
            credentials: 'same-origin',
            headers: geminiHeaders(true, token),
            body: JSON.stringify({ api_key: value })
          });
        })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok) throw new Error(data.message || ('Gagal menyimpan (HTTP ' + res.status + ')'));
            return data;
          });
        })
        .then(function (data) {
          renderGemini(data);
          try { sessionStorage.removeItem('lab_gemini_skipped_' + username); } catch (e) {}
          if (data.validation && data.validation.state === 'quota') {
            showGeminiAlert('warning', 'Key tersimpan, tetapi kuota key ini habis. Ganti dengan key lain bila perlu.');
            return;
          }
          showGeminiAlert('success', 'Key tersimpan dan berhasil diuji ke Google.');
          setTimeout(function () { closeGemini('saved'); }, 900);
        })
        .catch(function (err) {
          showGeminiAlert('error', (err && err.message) ? err.message : 'Gagal menyimpan key.');
        })
        .then(function () { setGeminiBusy(false); });
    }

    function deleteGeminiKey() {
      if (geminiBusy) return;
      if (!window.confirm('Hapus Gemini API key dari akun Anda?')) return;
      setGeminiBusy(true);

      getHubXsrf()
        .then(function (token) {
          return fetch('/hub/api/gemini-key', {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: geminiHeaders(false, token)
          });
        })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok) throw new Error(data.message || ('HTTP ' + res.status));
            return data;
          });
        })
        .then(function (data) {
          renderGemini(data);
          showGeminiAlert('success', 'Key berhasil dihapus.');
        })
        .catch(function (err) {
          showGeminiAlert('error', (err && err.message) ? err.message : 'Gagal menghapus key.');
        })
        .then(function () { setGeminiBusy(false); });
    }

    if (geminiOpenBtn) {
      geminiOpenBtn.onclick = function () {
        openGemini('manual');
        loadGeminiStatus(null, null);
      };
    }
    if (geminiCloseX) {
      geminiCloseX.onclick = function () { closeGemini('close'); };
    }
    if (geminiLaterBtn) {
      geminiLaterBtn.onclick = function () { closeGemini('later'); };
    }
    if (geminiSaveBtn) {
      geminiSaveBtn.onclick = saveGeminiKey;
    }
    if (geminiDeleteBtn) {
      geminiDeleteBtn.onclick = deleteGeminiKey;
    }
    if (geminiInput) {
      geminiInput.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          saveGeminiKey();
        }
      });
    }

    setInterval(function () {
      if (geminiOverlay && geminiOverlay.style.display === 'flex' && !geminiBusy) {
        loadGeminiStatus(null, null);
      }
    }, 15000);

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


def clean_all_login_and_hub_templates():
    """
    Membersihkan secara tuntas injeksi modal dari SEMUA template HTML JupyterHub (login.html, page.html, dll).
    Template halaman Hub TIDAK BOLEH mengandung kode modal.
    """
    import subprocess
    pattern = re.compile(
        r"<!-- === BEGIN LAB AI UMPO MODAL ANNOUNCEMENT === -->.*?<!-- === END LAB AI UMPO MODAL ANNOUNCEMENT === -->",
        re.DOTALL
    )

    candidate_files = set()

    # 1. Pindai langsung menggunakan grep kecepatan tinggi di seluruh direktori server
    try:
        res = subprocess.run(
            ["grep", "-rl", "--include=*.html", "BEGIN LAB AI UMPO MODAL ANNOUNCEMENT", "/opt", "/usr", "/etc", "/home", "/var"],
            capture_output=True, text=True, timeout=12
        )
        for line in res.stdout.splitlines():
            fp = line.strip()
            # Kecualikan HANYA berkas statis index.html workspace singleuser
            if fp and fp.endswith(".html"):
                if not (fp.endswith("index.html") and ("lab/static" in fp or "jupyterlab/static" in fp)):
                    candidate_files.add(fp)
    except Exception as e:
        print(f"ℹ️ Info grep search: {e}")

    # 2. Pindai modul JupyterHub dan Jupyter Server aktif jika terpasang di runtime
    try:
        import jupyterhub
        jh_dir = os.path.dirname(jupyterhub.__file__)
        candidate_files.update(glob.glob(f"{jh_dir}/templates/*.html"))
        candidate_files.update(glob.glob(f"{jh_dir}/**/*.html", recursive=True))
    except Exception:
        pass

    try:
        import jupyter_server
        js_dir = os.path.dirname(jupyter_server.__file__)
        candidate_files.update(glob.glob(f"{js_dir}/templates/*.html"))
    except Exception:
        pass

    # 3. Direktori template standar JupyterHub
    hub_template_dirs = [
        "/opt/jupyterhub/share/jupyterhub/templates",
        "/usr/local/share/jupyterhub/templates",
        "/usr/share/jupyterhub/templates",
        "/etc/jupyterhub/templates",
        f"{sys.prefix}/share/jupyterhub/templates",
        "/opt/jupyterhub/share/jupyter/lab/templates",
        "/usr/local/share/jupyter/lab/templates",
        "/usr/share/jupyter/lab/templates",
        f"{sys.prefix}/share/jupyter/lab/templates",
    ]

    for d in hub_template_dirs:
        if os.path.exists(d):
            candidate_files.update(glob.glob(f"{d}/*.html"))
            candidate_files.update(glob.glob(f"{d}/**/*.html", recursive=True))

    for p in ["/opt/jupyterhub", "/usr/local/lib", "/usr/lib", sys.prefix]:
        if os.path.exists(p):
            candidate_files.update(glob.glob(f"{p}/**/jupyterhub/templates/*.html", recursive=True))
            candidate_files.update(glob.glob(f"{p}/**/jupyter_server/templates/page.html", recursive=True))

    cleaned_count = 0
    for fpath in candidate_files:
        try:
            if not os.path.isfile(fpath):
                continue
            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            if "BEGIN LAB AI UMPO MODAL ANNOUNCEMENT" in content:
                new_content = re.sub(pattern, "", content)
                with open(fpath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"🧹 BERHASIL DIBERSIHKAN: Pop-up dicopot dari template: {fpath}")
                cleaned_count += 1
        except Exception as e:
            print(f"⚠️ Gagal memeriksa {fpath}: {e}")

    print(f"✅ Selesai: {cleaned_count} file template Hub/Login berhasil dibersihkan dari pop-up.")


def find_jupyterlab_static_files():
    """
    Mencari HANYA berkas statis index.html milik workspace JupyterLab.
    Berkas ini HANYA dibuka saat pengguna sudah masuk ke /user/<username>/lab.
    Berkas ini TIDAK PERNAH dibuka oleh halaman login /hub/login.
    """
    candidates = set()

    # 1. Lokasi standar /opt/jupyterhub dan /opt/ai_env
    candidates.update(glob.glob("/opt/jupyterhub/share/jupyter/lab/static/index.html"))
    candidates.update(glob.glob("/opt/jupyterhub/lib/**/jupyterlab/static/index.html", recursive=True))
    candidates.update(glob.glob("/opt/ai_env/share/jupyter/lab/static/index.html"))
    candidates.update(glob.glob("/opt/ai_env/lib/**/jupyterlab/static/index.html", recursive=True))

    # 2. Lokasi /usr dan /usr/local
    candidates.update(glob.glob("/usr/local/share/jupyter/lab/static/index.html"))
    candidates.update(glob.glob("/usr/share/jupyter/lab/static/index.html"))
    candidates.update(glob.glob("/usr/local/lib/**/jupyterlab/static/index.html", recursive=True))
    candidates.update(glob.glob("/usr/lib/**/jupyterlab/static/index.html", recursive=True))

    # 3. Lokasi Python environment aktif
    prefix = sys.prefix
    candidates.update(glob.glob(f"{prefix}/share/jupyter/lab/static/index.html"))
    candidates.update(glob.glob(f"{prefix}/lib/**/jupyterlab/static/index.html", recursive=True))

    # Filter ketat: HANYA index.html dan BUKAN template
    valid = []
    for c in candidates:
        if os.path.isfile(c) and c.endswith("index.html") and "templates" not in c:
            valid.append(c)

    return valid


def inject_into_file(filepath: str) -> bool:
    """Menyisipkan atau memperbarui snippet modal pengumuman di file target workspace."""
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

        print(f"✅ Berhasil menanamkan Pop-up Modal Lab AI ke workspace: {filepath}")
        return True
    except Exception as e:
        print(f"⚠️ Gagal menyisipkan ke {filepath}: {e}")
        return False


def main():
    print("1️⃣ Membersihkan template login JupyterHub dari segala pop-up...")
    clean_all_login_and_hub_templates()

    print("\n2️⃣ Mencari berkas antarmuka JupyterLab workspace (Single-User)...")
    files = find_jupyterlab_static_files()

    if not files:
        print("ℹ️ Tidak ditemukan berkas statis JupyterLab workspace di direktori lokal saat ini.")
        print("   (Skrip ini siap dieksekusi di server produksi via deploy_simtik.sh).")
        return 0

    success_count = 0
    for f in files:
        if inject_into_file(f):
            success_count += 1

    print(f"\n✨ Selesai: {success_count} berkas workspace JupyterLab berhasil dikonfigurasi (HANYA muncul saat sudah login).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
