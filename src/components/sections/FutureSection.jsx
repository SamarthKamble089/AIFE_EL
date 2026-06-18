import React from 'react';
import { motion } from 'motion/react';

const FEATURES = [
  {
    title: "ACCIDENT HEATMAP",
    icon: "🔴",
    desc: "Spatial analysis of historical near-miss events mapped across route corridors",
    badge: "COMING SOON",
  },
  {
    title: "PREDICTIVE COLLISION",
    icon: "⚡",
    desc: "Trajectory forecasting using object velocity vectors and lane geometry",
    badge: "COMING SOON",
  },
  {
    title: "FLEET INTELLIGENCE",
    icon: "🚛",
    desc: "Multi-vehicle telemetry aggregation with centralized risk scoring",
    badge: "PLANNED",
  },
  {
    title: "NIGHT VISION MODE",
    icon: "🌙",
    desc: "IR-enhanced low-light detection with adaptive confidence thresholds",
    badge: "PLANNED",
  },
  {
    title: "AUDIO ALERTS",
    icon: "🔊",
    desc: "Directional speaker integration for real-time spatial audio warnings",
    badge: "PLANNED",
  },
  {
    title: "DRIVER FATIGUE AI",
    icon: "👁️",
    desc: "In-cabin eye tracking and microsleep detection via secondary camera",
    badge: "RESEARCH",
  },
];

const getBadgeColor = (status) => {
  if (status === 'COMING SOON') return 'text-[#00f5ff] border-[#00f5ff]/30 bg-[#00f5ff]/10';
  if (status === 'PLANNED') return 'text-[#ffaa00] border-[#ffaa00]/30 bg-[#ffaa00]/10';
  if (status === 'RESEARCH') return 'text-[#c084fc] border-[#c084fc]/30 bg-[#c084fc]/10';
  return 'text-slate-400 border-slate-700 bg-slate-800';
};

const FeatureCard = ({ feature, index }) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0 }
      }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className="flex flex-col p-6 bg-white/[0.02] border border-white/10 rounded-xl backdrop-blur-md hover:border-white/20 hover:bg-white/[0.04] transition-colors"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="text-3xl bg-white/5 w-12 h-12 flex items-center justify-center rounded-lg border border-white/10">
          {feature.icon}
        </div>
        <div className={`px-3 py-1 rounded-full border text-[10px] font-mono tracking-widest ${getBadgeColor(feature.badge)}`}>
          {feature.badge}
        </div>
      </div>
      <h3 className="text-lg font-bold text-white mb-3 tracking-wide">{feature.title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed flex-1">
        {feature.desc}
      </p>
    </motion.div>
  );
};

export default function FutureSection() {
  return (
    <section id="future" className="relative min-h-screen w-full bg-[#030303] pt-24 pb-12 px-4 sm:px-8 lg:px-16 flex flex-col items-center border-t border-white/5">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <div className="text-[#00f5ff] font-mono text-[12px] tracking-[0.3em] mb-4">
            ROADMAP & R&D
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white">
            Future Capabilities
          </h2>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            visible: { transition: { staggerChildren: 0.1 } }
          }}
        >
          {FEATURES.map((feature, idx) => (
            <FeatureCard key={idx} feature={feature} index={idx} />
          ))}
        </motion.div>

      </div>

      {/* Footer */}
      <footer className="w-full text-center border-t border-white/5 pt-8 mt-8">
        <div className="text-slate-500 font-mono text-xs tracking-widest mb-2">
          AIFE // AI-Based Blind Spot Risk Detection System
        </div>
        <div className="text-slate-600 font-mono text-[10px] tracking-widest">
          Built with YOLOv8 · OpenCV · React · WebSocket
        </div>
      </footer>
    </section>
  );
}
