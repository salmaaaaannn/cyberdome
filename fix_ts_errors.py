import os
import re

directories_to_scan = [
    'src/app/(dashboard)',
    'src/components',
    'src/stores'
]

for directory in directories_to_scan:
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r') as f:
                    content = f.read()
                
                original_content = content
                
                # Replace useState([]) with useState<any[]>([])
                content = re.sub(r"useState\(\[\]\)", "useState<any[]>([])", content)
                
                # Replace useState(null) with useState<any | null>(null)
                content = re.sub(r"useState\(null\)", "useState<any | null>(null)", content)
                
                if content != original_content:
                    with open(filepath, 'w') as f:
                        f.write(content)
                    print(f"Fixed TS in {filepath}")
