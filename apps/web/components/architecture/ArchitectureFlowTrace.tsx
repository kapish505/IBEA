import { useIBEAStore } from "@/store/ibea-store";
import { motion, AnimatePresence } from "framer-motion";

export function ArchitectureFlowTrace() {
  const { architectureLogs } = useIBEAStore();

  const getLayerColor = (layer: string) => {
    switch (layer) {
      case 'LAYER_1': return 'text-neutral-400 border-neutral-700 bg-neutral-900/50';
      case 'LAYER_2': return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
      case 'LAYER_3': return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
      case 'LAYER_4': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      default: return 'text-white border-white/20 bg-white/5';
    }
  };

  const getLayerLabel = (layer: string) => {
    switch (layer) {
      case 'LAYER_1': return 'JSON API AGENT';
      case 'LAYER_2': return 'LLM INFERENCE VALIDATOR';
      case 'LAYER_3': return 'ON-CHAIN ACTION EXECUTOR';
      case 'LAYER_4': return 'SRO KEEPER HUB';
      default: return layer;
    }
  };

  if (architectureLogs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-500 font-sans text-sm p-4 text-center tracking-wide">
        System idling. Awaiting on-chain threshold trigger...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
      <AnimatePresence initial={false}>
        {architectureLogs.map((log) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="flex flex-col gap-1"
          >
            <div className="flex items-center gap-3">
              <span className="text-neutral-500">
                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }) + '.' + new Date(log.timestamp).getMilliseconds().toString().padStart(3, '0')}
              </span>
              <span className={`px-2 py-0.5 rounded-sm border text-[10px] uppercase tracking-wider ${getLayerColor(log.layer)}`}>
                {getLayerLabel(log.layer)}
              </span>
            </div>
            <div className="pl-[76px] flex flex-col gap-1">
              <span className={
                log.status === 'FAIL' ? 'text-semantic-text' : 
                log.status === 'SUCCESS' ? 'text-emerald-400' : 'text-neutral-300'
              }>
                {log.message}
              </span>
              {log.txHash && (
                <a 
                  href={`https://shannon-explorer.somnia.network/tx/${log.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-500 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1 underline decoration-neutral-700 hover:decoration-white"
                >
                  TX: {log.txHash.slice(0, 10)}...{log.txHash.slice(-6)}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
