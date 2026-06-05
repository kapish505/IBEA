import { onchainTable } from "@ponder/core";

export const riskEvent = onchainTable("risk_event", (t) => ({
  id: t.text().primaryKey(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  protocolId: t.bigint().notNull(),
  threatScore: t.integer().notNull(),
  strategyEnum: t.integer().notNull(),
  targetChainId: t.bigint().notNull(),
}));

export const escalationEvent = onchainTable("escalation_event", (t) => ({
  id: t.text().primaryKey(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  protocolId: t.bigint().notNull(),
  validatorCount: t.integer().notNull(),
  threshold: t.integer().notNull(),
}));

export const threatVectorUpdate = onchainTable("threat_vector_update", (t) => ({
  id: t.text().primaryKey(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  protocolId: t.bigint().notNull(),
  liquidityStress: t.bigint().notNull(),
  bridgeInstability: t.bigint().notNull(),
  governanceRisk: t.bigint().notNull(),
  oracleManipulationRisk: t.bigint().notNull(),
  contagionProbability: t.bigint().notNull(),
}));

export const odigExecution = onchainTable("odig_execution", (t) => ({
  id: t.text().primaryKey(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  targetAsset: t.hex().notNull(),
  lifiDiamond: t.hex().notNull(),
  strategy: t.integer().notNull(),
  status: t.text().notNull(), // "AUTHORIZED", "FAILED", "FROZEN"
  reason: t.text(),
}));
