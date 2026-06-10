/**
 * IBEA Protocol Constants
 * These are the protocol-level invariants — not configuration, not tunable by users.
 */
/** Decay factor per block: 0.995 * 1e18. Applied onchain in ThreatVectorMatrix.sol */
export declare const DECAY_FACTOR = 995000000000000000n;
/** Number of blocks between decay applications (Somnia ~100ms blocks → ~10 blocks/second) */
export declare const DECAY_INTERVAL_BLOCKS = 10n;
/** Basis points (0–10000) thresholds for strategy selection */
export declare const THREAT_THRESHOLDS: {
    /** liquidityStress above this → SAFE_HARBOR_ESCAPE */
    readonly LIQUIDITY_CRITICAL: 8000;
    /** oracleManipulationRisk above this → PAUSE_ONLY */
    readonly ORACLE_CRITICAL: 7000;
    /** bridgeInstability above this + contagionProbability above CONTAGION_ELEVATED → HEDGE_AND_THROTTLE */
    readonly BRIDGE_ELEVATED: 6000;
    /** contagionProbability above this triggers cross-protocol monitoring */
    readonly CONTAGION_ELEVATED: 5000;
    /** governanceRisk above this → MONITORING escalation state */
    readonly GOVERNANCE_MONITORING: 3000;
    /** Any single dimension above this → ELEVATED escalation state */
    readonly GLOBAL_ELEVATED: 4000;
    /** Any single dimension above this → CRITICAL escalation state */
    readonly GLOBAL_CRITICAL: 7000;
};
/** Minimum number of telemetry providers that must agree for escalation */
export declare const MIN_PROVIDERS_FOR_ESCALATION = 1;
/** Total number of telemetry providers monitored */
export declare const TOTAL_TELEMETRY_PROVIDERS = 4;
/** Maximum allowed slippage in basis points (e.g., 100 = 1%) */
export declare const MAX_SLIPPAGE_BPS = 100;
/** Minimum TWAP health ratio (e.g., 9500 = price must be within 95% of TWAP) */
export declare const MIN_TWAP_HEALTH_RATIO = 9500;
/** Minimum stablecoin peg ratio in basis points */
export declare const MIN_STABLECOIN_PEG_RATIO = 9800;
export declare const SOMNIA_BLOCK_TIME_MS = 100;
export declare const SOMNIA_RPC_URL = "https://dream-rpc.somnia.network";
export declare const SOMNIA_WSS_URL = "wss://dream-rpc.somnia.network";
/** Approved Safe Harbor destination chain IDs */
export declare const SAFE_HARBOR_CHAIN_IDS: readonly [1, 42161, 137];
/** LI.FI integrator identifier for analytics */
export declare const LIFI_INTEGRATOR_ID = "ibea-protocol";
//# sourceMappingURL=constants.d.ts.map