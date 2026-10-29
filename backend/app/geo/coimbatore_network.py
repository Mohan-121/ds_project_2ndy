"""Coimbatore Road Graph and Canonical Spatial Network.

Defines the canonical road segments, junctions, zones, and wards for Coimbatore,
Tamil Nadu (Centre: 11.0168° N, 76.9558° E).
"""

import json
from typing import List, Dict, Any

# 5 Municipal Zones
COIMBATORE_ZONES = [
    {"zone_id": "ZONE_CENTRAL", "name": "Central Zone", "description": "Gandhipuram, Race Course, Town Hall, Railway Station"},
    {"zone_id": "ZONE_EAST", "name": "East Zone", "description": "Peelamedu, Singanallur, Hope College, Airport, TIDEL Park"},
    {"zone_id": "ZONE_NORTH", "name": "North Zone", "description": "Saravanampatti, Ganapathy, Thudiyalur, Sathy Road Corridor"},
    {"zone_id": "ZONE_SOUTH", "name": "South Zone", "description": "Ukkadam, Podanur, Kuniyamuthur, Sundarapuram"},
    {"zone_id": "ZONE_WEST", "name": "West Zone", "description": "RS Puram, Vadavalli, Saibaba Colony, Thondamuthur Road"},
]

# Key Wards representing representative administrative divisions
COIMBATORE_WARDS = [
    {
        "ward_id": "WARD_042",
        "name": "Gandhipuram Commercial Ward",
        "zone_id": "ZONE_CENTRAL",
        "area_sqkm": 2.4,
        "population_2011": 28450,
        "centre": [11.0183, 76.9650],
        "boundary_geojson": json.dumps({
            "type": "Polygon",
            "coordinates": [[[76.958, 11.012], [76.972, 11.012], [76.972, 11.025], [76.958, 11.025], [76.958, 11.012]]]
        })
    },
    {
        "ward_id": "WARD_045",
        "name": "Race Course - Town Hall",
        "zone_id": "ZONE_CENTRAL",
        "area_sqkm": 3.1,
        "population_2011": 31200,
        "centre": [11.0062, 76.9748],
        "boundary_geojson": json.dumps({
            "type": "Polygon",
            "coordinates": [[[76.965, 11.000], [76.985, 11.000], [76.985, 11.015], [76.965, 11.015], [76.965, 11.000]]]
        })
    },
    {
        "ward_id": "WARD_052",
        "name": "Peelamedu Tech Hub",
        "zone_id": "ZONE_EAST",
        "area_sqkm": 4.8,
        "population_2011": 38900,
        "centre": [11.0267, 77.0125],
        "boundary_geojson": json.dumps({
            "type": "Polygon",
            "coordinates": [[[77.000, 11.018], [77.030, 11.018], [77.030, 11.038], [77.000, 11.038], [77.000, 11.018]]]
        })
    },
    {
        "ward_id": "WARD_058",
        "name": "Singanallur Industrial Ward",
        "zone_id": "ZONE_EAST",
        "area_sqkm": 5.2,
        "population_2011": 42100,
        "centre": [11.0012, 77.0250],
        "boundary_geojson": json.dumps({
            "type": "Polygon",
            "coordinates": [[[77.010, 10.990], [77.040, 10.990], [77.040, 11.012], [77.010, 11.012], [77.010, 10.990]]]
        })
    },
    {
        "ward_id": "WARD_028",
        "name": "Saravanampatti IT Corridor",
        "zone_id": "ZONE_NORTH",
        "area_sqkm": 6.5,
        "population_2011": 45600,
        "centre": [11.0827, 76.9967],
        "boundary_geojson": json.dumps({
            "type": "Polygon",
            "coordinates": [[[76.980, 11.070], [77.015, 11.070], [77.015, 11.095], [76.980, 11.095], [76.980, 11.070]]]
        })
    },
    {
        "ward_id": "WARD_034",
        "name": "Ganapathy Commercial",
        "zone_id": "ZONE_NORTH",
        "area_sqkm": 3.8,
        "population_2011": 34800,
        "centre": [11.0420, 76.9830],
        "boundary_geojson": json.dumps({
            "type": "Polygon",
            "coordinates": [[[76.970, 11.030], [76.995, 11.030], [76.995, 11.055], [76.970, 11.055], [76.970, 11.030]]]
        })
    },
    {
        "ward_id": "WARD_086",
        "name": "Ukkadam Lake & Bus Terminus",
        "zone_id": "ZONE_SOUTH",
        "area_sqkm": 3.5,
        "population_2011": 37200,
        "centre": [10.9925, 76.9608],
        "boundary_geojson": json.dumps({
            "type": "Polygon",
            "coordinates": [[[76.950, 10.980], [76.975, 10.980], [76.975, 11.000], [76.950, 11.000], [76.950, 10.980]]]
        })
    },
    {
        "ward_id": "WARD_092",
        "name": "Podanur Transit Junction",
        "zone_id": "ZONE_SOUTH",
        "area_sqkm": 4.1,
        "population_2011": 29800,
        "centre": [10.9650, 76.9950],
        "boundary_geojson": json.dumps({
            "type": "Polygon",
            "coordinates": [[[76.980, 10.950], [77.010, 10.950], [77.010, 10.980], [76.980, 10.980], [76.980, 10.950]]]
        })
    },
    {
        "ward_id": "WARD_064",
        "name": "RS Puram Residential & Heritage",
        "zone_id": "ZONE_WEST",
        "area_sqkm": 3.2,
        "population_2011": 26500,
        "centre": [11.0086, 76.9453],
        "boundary_geojson": json.dumps({
            "type": "Polygon",
            "coordinates": [[[76.935, 10.998], [76.955, 10.998], [76.955, 11.018], [76.935, 11.018], [76.935, 10.998]]]
        })
    },
    {
        "ward_id": "WARD_072",
        "name": "Vadavalli Foothills",
        "zone_id": "ZONE_WEST",
        "area_sqkm": 5.9,
        "population_2011": 31400,
        "centre": [11.0250, 76.9050],
        "boundary_geojson": json.dumps({
            "type": "Polygon",
            "coordinates": [[[76.890, 11.010], [76.925, 11.010], [76.925, 11.040], [76.890, 11.040], [76.890, 11.010]]]
        })
    },
]

# Key Junctions
COIMBATORE_JUNCTIONS = [
    {"junction_id": "JCT_GANDHIPURAM_FLYOVER", "name": "Gandhipuram Flyover Junction", "ward_id": "WARD_042", "zone_id": "ZONE_CENTRAL", "lat": 11.0183, "lon": 76.9650, "junction_type": "signalized_grade_separated"},
    {"junction_id": "JCT_LAKSHMI_MILLS", "name": "Lakshmi Mills Junction", "ward_id": "WARD_042", "zone_id": "ZONE_CENTRAL", "lat": 11.0135, "lon": 76.9805, "junction_type": "signalized"},
    {"junction_id": "JCT_NAVA_INDIA", "name": "Nava India Junction", "ward_id": "WARD_052", "zone_id": "ZONE_EAST", "lat": 11.0195, "lon": 76.9952, "junction_type": "signalized"},
    {"junction_id": "JCT_HOPE_COLLEGE", "name": "Hope College Peelamedu Junction", "ward_id": "WARD_052", "zone_id": "ZONE_EAST", "lat": 11.0282, "lon": 77.0185, "junction_type": "signalized"},
    {"junction_id": "JCT_AIRPORT_SITRA", "name": "SITRA Airport Junction", "ward_id": "WARD_052", "zone_id": "ZONE_EAST", "lat": 11.0350, "lon": 77.0420, "junction_type": "roundabout"},
    {"junction_id": "JCT_UKKADAM_BUS_STAND", "name": "Ukkadam Bus Stand Circle", "ward_id": "WARD_086", "zone_id": "ZONE_SOUTH", "lat": 10.9925, "lon": 76.9608, "junction_type": "roundabout_flyover"},
    {"junction_id": "JCT_SUNGAM_BYPASS", "name": "Sungam Bypass Junction", "ward_id": "WARD_045", "zone_id": "ZONE_CENTRAL", "lat": 11.0020, "lon": 76.9810, "junction_type": "signalized"},
    {"junction_id": "JCT_SINGANALLUR_BUS_STAND", "name": "Singanallur Bus Stand Signal", "ward_id": "WARD_058", "zone_id": "ZONE_EAST", "lat": 11.0012, "lon": 77.0250, "junction_type": "signalized"},
    {"junction_id": "JCT_GANAPATHY_BUS_STAND", "name": "Ganapathy Bus Stand Signal", "ward_id": "WARD_034", "zone_id": "ZONE_NORTH", "lat": 11.0420, "lon": 76.9830, "junction_type": "signalized"},
    {"junction_id": "JCT_SARAVANAMPATTI_CHECKPOST", "name": "Saravanampatti Checkpost", "ward_id": "WARD_028", "zone_id": "ZONE_NORTH", "lat": 11.0827, "lon": 76.9967, "junction_type": "signalized"},
    {"junction_id": "JCT_RS_PURAM_DB_ROAD", "name": "DB Road / TV Samy Rd Junction", "ward_id": "WARD_064", "zone_id": "ZONE_WEST", "lat": 11.0086, "lon": 76.9453, "junction_type": "signalized"},
    {"junction_id": "JCT_METTUPALAYAM_RD_SAIBABA", "name": "Saibaba Colony Signal", "ward_id": "WARD_064", "zone_id": "ZONE_WEST", "lat": 11.0260, "lon": 76.9480, "junction_type": "signalized"},
]

# Canonical Road Segments covering primary corridors and arterial roads
COIMBATORE_ROAD_SEGMENTS = [
    # Avinashi Road Corridor (NH 544 / State Trunk Arterial)
    {
        "road_segment_id": "RD_AVINASHI_01",
        "name": "Avinashi Road: Gandhipuram Flyover to Lakshmi Mills",
        "road_class": "trunk",
        "speed_limit_kmh": 60.0,
        "free_flow_speed_kmh": 50.0,
        "length_meters": 1750.0,
        "lanes": 6,
        "ward_id": "WARD_042",
        "zone_id": "ZONE_CENTRAL",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [[76.9650, 11.0183], [76.9725, 11.0160], [76.9805, 11.0135]]
        })
    },
    {
        "road_segment_id": "RD_AVINASHI_02",
        "name": "Avinashi Road: Lakshmi Mills to Nava India",
        "road_class": "trunk",
        "speed_limit_kmh": 60.0,
        "free_flow_speed_kmh": 52.0,
        "length_meters": 1600.0,
        "lanes": 6,
        "ward_id": "WARD_052",
        "zone_id": "ZONE_EAST",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [[76.9805, 11.0135], [76.9880, 11.0165], [76.9952, 11.0195]]
        })
    },
    {
        "road_segment_id": "RD_AVINASHI_03",
        "name": "Avinashi Road: Nava India to Hope College (Peelamedu)",
        "road_class": "trunk",
        "speed_limit_kmh": 60.0,
        "free_flow_speed_kmh": 48.0,
        "length_meters": 2600.0,
        "lanes": 6,
        "ward_id": "WARD_052",
        "zone_id": "ZONE_EAST",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [[76.9952, 11.0195], [77.0065, 11.0238], [77.0185, 11.0282]]
        })
    },
    {
        "road_segment_id": "RD_AVINASHI_04",
        "name": "Avinashi Road: Hope College to SITRA Airport Junction",
        "road_class": "trunk",
        "speed_limit_kmh": 65.0,
        "free_flow_speed_kmh": 55.0,
        "length_meters": 2800.0,
        "lanes": 6,
        "ward_id": "WARD_052",
        "zone_id": "ZONE_EAST",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [[77.0185, 11.0282], [77.0305, 11.0315], [77.0420, 11.0350]]
        })
    },

    # Trichy Road Corridor (SH 81)
    {
        "road_segment_id": "RD_TRICHY_01",
        "name": "Trichy Road: Sungam Junction to Ramanathapuram",
        "road_class": "primary",
        "speed_limit_kmh": 50.0,
        "free_flow_speed_kmh": 44.0,
        "length_meters": 1900.0,
        "lanes": 4,
        "ward_id": "WARD_045",
        "zone_id": "ZONE_CENTRAL",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [[76.9810, 11.0020], [76.9915, 11.0018], [77.0010, 11.0015]]
        })
    },
    {
        "road_segment_id": "RD_TRICHY_02",
        "name": "Trichy Road: Ramanathapuram to Singanallur Bus Stand",
        "road_class": "primary",
        "speed_limit_kmh": 50.0,
        "free_flow_speed_kmh": 42.0,
        "length_meters": 2700.0,
        "lanes": 4,
        "ward_id": "WARD_058",
        "zone_id": "ZONE_EAST",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [[77.0010, 11.0015], [77.0130, 11.0014], [77.0250, 11.0012]]
        })
    },

    # Sathy Road Corridor (NH 209)
    {
        "road_segment_id": "RD_SATHY_01",
        "name": "Sathy Road: Gandhipuram to Ganapathy",
        "road_class": "primary",
        "speed_limit_kmh": 50.0,
        "free_flow_speed_kmh": 40.0,
        "length_meters": 2900.0,
        "lanes": 4,
        "ward_id": "WARD_034",
        "zone_id": "ZONE_NORTH",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [[76.9650, 11.0183], [76.9740, 11.0300], [76.9830, 11.0420]]
        })
    },
    {
        "road_segment_id": "RD_SATHY_02",
        "name": "Sathy Road: Ganapathy to Saravanampatti IT Park",
        "road_class": "primary",
        "speed_limit_kmh": 55.0,
        "free_flow_speed_kmh": 46.0,
        "length_meters": 4700.0,
        "lanes": 4,
        "ward_id": "WARD_028",
        "zone_id": "ZONE_NORTH",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [[76.9830, 11.0420], [76.9900, 11.0620], [76.9967, 11.0827]]
        })
    },

    # Mettupalayam Road Corridor (NH 181)
    {
        "road_segment_id": "RD_METTUPALAYAM_01",
        "name": "Mettupalayam Road: Flower Market to Saibaba Colony",
        "road_class": "primary",
        "speed_limit_kmh": 50.0,
        "free_flow_speed_kmh": 42.0,
        "length_meters": 2400.0,
        "lanes": 4,
        "ward_id": "WARD_064",
        "zone_id": "ZONE_WEST",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [[76.9550, 11.0080], [76.9515, 11.0170], [76.9480, 11.0260]]
        })
    },
    {
        "road_segment_id": "RD_METTUPALAYAM_02",
        "name": "Mettupalayam Road: Saibaba Colony to Thudiyalur Junction",
        "road_class": "primary",
        "speed_limit_kmh": 55.0,
        "free_flow_speed_kmh": 48.0,
        "length_meters": 4100.0,
        "lanes": 4,
        "ward_id": "WARD_064",
        "zone_id": "ZONE_WEST",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [[76.9480, 11.0260], [76.9450, 11.0450], [76.9410, 11.0650]]
        })
    },

    # Palakkad Road / Ukkadam Corridor
    {
        "road_segment_id": "RD_PALAKKAD_01",
        "name": "Palakkad Road: Town Hall to Ukkadam Junction",
        "road_class": "primary",
        "speed_limit_kmh": 45.0,
        "free_flow_speed_kmh": 36.0,
        "length_meters": 1800.0,
        "lanes": 4,
        "ward_id": "WARD_086",
        "zone_id": "ZONE_SOUTH",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [[76.9650, 11.0000], [76.9630, 10.9960], [76.9608, 10.9925]]
        })
    },
    {
        "road_segment_id": "RD_PALAKKAD_02",
        "name": "Palakkad Road: Ukkadam to Kuniyamuthur",
        "road_class": "primary",
        "speed_limit_kmh": 50.0,
        "free_flow_speed_kmh": 42.0,
        "length_meters": 3200.0,
        "lanes": 4,
        "ward_id": "WARD_086",
        "zone_id": "ZONE_SOUTH",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [[76.9608, 10.9925], [76.9520, 10.9780], [76.9430, 10.9650]]
        })
    },

    # Marudhamalai Road (Vadavalli)
    {
        "road_segment_id": "RD_MARUDHAMALAI_01",
        "name": "Marudhamalai Road: Lawley Road to Vadavalli",
        "road_class": "secondary",
        "speed_limit_kmh": 45.0,
        "free_flow_speed_kmh": 38.0,
        "length_meters": 3600.0,
        "lanes": 2,
        "ward_id": "WARD_072",
        "zone_id": "ZONE_WEST",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [[76.9380, 11.0150], [76.9215, 11.0200], [76.9050, 11.0250]]
        })
    },

    # Race Course Ring Road
    {
        "road_segment_id": "RD_RACECOURSE_01",
        "name": "Race Course Promenade Ring Road",
        "road_class": "tertiary",
        "speed_limit_kmh": 40.0,
        "free_flow_speed_kmh": 35.0,
        "length_meters": 2400.0,
        "lanes": 2,
        "ward_id": "WARD_045",
        "zone_id": "ZONE_CENTRAL",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [[76.9748, 11.0062], [76.9790, 11.0100], [76.9820, 11.0070], [76.9780, 11.0030], [76.9748, 11.0062]]
        })
    },
]

# Canonical Air & Weather Monitoring Stations
COIMBATORE_STATIONS = [
    {"station_id": "STN_GANDHIPURAM_AQI", "name": "Gandhipuram Commercial CAAQMS", "domain": "air", "lat": 11.0183, "lon": 76.9650, "ward_id": "WARD_042"},
    {"station_id": "STN_PEELAMEDU_AQI", "name": "Peelamedu Tech Corridor CAAQMS", "domain": "air", "lat": 11.0267, "lon": 77.0125, "ward_id": "WARD_052"},
    {"station_id": "STN_SINGANALLUR_AQI", "name": "Singanallur Industrial CAAQMS", "domain": "air", "lat": 11.0012, "lon": 77.0250, "ward_id": "WARD_058"},
    {"station_id": "STN_SARAVANAMPATTI_AQI", "name": "Saravanampatti Northern CAAQMS", "domain": "air", "lat": 11.0827, "lon": 76.9967, "ward_id": "WARD_028"},
    {"station_id": "STN_UKKADAM_AQI", "name": "Ukkadam Lake & Transit CAAQMS", "domain": "air", "lat": 10.9925, "lon": 76.9608, "ward_id": "WARD_086"},
    {"station_id": "STN_RSPURAM_AQI", "name": "RS Puram Residential CAAQMS", "domain": "air", "lat": 11.0086, "lon": 76.9453, "ward_id": "WARD_064"},
    {"station_id": "STN_COIMBATORE_MET", "name": "Coimbatore IMD / Peelamedu Met Station", "domain": "weather", "lat": 11.0300, "lon": 77.0300, "ward_id": "WARD_052"},
]
