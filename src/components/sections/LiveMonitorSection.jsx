import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useSimulation } from '../../contexts/SimulationContext';

const QUAD_W = 640;
const QUAD_H = 360;

const SEV_STROKE = { critical: '#ff3131', warning: '#ffaa00', ok: '#00f5ff' };
const SEV_LABEL_BG = {
  critical: 'rgba(255,49,49,0.8)',
  warning:  'rgba(255,170,0,0.8)',
  ok:       'rgba(0,245,255,0.15)',
};

const BboxOverlay = memo(function BboxOverlay({ objects, imgW, imgH, imgNw, imgNh }) {
  if (!imgW || !imgH || !objects.length) return null;

  const refW = imgNw || QUAD_W;
  const refH = imgNh || QUAD_H;
  const scaleX = imgW / refW;
  const scaleY = imgH / refH;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox={`0 0 ${imgW} ${imgH}`}
        preserveAspectRatio="none"
      >
        {objects.map((obj) => {
          const [bx, by, bw, bh] = obj.box;
          const x = bx * scaleX;
          const y = by * scaleY;
          const w = bw * scaleX;
          const h = bh * scaleY;
          const sev = obj.severity ?? 'ok';
          const color = SEV_STROKE[sev] ?? SEV_STROKE.ok;
          const sw = sev === 'critical' ? 2.5 : sev === 'warning' ? 2 : 1.5;
          const arm = Math.min(w, h) * 0.18;

          return (
            <g key={obj.id} opacity={sev === 'ok' ? 0.7 : 1}>
              <rect
                x={x} y={y} width={w} height={h}
                fill={
                  sev === 'critical' ? 'rgba(255,49,49,0.07)'
                  : sev === 'warning' ? 'rgba(255,170,0,0.06)'
                  : 'transparent'
                }
                stroke={color}
                strokeWidth={sw}
                strokeDasharray={sev === 'ok' ? '5 4' : undefined}
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={[
                  `M ${x} ${y + arm} L ${x} ${y} L ${x + arm} ${y}`,
                  `M ${x + w - arm} ${y} L ${x + w} ${y} L ${x + w} ${y + arm}`,
                  `M ${x + w} ${y + h - arm} L ${x + w} ${y + h} L ${x + w - arm} ${y + h}`,
                  `M ${x + arm} ${y + h} L ${x} ${y + h} L ${x} ${y + h - arm}`,
                ].join(' ')}
                fill="none"
                stroke={color}
                strokeWidth={sw * 1.8}
                strokeLinecap="square"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
      </svg>

      {objects.map((obj) => {
        const [bx, by, , bw] = obj.box;
        const sev = obj.severity ?? 'ok';
        const color = SEV_STROKE[sev] ?? SEV_STROKE.ok;
        const labelBg = SEV_LABEL_BG[sev] ?? SEV_LABEL_BG.ok;
        const left = bx * scaleX;
        const top  = Math.max(0, by * scaleY - 22);
        
        let conf = 0;
        if (obj.confidence !== undefined && obj.confidence !== null) {
          conf = (obj.confidence * 100).toFixed(0);
        }
        
        const classStr = obj.class ? obj.class.toUpperCase() : 'UNKNOWN';
        const label = `${classStr} · ${conf}%`;

        return (
          <div
            key={`lbl-${obj.id}`}
            style={{
              position: 'absolute',
              left,
              top,
              maxWidth: bw * scaleX,
              padding: '2px 6px',
              background: labelBg,
              border: `1px solid ${color}`,
              fontFamily: 'monospace',
              fontSize: '10px',
              color: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '0.04em',
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
});

const CameraCard = memo(function CameraCard({ frameKey, label, zone, isFullscreen, onExpand, onClose }) {
  const { frames, objects } = useSimulation();
  
  const frame = frames?.[frameKey];
  const validFrame = frame && frame !== 'None' && frame.length > 100 ? frame : null;
  const activeObjects = (objects || []).filter((o) => o.zone === zone);
  
  const imgRef = useRef(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0, nw: 0, nh: 0 });

  const measureImg = useCallback(() => {
    const el = imgRef.current;
    if (el) setImgSize({ w: el.clientWidth, h: el.clientHeight, nw: el.naturalWidth, nh: el.naturalHeight });
  }, []);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measureImg);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureImg, validFrame, isFullscreen]);

  const critCount = activeObjects.filter((o) => o.severity === 'critical').length;
  const warnCount = activeObjects.filter((o) => o.severity === 'warning').length;
  
  let severityBadge = { text: 'OK', color: '#00f5ff', bg: 'rgba(0,245,255,0.1)' };
  if (critCount > 0) severityBadge = { text: 'CRT', color: '#ff3131', bg: 'rgba(255,49,49,0.1)' };
  else if (warnCount > 0) severityBadge = { text: 'WRN', color: '#ffaa00', bg: 'rgba(255,170,0,0.1)' };

  const cardContent = (
    <>
      {validFrame ? (
        <>
          <img
            ref={imgRef}
            src={`data:image/jpeg;base64,${validFrame}`}
            alt={label}
            onLoad={measureImg}
            className="w-full h-full object-cover"
          />
          <BboxOverlay objects={activeObjects} imgW={imgSize.w} imgH={imgSize.h} imgNw={imgSize.nw} imgNh={imgSize.nh} />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] animate-[pulse_0.2s_infinite]" />
          <span className="font-mono text-slate-500 tracking-[0.2em]">NO SIGNAL</span>
        </div>
      )}

      {/* Top Left Label */}
      <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded backdrop-blur-sm border border-[#00f5ff]/20">
        <span className="font-mono text-[11px] text-[#00f5ff] tracking-widest">{label}</span>
      </div>

      {/* Top Right Severity Badge */}
      <div 
        className="absolute top-2 right-2 px-2 py-1 rounded border backdrop-blur-sm font-mono text-[10px] font-bold tracking-wider"
        style={{ color: severityBadge.color, borderColor: `${severityBadge.color}40`, backgroundColor: severityBadge.bg }}
      >
        {severityBadge.text}
      </div>

      {/* Fullscreen Details */}
      {isFullscreen && (
        <div className="absolute bottom-4 left-4 right-4 p-4 bg-black/80 border border-[#00f5ff]/30 backdrop-blur-md rounded-lg flex flex-col gap-2">
          <div className="flex justify-between items-center text-[#00f5ff] font-mono text-sm border-b border-[#00f5ff]/20 pb-2">
            <span>ZONE: {zone.toUpperCase()}</span>
            <span>OBJECTS DETECTED: {activeObjects.length}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {activeObjects.length === 0 && <span className="text-slate-500 font-mono text-xs">No active tracks</span>}
            {activeObjects.map(o => (
              <div key={o.id} className="text-xs font-mono px-2 py-1 rounded border border-slate-700 bg-slate-900/50 text-slate-300">
                #{o.id} {o.class.toUpperCase()} ({(o.confidence * 100).toFixed(0)}%)
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  if (isFullscreen) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black/90 p-8 flex items-center justify-center backdrop-blur-md"
        onClick={onClose}
      >
        <div 
          className="relative w-full max-w-[80vw] aspect-video rounded-xl overflow-hidden border border-[#00f5ff]/40 shadow-[0_0_50px_rgba(0,245,255,0.15)]"
          onClick={e => e.stopPropagation()}
        >
          {cardContent}
          <button 
            onClick={onClose}
            className="absolute top-2 right-16 px-3 py-1 bg-black/60 border border-white/20 text-white font-mono text-xs rounded hover:bg-white/10 transition-colors"
          >
            CLOSE
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layoutId={`card-${frameKey}`}
      whileHover={{ scale: 1.02, borderColor: 'rgba(0,245,255,0.4)' }}
      transition={{ duration: 0.3 }}
      onClick={onExpand}
      className="relative aspect-video rounded-lg overflow-hidden border border-[#00f5ff]/15 bg-white/2 backdrop-blur-md cursor-pointer group shadow-lg"
    >
      {cardContent}
      
      {/* Hover Overlay Hint */}
      <div className="absolute inset-0 bg-[#00f5ff]/0 group-hover:bg-[#00f5ff]/5 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <span className="font-mono text-[#00f5ff] bg-black/50 px-3 py-1 rounded border border-[#00f5ff]/30 text-xs tracking-widest backdrop-blur-sm shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
          CLICK TO EXPAND
        </span>
      </div>
    </motion.div>
  );
});

export default function LiveMonitorSection() {
  const [expandedCard, setExpandedCard] = useState(null);

  const CARDS = [
    { frameKey: 'front', label: 'FRONT CAM', zone: 'front' },
    { frameKey: 'rear', label: 'REAR CAM', zone: 'rear' },
    { frameKey: 'left_blind', label: 'L-BLIND CAM', zone: 'left_blind' },
    { frameKey: 'right_blind', label: 'R-BLIND CAM', zone: 'right_blind' },
  ];

  return (
    <section id="live-monitor" className="relative min-h-screen w-full bg-[#050505] py-24 px-4 sm:px-8 lg:px-16 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-[#00f5ff] font-mono text-[12px] tracking-[0.3em] mb-8"
        >
          LIVE BACKEND MONITORING
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {CARDS.map(card => (
            <CameraCard
              key={card.frameKey}
              frameKey={card.frameKey}
              label={card.label}
              zone={card.zone}
              isFullscreen={false}
              onExpand={() => setExpandedCard(card)}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {expandedCard && (
          <CameraCard
            frameKey={expandedCard.frameKey}
            label={expandedCard.label}
            zone={expandedCard.zone}
            isFullscreen={true}
            onClose={() => setExpandedCard(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
