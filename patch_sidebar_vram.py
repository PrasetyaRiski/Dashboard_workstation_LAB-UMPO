import re

with open("frontend/src/components/Sidebar.jsx", "r") as f:
    content = f.read()

# Remove the VRAM meter block
meter_pattern = r'\{\/\*\s*VRAM Quota Meter\s*\*\/.*?<\/div>\s*\{\/\*\s*Quick Telemetry'
content = re.sub(meter_pattern, r'{/* Quick Telemetry', content, flags=re.DOTALL)

with open("frontend/src/components/Sidebar.jsx", "w") as f:
    f.write(content)
