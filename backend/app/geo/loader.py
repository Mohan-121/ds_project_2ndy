"""Spatial data loader to populate zones, wards, junctions, road segments, and stations.
"""

from sqlalchemy.orm import Session
from app.db.models import Zone, Ward, Junction, RoadSegment, Station
from app.geo.coimbatore_network import (
    COIMBATORE_ZONES, COIMBATORE_WARDS, COIMBATORE_JUNCTIONS,
    COIMBATORE_ROAD_SEGMENTS, COIMBATORE_STATIONS
)


def seed_spatial_network(db: Session) -> None:
    """Populate canonical Coimbatore spatial network entities."""
    # 1. Zones
    for z in COIMBATORE_ZONES:
        if not db.query(Zone).filter(Zone.zone_id == z["zone_id"]).first():
            db.add(Zone(**z))
    db.commit()

    # 2. Wards
    for w in COIMBATORE_WARDS:
        if not db.query(Ward).filter(Ward.ward_id == w["ward_id"]).first():
            # Exclude transient helper keys
            w_data = {k: v for k, v in w.items() if k not in ["centre"]}
            db.add(Ward(**w_data))
    db.commit()

    # 3. Junctions
    for j in COIMBATORE_JUNCTIONS:
        if not db.query(Junction).filter(Junction.junction_id == j["junction_id"]).first():
            db.add(Junction(**j))
    db.commit()

    # 4. Road Segments
    for r in COIMBATORE_ROAD_SEGMENTS:
        if not db.query(RoadSegment).filter(RoadSegment.road_segment_id == r["road_segment_id"]).first():
            db.add(RoadSegment(**r))
    db.commit()

    # 5. Stations
    for s in COIMBATORE_STATIONS:
        if not db.query(Station).filter(Station.station_id == s["station_id"]).first():
            db.add(Station(**s, is_active=True))
    db.commit()
