import React from 'react';
import { motion } from 'motion/react';
import { useSimulation } from '../../contexts/SimulationContext';
import DetectionList from '../telemetry/DetectionList';

const StatCard = ({ label, value, unit, colorClass = "text-white" }) => {
  return (
    <motion.div 
      whileHover={{ y: -4, boxShadow: "0 10px 30px -10px rgba(0,245,255,0.2)" }}
      className="flex flex-col justify-center items-center bg-[rgba(0,245,255,0.04)] border border-[rgba(0,245,255,0.12)] rounded-xl p-6 backdrop-blur-md"
    >
      <div className="flex items-baseline gap-1 mb-2">
        <motion.span 
          key={value}
          initial={{ opacity: 0.5, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-3xl lg:text-4xl font-bold ${colorClass}`}
        >
          {value}
        </motion.span>
        {unit && <span className="text-xs text-[#00f5ff]/60 font-mono">{unit}</span>}
      </div>
      <span className="text-[11px] font-mono text-[#00f5ff] tracking-widest uppercase text-center">
        {label}
      </span>
    </motion.div>
  );
};

export default function AnalyticsSection() {
  const { analytics, frameId, risk, connectionStatus } = useSimulation();

  const riskColor = risk === 'HIGH RISK' ? 'text-[#ff3131]' : risk === 'WARNING' ? 'text-[#ffaa00]' : 'text-[#00f5ff]';
  
  let statusText = 'SIMULATION';
  let statusColor = 'text-[#00f5ff]';
  if (connectionStatus === 'online') {
    statusText = 'ONLINE';
    statusColor = 'text-green-500';
  } else if (connectionStatus === 'error') {
    statusText = 'ERROR';
    statusColor = 'text-red-500';
  } else if (connectionStatus === 'connecting') {
    statusText = 'CONNECTING';
    statusColor = 'text-yellow-500';
  }

  return (
    <section id="analytics" className="relative min-h-screen w-full bg-[#080808] py-24 px-4 sm:px-8 lg:px-16 flex flex-col items-center border-t border-white/5">
      <div className="max-w-7xl mx-auto w-full flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-12"
        >
          <div className="text-[#00f5ff] font-mono text-[12px] tracking-[0.3em] mb-4">
            SYSTEM ANALYTICS
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white">
            Real-time Telemetry Dashboard
          </h2>
        </motion.div>

        {/* 6 Stat Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-16">
          <StatCard label="FPS" value={analytics?.fps?.toFixed(1) || 0} unit="Hz" />
          <StatCard label="FRAME" value={`#${frameId}`} />
          <StatCard label="TRACKS" value={analytics?.trackingCount || 0} unit="obj" />
          <StatCard label="ALERTS" value={analytics?.alerts?.length || 0} unit="active" />
          <StatCard label="RISK LEVEL" value={risk} colorClass={riskColor} />
          <StatCard label="STATUS" value={statusText} colorClass={statusColor} />
        </div>

        {/* Detection Log */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="w-full flex flex-col bg-slate-950 rounded-xl overflow-hidden border border-[#00f5ff]/20 shadow-2xl h-[450px]"
        >
          <div className="bg-[#0a0f1e] px-4 py-3 border-b border-[#00f5ff]/20 flex items-center justify-between">
            <h3 className="text-[#00f5ff] font-mono text-sm tracking-[0.2em] font-bold">ACTIVE DETECTION LOG</h3>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <DetectionList />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
