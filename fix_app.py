import re

app_path = 'frontend/src/App.jsx'
with open(app_path, 'r') as f:
    app = f.read()

# Find and remove handleRunSimulation
app = re.sub(r"// Run Simulation\n\s*const handleRunSimulation = async \(\) => \{.*?(?=// Stop Simulation|// Confirm Kill)", "", app, flags=re.DOTALL)
# Find and remove handleStopSimulation
app = re.sub(r"// Stop Simulation\n\s*const handleStopSimulation = async \(\) => \{.*?(?=// Confirm Kill|// WebSocket)", "", app, flags=re.DOTALL)
app = re.sub(r"const \[isSimulating, setIsSimulating\] = useState\(false\);\n", "", app)

with open(app_path, 'w') as f:
    f.write(app)
