import os
import re

directory = "src"
count = 0

color_mappings = {
    # Critical / Red
    r"'#D92D20'": "'var(--color-critical)'",
    r'"#D92D20"': '"var(--color-critical)"',
    r"'#B42318'": "'var(--color-critical)'",
    r'"#B42318"': '"var(--color-critical)"',
    r"'#FEF3F2'": "'var(--color-critical-bg)'",
    r'"#FEF3F2"': '"var(--color-critical-bg)"',
    r"'#FECDCA'": "'var(--color-critical-border)'",
    r'"#FECDCA"': '"var(--color-critical-border)"',

    # Success / Green
    r"'#12B76A'": "'var(--color-success)'",
    r'"#12B76A"': '"var(--color-success)"',
    r"'#027A48'": "'var(--color-success)'",
    r'"#027A48"': '"var(--color-success)"',
    r"'#ECFDF3'": "'var(--color-success-bg)'",
    r'"#ECFDF3"': '"var(--color-success-bg)"',
    r"'#A6F4C5'": "'var(--color-success-border)'",
    r'"#A6F4C5"': '"var(--color-success-border)"',

    # Warning / Orange
    r"'#F79009'": "'var(--color-warning)'",
    r'"#F79009"': '"var(--color-warning)"',
    r"'#B54708'": "'var(--color-warning)'",
    r'"#B54708"': '"var(--color-warning)"',
    r"'#FFFAEB'": "'var(--color-warning-bg)'",
    r'"#FFFAEB"': '"var(--color-warning-bg)"',
    r"'#FEF0C7'": "'var(--color-warning-bg)'",  # Noticed this in admin/page.tsx
    r'"#FEF0C7"': '"var(--color-warning-bg)"',
    r"'#FEDF89'": "'var(--color-warning-border)'",
    r'"#FEDF89"': '"var(--color-warning-border)"',

    # Info / Blue
    r"'#1570EF'": "'var(--color-info)'",
    r'"#1570EF"': '"var(--color-info)"',
    r"'#175CD3'": "'var(--color-info)'",
    r'"#175CD3"': '"var(--color-info)"',
    r"'#EFF8FF'": "'var(--color-info-bg)'",
    r'"#EFF8FF"': '"var(--color-info-bg)"',
    r"'#F0F9FF'": "'var(--color-info-bg)'",  # Alternate blue bg
    r'"#F0F9FF"': '"var(--color-info-bg)"',
    r"'#026AA2'": "'var(--color-info)'",     # Alternate blue text
    r'"#026AA2"': '"var(--color-info)"',
    r"'#B2DDFF'": "'var(--color-info-border)'",
    r'"#B2DDFF"': '"var(--color-info-border)"',

    # AI / Purple
    r"'#7F56D9'": "'var(--color-ai)'",
    r'"#7F56D9"': '"var(--color-ai)"',
    r"'#6941C6'": "'var(--color-ai)'",
    r'"#6941C6"': '"var(--color-ai)"',
    r"'#F9F5FF'": "'var(--color-ai-bg)'",
    r'"#F9F5FF"': '"var(--color-ai-bg)"',
    r"'#E9D7FE'": "'var(--color-ai-border)'",
    r'"#E9D7FE"': '"var(--color-ai-border)"',

    # Remaining Grays for backgrounds
    r"'#F2F4F7'": "'var(--bg-hover)'",
    r'"#F2F4F7"': '"var(--bg-hover)"',
    r"'#F9FAFB'": "'var(--bg-elevated)'",
    r'"#F9FAFB"': '"var(--bg-elevated)"',
    
    # White overrides which should be text primary if it's text, but we can't easily distinguish. 
    # Let's skip pure white/black replacement globally to avoid breaking things, but we'll manually check.
}

def replace_colors(content):
    new_content = content
    for pattern, replacement in color_mappings.items():
        new_content = re.sub(pattern, replacement, new_content, flags=re.IGNORECASE)
    return new_content

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts"):
            filepath = os.path.join(root, file)
            with open(filepath, "r") as f:
                content = f.read()
            
            new_content = replace_colors(content)
            
            if content != new_content:
                with open(filepath, "w") as f:
                    f.write(new_content)
                count += 1

print(f"Updated {count} files.")
