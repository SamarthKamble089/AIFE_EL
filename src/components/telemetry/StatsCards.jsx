import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useSimulation } from '../../contexts/SimulationContext';

/**
 * StatsCards
 * ----------
 * Three industrial readout cards stacked vertically inside the bottom-right
 * panel cell:
 *
 *   1. LIVE OBJECT COUNTER   — number of currently tracked entities
 *   2. HIGHEST THREAT LEVEL  — SAFE / WARNING / HIGH RISK, severity-tinted glow
 *   3. MODEL LATENCY         — derived from measured FPS, jittered into a
 *                              realistic 8–15 ms envelope. We compute it
 *                              client-side instead of plumbing through context
 *                              because latency = 1000 / fps is a pure function
 *                              of state we already have.
 *
 * No rounded corners. No drop shadows on the cards themselves — the glow comes
 * from inset shadows + 1px accent borders, matching the rest of the chassis.
 */

const RISK_VISUAL = {
  SAFE: {
    text: 'text-cyan-300',
    border: 'border-cyan-500/60',
    glow: 'shadow-[inset_0_0_24px_-8px_rgba(34,211,238,0.55)]',
    bar: 'bg-cyan-400',
  },
  WARNING: {
    text: 'text-yellow-300',
    border: 'border-yellow-500/70',
    glow: 'shadow-[inset_0_0_28px_-8px_rgba(250,204,21,0.6)]',
    bar: 'bg-yellow-400',
  },
  'HIGH RISK': {
    text: 'text-red-400',
    border: 'border-red-500/80',
    glow: 'shadow-[inset_0_0_32px_-6px_rgba(248,113,113,0.7)]',
    bar: 'bg-red-500',
  },
};

function CardShell({ label, accent = 'cyan', children, glow }) {
  const accentBorder =
    accent === 'red'
      ? 'border-red-500/60'
      : accent === 'amber'
      ? 'border-yellow-500/60'
      : 'border-cyan-500/40';
  return (
    <section
      className={`relative flex flex-col border ${accentBorder} bg-slate-950 ${glow ?? ''} flex-1 min-h-0`}
    >
      <header className="flex items-center justify-between border-b border-slate-800 px-2 py-1 text-[9px] tracking-[0.3em] text-slate-500 uppercase">
        <span>{label}</span>
        <span className="text-slate-700">●</span>
      </header>
      <div className="flex-1 px-3 py-2 min-h-0">{children}</div>
    </section>
  );
}

export default function StatsCards() {
  const { objects, risk, analytics, frameId } = useSimulation();

  // Derive a synthetic processing-latency value in the 8–15 ms envelope.
  // Base term = 1000/fps; modulated by a low-amplitude frame-indexed sine so
  // the digit doesn't jitter at full 30 Hz, plus a tiny random component.
  const latencyMs = useMemo(() => {
    const base = 1000 / Math.max(analytics.fps, 1);
    const wobble = Math.sin(frameId / 9) * 1.6;
    const noise = (Math.random() - 0.5) * 0.4;
    return Math.max(8, Math.min(15, base + wobble + noise + 5)); // +5 ≈ post-processing budget
  }, [analytics.fps, frameId]);

  const riskVisual = RISK_VISUAL[risk] ?? RISK_VISUAL.SAFE;

  // Distribution sparkline-style horizontal bar for the object counter
  // (segments grouped by zone).
  const zoneSplit = useMemo(() => {
    const counts = { left_blind: 0, right_blind: 0, clear: 0 };
    for (const o of objects) counts[o.zone] = (counts[o.zone] ?? 0) + 1;
    return counts;
  }, [objects]);
  const total = objects.length || 1;

  return (
    <div className="flex flex-col h-full bg-slate-950 gap-px">
      {/* CARD 1 — Live Object Counter */}
      <CardShell label="Live Object Counter" accent="cyan">
        <div className="flex items-end justify-between">
          <span className="text-3xl leading-none text-cyan-300 tabular-nums">
            {objects.length.toString().padStart(2, '0')}
          </span>
          <div className="flex flex-col items-end text-[9px] text-slate-500 tracking-widest">
            <span>
              L{' '}
              <span className="text-yellow-300">
                {zoneSplit.left_blind}
              </span>
            </span>
            <span>
              R{' '}
              <span className="text-yellow-300">
                {zoneSplit.right_blind}
              </span>
            </span>
            <span>
              C <span className="text-slate-400">{zoneSplit.clear}</span>
            </span>
          </div>
        </div>
        {/* Zone-distribution bar. */}
        <div className="mt-2 flex h-1 w-full overflow-hidden bg-slate-900">
          <div
            className="h-full bg-red-500/70"
            style={{ width: `${(zoneSplit.left_blind / total) * 100}%` }}
          />
          <div
            className="h-full bg-yellow-400/70"
            style={{ width: `${(zoneSplit.right_blind / total) * 100}%` }}
          />
          <div
            className="h-full bg-cyan-500/40"
            style={{ width: `${(zoneSplit.clear / total) * 100}%` }}
          />
        </div>
      </CardShell>

      {/* CARD 2 — Highest Threat Level */}
      <CardShell
        label="Highest Threat Level"
        accent={risk === 'HIGH RISK' ? 'red' : risk === 'WARNING' ? 'amber' : 'cyan'}
        glow={riskVisual.glow}
      >
        <div className="flex h-full items-center gap-3">
          <motion.span
            className={`block w-1 self-stretch ${riskVisual.bar}`}
            animate={
              risk === 'HIGH RISK'
                ? { opacity: [0.6, 1, 0.6] }
                : { opacity: 1 }
            }
            transition={
              risk === 'HIGH RISK'
                ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.3 }
            }
          />
          <div className="flex-1">
            <div
              className={`text-xl leading-none tracking-[0.25em] ${riskVisual.text}`}
            >
              {risk}
            </div>
            <div className="mt-1 text-[9px] tracking-widest text-slate-500 uppercase">
              {risk === 'HIGH RISK'
                ? 'EVASIVE ACTION ADVISED'
                : risk === 'WARNING'
                ? 'PROXIMITY ALERT'
                : 'PERIMETER NOMINAL'}
            </div>
          </div>
        </div>
      </CardShell>

      {/* CARD 3 — Model Processing Latency */}
      <CardShell label="Model Latency" accent="cyan">
        <div className="flex items-end justify-between">
          <span className="text-3xl leading-none text-cyan-300 tabular-nums">
            {latencyMs.toFixed(1)}
            <span className="text-base text-slate-500 ml-1">ms</span>
          </span>
          <div className="text-[9px] tracking-widest text-slate-500 text-right">
            <div>
              FPS{' '}
              <span className="text-cyan-300">
                {analytics.fps.toFixed(1)}
              </span>
            </div>
            <div>
              BUDGET{' '}
              <span className="text-cyan-300">
                {(1000 / 30).toFixed(1)} ms
              </span>
            </div>
          </div>
        </div>
        {/* Latency envelope bar (8 ms ⇢ 15 ms). */}
        <div className="mt-2 relative h-1 w-full bg-slate-900">
          <div
            className={`absolute top-0 left-0 h-full ${
              latencyMs > 13
                ? 'bg-red-500/80'
                : latencyMs > 11
                ? 'bg-yellow-400/80'
                : 'bg-cyan-400/70'
            }`}
            style={{
              width: `${((latencyMs - 8) / (15 - 8)) * 100}%`,
            }}
          />
        </div>
      </CardShell>
    </div>
  );
}
