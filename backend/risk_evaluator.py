# risk_evaluator.py — Proximity scoring and severity classification.
#
# All logic here is pure functions — no state, no imports from other modules.
# Results feed directly into the WebSocket payload builder in main.py.


def get_proximity(bbox_xyxy: tuple, quad_w: int, quad_h: int) -> float:
    """Return fractional area of the bounding box relative to its quadrant.

    A higher proximity value means the object is larger (closer) in the frame.

    Parameters
    ----------
    bbox_xyxy : (x1, y1, x2, y2)
    quad_w, quad_h : width/height of the quadrant the detection came from.

    Returns
    -------
    float in [0.0, 1.0]
    """
    x1, y1, x2, y2 = bbox_xyxy
    bbox_area = max(0, x2 - x1) * max(0, y2 - y1)
    quad_area = max(1, quad_w * quad_h)   # guard against div-by-zero
    return round(bbox_area / quad_area, 4)


def get_severity(
    zone: str,
    obj_class: str,
    confidence: float,
    proximity: float,
) -> str:
    """Classify one detection as 'critical', 'warning', or 'normal'.

    Blind-zone rules (stricter — operator can't see these areas directly):
      - Pedestrians and motorcycles are always critical when in a blind zone.
      - Any object occupying > 12% of the frame area → critical.
      - Any object occupying > 4% of the frame area → warning.
      - Low-confidence detections → warning.

    Forward / rear rules (operator can see these areas):
      - Object occupying > 20% → critical (imminent collision threat).
      - Object occupying > 8%  → warning.
      - Otherwise             → normal.
    """
    vulnerable = obj_class in ("pedestrian", "motorcycle")

    if zone in ("left_blind", "right_blind"):
        if vulnerable:
            return "critical"
        if proximity > 0.12:
            return "critical"
        if proximity > 0.04:
            return "warning"
        return "warning" if confidence > 0.6 else "normal"

    if zone in ("front", "rear"):
        if proximity > 0.20:
            return "critical"
        if proximity > 0.08:
            return "warning"
        return "normal"

    return "normal"


def get_risk_level(objects: list[dict]) -> str:
    """Return the highest system-level risk across all current detections.

    Returns one of: "SAFE" | "WARNING" | "HIGH RISK"
    These strings must match exactly what SimulationContext.jsx expects.
    """
    severities = {o["severity"] for o in objects}
    if "critical" in severities:
        return "HIGH RISK"
    if "warning" in severities:
        return "WARNING"
    return "SAFE"
