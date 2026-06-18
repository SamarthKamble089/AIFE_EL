import React from 'react';
import { SimulationProvider } from './contexts/SimulationContext';
import Navbar from './components/layout/Navbar';
import HeroSection from './components/sections/HeroSection';
import LiveMonitorSection from './components/sections/LiveMonitorSection';
import BlindZoneSection from './components/sections/BlindZoneSection';
import PipelineSection from './components/sections/PipelineSection';
import AnalyticsSection from './components/sections/AnalyticsSection';
import FutureSection from './components/sections/FutureSection';

/**
 * App
 * ---
 * Root composition. SimulationProvider streams synthetic YOLOv8-shaped
 * telemetry into context; App renders the new multi-section scrollable
 * layout underneath a fixed Navbar.
 */
export default function App() {
  return (
    <SimulationProvider>
      <div className="bg-[#000000] text-slate-200 font-mono min-h-screen relative overflow-x-hidden">
        <Navbar />
        <main>
          <HeroSection />
          <LiveMonitorSection />
          <BlindZoneSection />
          <PipelineSection />
          <AnalyticsSection />
          <FutureSection />
        </main>
      </div>
    </SimulationProvider>
  );
}
