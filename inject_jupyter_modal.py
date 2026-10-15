#!/usr/bin/env python3
"""
inject_jupyter_modal.py
Skrip otomatis untuk menanamkan Pop-Up Modal pemberitahuan dan pusat bantuan
ke dalam antarmuka JupyterLab & JupyterHub Laboratorium AI UMPO.
"""

import os
import sys
import glob
import re

MODAL_HTML_SNIPPET = r'''<!-- === BEGIN LAB AI UMPO MODAL ANNOUNCEMENT === -->
<!-- 1. POPUP MODAL PUSAT BANTUAN & REAL-TIME PERFORMANCE GAUGES -->
<div id="lab-ai-popup-overlay" style="display:none; position:fixed; inset:0; z-index:9999999; background:rgba(15,23,42,0.75); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); align-items:center; justify-content:center; padding:16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div id="lab-ai-popup-card" style="background:#0f172a; color:#f8fafc; width:100%; max-width:540px; border-radius:24px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(59,130,246,0.25); overflow:hidden; animation:labModalFadeIn 0.25s cubic-bezier(0.16,1,0.3,1); box-sizing:border-box;">
    
    <!-- Modal Header -->
    <div style="background:linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%); padding:18px 22px; color:#ffffff; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.1);">
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="width:38px; height:38px; border-radius:12px; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25); display:flex; align-items:center; justify-content:center; font-size:20px; shrink:0;">
          ⚡
        </div>
        <div>
          <div style="display:inline-flex; align-items:center; gap:5px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; background:rgba(16,185,129,0.25); color:#6ee7b7; padding:2px 8px; border-radius:999px; margin-bottom:2px; border:1px solid rgba(16,185,129,0.35);">
            <span class="lab-ai-pulse-dot" style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10b981; shrink:0;"></span>
            Live Performance Monitor
          </div>
          <h3 style="margin:0; font-size:15.5px; font-weight:700; letter-spacing:-0.01em; line-height:1.2;">
            Pusat Monitoring & Bantuan Lab AI UMPO
          </h3>
        </div>
      </div>
      <div id="modal-user-badge" style="font-size:11px; font-family:monospace; background:rgba(0,0,0,0.3); padding:4px 8px; border-radius:8px; border:1px solid rgba(255,255,255,0.15); color:#93c5fd;">
        NIM: Deteksi...
      </div>
    </div>

    <!-- Modal Content Body -->
    <div style="padding:20px 22px; font-size:12.5px; line-height:1.5; color:#cbd5e1; max-height:80vh; overflow-y:auto;">
      
      <!-- Real-Time Hardware Performance Gauges -->
      <div style="background:#1e293b; border:1px solid #334155; border-radius:16px; padding:14px; margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:#94a3b8; letter-spacing:0.05em;">
            📊 Real-Time Resource Gauges (Live 3s):
          </span>
          <span id="modal-sync-time" style="font-size:10.5px; font-family:monospace; color:#64748b;">
            Sinkronisasi...
          </span>
        </div>

        <!-- 1. CPU Gauge -->
        <div style="margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; font-size:11.5px; margin-bottom:4px;">
            <span style="color:#93c5fd; font-weight:600;">⚡ CPU Usage (2 Core):</span>
            <span id="gauge-txt-cpu" style="font-weight:700; color:#f8fafc; font-family:monospace;">0% (0.0 / 2 Core)</span>
          </div>
          <div style="width:100%; height:7px; background:#0f172a; border-radius:999px; overflow:hidden;">
            <div id="gauge-bar-cpu" style="width:0%; height:100%; background:linear-gradient(90deg, #3b82f6, #60a5fa); border-radius:999px; transition:width 0.4s ease;"></div>
          </div>
        </div>

        <!-- 2. RAM Gauge -->
        <div style="margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; font-size:11.5px; margin-bottom:4px;">
            <span style="color:#6ee7b7; font-weight:600;">🧠 RAM Memory (4 GB Limit):</span>
            <span id="gauge-txt-ram" style="font-weight:700; color:#f8fafc; font-family:monospace;">0 MB / 4,096 MB (0%)</span>
          </div>
          <div style="width:100%; height:7px; background:#0f172a; border-radius:999px; overflow:hidden;">
            <div id="gauge-bar-ram" style="width:0%; height:100%; background:linear-gradient(90deg, #10b981, #34d399); border-radius:999px; transition:width 0.4s ease;"></div>
          </div>
        </div>

        <!-- 3. GPU Gauge -->
        <div style="margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; font-size:11.5px; margin-bottom:4px;">
            <span style="color:#d8b4fe; font-weight:600;">🎮 GPU 1 Compute & VRAM:</span>
            <span id="gauge-txt-gpu" style="font-weight:700; color:#f8fafc; font-family:monospace;">0% • VRAM: 0 MB / 4.8 GB</span>
          </div>
          <div style="width:100%; height:7px; background:#0f172a; border-radius:999px; overflow:hidden;">
            <div id="gauge-bar-gpu" style="width:0%; height:100%; background:linear-gradient(90deg, #8b5cf6, #c084fc); border-radius:999px; transition:width 0.4s ease;"></div>
          </div>
        </div>

        <!-- 4. Storage Gauge -->
        <div>
          <div style="display:flex; justify-content:space-between; font-size:11.5px; margin-bottom:4px;">
            <span style="color:#fde047; font-weight:600;">💾 Storage Disk (10 GB Kuota):</span>
            <span id="gauge-txt-disk" style="font-weight:700; color:#f8fafc; font-family:monospace;">0 MB / 10 GB (0%)</span>
          </div>
          <div style="width:100%; height:7px; background:#0f172a; border-radius:999px; overflow:hidden;">
            <div id="gauge-bar-disk" style="width:0%; height:100%; background:linear-gradient(90deg, #eab308, #facc15); border-radius:999px; transition:width 0.4s ease;"></div>
          </div>
        </div>

      </div>

      <!-- Panduan Mengatasi Kendala -->
      <div style="background:#131d31; border:1px solid #1e293b; border-radius:14px; padding:12px 14px; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
          <span style="font-size:13px;">⚠️</span>
          <span style="font-weight:700; font-size:11px; color:#f87171; text-transform:uppercase; letter-spacing:0.04em;">
            Tips Mengatasi Kendala Praktikum:
          </span>
        </div>
        <ul style="margin:0; padding-left:16px; font-size:11.5px; color:#94a3b8; display:flex; flex-direction:column; gap:5px;">
          <li>
            <strong style="color:#f1f5f9;">Kernel Mati / OOM:</strong> Menu <em>Kernel &rarr; Restart Kernel and Clear Outputs</em>, kecilkan <code>batch_size</code>.
          </li>
          <li>
            <strong style="color:#f1f5f9;">Penyimpanan Penuh:</strong> Hapus berkas checkpoint besar yang tidak terpakai dari file browser.
          </li>
          <li>
            <strong style="color:#f1f5f9;">Sesi Terkunci (403):</strong> Logout dari tab atau perangkat lama via menu <em>File &rarr; Log Out</em>.
          </li>
        </ul>
      </div>

      <div style="background:rgba(37,99,235,0.12); border:1px solid rgba(59,130,246,0.3); border-radius:12px; padding:10px 12px; font-size:11.5px; color:#93c5fd; display:flex; gap:8px; align-items:flex-start;">
        <span style="font-size:14px; line-height:1;">💡</span>
        <span>
          Jika kendala berlanjut, laporkan kepada <strong>Asisten Laboratorium</strong> yang bertugas di Laboratorium AI Fakultas Teknik UMPO.
        </span>
      </div>
    </div>

    <!-- Modal Footer Actions -->
    <div style="padding:12px 20px; background:#0b1120; border-top:1px solid #1e293b; display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:11px; color:#64748b;">
        ⚡ Terhubung ke Node AI Server
      </span>
      <button id="btn-dismiss-lab-popup" style="background:#2563eb; color:#ffffff; border:none; padding:8px 18px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; box-shadow:0 2px 6px rgba(37,99,235,0.35); transition:all 0.15s ease;">
        Tutup & Kembali Bekerja
      </button>
    </div>

  </div>
</div>

<!-- 2. FLOATING REAL-TIME PERFORMANCE PILL (Selalu Tampak di Layar JupyterLab) -->
<div id="lab-ai-status-pill" title="Klik untuk membuka Real-Time Performance Monitor & Panduan Lab AI" style="position:fixed; bottom:24px; right:16px; z-index:99999; display:flex; align-items:center; gap:8px; background:rgba(15,23,42,0.92); color:#f8fafc; border:1px solid rgba(59,130,246,0.4); box-shadow:0 8px 24px rgba(0,0,0,0.4); padding:5px 12px; border-radius:999px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif; font-size:11px; font-weight:600; cursor:pointer; backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); user-select:none; transition:all 0.2s cubic-bezier(0.16,1,0.3,1);">
  
  <span class="lab-ai-pulse-dot" style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981; shrink:0;"></span>
  
  <div id="lab-ai-live-tags" style="display:flex; align-items:center; gap:6px;">
    <!-- CPU Tag -->
    <span style="background:rgba(59,130,246,0.18); border:1px solid rgba(59,130,246,0.35); padding:1.5px 7px; border-radius:6px; display:inline-flex; gap:3px;">
      <strong style="color:#93c5fd;">CPU</strong> <span id="pill-val-cpu">--%</span>
    </span>
    <!-- RAM Tag -->
    <span style="background:rgba(16,185,129,0.18); border:1px solid rgba(16,185,129,0.35); padding:1.5px 7px; border-radius:6px; display:inline-flex; gap:3px;">
      <strong style="color:#6ee7b7;">RAM</strong> <span id="pill-val-ram">-- / 4G</span>
    </span>
    <!-- GPU Tag -->
    <span style="background:rgba(168,85,247,0.18); border:1px solid rgba(168,85,247,0.35); padding:1.5px 7px; border-radius:6px; display:inline-flex; gap:3px;">
      <strong style="color:#d8b4fe;">GPU 1</strong> <span id="pill-val-gpu">--%</span>
    </span>
    <!-- Disk Tag -->
    <span style="background:rgba(234,179,8,0.18); border:1px solid rgba(234,179,8,0.35); padding:1.5px 7px; border-radius:6px; display:inline-flex; gap:3px;">
      <strong style="color:#fde047;">Disk</strong> <span id="pill-val-disk">-- / 10G</span>
    </span>
  </div>

  <span style="font-size:10px; background:#2563eb; color:#ffffff; padding:2px 8px; border-radius:999px; margin-left:2px; font-weight:700;">
    📊 Monitor
  </span>
</div>

<style>
@keyframes labModalFadeIn {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes labPulseDot {
  0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1.15); box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}
.lab-ai-pulse-dot {
  animation: labPulseDot 2s infinite ease-in-out;
}
#lab-ai-status-pill:hover {
  transform: translateY(-2px);
  background: rgba(15, 23, 42, 0.98);
  border-color: rgba(96, 165, 250, 0.8);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.4);
}
#btn-dismiss-lab-popup:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}
</style>

<script>
(function() {
  function detectUsername() {
    try {
      var el = document.getElementById('jupyter-config-data');
      if (el) {
        var cfg = JSON.parse(el.textContent);
        var m = (cfg.baseUrl || '').match(/\/(?:hub\/)?user\/([^\/]+)/);
        if (m && m[1]) return m[1];
      }
    } catch(e) {}
    var m2 = window.location.pathname.match(/\/(?:hub\/)?user\/([^\/]+)/);
    if (m2 && m2[1]) return m2[1];
    return 'm21533045';
  }

  function initLabNotice() {
    var overlay = document.getElementById('lab-ai-popup-overlay');
    var btnDismiss = document.getElementById('btn-dismiss-lab-popup');
    var pill = document.getElementById('lab-ai-status-pill');
    var userBadge = document.getElementById('modal-user-badge');

    var username = detectUsername();
    if (userBadge) userBadge.innerText = 'Akun: ' + username;

    // Tampilkan modal pertama kali setelah 1 detik
    setTimeout(function() {
      if (overlay) overlay.style.display = 'flex';
    }, 1200);

    if (btnDismiss && overlay) {
      btnDismiss.onclick = function() {
        overlay.style.display = 'none';
      };
    }

    if (pill && overlay) {
      pill.onclick = function() {
        overlay.style.display = 'flex';
      };
    }

    // Engine Live Monitoring Real-Time (Polling tiap 3 detik)
    function updateTelemetry() {
      var u = detectUsername();
      var host = window.location.hostname || '76.76.76.188';
      var url = window.location.protocol + '//' + host + ':8888/api/user-telemetry/' + u;

      fetch(url)
        .then(function(res) {
          if (!res.ok) throw new Error(res.status);
          return res.json();
        })
        .then(function(data) {
          applyTelemetry(data);
        })
        .catch(function(err) {
          // Fallback ke native Jupyter Server /api/metrics/v1 jika port 8888 terblokir
          fallbackJupyterMetrics();
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

      // 1. Update Floating Pill Tags
      var pillCpu = document.getElementById('pill-val-cpu');
      var pillRam = document.getElementById('pill-val-ram');
      var pillGpu = document.getElementById('pill-val-gpu');
      var pillDisk = document.getElementById('pill-val-disk');

      if (pillCpu) pillCpu.innerText = cpuPct + '%';
      if (pillRam) {
        var ramDisplay = ramUsedMB >= 1024 ? (ramUsedMB/1024).toFixed(1) + 'G' : ramUsedMB + 'M';
        var ramLimitDisplay = (ramMaxMB/1024).toFixed(0) + 'G';
        pillRam.innerText = ramDisplay + '/' + ramLimitDisplay + ' (' + ramPct + '%)';
      }
      if (pillGpu) pillGpu.innerText = gpuComp + '%';
      if (pillDisk) {
        var diskGB = (diskUsedMB/1024).toFixed(1);
        pillDisk.innerText = diskGB + '/' + diskQuotaGB + 'G';
      }

      // 2. Update Modal Gauges
      var txtCpu = document.getElementById('gauge-txt-cpu');
      var barCpu = document.getElementById('gauge-bar-cpu');
      if (txtCpu) txtCpu.innerText = cpuPct + '% (' + cpuUsed + ' / ' + cpuLimit + ' Core)';
      if (barCpu) barCpu.style.width = Math.min(100, (cpuPct / (cpuLimit * 100)) * 100) + '%';

      var txtRam = document.getElementById('gauge-txt-ram');
      var barRam = document.getElementById('gauge-bar-ram');
      if (txtRam) txtRam.innerText = ramUsedMB + ' MB / ' + ramMaxMB + ' MB (' + ramPct + '%)';
      if (barRam) {
        barRam.style.width = ramPct + '%';
        barRam.style.background = ramPct > 85 ? 'linear-gradient(90deg, #ef4444, #f87171)' : 'linear-gradient(90deg, #10b981, #34d399)';
      }

      var txtGpu = document.getElementById('gauge-txt-gpu');
      var barGpu = document.getElementById('gauge-bar-gpu');
      if (txtGpu) txtGpu.innerText = 'Compute: ' + gpuComp + '% • VRAM: ' + vramUsed + ' MB / ' + vramLimit + ' MB';
      if (barGpu) barGpu.style.width = Math.max(gpuComp, Math.round((vramUsed/vramLimit)*100)) + '%';

      var txtDisk = document.getElementById('gauge-txt-disk');
      var barDisk = document.getElementById('gauge-bar-disk');
      if (txtDisk) txtDisk.innerText = (diskUsedMB/1024).toFixed(2) + ' GB / ' + diskQuotaGB + ' GB (' + diskPct + '%)';
      if (barDisk) barDisk.style.width = diskPct + '%';

      var syncTime = document.getElementById('modal-sync-time');
      if (syncTime) syncTime.innerText = 'Sinkron: ' + (d.server_time || new Date().toLocaleTimeString());
    }

    function fallbackJupyterMetrics() {
      try {
        var baseMatch = window.location.pathname.match(/^(\/user\/[^\/]+)/);
        var prefix = baseMatch ? baseMatch[1] : '';
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


def find_candidate_html_files():
    """Mencari seluruh file index.html dan page.html yang digunakan oleh JupyterLab / Jupyter Server."""
    candidates = set()
    
    # 1. Lokasi standar /opt/jupyterhub
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

    # 4. Pencarian dinamis di direktori server
    for root in ["/opt", "/usr/local", "/etc/jupyter", "/home/public"]:
        if os.path.exists(root):
            for dirpath, _, filenames in os.walk(root):
                if "index.html" in filenames and ("lab/static" in dirpath or "jupyterlab" in dirpath):
                    candidates.add(os.path.join(dirpath, "index.html"))
                if "page.html" in filenames and ("templates" in dirpath and ("jupyter" in dirpath or "lab" in dirpath)):
                    candidates.add(os.path.join(dirpath, "page.html"))

    return [c for c in candidates if os.path.isfile(c)]


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
    print("🔍 Memindai berkas antarmuka JupyterLab di sistem server...")
    files = find_candidate_html_files()
    
    if not files:
        print("ℹ️ Tidak ditemukan berkas statis JupyterLab di direktori lokal saat ini.")
        print("   (Skrip ini siap dieksekusi di server produksi via deploy_simtik.sh).")
        return 0

    success_count = 0
    for f in files:
        if inject_into_file(f):
            success_count += 1

    print(f"✨ Selesai: {success_count} berkas antarmuka JupyterLab berhasil diperbarui dengan Pop-Up Modal.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
