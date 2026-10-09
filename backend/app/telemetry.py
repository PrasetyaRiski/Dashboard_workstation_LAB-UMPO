import time
import os
import psutil
import subprocess
from collections import deque, defaultdict
from typing import Dict, List, Any, Optional

# Try importing pynvml
try:
    import pynvml
    pynvml.nvmlInit()
    NVML_AVAILABLE = True
except Exception as e:
    print("NVML initialization warning:", e)
    NVML_AVAILABLE = False

TRAINING_UIDS = {
    1021: "labriset",
    1016: "training1",
    1017: "training2",
    1018: "training3",
    1019: "training4",
    1020: "training5",
    1022: "training6",
    1023: "training7",
    1024: "training8",
    1025: "training9",
    1026: "training10",
}

# Daftar proses/layanan sistem yang diproteksi secara mutlak dari penghentian (Kill)
PROTECTED_PROCESS_NAMES = {
    "systemd", "init", "sshd", "cloudflared", "dockerd", "containerd",
    "1panel", "portainer", "uvicorn", "gunicorn", "jupyterhub",
    "bash", "sh", "zsh", "login",
    "xorg", "xwayland", "gnome-shell", "dbus-daemon", "polkitd",
    "nginx", "apache2", "redis-server", "mysqld", "postgres", "su", "sudo"
}

# In-memory history buffer (last 60 seconds)
HISTORY_MAX = 60
history_buffer = deque(maxlen=HISTORY_MAX)

# In-memory user CPU tracking
_prev_user_cpu_times: Dict[str, float] = {}
_prev_cpu_timestamp: float = time.time()

def read_cgroup_file(path: str) -> int:
    try:
        if os.path.exists(path):
            with open(path, "r") as f:
                val = f.read().strip()
                if val.isdigit():
                    return int(val)
                elif val == "max":
                    return -1
    except Exception:
        pass
    return 0

def get_gpu_telemetry() -> List[Dict[str, Any]]:
    gpus = []
    if not NVML_AVAILABLE:
        return gpus
    try:
        device_count = pynvml.nvmlDeviceGetCount()
        for i in range(device_count):
            handle = pynvml.nvmlDeviceGetHandleByIndex(i)
            name = pynvml.nvmlDeviceGetName(handle)
            mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            util = pynvml.nvmlDeviceGetUtilizationRates(handle)
            temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
            try:
                power = pynvml.nvmlDeviceGetPowerUsage(handle) / 1000.0
            except Exception:
                power = 0.0
            try:
                power_limit = pynvml.nvmlDeviceGetEnforcedPowerLimit(handle) / 1000.0
            except Exception:
                power_limit = 180.0
            try:
                fan = pynvml.nvmlDeviceGetFanSpeed(handle)
            except Exception:
                fan = 0

            # Running processes on GPU
            procs = []
            raw_procs = []
            try:
                raw_procs += pynvml.nvmlDeviceGetComputeRunningProcesses(handle)
            except Exception:
                pass
            try:
                raw_procs += pynvml.nvmlDeviceGetGraphicsRunningProcesses(handle)
            except Exception:
                pass
            for p in raw_procs:
                pid = p.pid
                gpu_mem_mb = round(p.usedGpuMemory / (1024 ** 2), 1) if p.usedGpuMemory else 0
                username = "unknown"
                proc_name = "process"
                cmdline = ""
                cpu_pct = 0.0
                ram_mb = 0.0
                uptime_str = "-"

                try:
                    ps = psutil.Process(pid)
                    username = ps.username()
                    proc_name = ps.name()
                    cmd = ps.cmdline()
                    cmdline = " ".join(cmd)[:80] if cmd else proc_name
                    cpu_pct = round(ps.cpu_percent(interval=None), 1)
                    ram_mb = round(ps.memory_info().rss / (1024 ** 2), 1)
                    create_t = ps.create_time()
                    elapsed = int(time.time() - create_t)
                    m, s = divmod(elapsed, 60)
                    h, m = divmod(m, 60)
                    uptime_str = f"{h:02d}:{m:02d}:{s:02d}"
                except Exception:
                    pass

                # Check if system / protected process
                is_system = not (username in TRAINING_UIDS.values() or (username.startswith("m") and username[1:].isdigit())) or (proc_name.lower() in PROTECTED_PROCESS_NAMES)
                is_killable = (username in TRAINING_UIDS.values() or (username.startswith("m") and username[1:].isdigit())) and (proc_name.lower() not in PROTECTED_PROCESS_NAMES)

                procs.append({
                    "pid": pid,
                    "username": username,
                    "name": proc_name,
                    "cmdline": cmdline,
                    "vram_mb": gpu_mem_mb,
                    "ram_mb": ram_mb,
                    "cpu_percent": cpu_pct,
                    "uptime": uptime_str,
                    "is_system": is_system,
                    "is_killable": is_killable
                })

            gpus.append({
                "index": i,
                "name": name,
                "tier": "Level 1 (Riset)" if i == 0 else "Level 2 (Praktikum)",
                "assigned": "labriset" if i == 0 else "training1-10",
                "vram_total_mb": round(mem_info.total / (1024 ** 2), 1),
                "vram_used_mb": round(mem_info.used / (1024 ** 2), 1),
                "vram_free_mb": round(mem_info.free / (1024 ** 2), 1),
                "vram_percent": round((mem_info.used / mem_info.total) * 100, 1),
                "compute_percent": util.gpu,
                "memory_util_percent": util.memory,
                "temperature_c": temp,
                "power_w": round(power, 1),
                "power_limit_w": round(power_limit, 1),
                "fan_speed_percent": fan,
                "processes": procs
            })
    except Exception as e:
        print("Error reading GPU telemetry:", e)
    return gpus

def get_system_telemetry() -> Dict[str, Any]:
    vm = psutil.virtual_memory()
    swap = psutil.swap_memory()
    cpu_cores = psutil.cpu_percent(percpu=True)
    cpu_avg = round(sum(cpu_cores) / len(cpu_cores), 1) if cpu_cores else 0.0

    # Read user.slice (Umbrella 100G)
    user_slice_current = read_cgroup_file("/sys/fs/cgroup/user.slice/memory.current")
    user_slice_max = read_cgroup_file("/sys/fs/cgroup/user.slice/memory.max")
    user_slice_used_gb = round(user_slice_current / (1024 ** 3), 2)
    user_slice_max_gb = round(user_slice_max / (1024 ** 3), 1) if user_slice_max > 0 else 100.0

    # Read labriset user-1021.slice
    labriset_current = read_cgroup_file("/sys/fs/cgroup/user.slice/user-1021.slice/memory.current")
    labriset_max = read_cgroup_file("/sys/fs/cgroup/user.slice/user-1021.slice/memory.max")
    labriset_used_gb = round(labriset_current / (1024 ** 3), 2)
    labriset_max_gb = round(labriset_max / (1024 ** 3), 1) if labriset_max > 0 else 70.0

    # Disks
    root_disk = psutil.disk_usage("/")
    home_disk = psutil.disk_usage("/home")

    return {
        "cpu": {
            "overall_percent": cpu_avg,
            "cores_percent": cpu_cores,
            "core_count": len(cpu_cores)
        },
        "memory": {
            "total_gb": round(vm.total / (1024 ** 3), 1),
            "used_gb": round(vm.used / (1024 ** 3), 1),
            "available_gb": round(vm.available / (1024 ** 3), 1),
            "percent": vm.percent,
            "user_slice_used_gb": user_slice_used_gb,
            "user_slice_max_gb": user_slice_max_gb,
            "user_slice_percent": round((user_slice_used_gb / user_slice_max_gb) * 100, 1) if user_slice_max_gb else 0,
            "labriset_used_gb": labriset_used_gb,
            "labriset_max_gb": labriset_max_gb
        },
        "swap": {
            "total_gb": round(swap.total / (1024 ** 3), 1),
            "used_gb": round(swap.used / (1024 ** 3), 1),
            "percent": swap.percent
        },
        "disks": {
            "root": {
                "total_gb": round(root_disk.total / (1024 ** 3), 1),
                "used_gb": round(root_disk.used / (1024 ** 3), 1),
                "free_gb": round(root_disk.free / (1024 ** 3), 1),
                "percent": root_disk.percent
            },
            "home": {
                "total_gb": round(home_disk.total / (1024 ** 3), 1),
                "used_gb": round(home_disk.used / (1024 ** 3), 1),
                "free_gb": round(home_disk.free / (1024 ** 3), 1),
                "percent": home_disk.percent
            }
        }
    }

def check_is_priority(nim: str) -> bool:
    try:
        from app.db import is_user_priority
        return is_user_priority(nim)
    except Exception:
        return False

def get_per_user_gpu_metrics(gpus: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    global _prev_user_cpu_times, _prev_cpu_timestamp
    now = time.time()
    dt = max(now - _prev_cpu_timestamp, 0.1)

    # Build a lookup of processes per user from the GPU telemetry
    user_gpu_map = {}
    for gpu in gpus:
        gpu_idx = gpu["index"]
        for p in gpu.get("processes", []):
            u = p["username"]
            if u not in user_gpu_map:
                user_gpu_map[u] = []
            user_gpu_map[u].append({
                "gpu_index": gpu_idx,
                "gpu_name": f"GPU {gpu_idx}",
                "pid": p["pid"],
                "name": p["name"],
                "cmdline": p["cmdline"],
                "vram_mb": p["vram_mb"],
                "ram_mb": p.get("ram_mb", 0.0),
                "cpu_percent": p["cpu_percent"],
                "uptime": p["uptime"],
                "is_system": p.get("is_system", False),
                "is_killable": p.get("is_killable", True)
            })

    # Active logged-in users via psutil
    logged_in_users = {}
    try:
        for u in psutil.users():
            logged_in_users[u.name] = {
                "terminal": u.terminal,
                "host": u.host or "local",
                "started": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(u.started))
            }
    except Exception:
        pass

    # Sample all running processes per user to compute CPU usage, active cores, and physical RAM
    current_user_times = defaultdict(float)
    user_active_cores = defaultdict(set)
    user_all_proc_count = defaultdict(int)
    user_rss_bytes = defaultdict(int)

    valid_usernames = set(TRAINING_UIDS.values())
    gpu_proc_pids = {pr["pid"] for procs in user_gpu_map.values() for pr in procs}
    user_cpu_procs = defaultdict(list)

    try:
        for p in psutil.process_iter(["pid", "username", "name", "cmdline", "create_time", "cpu_times", "cpu_num", "memory_info"]):
            try:
                u = p.info.get("username")
                if u and (u in valid_usernames or (u.startswith("m") and u[1:].isdigit())):
                    pid = p.info["pid"]
                    user_all_proc_count[u] += 1
                    t = p.info.get("cpu_times")
                    if t:
                        current_user_times[u] += (t.user + t.system)
                    c = p.info.get("cpu_num")
                    if c is not None:
                        user_active_cores[u].add(c)
                    m = p.info.get("memory_info")
                    rss = m.rss if m else 0
                    user_rss_bytes[u] += rss

                    # Record non-GPU processes (CPU scripts, Jupyter kernels, shells)
                    if pid not in gpu_proc_pids:
                        name = p.info.get("name") or "process"
                        cmd_list = p.info.get("cmdline") or []
                        cmdline = " ".join(cmd_list)[:80] if cmd_list else name
                        create_t = p.info.get("create_time") or now
                        elapsed = max(0, int(now - create_t))
                        em, es = divmod(elapsed, 60)
                        eh, em = divmod(em, 60)
                        uptime_str = f"{eh:02d}:{em:02d}:{es:02d}"

                        is_system = (name.lower() in PROTECTED_PROCESS_NAMES)
                        is_killable = not is_system

                        user_cpu_procs[u].append({
                            "gpu_index": None,
                            "gpu_name": "CPU / Sesi",
                            "pid": pid,
                            "name": name,
                            "cmdline": cmdline,
                            "vram_mb": 0.0,
                            "ram_mb": round(rss / (1024 ** 2), 1),
                            "cpu_percent": 0.0,
                            "uptime": uptime_str,
                            "is_system": is_system,
                            "is_killable": is_killable
                        })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except Exception:
        pass

    results = []
    
    all_tracked = set(TRAINING_UIDS.values())
    all_tracked.update(user_all_proc_count.keys())
    all_tracked.update(user_gpu_map.keys())
    valid_tracked = sorted([u for u in all_tracked if u in TRAINING_UIDS.values() or (u.startswith("m") and u[1:].isdigit())])
    rev_training = {v: k for k, v in TRAINING_UIDS.items()}
    import pwd
    for uname in valid_tracked:
        real_uid = None
        try:
            real_uid = pwd.getpwnam(uname).pw_uid
        except Exception:
            pass

        is_priority_user = False
        if uname in rev_training:
            uid = rev_training[uname]
            is_riset = (uid == 1021)
            tier = "Level 1 (Riset)" if is_riset else "Level 2 (Praktikum)"
            is_priority_user = is_riset
        else:
            uid = real_uid if real_uid is not None else (int(uname[1:]) if uname[1:].isdigit() else 0)
            nim = uname[1:] if (uname.startswith("m") and uname[1:].isdigit()) else uname
            is_priority_user = check_is_priority(nim)
            tier = "Level 1 (Priority)" if is_priority_user else "Level 2 (Standard)"
            is_riset = False
            
        assigned_gpu_idx = 0 if is_priority_user else 1
        assigned_gpu_name = f"GPU {assigned_gpu_idx}"

        # VRAM limit recommendation: 100% (16311 MB) for priority (GPU 0), 30% (~4893 MB) for standard practical/SIMTIK (GPU 1)
        vram_recommended_limit_mb = 16311.0 if is_priority_user else 4893.0

        gpu_procs = user_gpu_map.get(uname, [])
        total_vram_mb = round(sum(p["vram_mb"] for p in gpu_procs), 1)

        # Merge GPU procs and non-GPU user procs (sorted by RAM usage descending)
        cpu_procs = sorted(user_cpu_procs.get(uname, []), key=lambda x: x.get("ram_mb", 0.0), reverse=True)
        user_procs = gpu_procs + cpu_procs

        # Slice memory & Process RSS (check real UID user slice)
        cgroup_uid = real_uid if real_uid is not None else uid
        slice_dir = f"/sys/fs/cgroup/user.slice/user-{cgroup_uid}.slice"
        is_active = os.path.exists(slice_dir)
        mem_curr_bytes = read_cgroup_file(f"{slice_dir}/memory.current")
        mem_max_bytes = read_cgroup_file(f"{slice_dir}/memory.max")
        ram_used_bytes = max(mem_curr_bytes, user_rss_bytes.get(uname, 0))
        ram_used_mb = round(ram_used_bytes / (1024 ** 2), 1)
        ram_max_mb = round(mem_max_bytes / (1024 ** 2), 1) if mem_max_bytes > 0 else (71680.0 if is_priority_user else 4096.0)

        # CPU Metrics & Core Allocations
        # Core limits: 20 Cores for Level 1 Priority / Riset, 2 Cores for Level 2 Standard
        cores_limit = 20 if is_priority_user else 2
        prev_time = _prev_user_cpu_times.get(uname, current_user_times.get(uname, 0.0))
        delta_time = max(0.0, current_user_times.get(uname, 0.0) - prev_time)
        cpu_percent = round((delta_time / dt) * 100.0, 1)
        cores_used = round(cpu_percent / 100.0, 1)
        cpu_quota_percent = min(100.0, round((cores_used / cores_limit) * 100.0, 1)) if cores_limit > 0 else 0.0
        active_cores_list = sorted(list(user_active_cores.get(uname, set())))

        login_info = logged_in_users.get(uname)

        # Determine compute state
        if total_vram_mb > 0:
            if not is_priority_user and total_vram_mb > vram_recommended_limit_mb:
                status = "VRAM Exceeded (>30%)"
                status_color = "red"
            else:
                status = "Training Active (GPU)"
                status_color = "green"
        elif cpu_percent > 10.0:
            status = "Compute Active (CPU)"
            status_color = "indigo"
        elif is_active or login_info or user_all_proc_count.get(uname, 0) > 0:
            status = "Online (Idle)"
            status_color = "blue"
        else:
            status = "Offline"
            status_color = "gray"

        disk_metrics = get_user_disk_metrics(uname, is_priority=is_priority_user)

        results.append({
            "uid": uid,
            "username": uname,
            "tier": tier,
            "is_priority": is_priority_user,
            "gpu_assigned": assigned_gpu_name,
            "gpu_index": assigned_gpu_idx,
            "vram_used_mb": total_vram_mb,
            "vram_limit_mb": vram_recommended_limit_mb,
            "vram_percent_of_gpu": round((total_vram_mb / 16311.0) * 100, 1),
            "vram_percent_of_quota": round((total_vram_mb / vram_recommended_limit_mb) * 100, 1),
            "cpu_percent": cpu_percent,
            "cpu_cores_used": cores_used,
            "cpu_cores_limit": cores_limit,
            "cpu_quota_percent": cpu_quota_percent,
            "active_cores": active_cores_list,
            "total_process_count": user_all_proc_count.get(uname, 0),
            "process_count": len(user_procs),
            "processes": user_procs,
            "status": status,
            "status_color": status_color,
            "is_online": bool(is_active or login_info or user_all_proc_count.get(uname, 0) > 0),
            "ip": login_info.get("host", "-") if login_info else "-",
            "terminal": login_info.get("terminal", "-") if login_info else "-",
            "ram_used_mb": ram_used_mb,
            "ram_max_mb": ram_max_mb,
            "ram_percent": round((ram_used_mb / ram_max_mb) * 100, 1) if ram_max_mb else 0.0,
            "disk_used_mb": disk_metrics["disk_used_mb"],
            "disk_quota_gb": disk_metrics["disk_quota_gb"],
            "disk_quota_mb": disk_metrics["disk_quota_mb"],
            "disk_percent": disk_metrics["disk_percent"],
            "is_over_quota": disk_metrics["is_over_quota"]
        })

    # Update cache for next iteration
    _prev_user_cpu_times = current_user_times
    _prev_cpu_timestamp = now

    return results

# In-memory storage disk usage cache (username -> used_mb)
_USER_DISK_USAGE: Dict[str, float] = {}

def update_all_user_disk_usage(additional_usernames: Optional[List[str]] = None):
    """Memindai penggunaan disk home direktori user secara asinkron di background thread."""
    global _USER_DISK_USAGE
    unames = set(list(TRAINING_UIDS.values()) + ["labriset"])
    if additional_usernames:
        unames.update(additional_usernames)

    # Tambahkan semua direktori /home/m* di sistem
    try:
        if os.path.exists("/home"):
            for entry in os.listdir("/home"):
                if (entry.startswith("m") and entry[1:].isdigit()) or entry in TRAINING_UIDS.values() or entry == "labriset":
                    unames.add(entry)
    except Exception:
        pass

    new_usage = {}
    for uname in unames:
        home_path = f"/home/{uname}"
        if not os.path.exists(home_path):
            new_usage[uname] = 0.0
            continue
        try:
            cmd = ["du", "-sm", home_path]
            if os.geteuid() != 0:
                cmd = ["sudo", "-n"] + cmd
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            if res.returncode == 0 and res.stdout.strip():
                mb_str = res.stdout.strip().split()[0]
                new_usage[uname] = float(mb_str)
            else:
                new_usage[uname] = _USER_DISK_USAGE.get(uname, 0.0)
        except Exception:
            new_usage[uname] = _USER_DISK_USAGE.get(uname, 0.0)

    _USER_DISK_USAGE = new_usage

def get_user_disk_metrics(username: str, is_priority: bool = False) -> Dict[str, Any]:
    """Menghitung metrik kuota storage untuk user tertentu (Soft Limit: 10GB standard, 50GB riset/priority)."""
    used_mb = _USER_DISK_USAGE.get(username, 0.0)
    quota_gb = 50.0 if (is_priority or username == "labriset") else 10.0
    quota_mb = quota_gb * 1024.0
    percent = round((used_mb / quota_mb) * 100.0, 1) if quota_mb > 0 else 0.0
    return {
        "disk_used_mb": round(used_mb, 1),
        "disk_quota_gb": quota_gb,
        "disk_quota_mb": quota_mb,
        "disk_percent": percent,
        "is_over_quota": used_mb > quota_mb
    }

def get_snapshot() -> Dict[str, Any]:
    gpus = get_gpu_telemetry()
    system = get_system_telemetry()
    user_gpu_metrics = get_per_user_gpu_metrics(gpus)
    now_str = time.strftime("%H:%M:%S")

    # Append to history buffer
    gpu0_comp = gpus[0]["compute_percent"] if len(gpus) > 0 else 0
    gpu1_comp = gpus[1]["compute_percent"] if len(gpus) > 1 else 0
    gpu0_vram = gpus[0]["vram_percent"] if len(gpus) > 0 else 0
    gpu1_vram = gpus[1]["vram_percent"] if len(gpus) > 1 else 0

    history_buffer.append({
        "time": now_str,
        "gpu0_compute": gpu0_comp,
        "gpu1_compute": gpu1_comp,
        "gpu0_vram": gpu0_vram,
        "gpu1_vram": gpu1_vram,
        "cpu": system["cpu"]["overall_percent"],
        "ram": system["memory"]["percent"]
    })

    return {
        "timestamp": time.time(),
        "time_str": now_str,
        "gpus": gpus,
        "system": system,
        "users": user_gpu_metrics,
        "history": list(history_buffer)
    }
