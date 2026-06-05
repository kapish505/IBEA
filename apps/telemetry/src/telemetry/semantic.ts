import { config } from '../config.js';
import { submitWebsiteParseRequest } from './onchain-dispatcher.js';
import { publishArchLog } from './relayer.js';

const SEMANTIC_FEEDS = [
  'https://rekt.news/rss/',
  'https://blocksec.com/rss',
];

/**
 * Triggered ONLY when the M-of-N consensus gate fires an escalation.
 * Dispatches unstructured source parsing to the Somnia Website Parse Agent
 * for contextual enrichment (audit disclosures, security reports, exploit write-ups).
 */
export async function triggerSemanticEnrichment(): Promise<void> {
  try {
    console.log('[semantic] Escalation triggered — dispatching Website Parse Agent for semantic enrichment...');

    for (const url of SEMANTIC_FEEDS) {
      await publishArchLog(`[Semantic] Escalation enrichment: dispatching ${url} to Website Parse Agent`, 'PENDING', 'LAYER_2');
      await submitWebsiteParseRequest(url, config.SOMNIA_CHAIN_ID);
      await publishArchLog(`[Semantic] Dispatched to Parse Agent. Awaiting LLM pipeline callback...`, 'SUCCESS', 'LAYER_2');
    }
  } catch (err) {
    console.error('[semantic] Enrichment error:', err);
    await publishArchLog(`[Semantic] Enrichment failed: ${(err as Error).message}`, 'FAIL', 'LAYER_2');
  }
}

/**
 * No-op watcher — semantic enrichment is now escalation-only.
 * This stub keeps the startTier1Gate interface compatible.
 */
export async function startSemanticWatcher(): Promise<() => void> {
  console.log('[semantic] ✅ Semantic enrichment registered (escalation-only, no continuous polling)');
  return () => {};
}
