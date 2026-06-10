/**
 * Somnia Native Agent Contract Addresses
 *
 * These addresses are injected at runtime via environment variables.
 * The interaction pattern is production-ready EVM contract calls.
 * Replace with real Shannon Testnet addresses when Somnia publishes them.
 *
 * @see packages/shared/src/abis/ISomniaAgent.ts for the interaction ABI
 */
export declare const SOMNIA_AGENTS: {
    /**
     * Tier 1: JSON API Request Agent
     * Purpose: low-latency telemetry, anomaly detection, structured offchain intelligence
     * Always active — event-driven via websocket/RPC subscription
     */
    readonly JSON_API_AGENT: `0x${string}`;
    /**
     * Tier 2: Website Parse Agent
     * Purpose: contextual semantic enrichment from governance forums, GitHub, bridge status
     * DORMANT until escalation — never active during normal operation
     */
    readonly WEBSITE_PARSE_AGENT: `0x${string}`;
    /**
     * Tier 3: LLM Inference Agent
     * Purpose: deterministic semantic reasoning, exploit classification, contagion estimation
     * STRICTLY BOUNDED OUTPUT: (uint256 protocolId, uint8 threatScore, uint8 strategyEnum, uint256 targetChainId)
     * NEVER generates calldata or arbitrary execution instructions
     */
    readonly LLM_INFERENCE_AGENT: `0x${string}`;
};
export type SomniaAgentKey = keyof typeof SOMNIA_AGENTS;
//# sourceMappingURL=agents.d.ts.map