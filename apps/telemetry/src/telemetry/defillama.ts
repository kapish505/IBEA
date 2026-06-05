import { config } from '../config.js';
import { redisPub } from '../ws/broadcast.js';
import { query } from '../db/client.js';

// ─── Exponential backoff fetch ────────────────────────────────────────────────
async function fetchWithBackoff(
  url: string,
  init?: RequestInit,
  maxRetries = 5,
): Promise<Response> {
  let delay = 1_000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok) return response;
      // For 429 or 5xx, retry
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`HTTP ${response.status}`);
      }
      // 4xx client errors are not retried
      return response;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(
        `[defillama] Fetch attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms:`,
        (err as Error).message,
      );
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 60_000);
    }
  }
  throw new Error('[defillama] All retries exhausted');
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface DefiLlamaProtocol {
  id: string;
  name: string;
  slug: string;
  tvl: number | null;
  chains: string[];
  category: string;
  change_1d?: number | null;
  change_7d?: number | null;
}

interface TvlSnapshot {
  tvl: number;
  recordedAt: number;
}

// ─── State ────────────────────────────────────────────────────────────────────
const tvlSnapshots = new Map<string, TvlSnapshot>();

// ─── Fetch all protocols and watch for TVL Δ ─────────────────────────────────
async function checkAllProtocols(): Promise<void> {
  const resp = await fetchWithBackoff(
    `${config.DEFILLAMA_API_URL}/protocols`,
    { headers: { 'Accept': 'application/json' } },
  );
  if (!resp.ok) {
    console.warn(`[defillama] /protocols returned HTTP ${resp.status}`);
    return;
  }

  const protocols: DefiLlamaProtocol[] = await resp.json() as DefiLlamaProtocol[];

  for (const proto of protocols) {
    if (proto.tvl === null || proto.tvl === undefined) continue;

    const slug = proto.slug;
    const currentTvl = proto.tvl;
    const prev = tvlSnapshots.get(slug);

    if (prev) {
      const changePct = Math.abs((currentTvl - prev.tvl) / Math.max(prev.tvl, 1)) * 100;
      if (changePct >= config.TVL_CHANGE_THRESHOLD_PCT) {
        const direction = currentTvl < prev.tvl ? 'DROP' : 'RISE';
        const severity = Math.min(
          10000,
          Math.round((changePct / 100) * 10000),
        );

        console.log(
          `[defillama] TVL ${direction} for ${proto.name}: ` +
          `${prev.tvl.toFixed(0)} → ${currentTvl.toFixed(0)} (${changePct.toFixed(2)}%)`,
        );

        // Persist to DB
        try {
          await query(
            `INSERT INTO telemetry_signals
               (source, signal_type, severity, confidence, protocol, details)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
              'defillama',
              `TVL_${direction}`,
              severity,
              8000,
              proto.name,
              JSON.stringify({
                previousTvl: prev.tvl,
                currentTvl,
                changePct: changePct.toFixed(4),
                direction,
                chains: proto.chains,
                category: proto.category,
                change_1d: proto.change_1d,
                change_7d: proto.change_7d,
              }),
            ],
          );
        } catch (err) {
          console.error('[defillama] DB write error:', err);
        }

        // Publish to Redis for WS broadcast
        try {
          await redisPub.publish(
            'ibea:events',
            JSON.stringify({
              type: 'THREAT_UPDATE',
              payload: {
                source: 'defillama',
                protocol: proto.name,
                slug,
                direction,
                previousTvl: prev.tvl,
                currentTvl,
                changePct: changePct.toFixed(4),
                severity,
              },
              ts: Date.now(),
            }),
          );
        } catch (err) {
          console.error('[defillama] Redis publish error:', err);
        }
      }
    }

    tvlSnapshots.set(slug, { tvl: currentTvl, recordedAt: Date.now() });
  }
}

// ─── Specific protocol TVL polling ───────────────────────────────────────────
async function checkSpecificProtocol(slug: string): Promise<void> {
  const resp = await fetchWithBackoff(
    `${config.DEFILLAMA_API_URL}/tvl/${slug}`,
    { headers: { 'Accept': 'application/json' } },
  );
  if (!resp.ok) {
    console.warn(`[defillama] /tvl/${slug} returned HTTP ${resp.status}`);
    return;
  }

  const tvl: number = await resp.json() as number;
  const prev = tvlSnapshots.get(slug);

  if (prev) {
    const changePct = Math.abs((tvl - prev.tvl) / Math.max(prev.tvl, 1)) * 100;
    if (changePct >= config.TVL_CHANGE_THRESHOLD_PCT) {
      const direction = tvl < prev.tvl ? 'DROP' : 'RISE';
      const severity = Math.min(10000, Math.round((changePct / 100) * 10000));

      console.log(
        `[defillama] Specific protocol TVL ${direction} for ${slug}: ` +
        `${prev.tvl.toFixed(0)} → ${tvl.toFixed(0)} (${changePct.toFixed(2)}%)`,
      );

      try {
        await query(
          `INSERT INTO telemetry_signals
             (source, signal_type, severity, confidence, protocol, details)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            'defillama',
            `TVL_${direction}`,
            severity,
            9000,
            slug,
            JSON.stringify({ previousTvl: prev.tvl, currentTvl: tvl, changePct }),
          ],
        );
      } catch (err) {
        console.error('[defillama] DB write error (specific):', err);
      }

      try {
        await redisPub.publish(
          'ibea:events',
          JSON.stringify({
            type: 'THREAT_UPDATE',
            payload: {
              source: 'defillama',
              protocol: slug,
              direction,
              previousTvl: prev.tvl,
              currentTvl: tvl,
              changePct,
              severity,
            },
            ts: Date.now(),
          }),
        );
      } catch (err) {
        console.error('[defillama] Redis publish error:', err);
      }
    }
  }

  tvlSnapshots.set(slug, { tvl, recordedAt: Date.now() });
}

// ─── Watcher lifecycle ────────────────────────────────────────────────────────
export async function startDefiLlamaWatcher(): Promise<() => void> {
  console.log('[defillama] Starting TVL watcher…');

  // Perform initial snapshot
  try {
    await checkAllProtocols();
    if (config.DEFILLAMA_PROTOCOL_SLUG) {
      await checkSpecificProtocol(config.DEFILLAMA_PROTOCOL_SLUG);
    }
  } catch (err) {
    console.error('[defillama] Initial snapshot failed:', err);
  }

  let stopped = false;
  let allProtoTimer: ReturnType<typeof setTimeout> | null = null;
  let specificTimer: ReturnType<typeof setTimeout> | null = null;

  async function allProtoLoop(): Promise<void> {
    if (stopped) return;
    try {
      await checkAllProtocols();
    } catch (err) {
      console.error('[defillama] Protocol poll error:', err);
    }
    if (!stopped) {
      allProtoTimer = setTimeout(() => void allProtoLoop(), config.DEFILLAMA_POLL_INTERVAL_MS);
    }
  }

  async function specificLoop(): Promise<void> {
    if (stopped || !config.DEFILLAMA_PROTOCOL_SLUG) return;
    try {
      await checkSpecificProtocol(config.DEFILLAMA_PROTOCOL_SLUG);
    } catch (err) {
      console.error('[defillama] Specific protocol poll error:', err);
    }
    if (!stopped) {
      specificTimer = setTimeout(() => void specificLoop(), config.DEFILLAMA_POLL_INTERVAL_MS / 2);
    }
  }

  // Start loops
  allProtoTimer = setTimeout(() => void allProtoLoop(), config.DEFILLAMA_POLL_INTERVAL_MS);
  specificTimer = setTimeout(() => void specificLoop(), config.DEFILLAMA_POLL_INTERVAL_MS / 2);

  console.log('[defillama] ✅ TVL watcher started');

  return () => {
    stopped = true;
    if (allProtoTimer) clearTimeout(allProtoTimer);
    if (specificTimer) clearTimeout(specificTimer);
    console.log('[defillama] TVL watcher stopped');
  };
}

export function getCurrentTvlSnapshot(): Map<string, TvlSnapshot> {
  return new Map(tvlSnapshots);
}
