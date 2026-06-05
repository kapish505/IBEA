import { motion, AnimatePresence } from "framer-motion";
import { useIBEAStore } from "@/store/ibea-store";

export function SemanticBurstOverlay() {
  const { escalationState } = useIBEAStore();

  return (
    <AnimatePresence>
      {escalationState === "SEMANTIC_BURST" && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-base-0/80 backdrop-blur-md flex flex-col items-center justify-center font-mono"
        >
          <div className="max-w-2xl w-full p-8 border border-border bg-base-1 rounded-sm shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-semantic/5 animate-pulse" />
            
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="w-3 h-3 rounded-full bg-semantic animate-ping" />
                <h2 className="text-xl text-semantic-text uppercase tracking-widest">Semantic Burst Active</h2>
              </div>
              
              <div className="space-y-4 text-sm text-text-secondary">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                  &gt; Anomaly Detected
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
                  &gt; Semantic Burst Triggered
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2 }}>
                  &gt; Website Parse Agent Activated
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.7 }}>
                  &gt; Validator Consensus Running...
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2.5 }}>
                  &gt; Threat Vectors Updated
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 3.0 }} className="text-safe-text">
                  &gt; Keeper Escalation Authorized
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
