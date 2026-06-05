import { config } from '../config.js';
import { redisPub } from '../ws/broadcast.js';
import { query } from '../db/client.js';
import { startDefillamaWatcher } from './defillama.js';
import { triggerSemanticEnrichment } from './semantic.js';
import { triggerPredictiveEnrichment } from './predictive.js';
import {
  createPublicClient,
  http,
  type Address,
} from 'viem';

// ─── Somnia chain ─────────────────────────────────────────────────────────────
const somniaChain = {
  id: config.SOMNIA_CHAIN_ID,
  name: 'Somnia Shannon',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: { default: { http: [config.SOMNIA_RPC_URL] } },
} as const;

// ─── Signal record ────────────────────────────────────────────────────────────
interface ProviderSignal {
  provider: string;       // 'forta' | 'defillama' | 'onchain'
  severity: number;       // 0-10000 basis points
  signalType: string;
  timestamp: number;
  details: Record<string, unknown>;
}

// ─── Escalation gate ABI (triggerEscalation function) ────────────────────────
const ESCALATION_GATE_ABI = [
  {
    type: 'function',
    name: 'triggerEscalation',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tier', type: 'uint8' },
      { name: 'threatScore', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'escalationThreshold',
    stateMutability: 'view',
    inputs: [{ name: 'tier', type: 'uint8' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// ─── M-of-N consensus state ───────────────────────────────────────────────────
const CONSENSUS_WINDOW_MS = 5 * 60 * 1_000; // 5 minutes
const M_OF_N_THRESHOLD = 1;

const recentSignals: ProviderSignal[] = [];

function pruneOldSignals(): void {
  const cutoff = Date.now() - CONSENSUS_WINDOW_MS;
  let i = 0;
  while (i < recentSignals.length && (recentSignals[i]?.timestamp ?? 0) < cutoff) {
    i++;
  }
  if (i > 0) recentSignals.splice(0, i);
}

function countDistinctProviders(): Map<string, number> {
  pruneOldSignals();
  const providerSeverities = new Map<string, number>();
  for (const sig of recentSignals) {
    const existing = providerSeverities.get(sig.provider) ?? 0;
    providerSeverities.set(sig.provider, Math.max(existing, sig.severity));
  }
  return providerSeverities;
}

// ─── Evaluate consensus and potentially trigger escalation ────────────────────
async function evaluateConsensus(): Promise<void> {
  const providerMap = countDistinctProviders();

  // Fast-Path Bypass Logic: If ADM_METRIC (DefiLlama) reports critical TVL crash (>= 8000)
  // Skip M-of-N LLM consensus entirely and force emergency execution
  const metricSeverity = providerMap.get('defillama') ?? 0;
  if (metricSeverity >= 8000) {
    console.log(`[tier1-gate] 🚨 FAST-PATH BYPASS ACTIVATED: DefiLlama severity ${metricSeverity} >= 8000. Skipping LLM Consensus.`);
    await triggerEscalation(3, metricSeverity, 'defillama_fastpath');
    return;
  }

  // Slow-Path Consensus: Filter to providers reporting at meaningful severity (>= 3000 bp)
  const activeProviders = [...providerMap.entries()].filter(
    ([, sev]) => sev >= 3000,
  );

  if (activeProviders.length < M_OF_N_THRESHOLD) {
    return; // Not enough providers agree — no escalation
  }

  // Calculate consensus threat score (average of top providers)
  const avgSeverity = Math.round(
    activeProviders.reduce((sum, [, sev]) => sum + sev, 0) / activeProviders.length,
  );

  const providerNames = activeProviders.map(([p]) => p).join(', ');
  console.log(
    `[tier1-gate] 🚨 SLOW-PATH M-of-N consensus reached: ${activeProviders.length}/${M_OF_N_THRESHOLD} providers ` +
    `(${providerNames}) avgSeverity=${avgSeverity}`,
  );

  // Determine tier based on severity
  let tier: number;
  if (avgSeverity >= 8000) tier = 3;
  else if (avgSeverity >= 5000) tier = 2;
  else tier = 1;

  await triggerEscalation(tier, avgSeverity, providerNames);
}

async function triggerEscalation(tier: number, avgSeverity: number, providerNames: string): Promise<void> {
  // Persist escalation
  try {
    await query(
      `INSERT INTO escalations
         (block_number, tx_hash, log_index, tier, trigger_source, threat_score, raw_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        0,
        `consensus-${Date.now()}-${tier}`,
        0,
        tier,
        'consensus',
        avgSeverity,
        JSON.stringify({ providers: providerNames }),
      ],
    );
  } catch (err) {
    console.error('[tier1-gate] DB write error:', err);
  }

  // Publish to Redis for broadcast
  try {
    await redisPub.publish(
      'ibea:events',
      JSON.stringify({
        type: 'ESCALATION',
        payload: {
          source: 'consensus',
          tier,
          threatScore: avgSeverity,
          providers: providerNames,
        },
        ts: Date.now(),
      }),
    );
  } catch (err) {
    console.error('[tier1-gate] Redis publish error:', err);
  }

  // Check onchain escalation threshold
  const client = createPublicClient({
    chain: somniaChain,
    transport: http(config.SOMNIA_RPC_URL),
  });

  try {
    const onchainThreshold = await client.readContract({
      address: config.ESCALATION_GATE_ADDRESS as Address,
      abi: ESCALATION_GATE_ABI,
      functionName: 'escalationThreshold',
      args: [tier],
    }) as bigint;

    if (BigInt(avgSeverity) >= onchainThreshold) {
      console.log(
        `[tier1-gate] Threat score ${avgSeverity} >= onchain threshold ${onchainThreshold.toString()} ` +
        `for tier ${tier} — keeper should submit escalation`,
      );
      // Signal to keeper via Redis
      await redisPub.publish(
        'ibea:keeper',
        JSON.stringify({
          type: 'TRIGGER_ESCALATION',
          tier,
          threatScore: avgSeverity,
          providers: providerNames,
          ts: Date.now(),
        }),
      );
    }
  } catch (err) {
    console.error('[tier1-gate] Onchain threshold check failed:', err);
  }

  // Clear signals after triggering to avoid repeated escalations
  recentSignals.length = 0;

  // Asynchronously dispatch Somnia Native Agents for contextual semantic and predictive enrichment
  void triggerSemanticEnrichment();
  void triggerPredictiveEnrichment();
}

// ─── Subscribe to Redis for signals from other services ───────────────────────
export async function addSignal(signal: ProviderSignal): Promise<void> {
  recentSignals.push(signal);
  await evaluateConsensus();
}

// ─── Tier 1 Gate startup ──────────────────────────────────────────────────────
export async function startTier1Gate(): Promise<() => void> {
  console.log('[tier1-gate] Starting M-of-N consensus gate…');

  // Subscribe to the internal Redis events channel to pick up
  // signals from Forta and DefiLlama watchers
  const { redisSub } = await import('../ws/broadcast.js');
  await redisSub.subscribe('ibea:events');

  redisSub.on('message', (channel: string, message: string) => {
    if (channel !== 'ibea:events') return;
    try {
      const parsed = JSON.parse(message) as {
        type: string;
        payload: Record<string, unknown>;
        ts: number;
      };
      if (parsed.type === 'THREAT_UPDATE') {
        const payload = parsed.payload;
        const source = (payload['source'] as string) ?? 'unknown';
        const severity = (payload['severity'] as number) ?? 0;
        const signalType = (payload['direction'] as string) ?? (payload['name'] as string) ?? 'ALERT';
        void addSignal({
          provider: source,
          severity,
          signalType,
          timestamp: parsed.ts,
          details: payload,
        });
      }
    } catch (err) {
      console.error('[tier1-gate] Failed to parse Redis message:', err);
    }
  });

  // Start the child watcher
  const stopDefillama = await startDefillamaWatcher();

  // Periodic consensus re-evaluation in case signals came in without triggering
  let stopped = false;
  const timer = setInterval(() => {
    if (!stopped) void evaluateConsensus();
  }, 60_000);

  console.log('[tier1-gate] ✅ Tier 1 gate active (Fast-Path bypass enabled, Slow-Path M=1)');

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
    redisSub.unsubscribe('ibea:events');
    stopDefillama();
    console.log('[tier1-gate] Stopped');
  };
}
