import { WebSocket } from 'ws';
import { registerClient, unregisterClient, redisPub } from './broadcast.js';
import { query } from '../db/client.js';

// ─── Typed WS event discriminated union ───────────────────────────────────────
type WsEventType =
  | 'RISK_EVENT'
  | 'ESCALATION'
  | 'THREAT_UPDATE'
  | 'KEEPER_ACTION'
  | 'ODIG_EXECUTION'
  | 'PING'
  | 'SUBSCRIBE'
  | 'ERROR';

interface WsMessage {
  type: WsEventType;
  payload?: Record<string, unknown>;
  ts?: number;
}

// ─── Send typed message helper ────────────────────────────────────────────────
function sendMessage(ws: WebSocket, msg: WsMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ ...msg, ts: msg.ts ?? Date.now() }));
  }
}

// ─── Send current state snapshot on connect ───────────────────────────────────
async function sendCurrentState(ws: WebSocket): Promise<void> {
  try {
    // Recent risk events
    const riskEvents = await query<{
      id: string;
      event_name: string;
      severity: number;
      dimension: string | null;
      block_number: string;
      tx_hash: string;
      indexed_at: Date;
    }>(
      `SELECT id, event_name, severity, dimension, block_number, tx_hash, indexed_at
       FROM risk_events
       ORDER BY indexed_at DESC
       LIMIT 50`,
    );

    sendMessage(ws, {
      type: 'RISK_EVENT',
      payload: {
        snapshot: true,
        events: riskEvents.rows.map((r) => ({
          id: r.id,
          eventName: r.event_name,
          severity: r.severity,
          dimension: r.dimension,
          blockNumber: r.block_number,
          txHash: r.tx_hash,
          indexedAt: r.indexed_at,
        })),
      },
    });

    // Recent escalations
    const escalations = await query<{
      id: string;
      tier: number;
      trigger_source: string;
      threat_score: number;
      indexed_at: Date;
    }>(
      `SELECT id, tier, trigger_source, threat_score, indexed_at
       FROM escalations
       ORDER BY indexed_at DESC
       LIMIT 20`,
    );

    sendMessage(ws, {
      type: 'ESCALATION',
      payload: {
        snapshot: true,
        escalations: escalations.rows.map((r) => ({
          id: r.id,
          tier: r.tier,
          triggerSource: r.trigger_source,
          threatScore: r.threat_score,
          indexedAt: r.indexed_at,
        })),
      },
    });

    // Recent keeper actions
    const keeperActions = await query<{
      id: string;
      keeper_address: string;
      action_type: string;
      strategy: number;
      status: string;
      tx_hash: string | null;
      created_at: Date;
    }>(
      `SELECT id, keeper_address, action_type, strategy, status, tx_hash, created_at
       FROM keeper_actions
       ORDER BY created_at DESC
       LIMIT 20`,
    );

    sendMessage(ws, {
      type: 'KEEPER_ACTION',
      payload: {
        snapshot: true,
        actions: keeperActions.rows.map((r) => ({
          id: r.id,
          keeperAddress: r.keeper_address,
          actionType: r.action_type,
          strategy: r.strategy,
          status: r.status,
          txHash: r.tx_hash,
          createdAt: r.created_at,
        })),
      },
    });
  } catch (err) {
    console.error('[client-handler] Failed to send state snapshot:', err);
    sendMessage(ws, {
      type: 'ERROR',
      payload: { message: 'Failed to load current state' },
    });
  }
}

// ─── Per-client WebSocket handler ─────────────────────────────────────────────
export function handleClientConnection(ws: WebSocket, remoteAddr: string): void {
  console.log(`[client-handler] New connection from ${remoteAddr}`);
  registerClient(ws);

  // Send welcome + snapshot
  sendMessage(ws, {
    type: 'RISK_EVENT',
    payload: {
      welcome: true,
      message: 'Connected to IBEA Telemetry Service',
      remoteAddr,
    },
  });

  void sendCurrentState(ws);

  // Handle incoming messages from this client
  ws.on('message', (raw) => {
    let parsed: WsMessage | null = null;
    try {
      parsed = JSON.parse(raw.toString()) as WsMessage;
    } catch {
      sendMessage(ws, { type: 'ERROR', payload: { message: 'Invalid JSON' } });
      return;
    }

    switch (parsed.type) {
      case 'PING':
        sendMessage(ws, { type: 'PING', payload: { pong: true } });
        break;

      case 'SUBSCRIBE':
        // Client requesting a fresh state refresh
        void sendCurrentState(ws);
        break;

      default:
        // Relay client signals to Redis if they provide their own signal
        if (parsed.type === 'THREAT_UPDATE' && parsed.payload) {
          void redisPub.publish(
            'ibea:events',
            JSON.stringify({ type: parsed.type, payload: parsed.payload, ts: Date.now() }),
          );
        }
        break;
    }
  });

  ws.on('error', (err) => {
    console.error(`[client-handler] WebSocket error from ${remoteAddr}:`, err);
  });

  ws.on('close', (code, reason) => {
    console.log(
      `[client-handler] Connection closed from ${remoteAddr}: code=${code} reason=${reason.toString()}`,
    );
    unregisterClient(ws);
  });
}
