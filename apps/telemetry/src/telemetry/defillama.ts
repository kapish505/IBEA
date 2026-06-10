import { config } from '../config.js';
import { publishArchLog } from './relayer.js';
import { submitMetricRequest } from './onchain-dispatcher.js';
import { redisPub } from '../ws/broadcast.js';

interface DefiLlamaTvlEntry {
  date: number;
  totalLiquidityUSD: number;
}

// Store last known TVL for deviation tracking across polls
let lastKnownTvl: number | null = null;
let injectedCrashDev: number | null = null;

export async function pollDefillama(protocolName: string): Promise<void> {
  try {
    const apiUrl = `https://api.llama.fi/protocol/${protocolName.toLowerCase()}`;
    await publishArchLog(`[DefiLlama] Fetching TVL for ${protocolName}...`, 'PENDING', 'LAYER_0');

    const res = await fetch(apiUrl);
    if (!res.ok) {
      if (res.status === 400) {
        await publishArchLog(`[DefiLlama] Protocol not tracked yet. Baseline TVL stable.`, 'SUCCESS', 'LAYER_0');
        return;
      }
      await publishArchLog(`[DefiLlama] API returned ${res.status}: ${res.statusText}`, 'FAIL', 'LAYER_0');
      return;
    }

    const data = await res.json() as { tvl?: DefiLlamaTvlEntry[]; currentChainTvls?: Record<string, number> };
    const tvlHistory = data.tvl ?? [];

    if (tvlHistory.length < 2) {
      await publishArchLog(`[DefiLlama] Insufficient TVL history for ${protocolName}`, 'FAIL', 'LAYER_0');
      return;
    }

    // Get current TVL (last entry) and compare with historical
    const currentTvl = tvlHistory[tvlHistory.length - 1]!.totalLiquidityUSD;
    
    // Find TVL from ~1 hour ago (or closest available)
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
    let historicalTvl = tvlHistory[tvlHistory.length - 2]!.totalLiquidityUSD;
    for (let i = tvlHistory.length - 1; i >= 0; i--) {
      if (tvlHistory[i]!.date <= oneHourAgo) {
        historicalTvl = tvlHistory[i]!.totalLiquidityUSD;
        break;
      }
    }

    // Also compare with last poll's value for rapid change detection
    let baselineTvl = lastKnownTvl ?? historicalTvl;
    if (injectedCrashDev !== null) {
      baselineTvl = currentTvl / (1 - (injectedCrashDev / 100));
    }
    lastKnownTvl = currentTvl;

    // Calculate deviation percentage
    const deviationPct = baselineTvl > 0
      ? ((baselineTvl - currentTvl) / baselineTvl) * 100
      : 0;

    let severity: number;
    if (deviationPct <= 0) {
      severity = 0; // TVL increased or stayed flat
    } else if (deviationPct < 5) {
      severity = Math.round(deviationPct * 500); // 0-2500
    } else if (deviationPct < 25) {
      severity = Math.round(2500 + ((deviationPct - 5) / 20) * 5000); // 2500-7500
    } else {
      severity = Math.min(Math.round(7500 + ((deviationPct - 25) / 25) * 2500), 10000); // 7500-10000
    }

    const formattedTvl = (currentTvl / 1e6).toFixed(2);
    const formattedDev = deviationPct.toFixed(2);

    if (severity > 0) {
      await publishArchLog(
        `[DefiLlama] ${protocolName} TVL: $${formattedTvl}M | Δ ${formattedDev}% drop | Severity: ${severity}bp`,
        severity >= 5000 ? 'FAIL' : 'SUCCESS',
        'LAYER_0'
      );

      // Emit THREAT_UPDATE to the M-of-N consensus gate
      await redisPub.publish('ibea:events', JSON.stringify({
        type: 'THREAT_UPDATE',
        payload: {
          source: 'defillama',
          severity,
          direction: 'TVL_DROP',
          protocol: protocolName,
          currentTvl,
          deviationPct: parseFloat(formattedDev),
          validationUrl: injectedCrashDev !== null ? `https://httpbin.org/get?deviation=${injectedCrashDev}` : apiUrl,
          selector: injectedCrashDev !== null ? "$.args.deviation" : "$.tvl[0].totalLiquidityUSD"
        },
        ts: Date.now(),
      }));
      injectedCrashDev = null; // reset
    } else {
      await publishArchLog(
        `[DefiLlama] ${protocolName} TVL: $${formattedTvl}M | Stable (Δ ${formattedDev}%)`,
        'SUCCESS',
        'LAYER_0'
      );
    }
  } catch (err) {
    console.error(`[defillama] Error fetching for ${protocolName}:`, err);
    await publishArchLog(`[DefiLlama] Poll failed: ${(err as Error).message}`, 'FAIL', 'LAYER_0');
  }
}

export async function startDefillamaWatcher(): Promise<() => void> {
  const protocols = config.DEFILLAMA_PROTOCOL_SLUG.split(',').map((p: string) => p.trim()).filter(Boolean);

  if (protocols.length === 0) {
    console.warn('[defillama] ⚠️ No protocols configured — DefiLlama watcher disabled');
    return () => {};
  }

  console.log(`[defillama] Starting DefiLlama Reflex Watcher for ${protocols.length} protocol(s)`);

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function loop(): Promise<void> {
    if (stopped) return;
    for (const p of protocols) {
      if (stopped) break;
      await pollDefillama(p);
    }
    if (!stopped) {
      timer = setTimeout(() => void loop(), config.DEFILLAMA_POLL_INTERVAL_MS);
    }
  }

  await loop();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

// ─── Injection Helper ────────────────────────────────────────────────────────
export function injectDefillamaCrash(protocolName: string, deviation: number = 99): void {
  // Dynamic Threat Injection: Override TVL baseline to emulate crash condition
  // such that the deviation is the requested amount.
  injectedCrashDev = deviation;
  void pollDefillama(protocolName);
}
