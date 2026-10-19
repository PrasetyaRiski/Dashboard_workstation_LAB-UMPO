# Antigravity Workspace Guidelines: Lab Komputasi AI UMPO

## 1. Standar UI/UX Frontend (Anti-AI-Slop & Precision Console)
Setiap kali memodifikasi antarmuka React / JSX / Tailwind CSS di direktori `frontend/`:
- **Banned Visual Slop:** Dilarang menggunakan `backdrop-blur-*`, `bg-white/10`, gradien ungu generik `from-purple-* to-indigo-*`, `rounded-3xl` pada kartu, dan emoji dekoratif pada heading.
- **Banned Motion Slop:** Dilarang menggunakan `hover:scale-105`, `hover:-translate-y-1`, atau `animate-spin-gradient`.
- **Enforce Precision Standards:**
  - Desain harus berstandar **Google Stitch / Enterprise Cloud Console**: permukaan solid, border tipis (`border-slate-200/90` di Light Mode, `border-slate-800` di Dark Mode).
  - Skala radius teratur: kartu `rounded-xl`, tombol/input `rounded-lg`, badge `rounded-md`.
  - Seluruh metrik teknis (NIM, IP, RAM, VRAM, MB, GB, PID, Slice, Port, Uptime) **wajib monospace** (`font-mono`).
  - Animasi harus kalem, instan, dan fungsional (`transition-colors duration-150`).
- **Feature Preservation Contract:** Dilarang menghapus atau menyederhanakan state React (`useState`, `useEffect`), WebSocket handlers, dan endpoint API backend (`/api/...`). Seluruh logika RBAC dan aksi tombol harus tetap berfungsi penuh.
