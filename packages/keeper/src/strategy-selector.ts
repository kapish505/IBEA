// ─── Threat Vector Matrix state ───────────────────────────────────────────────
export interface ThreatVectorState {
  liquidityStress: number;         // 0-10000 basis points
  oracleManipulationRisk: number;  // 0-10000 basis points
  bridgeInstability: number;       // 0-10000 basis points
  contagionProbability: number;    // 0-10000 basis points
  volatilityIndex: number;         // 0-10000 basis points
  governanceAttackSurface: number; // 0-10000 basis points
  composabilityRisk: number;       // 0-10000 basis points
}

// ─── Strategy enum ────────────────────────────────────────────────────────────
export const StrategyEnum = {
  PAUSE_ONLY:          0,
  PARTIAL_EXIT:        1,
  SAFE_HARBOR_ESCAPE:  2,
  HEDGE_AND_THROTTLE:  3,
} as const;

export type Strategy = (typeof StrategyEnum)[keyof typeof StrategyEnum];

export interface StrategyDecision {
  strategy: Strategy;
  strategyName: string;
  dominantDimension: string;
  dominantScore: number;
  reasoning: string;
}

// ─── Pure deterministic strategy selector ────────────────────────────────────
// Rule precedence (highest priority first):
//   1. liquidityStress > 8000              → SAFE_HARBOR_ESCAPE
//   2. oracleManipulationRisk > 7000       → PAUSE_ONLY
//   3. bridgeInstability > 6000 AND
//      contagionProbability > 5000         → HEDGE_AND_THROTTLE
//   4. governanceAttackSurface > 7500      → PAUSE_ONLY
//   5. composabilityRisk > 6500 AND
//      volatilityIndex > 5000              → SAFE_HARBOR_ESCAPE
//   6. volatilityIndex > 8000              → SAFE_HARBOR_ESCAPE
//   7. contagionProbability > 7000         → HEDGE_AND_THROTTLE
//   8. liquidityStress > 5000              → PARTIAL_EXIT
//   9. bridgeInstability > 4000            → HEDGE_AND_THROTTLE
//  10. (any score) > 3000                  → PARTIAL_EXIT
//  11. default                             → PAUSE_ONLY (safest do-nothing)
export function selectStrategy(state: ThreatVectorState): StrategyDecision {
  // Rule 1
  if (state.liquidityStress > 8000) {
    return {
      strategy: StrategyEnum.SAFE_HARBOR_ESCAPE,
      strategyName: 'SAFE_HARBOR_ESCAPE',
      dominantDimension: 'liquidityStress',
      dominantScore: state.liquidityStress,
      reasoning: `liquidityStress=${state.liquidityStress} > 8000 — critical liquidity crunch, escape to safe harbor`,
    };
  }

  // Rule 2
  if (state.oracleManipulationRisk > 7000) {
    return {
      strategy: StrategyEnum.PAUSE_ONLY,
      strategyName: 'PAUSE_ONLY',
      dominantDimension: 'oracleManipulationRisk',
      dominantScore: state.oracleManipulationRisk,
      reasoning: `oracleManipulationRisk=${state.oracleManipulationRisk} > 7000 — pausing prevents acting on manipulated prices`,
    };
  }

  // Rule 3
  if (state.bridgeInstability > 6000 && state.contagionProbability > 5000) {
    return {
      strategy: StrategyEnum.HEDGE_AND_THROTTLE,
      strategyName: 'HEDGE_AND_THROTTLE',
      dominantDimension: 'bridgeInstability+contagion',
      dominantScore: Math.max(state.bridgeInstability, state.contagionProbability),
      reasoning:
        `bridgeInstability=${state.bridgeInstability} > 6000 AND ` +
        `contagionProbability=${state.contagionProbability} > 5000 — hedging cross-chain exposure`,
    };
  }

  // Rule 4
  if (state.governanceAttackSurface > 7500) {
    return {
      strategy: StrategyEnum.PAUSE_ONLY,
      strategyName: 'PAUSE_ONLY',
      dominantDimension: 'governanceAttackSurface',
      dominantScore: state.governanceAttackSurface,
      reasoning: `governanceAttackSurface=${state.governanceAttackSurface} > 7500 — governance attack detected, pausing`,
    };
  }

  // Rule 5
  if (state.composabilityRisk > 6500 && state.volatilityIndex > 5000) {
    return {
      strategy: StrategyEnum.SAFE_HARBOR_ESCAPE,
      strategyName: 'SAFE_HARBOR_ESCAPE',
      dominantDimension: 'composabilityRisk+volatility',
      dominantScore: Math.max(state.composabilityRisk, state.volatilityIndex),
      reasoning:
        `composabilityRisk=${state.composabilityRisk} > 6500 AND ` +
        `volatilityIndex=${state.volatilityIndex} > 5000 — systemic composability risk under volatility`,
    };
  }

  // Rule 6
  if (state.volatilityIndex > 8000) {
    return {
      strategy: StrategyEnum.SAFE_HARBOR_ESCAPE,
      strategyName: 'SAFE_HARBOR_ESCAPE',
      dominantDimension: 'volatilityIndex',
      dominantScore: state.volatilityIndex,
      reasoning: `volatilityIndex=${state.volatilityIndex} > 8000 — extreme volatility, evacuate`,
    };
  }

  // Rule 7
  if (state.contagionProbability > 7000) {
    return {
      strategy: StrategyEnum.HEDGE_AND_THROTTLE,
      strategyName: 'HEDGE_AND_THROTTLE',
      dominantDimension: 'contagionProbability',
      dominantScore: state.contagionProbability,
      reasoning: `contagionProbability=${state.contagionProbability} > 7000 — contagion risk high, throttle exposure`,
    };
  }

  // Rule 8
  if (state.liquidityStress > 5000) {
    return {
      strategy: StrategyEnum.PARTIAL_EXIT,
      strategyName: 'PARTIAL_EXIT',
      dominantDimension: 'liquidityStress',
      dominantScore: state.liquidityStress,
      reasoning: `liquidityStress=${state.liquidityStress} > 5000 — moderate liquidity stress, partial exit`,
    };
  }

  // Rule 9
  if (state.bridgeInstability > 4000) {
    return {
      strategy: StrategyEnum.HEDGE_AND_THROTTLE,
      strategyName: 'HEDGE_AND_THROTTLE',
      dominantDimension: 'bridgeInstability',
      dominantScore: state.bridgeInstability,
      reasoning: `bridgeInstability=${state.bridgeInstability} > 4000 — bridge risk elevated, hedge position`,
    };
  }

  // Rule 10 — any dimension above moderate threshold
  const allScores: Array<[string, number]> = [
    ['liquidityStress', state.liquidityStress],
    ['oracleManipulationRisk', state.oracleManipulationRisk],
    ['bridgeInstability', state.bridgeInstability],
    ['contagionProbability', state.contagionProbability],
    ['volatilityIndex', state.volatilityIndex],
    ['governanceAttackSurface', state.governanceAttackSurface],
    ['composabilityRisk', state.composabilityRisk],
  ];

  const maxEntry = allScores.reduce(
    (max, entry) => ((entry[1] ?? 0) > (max[1] ?? 0) ? entry : max),
    allScores[0] ?? ['none', 0],
  );

  if ((maxEntry[1] ?? 0) > 3000) {
    return {
      strategy: StrategyEnum.PARTIAL_EXIT,
      strategyName: 'PARTIAL_EXIT',
      dominantDimension: maxEntry[0] ?? 'unknown',
      dominantScore: maxEntry[1] ?? 0,
      reasoning: `Max dimension ${maxEntry[0]}=${maxEntry[1]} > 3000 — moderate risk, partial exit`,
    };
  }

  // Rule 11 — default safe
  return {
    strategy: StrategyEnum.PAUSE_ONLY,
    strategyName: 'PAUSE_ONLY',
    dominantDimension: maxEntry[0] ?? 'none',
    dominantScore: maxEntry[1] ?? 0,
    reasoning: `All dimensions below thresholds (max=${maxEntry[0]}=${maxEntry[1]}), pause only`,
  };
}
