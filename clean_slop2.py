import os
import re

directories = ['frontend/src', 'frontend/src/components']
files_to_process = []

for d in directories:
    for filename in os.listdir(d):
        if filename.endswith('.jsx'):
            files_to_process.append(os.path.join(d, filename))

def clean_tailwind_classes(content):
    # 1. Remove glassmorphism & gradients
    content = re.sub(r'backdrop-blur-[a-z0-9]+', '', content)
    content = re.sub(r'bg-surface-1/60', 'bg-surface-1', content)
    content = re.sub(r'bg-slate-900/50', 'bg-surface-2', content)
    content = re.sub(r'bg-white/\d+', 'bg-surface-variant', content)
    content = re.sub(r'bg-black/\d+', 'bg-black', content)
    content = re.sub(r'bg-gradient-to-[a-z]+\s+', '', content)
    content = re.sub(r'from-[a-z0-9-]+', '', content)
    content = re.sub(r'via-[a-z0-9-]+', '', content)
    content = re.sub(r'to-[a-z0-9-]+', '', content)
    content = re.sub(r'bg-\[radial-gradient[^\]]+\]', '', content)
    
    # 2. Fix radiuses
    content = re.sub(r'rounded-2xl|rounded-3xl|rounded-full', 'rounded-xl', content)
    content = re.sub(r'rounded-full', 'rounded-md', content) # Double-checking in case of previous misses
    
    # 3. Fix glow/shadows
    content = re.sub(r'shadow-\[inset[^\]]+\]', '', content)
    content = re.sub(r'shadow-xl|shadow-2xl|shadow-lg', 'shadow-md', content)
    content = re.sub(r'drop-shadow-\[?[a-z0-9#-]+\]?', '', content)
    
    # 4. Remove excessive hover motion
    content = re.sub(r'hover:scale-105|hover:-translate-y-1', '', content)
    content = re.sub(r'transition-transform', 'transition-colors', content)
    
    # Clean up multiple spaces inside class names (but try not to touch formatting too much)
    # Actually, let's just let it be, a double space in a className string is harmless.
    content = content.replace('className=" ', 'className="').replace('  ', ' ')
    
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

