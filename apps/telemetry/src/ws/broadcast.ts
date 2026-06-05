import { WebSocket } from 'ws';
import Redis from 'ioredis';
import { config } from '../config.js';

// ─── Redis clients ─────────────────────────────────────────────────────────────
const RedisClient = Redis as any;

export const redisPub = new RedisClient(config.REDIS_URL, {
  lazyConnect: false,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times: number) => Math.min(times * 500, 10_000),
});

export const redisSub = new RedisClient(config.REDIS_URL, {
  lazyConnect: false,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => Math.min(times * 500, 10_000),
});

redisPub.on('error', (err: Error) => console.error('[redis:pub] Error:', err));
redisSub.on('error', (err: Error) => console.error('[redis:sub] Error:', err));
redisPub.on('ready', () => console.log('[redis:pub] ✅ Connected'));
redisSub.on('ready', () => console.log('[redis:sub] ✅ Connected'));

// ─── Connected WS clients ─────────────────────────────────────────────────────
const clients = new Set<WebSocket>();

export function registerClient(ws: WebSocket): void {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
  console.log(`[broadcast] Client registered (total=${clients.size})`);
}

export function unregisterClient(ws: WebSocket): void {
  clients.delete(ws);
  console.log(`[broadcast] Client unregistered (total=${clients.size})`);
}

export function broadcastToAll(data: string): void {
  let sent = 0;
  let failed = 0;
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(data);
        sent++;
      } catch (err) {
        console.error('[broadcast] Failed to send to client:', err);
        failed++;
        clients.delete(ws);
      }
    } else {
      clients.delete(ws);
    }
  }
  if (sent > 0) {
    console.debug(`[broadcast] Sent to ${sent} clients (${failed} failed)`);
  }
}

// ─── Setup Redis → WebSocket bridge ──────────────────────────────────────────
export async function startBroadcastBridge(): Promise<void> {
  await redisSub.subscribe('ibea:events', 'ibea:keeper');
  redisSub.on('message', (_channel: string, message: string) => {
    broadcastToAll(message);
  });
  console.log('[broadcast] ✅ Redis → WebSocket bridge active');
}

export function getClientCount(): number {
  return clients.size;
}
