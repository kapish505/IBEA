import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import type { ServerType } from '@hono/node-server';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './config.js';
import { testConnection } from './db/client.js';
import { startBroadcastBridge, getClientCount } from './ws/broadcast.js';
import { handleClientConnection } from './ws/client-handler.js';
import { startSomniaSubscriber } from './rpc/somnia-subscriber.js';
import { startTier1Gate } from './telemetry/tier1-gate.js';
import { startRelayer, isAutoEscalateEnabled, setAutoEscalateEnabled } from './telemetry/relayer.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Hono app ─────────────────────────────────────────────────────────────────
const app = new Hono();

// Health endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: '@ibea/telemetry',
    wsClients: getClientCount(),
    ts: new Date().toISOString(),
    chain: {
      id: config.SOMNIA_CHAIN_ID,
      rpc: config.SOMNIA_RPC_URL,
    },
  });
});

// Readiness endpoint
app.get('/ready', async (c) => {
  try {
    const { pool } = await import('./db/client.js');
    const result = await pool.query('SELECT 1');
    if (result.rowCount === 1) {
      return c.json({ status: 'ready' });
    }
    return c.json({ status: 'not_ready', reason: 'db_unavailable' }, 503);
  } catch (err) {
    return c.json({ status: 'not_ready', reason: (err as Error).message }, 503);
  }
});

// Metrics endpoint (raw signal counts)
app.get('/metrics', async (c) => {
  const { query: dbQuery } = await import('./db/client.js');
  try {
    const [riskCount, escalationCount, keeperCount, signalCount] = await Promise.all([
      dbQuery('SELECT COUNT(*) FROM risk_events'),
      dbQuery('SELECT COUNT(*) FROM escalations'),
      dbQuery('SELECT COUNT(*) FROM keeper_actions'),
      dbQuery('SELECT COUNT(*) FROM telemetry_signals'),
    ]);
    return c.json({
      riskEvents: Number(riskCount.rows[0]?.count ?? 0),
      escalations: Number(escalationCount.rows[0]?.count ?? 0),
      keeperActions: Number(keeperCount.rows[0]?.count ?? 0),
      telemetrySignals: Number(signalCount.rows[0]?.count ?? 0),
      wsClients: getClientCount(),
      ts: new Date().toISOString(),
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// Recent events API
app.get('/api/events', async (c) => {
  const { query: dbQuery } = await import('./db/client.js');
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 200);
  const eventName = c.req.query('event');
  try {
    const result = await dbQuery(
      `SELECT id, event_name, severity, dimension, block_number, tx_hash, indexed_at, raw_data
       FROM risk_events
       ${eventName ? "WHERE event_name = $2" : ''}
       ORDER BY indexed_at DESC
       LIMIT $1`,
      eventName ? [limit, eventName] : [limit],
    );
    return c.json({ events: result.rows });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// Recent escalations API
app.get('/api/escalations', async (c) => {
  const { query: dbQuery } = await import('./db/client.js');
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 100);
  try {
    const result = await dbQuery(
      `SELECT id, tier, trigger_source, threat_score, tx_hash, indexed_at, raw_data
       FROM escalations
       ORDER BY indexed_at DESC
       LIMIT $1`,
      [limit],
    );
    return c.json({ escalations: result.rows });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// Telemetry signals API
app.get('/api/signals', async (c) => {
  const { query: dbQuery } = await import('./db/client.js');
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 200);
  const source = c.req.query('source');
  try {
    const result = await dbQuery(
      `SELECT id, source, signal_type, severity, confidence, protocol, recorded_at, details
       FROM telemetry_signals
       ${source ? "WHERE source = $2" : ''}
       ORDER BY recorded_at DESC
       LIMIT $1`,
      source ? [limit, source] : [limit],
    );
    return c.json({ signals: result.rows });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ─── Auto-Escalate Settings API ───────────────────────────────────────────────
app.get('/api/settings/auto-escalate', (c) => {
  return c.json({ enabled: isAutoEscalateEnabled() });
});

app.post('/api/settings/auto-escalate', async (c) => {
  const body = await c.req.json();
  if (typeof body.enabled === 'boolean') {
    setAutoEscalateEnabled(body.enabled);
    return c.json({ enabled: body.enabled });
  }
  return c.json({ error: 'Invalid payload' }, 400);
});

// ─── Initialise DB schema ─────────────────────────────────────────────────────
async function runMigrations(): Promise<void> {
  const schemaPath = path.join(__dirname, 'db', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.warn('[migrations] schema.sql not found, skipping');
    return;
  }
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  const { pool } = await import('./db/client.js');
  await pool.query(sql);
  console.log('[migrations] ✅ Schema applied');
}

// ─── Main startup ─────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`[telemetry] Starting @ibea/telemetry on port ${config.PORT}…`);

  // Database
  await testConnection();
  await runMigrations();

  // Start Redis broadcast bridge
  await startBroadcastBridge();

  // Start Hono HTTP server
  const server: ServerType = serve({
    fetch: app.fetch,
    port: config.PORT,
  });

  // Attach raw ws:// WebSocket server on the same port
  const wss = new WebSocketServer({ noServer: true });

  const httpServer = (server as { server?: import('node:http').Server }).server ?? server;

  httpServer.on('upgrade', (req, socket, head) => {
    if (req.url === '/ws' || req.url === '/') {
      wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
        const remoteAddr =
          req.socket.remoteAddress ?? req.headers['x-forwarded-for']?.toString() ?? 'unknown';
        wss.emit('connection', ws, req);
        handleClientConnection(ws, remoteAddr);
      });
    } else {
      socket.destroy();
    }
  });

  // Start Somnia onchain subscriber
  await startSomniaSubscriber();

  // Start Tier 1 gate (Forta + DefiLlama + consensus)
  await startTier1Gate();

  // Start the automated transaction Relayer
  await startRelayer();

  console.log(
    `[telemetry] ✅ Server running on http://localhost:${config.PORT}\n` +
    `             WebSocket: ws://localhost:${config.PORT}/ws\n` +
    `             Health: http://localhost:${config.PORT}/health`,
  );
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('[telemetry] SIGTERM received, shutting down…');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[telemetry] SIGINT received, shutting down…');
  process.exit(0);
});

main().catch((err) => {
  console.error('[telemetry] Fatal startup error:', err);
  process.exit(1);
});
