import re
import os

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # UnifiedUserManagement specific cleanups
    if 'UnifiedUserManagement.jsx' in filepath:
        # Remove huge sub-paragraph
        content = re.sub(
            r'<p className="text-xs text-on-surface-variant max-w-2xl leading-relaxed">\s*Kontrol terpadu multi-tenant node komputasi AI UMPO[^<]+</p>',
            '', content
        )
        # Simplify operator banner
        content = re.sub(
            r'<strong>Mode Operator Aslab \([^)]+\):</strong> Anda memiliki izin memantau aktivitas server dan menghentikan \(Kill Sesi\) notebook mahasiswa yang macet/over-quota\. Aksi boost level, edit role, blokir, dan reset password dilindungi hak Super Admin\.',
            r'<strong>Mode Operator Aslab ({adminUser?.nama || \'Asisten\'}):</strong> Akses pemantauan dan Kill Sesi aktif. Hak akses super admin dibatasi.',
            content
        )
        # Bento Metric cards tags
        content = content.replace('Dedicated Accelerator', 'Kapasitas GPU 0')
        content = content.replace('Mahasiswa Praktikum & Skripsi', 'Total Akun Terdaftar')
        content = content.replace('Level 1 Boost Active', 'Akun Prioritas Aktif')
        content = content.replace('v4.2 QoS Controller', 'v4.2')
        content = content.replace('font-mono text-[10px] text-text-muted uppercase tracking-wider', 'text-sm font-medium text-text-secondary')
        
    # Replace annoying styles globally across files
    content = content.replace('font-mono text-[10px] uppercase tracking-wider', 'text-sm font-medium text-text-secondary')
    content = content.replace('text-[10px] uppercase tracking-wider', 'text-sm font-medium')
    content = content.replace('font-mono text-[10px] text-text-muted uppercase', 'text-sm font-medium text-text-muted')
    content = content.replace('text-[10px] text-text-muted uppercase', 'text-sm font-medium text-text-muted')
    content = content.replace('text-[11px]', 'text-sm')
    content = content.replace('text-[10px]', 'text-xs')
    content = content.replace('tracking-wider', '')
    content = content.replace('tracking-widest', '')
    content = content.replace('uppercase', '')
    
    with open(filepath, 'w') as f:
        f.write(content)


files = [
    'frontend/src/components/UnifiedUserManagement.jsx',
    'frontend/src/components/ProcessManager.jsx',
    'frontend/src/components/AuditLogView.jsx',
    'frontend/src/components/Sidebar.jsx',
]

for file in files:
    if os.path.exists(file):
        process_file(file)

