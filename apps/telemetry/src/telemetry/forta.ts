import { config } from '../config.js';
import { redisPub } from '../ws/broadcast.js';
import { query } from '../db/client.js';

// ─── Exponential backoff fetch ────────────────────────────────────────────────
async function fetchWithBackoff(
  url: string,
  init?: RequestInit,
  maxRetries = 5,
): Promise<Response> {
  let delay = 2_000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok) return response;
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(
        `[forta] Fetch attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms:`,
        (err as Error).message,
      );
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 120_000);
    }
  }
  throw new Error('[forta] All retries exhausted');
}

// ─── Forta Alert types ────────────────────────────────────────────────────────
interface FortaAlertFinding {
  severity: string;   // 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | 'UNKNOWN'
  type: string;
  name: string;
  description: string;
  protocol?: string;
  alertId: string;
}

interface FortaAlert {
  id: string;
  createdAt: string;
  name: string;
  hash: string;
  source: {
    transactionHash?: string;
    block?: { number: number; hash: string; chainId: number };
    bot?: { id: string; reference?: string };
    agent?: { id: string };
  };
  severity: string;
  type: string;
  finding?: FortaAlertFinding;
  description: string;
  protocol?: string;
  chainId?: number;
  addresses?: string[];
  labels?: Array<{ entityType: string; entity: string; label: string; confidence: number; remove: boolean }>;
  contracts?: Array<{ address: string; name?: string; projectId?: string }>;
}

interface FortaAlertsResponse {
  alerts?: FortaAlert[];
  pageInfo?: { hasNextPage: boolean; endCursor?: { alertId: string; blockNumber: number } };
  total?: number;
}

// ─── Severity mapping ─────────────────────────────────────────────────────────
function fortaSeverityToBasisPoints(severity: string): number {
  switch (severity.toUpperCase()) {
    case 'CRITICAL': return 10000;
    case 'HIGH':     return 8000;
    case 'MEDIUM':   return 5000;
    case 'LOW':      return 2500;
    case 'INFO':     return 500;
    default:         return 1000;
  }
}

// ─── State: track already-seen alert IDs ─────────────────────────────────────
const seenAlertIds = new Set<string>();
// Keep set bounded: remove oldest entries when it gets large
const MAX_SEEN_IDS = 10_000;

// ─── Fetch recent alerts from Forta ──────────────────────────────────────────
async function fetchFortaAlerts(botIds: string[]): Promise<FortaAlert[]> {
  if (botIds.length === 0) return [];

  // Use POST with JSON body for the Forta alerts endpoint
  const body = JSON.stringify({
    botIds,
    blockDateRange: {
      startDate: new Date(Date.now() - config.FORTA_POLL_INTERVAL_MS * 2).toISOString(),
      endDate: new Date().toISOString(),
    },
    first: 100,
    orderBy: 'desc',
  });

  const resp = await fetchWithBackoff(config.FORTA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body,
  });

  if (!resp.ok) {
    console.warn(`[forta] API returned HTTP ${resp.status}`);
    return [];
  }

  const data: FortaAlertsResponse = await resp.json() as FortaAlertsResponse;
  return data.alerts ?? [];
}

// ─── Process a single Forta alert ────────────────────────────────────────────
async function processAlert(alert: FortaAlert): Promise<void> {
  if (seenAlertIds.has(alert.id)) return;

  seenAlertIds.add(alert.id);
  if (seenAlertIds.size > MAX_SEEN_IDS) {
    const firstKey = seenAlertIds.values().next().value;
    if (firstKey !== undefined) seenAlertIds.delete(firstKey);
  }

  const severity = fortaSeverityToBasisPoints(alert.severity);

  console.log(
    `[forta] New alert: id=${alert.id} sev=${alert.severity}(${severity}) ` +
    `bot=${alert.source.bot?.id ?? alert.source.agent?.id ?? 'unknown'} ` +
    `name=${alert.name}`,
  );

  try {
    await query(
      `INSERT INTO telemetry_signals
         (source, signal_type, severity, confidence, protocol, details)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        'forta',
        alert.type || 'ALERT',
        severity,
        7500,
        alert.protocol ?? null,
        JSON.stringify({
          alertId: alert.id,
          name: alert.name,
          description: alert.description,
          hash: alert.hash,
          chainId: alert.chainId,
          botId: alert.source.bot?.id ?? alert.source.agent?.id,
          txHash: alert.source.transactionHash,
          blockNumber: alert.source.block?.number,
          createdAt: alert.createdAt,
          addresses: alert.addresses ?? [],
          labels: alert.labels ?? [],
        }),
      ],
    );
  } catch (err) {
    console.error('[forta] DB write error:', err);
  }

  try {
    await redisPub.publish(
      'ibea:events',
      JSON.stringify({
        type: 'THREAT_UPDATE',
        payload: {
          source: 'forta',
          alertId: alert.id,
          severity,
          name: alert.name,
          description: alert.description,
          type: alert.type,
          protocol: alert.protocol,
          chainId: alert.chainId,
          botId: alert.source.bot?.id ?? alert.source.agent?.id,
          txHash: alert.source.transactionHash,
          addresses: alert.addresses ?? [],
          createdAt: alert.createdAt,
        },
        ts: Date.now(),
      }),
    );
  } catch (err) {
    console.error('[forta] Redis publish error:', err);
  }
}

// ─── Poll loop ────────────────────────────────────────────────────────────────
async function pollForta(botIds: string[]): Promise<void> {
  try {
    const alerts = await fetchFortaAlerts(botIds);
    if (alerts.length > 0) {
      console.log(`[forta] Received ${alerts.length} alerts from Forta`);
      for (const alert of alerts) {
        await processAlert(alert);
      }
    }
  } catch (err) {
    console.error('[forta] Poll error:', err);
  }
}

// ─── Watcher lifecycle ────────────────────────────────────────────────────────
export async function startFortaWatcher(): Promise<() => void> {
  const botIds = config.FORTA_BOT_IDS.split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (botIds.length === 0) {
    console.warn('[forta] ⚠️  No FORTA_BOT_IDS configured — Forta watcher disabled');
    return () => {};
  }

  console.log(`[forta] Starting watcher for ${botIds.length} bot(s): ${botIds.join(', ')}`);

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  // Initial poll
  await pollForta(botIds);

  async function loop(): Promise<void> {
    if (stopped) return;
    await pollForta(botIds);
    if (!stopped) {
      timer = setTimeout(() => void loop(), config.FORTA_POLL_INTERVAL_MS);
    }
  }

  timer = setTimeout(() => void loop(), config.FORTA_POLL_INTERVAL_MS);
  console.log('[forta] ✅ Forta watcher started');

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    console.log('[forta] Forta watcher stopped');
  };
}
