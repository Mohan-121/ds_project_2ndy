"""Role-Based Access Control (RBAC) Permission Matrix for UrbanIQ.

Enforced on all FastAPI endpoints and assistant tool invocations.
"""

from enum import Enum
from typing import Set, Dict, List


class Permission(str, Enum):
    # View permissions
    VIEW_DASHBOARDS = "view:dashboards"
    VIEW_TRAFFIC = "view:traffic"
    VIEW_ENERGY = "view:energy"
    VIEW_AIR = "view:air"
    VIEW_POPULATION = "view:population"
    VIEW_DIGITAL_TWIN = "view:digital_twin"
    VIEW_MODELS = "view:models"
    VIEW_DATA_QUALITY = "view:data_quality"
    VIEW_ALERTS = "view:alerts"
    VIEW_REPORTS = "view:reports"
    VIEW_ASSISTANT = "view:assistant"

    # Action / Mutating permissions
    IMPORT_DATA = "action:import_data"
    CONFIGURE_SOURCES = "action:configure_sources"
    TRAIN_MODELS = "action:train_models"
    EDIT_THRESHOLDS = "action:edit_thresholds"
    MANAGE_SCENARIOS = "action:manage_scenarios"
    SHARE_SCENARIOS = "action:share_scenarios"
    ACKNOWLEDGE_ALERTS = "action:acknowledge_alerts"
    GENERATE_REPORTS = "action:generate_reports"
    MANAGE_USERS = "admin:manage_users"
    VIEW_AUDIT_LOGS = "admin:view_audit_logs"


# Canonical Role definitions with granted permissions
ROLE_PERMISSIONS: Dict[str, Set[Permission]] = {
    "City Administrator": {perm for perm in Permission},

    "Urban Planner": {
        Permission.VIEW_DASHBOARDS,
        Permission.VIEW_TRAFFIC,
        Permission.VIEW_ENERGY,
        Permission.VIEW_AIR,
        Permission.VIEW_POPULATION,
        Permission.VIEW_DIGITAL_TWIN,
        Permission.VIEW_MODELS,
        Permission.VIEW_DATA_QUALITY,
        Permission.VIEW_ALERTS,
        Permission.VIEW_REPORTS,
        Permission.VIEW_ASSISTANT,
        Permission.MANAGE_SCENARIOS,
        Permission.SHARE_SCENARIOS,
        Permission.GENERATE_REPORTS,
        Permission.ACKNOWLEDGE_ALERTS,
    },

    "Traffic Analyst": {
        Permission.VIEW_DASHBOARDS,
        Permission.VIEW_TRAFFIC,
        Permission.VIEW_DIGITAL_TWIN,
        Permission.VIEW_MODELS,
        Permission.VIEW_DATA_QUALITY,
        Permission.VIEW_ALERTS,
        Permission.VIEW_REPORTS,
        Permission.VIEW_ASSISTANT,
        Permission.IMPORT_DATA,
        Permission.TRAIN_MODELS,
        Permission.MANAGE_SCENARIOS,
        Permission.GENERATE_REPORTS,
        Permission.ACKNOWLEDGE_ALERTS,
    },

    "Energy Analyst": {
        Permission.VIEW_DASHBOARDS,
        Permission.VIEW_ENERGY,
        Permission.VIEW_DIGITAL_TWIN,
        Permission.VIEW_MODELS,
        Permission.VIEW_DATA_QUALITY,
        Permission.VIEW_ALERTS,
        Permission.VIEW_REPORTS,
        Permission.VIEW_ASSISTANT,
        Permission.IMPORT_DATA,
        Permission.TRAIN_MODELS,
        Permission.MANAGE_SCENARIOS,
        Permission.GENERATE_REPORTS,
        Permission.ACKNOWLEDGE_ALERTS,
    },

    "Environmental Analyst": {
        Permission.VIEW_DASHBOARDS,
        Permission.VIEW_AIR,
        Permission.VIEW_DIGITAL_TWIN,
        Permission.VIEW_MODELS,
        Permission.VIEW_DATA_QUALITY,
        Permission.VIEW_ALERTS,
        Permission.VIEW_REPORTS,
        Permission.VIEW_ASSISTANT,
        Permission.IMPORT_DATA,
        Permission.TRAIN_MODELS,
        Permission.MANAGE_SCENARIOS,
        Permission.GENERATE_REPORTS,
        Permission.ACKNOWLEDGE_ALERTS,
    },

    "General Viewer": {
        Permission.VIEW_DASHBOARDS,
        Permission.VIEW_TRAFFIC,
        Permission.VIEW_ENERGY,
        Permission.VIEW_AIR,
        Permission.VIEW_POPULATION,
        Permission.VIEW_DIGITAL_TWIN,
        Permission.VIEW_DATA_QUALITY,
        Permission.VIEW_ALERTS,
        Permission.VIEW_REPORTS,
        Permission.VIEW_ASSISTANT,
    },
}


def has_permission(role_name: str, permission: Permission) -> bool:
    """Check if a given role has the requested permission."""
    perms = ROLE_PERMISSIONS.get(role_name, set())
    return permission in perms


def get_role_permissions(role_name: str) -> List[str]:
    """Retrieve string permission names for a role."""
    perms = ROLE_PERMISSIONS.get(role_name, set())
    return [p.value for p in perms]
