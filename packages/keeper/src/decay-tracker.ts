import {
  createPublicClient,
  http,
  type Address,
} from 'viem';
import { config } from './config.js';
import { pool } from './db.js';

// ─── Somnia chain ─────────────────────────────────────────────────────────────
const somniaChain = {
  id: config.SOMNIA_CHAIN_ID,
  name: 'Somnia Shannon',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: { default: { http: [config.SOMNIA_RPC_URL] } },
} as const;

// ─── ThreatVectorMatrix ABI ───────────────────────────────────────────────────
const TVM_ABI = [
  {
    type: 'function',
    name: 'getDecayState',
    stateMutability: 'view',
    inputs: [{ name: 'dimension', type: 'bytes32' }],
    outputs: [
      { name: 'currentScore', type: 'uint256' },
      { name: 'lastReinforcement', type: 'uint256' },
      { name: 'decayRate', type: 'uint256' },
      { name: 'halfLife', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'updateDimension',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dimension', type: 'bytes32' },
      { name: 'newScore', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

// ─── Dimension list ───────────────────────────────────────────────────────────
export const DIMENSIONS = [
  'liquidityStress',
  'oracleManipulationRisk',
  'bridgeInstability',
  'contagionProbability',
  'volatilityIndex',
  'governanceAttackSurface',
  'composabilityRisk',
] as const;

export type DimensionName = (typeof DIMENSIONS)[number];

// ─── Encode dimension name to bytes32 ────────────────────────────────────────
function encodeDimension(name: string): `0x${string}` {
  const buf = Buffer.alloc(32, 0);
  buf.write(name, 0, 'utf8');
  return `0x${buf.toString('hex')}`;
}

// ─── Offchain decay state ─────────────────────────────────────────────────────
export interface DimensionDecayState {
  dimension: DimensionName;
  onchainScore: bigint;
  lastReinforcement: bigint;        // Unix timestamp (seconds)
  decayRate: bigint;                // basis points per second
  halfLife: bigint;                 // seconds
  offchainLastTelemetryTs: number;  // ms
  offchainPendingScore: number;     // 0-10000, pending onchain update
  worthUpdating: boolean;
}

// ─── Gas cost estimation for an update ───────────────────────────────────────
const GAS_ESTIMATE_UPDATE = 50_000n; // approximate gas for updateDimension
const BASIS_POINTS_IMPROVEMENT_MIN = 200; // minimum improvement to justify gas

// ─── Decay tracker class ──────────────────────────────────────────────────────
export class DecayTracker {
  private client = createPublicClient({
    chain: somniaChain,
    transport: http(config.SOMNIA_RPC_URL),
  });

  private offchainStates = new Map<
    DimensionName,
    { lastTelemetryTs: number; pendingScore: number }
  >();

  // Sync onchain decay state for all dimensions
  async syncFromChain(): Promise<Map<DimensionName, DimensionDecayState>> {
    const results = new Map<DimensionName, DimensionDecayState>();

    await Promise.all(
      DIMENSIONS.map(async (dim) => {
        try {
          const [currentScore, lastReinforcement, decayRate, halfLife] =
            (await this.client.readContract({
              address: config.THREAT_VECTOR_MATRIX_ADDRESS as Address,
              abi: TVM_ABI,
              functionName: 'getDecayState',
              args: [encodeDimension(dim)],
            })) as [bigint, bigint, bigint, bigint];

          const offchain = this.offchainStates.get(dim) ?? {
            lastTelemetryTs: 0,
            pendingScore: 0,
          };

          // Determine if an onchain update is worth the gas
          const pendingImprovement = Math.abs(
            offchain.pendingScore - Number(currentScore),
          );
          const worthUpdating =
            offchain.pendingScore > 0 &&
            pendingImprovement >= BASIS_POINTS_IMPROVEMENT_MIN;

          results.set(dim, {
            dimension: dim,
            onchainScore: currentScore,
            lastReinforcement,
            decayRate,
            halfLife,
            offchainLastTelemetryTs: offchain.lastTelemetryTs,
            offchainPendingScore: offchain.pendingScore,
            worthUpdating,
          });
        } catch (err) {
          console.error(`[decay-tracker] Failed to read dimension ${dim}:`, err);
        }
      }),
    );

    return results;
  }

  // Compute current decayed score offchain (mirrors onchain model)
  computeDecayedScore(state: DimensionDecayState): number {
    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    const elapsed = nowSec - state.lastReinforcement;

    if (state.halfLife === 0n || elapsed <= 0n) {
      return Number(state.onchainScore);
    }

    // Exponential decay: score * 0.5^(elapsed / halfLife)
    const decayFactor = Math.pow(0.5, Number(elapsed) / Number(state.halfLife));
    return Math.round(Number(state.onchainScore) * decayFactor);
  }

  // Update offchain pending score from telemetry signal
  recordTelemetrySignal(dimension: DimensionName, score: number): void {
    const existing = this.offchainStates.get(dimension);
    this.offchainStates.set(dimension, {
      lastTelemetryTs: Date.now(),
      pendingScore: existing
        ? Math.max(existing.pendingScore, score) // take maximum
        : score,
    });
    console.log(
      `[decay-tracker] Signal recorded: ${dimension}=${score} ` +
      `(pending=${this.offchainStates.get(dimension)?.pendingScore})`,
    );
  }

  // Persist decay state snapshot to DB
  async persistSnapshot(states: Map<DimensionName, DimensionDecayState>): Promise<void> {
    const client = await pool.connect();
    try {
      for (const [dim, state] of states) {
        await client.query(
          `INSERT INTO keeper_actions
             (keeper_address, action_type, strategy, status, raw_data)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT DO NOTHING`,
          [
            'decay-tracker',
            'DECAY_SNAPSHOT',
            -1, // not a real strategy
            'recorded',
            JSON.stringify({
              dimension: dim,
              onchainScore: state.onchainScore.toString(),
              decayedScore: this.computeDecayedScore(state),
              lastReinforcement: state.lastReinforcement.toString(),
              worthUpdating: state.worthUpdating,
            }),
          ],
        );
      }
    } finally {
      client.release();
    }
  }

  // Returns dimensions that are worth updating onchain
  async getDimensionsWorthUpdating(): Promise<DimensionDecayState[]> {
    const states = await this.syncFromChain();
    const worthUpdating: DimensionDecayState[] = [];
    for (const state of states.values()) {
      if (state.worthUpdating) {
        worthUpdating.push(state);
      }
    }
    return worthUpdating;
  }

  // Estimate gas cost in gwei and check against cap
  async isGasAcceptable(): Promise<boolean> {
    try {
      const gasPrice = await this.client.getGasPrice();
      const gasPriceGwei = Number(gasPrice) / 1e9;
      return gasPriceGwei <= config.GAS_PRICE_CAP_GWEI;
    } catch {
      return true; // if we can't get gas price, allow submission
    }
  }

  // Clear pending score after successful onchain submission
  clearPendingScore(dimension: DimensionName): void {
    const existing = this.offchainStates.get(dimension);
    if (existing) {
      this.offchainStates.set(dimension, { ...existing, pendingScore: 0 });
    }
  }
}

export const decayTracker = new DecayTracker();
