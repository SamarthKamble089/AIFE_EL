import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

/**
 * SimulationContext
 * -----------------
 * Two-mode telemetry source:
 *
 *   1. SIMULATED    — internal interval ticks at TARGET_FPS, emits synthetic
 *                     YOLOv8-shaped frames. Used for UI development with no
 *                     backend running.
 *   2. LIVE BACKEND — opens a WebSocket to `ws://localhost:8765` (or any URL
 *                     passed to `connectToBackend(url)`) and routes inbound
 *                     JSON packets directly into context state. The internal
 *                     simulator is silenced while live mode is engaged.
 *
 * Expected wire format from the Python/OpenCV/YOLOv8 publisher
 * (any field besides `objects` is optional — defaults are derived):
 *
 *   {
 *     frameId:   <int, used to detect dropped frames>,
 *     timestamp: <epoch ms>,
 *     objects:   [{ id, class, confidence, box:[x,y,w,h], zone,
 *                   persistenceFrames }, ...],
 *     risk:      "SAFE" | "WARNING" | "HIGH RISK",
 *     analytics: { fps, nodeStatus, alerts }
 *   }
 *
 * The provider also exposes:
 *   - `currentCameraStream` (0=LEFT MIRROR, 1=RIGHT MIRROR, 2=REAR VIEW)
 *   - `setCameraStream(idx)` which raises a transient `streamSwitching` flag
 *     so the LiveFeedPanel can flash a "STREAM CONNECTING…" overlay during
 *     handoff between physical camera channels.
 */

const SimulationContext = createContext(null);

const TARGET_FPS = 30;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

const OBJECT_CLASSES = ['car', 'truck', 'bus', 'motorcycle', 'pedestrian'];
const ZONES = ['left_blind', 'right_blind', 'clear'];

const FRAME_WIDTH = 1920;
const FRAME_HEIGHT = 1080;

const VULNERABLE_CLASSES = new Set(['pedestrian', 'motorcycle']);

const DEFAULT_WS_URL = 'ws://localhost:8765';
const STREAM_SWITCH_MS = 850;

export const CAMERA_STREAMS = [
  { id: 0, code: 'CH1', name: 'LEFT MIRROR' },
  { id: 1, code: 'CH2', name: 'RIGHT MIRROR' },
  { id: 2, code: 'CH3', name: 'REAR VIEW' },
];

// ───────────────────── helpers ─────────────────────

function clampConfidence(c) {
  return Math.max(0, Math.min(1, c));
}

function makeTrackerId() {
  return Math.random().toString(16).slice(2, 8);
}

function evolveOrSpawn(prev) {
  if (prev) {
    const [x, y, w, h] = prev.box;
    return {
      ...prev,
      confidence: clampConfidence(prev.confidence + (Math.random() - 0.5) * 0.05),
      box: [
        Math.max(0, Math.min(FRAME_WIDTH - w, x + (Math.random() - 0.5) * 12)),
        Math.max(0, Math.min(FRAME_HEIGHT - h, y + (Math.random() - 0.5) * 8)),
        w,
        h,
      ],
      persistenceFrames: prev.persistenceFrames + 1,
    };
  }
  const cls = OBJECT_CLASSES[Math.floor(Math.random() * OBJECT_CLASSES.length)];
  const w = 80 + Math.random() * 220;
  const h = 80 + Math.random() * 180;
  return {
    id: makeTrackerId(),
    class: cls,
    confidence: clampConfidence(0.55 + Math.random() * 0.4),
    box: [
      Math.random() * (FRAME_WIDTH - w),
      Math.random() * (FRAME_HEIGHT - h),
      w,
      h,
    ],
    zone: ZONES[Math.floor(Math.random() * ZONES.length)],
    persistenceFrames: 1,
  };
}

function evaluateRisk(objects) {
  let risk = 'SAFE';
  for (const obj of objects) {
    if (obj.zone === 'clear') continue;
    if (VULNERABLE_CLASSES.has(obj.class)) return 'HIGH RISK';
    if (obj.confidence > 0.7) risk = 'WARNING';
  }
  return risk;
}

function deriveAlerts(objects) {
  return objects
    .filter((o) => o.zone !== 'clear' && o.confidence > 0.6)
    .map((o) => ({
      id: o.id,
      message: `${o.class.toUpperCase()} in ${o.zone.replace('_', ' ')}`,
      severity: VULNERABLE_CLASSES.has(o.class) ? 'critical' : 'warning',
      confidence: o.confidence,
    }));
}

function nominalNodeStatus(trackingCount) {
  return [
    { node: 'INFERENCE', state: 'online' },
    { node: 'TRACKER', state: trackingCount > 7 ? 'degraded' : 'online' },
    { node: 'FUSION', state: 'online' },
  ];
}

const INITIAL_FRAME = {
  frameId: 0,
  timestamp: Date.now(),
  objects: [],
  risk: 'SAFE',
  frames: null,          // null = simulation mode; object = live JPEG frames
  analytics: {
    fps: TARGET_FPS,
    trackingCount: 0,
    nodeStatus: nominalNodeStatus(0),
    alerts: [],
  },
};

// ───────────────────── provider ─────────────────────

export function SimulationProvider({ children }) {
  const [frame, setFrame] = useState(INITIAL_FRAME);
  const [isRealTimeBackend, setIsRealTimeBackend] = useState(false);
  const [backendUrl, setBackendUrl] = useState(DEFAULT_WS_URL);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // 'idle' | 'connecting' | 'online' | 'error'
  const [currentCameraStream, setCurrentCameraStream] = useState(0);
  const [streamSwitching, setStreamSwitching] = useState(false);

  // Mutable refs — keep tick + WS handlers free of stale-closure bugs.
  const tracksRef = useRef([]);
  const frameIdRef = useRef(0);
  const wsRef = useRef(null);
  const lastFrameIdRef = useRef(null);
  const droppedFramesRef = useRef(0);
  const streamSwitchTimerRef = useRef(null);

  // ─── synthetic tick ───
  const tick = useCallback(() => {
    frameIdRef.current += 1;

    let next = tracksRef.current
      .filter(() => Math.random() > 0.04)
      .map((t) => evolveOrSpawn(t));
    if (next.length < 6 && Math.random() < 0.35) next.push(evolveOrSpawn(null));
    if (next.length > 9) next = next.slice(0, 9);
    tracksRef.current = next;

    const measuredFps = TARGET_FPS + (Math.random() - 0.5) * 2.5;
    const risk = evaluateRisk(next);
    const alerts = deriveAlerts(next);

    setFrame({
      frameId: frameIdRef.current,
      timestamp: Date.now(),
      objects: next,
      risk,
      frames: null,          // no video in simulation mode
      analytics: {
        fps: Number(measuredFps.toFixed(1)),
        trackingCount: next.length,
        nodeStatus: nominalNodeStatus(next.length),
        alerts,
      },
    });
  }, []);

  // Simulation loop — paused while live backend is engaged.
  useEffect(() => {
    if (isRealTimeBackend) return;
    const id = setInterval(tick, FRAME_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tick, isRealTimeBackend]);

  // ─── websocket lifecycle ───
  useEffect(() => {
    if (!isRealTimeBackend) {
      setConnectionStatus('idle');
      return;
    }

    let cancelled = false;
    setConnectionStatus('connecting');
    console.log(`[WS] opening ${backendUrl}`);

    let ws;
    try {
      ws = new WebSocket(backendUrl);
    } catch (err) {
      console.error('[WS] constructor threw:', err);
      setConnectionStatus('error');
      return;
    }

    ws.addEventListener('open', () => {
      if (cancelled) { ws.close(); return; }
      wsRef.current = ws;
      console.log(`[WS] connected to ${backendUrl}`);
      setConnectionStatus('online');
      droppedFramesRef.current = 0;
      lastFrameIdRef.current = null;
    });

    ws.addEventListener('message', (evt) => {
      try {
        const payload = JSON.parse(evt.data);

        const incomingFrameId =
          typeof payload.frameId === 'number'
            ? payload.frameId
            : (lastFrameIdRef.current ?? 0) + 1;

        if (
          lastFrameIdRef.current !== null &&
          incomingFrameId > lastFrameIdRef.current + 1
        ) {
          const dropped = incomingFrameId - lastFrameIdRef.current - 1;
          droppedFramesRef.current += dropped;
        }
        lastFrameIdRef.current = incomingFrameId;

        const objects = Array.isArray(payload.objects) ? payload.objects : [];
        const risk = payload.risk ?? evaluateRisk(objects);
        const frames = payload.frames ?? null;
        const fps =
          typeof payload.analytics?.fps === 'number'
            ? payload.analytics.fps
            : TARGET_FPS;
        const nodeStatus =
          payload.analytics?.nodeStatus ?? nominalNodeStatus(objects.length);
        const alerts = payload.analytics?.alerts ?? deriveAlerts(objects);

        setFrame({
          frameId: incomingFrameId,
          timestamp: payload.timestamp ?? Date.now(),
          objects,
          risk,
          frames,
          analytics: { fps, trackingCount: objects.length, nodeStatus, alerts },
        });
      } catch (err) {
        console.error('[WS] message processing error:', err);
      }
    });

    ws.addEventListener('error', () => {
      setConnectionStatus('error');
    });

    ws.addEventListener('close', (e) => {
      console.warn(`[WS] socket closed (code ${e.code})`);
      if (!cancelled) setConnectionStatus('error');
    });

    // ── THE FIX: close the local `ws` variable directly, not wsRef.current.
    // wsRef.current is only set inside the 'open' handler, so if React
    // StrictMode re-runs this effect before the socket opens, wsRef.current
    // is still null and the old socket would leak — causing two sockets to
    // fight each other and produce LINK ERR.
    return () => {
      cancelled = true;
      ws.close(1000, 'effect cleanup');
      wsRef.current = null;
    };
  }, [isRealTimeBackend, backendUrl]);

  // ─── public actions ───

  const connectToBackend = useCallback((url) => {
    const target = url ?? DEFAULT_WS_URL;
    setBackendUrl(target);
    setIsRealTimeBackend(true);
  }, []);

  const disconnectBackend = useCallback(() => {
    setIsRealTimeBackend(false);
  }, []);

  const setCameraStream = useCallback((idx) => {
    const target = CAMERA_STREAMS[idx];
    if (!target) return;
    setCurrentCameraStream(idx);
    setStreamSwitching(true);
    if (streamSwitchTimerRef.current) clearTimeout(streamSwitchTimerRef.current);
    streamSwitchTimerRef.current = setTimeout(
      () => setStreamSwitching(false),
      STREAM_SWITCH_MS,
    );
  }, []);

  useEffect(() => {
    return () => {
      if (streamSwitchTimerRef.current) clearTimeout(streamSwitchTimerRef.current);
    };
  }, []);

  const value = {
    ...frame,
    isRealTimeBackend,
    setIsRealTimeBackend,
    connectToBackend,
    disconnectBackend,
    backendUrl,
    connectionStatus,
    currentCameraStream,
    setCameraStream,
    cameraStreams: CAMERA_STREAMS,
    streamSwitching,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error('useSimulation must be used within a <SimulationProvider>');
  }
  return ctx;
}

export { TARGET_FPS, FRAME_WIDTH, FRAME_HEIGHT, OBJECT_CLASSES, ZONES };
