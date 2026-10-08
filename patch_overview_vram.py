import re

with open("frontend/src/components/SystemOverview.jsx", "r") as f:
    content = f.read()

# Calculate VRAM in SystemOverview
vram_calc_str = """
  const gpu0 = gpus[0];
  const gpu1 = gpus[1];
  const totalVramUsedMb = (gpu0?.vram_used_mb || 0) + (gpu1?.vram_used_mb || 0);
  const totalVramMaxMb = (gpu0?.vram_total_mb || 16384) + (gpu1?.vram_total_mb || 16384);
  const vramUsedGb = (totalVramUsedMb / 1024).toFixed(1);
  const vramTotalGb = (totalVramMaxMb / 1024).toFixed(0);
  const vramPct = totalVramMaxMb > 0 ? Math.min(100, Math.round((totalVramUsedMb / totalVramMaxMb) * 100)) : 0;
"""

content = content.replace("  const slotUtilPct = totalSlots > 0 ? Math.min(100, Math.round((usedSlots / totalSlots) * 100)) : 0;", 
                          "  const slotUtilPct = totalSlots > 0 ? Math.min(100, Math.round((usedSlots / totalSlots) * 100)) : 0;\n" + vram_calc_str)

# Add the 5th card for VRAM Quota
vram_card_str = """
        {/* Metric: VRAM Quota */}
        <div className="bg-surface-2 p-5 rounded-xl border border-border-subtle flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4 text-text-secondary">
            <Layers className="w-4 h-4 text-text-primary" />
            <h2 className="font-medium text-text-primary text-sm">VRAM Quota</h2>
          </div>
          
          <div className="mt-auto">
            <div className="flex items-end gap-2 mb-3">
              <span className={`text-3xl font-semibold font-mono tracking-tight ${vramPct >= 85 ? 'text-neon-rose' : vramPct >= 65 ? 'text-neon-amber' : 'text-neon-emerald'}`}>
                {vramPct}%
              </span>
              <span className="text-text-secondary mb-1 text-sm">Terpakai</span>
            </div>

            <div className="w-full bg-surface-1 h-1.5 rounded-md overflow-hidden border border-border-base mb-2">
              <div 
                className={`h-full transition-all duration-500 ${vramPct >= 85 ? 'bg-neon-rose' : 'bg-neon-emerald'}`}
                style={{ width: `${vramPct}%` }}
              />
            </div>
            <p className="text-xs text-text-secondary">
              node-dgx-umpo01: <span className="font-mono font-medium text-text-primary">{vramUsedGb}/{vramTotalGb} GB</span>
            </p>
          </div>
        </div>
"""

# Replace `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">` with `lg:grid-cols-5`
content = content.replace('className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"', 'className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"')

# Insert before Metric 4
content = content.replace('{/* Metric 4: Keamanan & Backup */}', vram_card_str + '\n        {/* Metric 5: Keamanan & Backup */}')

with open("frontend/src/components/SystemOverview.jsx", "w") as f:
    f.write(content)
