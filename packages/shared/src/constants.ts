/**
 * IBEA Protocol Constants
 * These are the protocol-level invariants — not configuration, not tunable by users.
 */

// ─── Threat Vector Decay ──────────────────────────────────────────────────────
/** Decay factor per block: 0.995 * 1e18. Applied onchain in ThreatVectorMatrix.sol */
export const DECAY_FACTOR = 995_000_000_000_000_000n; // 0.995e18
/** Number of blocks between decay applications (Somnia ~100ms blocks → ~10 blocks/second) */
export const DECAY_INTERVAL_BLOCKS = 10n; // ~1 second

// ─── Threat Thresholds ────────────────────────────────────────────────────────
/** Basis points (0–10000) thresholds for strategy selection */
export const THREAT_THRESHOLDS = {
  /** liquidityStress above this → SAFE_HARBOR_ESCAPE */
  LIQUIDITY_CRITICAL: 8000,
  /** oracleManipulationRisk above this → PAUSE_ONLY */
  ORACLE_CRITICAL: 7000,
  /** bridgeInstability above this + contagionProbability above CONTAGION_ELEVATED → HEDGE_AND_THROTTLE */
  BRIDGE_ELEVATED: 6000,
  /** contagionProbability above this triggers cross-protocol monitoring */
  CONTAGION_ELEVATED: 5000,
  /** governanceRisk above this → MONITORING escalation state */
  GOVERNANCE_MONITORING: 3000,
  /** Any single dimension above this → ELEVATED escalation state */
  GLOBAL_ELEVATED: 4000,
  /** Any single dimension above this → CRITICAL escalation state */
  GLOBAL_CRITICAL: 7000,
} as const;

// ─── M-of-N Telemetry Consensus ───────────────────────────────────────────────
/** Minimum number of telemetry providers that must agree for escalation */
export const MIN_PROVIDERS_FOR_ESCALATION = 1;
/** Total number of telemetry providers monitored */
export const TOTAL_TELEMETRY_PROVIDERS = 4; // Forta, Hypernative, DefiLlama, Somnia RPC

// ─── ODIG Invariant Bounds ────────────────────────────────────────────────────
/** Maximum allowed slippage in basis points (e.g., 100 = 1%) */
export const MAX_SLIPPAGE_BPS = 100;
/** Minimum TWAP health ratio (e.g., 9500 = price must be within 95% of TWAP) */
export const MIN_TWAP_HEALTH_RATIO = 9500;
/** Minimum stablecoin peg ratio in basis points */
export const MIN_STABLECOIN_PEG_RATIO = 9800; // 98%

// ─── Somnia Network ───────────────────────────────────────────────────────────
export const SOMNIA_BLOCK_TIME_MS = 100; // target block time in milliseconds
export const SOMNIA_RPC_URL = "https://dream-rpc.somnia.network";
export const SOMNIA_WSS_URL = "wss://dream-rpc.somnia.network";

// ─── LI.FI ───────────────────────────────────────────────────────────────────
/** Approved Safe Harbor destination chain IDs */
export const SAFE_HARBOR_CHAIN_IDS = [
  1,    // Ethereum Mainnet (Lido vaults)
  42161, // Arbitrum One (USDC vaults)
  137,   // Polygon (stable vaults)
] as const;

/** LI.FI integrator identifier for analytics */
export const LIFI_INTEGRATOR_ID = "ibea-protocol";
