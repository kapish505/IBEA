import {
  createPublicClient,
  http,
  type PublicClient,
  type Log,
  type Address,
} from 'viem';
import { config } from '../config.js';
import { redisPub } from '../ws/broadcast.js';
import { query } from '../db/client.js';

// ─── Somnia Shannon chain definition ─────────────────────────────────────────
const somniaChain = {
  id: config.SOMNIA_CHAIN_ID,
  name: 'Somnia Shannon',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: {
      http: [config.SOMNIA_RPC_URL],
      webSocket: [config.SOMNIA_WSS_URL],
    },
  },
} as const;

// ─── SROCoordinator ABIs ───────────────────────────────
const RISK_EVENT_ABI = [
  {
    type: 'event',
    name: 'RiskEvent',
    inputs: [
      { name: 'eventType', type: 'uint8', indexed: true },
      { name: 'confidence', type: 'uint8', indexed: false },
      { name: 'severity', type: 'uint8', indexed: false },
      { name: 'evidence', type: 'bytes32', indexed: false },
      { name: 'targetChainId', type: 'uint256', indexed: false },
    ],
  },
] as const;

const FAST_PATH_TRIGGERED_ABI = [
  {
    type: 'event',
    name: 'FastPathTriggered',
    inputs: [
      { name: 'metricDeviation', type: 'uint256', indexed: false }
    ],
  },
] as const;

const SLOW_PATH_CONSENSUS_REQUESTED_ABI = [
  {
    type: 'event',
    name: 'SlowPathConsensusRequested',
    inputs: [
      { name: 'evidenceHash', type: 'bytes32', indexed: false }
    ],
  },
] as const;

// ─── Execution Authorized ────────────────────────────────────────────
const EXECUTION_AUTHORIZED_ABI = [
  {
    type: 'event',
    name: 'ExecutionAuthorized',
    inputs: [
      { name: 'keeper', type: 'address', indexed: true },
      { name: 'strategy', type: 'uint8', indexed: false },
      { name: 'tier', type: 'uint8', indexed: false },
    ],
  },
] as const;

// ─── Utility ─────────────────────────────────────────────────────────────────
async function publishEvent(
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await redisPub.publish(
      'ibea:events',
      JSON.stringify({ type, payload, ts: Date.now() }),
    );
  } catch (err) {
    console.error('[somnia-subscriber] Redis publish error:', err);
  }
}

// ─── Main subscriber ──────────────────────────────────────────────────────────
export async function startSomniaSubscriber(): Promise<() => void> {
  console.log('[somnia-subscriber] Connecting to Somnia Shannon via WebSocket…');

  const client: PublicClient = createPublicClient({
    chain: somniaChain,
    transport: http(config.SOMNIA_RPC_URL),
  });

  const unwatchers: Array<() => void> = [];

  // 1. Watch Fast Path Triggered
  unwatchers.push(
    client.watchContractEvent({
      address: config.SRO_COORDINATOR_ADDRESS as Address,
      abi: FAST_PATH_TRIGGERED_ABI,
      eventName: 'FastPathTriggered',
      onLogs: async (logs: Log[]) => {
        for (const log of logs) {
          const args = (log as any).args;
          await publishEvent('ARCH_LOG', {
            id: `arch-fast-${log.transactionHash}`,
            layer: 'LAYER_1', // ADM_METRIC layer
            message: `[FAST-PATH BYPASS] JSON API Agent triggered with ${args.metricDeviation}% deviation. Skipping LLM consensus.`,
            status: 'SUCCESS',
            txHash: log.transactionHash,
            timestamp: Date.now()
          });
        }
      }
    })
  );

  // 2. Watch Slow Path Consensus Requested
  unwatchers.push(
    client.watchContractEvent({
      address: config.SRO_COORDINATOR_ADDRESS as Address,
      abi: SLOW_PATH_CONSENSUS_REQUESTED_ABI,
      eventName: 'SlowPathConsensusRequested',
      onLogs: async (logs: Log[]) => {
        for (const log of logs) {
          await publishEvent('ARCH_LOG', {
            id: `arch-slow-${log.transactionHash}`,
            layer: 'LAYER_2', // Semantic / Predictive
            message: `[SLOW-PATH CONSENSUS] Web Parsing Agent requested Somnia LLM Inference Validator.`,
            status: 'SUCCESS',
            txHash: log.transactionHash,
            timestamp: Date.now()
          });
        }
      }
    })
  );

  // 3. Watch RiskEvent
  unwatchers.push(
    client.watchContractEvent({
      address: config.SRO_COORDINATOR_ADDRESS as Address,
      abi: RISK_EVENT_ABI,
      eventName: 'RiskEvent',
      onLogs: async (logs: Log[]) => {
        for (const log of logs) {
          const args = (log as any).args;
          console.log(`[somnia-subscriber] RiskEvent: type=${args.eventType} severity=${args.severity}`);
          
          await publishEvent('RISK_EVENT', {
            eventType: Number(args.eventType),
            confidence: Number(args.confidence),
            severity: Number(args.severity),
            evidence: args.evidence,
            targetChainId: Number(args.targetChainId),
            blockNumber: log.blockNumber?.toString(),
            txHash: log.transactionHash,
          });

          // Publish THREAT_VECTORS_UPDATE so UI correctly shows 100% on the radar chart
          // (mocking the mapping from RiskEvent to threat dimensions)
          await publishEvent('THREAT_VECTORS_UPDATE', {
            liquidityStress: args.severity >= 3 ? 1 : 0,
            bridgeInstability: args.severity >= 3 ? 1 : 0,
            governanceRisk: args.severity >= 3 ? 1 : 0,
            oracleManipulationRisk: args.severity >= 3 ? 1 : 0,
            contagionProbability: args.severity >= 3 ? 1 : 0,
          });

          await publishEvent('ESCALATION_STATE_CHANGE', {
            state: 'CRITICAL'
          });

          // Forward the event directly to KeeperHub via Redis 'ibea:riskevent' channel
          await redisPub.publish('ibea:riskevent', JSON.stringify({
            protocolId: 'ibea-core',
            strategyEnum: 2, // SAFE_HARBOR_ESCAPE
            targetChainId: Number(args.targetChainId),
            txHash: log.transactionHash,
            timestamp: Date.now()
          }));
        }
      }
    })
  );

  // 4. Watch ExecutionAuthorized
  unwatchers.push(
    client.watchContractEvent({
      address: config.ODIG_GUARD_ADDRESS as Address,
      abi: EXECUTION_AUTHORIZED_ABI,
      eventName: 'ExecutionAuthorized',
      onLogs: async (logs: Log[]) => {
        for (const log of logs) {
          const args = (log as any).args;
          console.log(`[somnia-subscriber] ExecutionAuthorized: keeper=${args.keeper} strategy=${args.strategy}`);
          await publishEvent('KEEPER_ACTION_UPDATE', {
            id: `action-${log.transactionHash}`,
            strategy: 'CROSS-CHAIN ESCAPE',
            status: 'EXECUTED',
            txHash: log.transactionHash,
            timestamp: Date.now()
          });
          
          await publishEvent('ARCH_LOG', {
            id: `arch-exec-${log.transactionHash}`,
            layer: 'LAYER_3',
            message: `ACTION EXECUTOR: Executing CROSS-CHAIN ESCAPE bridge payload on-chain.`,
            status: 'SUCCESS',
            txHash: log.transactionHash,
            timestamp: Date.now()
          });
        }
      }
    })
  );

  console.log('[somnia-subscriber] ✅ Watching SROCoordinator events');

  return () => {
    unwatchers.forEach((u) => u());
    console.log('[somnia-subscriber] Stopped all contract event watchers');
  };
}
