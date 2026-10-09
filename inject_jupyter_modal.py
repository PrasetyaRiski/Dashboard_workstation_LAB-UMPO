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

MODAL_HTML_SNIPPET = '''<!-- === BEGIN LAB AI UMPO MODAL ANNOUNCEMENT === -->
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

<style>
@keyframes labModalFadeIn {
  from { opacity: 0; transform: scale(0.94) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
#btn-dismiss-lab-popup:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 4px 10px rgba(37,99,235,0.35); }
#btn-dismiss-lab-popup:active { transform: translateY(1px); }
</style>

<script>
(function() {
  function initLabNotice() {
    var overlay = document.getElementById('lab-ai-popup-overlay');
    var btn = document.getElementById('btn-dismiss-lab-popup');
    if (!overlay || !btn) return;

    // Cek apakah mahasiswa sudah menutup pesan di sesi browser ini
    try {
      if (sessionStorage.getItem('lab_ai_notice_closed') === 'true') {
        return;
      }
    } catch(e) {}

    // Berikan delay halus 1.2 detik agar UI JupyterLab selesai loading di layar
    setTimeout(function() {
      overlay.style.display = 'flex';
    }, 1200);

    btn.onclick = function() {
      overlay.style.display = 'none';
      try {
        sessionStorage.setItem('lab_ai_notice_closed', 'true');
      } catch(e) {}
    };
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

    # 3. Lokasi Python environment aktif
    prefix = sys.prefix
    candidates.update(glob.glob(f"{prefix}/share/jupyter/lab/static/index.html"))
    candidates.update(glob.glob(f"{prefix}/share/jupyter/lab/templates/page.html"))
    candidates.update(glob.glob(f"{prefix}/lib/**/jupyterlab/static/index.html", recursive=True))
    candidates.update(glob.glob(f"{prefix}/lib/**/jupyter_server/templates/page.html", recursive=True))

    # 4. Cari via path traversal spesifik di /opt dan /etc
    for p in ["/opt", "/usr/local", "/etc/jupyter"]:
        if os.path.exists(p):
            for match in glob.glob(f"{p}/**/lab/static/index.html", recursive=True):
                candidates.add(match)

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
