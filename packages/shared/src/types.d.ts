import { z } from "zod";
/**
 * Bounded strategy enum — the ONLY output the AI is allowed to produce.
 * KeeperHub selects one of these four strategies based on ThreatVectorMatrix state.
 * Directly maps to the Solidity uint8 strategyEnum.
 */
export declare enum StrategyEnum {
    PAUSE_ONLY = 0,
    PARTIAL_EXIT = 1,
    SAFE_HARBOR_ESCAPE = 2,
    HEDGE_AND_THROTTLE = 3
}
export declare const strategyEnumLabels: Record<StrategyEnum, string>;
export declare enum EscalationState {
    NOMINAL = "NOMINAL",
    MONITORING = "MONITORING",
    ELEVATED = "ELEVATED",
    CRITICAL = "CRITICAL",
    SEMANTIC_BURST = "SEMANTIC_BURST",
    EXECUTING = "EXECUTING"
}
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
export declare const emptyThreatVectorMatrix: () => ThreatVectorMatrix;
export declare enum TelemetrySource {
    FORTA = "FORTA",
    DEFILLAMA = "DEFILLAMA",
    HYPERNATIVE = "HYPERNATIVE",
    SOMNIA_RPC = "SOMNIA_RPC"
}
export interface TelemetrySignal {
    id: string;
    source: TelemetrySource;
    protocolId: string;
    dimension: keyof Omit<ThreatVectorMatrix, "lastUpdatedBlock" | "lastUpdatedAt">;
    magnitude: number;
    evidence: string;
    timestamp: number;
    rawPayload: unknown;
}
export interface RiskEvent {
    id: string;
    blockNumber: bigint;
    blockTimestamp: number;
    transactionHash: `0x${string}`;
    protocolId: bigint;
    threatScore: number;
    strategyEnum: StrategyEnum;
    targetChainId: bigint;
}
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
export interface SafeHarborDestination {
    chainId: number;
    chainName: string;
    vaultAddress: `0x${string}`;
    vaultName: string;
    assetSymbol: string;
    registeredAt: number;
}
export interface BoundedLiFiRoute {
    fromChainId: number;
    toChainId: number;
    fromToken: `0x${string}`;
    toToken: `0x${string}`;
    fromAmount: bigint;
    estimatedToAmount: bigint;
    slippageBps: number;
    bridgeName: string;
    estimatedDuration: number;
    lifiDiamond: `0x${string}`;
    calldata: `0x${string}`;
    isSafeHarborValidated: boolean;
}
export interface Protocol {
    id: string;
    name: string;
    address: `0x${string}`;
    chainId: number;
    tvlUsd: number | null;
    escalationState: EscalationState;
    threatVectors: ThreatVectorMatrix | null;
    registeredAt: number;
}
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
export type WsMessageType = {
    type: "RISK_EVENT";
    payload: RiskEvent;
} | {
    type: "ESCALATION";
    payload: EscalationEvent;
} | {
    type: "THREAT_UPDATE";
    payload: {
        protocolId: string;
        vectors: ThreatVectorMatrix;
    };
} | {
    type: "KEEPER_ACTION";
    payload: KeeperAction;
} | {
    type: "ODIG_EXECUTION";
    payload: {
        actionId: string;
        checks: ODIGCheckResult[];
        success: boolean;
    };
} | {
    type: "TELEMETRY_SIGNAL";
    payload: TelemetrySignal;
} | {
    type: "SOMNIA_BLOCK";
    payload: {
        blockNumber: bigint;
        timestamp: number;
        blockTimeMs: number;
    };
} | {
    type: "LIFI_ROUTE";
    payload: BoundedLiFiRoute;
} | {
    type: "STATE_SYNC";
    payload: {
        escalationState: EscalationState;
        threatVectors: ThreatVectorMatrix | null;
    };
};
export declare const ThreatVectorMatrixSchema: z.ZodObject<{
    liquidityStress: z.ZodNumber;
    bridgeInstability: z.ZodNumber;
    governanceRisk: z.ZodNumber;
    oracleManipulationRisk: z.ZodNumber;
    contagionProbability: z.ZodNumber;
    lastUpdatedBlock: z.ZodBigInt;
    lastUpdatedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    liquidityStress: number;
    bridgeInstability: number;
    governanceRisk: number;
    oracleManipulationRisk: number;
    contagionProbability: number;
    lastUpdatedAt: number;
    lastUpdatedBlock: bigint;
}, {
    liquidityStress: number;
    bridgeInstability: number;
    governanceRisk: number;
    oracleManipulationRisk: number;
    contagionProbability: number;
    lastUpdatedAt: number;
    lastUpdatedBlock: bigint;
}>;
//# sourceMappingURL=types.d.ts.map