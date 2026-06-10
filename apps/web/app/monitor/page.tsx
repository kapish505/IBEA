"use client";

import { ThreatVectorMatrix } from "@/components/threat/ThreatVectorMatrix";
import { ActionExecutorPanel } from "@/components/somnia/ActionExecutorPanel";
import { SemanticEvidenceTimeline } from "@/components/semantic/SemanticEvidenceTimeline";
import { ArchitectureFlowTrace } from "@/components/architecture/ArchitectureFlowTrace";
import { AgentTransparencyPanel } from "@/components/somnia/AgentTransparencyPanel";
import { useIBEAStore } from "@/store/ibea-store";
import { useEffect, useState } from "react";

import { SettingsMenu } from "@/components/SettingsMenu";

export default function MonitorPage() {
  const { escalationState, protocols, authorizedAssetCount } = useIBEAStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const displayState = authorizedAssetCount === 0 ? 'STANDBY (UNAUTHORIZED)' : escalationState;

  return (
    <div className="h-screen overflow-hidden bg-transparent flex flex-col font-sans text-text-primary pt-24 px-6 pb-6 max-w-[1400px] mx-auto w-full">
      <main className="flex-1 flex flex-col gap-6 min-h-0">
        
        <SettingsMenu />

        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[600px] min-h-0 overflow-hidden">


        {/* Left Panel: Architecture Trace */}
        <section className="col-span-1 md:col-span-4 flex flex-col gap-6 h-full min-h-0">
          <div className="flex-1 basis-0 bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl min-h-0">
            <div className="p-4 border-b border-white/10 bg-white/[0.01] flex items-center justify-between shrink-0">
              <h2 className="text-sm tracking-[0.2em] text-neutral-400 font-medium font-sans uppercase">
                Architecture Trace
              </h2>
            </div>
            <ArchitectureFlowTrace />
          </div>
        </section>

        {/* Center Panel: Global Threat Topology & Active Execution Route */}
        <section className="col-span-1 md:col-span-4 flex flex-col gap-6 h-full min-h-0">
          <div className="flex-[3] basis-0 bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-2xl flex flex-col shadow-2xl relative overflow-hidden min-h-0">
            <div className="p-5 border-b border-white/10 bg-white/[0.01] flex justify-between items-center relative z-10 shrink-0">
              <h2 className="text-sm tracking-[0.2em] text-neutral-400 font-medium font-sans uppercase">Global Threat Topology</h2>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono px-3 py-1 bg-white/10 border border-white/20 rounded-full text-white backdrop-blur-md">
                  STATE: {displayState}
                </span>
              </div>
            </div>
            <div className="flex-1 p-4 flex flex-col relative z-10 min-h-0">
               <ThreatVectorMatrix />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
          </div>

          <div className="flex-[2] basis-0 bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl min-h-0">
            <div className="p-4 border-b border-white/10 bg-white/[0.01] shrink-0">
              <h2 className="text-sm tracking-[0.2em] text-neutral-400 font-medium font-sans uppercase">Active Execution Route</h2>
            </div>
            <ActionExecutorPanel />
          </div>
        </section>

        {/* Right Panel: Semantic Evidence & Agent Transparency */}
        <section className="col-span-1 md:col-span-4 flex flex-col gap-6 h-full min-h-0">
          <div className="flex-[3] basis-0 bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl min-h-0">
            <div className="p-4 border-b border-white/10 bg-white/[0.01] shrink-0">
              <h2 className="text-sm tracking-[0.2em] text-neutral-400 font-medium font-sans uppercase">Native Agent Transparency</h2>
            </div>
            <AgentTransparencyPanel />
          </div>
          <div className="flex-[2] basis-0 bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl min-h-0">
            <div className="p-4 border-b border-white/10 bg-white/[0.01] shrink-0">
              <h2 className="text-sm tracking-[0.2em] text-neutral-400 font-medium font-sans uppercase">Semantic Evidence Timeline</h2>
            </div>
            <SemanticEvidenceTimeline />
          </div>
        </section>

        </div>
      </main>
    </div>
  );
}
