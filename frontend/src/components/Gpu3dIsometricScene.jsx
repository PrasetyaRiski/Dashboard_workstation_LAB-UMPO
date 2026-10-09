import React, { useEffect, useRef, useState, memo } from 'react';
import * as THREE from 'three';
import { Layers, Activity, Zap, Shield, Cpu, Thermometer, RefreshCw } from 'lucide-react';

/**
 * Gpu3dIsometricScene
 * 
 * Implementasi MOTION.md (Opsi B: Scene 3D isometrik server & GPU khas Lab AI)
 * - Momen 3D Utama (1x) di dashboard monitoring.
 * - 2 Balok GPU (GPU 0 & GPU 1) dalam chassis server isometrik.
 * - Emissive edge glow bereaksi secara real-time terhadap live telemetri GPU & VRAM.
 * - Memenuhi kriteria performa: max pixel ratio 1.5, auto-pause via IntersectionObserver
 *   dan document.hidden, cleanup dispose() penuh, serta menghormati prefers-reduced-motion.
 */
function Gpu3dIsometricScene({ gpus = [] }) {
  const mountRef = useRef(null);
  const canvasRef = useRef(null);
  const [webGlSupported, setWebGlSupported] = useState(true);
  const [hoveredGpu, setHoveredGpu] = useState(null);

  // Data GPU 0 dan GPU 1
  const gpu0 = gpus[0] || {};
  const gpu1 = gpus[1] || {};

  const gpu0Compute = Math.round(gpu0.compute_percent || 0);
  const gpu1Compute = Math.round(gpu1.compute_percent || 0);
  const gpu0VramPct = Math.round(gpu0.vram_percent || 0);
  const gpu1VramPct = Math.round(gpu1.vram_percent || 0);
  const gpu0Temp = gpu0.temperature_c ?? 0;
  const gpu1Temp = gpu1.temperature_c ?? 0;

  // Refs untuk menyimpan nilai terkini tanpa memicu re-inisialisasi Three.js
  const liveDataRef = useRef({
    gpu0: { compute: gpu0Compute, vram: gpu0VramPct, temp: gpu0Temp },
    gpu1: { compute: gpu1Compute, vram: gpu1VramPct, temp: gpu1Temp }
  });

  useEffect(() => {
    liveDataRef.current = {
      gpu0: { compute: gpu0Compute, vram: gpu0VramPct, temp: gpu0Temp },
      gpu1: { compute: gpu1Compute, vram: gpu1VramPct, temp: gpu1Temp }
    };
  }, [gpu0Compute, gpu1Compute, gpu0VramPct, gpu1VramPct, gpu0Temp, gpu1Temp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Cek prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 2. Inisialisasi Renderer WebGL
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    } catch (e) {
      console.warn('WebGL tidak tersedia untuk Gpu3dIsometricScene:', e);
      setWebGlSupported(false);
      return;
    }

    // 3. Scene & Camera Isometrik
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(5.5, 4.8, 6.8);
    camera.lookAt(0, 0, 0);

    // 4. Tata Cahaya (Lighting Studio Server)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(6, 10, 7);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    rimLight.position.set(-6, 3, -4);
    scene.add(rimLight);

    // 5. Root Group untuk rotasi/tilt
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // ── Chassis Base Plate (Motherboard Server / PCIe Backplane) ──
    const basePlateGeo = new THREE.BoxGeometry(6.4, 0.18, 4.4);
    const basePlateMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2
    });
    const basePlate = new THREE.Mesh(basePlateGeo, basePlateMat);
    basePlate.position.y = -0.6;
    rootGroup.add(basePlate);

    // PCIe Slot rails
    [-1.5, 1.5].forEach(x => {
      const slotGeo = new THREE.BoxGeometry(0.35, 0.14, 3.2);
      const slotMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.6,
        metalness: 0.4
      });
      const slotMesh = new THREE.Mesh(slotGeo, slotMat);
      slotMesh.position.set(x, -0.45, 0);
      rootGroup.add(slotMesh);
    });

    // ── Dua Unit GPU RTX (GPU 0 & GPU 1) ──
    const gpuMeshes = [];
    const ledStrips = [];
    const fanMeshes = [];

    const gpuPositions = [-1.5, 1.5]; // X axis

    gpuPositions.forEach((xPos, idx) => {
      const gpuGroup = new THREE.Group();
      gpuGroup.position.set(xPos, 0, 0);
      rootGroup.add(gpuGroup);

      // A. Bodi Shroud GPU (Titanium Slate)
      const shroudGeo = new THREE.BoxGeometry(1.6, 0.72, 3.4);
      const shroudMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.35,
        metalness: 0.6
      });
      const shroud = new THREE.Mesh(shroudGeo, shroudMat);
      gpuGroup.add(shroud);

      // B. Heatsink Backplate (Brushed Metal Accent)
      const backplateGeo = new THREE.BoxGeometry(1.64, 0.08, 3.44);
      const backplateMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.25,
        metalness: 0.8
      });
      const backplate = new THREE.Mesh(backplateGeo, backplateMat);
      backplate.position.y = 0.4;
      gpuGroup.add(backplate);

      // C. Dual Cooling Fan Rings (Stylized Visual)
      [-0.8, 0.8].forEach(zOffset => {
        const fanGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.06, 24);
        const fanMat = new THREE.MeshStandardMaterial({
          color: 0x090d16,
          roughness: 0.5,
          metalness: 0.3
        });
        const fan = new THREE.Mesh(fanGeo, fanMat);
        fan.position.set(0, 0.39, zOffset);
        gpuGroup.add(fan);
        fanMeshes.push({ mesh: fan, gpuIdx: idx });
      });

      // D. Emissive LED Light Strip (Bereaksi terhadap Utilisasi!)
      const ledGeo = new THREE.BoxGeometry(1.65, 0.12, 0.14);
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: new THREE.Color(0x0284c7),
        emissiveIntensity: 0.4,
        roughness: 0.2,
        metalness: 0.1
      });
      const ledStrip = new THREE.Mesh(ledGeo, ledMat);
      ledStrip.position.set(0, 0.1, 1.71); // Sisi depan menghadap user
      gpuGroup.add(ledStrip);

      // E. Side Logo / Status Edge Light
      const sideLedGeo = new THREE.BoxGeometry(0.08, 0.14, 2.2);
      const sideLedMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: new THREE.Color(0x0284c7),
        emissiveIntensity: 0.4,
        roughness: 0.2,
        metalness: 0.1
      });
      const sideLed = new THREE.Mesh(sideLedGeo, sideLedMat);
      sideLed.position.set(0.81, 0.2, 0);
      gpuGroup.add(sideLed);

      gpuMeshes.push(gpuGroup);
      ledStrips.push({ front: ledStrip, side: sideLed, currentIntensity: 0.4 });
    });

    // ── 6. Resize Observer ──
    const handleResize = () => {
      if (!canvas) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);
    handleResize();

    // ── 7. Visibility & Animation Control ──
    let isVisible = true;
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    }, { threshold: 0.1 });
    intersectionObserver.observe(canvas);

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ── 8. Interactive Pointer Tilt (MOTION.md Section 6.3) ──
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;

    const handlePointerMove = (e) => {
      if (prefersReducedMotion) return;
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      targetTiltY = nx * 0.25;  // Max ~14 degrees
      targetTiltX = -ny * 0.18;
    };

    const handlePointerLeave = () => {
      targetTiltX = 0;
      targetTiltY = 0;
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);

    // ── 9. Render Loop (RAF) ──
    let animationFrameId;
    const clock = new THREE.Clock();

    const render = () => {
      animationFrameId = requestAnimationFrame(render);

      if (!isVisible) return;

      const elapsed = clock.getElapsedTime();

      // Putar kipas secara proporsional dengan aktivitas
      fanMeshes.forEach(item => {
        const gpuKey = item.gpuIdx === 0 ? 'gpu0' : 'gpu1';
        const load = (liveDataRef.current[gpuKey]?.compute || 10) / 100;
        item.mesh.rotation.y += (0.04 + load * 0.18);
      });

      // Animasi gerak halus isometrik
      if (!prefersReducedMotion) {
        // Interpolasi tilt pointer
        currentTiltX += (targetTiltX - currentTiltX) * 0.08;
        currentTiltY += (targetTiltY - currentTiltY) * 0.08;

        // Ayunan perlahan bernapas (sway)
        const idleSway = Math.sin(elapsed * 0.35) * 0.08;
        rootGroup.rotation.y = currentTiltY + idleSway;
        rootGroup.rotation.x = currentTiltX;
      }

      // Dynamic Reactive Emissive Glow (MOTION.md Opsi B)
      // Membaca utilisasi GPU live dan memperbarui intensitas cahaya LED
      ledStrips.forEach((led, idx) => {
        const gpuKey = idx === 0 ? 'gpu0' : 'gpu1';
        const data = liveDataRef.current[gpuKey];
        const load = Math.max(data.compute, data.vram) / 100; // 0.0 to 1.0

        // Target intensitas: 0.25 saat idle, sampai 1.6 saat full compute load
        const targetIntensity = 0.25 + (load * 1.35);
        led.currentIntensity += (targetIntensity - led.currentIntensity) * 0.06;

        // Tentukan warna sesuai ambang batas beban
        let glowColor = new THREE.Color(0x0284c7); // Azure default normal
        if (data.temp >= 82 || load >= 0.85) {
          glowColor = new THREE.Color(0xe11d48); // Rose / Alert
        } else if (data.temp >= 74 || load >= 0.65) {
          glowColor = new THREE.Color(0xd97706); // Amber / Warning
        } else if (load >= 0.2) {
          glowColor = new THREE.Color(0x2563eb); // Vibrant Electric Blue
        }

        led.front.material.color.lerp(glowColor, 0.08);
        led.front.material.emissive.lerp(glowColor, 0.08);
        led.front.material.emissiveIntensity = led.currentIntensity;

        led.side.material.color.lerp(glowColor, 0.08);
        led.side.material.emissive.lerp(glowColor, 0.08);
        led.side.material.emissiveIntensity = led.currentIntensity * 0.8;
      });

      renderer.render(scene, camera);
    };

    if (prefersReducedMotion) {
      // Hanya render 1 frame statis untuk reduced motion
      renderer.render(scene, camera);
    } else {
      render();
    }

    // ── 10. Cleanup Penuh (Dispose Memory) ──
    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();

      // Dispose Three.js objects
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(37,99,235,0.06),0_2px_4px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-300">
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row items-center gap-6 justify-between">
        
        {/* Kolom Kiri: 3D Isometric Viewport */}
        <div className="relative w-full lg:w-3/5 h-60 sm:h-64 flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 rounded-xl border border-slate-800 shadow-inner overflow-hidden group">
          {webGlSupported ? (
            <>
              {/* Grid Tekstur PCIe Backplane */}
              <div 
                className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"
                aria-hidden="true" 
              />
              
              {/* Kanvas 3D Three.js */}
              <canvas
                ref={canvasRef}
                className="w-full h-full cursor-grab active:cursor-grabbing relative z-10"
                aria-hidden="true"
              />

              {/* Status Overlay HUD */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-950/80 border border-slate-700/80 text-sky-400 backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                  ISOMETRIC 3D RACK
                </span>
                <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                  node-dgx-umpo01
                </span>
              </div>

              <div className="absolute bottom-2.5 right-3 z-20 pointer-events-none text-[10px] font-mono text-slate-500">
                Arahkan kursor untuk memiringkan (Tilt 3D)
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <Cpu className="w-8 h-8 text-slate-500 mb-2" />
              <span className="text-xs font-semibold">Akselerasi WebGL Tidak Tersedia</span>
              <span className="text-[11px] text-slate-500 mt-1">Menggunakan tampilan ringkasan telemetri 2D standar.</span>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Live Telemetry HUD Cards (Teks & Data Nyata Sesuai MOTION.md) */}
        <div className="w-full lg:w-2/5 flex flex-col justify-between space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                Cluster Accelerator
              </span>
              <span className="text-[11px] font-mono text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200/80">
                2x Dedicated GPU
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Akselerator Komputasi AI Lab
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Cahaya LED pada model 3D memantulkan beban komputasi dan VRAM secara langsung.
            </p>
          </div>

          {/* Mini Cards untuk GPU 0 & GPU 1 */}
          <div className="space-y-2.5">
            {/* GPU 0 Telemetry Pill */}
            <div 
              onMouseEnter={() => setHoveredGpu(0)}
              onMouseLeave={() => setHoveredGpu(null)}
              className={`p-3 rounded-xl border transition-all ${
                hoveredGpu === 0 
                  ? 'bg-blue-50/70 border-blue-300 shadow-sm' 
                  : 'bg-slate-50/80 border-slate-200/90 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  GPU 0 · {gpu0.name ? gpu0.name.replace('NVIDIA GeForce ', '') : 'RTX 4060 Ti'}
                </span>
                <span className="font-mono text-[11px] font-bold text-blue-700 tabular-nums">
                  {gpu0Compute}% Compute
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>VRAM: {((gpu0.vram_used_mb || 0) / 1024).toFixed(1)} / {((gpu0.vram_total_mb || 16384) / 1024).toFixed(0)} GB</span>
                <span className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-slate-400" />
                  {gpu0Temp}°C
                </span>
              </div>
            </div>

            {/* GPU 1 Telemetry Pill */}
            <div 
              onMouseEnter={() => setHoveredGpu(1)}
              onMouseLeave={() => setHoveredGpu(null)}
              className={`p-3 rounded-xl border transition-all ${
                hoveredGpu === 1 
                  ? 'bg-blue-50/70 border-blue-300 shadow-sm' 
                  : 'bg-slate-50/80 border-slate-200/90 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  GPU 1 · {gpu1.name ? gpu1.name.replace('NVIDIA GeForce ', '') : 'RTX 4060 Ti'}
                </span>
                <span className="font-mono text-[11px] font-bold text-indigo-700 tabular-nums">
                  {gpu1Compute}% Compute
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>VRAM: {((gpu1.vram_used_mb || 0) / 1024).toFixed(1)} / {((gpu1.vram_total_mb || 16384) / 1024).toFixed(0)} GB</span>
                <span className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-slate-400" />
                  {gpu1Temp}°C
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default memo(Gpu3dIsometricScene);
