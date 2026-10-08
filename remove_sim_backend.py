import os
import re

main_path = 'backend/app/main.py'
with open(main_path, 'r') as f:
    backend = f.read()

# Using regex to remove run_simulation and stop_simulation routes
backend = re.sub(r'@app\.post\("/api/run-simulation"\)\ndef run_simulation\(req.*?return \{"success": True, "message": "Simulasi.*?"\}\n\s*except Exception as e:\n\s*raise HTTPException\(status_code=500, detail=str\(e\)\)\n\n', '', backend, flags=re.DOTALL)
backend = re.sub(r'@app\.post\("/api/stop-simulation"\)\ndef stop_simulation\(req.*?return \{"success": True, "message": "Seluruh proses.*?"\}\n\s*except Exception as e:\n\s*raise HTTPException\(status_code=500, detail=str\(e\)\)\n', '', backend, flags=re.DOTALL)

with open(main_path, 'w') as f:
    f.write(backend)
