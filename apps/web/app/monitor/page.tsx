"use client";

import { ThreatVectorMatrix } from "@/components/threat/ThreatVectorMatrix";
import { KeeperOrchestrationPanel } from "@/components/keeper/KeeperOrchestrationPanel";
import { SemanticEvidenceTimeline } from "@/components/semantic/SemanticEvidenceTimeline";
import { ArchitectureFlowTrace } from "@/components/architecture/ArchitectureFlowTrace";
import { useIBEAStore } from "@/store/ibea-store";
import { useEffect, useState } from "react";

export default function MonitorPage() {
  const { escalationState, protocols } = useIBEAStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans text-text-primary pt-24 px-6 pb-6 max-w-[1400px] mx-auto w-full">
      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-8rem)] overflow-hidden">
        


        {/* Left Panel: Threat Vector Matrix */}
        <section className="col-span-1 md:col-span-4 bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-2xl flex flex-col shadow-2xl relative overflow-hidden">
          <div className="p-5 border-b border-white/10 bg-white/[0.01] flex justify-between items-center relative z-10">
            <h2 className="text-sm tracking-[0.2em] text-neutral-400 font-medium font-sans uppercase">Global Threat Topology</h2>
            <span className="text-xs font-mono px-3 py-1 bg-white/10 border border-white/20 rounded-full text-white backdrop-blur-md">
              STATE: {escalationState}
            </span>
          </div>
          <div className="flex-1 p-4 flex items-center justify-center relative z-10">
             <ThreatVectorMatrix />
          </div>
          {/* Subtle glowing orb behind the matrix to give it that expensive 3D feel */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
        </section>

        {/* Center Panel: Architecture Trace & Keeper Actions */}
        <section className="col-span-1 md:col-span-4 flex flex-col gap-6 h-full">
          <div className="flex-[3] bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 bg-white/[0.01] flex items-center justify-between">
              <h2 className="text-sm tracking-[0.2em] text-neutral-400 font-medium font-sans uppercase">
                Architecture Trace
              </h2>
            </div>
            <ArchitectureFlowTrace />
          </div>
          
          <div className="flex-[2] bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 bg-white/[0.01]">
              <h2 className="text-sm tracking-[0.2em] text-neutral-400 font-medium font-sans uppercase">Keeper Orchestration</h2>
            </div>
            <KeeperOrchestrationPanel />
          </div>
        </section>

        {/* Right Panel: Semantic Evidence */}
        <section className="col-span-1 md:col-span-4 flex flex-col h-full">
          <div className="flex-1 bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 bg-white/[0.01]">
              <h2 className="text-sm tracking-[0.2em] text-neutral-400 font-medium font-sans uppercase">Semantic Evidence Timeline</h2>
            </div>
            <SemanticEvidenceTimeline />
          </div>
        </section>

      </main>
    </div>
  );
}
