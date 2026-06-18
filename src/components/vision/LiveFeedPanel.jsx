import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useSimulation } from '../../contexts/SimulationContext';

const QUAD_W = 640;
const QUAD_H = 360;

const CHANNEL_MAP = [
  { zone: 'left_blind',  frameKey: 'left_blind',  label: 'L-BLIND CAM · CH1' },
  { zone: 'right_blind', frameKey: 'right_blind', label: 'R-BLIND CAM · CH2' },
  { zone: 'rear',        frameKey: 'rear',        label: 'REAR CAM · CH3' },
];

const SEV_STROKE = { critical: '#ff3131', warning: '#ffaa00', ok: '#00f5ff' };
const SEV_LABEL_BG = {
  critical: 'rgba(255,49,49,0.8)',
  warning:  'rgba(255,170,0,0.8)',
  ok:       'rgba(0,245,255,0.15)',
};

const BboxOverlay = memo(function BboxOverlay({ objects, zone, imgW, imgH, imgNw, imgNh }) {
  if (!imgW || !imgH || !objects.length) return null;

  const refW = imgNw || QUAD_W;
  const refH = imgNh || QUAD_H;
  const scaleX = imgW / refW;
  const scaleY = imgH / refH;

  const zoneObjs = objects.filter((o) => o.zone === zone);
  if (!zoneObjs.length) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox={`0 0 ${imgW} ${imgH}`}
        preserveAspectRatio="none"
      >
        {zoneObjs.map((obj) => {
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

      {zoneObjs.map((obj) => {
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
        const label = `${classStr} · ${conf}% · #${obj.id}`;

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
              fontSize: '11px',
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

const PipCamera = memo(function PipCamera({ b64Frame }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        width: 160,
        height: 90,
        border: '1px solid rgba(0,245,255,0.4)',
        background: '#020617',
        overflow: 'hidden',
        zIndex: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
      }}
    >
      {b64Frame ? (
        <img
          src={`data:image/jpeg;base64,${b64Frame}`}
          alt="FWD"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: '#0a0f1e' }} />
      )}
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          left: 5,
          fontFamily: 'monospace',
          fontSize: '8px',
          letterSpacing: '0.1em',
          color: '#00f5ff',
          pointerEvents: 'none',
        }}
      >
        FWD
      </div>
    </div>
  );
});

const StreamSwitchOverlay = memo(function StreamSwitchOverlay({ channelLabel }) {
  return (
    <motion.div
      key="switch-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        zIndex: 20,
        overflow: 'hidden',
      }}
    >
      <motion.div
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 0.85, ease: 'linear', repeat: Infinity }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 2,
          background: 'linear-gradient(90deg, transparent 0%, #00f5ff 50%, transparent 100%)',
          opacity: 0.7,
        }}
      />
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: 16,
          letterSpacing: '0.2em',
          color: '#00f5ff',
          textTransform: 'uppercase',
        }}
      >
        STREAM CONNECTING…
      </div>
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: 12,
          letterSpacing: '0.14em',
          color: '#00f5ff',
          textTransform: 'uppercase',
          opacity: 0.8,
        }}
      >
        {channelLabel}
      </div>
    </motion.div>
  );
});

const SimPlaceholder = memo(function SimPlaceholder() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        background: '#0a0f1e',
      }}
    >
      <div style={{ textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.12em' }}>
        <div style={{ fontSize: 18, color: '#fff', marginBottom: '8px' }}>NO LIVE FEED</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
          SWITCH TO LIVE BACKEND TO VIEW CAMERA
        </div>
      </div>
    </div>
  );
});

export default memo(function LiveFeedPanel() {
  const {
    frames,
    objects,
    currentCameraStream,
    streamSwitching,
  } = useSimulation();

  const activeChannel = CHANNEL_MAP[currentCameraStream] ?? CHANNEL_MAP[0];
  const activeFrame   = frames?.[activeChannel.frameKey] ?? null;
  const frontFrame    = frames?.front ?? null;
  
  const activeObjects = (objects || []).filter((o) => o.zone === activeChannel.zone);

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
  }, [measureImg, activeFrame]);

  const critCount = activeObjects.filter((o) => o.severity === 'critical').length;
  const warnCount = activeObjects.filter((o) => o.severity === 'warning').length;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#0a0f1e',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        {frames ? (
          <>
            {activeFrame && (
              <img
                ref={imgRef}
                src={`data:image/jpeg;base64,${activeFrame}`}
                alt={activeChannel.label}
                onLoad={measureImg}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}
            <BboxOverlay
              objects={activeObjects}
              zone={activeChannel.zone}
              imgW={imgSize.w}
              imgH={imgSize.h}
              imgNw={imgSize.nw}
              imgNh={imgSize.nh}
            />
          </>
        ) : (
          <SimPlaceholder />
        )}

        {/* Top-left: channel label */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            fontFamily: 'monospace',
            fontSize: '12px',
            fontWeight: 'bold',
            letterSpacing: '0.12em',
            color: '#fff',
            textTransform: 'uppercase',
            pointerEvents: 'none',
            zIndex: 8,
            background: 'rgba(0,0,0,0.5)',
            padding: '4px 8px',
            borderRadius: '4px',
          }}
        >
          {activeChannel.label}
        </div>

        {/* Top-right: PiP front camera + REC */}
        <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 10 }}>
          {/* REC indicator */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 180,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#ff3131',
              pointerEvents: 'none',
              zIndex: 12,
              background: 'rgba(0,0,0,0.5)',
              padding: '2px 8px',
              borderRadius: '4px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#ff3131',
                boxShadow: '0 0 4px #ff3131',
              }}
            />
            REC
          </div>
          {/* PiP front camera */}
          <PipCamera b64Frame={frontFrame} />
        </div>

        {/* Stream-switching overlay (Framer Motion) */}
        <AnimatePresence>
          {streamSwitching && (
            <StreamSwitchOverlay channelLabel={activeChannel.label} />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          flexShrink: 0,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(0,245,255,0.2)',
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(4px)',
          padding: '0 12px',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#fff',
        }}
      >
        <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span>ZONE: <span style={{ color: '#00f5ff' }}>{activeChannel.zone.replace('_', ' ').toUpperCase()}</span></span>
        </span>
        <span style={{ display: 'flex', gap: '16px' }}>
          <span>
            OBJECTS: <span style={{ color: '#00f5ff' }}>{activeObjects.length}</span>
          </span>
          {critCount > 0 && (
            <span style={{ color: '#ff3131' }}>CRITICAL: {critCount}</span>
          )}
          {warnCount > 0 && !critCount && (
            <span style={{ color: '#ffaa00' }}>WARNING: {warnCount}</span>
          )}
        </span>
      </div>
    </div>
  );
});
