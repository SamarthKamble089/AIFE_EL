import React, { useEffect, useState } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';

const RISK_TONE = {
  SAFE:
    'text-[#00f5ff] border-[#00f5ff]/50 shadow-[0_0_14px_-2px_rgba(0,245,255,0.45)]',
  WARNING:
    'text-[#ffaa00] border-[#ffaa00]/60 shadow-[0_0_16px_-2px_rgba(255,170,0,0.55)]',
  'HIGH RISK':
    'text-[#ff3131] border-[#ff3131]/80 shadow-[0_0_22px_-2px_rgba(255,49,49,0.75)] animate-pulse',
};

const CONNECTION_LABEL = {
  idle: 'STANDBY',
  connecting: 'LINKING…',
  online: 'LINK OK',
  error: 'LINK ERR',
};

const CONNECTION_TONE = {
  idle: 'text-slate-500',
  connecting: 'text-yellow-300',
  online: 'text-cyan-300',
  error: 'text-red-400',
};

function ModeToggle({ isLive, onSelect }) {
  const baseSeg =
    'px-3 py-1 text-[10px] tracking-[0.3em] uppercase border transition-colors';
  return (
    <div
      className="hidden md:flex items-stretch border border-slate-700 bg-slate-950"
      role="group"
      aria-label="Telemetry source"
    >
      <button
        type="button"
        onClick={() => onSelect(false)}
        className={`${baseSeg} ${
          !isLive
            ? 'bg-cyan-500/10 border-[#00f5ff]/60 text-[#00f5ff]'
            : 'border-transparent text-slate-500 hover:text-slate-300'
        }`}
      >
        Sim
      </button>
      <button
        type="button"
        onClick={() => onSelect(true)}
        className={`${baseSeg} border-l border-slate-700 ${
          isLive
            ? 'bg-red-500/10 border-red-500/60 text-red-200'
            : 'border-transparent text-slate-500 hover:text-slate-300'
        }`}
      >
        Live
      </button>
    </div>
  );
}

function ChannelMatrix({ streams, active, onSelect }) {
  return (
    <div className="hidden lg:flex border border-slate-700 bg-slate-950">
      {streams.map((s) => {
        const isActive = s.id === active;
        return (
          <button
            type="button"
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`px-2.5 py-1 text-[10px] tracking-[0.25em] uppercase border-l first:border-l-0 border-slate-700 transition-colors ${
              isActive
                ? 'bg-cyan-500/15 text-[#00f5ff] shadow-[inset_0_0_10px_-2px_rgba(0,245,255,0.5)]'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title={s.name}
          >
            <span className={isActive ? 'text-[#00f5ff]' : 'text-slate-500'}>
              {s.code}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function Navbar() {
  const {
    risk,
    analytics,
    frameId,
    isRealTimeBackend,
    connectToBackend,
    disconnectBackend,
    connectionStatus,
    currentCameraStream,
    setCameraStream,
    cameraStreams,
  } = useSimulation();

  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.4 }
    );

    const sections = document.querySelectorAll('section[id]');
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const onModeSelect = (wantLive) => {
    if (wantLive) connectToBackend();
    else disconnectBackend();
  };

  const tone = RISK_TONE[risk] ?? RISK_TONE.SAFE;

  const NAV_LINKS = [
    { id: 'live-monitor', label: 'MONITOR' },
    { id: 'zones', label: 'ZONES' },
    { id: 'pipeline', label: 'PIPELINE' },
    { id: 'analytics', label: 'ANALYTICS' },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-5 h-12 border-b border-white/10 bg-[#000000]/80 backdrop-blur-md font-mono">
      {/* ─── identity & nav ─── */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => scrollTo('hero')}>
          <div className="w-2 h-2 bg-[#00f5ff] shadow-[0_0_8px_2px_rgba(0,245,255,0.7)]" />
          <h1 className="text-xs tracking-[0.4em] text-white uppercase truncate hidden sm:block">
            AIFE
          </h1>
          {isRealTimeBackend && (
            <span
              className={`ml-2 border border-slate-700 px-2 py-[1px] text-[9px] tracking-widest uppercase ${CONNECTION_TONE[connectionStatus]}`}
            >
              {CONNECTION_LABEL[connectionStatus]}
            </span>
          )}
        </div>

        <nav className="hidden md:flex items-center gap-4 border-l border-white/10 pl-6 h-6">
          {NAV_LINKS.map(link => (
            <button
              key={link.id}
              onClick={() => scrollTo(link.id)}
              className={`text-[10px] tracking-widest uppercase transition-colors ${
                activeSection === link.id ? 'text-[#00f5ff] font-bold' : 'text-slate-500 hover:text-white'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ─── controls + risk pill ─── */}
      <div className="flex items-center gap-3">
        <ModeToggle isLive={isRealTimeBackend} onSelect={onModeSelect} />
        <div
          className={`px-3 py-1 border ${tone} bg-slate-950/70 text-[10px] tracking-[0.3em] uppercase hidden xl:block whitespace-nowrap`}
        >
          {risk}
        </div>
      </div>

      {/* ─── counters ─── */}
      <div className="hidden 2xl:flex items-center justify-end gap-5 text-[11px] text-slate-400">
        <span>
          FPS <span className="text-[#00f5ff]">{analytics?.fps?.toFixed(1) || 0}</span>
        </span>
        <span>
          FRAME <span className="text-[#00f5ff]">#{frameId.toString().padStart(6, '0')}</span>
        </span>
        <span>
          TRACKS <span className="text-[#00f5ff]">{analytics?.trackingCount || 0}</span>
        </span>
        <span>
          ALERTS{' '}
          <span
            className={
              !analytics?.alerts?.length
                ? 'text-slate-500'
                : risk === 'HIGH RISK'
                ? 'text-red-400'
                : 'text-yellow-300'
            }
          >
            {analytics?.alerts?.length || 0}
          </span>
        </span>
      </div>
    </header>
  );
}
