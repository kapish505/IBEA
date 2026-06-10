"use client";

import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { motion } from "framer-motion";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";


// ─── Hero ────────────────────────────────────────────────────────────────────
const HeroTitle = () => (
  <div className="text-center mix-blend-difference">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="text-5xl md:text-7xl font-bold tracking-tighter text-white font-display leading-[1.05]"
    >
      Autonomous Defense<br />
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 via-neutral-400 to-neutral-600">
        Infrastructure
      </span>
    </motion.h1>
  </div>
);

// ... keeping Diagrams the same ...


// ─── Diagram 1: The 3 Agents of Somnia ───────────────────────────────────────
const SomniaAgentsDiagram = () => (
  <div className="w-full aspect-square md:aspect-[4/3] rounded-2xl bg-[#0a0a0a] border border-white/10 relative overflow-hidden flex items-center justify-center p-6 shadow-2xl">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    
    <div className="relative z-10 w-full flex flex-col gap-6 max-w-sm">
      {/* Tier 1 */}
      <div className="flex items-center gap-4 bg-neutral-900/80 border border-white/10 p-4 rounded-xl relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-mono text-xs border border-emerald-500/30">T1</div>
        <div className="flex-1">
          <div className="text-xs font-mono text-neutral-400">JSON API Agent</div>
          <div className="text-[10px] text-neutral-500 mt-1">Triggered by Consensus • Fetches Real TVL, Bridge & Relayer Health</div>
        </div>
        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-2 h-2 rounded-full bg-emerald-500" />
      </div>

      {/* Connection */}
      <div className="flex justify-center -my-3 z-0">
        <motion.div className="w-[1px] h-6 bg-gradient-to-b from-emerald-500 to-amber-500" />
      </div>

      {/* Tier 2 */}
      <div className="flex items-center gap-4 bg-neutral-900/80 border border-white/10 p-4 rounded-xl relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-mono text-xs border border-amber-500/30">T2</div>
        <div className="flex-1">
          <div className="text-xs font-mono text-neutral-400">Website Parse Agent</div>
          <div className="text-[10px] text-neutral-500 mt-1">Governance & GitHub Scraper • Contextual Verification</div>
        </div>
        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.5, delay: 0.5, repeat: Infinity }} className="w-2 h-2 rounded-full bg-amber-500" />
      </div>

      {/* Connection */}
      <div className="flex justify-center -my-3 z-0">
        <motion.div className="w-[1px] h-6 bg-gradient-to-b from-amber-500 to-red-500" />
      </div>

      {/* Tier 3 */}
      <div className="flex items-center gap-4 bg-neutral-900/80 border border-white/10 p-4 rounded-xl relative overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.1)]">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 font-mono text-xs border border-red-500/30">T3</div>
        <div className="flex-1">
          <div className="text-xs font-mono text-neutral-400">LLM Inference Agent</div>
          <div className="text-[10px] text-neutral-500 mt-1">Deterministic Reasoning • Classifies Path (Fast/Slow)</div>
        </div>
        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="w-2 h-2 rounded-full bg-red-500" />
      </div>
    </div>
  </div>
);

// ─── Diagram 2: Escalation Gate ──────────────────────────────────────────────
const EscalationDiagram = () => (
  <div className="w-full aspect-square md:aspect-[4/3] rounded-2xl bg-[#0a0a0a] border border-white/10 relative overflow-hidden flex items-center justify-center p-8 shadow-2xl">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    
    <div className="relative z-10 w-full flex items-center justify-center gap-8">
      <div className="flex flex-col gap-6">
        {['DefiLlama', 'Forta', 'Hypernative'].map((name, i) => (
          <div key={name} className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-md border border-white/10 bg-black text-xs font-mono text-neutral-400 w-28 text-center shadow-lg">
              {name}
            </div>
            <div className="w-12 md:w-20 h-px bg-neutral-800 relative">
              <motion.div 
                className="absolute top-1/2 left-0 w-6 h-[2px] bg-emerald-400 -translate-y-1/2 shadow-[0_0_10px_#34d399]"
                animate={{ x: [0, 80] }}
                transition={{ duration: 1, delay: i * 0.3, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border border-emerald-400/50 bg-black/80 flex items-center justify-center shadow-[0_0_40px_rgba(52,211,153,0.15)] relative">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2 border-2 border-dashed border-emerald-400/30 rounded-full"
        />
        <div className="text-center">
          <span className="text-emerald-400 font-mono font-bold text-xl md:text-2xl">M/N</span>
          <p className="text-[9px] md:text-[10px] text-emerald-400/70 font-mono uppercase mt-1">Consensus</p>
        </div>
      </div>
    </div>
  </div>
);

// ─── Diagram 3: LI.FI Cross Chain Bridge ─────────────────────────────────────
const LifiBridgeDiagram = () => (
  <div className="w-full aspect-square md:aspect-[4/3] rounded-2xl bg-[#0a0a0a] border border-white/10 relative overflow-hidden flex items-center justify-center p-8 shadow-2xl">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    
    <div className="relative z-10 w-full flex flex-col items-center gap-10">
      
      {/* Route */}
      <div className="flex items-center justify-between w-full max-w-md relative">
        <div className="p-4 rounded-xl border border-white/10 bg-black text-center w-28 md:w-32 shadow-lg relative z-10">
          <div className="text-[10px] text-neutral-500 font-mono mb-1">Source</div>
          <div className="text-xs md:text-sm font-semibold text-white">Somnia</div>
        </div>
        
        {/* Animated Bridge Line */}
        <div className="absolute left-28 right-28 top-1/2 -translate-y-1/2 h-px bg-neutral-800 z-0 hidden md:block">
           <motion.div 
              className="absolute top-1/2 left-0 w-full h-[2px] bg-purple-500 -translate-y-1/2 shadow-[0_0_15px_#a855f7]"
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: [0, 1, 0], originX: [0, 0, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* LI.FI Badge */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-[10px] font-mono text-purple-400 whitespace-nowrap">
              via LI.FI Protocol
            </div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-center w-28 md:w-32 shadow-[0_0_20px_rgba(16,185,129,0.1)] relative z-10">
          <div className="text-[10px] text-emerald-500/70 font-mono mb-1">Safe Harbor</div>
          <div className="text-xs md:text-sm font-semibold text-emerald-400">Ethereum</div>
        </div>
      </div>

      {/* Code Window */}
      <div className="w-full max-w-md bg-[#0D1117] border border-white/10 rounded-lg overflow-hidden text-left shadow-2xl">
        <div className="flex justify-between items-center px-4 py-2 border-b border-white/5 bg-black/80">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">IBEA Relayer Runtime</div>
        </div>
        <div className="p-4 text-xs md:text-sm font-mono leading-loose overflow-x-auto">
          <span className="text-purple-400">await</span> <span className="text-blue-400">lifi</span>.<span className="text-yellow-200">executeRoute</span>({'{'}<br/>
          <span className="text-neutral-400">&nbsp;&nbsp;fromChainId:</span> <span className="text-emerald-300">50312</span>, <span className="text-neutral-600">/* Somnia */</span><br/>
          <span className="text-neutral-400">&nbsp;&nbsp;toChainId:</span> <span className="text-emerald-300">1</span>, <span className="text-neutral-600">/* Ethereum */</span><br/>
          <span className="text-neutral-400">&nbsp;&nbsp;strategy:</span> <span className="text-amber-300">"HEDGE_AND_THROTTLE"</span>,<br/>
          <span className="text-neutral-400">&nbsp;&nbsp;bridge:</span> <span className="text-amber-300">"LI.FI"</span><br/>
          {'}'});<br/>
          <span className="text-neutral-500">{"// Capital successfully isolated."}</span>
        </div>
      </div>

    </div>
  </div>
);

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center w-full relative z-10 pt-16">
      <section className="w-full min-h-[90vh] flex flex-col items-center justify-center px-6">
        <div className="max-w-4xl w-full mx-auto text-center space-y-10 mt-16">
          <HeroTitle />
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-lg md:text-xl text-neutral-300 max-w-2xl mx-auto font-light leading-relaxed drop-shadow-lg"
          >
            Deterministic semantic security powered by Somnia's Native AI Trinity, IBEA Relayer orchestration, and LI.FI invariant execution.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="flex flex-col gap-8 pt-8 w-full max-w-4xl mx-auto text-left"
          >
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 mb-4">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center text-center hover:bg-white/[0.05] transition-colors">
                <div className="text-3xl font-display font-bold text-emerald-400 mb-2">~500ms</div>
                <div className="text-sm font-medium text-white mb-1">Threat Detection</div>
                <div className="text-xs text-neutral-500 leading-relaxed">Continuous M-of-N consensus across DefiLlama, Forta, and Hypernative.</div>
              </div>
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center text-center hover:bg-white/[0.05] transition-colors">
                <div className="text-3xl font-display font-bold text-amber-400 mb-2">~2.5s</div>
                <div className="text-sm font-medium text-white mb-1">Semantic Reasoning</div>
                <div className="text-xs text-neutral-500 leading-relaxed">Somnia Agent Trinity parses real-time API state and governance context.</div>
              </div>
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center text-center hover:bg-white/[0.05] transition-colors">
                <div className="text-3xl font-display font-bold text-purple-400 mb-2">~3.0s</div>
                <div className="text-sm font-medium text-white mb-1">Time to Evacuation</div>
                <div className="text-xs text-neutral-500 leading-relaxed">End-to-end execution of cross-chain bridging payload via LI.FI Relayer.</div>
              </div>
            </div>

            <div className="flex justify-center mt-4 mb-10">
              <Link 
                href="/monitor" 
                className="px-8 py-3.5 bg-white text-black hover:bg-neutral-200 transition-colors rounded-full font-semibold tracking-wide shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] pointer-events-auto"
              >
                Launch Terminal
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Architecture Sections */}
      <div className="w-full max-w-6xl mx-auto py-24 space-y-32 md:space-y-48">
        
        {/* Sub-part 1: The 3 Agents of Somnia */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20"
        >
          <div className="flex-1 space-y-6">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 text-blue-500 font-mono text-xl">01</div>
            <h2 className="text-3xl md:text-4xl font-display font-bold">The Somnia Agent Trinity</h2>
            <div className="space-y-4 text-neutral-400 text-base md:text-lg leading-relaxed">
              <p>IBEA reverses the standard model to save costs and maximize precision. Instead of running expensive AI agents 24/7, IBEA uses them as the ultimate verification layer:</p>
              <ul className="space-y-4 mt-4">
                <li><strong className="text-white">Tier 1 (JSON API Agent):</strong> Woken up by the Escalation Gate consensus. It fetches real-time protocol metadata, validator status, bridge/relayer health, and liquidity topology.</li>
                <li><strong className="text-white">Tier 2 (Website Parse Agent):</strong> Gathers contextual semantic enrichment from governance forums and GitHub to understand the full context of the threat.</li>
                <li><strong className="text-white">Tier 3 (LLM Inference Agent):</strong> Performs deterministic semantic reasoning to classify the exploit and dynamically chooses the defense path (Fast Path / Slow Path).</li>
              </ul>
            </div>
          </div>
          <div className="flex-1 w-full">
            <SomniaAgentsDiagram />
          </div>
        </motion.section>

        {/* Sub-part 2: Escalation Gate */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-20"
        >
          <div className="flex-1 space-y-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mb-6 text-emerald-400 font-mono text-xl">02</div>
            <h2 className="text-3xl md:text-4xl font-display font-bold">Continuous Telemetry Consensus</h2>
            <p className="text-neutral-400 text-lg leading-relaxed">
              Before waking up the expensive Somnia AI Agents, IBEA relies on continuous off-chain telemetry providers (DefiLlama, Forta, Hypernative). When a threat is detected, they must reach an M-of-N consensus at the Escalation Gate. Once confirmed, the JSON API Agent is triggered to fetch live on-chain reality, bypassing false positives before liquidity is touched.
            </p>
          </div>
          <div className="flex-1 w-full">
            <EscalationDiagram />
          </div>
        </motion.section>

        {/* Sub-part 3: KeeperHub & LI.FI */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20"
        >
          <div className="flex-1 space-y-6">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 text-purple-400 font-mono text-xl">03</div>
            <h2 className="text-3xl md:text-4xl font-display font-bold">IBEA Relayer Powered by LI.FI</h2>
            <p className="text-neutral-400 text-lg leading-relaxed">
              Upon a confirmed invariant breach, the Semantic Burst Engine triggers the IBEA Relayer. Assets are autonomously bridged across chains via <strong className="text-white">LI.FI's advanced interoperability protocol</strong>. LI.FI guarantees optimal routing speed and liquidity aggregation, ensuring rapid capital isolation to predetermined Safe Harbors like Ethereum Mainnet.
            </p>
          </div>
          <div className="flex-1 w-full">
            <LifiBridgeDiagram />
          </div>
        </motion.section>

      </div>

    </main>
  );
}
