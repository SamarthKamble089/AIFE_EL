import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useSimulation } from '../../contexts/SimulationContext';

const NOMINAL_FPS_FLOOR = 27;

function dotClass(state) {
  switch (state) {
    case 'alert': return 'bg-red-500 shadow-[0_0_12px_2px_rgba(248,113,113,0.8)]';
    case 'warning': return 'bg-yellow-400 shadow-[0_0_12px_1px_rgba(250,204,21,0.7)]';
    case 'degraded': return 'bg-yellow-400 shadow-[0_0_12px_1px_rgba(250,204,21,0.6)]';
    case 'offline': return 'bg-slate-600';
    default: return 'bg-[#00f5ff] shadow-[0_0_12px_1px_rgba(0,245,255,0.8)]';
  }
}

function borderClass(state) {
  switch (state) {
    case 'alert': return 'border-red-500/70';
    case 'warning':
    case 'degraded': return 'border-yellow-500/60';
    case 'offline': return 'border-slate-700';
    default: return 'border-[#00f5ff]/40';
  }
}

function textClass(state) {
  switch (state) {
    case 'alert': return 'text-red-300';
    case 'warning':
    case 'degraded': return 'text-yellow-200';
    case 'offline': return 'text-slate-500';
    default: return 'text-[#00f5ff]';
  }
}

function PipelineNode({ node }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 }
      }}
      className={`relative flex-1 flex flex-col items-center justify-center border ${borderClass(node.state)} bg-white/[0.02] backdrop-blur-sm p-6 lg:p-8 rounded-lg shadow-lg min-h-[140px]`}
      animate={
        node.state === 'alert'
          ? { boxShadow: ['0 0 0px rgba(248,113,113,0)', '0 0 24px rgba(248,113,113,0.4)', '0 0 0px rgba(248,113,113,0)'] }
          : { boxShadow: '0 0 0px rgba(0,0,0,0)' }
      }
      transition={
        node.state === 'alert' ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.25 }
      }
    >
      <div className="flex items-center gap-3 mb-2">
        <span className={`w-2.5 h-2.5 rounded-full ${dotClass(node.state)}`} />
        <span className="text-[13px] lg:text-[15px] tracking-[0.2em] text-white font-bold uppercase text-center">
          {node.label}
        </span>
      </div>
      <div className={`text-[11px] lg:text-[13px] tracking-widest ${textClass(node.state)} font-mono text-center`}>
        {node.telemetry}
      </div>
    </motion.div>
  );
}

function Arrow({ active }) {
  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
      }}
      className="hidden md:flex items-center justify-center w-8 lg:w-16 shrink-0"
    >
      <svg viewBox="0 0 24 12" className="w-full h-4">
        <line x1="0" y1="6" x2="18" y2="6" stroke={active ? '#00f5ff' : '#334155'} strokeWidth="2" />
        <polygon points="18,2 24,6 18,10" fill={active ? '#00f5ff' : '#334155'} />
      </svg>
    </motion.div>
  );
}

export default function PipelineSection() {
  const { analytics, risk } = useSimulation();

  const nodes = useMemo(() => {
    const byName = Object.fromEntries((analytics?.nodeStatus || []).map((n) => [n.node, n.state]));

    const cameraState = analytics?.fps >= NOMINAL_FPS_FLOOR ? 'online' : 'degraded';
    const opencvState = byName.INFERENCE ?? 'online';
    const yoloState = byName.INFERENCE ?? 'online';
    const riskState = byName.FUSION ?? 'online';
    const alertState = risk === 'HIGH RISK' ? 'alert' : risk === 'WARNING' ? 'warning' : 'online';

    return [
      { key: 'cam', label: 'CAMERA', state: cameraState, telemetry: `1920×1080 · ${analytics?.fps?.toFixed(1) || 0} Hz` },
      { key: 'cv', label: 'OPENCV', state: opencvState, telemetry: 'Format: RGB24' },
      { key: 'yolo', label: 'YOLOv8', state: yoloState, telemetry: 'Model: Nano v8' },
      { key: 'risk', label: 'RISK LOGIC', state: riskState, telemetry: 'Policy: Active' },
      {
        key: 'alert',
        label: 'ALERT ENGINE',
        state: alertState,
        telemetry: alertState === 'alert' ? `${analytics?.alerts?.length || 0} CRITICAL` : alertState === 'warning' ? `${analytics?.alerts?.length || 0} WARN` : 'STANDBY',
      },
    ];
  }, [analytics, risk]);

  return (
    <section id="pipeline" className="relative min-h-screen w-full bg-[#050505] py-24 px-4 sm:px-8 lg:px-16 flex flex-col justify-center border-t border-white/5">
      <div className="max-w-7xl mx-auto w-full flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <div className="text-[#00f5ff] font-mono text-[12px] tracking-[0.3em] mb-4">
            AI INFERENCE PIPELINE
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white">
            Real-time processing architecture
          </h2>
        </motion.div>

        <motion.div 
          className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-0 w-full"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          {nodes.map((n, idx) => (
            <React.Fragment key={n.key}>
              <PipelineNode node={n} />
              {idx < nodes.length - 1 && (
                <Arrow active={n.state === 'online' && nodes[idx + 1].state !== 'offline'} />
              )}
            </React.Fragment>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
