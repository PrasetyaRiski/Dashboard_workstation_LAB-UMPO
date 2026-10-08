import re
import os

app_path = 'frontend/src/App.jsx'
sidebar_path = 'frontend/src/components/Sidebar.jsx'
sys_path = 'frontend/src/components/SystemOverview.jsx'

# 1. Sidebar.jsx
with open(sidebar_path, 'r') as f:
    sidebar = f.read()
sidebar = re.sub(r"\{ id: 'system',\s*label: 'Infrastruktur',\s*icon: Server,\s*badgeText: 'NVLink' \},\n", "", sidebar)
with open(sidebar_path, 'w') as f:
    f.write(sidebar)

# 2. App.jsx
with open(app_path, 'r') as f:
    app = f.read()

# Change useEffect dependency to trigger on overview
app = app.replace("if (activeTab === 'system' && isAdmin)", "if (activeTab === 'overview' && isAdmin)")

# Pass props to SystemOverview
app = app.replace(
    "<SystemOverview system={data?.system} gpus={data?.gpus} />",
    "<SystemOverview system={data?.system} gpus={data?.gpus} onTriggerBackup={handleTriggerBackup} isBackingUp={isBackingUp} backups={backups} isAdmin={isAdmin} />"
)

# Remove system tab block completely
# Using a regex to find the block {activeTab === 'system' && (...)} 
# This requires careful parsing because of nested brackets.
# It's safer to use python string searching for boundaries.

start_str = "{activeTab === 'system' && ("
end_str = "{activeTab === 'audit' && ("

start_idx = app.find(start_str)
end_idx = app.find(end_str)

if start_idx != -1 and end_idx != -1:
    app = app[:start_idx] + app[end_idx:]
    with open(app_path, 'w') as f:
        f.write(app)
        print("Updated App.jsx")

