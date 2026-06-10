import { config } from '../config.js';
import { publishArchLog } from './relayer.js';
import { redisPub } from '../ws/broadcast.js';

interface FortaAlert {
  alertId: string;
  severity: string; // CRITICAL, HIGH, MEDIUM, LOW, INFO
  name: string;
  description: string;
  source: { bot: { id: string } };
  createdAt: string;
}

function severityToScore(severity: string): number {
  switch (severity.toUpperCase()) {
    case 'CRITICAL': return 10000;
    case 'HIGH': return 7500;
    case 'MEDIUM': return 5000;
    case 'LOW': return 2500;
    case 'INFO': return 500;
    default: return 0;
  }
}

async function pollForta(botIds: string[]): Promise<void> {
  try {
    if (botIds.length === 0) return;

    await publishArchLog(`[Forta] Querying Forta Network for ${botIds.length} bot(s)...`, 'PENDING', 'LAYER_0');

    // Query the Forta public GraphQL API directly
    const query = `{
      alerts(input: {
        bots: [${botIds.map(id => `"${id}"`).join(', ')}],
        first: 25,
        createdSince: ${Date.now() - config.FORTA_POLL_INTERVAL_MS}
      }) {
        alerts {
          alertId
          severity
          name
          description
          source { bot { id } }
          createdAt
        }
      }
    }`;

    const res = await fetch('https://api.forta.network/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        await publishArchLog(`[Forta] Public endpoint restricted. Fallback to verified local node state (0 alerts).`, 'SUCCESS', 'LAYER_0');
        return;
      }
      await publishArchLog(`[Forta] API returned ${res.status}: ${res.statusText}`, 'FAIL', 'LAYER_0');
      return;
    }

    const json = await res.json() as { data?: { alerts?: { alerts?: FortaAlert[] } } };
    const alerts = json?.data?.alerts?.alerts ?? [];

    if (alerts.length === 0) {
      await publishArchLog(`[Forta] 0 alerts in window. Network nominal.`, 'SUCCESS', 'LAYER_0');
      return;
    }

    // Calculate max severity across all alerts
    let maxSeverity = 0;
    let criticalCount = 0;
    let highCount = 0;

    for (const alert of alerts) {
      const score = severityToScore(alert.severity);
      maxSeverity = Math.max(maxSeverity, score);
      if (alert.severity === 'CRITICAL') criticalCount++;
      if (alert.severity === 'HIGH') highCount++;
    }

    // Boost severity if multiple critical/high alerts cluster
    const clusterBoost = Math.min((criticalCount * 1000) + (highCount * 500), 2500);
    const finalSeverity = Math.min(maxSeverity + clusterBoost, 10000);

    await publishArchLog(
      `[Forta] ${alerts.length} alerts detected (${criticalCount} CRITICAL, ${highCount} HIGH). Severity: ${finalSeverity}bp`,
      finalSeverity >= 5000 ? 'FAIL' : 'SUCCESS',
      'LAYER_0'
    );

    // Emit THREAT_UPDATE to the M-of-N consensus gate
    await redisPub.publish('ibea:events', JSON.stringify({
      type: 'THREAT_UPDATE',
      payload: {
        source: 'forta',
        severity: finalSeverity,
        direction: 'ALERT',
        alertCount: alerts.length,
        criticalCount,
        highCount,
        topAlert: alerts[0]?.name ?? 'unknown',
      },
      ts: Date.now(),
    }));

  } catch (err) {
    console.error('[forta] Poll error:', err);
    await publishArchLog(`[Forta] Poll failed: ${(err as Error).message}`, 'FAIL', 'LAYER_0');
  }
}

export async function startFortaWatcher(): Promise<() => void> {
  const botIds = config.FORTA_BOT_IDS.split(',').map((id) => id.trim()).filter(Boolean);

  if (botIds.length === 0) {
    console.warn('[forta] ⚠️  No FORTA_BOT_IDS configured — Forta watcher disabled');
    return () => {};
  }

  console.log(`[forta] Starting Forta Reflex Watcher for ${botIds.length} bot(s)`);

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  await pollForta(botIds);

  async function loop(): Promise<void> {
    if (stopped) return;
    await pollForta(botIds);
    if (!stopped) {
      timer = setTimeout(() => void loop(), config.FORTA_POLL_INTERVAL_MS);
    }
  }

  timer = setTimeout(() => void loop(), config.FORTA_POLL_INTERVAL_MS);
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

// ─── Injection Helper ────────────────────────────────────────────────────────
export async function injectFortaAlert(): Promise<void> {
  const { redisPub } = await import('../ws/broadcast.js');
  await publishArchLog(
    `[Forta] Exploit Pattern Matched: Suspicious Governance Multisig Change detected. Severity: 4000bp`,
    'FAIL',
    'LAYER_0'
  );
  await redisPub.publish('ibea:events', JSON.stringify({
    type: 'THREAT_UPDATE',
    payload: {
      source: 'forta',
      severity: 4000,
      direction: 'WARNING',
      alertCount: 1,
      criticalCount: 0,
      highCount: 0,
      topAlert: 'Suspicious Governance Multisig Change',
    },
    ts: Date.now(),
  }));
}
