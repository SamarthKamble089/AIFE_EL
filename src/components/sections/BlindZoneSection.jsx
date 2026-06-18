import React from 'react';
import { motion } from 'motion/react';
import { useSimulation } from '../../contexts/SimulationContext';
import BlindZoneMap from '../vision/BlindZoneMap';

const Counter = ({ value }) => {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-block"
    >
      {value}
    </motion.span>
  );
};

export default function BlindZoneSection() {
  const { analytics, objects, risk } = useSimulation();

  const totalObjects = analytics?.trackingCount || 0;
  
  const criticalZonesCount = new Set(
    (objects || []).filter(o => o.severity === 'critical').map(o => o.zone)
  ).size;

  const getRiskColor = (r) => {
    if (r === 'HIGH RISK') return 'text-[#ff3131] border-[#ff3131]/30 bg-[#ff3131]/10';
    if (r === 'WARNING') return 'text-[#ffaa00] border-[#ffaa00]/30 bg-[#ffaa00]/10';
    return 'text-[#00f5ff] border-[#00f5ff]/30 bg-[#00f5ff]/10';
  };

  return (
    <section id="zones" className="relative min-h-screen w-full bg-[#080a0f] py-24 px-4 sm:px-8 lg:px-16 flex items-center border-t border-white/5">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[40%_60%] gap-12 lg:gap-8 items-center">
        
        {/* Left Side: Text Content */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="flex flex-col text-left"
        >
          <div className="text-[#00f5ff] font-mono text-[12px] tracking-[0.3em] mb-4">
            BLIND ZONE ANALYSIS
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">
            Spatial Threat Awareness
          </h2>
          
          <p className="text-slate-400 mb-10 leading-relaxed max-w-md">
            Heavy vehicles have massive peripheral blind spots where standard mirrors cannot reach. 
            The AI system maps these vulnerable regions in real-time, mapping localized trajectories 
            to immediately detect pedestrians, cyclists, or smaller vehicles entering dangerous proximity.
          </p>

          {/* Live Stats */}
          <div className="flex flex-col gap-4 font-mono">
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
              <span className="text-slate-400 text-sm tracking-widest">ACTIVE TRACKS</span>
              <span className="text-2xl text-white font-bold"><Counter value={totalObjects} /></span>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
              <span className="text-slate-400 text-sm tracking-widest">CRITICAL ZONES</span>
              <span className="text-2xl text-[#ff3131] font-bold"><Counter value={criticalZonesCount} /></span>
            </div>

            <div className={`flex items-center justify-between p-4 border rounded-lg ${getRiskColor(risk)}`}>
              <span className="text-sm tracking-widest uppercase">CURRENT RISK</span>
              <span className="text-xl font-bold tracking-widest">{risk}</span>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Existing Component wrapped */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative aspect-square lg:aspect-auto lg:h-[600px] w-full bg-[#0a0f1e] rounded-xl overflow-hidden border border-[#00f5ff]/20 shadow-[0_0_40px_rgba(0,245,255,0.05)]"
        >
          <div className="absolute inset-0 p-4 pb-8 flex flex-col">
            <BlindZoneMap />
          </div>
        </motion.div>

      </div>
    </section>
  );
}
