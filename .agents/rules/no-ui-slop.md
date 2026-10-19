# Aturan UI/UX Anti-AI-Slop (Frontend Workstation Lab AI)

Ketika membuat, memperbarui, atau merombak komponen antarmuka web (React, JSX, Tailwind CSS, HTML, CSS):

1. **Dilarang Menggunakan AI Slop:**
   - Dilarang menggunakan efek glassmorphism berlebihan (`backdrop-blur-*`, `bg-white/10`, `bg-slate-900/50`).
   - Dilarang menggunakan gradien ungu/indigo/pelangi murahan (`bg-gradient-to-r from-purple-500 to-indigo-600`, dll.).
   - Dilarang menggunakan animasi meloncat saat hover (`hover:scale-105`, `hover:-translate-y-1`) atau border berputar (`animate-spin-gradient`).
   - Dilarang menggunakan sudut gelembung (`rounded-3xl`, `rounded-2xl` pada kartu dashboard). Gunakan `rounded-xl` untuk container, `rounded-lg` untuk tombol/input, `rounded-md` untuk badge.
   - Dilarang menaruh emoji dekoratif sembarangan pada heading (🚀, ✨, 🔥, ⚡).

2. **Gunakan Standar Presisi Tinggi (Google Stitch / Enterprise Cloud Console):**
   - Gunakan permukaan solid yang bersih dengan border tipis terdefinisi (`border border-slate-200/90` di Light Mode, `border-slate-800` di Dark Mode).
   - Seluruh nilai teknis (RAM, VRAM, MB, GB, NIM, IP, Port, Cgroup Slice, PID, Uptime) **wajib** menggunakan `font-mono`.
   - Transisi harus kalem, cepat, dan fungsional: `transition-colors duration-150` tanpa pergeseran posisi.
   - Pertahankan 100% fungsionalitas, state React, integrasi WebSocket, dan endpoint API backend.
