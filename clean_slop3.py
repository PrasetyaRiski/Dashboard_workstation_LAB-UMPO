import os
import re

directories = ['frontend/src', 'frontend/src/components']
files_to_process = []

for d in directories:
    for filename in os.listdir(d):
        if filename.endswith('.jsx'):
            files_to_process.append(os.path.join(d, filename))

def clean_class_string(cls_str):
    c = cls_str
    # 1. Glassmorphism & gradients
    c = re.sub(r'\bbackdrop-blur-[a-z0-9]+\b', '', c)
    c = re.sub(r'\bbg-surface-1/60\b', 'bg-surface-1', c)
    c = re.sub(r'\bbg-slate-900/50\b', 'bg-surface-2', c)
    c = re.sub(r'\bbg-white/\d+\b', 'bg-surface-variant', c)
    c = re.sub(r'\bbg-black/\d+\b', 'bg-black', c)
    c = re.sub(r'\bbg-gradient-to-[a-z]+\b', '', c)
    c = re.sub(r'\bfrom-[a-z0-9-]+\b', '', c)
    c = re.sub(r'\bvia-[a-z0-9-]+\b', '', c)
    c = re.sub(r'\bto-[a-z0-9-]+\b', '', c)
    c = re.sub(r'bg-\[radial-gradient[^\]]+\]', '', c)
    
    # 2. Radiuses
    c = re.sub(r'\brounded-2xl\b|\brounded-3xl\b', 'rounded-xl', c)
    c = re.sub(r'\brounded-full\b', 'rounded-xl', c)
    
    # 3. Shadows/glows
    c = re.sub(r'shadow-\[inset[^\]]+\]', '', c)
    c = re.sub(r'\bshadow-xl\b|\bshadow-2xl\b|\bshadow-lg\b', 'shadow-sm', c)
    c = re.sub(r'\bdrop-shadow-\[?[a-z0-9#-]+\]?\b', '', c)
    
    # 4. Motion
    c = re.sub(r'\bhover:scale-105\b|\bhover:-translate-y-1\b', '', c)
    c = re.sub(r'\btransition-transform\b', 'transition-colors', c)
    c = re.sub(r'\banimate-fade-in-up\b', '', c)
    c = re.sub(r'\banimate-pulse\b', '', c)

    # 5. Uppercase generic texts
    c = re.sub(r'\buppercase\b', '', c)
    c = re.sub(r'\btracking-wider\b|\btracking-widest\b', '', c)
    
    # Clean up excessive spaces inside the class string
    c = re.sub(r'\s+', ' ', c).strip()
    return c

def process_file_content(content):
    # Find className="..." or className={`...`} and process the string inside
    # This is a bit tricky with nested expressions, so let's just do targeted global replacements safely.
    
    # Instead of parsing JSX, let's just use \b (word boundaries) on the whole file,
    # because these classes are highly specific and rarely appear in normal text.
    
    c = content
    # 1. Glassmorphism & gradients
    c = re.sub(r'\bbackdrop-blur-[a-z0-9]+\b', '', c)
    c = re.sub(r'\bbg-surface-1/60\b', 'bg-surface-1', c)
    c = re.sub(r'\bbg-slate-900/50\b', 'bg-surface-2', c)
    c = re.sub(r'\bbg-white/\d+\b', 'bg-surface-variant', c)
    c = re.sub(r'\bbg-black/60\b', 'bg-black', c)
    c = re.sub(r'\bbg-black/80\b', 'bg-black', c)
    c = re.sub(r'\bbg-black/40\b', 'bg-black', c)
    c = re.sub(r'\bbg-gradient-to-[a-z]+\b', '', c)
    c = re.sub(r'\bfrom-[a-z0-9-]+\b', '', c)
    c = re.sub(r'\bvia-[a-z0-9-]+\b', '', c)
    c = re.sub(r'\bto-[a-z0-9-]+\b', '', c)
    c = re.sub(r'bg-\[radial-gradient[^\]]+\]', '', c)
    
    # 2. Radiuses
    c = re.sub(r'\brounded-2xl\b|\brounded-3xl\b', 'rounded-xl', c)
    c = re.sub(r'\brounded-full\b', 'rounded-md', c)
    
    # 3. Shadows/glows
    c = re.sub(r'shadow-\[inset[^\]]+\]', '', c)
    c = re.sub(r'\bshadow-xl\b|\bshadow-2xl\b|\bshadow-lg\b', 'shadow-sm', c)
    c = re.sub(r'drop-shadow-\[[^\]]+\]', '', c)
    
    # 4. Motion
    c = re.sub(r'\bhover:scale-105\b|\bhover:-translate-y-1\b', '', c)
    c = re.sub(r'\btransition-transform\b', 'transition-colors', c)
    
    return c

for filepath in files_to_process:
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = process_file_content(content)
    
    # Write back if changed
    if content != new_content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Cleaned {filepath}")

