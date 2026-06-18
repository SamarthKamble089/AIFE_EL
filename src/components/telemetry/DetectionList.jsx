import React, { useMemo } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';

/**
 * DetectionList
 * -------------
 * Dense terminal-style readout of every active tracker. Mirrors the
 * BoundingBox severity grade used in LiveFeedPanel so rows stay visually
 * coherent with what the operator sees on the video overlay.
 *
 * Severity grade (same policy as the rest of the system):
 *   - critical : pedestrian / motorcycle in a blind zone   → crimson row
 *   - warning  : any vehicle in a blind zone (conf > 0.6)  → amber row
 *   - normal   : detection in the clear zone               → default slate
 */

const VULNERABLE = new Set(['pedestrian', 'motorcycle']);

function severityFor(o) {
  if (o.zone === 'clear') return 'normal';
  if (VULNERABLE.has(o.class)) return 'critical';
  if (o.confidence > 0.6) return 'warning';
  return 'warning';
}

const ROW_STYLE = {
  normal: 'text-slate-300',
  warning: 'bg-yellow-950/20 text-yellow-200',
  critical: 'bg-red-950/30 text-red-300',
};

const ZONE_STYLE = {
  clear: 'text-slate-500',
  left_blind: 'text-yellow-300',
  right_blind: 'text-yellow-300',
};

const CONF_COLOR = (c) =>
  c >= 0.85 ? 'text-cyan-300' : c >= 0.65 ? 'text-cyan-400/80' : 'text-slate-400';

const HEADERS = [
  { key: 'id', label: 'TRK·ID', width: 'w-[14%]' },
  { key: 'class', label: 'CLASS', width: 'w-[22%]' },
  { key: 'confidence', label: 'CONF', width: 'w-[14%]' },
  { key: 'zone', label: 'ZONE', width: 'w-[28%]' },
  { key: 'persistenceFrames', label: 'P-FR', width: 'w-[12%]' },
  { key: 'sev', label: 'SEV', width: 'w-[10%]' },
];

const SEV_BADGE = {
  normal: 'text-slate-500 border-slate-700',
  warning: 'text-yellow-300 border-yellow-500/60',
  critical: 'text-red-300 border-red-500/70',
};

export default function DetectionList() {
  const { objects } = useSimulation();

  // Sort: critical first, then warning, then by descending persistence so
  // long-lived tracks stay anchored at the top of their group.
  const rows = useMemo(() => {
    const weight = (o) =>
      severityFor(o) === 'critical' ? 0 : severityFor(o) === 'warning' ? 1 : 2;
    return [...objects].sort((a, b) => {
      const dw = weight(a) - weight(b);
      if (dw !== 0) return dw;
      return b.persistenceFrames - a.persistenceFrames;
    });
  }, [objects]);

  return (
    <div className="flex flex-col h-full bg-slate-950 font-mono">
      {/* Sticky header row. */}
      <div className="flex border-b border-slate-800 bg-slate-950 text-[9px] tracking-[0.25em] text-slate-500 uppercase">
        {HEADERS.map((h) => (
          <div key={h.key} className={`${h.width} px-2 py-1`}>
            {h.label}
          </div>
        ))}
      </div>

      {/* Scrolling body. */}
      <div className="flex-1 overflow-auto text-[11px]">
        {rows.length === 0 ? (
          <div className="px-3 py-3 text-slate-600 tracking-widest">
            // no active tracks · awaiting telemetry
          </div>
        ) : (
          rows.map((o) => {
            const sev = severityFor(o);
            return (
              <div
                key={o.id}
                className={`flex items-center border-b border-slate-900/80 leading-none ${ROW_STYLE[sev]}`}
              >
                <div className={`${HEADERS[0].width} px-2 py-1.5 text-slate-300`}>
                  {o.id}
                </div>
                <div className={`${HEADERS[1].width} px-2 py-1.5 text-cyan-300`}>
                  {o.class}
                </div>
                <div
                  className={`${HEADERS[2].width} px-2 py-1.5 ${CONF_COLOR(o.confidence)}`}
                >
                  {(o.confidence * 100).toFixed(0)}%
                </div>
                <div
                  className={`${HEADERS[3].width} px-2 py-1.5 ${ZONE_STYLE[o.zone] ?? 'text-slate-400'}`}
                >
                  {o.zone}
                </div>
                <div className={`${HEADERS[4].width} px-2 py-1.5 text-slate-400`}>
                  {o.persistenceFrames}
                </div>
                <div className={`${HEADERS[5].width} px-2 py-1.5`}>
                  <span
                    className={`inline-block border px-1.5 py-[1px] text-[9px] tracking-widest uppercase ${SEV_BADGE[sev]}`}
                  >
                    {sev === 'normal' ? 'OK' : sev === 'warning' ? 'WRN' : 'CRT'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer count strip. */}
      <div className="flex justify-between items-center border-t border-slate-800 bg-slate-950 px-2 py-1 text-[9px] tracking-widest text-slate-500 uppercase">
        <span>TRACKS · {rows.length}</span>
        <span>
          CRT{' '}
          <span className="text-red-400">
            {rows.filter((r) => severityFor(r) === 'critical').length}
          </span>{' '}
          · WRN{' '}
          <span className="text-yellow-300">
            {rows.filter((r) => severityFor(r) === 'warning').length}
          </span>{' '}
          · OK{' '}
          <span className="text-cyan-300">
            {rows.filter((r) => severityFor(r) === 'normal').length}
          </span>
        </span>
      </div>
    </div>
  );
}
