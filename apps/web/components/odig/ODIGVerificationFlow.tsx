'use client';

import type { ODIGCheckResult } from "@ibea/shared";
import { motion, AnimatePresence } from "framer-motion";

export function ODIGVerificationFlow({ checks }: { checks: ODIGCheckResult[] }) {
  // If no checks provided, we assume we are waiting
  if (checks.length === 0) {
     return (
       <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-text-tertiary font-mono text-sm space-y-4">
         <motion.div 
           className="flex gap-2"
           initial="initial"
           animate="animate"
           variants={{
             animate: { transition: { staggerChildren: 0.2 } }
           }}
         >
           {[0, 1, 2].map(i => (
             <motion.div 
               key={i}
               variants={{
                 initial: { y: 0, opacity: 0.3 },
                 animate: { y: [-4, 4, -4], opacity: [0.3, 1, 0.3] }
               }}
               transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
               className="w-1.5 h-1.5 bg-text-tertiary rounded-full"
             />
           ))}
         </motion.div>
         <motion.div 
           animate={{ opacity: [0.5, 1, 0.5] }} 
           transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
           className="tracking-widest"
         >
           STANDBY FOR INVARIANTS
         </motion.div>
       </div>
     );
  }

  return (
    <div className="space-y-3 font-mono text-sm">
      <AnimatePresence>
        {checks.map((check, index) => (
          <motion.div
            key={check.check}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.2, type: "spring", stiffness: 300, damping: 20 }}
            className={`flex items-center justify-between p-2 rounded-sm border ${
              check.passed ? "bg-safe/10 border-safe/30" : "bg-critical/10 border-critical/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${check.passed ? "bg-safe" : "bg-critical"}`} />
              <span className="text-text-secondary">{check.check}</span>
            </div>
            <span className={check.passed ? "text-safe-text" : "text-critical-text"}>
              {check.passed ? "PASS" : "FAIL"}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
