# config.py — All backend settings in one place.
# Run the backend from inside the backend/ folder: python main.py

import os

# ── Video ──────────────────────────────────────────────────────────────────────
VIDEO_SOURCE = os.path.join(os.path.dirname(__file__), "dashcam.mp4")

# ── YOLOv8 model ──────────────────────────────────────────────────────────────
# "yolov8n.pt" auto-downloads from Ultralytics on first run.
MODEL_PATH = "yolov8n.pt"

# COCO class IDs → our display names.
# Only these classes are forwarded to the frontend; everything else is ignored.
TARGET_CLASSES = {
    0: "pedestrian",   # person
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}

# ── WebSocket ──────────────────────────────────────────────────────────────────
WS_HOST = "localhost"
WS_PORT = 8765

# ── Inference ─────────────────────────────────────────────────────────────────
CONFIDENCE_THRESHOLD = 0.4   # detections below this are discarded

# ── Timing ────────────────────────────────────────────────────────────────────
TARGET_FPS = 30              # max frames pushed to the frontend per second

# ── Tracker ───────────────────────────────────────────────────────────────────
# A track that disappears for more than this many frames has its persistence
# counter reset when it reappears (so the frontend shows a fresh entry).
TRACK_LOSS_FRAMES = 10
