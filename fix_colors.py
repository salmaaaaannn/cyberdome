import os, re

directory = "src/app/(dashboard)"
count = 0

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(".tsx"):
            filepath = os.path.join(root, file)
            with open(filepath, "r") as f:
                content = f.read()
            
            # Replace light grays with var(--bg-subtle) or var(--bg-elevated)
            new_content = re.sub(r"background:\s*'#F8FAFC'", "background: 'var(--bg-subtle)'", content)
            new_content = re.sub(r"backgroundColor:\s*'#F8FAFC'", "backgroundColor: 'var(--bg-subtle)'", new_content)
            
            new_content = re.sub(r"background:\s*'#F9FAFB'", "background: 'var(--bg-elevated)'", new_content)
            new_content = re.sub(r"backgroundColor:\s*'#F9FAFB'", "backgroundColor: 'var(--bg-elevated)'", new_content)
            
            new_content = re.sub(r"background:\s*'#F1F5F9'", "background: 'var(--bg-subtle)'", new_content)
            new_content = re.sub(r"backgroundColor:\s*'#F1F5F9'", "backgroundColor: 'var(--bg-subtle)'", new_content)
            
            # Also replace any remaining "#FFFFFF" just in case the previous script missed some because of quotes
            lines = new_content.split("\n")
            modified_lines = []
            for line in lines:
                if ("background" in line or "backgroundColor" in line) and "'#FFFFFF'" in line:
                    line = line.replace("'#FFFFFF'", "'var(--bg-surface)'")
                modified_lines.append(line)
            
            new_content = "\n".join(modified_lines)
            
            if content != new_content:
                with open(filepath, "w") as f:
                    f.write(new_content)
                count += 1

print(f"Updated {count} files.")
