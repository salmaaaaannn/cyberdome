import os
import re

directories_to_scan = [
    'src/app/(dashboard)',
    'src/components',
    'src/stores'
]

mock_variables = [
    "mockNetworkEvents", "mockIoTDevices", "mockUEBAEvents", "mockIncidents",
    "mockAttackGraphNodes", "mockAttackGraphEdges", "mockDigitalTwinNodes", 
    "mockDigitalTwinConnections", "mockSimulationScenarios", "mockNotifications",
    "mockNotificationPreferences", "mockReports", "mockMitreTactics", 
    "mockDetectionRules", "mockPlaybooks", "mockAnalytics", "mockAssets",
    "mockVulnerabilities", "mockUser"
]

for directory in directories_to_scan:
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r') as f:
                    content = f.read()
                
                original_content = content
                
                # Remove mockData import
                content = re.sub(r"import\s*\{[^}]*\}\s*from\s*'@/data/mockData';?\n?", "", content)
                
                # Replace useState(mockSomething) with useState([])
                for mock_var in mock_variables:
                    content = re.sub(fr"useState(?:<[^>]+>)?\({mock_var}\)", "useState([])", content)
                    content = re.sub(fr"useState(?:<[^>]+>)?\({mock_var}\[0\]\)", "useState(null)", content)
                    
                    # Direct assignment (like const selectedEvent = mockIncidents[0])
                    content = re.sub(fr"=\s*{mock_var}\[0\]", "= null", content)
                    content = re.sub(fr"=\s*{mock_var}", "= []", content)
                    
                if content != original_content:
                    with open(filepath, 'w') as f:
                        f.write(content)
                    print(f"Cleaned {filepath}")
