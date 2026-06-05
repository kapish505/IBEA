import { z } from "zod";

// ─── Strategy Enum ────────────────────────────────────────────────────────────

/**
 * Bounded strategy enum — the ONLY output the AI is allowed to produce.
 * KeeperHub selects one of these four strategies based on ThreatVectorMatrix state.
 * Directly maps to the Solidity uint8 strategyEnum.
 */
export enum StrategyEnum {
  PAUSE_ONLY = 0,
  PARTIAL_EXIT = 1,
  SAFE_HARBOR_ESCAPE = 2,
  HEDGE_AND_THROTTLE = 3,
}

export const strategyEnumLabels: Record<StrategyEnum, string> = {
  [StrategyEnum.PAUSE_ONLY]: "PAUSE_ONLY",
  [StrategyEnum.PARTIAL_EXIT]: "PARTIAL_EXIT",
  [StrategyEnum.SAFE_HARBOR_ESCAPE]: "SAFE_HARBOR_ESCAPE",
  [StrategyEnum.HEDGE_AND_THROTTLE]: "HEDGE_AND_THROTTLE",
};

// ─── Escalation State ─────────────────────────────────────────────────────────

export enum EscalationState {
  NOMINAL = "NOMINAL",
  MONITORING = "MONITORING",
  ELEVATED = "ELEVATED",
  CRITICAL = "CRITICAL",
  SEMANTIC_BURST = "SEMANTIC_BURST",
  EXECUTING = "EXECUTING",
}

// ─── Threat Vector Matrix ─────────────────────────────────────────────────────

/**
 * Onchain multidimensional risk state — five orthogonal threat dimensions.
 * All values are uint256 scaled 0–10000 (basis points, where 10000 = maximum threat).
 * Values decay exponentially per block unless reinforced by telemetry.
 */
export interface ThreatVectorMatrix {
  /** Liquidity drain, abnormal LP exits, TVL collapse */
  liquidityStress: number;
  /** Bridge halt, anomalous bridge volume, validator disagreement */
  bridgeInstability: number;
  /** Abnormal governance activity, malicious proposals, quorum manipulation */
  governanceRisk: number;
  /** TWAP deviation, price oracle manipulation signatures */
  oracleManipulationRisk: number;
  /** Cross-protocol infection probability from interconnected positions */
  contagionProbability: number;
  /** Block number of last onchain update */
  lastUpdatedBlock: bigint;
  /** Unix timestamp of last update */
  lastUpdatedAt: number;
}

export const emptyThreatVectorMatrix = (): ThreatVectorMatrix => ({
  liquidityStress: 0,
  bridgeInstability: 0,
  governanceRisk: 0,
  oracleManipulationRisk: 0,
  contagionProbability: 0,
  lastUpdatedBlock: 0n,
  lastUpdatedAt: 0,
});

// ─── Telemetry Signal ─────────────────────────────────────────────────────────

export enum TelemetrySource {
  FORTA = "FORTA",
  DEFILLAMA = "DEFILLAMA",
  HYPERNATIVE = "HYPERNATIVE",
  SOMNIA_RPC = "SOMNIA_RPC",
}

export interface TelemetrySignal {
  id: string;
  source: TelemetrySource;
  protocolId: string;
  dimension: keyof Omit<
    ThreatVectorMatrix,
    "lastUpdatedBlock" | "lastUpdatedAt"
  >;
  magnitude: number; // 0–10000
  evidence: string; // human-readable description of the raw signal
  timestamp: number;
  rawPayload: unknown; // the actual API response payload
}

// ─── Risk Event (onchain) ─────────────────────────────────────────────────────

export interface RiskEvent {
  id: string;
  blockNumber: bigint;
  blockTimestamp: number;
  transactionHash: `0x${string}`;
  protocolId: bigint;
  threatScore: number; // 0–255 (uint8)
  strategyEnum: StrategyEnum;
  targetChainId: bigint;
}

// ─── Escalation Event ─────────────────────────────────────────────────────────

export interface EscalationEvent {
  id: string;
  blockNumber: bigint;
  blockTimestamp: number;
  transactionHash: `0x${string}`;
  protocolId: string;
  validatorCount: number;
  threshold: number;
  escalationState: EscalationState;
}

// ─── Keeper Action ────────────────────────────────────────────────────────────

export interface KeeperAction {
  id: string;
  timestamp: number;
  keeperAddress: `0x${string}`;
  strategy: StrategyEnum;
  protocolId: string;
  status: "PENDING" | "ODIG_VALIDATING" | "EXECUTED" | "FROZEN" | "FAILED";
  txHash?: `0x${string}`;
  odigChecks?: ODIGCheckResult[];
}

export interface ODIGCheckResult {
  check: "TWAP" | "STABLECOIN_HEALTH" | "BRIDGE_VALIDITY" | "SLIPPAGE" | "SAFE_HARBOR";
  passed: boolean;
  detail: string;
  timestamp: number;
}

// ─── Safe Harbor ──────────────────────────────────────────────────────────────

export interface SafeHarborDestination {
  chainId: number;
  chainName: string;
  vaultAddress: `0x${string}`;
  vaultName: string;
  assetSymbol: string;
  registeredAt: number;
}

// ─── LI.FI Route ─────────────────────────────────────────────────────────────

export interface BoundedLiFiRoute {
  fromChainId: number;
  toChainId: number;
  fromToken: `0x${string}`;
  toToken: `0x${string}`;
  fromAmount: bigint;
  estimatedToAmount: bigint;
  slippageBps: number;
  bridgeName: string;
  estimatedDuration: number; // seconds
  lifiDiamond: `0x${string}`;
  calldata: `0x${string}`;
  isSafeHarborValidated: boolean;
}

// ─── Protocol ─────────────────────────────────────────────────────────────────

export interface Protocol {
  id: string;
  name: string;
  address: `0x${string}`;
  chainId: number;
  tvlUsd: number | null; // null until real DefiLlama data arrives
  escalationState: EscalationState;
  threatVectors: ThreatVectorMatrix | null; // null until onchain data arrives
  registeredAt: number;
}

// ─── Somnia Network Metrics ───────────────────────────────────────────────────

export interface SomniaNetworkMetrics {
  latestBlock: bigint | null;
  /** Rolling average of last 10 block times in ms */
  avgBlockTimeMs: number | null;
  /** Time since last block in ms */
  timeSinceLastBlockMs: number | null;
  /** Estimated finality (Somnia: sub-second deterministic) */
  finalityMs: number | null;
  /** Tier 1 agent state */
  tier1Active: boolean;
  /** Tier 2 agent state */
  tier2Active: boolean;
  /** Tier 3 agent state */
  tier3Active: boolean;
}

// ─── WebSocket Message Types ──────────────────────────────────────────────────

export type WsMessageType =
  | { type: "RISK_EVENT"; payload: RiskEvent }
  | { type: "ESCALATION"; payload: EscalationEvent }
  | { type: "THREAT_UPDATE"; payload: { protocolId: string; vectors: ThreatVectorMatrix } }
  | { type: "KEEPER_ACTION"; payload: KeeperAction }
  | { type: "ODIG_EXECUTION"; payload: { actionId: string; checks: ODIGCheckResult[]; success: boolean } }
  | { type: "TELEMETRY_SIGNAL"; payload: TelemetrySignal }
  | { type: "SOMNIA_BLOCK"; payload: { blockNumber: bigint; timestamp: number; blockTimeMs: number } }
  | { type: "LIFI_ROUTE"; payload: BoundedLiFiRoute }
  | { type: "STATE_SYNC"; payload: { escalationState: EscalationState; threatVectors: ThreatVectorMatrix | null } };

// ─── Zod Schemas (for runtime validation) ────────────────────────────────────

export const ThreatVectorMatrixSchema = z.object({
  liquidityStress: z.number().min(0).max(10000),
  bridgeInstability: z.number().min(0).max(10000),
  governanceRisk: z.number().min(0).max(10000),
  oracleManipulationRisk: z.number().min(0).max(10000),
  contagionProbability: z.number().min(0).max(10000),
  lastUpdatedBlock: z.bigint(),
  lastUpdatedAt: z.number(),
});
