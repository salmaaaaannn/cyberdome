import os
import re
import json

def analyze_project(root_dir):
    report = {
        "routes": [],
        "routers": [],
        "models": [],
        "mock_data_occurrences": []
    }
    
    # 1. Analyze frontend routes
    app_dir = os.path.join(root_dir, "src", "app")
    for root, dirs, files in os.walk(app_dir):
        if "page.tsx" in files:
            file_path = os.path.join(root, "page.tsx")
            route = root.replace(app_dir, "") or "/"
            route = route.replace("\\", "/")
            
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                
            has_fetch = "fetch(" in content or "axios" in content or "useQuery" in content or "api." in content
            has_mock = re.search(r"mock|dummy|fake|Math\.random|hardcoded|sample", content, re.IGNORECASE) is not None
            
            report["routes"].append({
                "route": route,
                "file": file_path.replace(root_dir, ""),
                "has_fetch": has_fetch,
                "has_mock": has_mock
            })
            
    # 2. Analyze Backend Routers
    router_dir = os.path.join(root_dir, "backend", "app", "routers")
    for root, dirs, files in os.walk(router_dir):
        for file in files:
            if file.endswith(".py") and file != "__init__.py":
                file_path = os.path.join(root, file)
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    
                endpoints = re.findall(r"@router\.(get|post|put|delete)\([\"']([^\"']+)[\"']", content)
                for method, endpoint in endpoints:
                    report["routers"].append({
                        "router": file,
                        "method": method.upper(),
                        "endpoint": endpoint
                    })
                    
    # 3. Analyze Backend Models
    models_dir = os.path.join(root_dir, "backend", "app", "models")
    for root, dirs, files in os.walk(models_dir):
        for file in files:
            if file.endswith(".py") and file != "__init__.py":
                file_path = os.path.join(root, file)
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                classes = re.findall(r"class\s+([A-Za-z0-9_]+)\(Base\):", content)
                tables = re.findall(r"__tablename__\s*=\s*[\"']([^\"']+)[\"']", content)
                
                for cls, table in zip(classes, tables):
                    report["models"].append({
                        "file": file,
                        "class": cls,
                        "table": table
                    })
                    
    # 4. Search for Mock Data globally
    mock_pattern = re.compile(r"(mock|dummy|fake|sample|placeholder|demo|hardcoded|Math\.random|faker|chance)", re.IGNORECASE)
    search_dirs = [
        os.path.join(root_dir, "src"),
        os.path.join(root_dir, "backend")
    ]
    for search_dir in search_dirs:
        for root, dirs, files in os.walk(search_dir):
            if "node_modules" in root or "__pycache__" in root or ".next" in root:
                continue
            for file in files:
                if file.endswith((".ts", ".tsx", ".py", ".js", ".jsx")):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            content = f.read()
                            if mock_pattern.search(content):
                                report["mock_data_occurrences"].append(file_path.replace(root_dir, ""))
                    except Exception:
                        pass
                        
    with open("analysis_results.json", "w") as f:
        json.dump(report, f, indent=2)

if __name__ == "__main__":
    analyze_project("/Users/hassaankhan/Desktop/cyberX")
