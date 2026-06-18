# tracker.py — Per-zone ByteTrack wrapper with persistence counters.
#
# One sv.ByteTrack instance per camera zone so tracks never bleed across
# quadrant boundaries (a car in the rear view must not receive the same ID
# as a different car in the left-blind view).

from __future__ import annotations

import supervision as sv
import numpy as np

from config import TARGET_CLASSES, TRACK_LOSS_FRAMES


class ZoneTracker:
    """Wraps sv.ByteTrack for a single camera zone.

    Attributes
    ----------
    zone : str
        Zone key, e.g. "left_blind".
    tracker : sv.ByteTrack
        Underlying ByteTracker.
    persistence : dict[int, int]
        Raw tracker_id → frame count since first seen (resets on re-entry
        after TRACK_LOSS_FRAMES absence).
    last_seen : dict[int, int]
        Raw tracker_id → global frame number of most recent sighting.
    _frame : int
        Current global frame counter (incremented by MultiTracker.update).
    """

    def __init__(self, zone: str) -> None:
        self.zone = zone
        self.tracker = sv.ByteTrack()
        self.persistence: dict[int, int] = {}
        self.last_seen: dict[int, int] = {}
        self._frame = 0

    def update(
        self, detections: sv.Detections, frame: np.ndarray
    ) -> list[dict]:
        """Update tracker state and return enriched detection dicts."""
        self._frame += 1

        tracked = self.tracker.update_with_detections(detections)

        results: list[dict] = []
        for i, tid in enumerate(tracked.tracker_id):
            if tid is None:
                continue

            # Staleness check — reset persistence counter if track was lost.
            last = self.last_seen.get(tid, -TRACK_LOSS_FRAMES - 1)
            if self._frame - last > TRACK_LOSS_FRAMES:
                self.persistence[tid] = 0

            self.persistence[tid] = self.persistence.get(tid, 0) + 1
            self.last_seen[tid] = self._frame

            # Map COCO class_id → display name.
            cid = int(tracked.class_id[i])
            cls_name = TARGET_CLASSES.get(cid, f"class_{cid}")

            # Stable 6-char hex ID (tracker_id is an int from ByteTrack).
            hex_id = format(int(tid) & 0xFFFFFF, "06x")

            x1, y1, x2, y2 = tracked.xyxy[i].astype(int)
            conf = float(tracked.confidence[i]) if tracked.confidence is not None else 0.0

            results.append({
                "id": hex_id,
                "class": cls_name,
                "confidence": round(conf, 2),
                "bbox_xyxy": (int(x1), int(y1), int(x2), int(y2)),
                "persistence": self.persistence[tid],
            })

        return results


class MultiTracker:
    """Four ZoneTracker instances — one per camera channel."""

    ZONES = ("front", "rear", "left_blind", "right_blind")

    def __init__(self) -> None:
        self._trackers: dict[str, ZoneTracker] = {
            z: ZoneTracker(z) for z in self.ZONES
        }
        print("[TRACKER] ByteTrack initialised for 4 zones.")

    def update(
        self,
        zone: str,
        detections: sv.Detections,
        frame: np.ndarray,
    ) -> list[dict]:
        """Update the tracker for *zone* and return enriched detection dicts."""
        return self._trackers[zone].update(detections, frame)
