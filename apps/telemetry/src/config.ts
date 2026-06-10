import { z } from 'zod';

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Somnia Network
  SOMNIA_RPC_URL: z.string().url().default('https://dream-rpc.somnia.network'),
  SOMNIA_WSS_URL: z.string().default('wss://dream-rpc.somnia.network'),
  SOMNIA_CHAIN_ID: z.coerce.number().default(50312),

  // IBEA Contract Addresses
  SRO_COORDINATOR_ADDRESS: z.string().startsWith('0x').length(42),
  IBEA_CORE_ADDRESS: z.string().startsWith('0x').length(42),
  ESCALATION_GATE_ADDRESS: z.string().startsWith('0x').length(42),
  THREAT_VECTOR_MATRIX_ADDRESS: z.string().startsWith('0x').length(42),
  SEMANTIC_BURST_ENGINE_ADDRESS: z.string().startsWith('0x').length(42),
  KEEPER_REGISTRY_ADDRESS: z.string().startsWith('0x').length(42),
  SAFE_HARBOR_REGISTRY_ADDRESS: z.string().startsWith('0x').length(42),
  ODIG_GUARD_ADDRESS: z.string().startsWith('0x').length(42),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // External APIs
  FORTA_API_URL: z.string().url().default('https://api.forta.network/alerts'),
  FORTA_BOT_IDS: z.string().min(1),
  DEFILLAMA_API_URL: z.string().url().default('https://api.llama.fi'),
  DEFILLAMA_PROTOCOL_SLUG: z.string().default('ibea'),

  // Telemetry thresholds
  TVL_CHANGE_THRESHOLD_PCT: z.coerce.number().default(5),
  FORTA_POLL_INTERVAL_MS: z.coerce.number().default(15_000),
  DEFILLAMA_POLL_INTERVAL_MS: z.coerce.number().default(60_000),

  // AI Agent Config
  SEMANTIC_POLL_INTERVAL_MS: z.coerce.number().default(300_000), // 5 minutes
  PREDICTIVE_POLL_INTERVAL_MS: z.coerce.number().default(21600000), // 6 hours

  RELAYER_PRIVATE_KEY: z.string().optional(),
});

function loadConfig() {
  const rawEnv: Record<string, string | undefined> = {
    PORT: process.env['PORT'],
    NODE_ENV: process.env['NODE_ENV'],
    SOMNIA_RPC_URL: process.env['SOMNIA_RPC_URL'],
    SOMNIA_WSS_URL: process.env['SOMNIA_WSS_URL'],
    SOMNIA_CHAIN_ID: process.env['SOMNIA_CHAIN_ID'],
    SRO_COORDINATOR_ADDRESS:
      process.env['SRO_COORDINATOR_ADDRESS'] ??
      process.env['NEXT_PUBLIC_SRO_COORDINATOR_ADDRESS'],
    IBEA_CORE_ADDRESS:
      process.env['IBEA_CORE_ADDRESS'] ??
      process.env['NEXT_PUBLIC_IBEA_CORE_ADDRESS'],
    ESCALATION_GATE_ADDRESS:
      process.env['ESCALATION_GATE_ADDRESS'] ??
      process.env['NEXT_PUBLIC_ESCALATION_GATE_ADDRESS'],
    THREAT_VECTOR_MATRIX_ADDRESS:
      process.env['THREAT_VECTOR_MATRIX_ADDRESS'] ??
      process.env['NEXT_PUBLIC_THREAT_VECTOR_MATRIX_ADDRESS'],
    SEMANTIC_BURST_ENGINE_ADDRESS:
      process.env['SEMANTIC_BURST_ENGINE_ADDRESS'] ??
      process.env['NEXT_PUBLIC_SEMANTIC_BURST_ENGINE_ADDRESS'],
    KEEPER_REGISTRY_ADDRESS:
      process.env['KEEPER_REGISTRY_ADDRESS'] ??
      process.env['NEXT_PUBLIC_KEEPER_REGISTRY_ADDRESS'],
    SAFE_HARBOR_REGISTRY_ADDRESS:
      process.env['SAFE_HARBOR_REGISTRY_ADDRESS'] ??
      process.env['NEXT_PUBLIC_SAFE_HARBOR_REGISTRY_ADDRESS'],
    ODIG_GUARD_ADDRESS:
      process.env['ODIG_GUARD_ADDRESS'] ??
      process.env['NEXT_PUBLIC_ODIG_GUARD_ADDRESS'],
    DATABASE_URL: process.env['DATABASE_URL'],
    REDIS_URL: process.env['REDIS_URL'],
    FORTA_API_URL: process.env['FORTA_API_URL'],
    FORTA_BOT_IDS: process.env['FORTA_BOT_IDS'],
    DEFILLAMA_API_URL: process.env['DEFILLAMA_API_URL'],
    DEFILLAMA_PROTOCOL_SLUG: process.env['DEFILLAMA_PROTOCOL_SLUG'],
    TVL_CHANGE_THRESHOLD_PCT: process.env['TVL_CHANGE_THRESHOLD_PCT'],
    FORTA_POLL_INTERVAL_MS: process.env['FORTA_POLL_INTERVAL_MS'],
    DEFILLAMA_POLL_INTERVAL_MS: process.env['DEFILLAMA_POLL_INTERVAL_MS'],

    SEMANTIC_POLL_INTERVAL_MS: process.env['SEMANTIC_POLL_INTERVAL_MS'],
    PREDICTIVE_POLL_INTERVAL_MS: process.env['PREDICTIVE_POLL_INTERVAL_MS'],
    RELAYER_PRIVATE_KEY: process.env['RELAYER_PRIVATE_KEY'],
  };

  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    console.error('[config] ❌ Invalid environment variables:');
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}

export const config = loadConfig();

export type Config = typeof config;
