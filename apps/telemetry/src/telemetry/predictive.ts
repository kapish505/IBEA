import { config } from '../config.js';
import { submitWebsiteParseRequest } from './onchain-dispatcher.js';
import { publishArchLog } from './relayer.js';

const PREDICTIVE_FEEDS = [
  'https://forum.makerdao.com/latest.rss',
  'https://governance.aave.com/latest.rss',
];

/**
 * Triggered ONLY when the M-of-N consensus gate fires an escalation.
 * Dispatches governance forum and protocol discussion parsing to the
 * Somnia Website Parse Agent for predictive threat intelligence.
 */
export async function triggerPredictiveEnrichment(): Promise<void> {
  try {
    console.log('[predictive] Escalation triggered — dispatching Website Parse Agent for predictive enrichment...');

    for (const url of PREDICTIVE_FEEDS) {
      await publishArchLog(`[Predictive] Escalation enrichment: dispatching ${url} to Website Parse Agent`, 'PENDING', 'LAYER_2');
      await submitWebsiteParseRequest(url, config.SOMNIA_CHAIN_ID);
      await publishArchLog(`[Predictive] Dispatched to Parse Agent. Awaiting LLM pipeline callback...`, 'SUCCESS', 'LAYER_2');
    }
  } catch (err) {
    console.error('[predictive] Enrichment error:', err);
    await publishArchLog(`[Predictive] Enrichment failed: ${(err as Error).message}`, 'FAIL', 'LAYER_2');
  }
}

/**
 * No-op watcher — predictive enrichment is now escalation-only.
 * This stub keeps the startTier1Gate interface compatible.
 */
export async function startPredictiveWatcher(): Promise<() => void> {
  console.log('[predictive] ✅ Predictive enrichment registered (escalation-only, no continuous polling)');
  return () => {};
}
