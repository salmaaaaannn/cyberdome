import re
import os

filepath = 'src/services/index.ts'

with open(filepath, 'r') as f:
    content = f.read()

# Remove the import of mockData entirely
content = re.sub(r"import\s*\{[^}]*\}\s*from\s*'@/data/mockData';?", "", content, flags=re.MULTILINE | re.DOTALL)

# Remove the delay calls since we aren't simulating network latency anymore
content = re.sub(r"await delay\([0-9]+\);", "", content)

replacements = {
    "return mockAssets;": "return [];",
    "return mockVulnerabilities;": "return [];",
    "return mockNetworkEvents;": "return [];",
    "return mockIoTDevices;": "return [];",
    "return mockUEBAEvents;": "return [];",
    "return mockIncidents;": "return [];",
    "return mockAttackGraphNodes;": "return [];",
    "return mockAttackGraphEdges;": "return [];",
    "return mockDigitalTwinNodes;": "return [];",
    "return mockDigitalTwinConnections;": "return [];",
    "return mockSimulationScenarios;": "return [];",
    "return mockNotifications;": "return [];",
    "return mockNotificationPreferences;": "throw new Error('Preferences not found');",
    "return mockReports;": "return [];",
    "return mockMitreTactics;": "return [];",
    "return mockDetectionRules;": "return [];",
    "return mockPlaybooks;": "return [];",
    "return mockAnalytics;": "throw new Error('Analytics data unavailable');",
    "return mockUser;": "throw new Error('User not found');",
    "return { user: mockUser, token: 'mock-jwt-token-cyberdome-2026' };": "throw new Error('Invalid credentials');",
    "return { ...mockUser, id: 'usr-new-' + Date.now(), name: data.name, email: data.email, phone: data.phone, role: 'USER', companyId: undefined, emailVerified: false, phoneVerified: false, mfaEnabled: false };": "throw new Error('Signup failed');",
    "return { user: newUser, token: 'mock-jwt-token-new' };": "throw new Error('Signup failed');",
    "return mockUser.companyId;": "return undefined;",
    "return [mockUser];": "return [];"
}

for old, new in replacements.items():
    content = content.replace(old, new)

# Special cases for endpoints returning a specific single object
# e.g., return mockIncidents[0];
content = re.sub(r"return mockIncidents\[0\];", "throw new Error('Incident not found');", content)
content = re.sub(r"return mockAssets\[0\];", "throw new Error('Asset not found');", content)
content = re.sub(r"return mockVulnerabilities\[0\];", "throw new Error('Vulnerability not found');", content)

with open(filepath, 'w') as f:
    f.write(content)

print("Removed mock data from services!")
