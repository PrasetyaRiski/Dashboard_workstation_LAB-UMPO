import os
import re

directories = ['frontend/src', 'frontend/src/components']
files_to_process = []

for d in directories:
    for filename in os.listdir(d):
        if filename.endswith('.jsx'):
            files_to_process.append(os.path.join(d, filename))

def clean_tailwind_classes(content):
    # 1. Remove glassmorphism
    content = re.sub(r'backdrop-blur-[a-z0-9]+', '', content)
    content = re.sub(r'bg-surface-1/60', 'bg-surface-1', content)
    content = re.sub(r'bg-slate-900/50', 'bg-slate-900', content)
    content = re.sub(r'bg-white/\d+', 'bg-surface-variant', content)
    content = re.sub(r'bg-black/\d+', 'bg-black', content)
    
    # 2. Fix radiuses
    content = re.sub(r'rounded-2xl|rounded-3xl|rounded-full', 'rounded-xl', content)
    # Revert rounded-full on specifically avatars if needed, but let's just make them rounded-xl (slightly square) which is more "calm/system" looking. Wait, badges should be rounded-md or rounded-sm, not rounded-full.
    content = re.sub(r'rounded-full', 'rounded-md', content)
    
    # 3. Remove gradients
    content = re.sub(r'bg-gradient-to-[a-z]+\s+', '', content)
    content = re.sub(r'from-[a-z0-9-]+', '', content)
    content = re.sub(r'via-[a-z0-9-]+', '', content)
    content = re.sub(r'to-[a-z0-9-]+', '', content)
    content = re.sub(r'bg-\[radial-gradient[^\]]+\]', '', content)
    
    # 4. Remove glow/shadows
    content = re.sub(r'shadow-\[inset[^\]]+\]', '', content)
    content = re.sub(r'shadow-xl|shadow-2xl|shadow-lg', 'shadow-sm', content)
    content = re.sub(r'drop-shadow-\[?[a-z0-9#-]+\]?', '', content)
    
    # 5. Remove excessive hover motion
    content = re.sub(r'hover:scale-105|hover:-translate-y-1|transform\s+|transition-transform\s+|duration-\d+\s+', '', content)
    
    # 6. Clean up multiple spaces
    content = re.sub(r'\s+', ' ', content)
    # Fix spacing around class names
    content = content.replace('className=" ', 'className="').replace(' "', '"')
    
    return content

for filepath in files_to_process:
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = clean_tailwind_classes(content)
    
    # Write back if changed
    if content != new_content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Cleaned {filepath}")

