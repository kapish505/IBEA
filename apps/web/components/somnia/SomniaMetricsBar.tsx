import { useIBEAStore } from "@/store/ibea-store";
import { useEffect, useState } from "react";

export function SomniaMetricsBar() {
  const { somniaMetrics } = useIBEAStore();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="flex items-center gap-6 px-4 py-2 border-y border-border bg-base-1 font-mono text-xs">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
        <span className="text-text-secondary">SOMNIA SHANNON</span>
      </div>
      
      <div className="h-4 w-px bg-border" />
      
      <div className="flex items-center gap-4 text-text-tertiary">
        <span>BLOCK: <span className="text-text-primary">{somniaMetrics?.latestBlock?.toString() || "—"}</span></span>
        <span>LATENCY: <span className="text-text-primary">{somniaMetrics?.avgBlockTimeMs ? `${somniaMetrics.avgBlockTimeMs}ms` : "—"}</span></span>
        <span>FINALITY: <span className="text-text-primary">{somniaMetrics?.finalityMs ? `${somniaMetrics.finalityMs}ms` : "—"}</span></span>
      </div>
    </div>
  );
}
