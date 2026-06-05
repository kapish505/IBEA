-- IBEA Telemetry PostgreSQL Schema
-- Run once on DB initialisation

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Risk Events ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risk_events (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_number     BIGINT      NOT NULL,
  block_hash       TEXT        NOT NULL,
  tx_hash          TEXT        NOT NULL,
  log_index        INTEGER     NOT NULL,
  contract_address TEXT        NOT NULL,
  event_name       TEXT        NOT NULL,   -- 'RiskEvent' | 'InvariantFailed' | ...
  severity         INTEGER     NOT NULL,   -- 0-10000 basis points
  dimension        TEXT,                   -- threat vector dimension name
  raw_data         JSONB       NOT NULL DEFAULT '{}',
  indexed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_risk_events_block      ON risk_events (block_number DESC);
CREATE INDEX IF NOT EXISTS idx_risk_events_contract   ON risk_events (contract_address);
CREATE INDEX IF NOT EXISTS idx_risk_events_event_name ON risk_events (event_name);
CREATE INDEX IF NOT EXISTS idx_risk_events_indexed_at ON risk_events (indexed_at DESC);

-- ─── Escalations ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escalations (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_number     BIGINT      NOT NULL,
  tx_hash          TEXT        NOT NULL UNIQUE,
  log_index        INTEGER     NOT NULL,
  tier             INTEGER     NOT NULL,   -- 1, 2, or 3
  trigger_source   TEXT        NOT NULL,   -- 'onchain' | 'forta' | 'defillama' | 'consensus'
  threat_score     INTEGER     NOT NULL,
  raw_data         JSONB       NOT NULL DEFAULT '{}',
  indexed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalations_tier        ON escalations (tier);
CREATE INDEX IF NOT EXISTS idx_escalations_indexed_at  ON escalations (indexed_at DESC);

-- ─── Keeper Actions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS keeper_actions (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  keeper_address   TEXT        NOT NULL,
  action_type      TEXT        NOT NULL,   -- strategy enum string
  strategy         INTEGER     NOT NULL,   -- 0-3 StrategyEnum
  tx_hash          TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending', -- pending | submitted | confirmed | failed
  escalation_id    UUID        REFERENCES escalations(id),
  gas_used         BIGINT,
  raw_data         JSONB       NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keeper_actions_keeper  ON keeper_actions (keeper_address);
CREATE INDEX IF NOT EXISTS idx_keeper_actions_status  ON keeper_actions (status);
CREATE INDEX IF NOT EXISTS idx_keeper_actions_created ON keeper_actions (created_at DESC);

-- ─── Telemetry Signals ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS telemetry_signals (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  source           TEXT        NOT NULL,   -- 'forta' | 'defillama' | 'onchain'
  signal_type      TEXT        NOT NULL,
  severity         INTEGER     NOT NULL,   -- 0-10000 basis points
  confidence       INTEGER     NOT NULL,   -- 0-10000 basis points
  protocol         TEXT,
  details          JSONB       NOT NULL DEFAULT '{}',
  recorded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signals_source      ON telemetry_signals (source);
CREATE INDEX IF NOT EXISTS idx_signals_type        ON telemetry_signals (signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_recorded_at ON telemetry_signals (recorded_at DESC);

-- ─── ODIG Executions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS odig_executions (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  keeper_action_id UUID        REFERENCES keeper_actions(id),
  from_chain_id    BIGINT      NOT NULL,
  to_chain_id      BIGINT      NOT NULL,
  from_token       TEXT        NOT NULL,
  to_token         TEXT        NOT NULL,
  amount_in        TEXT        NOT NULL,   -- string to avoid bigint overflow
  amount_out_min   TEXT        NOT NULL,
  lifi_route_id    TEXT,
  tx_hash          TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending',
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_odig_status      ON odig_executions (status);
CREATE INDEX IF NOT EXISTS idx_odig_created_at  ON odig_executions (created_at DESC);
