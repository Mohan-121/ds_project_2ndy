"""Database initialization and seeding of roles, users, and base references.
"""

from datetime import datetime
from sqlalchemy.orm import Session
from app.db.session import engine, Base, SessionLocal
from app.db.models import (
    User, Role, DataSource, AlertRule, CapacityReference, Zone
)
from app.security.auth import get_password_hash
from app.security.roles import ROLE_PERMISSIONS, get_role_permissions


def init_db(db: Session = None) -> None:
    """Create all tables and seed initial system accounts and configuration."""
    close_db = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db = True

    try:
        # 1. Seed Roles
        for role_name, perms in ROLE_PERMISSIONS.items():
            existing_role = db.query(Role).filter(Role.name == role_name).first()
            if not existing_role:
                role = Role(
                    name=role_name,
                    description=f"{role_name} for Coimbatore Municipal Operations",
                    permissions=[p.value for p in perms]
                )
                db.add(role)
        db.commit()

        # 2. Seed Default Accounts (one per role per Section 14)
        default_accounts = [
            ("admin", "admin@urbaniq.cbe.gov.in", "admin123", "City Administrator", "Commissioner Office (Admin)"),
            ("planner", "planner@urbaniq.cbe.gov.in", "planner123", "Urban Planner", "K. Ramanathan (Urban Planning)"),
            ("traffic_analyst", "traffic@urbaniq.cbe.gov.in", "traffic123", "Traffic Analyst", "S. Priya (Traffic Cell)"),
            ("energy_analyst", "energy@urbaniq.cbe.gov.in", "energy123", "Energy Analyst", "M. Karthik (TANGEDCO Liaison)"),
            ("env_analyst", "env@urbaniq.cbe.gov.in", "env123", "Environmental Analyst", "Dr. A. Meenakshi (Pollution Control)"),
            ("viewer", "viewer@urbaniq.cbe.gov.in", "viewer123", "General Viewer", "Public Dashboard Viewer"),
        ]

        for username, email, password, role_name, full_name in default_accounts:
            existing_user = db.query(User).filter(User.username == username).first()
            if not existing_user:
                user = User(
                    username=username,
                    email=email,
                    hashed_password=get_password_hash(password),
                    full_name=full_name,
                    role_name=role_name,
                    is_active=True
                )
                db.add(user)
        db.commit()

        # 3. Seed Base Alert Rules (Section 12)
        default_rules = [
            ("traffic", "Severe Congestion Predicted", "prediction", "speed_ratio < 0.35", "Critical", 30),
            ("traffic", "Moderate Congestion Watch", "prediction", "speed_ratio < 0.60", "Watch", 60),
            ("air", "CPCB AQI Severe Breach", "threshold", "cpcb_aqi > 400", "Critical", 60),
            ("air", "CPCB AQI Poor Category", "threshold", "cpcb_aqi > 200", "High", 60),
            ("energy", "Demand Headroom Depletion (<10% Headroom)", "prediction", "demand_mw > capacity_mw * 0.90", "Critical", 30),
            ("energy", "Demand Deviation from Normal (>20%)", "anomaly", "demand_deviation_pct > 20", "Watch", 60),
            ("quality", "Stale Ingestion Feed Detected", "threshold", "time_since_last_obs > cadence * 3", "High", 120),
        ]

        for domain, name, rtype, expr, severity, cooldown in default_rules:
            existing = db.query(AlertRule).filter(AlertRule.name == name).first()
            if not existing:
                rule = AlertRule(
                    domain=domain,
                    name=name,
                    rule_type=rtype,
                    condition_expr=expr,
                    severity=severity,
                    cooldown_minutes=cooldown,
                    is_enabled=True
                )
                db.add(rule)
        db.commit()

        # 4. Seed Capacity References (Section 5.2 & Section 6.2)
        # Reference capacity for Coimbatore Central Grid / Substations
        default_capacities = [
            ("energy", "ZONE_CENTRAL", 350.0, "MW", "TANGEDCO Coimbatore Central Feeder Rated Capacity"),
            ("energy", "ZONE_EAST", 300.0, "MW", "Peelamedu & Singanallur Industrial Substation Rated Capacity"),
            ("energy", "ZONE_NORTH", 280.0, "MW", "Saravanampatti & Ganapathy Tech Corridor Substation"),
            ("energy", "ZONE_SOUTH", 250.0, "MW", "Ukkadam & Sundarapuram Substation Rated Capacity"),
            ("energy", "ZONE_WEST", 220.0, "MW", "RS Puram & Vadavalli Substation Rated Capacity"),
            ("energy", "CITY_TOTAL", 1400.0, "MW", "Coimbatore Municipal Area Aggregated Grid Capacity"),
        ]

        for domain, entity_id, cap_val, unit, notes in default_capacities:
            existing_cap = db.query(CapacityReference).filter(
                CapacityReference.domain == domain,
                CapacityReference.entity_id == entity_id
            ).first()
            if not existing_cap:
                cap = CapacityReference(
                    domain=domain,
                    entity_id=entity_id,
                    capacity_value=cap_val,
                    unit=unit,
                    updated_by="TANGEDCO Planning Reference",
                    notes=notes,
                    provenance="REFERENCE"
                )
                db.add(cap)
        db.commit()

    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    init_db()
    print("Database tables and seed data created successfully.")
