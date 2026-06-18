import React from 'react';
import { motion } from 'motion/react';
import { useSimulation } from '../../contexts/SimulationContext';

export default function HeroSection() {
  const { connectionStatus, isRealTimeBackend, connectToBackend, disconnectBackend } = useSimulation();

  const handleSimClick = () => {
    if (isRealTimeBackend) {
      disconnectBackend();
    } else {
      connectToBackend();
    }
  };

  const handleScrollToMonitor = () => {
    document.getElementById('live-monitor')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="hero" className="relative min-h-screen w-full bg-[#000000] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Grid */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(to right, rgba(0,245,255,0.06) 0, rgba(0,245,255,0.06) 1px, transparent 1px, transparent 60px),
            repeating-linear-gradient(to bottom, rgba(0,245,255,0.06) 0, rgba(0,245,255,0.06) 1px, transparent 1px, transparent 60px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
      
      {/* Scanline Effect */}
      <motion.div 
        animate={{ top: ['-20%', '120%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 right-0 h-48 bg-gradient-to-b from-transparent via-[#00f5ff] to-transparent opacity-[0.03] pointer-events-none"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 mt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-[#00f5ff] font-mono text-[12px] tracking-[0.3em] mb-4"
        >
          AIFE // AI TRANSPORTATION SAFETY SYSTEM
        </motion.div>

        <h1 className="text-[40px] lg:text-[72px] font-[800] text-white leading-tight mb-6" style={{ textShadow: '0 0 40px rgba(0,245,255,0.4)' }}>
          {["BLIND SPOT", "RISK DETECTION"].map((line, lineIdx) => (
            <div key={lineIdx} className="overflow-hidden">
              {line.split(" ").map((word, wordIdx) => (
                <motion.span
                  key={wordIdx}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + (lineIdx * 2 + wordIdx) * 0.1, duration: 0.5 }}
                  className="inline-block mr-4 last:mr-0"
                >
                  {word}
                </motion.span>
              ))}
            </div>
          ))}
        </h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-[16px] text-white/50 max-w-[480px] mb-10"
        >
          Real-time AI monitoring for heavy vehicles using YOLOv8
        </motion.p>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex flex-col sm:flex-row gap-4 mb-8"
        >
          <motion.button 
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
            onClick={handleScrollToMonitor}
            className="bg-[#00f5ff] text-black font-mono px-6 py-3 font-bold cursor-pointer z-20 relative"
          >
            ENTER LIVE MONITOR
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
            onClick={handleSimClick}
            className="border border-[#00f5ff] text-[#00f5ff] font-mono px-6 py-3 bg-black/50 cursor-pointer z-20 relative"
          >
            {isRealTimeBackend ? "DISCONNECT LIVE" : "SIM TELEMETRY"}
          </motion.button>
        </motion.div>

        {/* Status Indicators */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="flex flex-wrap justify-center gap-6 font-mono text-[11px]"
        >
          <div className="flex items-center gap-2 text-slate-300">
            <motion.div 
              animate={{ opacity: [1, 0.4, 1] }} 
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"
            />
            SYSTEM ONLINE
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-[#00f5ff] shadow-[0_0_8px_rgba(0,245,255,0.8)]" />
            YOLOV8 READY
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <div className={`w-2 h-2 rounded-full shadow-lg ${
              connectionStatus === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 
              connectionStatus === 'error' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 
              'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]'
            }`} />
            WS localhost:8765
          </div>
        </motion.div>
      </div>

      {/* Bounce Chevron */}
      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-8 text-[#00f5ff]/50"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </motion.div>
    </section>
  );
}
