import { z } from 'zod';

const hexAddress = z.string().startsWith('0x').length(42);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Somnia
  SOMNIA_RPC_URL: z.string().url().default('https://dream-rpc.somnia.network'),
  SOMNIA_WSS_URL: z.string().default('wss://dream-rpc.somnia.network'),
  SOMNIA_CHAIN_ID: z.coerce.number().default(50312),

  // Keeper credentials
  KEEPER_PRIVATE_KEY: z.string().min(64),
  KEEPER_MIN_CONFIRMATIONS: z.coerce.number().default(1),

  // Contract addresses
  IBEA_CORE_ADDRESS: hexAddress,
  ESCALATION_GATE_ADDRESS: hexAddress,
  THREAT_VECTOR_MATRIX_ADDRESS: hexAddress,
  KEEPER_REGISTRY_ADDRESS: hexAddress,
  SAFE_HARBOR_REGISTRY_ADDRESS: hexAddress,
  ODIG_GUARD_ADDRESS: hexAddress,

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // LI.FI
  LIFI_INTEGRATOR: z.string().default('ibea-protocol'),

  // Keeper thresholds
  AUTO_EXECUTE_THRESHOLD: z.coerce.number().default(7000),
  GAS_PRICE_CAP_GWEI: z.coerce.number().default(100),
  KEEPER_LOOP_MS: z.coerce.number().default(5_000),
});

function loadConfig() {
  const rawEnv = {
    NODE_ENV: process.env['NODE_ENV'],
    SOMNIA_RPC_URL: process.env['SOMNIA_RPC_URL'],
    SOMNIA_WSS_URL: process.env['SOMNIA_WSS_URL'],
    SOMNIA_CHAIN_ID: process.env['SOMNIA_CHAIN_ID'],
    KEEPER_PRIVATE_KEY: process.env['KEEPER_PRIVATE_KEY'],
    KEEPER_MIN_CONFIRMATIONS: process.env['KEEPER_MIN_CONFIRMATIONS'],
    IBEA_CORE_ADDRESS: process.env['IBEA_CORE_ADDRESS'] ?? process.env['NEXT_PUBLIC_IBEA_CORE_ADDRESS'],
    ESCALATION_GATE_ADDRESS: process.env['ESCALATION_GATE_ADDRESS'] ?? process.env['NEXT_PUBLIC_ESCALATION_GATE_ADDRESS'],
    THREAT_VECTOR_MATRIX_ADDRESS: process.env['THREAT_VECTOR_MATRIX_ADDRESS'] ?? process.env['NEXT_PUBLIC_THREAT_VECTOR_MATRIX_ADDRESS'],
    KEEPER_REGISTRY_ADDRESS: process.env['KEEPER_REGISTRY_ADDRESS'] ?? process.env['NEXT_PUBLIC_KEEPER_REGISTRY_ADDRESS'],
    SAFE_HARBOR_REGISTRY_ADDRESS: process.env['SAFE_HARBOR_REGISTRY_ADDRESS'] ?? process.env['NEXT_PUBLIC_SAFE_HARBOR_REGISTRY_ADDRESS'],
    ODIG_GUARD_ADDRESS: process.env['ODIG_GUARD_ADDRESS'] ?? process.env['NEXT_PUBLIC_ODIG_GUARD_ADDRESS'],
    DATABASE_URL: process.env['DATABASE_URL'],
    REDIS_URL: process.env['REDIS_URL'],
    LIFI_INTEGRATOR: process.env['LIFI_INTEGRATOR'],
    AUTO_EXECUTE_THRESHOLD: process.env['AUTO_EXECUTE_THRESHOLD'],
    GAS_PRICE_CAP_GWEI: process.env['GAS_PRICE_CAP_GWEI'],
    KEEPER_LOOP_MS: process.env['KEEPER_LOOP_MS'],
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
