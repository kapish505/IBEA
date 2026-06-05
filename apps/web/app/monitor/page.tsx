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
  const [autoExecute, setAutoExecute] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fetch initial status from telemetry
    fetch("http://localhost:3001/api/settings/auto-escalate")
      .then(res => res.json())
      .then(data => setAutoExecute(data.enabled))
      .catch(err => console.error("Failed to fetch auto-execute status", err));
  }, []);

  const toggleAutoExecute = async () => {
    const newState = !autoExecute;
    setAutoExecute(newState);
    try {
      await fetch("http://localhost:3001/api/settings/auto-escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newState })
      });
    } catch (err) {
      console.error("Failed to update auto-execute status", err);
      setAutoExecute(!newState); // revert on error
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans text-text-primary pt-24 px-6 pb-6 max-w-[1400px] mx-auto w-full">
      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-8rem)] overflow-hidden">
        


        {/* Left Panel: Threat Vector Matrix */}
        <section className="col-span-1 md:col-span-4 bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-2xl flex flex-col shadow-2xl relative overflow-hidden min-h-0">
          <div className="p-5 border-b border-white/10 bg-white/[0.01] flex justify-between items-center relative z-10 shrink-0">
            <h2 className="text-sm tracking-[0.2em] text-neutral-400 font-medium font-sans uppercase">Global Threat Topology</h2>
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleAutoExecute}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-mono transition-colors ${
                  autoExecute 
                    ? 'bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                    : 'bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${autoExecute ? 'bg-red-500 animate-pulse' : 'bg-neutral-500'}`} />
                AUTO-EXECUTE {autoExecute ? 'ON' : 'OFF'}
              </button>
              <span className="text-xs font-mono px-3 py-1 bg-white/10 border border-white/20 rounded-full text-white backdrop-blur-md">
                STATE: {escalationState}
              </span>
            </div>
          </div>
          <div className="flex-1 p-4 flex flex-col relative z-10 min-h-0">
             <ThreatVectorMatrix />
          </div>
          {/* Subtle glowing orb behind the matrix to give it that expensive 3D feel */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
        </section>

        {/* Center Panel: Architecture Trace & Keeper Actions */}
        <section className="col-span-1 md:col-span-4 flex flex-col gap-6 h-full min-h-0">
          <div className="flex-[3] basis-0 bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl min-h-0">
            <div className="p-4 border-b border-white/10 bg-white/[0.01] flex items-center justify-between shrink-0">
              <h2 className="text-sm tracking-[0.2em] text-neutral-400 font-medium font-sans uppercase">
                Architecture Trace
              </h2>
            </div>
            <ArchitectureFlowTrace />
          </div>
          
          <div className="flex-[2] basis-0 bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl min-h-0">
            <div className="p-4 border-b border-white/10 bg-white/[0.01] shrink-0">
              <h2 className="text-sm tracking-[0.2em] text-neutral-400 font-medium font-sans uppercase">Keeper Orchestration</h2>
            </div>
            <KeeperOrchestrationPanel />
          </div>
        </section>

        {/* Right Panel: Semantic Evidence */}
        <section className="col-span-1 md:col-span-4 flex flex-col h-full min-h-0">
          <div className="flex-1 basis-0 bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl min-h-0">
            <div className="p-4 border-b border-white/10 bg-white/[0.01] shrink-0">
              <h2 className="text-sm tracking-[0.2em] text-neutral-400 font-medium font-sans uppercase">Semantic Evidence Timeline</h2>
            </div>
            <SemanticEvidenceTimeline />
          </div>
        </section>

      </main>
    </div>
  );
}
