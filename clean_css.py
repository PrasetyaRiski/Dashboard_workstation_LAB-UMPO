import re

with open('frontend/src/index.css', 'r') as f:
    content = f.read()

# Remove glassmorphism variables
content = re.sub(r'--glass-bg:.*?;', '', content)
content = re.sub(r'--glass-blur:.*?;', '', content)
content = re.sub(r'--glass-border:.*?;', '', content)

# Remove shadow hover effects on .rounded-2xl
content = re.sub(r'\.rounded-2xl:hover\s*\{[^}]*\}', '', content)
# Remove main fadeSlide animation
content = re.sub(r'@keyframes fadeSlide\s*\{[^}]*\}\s*main > \*\s*\{\s*animation: fadeSlide[^}]*\}', '', content)

# Remove toggle-glow animation
content = re.sub(r'@keyframes toggle-glow\s*\{[^}]*\}[^}]*\}\s*\.sidebar-toggle-glow\s*\{[^}]*\}', '', content, flags=re.DOTALL)

with open('frontend/src/index.css', 'w') as f:
    f.write(content)

