import React from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import Navbar from './Navbar';
import LiveFeedPanel from '../vision/LiveFeedPanel';
import BlindZoneMap from '../vision/BlindZoneMap';
import DetectionList from '../telemetry/DetectionList';
import SystemPipeline from '../telemetry/SystemPipeline';
import StatsCards from '../telemetry/StatsCards';

/**
 * DashboardLayout
 * ---------------
 * Mission-control grid shell, sized to a 1080p monitor:
 *   Row 1 — 10% — system header (status pill, FPS, frame counter, track count)
 *   Row 2 — 65% — split 60 / 40:  LiveFeedPanel | (BlindZoneMap + AlertPanel)
 *   Row 3 — 25% — analytics pipeline + tracked-object list + telemetry cards
 *
 * Design language: deep slate base, 1px slate borders, low-saturation panels,
 * single-pixel neon accent borders. No rounded soft elements.
 */

const ACCENT = {
  cyan: 'border-cyan-500/30 shadow-[inset_0_0_24px_-12px_rgba(34,211,238,0.4)]',
  amber: 'border-yellow-500/30 shadow-[inset_0_0_24px_-12px_rgba(250,204,21,0.35)]',
  red: 'border-red-500/40 shadow-[inset_0_0_24px_-12px_rgba(248,113,113,0.5)]',
  slate: 'border-slate-700',
};

function PanelFrame({ label, children, className = '', accent = 'slate' }) {
  return (
    <section
      className={`relative flex flex-col bg-slate-900/60 border ${ACCENT[accent]} ${className}`}
    >
      <header className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 bg-slate-950/80">
        <span className="text-[10px] tracking-[0.25em] uppercase text-slate-400">
          {label}
        </span>
        <span className="text-[10px] text-slate-600">●</span>
      </header>
      <div className="flex-1 overflow-hidden">{children}</div>
    </section>
  );
}

export default function DashboardLayout() {
  const { risk, analytics } = useSimulation();

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-200 font-mono overflow-hidden grid grid-rows-[10%_65%_25%]">
      {/* ─────────────────────── HEADER (10%) ─────────────────────── */}
      <Navbar />

      {/* ─────────────────── MIDDLE: 60 / 40 SPLIT (65%) ─────────────────── */}
      <main className="grid grid-cols-[60%_40%] gap-px bg-slate-800">
        <PanelFrame
          label="Live Feed // Forward-Facing CAM-01"
          accent="cyan"
          className="bg-slate-950"
        >
          <LiveFeedPanel />
        </PanelFrame>

        <div className="grid grid-rows-[55%_45%] gap-px bg-slate-800">
          <PanelFrame label="Blind-Zone Map // Top-Down" accent="cyan">
            <BlindZoneMap />
          </PanelFrame>

          <PanelFrame
            label="Alert Stack"
            accent={risk === 'HIGH RISK' ? 'red' : 'amber'}
          >
            <div className="h-full w-full overflow-auto px-3 py-2 text-[11px] space-y-1">
              {analytics.alerts.length === 0 ? (
                <div className="text-slate-600 tracking-widest">
                  // no active alerts
                </div>
              ) : (
                analytics.alerts.map((a) => (
                  <div
                    key={a.id}
                    className={`flex justify-between border-l-2 pl-2 ${
                      a.severity === 'critical'
                        ? 'border-red-500 text-red-300'
                        : 'border-yellow-500 text-yellow-200'
                    }`}
                  >
                    <span>{a.message}</span>
                    <span className="text-slate-500">
                      #{a.id} · {(a.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </PanelFrame>
        </div>
      </main>

      {/* ─────────────────────── BOTTOM (25%) ─────────────────────── */}
      <footer className="grid grid-cols-[35%_40%_25%] gap-px bg-slate-800 border-t border-slate-800">
        <PanelFrame label="Inference Pipeline" accent="slate">
          <SystemPipeline />
        </PanelFrame>

        <PanelFrame label="Active Tracks" accent="slate">
          <DetectionList />
        </PanelFrame>

        <PanelFrame label="System Telemetry" accent="slate">
          <StatsCards />
        </PanelFrame>
      </footer>
    </div>
  );
}
