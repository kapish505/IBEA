import { z } from "zod";
// ─── Strategy Enum ────────────────────────────────────────────────────────────
/**
 * Bounded strategy enum — the ONLY output the AI is allowed to produce.
 * KeeperHub selects one of these four strategies based on ThreatVectorMatrix state.
 * Directly maps to the Solidity uint8 strategyEnum.
 */
export var StrategyEnum;
(function (StrategyEnum) {
    StrategyEnum[StrategyEnum["PAUSE_ONLY"] = 0] = "PAUSE_ONLY";
    StrategyEnum[StrategyEnum["PARTIAL_EXIT"] = 1] = "PARTIAL_EXIT";
    StrategyEnum[StrategyEnum["SAFE_HARBOR_ESCAPE"] = 2] = "SAFE_HARBOR_ESCAPE";
    StrategyEnum[StrategyEnum["HEDGE_AND_THROTTLE"] = 3] = "HEDGE_AND_THROTTLE";
})(StrategyEnum || (StrategyEnum = {}));
export const strategyEnumLabels = {
    [StrategyEnum.PAUSE_ONLY]: "PAUSE_ONLY",
    [StrategyEnum.PARTIAL_EXIT]: "PARTIAL_EXIT",
    [StrategyEnum.SAFE_HARBOR_ESCAPE]: "SAFE_HARBOR_ESCAPE",
    [StrategyEnum.HEDGE_AND_THROTTLE]: "HEDGE_AND_THROTTLE",
};
// ─── Escalation State ─────────────────────────────────────────────────────────
export var EscalationState;
(function (EscalationState) {
    EscalationState["NOMINAL"] = "NOMINAL";
    EscalationState["MONITORING"] = "MONITORING";
    EscalationState["ELEVATED"] = "ELEVATED";
    EscalationState["CRITICAL"] = "CRITICAL";
    EscalationState["SEMANTIC_BURST"] = "SEMANTIC_BURST";
    EscalationState["EXECUTING"] = "EXECUTING";
})(EscalationState || (EscalationState = {}));
export const emptyThreatVectorMatrix = () => ({
    liquidityStress: 0,
    bridgeInstability: 0,
    governanceRisk: 0,
    oracleManipulationRisk: 0,
    contagionProbability: 0,
    lastUpdatedBlock: 0n,
    lastUpdatedAt: 0,
});
// ─── Telemetry Signal ─────────────────────────────────────────────────────────
export var TelemetrySource;
(function (TelemetrySource) {
    TelemetrySource["FORTA"] = "FORTA";
    TelemetrySource["DEFILLAMA"] = "DEFILLAMA";
    TelemetrySource["HYPERNATIVE"] = "HYPERNATIVE";
    TelemetrySource["SOMNIA_RPC"] = "SOMNIA_RPC";
})(TelemetrySource || (TelemetrySource = {}));
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
//# sourceMappingURL=types.js.map