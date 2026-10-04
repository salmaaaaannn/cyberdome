from typing import Set, Dict

ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    "ADMIN": {
        "company.read",
        "company.update",
        "employee.read",
        "employee.create",
        "employee.update",
        "employee.deactivate",
        "asset.read",
        "asset.create",
        "asset.update",
        "asset.delete",
        "asset.write",
        "vulnerability.read",
        "scanner.run",
        "scanner.read",
        "assessment.create",
        "assessment.read",
        "assessment.cancel",
        "attack_surface.read",
        "incident.read",
        "incident.create",
        "incident.update",
        "incident.write",
        "soar.read",
        "soar.create",
        "soar.write",
        "soar.execute",
        "report.read",
        "report.write",
        "report.generate",
        "notification.read",
        "notification.manage",
        "audit.read",
        "admin.manage"
    },
    "EMPLOYEE": {
        "company.read",
        "employee.read", # Self/directory
        "asset.read",
        "vulnerability.read",
        "scanner.read",
        "assessment.read",
        "attack_surface.read",
        "incident.read",
        "incident.update",
        "report.read",
        "notification.read",
        "training.read",
        "training.execute"
    },
    "PERSONAL": {
        "personal.read",
        "personal.manage",
        "academy.read",
        "url_check.create",
        "fraud_check.create",
        "otp_check.create",
        "device_check.create",
        "notification.read"
    }
}

def get_role_permissions(role: str) -> Set[str]:
    return ROLE_PERMISSIONS.get(role.upper(), set())

def has_permission(role: str, permission: str) -> bool:
    return permission in get_role_permissions(role)
