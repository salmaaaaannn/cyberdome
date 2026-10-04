import os
import re

directory = "src"
count = 0

color_mappings = {
    # Text Primary
    r"#111827": "var(--text-primary)",
    r"#101828": "var(--text-primary)",
    r"#1D2939": "var(--text-primary)",
    r"#1E293B": "var(--text-primary)",
    r"#222222": "var(--text-primary)",
    r"#333333": "var(--text-primary)",
    
    # Text Secondary
    r"#344054": "var(--text-secondary)",
    r"#374151": "var(--text-secondary)",
    r"#4B5563": "var(--text-secondary)",
    r"#475467": "var(--text-secondary)",
    
    # Text Muted
    r"#667085": "var(--text-muted)",
    r"#6B7280": "var(--text-muted)",
    r"#9CA3AF": "var(--text-muted)",
    r"#98A2B3": "var(--text-muted)",
    
    # Borders
    r"#E5E7EB": "var(--border-primary)",
    r"#E4E7EC": "var(--border-primary)",
    r"#EAECF0": "var(--border-primary)",
    r"#F3F4F6": "var(--border-subtle)",
    r"#D1D5DB": "var(--border-primary)",
    r"#D0D5DD": "var(--border-primary)",
    
    # Critical / Red
    r"#D92D20": "var(--color-critical)",
    r"#B42318": "var(--color-critical)",
    r"#FEF3F2": "var(--color-critical-bg)",
    r"#FECDCA": "var(--color-critical-border)",
    r"#FFFBFB": "var(--color-critical-bg)", # from admin dropdown

    # Success / Green
    r"#12B76A": "var(--color-success)",
    r"#027A48": "var(--color-success)",
    r"#ECFDF3": "var(--color-success-bg)",
    r"#A6F4C5": "var(--color-success-border)",

    # Warning / Orange
    r"#F79009": "var(--color-warning)",
    r"#B54708": "var(--color-warning)",
    r"#FFFAEB": "var(--color-warning-bg)",
    r"#FEF0C7": "var(--color-warning-bg)",
    r"#FEDF89": "var(--color-warning-border)",

    # Info / Blue
    r"#1570EF": "var(--color-info)",
    r"#175CD3": "var(--color-info)",
    r"#EFF8FF": "var(--color-info-bg)",
    r"#F0F9FF": "var(--color-info-bg)",
    r"#026AA2": "var(--color-info)",
    r"#B2DDFF": "var(--color-info-border)",
    r"#B9E6FE": "var(--color-info-border)",

    # AI / Purple
    r"#7F56D9": "var(--color-ai)",
    r"#6941C6": "var(--color-ai)",
    r"#F9F5FF": "var(--color-ai-bg)",
    r"#E9D7FE": "var(--color-ai-border)",

    # Remaining Grays for backgrounds
    r"#F2F4F7": "var(--bg-hover)",
    r"#F9FAFB": "var(--bg-elevated)",
}

def replace_colors(content):
    new_content = content
    for pattern, replacement in color_mappings.items():
        # Match case-insensitively, anywhere inside strings
        new_content = re.sub(pattern, replacement, new_content, flags=re.IGNORECASE)
    return new_content

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts") or file.endswith(".css"):
            filepath = os.path.join(root, file)
            with open(filepath, "r") as f:
                content = f.read()
            
            new_content = replace_colors(content)
            
            if content != new_content:
                with open(filepath, "w") as f:
                    f.write(new_content)
                count += 1

print(f"Updated {count} files globally.")
