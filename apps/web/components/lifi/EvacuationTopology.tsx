'use client';

import type { BoundedLiFiRoute } from "@ibea/shared";
import { motion, AnimatePresence } from "framer-motion";

export function EvacuationTopology({ routes }: { routes: BoundedLiFiRoute[] }) {
  if (routes.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="flex flex-col items-center justify-center text-text-tertiary font-mono text-sm space-y-6"
      >
        <div className="relative flex items-center justify-center">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }} 
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-24 h-24 rounded-full border border-text-tertiary/20"
          />
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="relative"
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="12" cy="12" r="10" strokeDasharray="4 4" />
              <path d="M12 2L12 22M2 12L22 12" opacity="0.3" />
            </svg>
          </motion.div>
          <div className="absolute w-2 h-2 rounded-full bg-text-tertiary/50" />
        </div>
        <motion.p 
          animate={{ opacity: [0.5, 1, 0.5] }} 
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="tracking-widest"
        >
          AWAITING EVACUATION ROUTES...
        </motion.p>
      </motion.div>
    );
  }

  const route = routes[0]; // visualize primary route for now

  return (
    <div className="w-full h-full flex items-center justify-center relative font-mono text-sm">
      <div className="flex items-center gap-16">
        
        {/* Source */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full border border-border bg-base-2 flex items-center justify-center text-xs">
             Somnia
          </div>
          <span className="text-text-secondary text-xs">Source</span>
        </div>

        {/* Bridge Line */}
        <div className="relative w-32 h-px bg-border">
           <motion.div 
             className="absolute top-1/2 left-0 h-0.5 w-8 bg-semantic -translate-y-1/2"
             animate={{ x: [0, 100] }}
             transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
           />
           <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-text-tertiary">
             {route.bridgeName}
           </div>
        </div>

        {/* Destination */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full border border-safe bg-safe/10 flex items-center justify-center text-xs text-safe-text">
             Safe Harbor
          </div>
          <span className="text-text-secondary text-xs">Chain {route.toChainId}</span>
        </div>

      </div>
    </div>
  );
}
