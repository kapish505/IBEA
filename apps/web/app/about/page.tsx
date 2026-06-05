export default function AboutPage() {
  return (
    <div className="min-h-screen bg-transparent text-white font-sans pt-32 pb-24">
      
      <main className="max-w-4xl mx-auto px-6 space-y-24">
        <header className="space-y-6 mb-32">
          <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight text-white">
            About IBEA
          </h1>
          <p className="text-neutral-400 text-xl font-light leading-relaxed max-w-3xl">
            IBEA (Invariant-Bounded Escalation Architecture) is a deterministically secure, autonomous defense protocol engineered exclusively for the Somnia Network.
          </p>
        </header>

        {/* Section 1: The Problem & Vision */}
        <section className="space-y-8">
          <div className="border-b border-white/10 pb-6">
            <h2 className="text-xs font-sans text-neutral-500 uppercase tracking-[0.2em] font-medium">01 // Core Thesis</h2>
            <h3 className="text-3xl font-display font-semibold mt-4 text-white">The Proactive Defense Paradigm</h3>
          </div>
          <div className="text-neutral-400 leading-relaxed text-lg font-light space-y-6">
            <p>
              Historically, smart contract security has been strictly reactive. Audits identify past vulnerabilities, while circuit breakers trigger only after capital has begun draining. IBEA was built to fundamentally invert this paradigm.
            </p>
            <p>
              By leveraging Somnia's extreme throughput and zero-latency block finality, IBEA creates a predictive defense layer. We utilize a pipeline of high-frequency off-chain agents to identify semantic anomalies (e.g., governance attacks, compromised frontends, or zero-day logic exploits) and execute cross-chain capital evacuations <strong className="text-white font-medium">before</strong> malicious transactions are finalized.
            </p>
          </div>
        </section>

        {/* Section 2: The Agentic Pipeline */}
        <section className="space-y-8">
          <div className="border-b border-white/10 pb-6">
            <h2 className="text-xs font-sans text-neutral-500 uppercase tracking-[0.2em] font-medium">02 // Native AI Primitives</h2>
            <h3 className="text-3xl font-display font-semibold mt-4 text-white">The Agentic Intelligence Pipeline</h3>
          </div>
          <div className="text-neutral-400 leading-relaxed text-lg font-light space-y-8">
            <p>
              IBEA harnesses three distinct, native Somnia agents to construct a deeply contextual threat matrix. Each agent is strictly bounded in its capabilities to prevent unbounded AI execution risks.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
              <div className="space-y-3">
                <h4 className="text-white font-display font-medium text-lg">JSON API Agent</h4>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  Operates at sub-millisecond latency. Sweeps mempools and on-chain telemetry feeds to flag structural anomalies.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="text-white font-display font-medium text-lg">Web Parse Agent</h4>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  Triggered only during active escalations. Scrapes governance forums, Discord channels, and bridge status pages for semantic context.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="text-white font-display font-medium text-lg">LLM Inference Agent</h4>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  The semantic engine. Synthesizes data from Tier 1 & 2 to output a strict deterministic threat score and strategy enum.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: KeeperHub & Interoperability */}
        <section className="space-y-8">
          <div className="border-b border-white/10 pb-6">
            <h2 className="text-xs font-sans text-neutral-500 uppercase tracking-[0.2em] font-medium">03 // Cross-Chain Orchestration</h2>
            <h3 className="text-3xl font-display font-semibold mt-4 text-white">KeeperHub & LI.FI Integration</h3>
          </div>
          <div className="text-neutral-400 leading-relaxed text-lg font-light space-y-6">
            <p>
              Once a critical threat is confirmed, the KeeperHub orchestration middleware takes control. Acting as a deterministic bridge, it evaluates user-defined risk preferences and dynamically fetches optimal cross-chain evacuation routes.
            </p>
            <p>
              To execute these rescue payloads, IBEA integrates natively with the <strong className="text-white font-medium">LI.FI Protocol</strong>. LI.FI provides unrivaled liquidity aggregation and bridge routing, ensuring that threatened capital is teleported away from the compromised environment and safely deposited into predefined "Safe Harbor" chains (like Ethereum Mainnet) with strict slippage protection.
            </p>
          </div>
        </section>

        {/* Section 4: ODIG */}
        <section className="space-y-8">
          <div className="border-b border-white/10 pb-6">
            <h2 className="text-xs font-sans text-neutral-500 uppercase tracking-[0.2em] font-medium">04 // Cryptoeconomic Security</h2>
            <h3 className="text-3xl font-display font-semibold mt-4 text-white">On-chain Deterministic Invariant Guards</h3>
          </div>
          <div className="text-neutral-400 leading-relaxed text-lg font-light space-y-6">
            <p>
              The greatest risk of autonomous AI agents is "hallucination-induced execution"—where an AI erroneously authorizes a massive capital transfer. IBEA mitigates this completely through the <strong className="text-white font-medium">Escalation Gate</strong> and <strong className="text-white font-medium">ODIG</strong> (On-chain Deterministic Invariant Guards).
            </p>
            <p>
              Before the KeeperHub can dispatch a LI.FI rescue transaction, an M-of-N threshold must be met between the internal LLM and external telemetry (DefiLlama, Forta). Even then, the final transaction must pass through ODIG. ODIG enforces hardcoded, inviolable smart contract checks (TWAP boundaries, bridge liveness, destination chain validity). If any invariant is broken, ODIG overrides the AI and forces a localized emergency freeze, guaranteeing mathematically bounded safety.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
