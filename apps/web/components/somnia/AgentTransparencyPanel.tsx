import { useIBEAStore, AgentResult } from "@/store/ibea-store";
import { useState } from "react";

export function AgentTransparencyPanel() {
  const agentResults = useIBEAStore(s => s.agentResults);
  const [selectedResult, setSelectedResult] = useState<AgentResult | null>(null);

  if (agentResults.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-xs font-mono p-4 text-center gap-3">
        <div className="w-8 h-8 rounded-full border border-white/20 border-t-blue-500 animate-spin" />
        Awaiting Native AgentManager Callbacks...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="absolute top-2 right-4 z-10">
        <button 
          onClick={useIBEAStore.getState().clearAgentResults}
          className="text-[10px] uppercase font-mono tracking-widest text-white/40 hover:text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-1 transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 pt-10 flex flex-col gap-3 custom-scrollbar">
        {agentResults.map((res, i) => (
          <div 
            key={`${res.taskId}-${i}`} 
            onClick={() => setSelectedResult(res)}
            className="p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 hover:border-blue-500/50 transition-all flex flex-col gap-2 group relative overflow-hidden shrink-0"
          >
            {/* Glossy gradient highlight */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/0 via-blue-500/0 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="flex justify-between items-center relative z-10">
              <span className="text-xs font-mono font-bold text-blue-400">
                {res.workflow === 'ADM_METRIC' ? 'JSON API AGENT' : res.workflow === 'ADM_SEMANTIC' ? 'LLM INFERENCE AGENT' : 'WEBSITE PARSE AGENT'}
              </span>
              <span className="text-[10px] text-white/40">{new Date(res.timestamp).toLocaleTimeString()}</span>
            </div>
            
            <div className="text-[10px] text-white/70 font-mono relative z-10 flex flex-col gap-2 mt-1">
              <div className="flex justify-between items-center">
                <span className="truncate flex-1">Task ID: {res.taskId}</span>
              </div>
              <div className="flex flex-wrap gap-1 items-end mt-1">
                {res.requestTxHash && (
                  <a 
                    href={`https://shannon-explorer.somnia.network/tx/${res.requestTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 border border-purple-500/30 px-1.5 py-0.5 rounded bg-purple-500/10 transition-colors shrink-0 w-fit"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Invoking Tx ↗
                  </a>
                )}
                {res.txHash && (
                  <a 
                    href={`https://shannon-explorer.somnia.network/tx/${res.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 border border-blue-500/30 px-1.5 py-0.5 rounded bg-blue-500/10 transition-colors shrink-0 w-fit"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Completion Tx ↗
                  </a>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-1 w-full relative z-10 mt-1">
              <span className="text-[9px] text-white/40 uppercase tracking-wider">Input Prompt</span>
              <div className="text-[10px] text-white/60 font-mono bg-black/20 p-2 rounded border border-white/5 whitespace-pre-wrap break-words leading-relaxed max-h-[80px] overflow-y-auto custom-scrollbar">
                {res.taskData || "N/A"}
              </div>
            </div>

            <div className="flex flex-col gap-1 w-full relative z-10 mt-1">
              <span className="text-[9px] text-green-400/60 uppercase tracking-wider">Agent Output</span>
              <div className="text-[10px] text-green-400/80 font-mono bg-black/40 p-2 rounded border border-green-500/20 whitespace-pre-wrap break-words leading-relaxed min-h-[40px] max-h-[80px] overflow-y-auto custom-scrollbar">
                {res.result ? res.result.replace(/\n/g, ' ') : "Awaiting Output..."}
              </div>
            </div>
            
            <div className="text-[10px] text-blue-400/50 group-hover:text-blue-400 mt-2 uppercase tracking-wider text-right relative z-10 flex items-center justify-end gap-1">
              <span>View Full Payload</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
        ))}
      </div>

      {selectedResult && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedResult(null)}
        >
          <div 
            className="bg-[#0f0f13] border border-white/10 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/[0.02] flex justify-between items-center shrink-0 relative z-10">
              <div className="min-w-0 pr-4">
                <h3 className="font-mono text-sm tracking-widest uppercase text-blue-400 font-bold">
                  Native Agent Raw Log
                </h3>
                <p className="text-[10px] text-white/40 font-mono mt-1 truncate">
                  Task ID: {selectedResult.taskId}
                </p>
              </div>
              <button 
                onClick={() => setSelectedResult(null)}
                className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#0a0a0a] relative z-10 custom-scrollbar">
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedResult.requestTxHash && (
                  <a 
                    href={`https://shannon-explorer.somnia.network/tx/${selectedResult.requestTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 transition-colors text-xs font-mono"
                  >
                    View Invoking Tx ↗
                  </a>
                )}
                {selectedResult.txHash && (
                  <a 
                    href={`https://shannon-explorer.somnia.network/tx/${selectedResult.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors text-xs font-mono"
                  >
                    View Completion Tx ↗
                  </a>
                )}
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-white/50 uppercase tracking-widest font-bold">Input Prompt</span>
                  <pre className="font-mono text-xs text-white/80 whitespace-pre-wrap break-words leading-relaxed bg-white/5 p-3 rounded border border-white/10 selection:bg-white/20">
                    {selectedResult.taskData || "N/A"}
                  </pre>
                </div>
                
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-green-500/70 uppercase tracking-widest font-bold">Agent Output</span>
                  <pre className="font-mono text-xs text-green-400 whitespace-pre-wrap break-words leading-relaxed bg-green-500/5 p-3 rounded border border-green-500/20 selection:bg-green-500/30 selection:text-green-200">
                    {selectedResult.result}
                  </pre>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-blue-500/5 border-t border-blue-500/20 text-center shrink-0 relative z-10">
              <p className="text-[10px] text-blue-400/70 uppercase tracking-[0.3em] font-medium flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Verified On-Chain via Somnia AgentManager
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
