import os
import re

directory = "src"
count = 0

color_mappings = {
    # Text Primary
    r"'#111827'": "'var(--text-primary)'",
    r'"#111827"': '"var(--text-primary)"',
    r"'#101828'": "'var(--text-primary)'",
    r'"#101828"': '"var(--text-primary)"',
    r"'#1D2939'": "'var(--text-primary)'",
    r'"#1D2939"': '"var(--text-primary)"',
    r"'#1E293B'": "'var(--text-primary)'",
    r'"#1E293B"': '"var(--text-primary)"',
    r"'#222222'": "'var(--text-primary)'",
    r'"#222222"': '"var(--text-primary)"',
    r"'#333333'": "'var(--text-primary)'",
    r'"#333333"': '"var(--text-primary)"',
    r"'#000000'": "'var(--text-primary)'",  # Careful with pure black, mostly used for text in light mode
    
    # Text Secondary
    r"'#344054'": "'var(--text-secondary)'",
    r'"#344054"': '"var(--text-secondary)"',
    r"'#374151'": "'var(--text-secondary)'",
    r'"#374151"': '"var(--text-secondary)"',
    r"'#4B5563'": "'var(--text-secondary)'",
    r'"#4B5563"': '"var(--text-secondary)"',
    r"'#475467'": "'var(--text-secondary)'",
    r'"#475467"': '"var(--text-secondary)"',
    
    # Text Muted
    r"'#667085'": "'var(--text-muted)'",
    r'"#667085"': '"var(--text-muted)"',
    r"'#6B7280'": "'var(--text-muted)'",
    r'"#6B7280"': '"var(--text-muted)"',
    r"'#9CA3AF'": "'var(--text-muted)'",
    r'"#9CA3AF"': '"var(--text-muted)"',
    r"'#98A2B3'": "'var(--text-muted)'",
    r'"#98A2B3"': '"var(--text-muted)"',
    
    # Borders
    r"'#E5E7EB'": "'var(--border-subtle)'",
    r'"#E5E7EB"': '"var(--border-subtle)"',
    r"'#E4E7EC'": "'var(--border-subtle)'",
    r'"#E4E7EC"': '"var(--border-subtle)"',
    r"'#EAECF0'": "'var(--border-subtle)'",
    r'"#EAECF0"': '"var(--border-subtle)"',
    r"'#F3F4F6'": "'var(--border-subtle)'",
    r'"#F3F4F6"': '"var(--border-subtle)"',
    r"'#D1D5DB'": "'var(--border-primary)'",
    r'"#D1D5DB"': '"var(--border-primary)"',
    r"'#D0D5DD'": "'var(--border-primary)'",
    r'"#D0D5DD"': '"var(--border-primary)"',
}

def replace_colors(content):
    new_content = content
    for pattern, replacement in color_mappings.items():
        new_content = re.sub(pattern, replacement, new_content, flags=re.IGNORECASE)
    return new_content

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts") or file.endswith(".js") or file.endswith(".jsx"):
            filepath = os.path.join(root, file)
            with open(filepath, "r") as f:
                content = f.read()
            
            # Special manual replacement for 'black' that might be hardcoded as text color
            new_content = replace_colors(content)
            
            if content != new_content:
                with open(filepath, "w") as f:
                    f.write(new_content)
                count += 1

print(f"Updated {count} files.")
