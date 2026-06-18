# main.py — Backend entry point.
#
# Run from inside the backend/ folder:
#   cd "AIFE EL/backend"
#   python main.py
#
# On first run YOLOv8n is auto-downloaded (~6 MB).
# The WebSocket server accepts one client at a time (the React frontend).
# Video loops continuously when it reaches the end.

from __future__ import annotations

import sys
import asyncio
import json
import time

# Force line-buffered stdout so print() output appears immediately even when
# stdout is not a TTY (e.g. when captured by a parent process or IDE).
sys.stdout.reconfigure(line_buffering=True)

import cv2
import websockets

from config import TARGET_FPS, VIDEO_SOURCE, WS_HOST, WS_PORT
from camera import split_frame, encode_frame
from detector import Detector
from tracker import MultiTracker
from risk_evaluator import get_proximity, get_severity, get_risk_level

# ── Module-level singletons (initialised once, shared across connections) ──────
detector = Detector()
multi_tracker = MultiTracker()


# ─────────────────────────────────────────────────────────────────────────────
# Per-connection detection loop
# ─────────────────────────────────────────────────────────────────────────────

async def detection_loop(websocket) -> None:
    """Main pipeline: read → split → detect → track → score → send."""

    print(f"[MAIN] Frontend connected: {websocket.remote_address}")

    cap = cv2.VideoCapture(VIDEO_SOURCE)
    if not cap.isOpened():
        print(f"[MAIN] ERROR: Cannot open video source: {VIDEO_SOURCE}")
        return

    frame_id = 0
    fps_timer = time.perf_counter()
    frame_interval = 1.0 / TARGET_FPS

    try:
        while True:
            loop_start = time.perf_counter()

            # ── 1. Read frame (loop video) ─────────────────────────────────
            ret, frame = cap.read()
            if not ret:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = cap.read()
                if not ret:
                    print("[MAIN] ERROR: Cannot read from video even after reset.")
                    break

            # ── 2. Split 2×2 quad-grid into four zone frames ───────────────
            quadrants = split_frame(frame)

            # ── 2b. Encode each quadrant as JPEG base64 for the frontend ──────
            encoded_frames = {
                zone: encode_frame(quad, quality=55)
                for zone, quad in quadrants.items()
            }

            # ── 3. Detect + track each zone ────────────────────────────────
            all_objects: list[dict] = []

            for zone, quad_frame in quadrants.items():
                quad_h, quad_w = quad_frame.shape[:2]

                detections = detector.run(quad_frame)
                tracked_objs = multi_tracker.update(zone, detections, quad_frame)

                for obj in tracked_objs:
                    proximity = get_proximity(obj["bbox_xyxy"], quad_w, quad_h)
                    severity = get_severity(
                        zone,
                        obj["class"],
                        obj["confidence"],
                        proximity,
                    )

                    x1, y1, x2, y2 = obj["bbox_xyxy"]
                    all_objects.append({
                        "id":               obj["id"],
                        "class":            obj["class"],
                        "confidence":       round(obj["confidence"], 2),
                        # Frontend expects [x, y, w, h] (top-left + size)
                        "box":              [int(x1), int(y1), int(x2 - x1), int(y2 - y1)],
                        "zone":             zone,
                        "persistenceFrames": obj["persistence"],
                        "severity":         severity,
                    })

            # ── 4. Risk aggregation ────────────────────────────────────────
            risk = get_risk_level(all_objects)

            # ── 5. FPS measurement ─────────────────────────────────────────
            now = time.perf_counter()
            elapsed = now - fps_timer
            fps_timer = now
            measured_fps = round(1.0 / max(elapsed, 1e-6), 1)

            # ── 6. Build alert list (warnings + criticals only) ────────────
            alerts = [
                {
                    "id":         o["id"],
                    "message":    f"{o['class'].upper()} in {o['zone'].replace('_', ' ')}",
                    "severity":   o["severity"],
                    "confidence": o["confidence"],
                }
                for o in all_objects
                if o["severity"] in ("critical", "warning")
            ]

            # ── 7. Build JSON payload (field names MUST match frontend) ────
            payload = {
                "frameId":   frame_id,
                "timestamp": int(time.time() * 1000),
                "objects":   all_objects,
                "risk":      risk,
                # Base64 JPEG frames — one per camera zone.
                # Frontend reads these as: data:image/jpeg;base64,<value>
                "frames": {
                    "front":       encoded_frames["front"],
                    "rear":        encoded_frames["rear"],
                    "left_blind":  encoded_frames["left_blind"],
                    "right_blind": encoded_frames["right_blind"],
                },
                "analytics": {
                    "fps":          measured_fps,
                    "trackingCount": len(all_objects),
                    "nodeStatus": [
                        {"node": "INFERENCE", "state": "online"},
                        {"node": "TRACKER",   "state": "online"},
                        {"node": "FUSION",    "state": "online"},
                    ],
                    "alerts": alerts,
                },
            }

            # ── 8. Send ────────────────────────────────────────────────────
            try:
                await websocket.send(json.dumps(payload))
            except (websockets.exceptions.ConnectionClosed, Exception) as exc:
                print(f"[WS] Client disconnected ({exc})")
                break

            # ── 9. Console heartbeat every 30 frames ──────────────────────
            frame_id += 1
            if frame_id % 30 == 0:
                print(
                    f"[MAIN] F#{frame_id:06d} | objects={len(all_objects):02d} "
                    f"| risk={risk:<9s} | fps={measured_fps:.1f}"
                )

            # ── 10. Rate-limit to TARGET_FPS ──────────────────────────────
            processing_time = time.perf_counter() - loop_start
            sleep_time = frame_interval - processing_time
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)

    finally:
        cap.release()
        print("[MAIN] Video capture released.")


# ─────────────────────────────────────────────────────────────────────────────
# Server entry point
# ─────────────────────────────────────────────────────────────────────────────

async def main() -> None:
    print(f"[MAIN] AI Blind-Spot Backend starting …")
    print(f"[MAIN] Video source : {VIDEO_SOURCE}")
    print(f"[MAIN] WebSocket    : ws://{WS_HOST}:{WS_PORT}")
    print(f"[MAIN] Target FPS   : {TARGET_FPS}")

    async with websockets.serve(detection_loop, WS_HOST, WS_PORT):
        print("[MAIN] Ready — switch the React dashboard to 'Live Backend'")
        await asyncio.Future()   # run until KeyboardInterrupt


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[MAIN] Shutdown requested — bye.")
