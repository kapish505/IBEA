import { pool } from './db.js';

// ─── Risk preference types ────────────────────────────────────────────────────
export interface RiskPreferences {
  userId: string;
  maxSlippageBps: number;          // max acceptable slippage in basis points (e.g., 100 = 1%)
  preferredSafeHarbors: string[];  // list of preferred chain IDs or protocol names
  autoExecuteThreshold: number;    // threat score above which auto-execute is enabled (0-10000)
  allowPartialExit: boolean;
  allowSafeHarborEscape: boolean;
  maxGasPriceGwei: number;
  lastUpdated: Date;
}

// ─── DB row shape ─────────────────────────────────────────────────────────────
interface RiskPrefRow {
  user_id: string;
  max_slippage_bps: number;
  preferred_safe_harbors: string[] | string;
  auto_execute_threshold: number;
  allow_partial_exit: boolean;
  allow_safe_harbor_escape: boolean;
  max_gas_price_gwei: number;
  updated_at: Date;
}

// ─── Load preferences from DB ─────────────────────────────────────────────────
export async function loadRiskPreferences(userId: string): Promise<RiskPreferences | null> {
  const client = await pool.connect();
  try {
    const result = await client.query<RiskPrefRow>(
      `SELECT
         user_id,
         max_slippage_bps,
         preferred_safe_harbors,
         auto_execute_threshold,
         allow_partial_exit,
         allow_safe_harbor_escape,
         max_gas_price_gwei,
         updated_at
       FROM risk_preferences
       WHERE user_id = $1`,
      [userId],
    );

    if (result.rowCount === 0 || !result.rows[0]) return null;

    const row = result.rows[0];
    const harbors = Array.isArray(row.preferred_safe_harbors)
      ? row.preferred_safe_harbors
      : typeof row.preferred_safe_harbors === 'string'
        ? JSON.parse(row.preferred_safe_harbors) as string[]
        : [];

    return {
      userId: row.user_id,
      maxSlippageBps: row.max_slippage_bps,
      preferredSafeHarbors: harbors,
      autoExecuteThreshold: row.auto_execute_threshold,
      allowPartialExit: row.allow_partial_exit,
      allowSafeHarborEscape: row.allow_safe_harbor_escape,
      maxGasPriceGwei: row.max_gas_price_gwei,
      lastUpdated: row.updated_at,
    };
  } finally {
    client.release();
  }
}

// ─── Load all active preferences ─────────────────────────────────────────────
export async function loadAllActivePreferences(): Promise<RiskPreferences[]> {
  const client = await pool.connect();
  try {
    const result = await client.query<RiskPrefRow>(
      `SELECT
         user_id,
         max_slippage_bps,
         preferred_safe_harbors,
         auto_execute_threshold,
         allow_partial_exit,
         allow_safe_harbor_escape,
         max_gas_price_gwei,
         updated_at
       FROM risk_preferences
       WHERE auto_execute_threshold IS NOT NULL
       ORDER BY updated_at DESC`,
    );

    return result.rows.map((row) => {
      const harbors = Array.isArray(row.preferred_safe_harbors)
        ? row.preferred_safe_harbors
        : typeof row.preferred_safe_harbors === 'string'
          ? JSON.parse(row.preferred_safe_harbors) as string[]
          : [];

      return {
        userId: row.user_id,
        maxSlippageBps: row.max_slippage_bps,
        preferredSafeHarbors: harbors,
        autoExecuteThreshold: row.auto_execute_threshold,
        allowPartialExit: row.allow_partial_exit,
        allowSafeHarborEscape: row.allow_safe_harbor_escape,
        maxGasPriceGwei: row.max_gas_price_gwei,
        lastUpdated: row.updated_at,
      };
    });
  } finally {
    client.release();
  }
}

// ─── Upsert preferences ────────────────────────────────────────────────────────
export async function upsertRiskPreferences(prefs: RiskPreferences): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO risk_preferences
         (user_id, max_slippage_bps, preferred_safe_harbors, auto_execute_threshold,
          allow_partial_exit, allow_safe_harbor_escape, max_gas_price_gwei, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         max_slippage_bps        = EXCLUDED.max_slippage_bps,
         preferred_safe_harbors  = EXCLUDED.preferred_safe_harbors,
         auto_execute_threshold  = EXCLUDED.auto_execute_threshold,
         allow_partial_exit      = EXCLUDED.allow_partial_exit,
         allow_safe_harbor_escape= EXCLUDED.allow_safe_harbor_escape,
         max_gas_price_gwei      = EXCLUDED.max_gas_price_gwei,
         updated_at              = NOW()`,
      [
        prefs.userId,
        prefs.maxSlippageBps,
        JSON.stringify(prefs.preferredSafeHarbors),
        prefs.autoExecuteThreshold,
        prefs.allowPartialExit,
        prefs.allowSafeHarborEscape,
        prefs.maxGasPriceGwei,
      ],
    );
  } finally {
    client.release();
  }
}
