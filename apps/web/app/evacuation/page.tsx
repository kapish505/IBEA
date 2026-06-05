"use client";

import { useIBEAStore } from "@/store/ibea-store";
import { useEffect, useState } from "react";
import { EvacuationTopology } from "@/components/lifi/EvacuationTopology";
import { ODIGVerificationFlow } from "@/components/odig/ODIGVerificationFlow";

export default function EvacuationPage() {
  const { lifiRoutes, keeperActions } = useIBEAStore();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const activeAction = keeperActions.find(a => a.status === "ODIG_VALIDATING" || a.status === "EXECUTED");

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans text-text-primary pt-24 px-6 pb-6 max-w-[1400px] mx-auto w-full">
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
        
        {/* Left: Topology map */}
        <section className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl relative">
           <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
          <div className="p-6 border-b border-white/10 bg-white/[0.01] relative z-10">
            <h2 className="text-sm tracking-[0.2em] text-neutral-400 font-medium font-sans uppercase">Cross-Chain Topology</h2>
          </div>
          <div className="flex-1 min-h-[400px] flex items-center justify-center p-6 relative z-10">
            <EvacuationTopology routes={lifiRoutes} />
          </div>
        </section>

        {/* Right: ODIG Flow & Safe Harbors */}
        <section className="space-y-8 flex flex-col">
          <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl relative flex-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
            <div className="p-6 border-b border-white/10 bg-white/[0.01] relative z-10">
              <h2 className="text-sm tracking-[0.2em] text-neutral-400 font-medium font-sans uppercase">ODIG Invariant Verification</h2>
            </div>
            <div className="flex-1 p-6 relative z-10 flex flex-col justify-center">
              {activeAction ? (
                <ODIGVerificationFlow checks={activeAction.odigChecks || []} />
              ) : (
                <div className="h-full flex items-center justify-center text-neutral-500 font-sans tracking-wide text-sm">
                  Awaiting Execution Trigger
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="p-6 border-b border-white/10 bg-white/[0.01] relative z-10">
              <h2 className="text-sm tracking-[0.2em] text-neutral-400 font-medium font-sans uppercase">Safe Harbor Configuration</h2>
            </div>
            <div className="p-6 relative z-10 space-y-3">
               <div className="flex justify-between items-center text-sm font-sans tracking-wide p-4 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.06] transition-colors shadow-inner">
                 <div className="flex flex-col">
                   <span className="text-white font-medium">Ethereum Mainnet</span>
                   <a href="https://etherscan.io/address/0x0000000000000000000000000000000000000000" target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 hover:underline mt-1">View Vault Contract</a>
                 </div>
                 <span className="text-emerald-400 font-medium text-xs tracking-widest px-3 py-1 bg-emerald-400/10 rounded-full border border-emerald-400/20 shadow-[0_0_15px_rgba(52,211,153,0.2)]">APPROVED</span>
               </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
