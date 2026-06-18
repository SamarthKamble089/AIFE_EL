import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useSimulation } from '../../contexts/SimulationContext';

/**
 * BlindZoneMap
 * ------------
 * Top-down spatial-awareness map. Renders a geometric semi-truck silhouette
 * centered in an SVG, surrounded by four zone polygons:
 *
 *     ┌──────────────┐   ← FRONT  (clear, idle)
 *     │              │
 *  ┌──┤  ▢ cabin    ├──┐
 *  │L │  ▭ trailer   │R│  ← LEFT_BLIND / RIGHT_BLIND  (dynamic)
 *  └──┤              ├──┘
 *     │              │
 *     └──────────────┘   ← REAR  (clear, idle)
 *
 * Zone severity is derived from the live `objects` array in context:
 *   - critical : vulnerable road user (pedestrian/motorcycle) in that blind zone
 *   - warning  : any other detection in that blind zone with conf > 0.6
 *   - idle     : nothing relevant
 *
 * motion/react animates fillOpacity + stroke transitions smoothly so the map
 * pulses on critical states instead of strobing per-frame.
 */

const VULNERABLE = new Set(['pedestrian', 'motorcycle']);

const VIEW_W = 100;
const VIEW_H = 160;

// Vehicle silhouette geometry, in viewBox units. Centered horizontally.
const VEH = {
  cabinX: 35,
  cabinY: 30,
  cabinW: 30,
  cabinH: 22,
  trailerX: 33,
  trailerY: 52,
  trailerW: 34,
  trailerH: 75,
};

// Surrounding zone polygons. Each is a simple rect adjacent to the vehicle.
const ZONES = {
  front: { x: 20, y: 8, w: 60, h: 18 },
  rear: { x: 20, y: 134, w: 60, h: 18 },
  left_blind: { x: 4, y: 30, w: 27, h: 97 },
  right_blind: { x: 69, y: 30, w: 27, h: 97 },
};

const SEVERITY_VISUAL = {
  idle: {
    fill: '#475569', // slate-600
    stroke: '#334155', // slate-700
    fillOpacity: 0.06,
    strokeOpacity: 0.5,
    pulse: false,
    label: 'CLEAR',
    labelColor: '#64748b',
  },
  warning: {
    fill: '#f59e0b', // amber-500
    stroke: '#f59e0b',
    fillOpacity: 0.18,
    strokeOpacity: 0.85,
    pulse: false,
    label: 'WARNING',
    labelColor: '#fcd34d',
  },
  critical: {
    fill: '#ef4444', // red-500
    stroke: '#ef4444',
    fillOpacity: 0.28,
    strokeOpacity: 1,
    pulse: true,
    label: 'CRITICAL',
    labelColor: '#fca5a5',
  },
};

function deriveZoneSeverity(objects, zoneKey) {
  // front / rear aren't modelled by the simulator → always idle.
  if (zoneKey === 'front' || zoneKey === 'rear') return 'idle';

  let severity = 'idle';
  for (const o of objects) {
    if (o.zone !== zoneKey) continue;
    if (VULNERABLE.has(o.class)) return 'critical';
    if (o.confidence > 0.6) severity = 'warning';
  }
  return severity;
}

function ZoneRect({ rect, severity, labelAnchor }) {
  const visual = SEVERITY_VISUAL[severity];

  // Critical state pulses fill opacity in a slow breathing loop.
  // Non-critical states animate smoothly to a steady value.
  const animateProps = visual.pulse
    ? {
        fillOpacity: [visual.fillOpacity, visual.fillOpacity + 0.18, visual.fillOpacity],
        strokeOpacity: [visual.strokeOpacity, 1, visual.strokeOpacity],
      }
    : {
        fillOpacity: visual.fillOpacity,
        strokeOpacity: visual.strokeOpacity,
      };

  const transitionProps = visual.pulse
    ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
    : { duration: 0.35, ease: 'easeOut' };

  return (
    <g>
      <motion.rect
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        fill={visual.fill}
        stroke={visual.stroke}
        strokeWidth={severity === 'critical' ? 0.7 : 0.4}
        strokeDasharray={severity === 'idle' ? '1.2 1.2' : undefined}
        animate={animateProps}
        transition={transitionProps}
        vectorEffect="non-scaling-stroke"
      />
      {/* Zone label rendered inside the rect, anchored per zone. */}
      <text
        x={labelAnchor.x}
        y={labelAnchor.y}
        textAnchor={labelAnchor.anchor}
        fontSize={3}
        letterSpacing={0.6}
        fontFamily="ui-monospace, monospace"
        fill={visual.labelColor}
      >
        {labelAnchor.title} · {visual.label}
      </text>
    </g>
  );
}

export default function BlindZoneMap() {
  const { objects } = useSimulation();

  const zoneSeverity = useMemo(
    () => ({
      front: deriveZoneSeverity(objects, 'front'),
      rear: deriveZoneSeverity(objects, 'rear'),
      left_blind: deriveZoneSeverity(objects, 'left_blind'),
      right_blind: deriveZoneSeverity(objects, 'right_blind'),
    }),
    [objects],
  );

  // Detections positioned inside the map for spatial intuition. We bin them
  // to the centroid of their zone rect — the source frame's pixel-x doesn't
  // map meaningfully onto a bird's-eye view, so a stylized centroid is
  // the honest representation given the simulator's fidelity.
  const dots = useMemo(() => {
    const out = [];
    for (const o of objects) {
      if (o.zone === 'clear') continue;
      const r = ZONES[o.zone];
      if (!r) continue;
      // Distribute multiple dots vertically within the zone for visibility.
      const idx = out.filter((d) => d.zone === o.zone).length;
      out.push({
        id: o.id,
        zone: o.zone,
        cx: r.x + r.w / 2 + (idx % 2 === 0 ? -4 : 4),
        cy: r.y + 10 + idx * 9,
        critical: VULNERABLE.has(o.class),
        cls: o.class,
      });
    }
    return out;
  }, [objects]);

  return (
    <div className="relative h-full w-full bg-slate-950 p-2">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
      >
        {/* Compass / heading indicator at the top of the map. */}
        <g>
          <text
            x={VIEW_W / 2}
            y={5}
            textAnchor="middle"
            fontSize={3.5}
            letterSpacing={1}
            fontFamily="ui-monospace, monospace"
            fill="#64748b"
          >
            ▲ HEADING · FWD
          </text>
        </g>

        {/* Zone rectangles. */}
        <ZoneRect
          rect={ZONES.front}
          severity={zoneSeverity.front}
          labelAnchor={{ x: VIEW_W / 2, y: 19, anchor: 'middle', title: 'FRONT' }}
        />
        <ZoneRect
          rect={ZONES.rear}
          severity={zoneSeverity.rear}
          labelAnchor={{ x: VIEW_W / 2, y: 145, anchor: 'middle', title: 'REAR' }}
        />
        <ZoneRect
          rect={ZONES.left_blind}
          severity={zoneSeverity.left_blind}
          labelAnchor={{ x: 6, y: 34, anchor: 'start', title: 'L-BLIND' }}
        />
        <ZoneRect
          rect={ZONES.right_blind}
          severity={zoneSeverity.right_blind}
          labelAnchor={{ x: 94, y: 34, anchor: 'end', title: 'R-BLIND' }}
        />

        {/* Vehicle chassis — cabin + trailer + wheel marks. */}
        <g>
          {/* trailer */}
          <rect
            x={VEH.trailerX}
            y={VEH.trailerY}
            width={VEH.trailerW}
            height={VEH.trailerH}
            fill="#0f172a"
            stroke="#22d3ee"
            strokeWidth={0.6}
            vectorEffect="non-scaling-stroke"
          />
          {/* trailer center-line markings */}
          <line
            x1={VIEW_W / 2}
            y1={VEH.trailerY + 4}
            x2={VIEW_W / 2}
            y2={VEH.trailerY + VEH.trailerH - 4}
            stroke="#22d3ee"
            strokeOpacity={0.2}
            strokeDasharray="1.5 2"
            strokeWidth={0.4}
            vectorEffect="non-scaling-stroke"
          />
          {/* cabin */}
          <rect
            x={VEH.cabinX}
            y={VEH.cabinY}
            width={VEH.cabinW}
            height={VEH.cabinH}
            fill="#0f172a"
            stroke="#22d3ee"
            strokeWidth={0.7}
            vectorEffect="non-scaling-stroke"
          />
          {/* windshield indicator on cabin */}
          <line
            x1={VEH.cabinX + 4}
            y1={VEH.cabinY + 4}
            x2={VEH.cabinX + VEH.cabinW - 4}
            y2={VEH.cabinY + 4}
            stroke="#22d3ee"
            strokeOpacity={0.6}
            strokeWidth={0.6}
            vectorEffect="non-scaling-stroke"
          />
          {/* wheels — small dark marks along each side */}
          {[
            // [x, y]
            [VEH.cabinX - 1.6, VEH.cabinY + 14],
            [VEH.cabinX + VEH.cabinW - 0.2, VEH.cabinY + 14],
            [VEH.trailerX - 1.6, VEH.trailerY + 14],
            [VEH.trailerX + VEH.trailerW - 0.2, VEH.trailerY + 14],
            [VEH.trailerX - 1.6, VEH.trailerY + VEH.trailerH - 18],
            [VEH.trailerX + VEH.trailerW - 0.2, VEH.trailerY + VEH.trailerH - 18],
            [VEH.trailerX - 1.6, VEH.trailerY + VEH.trailerH - 8],
            [VEH.trailerX + VEH.trailerW - 0.2, VEH.trailerY + VEH.trailerH - 8],
          ].map(([wx, wy], i) => (
            <rect
              key={i}
              x={wx}
              y={wy}
              width={1.8}
              height={4}
              fill="#1e293b"
              stroke="#22d3ee"
              strokeWidth={0.3}
              strokeOpacity={0.7}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        {/* Detection dots inside zones. */}
        {dots.map((d) => (
          <g key={d.id}>
            <motion.circle
              cx={d.cx}
              cy={d.cy}
              r={d.critical ? 1.6 : 1.2}
              fill={d.critical ? '#f87171' : '#facc15'}
              stroke={d.critical ? '#fecaca' : '#fef3c7'}
              strokeWidth={0.3}
              animate={
                d.critical
                  ? { opacity: [0.7, 1, 0.7], scale: [0.875, 1.25, 0.875] }
                  : { opacity: 1, scale: 1 }
              }
              transition={
                d.critical
                  ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.3 }
              }
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={d.cx + 2.5}
              y={d.cy + 1}
              fontSize={2.5}
              fontFamily="ui-monospace, monospace"
              fill={d.critical ? '#fecaca' : '#fde68a'}
              letterSpacing={0.3}
            >
              {d.cls.slice(0, 4).toUpperCase()}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
