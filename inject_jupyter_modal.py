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
<!-- 1. POPUP MODAL PUSAT BANTUAN & SPESIFIKASI ALOKASI -->
<div id="lab-ai-popup-overlay" style="display:none; position:fixed; inset:0; z-index:9999999; background:rgba(15,23,42,0.72); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); align-items:center; justify-content:center; padding:16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div id="lab-ai-popup-card" style="background:#ffffff; color:#0f172a; width:100%; max-width:500px; border-radius:20px; box-shadow:0 25px 50px -12px rgba(15,23,42,0.4), 0 0 0 1px rgba(226,232,240,0.9); overflow:hidden; animation:labModalFadeIn 0.25s cubic-bezier(0.16,1,0.3,1); box-sizing:border-box;">
    
    <!-- Modal Header -->
    <div style="background:linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding:20px 24px; color:#ffffff; display:flex; align-items:center; gap:14px;">
      <div style="width:42px; height:42px; border-radius:12px; background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.25); display:flex; align-items:center; justify-content:center; font-size:22px; shrink:0;">
        📢
      </div>
      <div style="min-width:0;">
        <div style="display:inline-block; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:999px; margin-bottom:4px;">
          Pusat Bantuan Praktikum & Riset
        </div>
        <h3 style="margin:0; font-size:16px; font-weight:700; letter-spacing:-0.01em; line-height:1.2;">
          Pemberitahuan Lab AI UMPO
        </h3>
        <p style="margin:3px 0 0; font-size:11px; opacity:0.9; font-family:monospace;">
          Teknik Informatika &bull; Fakultas Teknik
        </p>
      </div>
    </div>

    <!-- Modal Content Body -->
    <div style="padding:22px 24px; font-size:13px; line-height:1.6; color:#334155;">
      <p style="margin:0 0 14px; font-weight:600; color:#0f172a; font-size:13.5px;">
        Selamat datang di Lingkungan Komputasi AI & JupyterHub.
      </p>

      <!-- Hardware Allocation Specs Card -->
      <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:14px; padding:12px 14px; margin-bottom:14px;">
        <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#334155; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
          <span>⚡</span> Alokasi Hardware Akun Anda (Standard Tier):
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:11.5px; font-family:monospace;">
          <div style="background:#ffffff; padding:6px 10px; border-radius:8px; border:1px solid #e2e8f0; display:flex; justify-content:space-between;">
            <span style="color:#64748b;">RAM Limit</span> <strong style="color:#0f172a;">4 GB</strong>
          </div>
          <div style="background:#ffffff; padding:6px 10px; border-radius:8px; border:1px solid #e2e8f0; display:flex; justify-content:space-between;">
            <span style="color:#64748b;">CPU Quota</span> <strong style="color:#0f172a;">2 Core</strong>
          </div>
          <div style="background:#ffffff; padding:6px 10px; border-radius:8px; border:1px solid #e2e8f0; display:flex; justify-content:space-between;">
            <span style="color:#64748b;">GPU Compute</span> <strong style="color:#2563eb;">GPU 1 (Shared)</strong>
          </div>
          <div style="background:#ffffff; padding:6px 10px; border-radius:8px; border:1px solid #e2e8f0; display:flex; justify-content:space-between;">
            <span style="color:#64748b;">Storage Kuota</span> <strong style="color:#0f172a;">10 GB</strong>
          </div>
        </div>
        <div style="margin-top:8px; font-size:11px; color:#64748b; line-height:1.4;">
          📊 <em>Spesifikasi & penggunaan live dapat Anda pantau setiap saat pada <strong>Badge Status pojok kanan bawah</strong>.</em>
        </div>
      </div>

      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:14px 16px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">
          <span style="font-size:14px;">⚠️</span>
          <span style="font-weight:700; font-size:11.5px; color:#b91c1c; text-transform:uppercase; letter-spacing:0.04em;">
            Jika Anda Mengalami Kendala:
          </span>
        </div>
        <ul style="margin:0; padding-left:18px; font-size:12px; color:#475569; display:flex; flex-direction:column; gap:6px;">
          <li>
            <strong style="color:#0f172a;">Kernel Mati / Out-of-Memory (OOM):</strong><br/>
            Klik menu <em>Kernel &rarr; Restart Kernel and Clear All Outputs</em> dan perkecil nilai <code>batch_size</code>.
          </li>
          <li>
            <strong style="color:#0f172a;">Sesi Terkunci (HTTP 403):</strong><br/>
            Logout dari perangkat lama Anda melalui menu <em>File &rarr; Log Out</em>.
          </li>
          <li>
            <strong style="color:#0f172a;">Penyimpanan Penuh (Over Quota):</strong><br/>
            Hapus berkas yang tidak terpakai atau minta asisten lab membersihkan cache.
          </li>
        </ul>
      </div>

      <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:12px 14px; font-size:12px; color:#1e40af; display:flex; gap:8px; align-items:flex-start;">
        <span style="font-size:15px; line-height:1;">💡</span>
        <span>
          Jika masalah berlanjut, <strong>segera laporkan kepada Asisten Laboratorium yang bertugas</strong> di Laboratorium Komputasi AI Fakultas Teknik UMPO.
        </span>
      </div>
    </div>

    <!-- Modal Footer Actions -->
    <div style="padding:14px 24px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; align-items:center; gap:12px;">
      <button id="btn-dismiss-lab-popup" style="background:#2563eb; color:#ffffff; border:none; padding:10px 22px; border-radius:12px; font-size:12.5px; font-weight:700; cursor:pointer; box-shadow:0 2px 6px rgba(37,99,235,0.3); transition:all 0.15s ease; font-family:inherit;">
        Saya Mengerti &bull; Mulai Bekerja
      </button>
    </div>

  </div>
</div>

<!-- 2. FLOATING PERSISTENT HARDWARE SPECS PILL (Selalu Tampak di JupyterLab) -->
<div id="lab-ai-status-pill" title="Klik untuk membuka Pusat Bantuan & Rincian Spesifikasi Akun Lab AI" style="position:fixed; bottom:28px; right:16px; z-index:99999; display:flex; align-items:center; gap:8px; background:rgba(15,23,42,0.92); color:#f8fafc; border:1px solid rgba(59,130,246,0.45); box-shadow:0 8px 24px rgba(0,0,0,0.35); padding:6px 14px; border-radius:999px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:11.5px; font-weight:600; cursor:pointer; backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); user-select:none; transition:all 0.2s cubic-bezier(0.16,1,0.3,1);">
  <span class="lab-ai-pulse-dot" style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981; flex-shrink:0;"></span>
  <span id="lab-ai-pill-text">⚡ 2 Core CPU &bull; 4 GB RAM &bull; GPU 1 (Shared) &bull; 10 GB Kuota</span>
  <span style="font-size:10.5px; background:rgba(59,130,246,0.25); color:#93c5fd; padding:2px 8px; border-radius:999px; border:1px solid rgba(59,130,246,0.35); margin-left:4px; font-weight:700;">Detail ℹ️</span>
</div>

<style>
@keyframes labModalFadeIn {
  from { opacity: 0; transform: scale(0.94) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes labPulseDot {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}
.lab-ai-pulse-dot {
  animation: labPulseDot 2s infinite ease-in-out;
}
#lab-ai-status-pill:hover {
  transform: translateY(-2px);
  background: rgba(15, 23, 42, 0.98);
  border-color: rgba(96, 165, 250, 0.8);
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.45);
}
#lab-ai-status-pill:active {
  transform: translateY(0);
}
#btn-dismiss-lab-popup:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(37,99,235,0.35);
}
#btn-dismiss-lab-popup:active {
  transform: translateY(1px);
}
</style>

<script>
(function() {
  function initLabNotice() {
    var overlay = document.getElementById('lab-ai-popup-overlay');
    var btnDismiss = document.getElementById('btn-dismiss-lab-popup');
    var pill = document.getElementById('lab-ai-status-pill');
    var pillText = document.getElementById('lab-ai-pill-text');

    // Tampilkan modal sambutan 1.2 detik setelah halaman JupyterLab selesai render
    setTimeout(function() {
      if (overlay) overlay.style.display = 'flex';
    }, 1200);

    // Tombol tutup modal
    if (btnDismiss && overlay) {
      btnDismiss.onclick = function() {
        overlay.style.display = 'none';
      };
    }

    // Klik Floating Pill untuk membuka kembali modal kapan saja
    if (pill && overlay) {
      pill.onclick = function() {
        overlay.style.display = 'flex';
      };
    }

    // Pemantau penggunaan memori & CPU secara live via jupyter-resource-usage REST API
    function fetchLiveMetrics() {
      if (!pillText) return;
      try {
        var baseMatch = window.location.pathname.match(/^(\/user\/[^\/]+)/);
        var prefix = baseMatch ? baseMatch[1] : '';
        var apiUrl = prefix + '/api/metrics/v1';

        fetch(apiUrl, { credentials: 'same-origin' })
          .then(function(res) {
            if (!res.ok) throw new Error('Status ' + res.status);
            return res.json();
          })
          .then(function(data) {
            if (!data) return;
            var memUsedMB = Math.round((data.rss || 0) / (1024 * 1024));
            var memLimitBytes = data.limits && data.limits.memory && data.limits.memory.rss;
            var memLimitStr = memLimitBytes ? (memLimitBytes / (1024 * 1024 * 1024)).toFixed(0) + ' GB' : '4 GB';
            var memDisplay = memUsedMB >= 1024 ? (memUsedMB / 1024).toFixed(1) + ' GB' : memUsedMB + ' MB';
            var cpuStr = (data.cpu_percent !== undefined && data.cpu_percent !== null) ? (' &bull; CPU: ' + Math.round(data.cpu_percent) + '%') : ' &bull; 2 Core';

            pillText.innerHTML = '⚡ RAM: <strong style="color:#60a5fa;">' + memDisplay + ' / ' + memLimitStr + '</strong>' + cpuStr + ' &bull; GPU 1 &bull; 10 GB';
          })
          .catch(function(err) {
            // Jika metrics API belum aktif / server belum direstart, pertahankan tampilan alokasi default
          });
      } catch(e) {}
    }

    fetchLiveMetrics();
    setInterval(fetchLiveMetrics, 8000);
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
