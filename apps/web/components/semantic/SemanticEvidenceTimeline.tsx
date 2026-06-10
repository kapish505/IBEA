import { useIBEAStore } from "@/store/ibea-store";

export function SemanticEvidenceTimeline() {
  const { escalations, clearEscalations } = useIBEAStore();

  if (escalations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-tertiary font-mono text-sm p-4 text-center">
        AWAITING_SEMANTIC_BURST
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="absolute top-2 right-4 z-10">
        <button 
          onClick={clearEscalations}
          className="text-[10px] uppercase font-mono tracking-widest text-white/40 hover:text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-1 transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-10 custom-scrollbar">
        {escalations.map((esc, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center flex-shrink-0">
               <div className="w-2 h-2 rounded-full bg-semantic mt-1" />
               {i !== escalations.length - 1 && <div className="w-px h-full bg-border mt-2" />}
            </div>
            <div className="flex-1 pb-6">
              <div className="flex justify-between items-center text-xs font-mono">
                 <span className="text-text-tertiary">
                   {new Date(esc.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }) + '.' + new Date(esc.timestamp).getMilliseconds().toString().padStart(3, '0')}
                 </span>
                 <span className={`px-2 py-0.5 rounded-sm border ${
                   esc.severity === 'CRITICAL' ? 'bg-semantic/10 border-semantic/30 text-semantic-text' :
                   'bg-blue-500/10 border-blue-500/30 text-blue-400'
                 }`}>
                   {esc.severity} - {esc.type}
                 </span>
              </div>
              <div className="mt-1 text-sm font-inter text-text-primary">
                <span className="font-semibold">{esc.title}</span>: {esc.description}
              </div>
              {esc.txHash && (
                <a 
                  href={`https://shannon-explorer.somnia.network/tx/${esc.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 text-xs font-mono text-text-tertiary hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1 underline decoration-border-subtle hover:decoration-white"
                >
                  TX: {esc.txHash.slice(0, 8)}...{esc.txHash.slice(-6)}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
