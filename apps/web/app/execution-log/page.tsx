"use client";

import { useIBEAStore } from "@/store/ibea-store";
import { useEffect, useState } from "react";

export default function ExecutionLogPage() {
  const { keeperActions } = useIBEAStore();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans text-text-primary pt-24 px-6 pb-12 max-w-5xl mx-auto w-full">
      <main className="flex-1 w-full space-y-12">
        <header className="space-y-4 border-b border-white/10 pb-8">
          <h1 className="text-4xl font-display font-semibold tracking-tight text-white drop-shadow-lg">Execution Log</h1>
          <p className="text-lg text-neutral-400 font-light max-w-2xl">
            Institutional-grade audit trail of all semantic bursts, invariant checks, and cross-chain KeeperHub execution actions.
          </p>
        </header>

        <div className="space-y-4">
          {keeperActions.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 font-sans text-lg tracking-wide border border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-2xl shadow-xl">
              No execution events recorded. IBEA is actively monitoring.
            </div>
          ) : (
            keeperActions.map((action, i) => (
              <div key={i} className="p-6 border border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.04] transition-all shadow-xl hover:shadow-white/5 cursor-default group relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-4">
                    <span className="text-neutral-500 font-mono text-sm">{new Date(action.timestamp).toLocaleString()}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase border ${
                      action.status === 'EXECUTED' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20 shadow-[0_0_15px_rgba(52,211,153,0.15)]' : 
                      action.status === 'FROZEN' ? 'bg-red-400/10 text-red-400 border-red-400/20 shadow-[0_0_15px_rgba(248,113,113,0.15)]' : 
                      'bg-white/5 text-neutral-300 border-white/10'
                    }`}>
                      {action.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-neutral-500 uppercase tracking-widest">Protocol ID</span>
                      <span className="font-mono text-sm text-neutral-200">{action.protocolId}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-neutral-500 uppercase tracking-widest">Selected Strategy</span>
                      <span className="font-mono text-sm text-neutral-200">{action.strategy}</span>
                    </div>
                  </div>
                </div>

                {action.txHash && (
                  <div className="md:w-1/3 flex flex-col gap-2 p-4 bg-black/40 border border-white/5 rounded-xl shadow-inner">
                    <span className="text-xs text-neutral-500 uppercase tracking-widest">Transaction Hash</span>
                    <a 
                      href={`https://shannon-explorer.somnia.network/tx/${action.txHash}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-mono truncate underline decoration-blue-500/30 hover:decoration-blue-400 inline-flex items-center gap-1"
                    >
                      {action.txHash}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
