import os

app_path = 'frontend/src/App.jsx'
sidebar_path = 'frontend/src/components/Sidebar.jsx'

# 1. Sidebar.jsx
with open(sidebar_path, 'r') as f:
    sidebar = f.read()

# Remove jobs tab
lines = sidebar.split('\n')
sidebar_clean = []
for line in lines:
    if "{ id: 'jobs',      label: 'Manajemen Job'" in line:
        continue
    # We can also remove processCount if we want, but it's harmless to leave the parameter. 
    # Let's clean it from the params list just to be neat.
    if "processCount = 0," in line:
        continue
    sidebar_clean.append(line)

with open(sidebar_path, 'w') as f:
    f.write('\n'.join(sidebar_clean))

# 2. App.jsx
with open(app_path, 'r') as f:
    app = f.read()

# Remove import
app = app.replace("import ProcessManager from './components/ProcessManager';\n", "")

# Remove handleRunSimulation and handleStopSimulation
import re

app = re.sub(r"const \[isSimulating, setIsSimulating\] = useState\(false\);\n", "", app)
app = re.sub(r"// Run Simulation\n\s*const handleRunSimulation = async \(\) => \{[\s\S]*?setIsSimulating\(false\);\n\s*\};\n", "", app)
app = re.sub(r"// Stop Simulation\n\s*const handleStopSimulation = async \(\) => \{[\s\S]*?setIsSimulating\(false\);\n\s*\};\n", "", app)

# Remove the block {activeTab === 'jobs' && (...)}
start_str = "{activeTab === 'jobs' && ("
end_str = "{activeTab === 'students' && ("

start_idx = app.find(start_str)
end_idx = app.find(end_str)

if start_idx != -1 and end_idx != -1:
    app = app[:start_idx] + app[end_idx:]

# Remove processCount={activeProcesses.length}
app = re.sub(r"\s*processCount=\{activeProcesses\.length\}", "", app)

# Remove const activeProcesses = data?.all_processes || [];
app = re.sub(r"\s*const activeProcesses = data\?\.all_processes \|\| \[\];", "", app)

with open(app_path, 'w') as f:
    f.write(app)

# 3. Delete ProcessManager.jsx
if os.path.exists('frontend/src/components/ProcessManager.jsx'):
    os.remove('frontend/src/components/ProcessManager.jsx')
    print("Deleted ProcessManager.jsx")

