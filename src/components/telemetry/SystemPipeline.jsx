import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useSimulation } from '../../contexts/SimulationContext';

/**
 * SystemPipeline
 * --------------
 * Horizontal flowchart showing the five-stage safety pipeline:
 *
 *   [CAMERA] → [OPENCV] → [YOLOv8] → [RISK LOGIC] → [ALERT ENGINE]
 *
 * Each stage shows:
 *   - a status indicator dot   (cyan = nominal, amber = degraded, red = alert)
 *   - the stage label
 *   - a one-line micro-telemetry caption beneath
 *
 * Indicator state is derived from live context: the upstream four stages
 * mirror analytics.nodeStatus, and the Alert Engine reflects current `risk`.
 */

const NOMINAL_FPS_FLOOR = 27;

function dotClass(state) {
  switch (state) {
    case 'alert':
      return 'bg-red-500 shadow-[0_0_8px_2px_rgba(248,113,113,0.7)]';
    case 'warning':
      return 'bg-yellow-400 shadow-[0_0_8px_1px_rgba(250,204,21,0.6)]';
    case 'degraded':
      return 'bg-yellow-400 shadow-[0_0_8px_1px_rgba(250,204,21,0.55)]';
    case 'offline':
      return 'bg-slate-600';
    default:
      return 'bg-cyan-400 shadow-[0_0_8px_1px_rgba(34,211,238,0.7)]';
  }
}

function borderClass(state) {
  switch (state) {
    case 'alert':
      return 'border-red-500/70';
    case 'warning':
    case 'degraded':
      return 'border-yellow-500/60';
    case 'offline':
      return 'border-slate-700';
    default:
      return 'border-cyan-500/40';
  }
}

function textClass(state) {
  switch (state) {
    case 'alert':
      return 'text-red-300';
    case 'warning':
    case 'degraded':
      return 'text-yellow-200';
    case 'offline':
      return 'text-slate-500';
    default:
      return 'text-cyan-200';
  }
}

function PipelineNode({ node }) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <motion.div
        className={`relative flex flex-col items-center justify-center border ${borderClass(
          node.state,
        )} bg-slate-950 px-2 py-1.5 h-full`}
        animate={
          node.state === 'alert'
            ? { boxShadow: [
                '0 0 0px rgba(248,113,113,0)',
                '0 0 14px rgba(248,113,113,0.55)',
                '0 0 0px rgba(248,113,113,0)',
              ] }
            : { boxShadow: '0 0 0px rgba(0,0,0,0)' }
        }
        transition={
          node.state === 'alert'
            ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.25 }
        }
      >
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 ${dotClass(node.state)}`} />
          <span className="text-[10px] tracking-[0.3em] text-slate-200 uppercase">
            {node.label}
          </span>
        </div>
        <div className={`mt-1 text-[9px] tracking-widest ${textClass(node.state)}`}>
          {node.telemetry}
        </div>
      </motion.div>
    </div>
  );
}

function Arrow({ active }) {
  return (
    <div className="flex items-center justify-center w-4 shrink-0">
      <svg viewBox="0 0 16 12" className="w-4 h-3">
        <line
          x1="0"
          y1="6"
          x2="11"
          y2="6"
          stroke={active ? '#22d3ee' : '#334155'}
          strokeWidth="1"
        />
        <polygon
          points="11,2 15,6 11,10"
          fill={active ? '#22d3ee' : '#334155'}
        />
      </svg>
    </div>
  );
}

export default function SystemPipeline() {
  const { analytics, risk, frameId } = useSimulation();

  // Map raw node-status records into the displayed pipeline stages. The
  // simulator emits INFERENCE / TRACKER / FUSION; CAMERA stage is synthesized
  // from FPS (nominal if FPS ≥ 27), and ALERT ENGINE from current risk.
  const nodes = useMemo(() => {
    const byName = Object.fromEntries(
      analytics.nodeStatus.map((n) => [n.node, n.state]),
    );

    const cameraState = analytics.fps >= NOMINAL_FPS_FLOOR ? 'online' : 'degraded';
    const opencvState = byName.INFERENCE ?? 'online';
    const yoloState = byName.INFERENCE ?? 'online';
    const riskState = byName.FUSION ?? 'online';
    const alertState =
      risk === 'HIGH RISK' ? 'alert' : risk === 'WARNING' ? 'warning' : 'online';

    return [
      {
        key: 'cam',
        label: 'CAMERA',
        state: cameraState,
        telemetry: `1920×1080 · ${analytics.fps.toFixed(1)} Hz`,
      },
      {
        key: 'cv',
        label: 'OPENCV',
        state: opencvState,
        telemetry: 'Format: RGB24',
      },
      {
        key: 'yolo',
        label: 'YOLOv8',
        state: yoloState,
        telemetry: 'Model: Nano v8',
      },
      {
        key: 'risk',
        label: 'RISK LOGIC',
        state: riskState,
        telemetry: 'Policy: Active',
      },
      {
        key: 'alert',
        label: 'ALERT ENGINE',
        state: alertState,
        telemetry:
          alertState === 'alert'
            ? `${analytics.alerts.length} CRITICAL`
            : alertState === 'warning'
            ? `${analytics.alerts.length} WARN`
            : 'STANDBY',
      },
    ];
  }, [analytics, risk]);

  return (
    <div className="flex flex-col h-full bg-slate-950 p-2">
      {/* Pipeline header label. */}
      <div className="flex items-center justify-between text-[9px] tracking-[0.3em] text-slate-500 uppercase pb-1">
        <span>Inference Pipeline</span>
        <span>F#{frameId.toString().padStart(6, '0')}</span>
      </div>

      {/* Pipeline row. */}
      <div className="flex flex-1 items-stretch">
        {nodes.map((n, idx) => (
          <React.Fragment key={n.key}>
            <PipelineNode node={n} />
            {idx < nodes.length - 1 && (
              <Arrow active={n.state === 'online' && nodes[idx + 1].state !== 'offline'} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
