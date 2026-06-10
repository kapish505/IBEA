import { useIBEAStore } from "@/store/ibea-store";
import { motion, AnimatePresence } from "framer-motion";

export function ActionExecutorPanel() {
  const { keeperActions, lifiRoutes } = useIBEAStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'EXECUTED': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'EXECUTING': return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
      case 'ACTIVE': return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
      case 'QUEUED': return 'text-neutral-400 border-neutral-700 bg-neutral-900/50';
      case 'PENDING': return 'text-neutral-400 border-neutral-700 bg-neutral-900/50';
      case 'FAILED': return 'text-red-400 border-red-500/30 bg-red-500/10';
      default: return 'text-white border-white/20 bg-white/5';
    }
  };

  const getChainName = (id: number) => {
    if (id === 1) return 'Ethereum';
    if (id === 8453) return 'Base';
    if (id === 5003) return 'Mantle';
    return `Chain ${id}`;
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0 relative p-4 space-y-4 font-mono text-xs custom-scrollbar">
      <div className="absolute top-2 right-4 z-10">
        <button 
          onClick={() => {
            useIBEAStore.getState().clearKeeperActions();
            useIBEAStore.getState().clearLifiRoutes();
          }}
          className="text-[10px] uppercase font-mono tracking-widest text-white/40 hover:text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-1 transition-colors"
        >
          Clear
        </button>
      </div>

      {keeperActions.length === 0 && lifiRoutes.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-neutral-500 font-sans text-sm p-4 text-center tracking-wide h-full">
          No execution payload active. System is Nominal.
        </div>
      )}

      <AnimatePresence initial={false}>
        {/* Render Keeper Actions */}
        {keeperActions.map((action) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="flex flex-col gap-2 p-3 rounded-lg border border-white/10 bg-white/5 relative overflow-hidden"
          >
            {action.status === 'EXECUTING' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            )}
            
            <div className="flex justify-between items-center">
              <span className="font-bold text-blue-400 tracking-wider">ON-CHAIN ACTION EXECUTOR</span>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${getStatusColor(action.status)}`}>
                {action.status}
              </span>
            </div>
            
            <div className="flex flex-col gap-1 text-white/70">
              <div className="flex justify-between">
                <span>Strategy:</span>
                <span className="text-white font-bold">{action.strategy}</span>
              </div>
              <div className="flex justify-between">
                <span>Timestamp:</span>
                <span>{new Date(action.timestamp).toLocaleTimeString()}</span>
              </div>
              {action.txHash && (
                <div className="flex justify-between items-center mt-1">
                  <span>Transaction:</span>
                  <a 
                    href={`https://shannon-explorer.somnia.network/tx/${action.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors underline decoration-blue-500/30"
                  >
                    {action.txHash.slice(0, 10)}...{action.txHash.slice(-8)} ↗
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Render LiFi Routes (Money Location) */}
        {lifiRoutes.map((route) => (
          <motion.div
            key={route.id}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="flex flex-col gap-2 p-3 rounded-lg border border-white/10 bg-white/5 relative overflow-hidden mt-4"
          >
            {route.status === 'ACTIVE' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            )}
            
            <div className="flex justify-between items-center">
              <span className="font-bold text-emerald-400 tracking-wider">LI.FI CROSS-CHAIN RELAY</span>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${getStatusColor(route.status)}`}>
                {route.status}
              </span>
            </div>

            <div className="flex flex-col gap-1 text-white/70">
              <div className="flex items-center justify-between bg-black/20 p-2 rounded border border-white/5">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-white/40 uppercase">Origin</span>
                  <span className="font-bold text-white">{getChainName(route.fromChainId)}</span>
                </div>
                <div className="flex flex-col items-center flex-1 px-4 text-white/30">
                  <span className="text-[10px] mb-1">{route.bridgeProvider}</span>
                  <div className="w-full h-px bg-white/20 relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1.5 h-1.5 border-t border-r border-white/40 rotate-45" />
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-white/40 uppercase">Destination</span>
                  <span className="font-bold text-emerald-400">{getChainName(route.toChainId)}</span>
                </div>
              </div>

              <div className="flex justify-between mt-2">
                <span>Value Escaping:</span>
                <span className="text-white font-bold">{route.fromAmount} {route.fromToken}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Time:</span>
                <span>{Math.ceil(route.estimatedTime / 60)} minutes</span>
              </div>
              
              {/* LI.FI Transparency Info */}
              {route.decisionContext && (
                <div className="mt-2 p-2 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-300/80 leading-relaxed">
                  <span className="font-bold text-blue-400 block mb-1">TRANSPARENCY CONTEXT:</span>
                  {route.decisionContext}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
