# zone_mapper.py — (Optional utility, reserved for future multi-camera routing)
#
# Currently the camera.py split_frame() function performs all zone-to-quadrant
# mapping. This module is a placeholder for future extension, e.g. mapping
# real USB cameras to zone names when running with live hardware instead of
# the quad-grid dashcam.mp4.

ZONE_NAMES = ("front", "rear", "left_blind", "right_blind")

def is_blind_zone(zone: str) -> bool:
    return zone in ("left_blind", "right_blind")

def zone_display_name(zone: str) -> str:
    """Human-readable zone name used in alert messages."""
    return zone.replace("_", " ")
