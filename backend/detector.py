# detector.py — YOLOv8 inference wrapper.
#
# Loads the model once and exposes a single `run(frame)` method that
# returns a list of raw detections filtered to our 5 target COCO classes.
# The output format is chosen to feed directly into supervision's ByteTrack.

from __future__ import annotations

import numpy as np
from ultralytics import YOLO
import supervision as sv

from config import MODEL_PATH, CONFIDENCE_THRESHOLD, TARGET_CLASSES


class Detector:
    """Single shared YOLOv8 inference engine."""

    def __init__(self) -> None:
        print(f"[DETECTOR] Loading model: {MODEL_PATH}")
        self.model = YOLO(MODEL_PATH)
        self.target_ids = set(TARGET_CLASSES.keys())
        print("[DETECTOR] Model ready.")

    def run(self, frame: np.ndarray) -> sv.Detections:
        """Run inference on one quadrant frame.

        Returns a supervision Detections object (possibly empty) whose
        class_id values are mapped to our TARGET_CLASSES dict, and whose
        confidence values pass CONFIDENCE_THRESHOLD.
        """
        results = self.model(
            frame,
            conf=CONFIDENCE_THRESHOLD,
            verbose=False,
        )[0]

        detections = sv.Detections.from_ultralytics(results)

        if len(detections) == 0:
            return detections

        # Keep only the 5 COCO classes we care about.
        mask = np.isin(detections.class_id, list(self.target_ids))
        return detections[mask]
