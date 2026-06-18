# camera.py — OpenCV frame splitting + JPEG encoding.
#
# The dashcam.mp4 file is a 2×2 quad-grid recording four camera channels
# simultaneously. Each frame is sliced into four named quadrants so the
# detector and tracker can process each channel independently.

import base64
import cv2
import numpy as np


def split_frame(frame: np.ndarray) -> dict:
    """Return a dict of four zone-name → sub-frame slices.

    Zone keys match the frontend's SimulationContext zone strings exactly:
        "front"       — top-left  quadrant
        "rear"        — top-right quadrant
        "left_blind"  — bottom-right quadrant
        "right_blind" — bottom-left  quadrant
    """
    h, w = frame.shape[:2]
    mid_h, mid_w = h // 2, w // 2

    return {
        "front":       frame[0:mid_h,  0:mid_w],
        "rear":        frame[0:mid_h,  mid_w:w],
        "left_blind":  frame[mid_h:h,  mid_w:w],
        "right_blind": frame[mid_h:h,  0:mid_w],
    }


def encode_frame(frame: np.ndarray, quality: int = 60) -> str:
    """Encode a numpy frame to a base64 JPEG string.

    Parameters
    ----------
    frame   : HxWx3 BGR numpy array (as returned by OpenCV).
    quality : JPEG quality 0-100 (lower = smaller payload, faster WS transfer).
              55 keeps each quadrant at ~15-40 KB at typical dashcam resolutions.

    Returns
    -------
    str : base64-encoded JPEG, safe to embed in JSON as
          ``"data:image/jpeg;base64,<return_value>"``.
    """
    encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality]
    _, buffer = cv2.imencode('.jpg', frame, encode_params)
    return base64.b64encode(buffer).decode('utf-8')

