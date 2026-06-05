import { ponder } from "@/generated";

ponder.on("IBEACore:RiskEvent", async ({ event, context }) => {
  const { db } = context;
  await db.riskEvent.create({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    data: {
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      protocolId: event.args.protocolId,
      threatScore: event.args.threatScore,
      strategyEnum: event.args.strategyEnum,
      targetChainId: event.args.targetChainId,
    },
  });
});

ponder.on("EscalationGate:EscalationTriggered", async ({ event, context }) => {
  const { db } = context;
  await db.escalationEvent.create({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    data: {
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      protocolId: event.args.protocolId,
      validatorCount: Number(event.args.validatorCount),
      threshold: Number(event.args.threshold),
    },
  });
});

ponder.on("ThreatVectorMatrix:ThreatVectorsUpdated", async ({ event, context }) => {
  const { db } = context;
  await db.threatVectorUpdate.create({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    data: {
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      protocolId: event.args.protocolId,
      liquidityStress: event.args.vectors[0],
      bridgeInstability: event.args.vectors[1],
      governanceRisk: event.args.vectors[2],
      oracleManipulationRisk: event.args.vectors[3],
      contagionProbability: event.args.vectors[4],
    },
  });
});

ponder.on("ODIGGuard:ExecutionAuthorized", async ({ event, context }) => {
  const { db } = context;
  await db.odigExecution.create({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    data: {
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      targetAsset: event.args.targetAsset,
      lifiDiamond: event.args.lifiDiamond,
      strategy: event.args.strategy,
      status: "AUTHORIZED",
    },
  });
});

ponder.on("ODIGGuard:InvariantFailed", async ({ event, context }) => {
  const { db } = context;
  await db.odigExecution.create({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    data: {
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      targetAsset: event.args.targetAsset,
      lifiDiamond: "0x",
      strategy: 0,
      status: "FAILED",
      reason: event.args.reason,
    },
  });
});

ponder.on("ODIGGuard:EmergencyFreeze", async ({ event, context }) => {
  const { db } = context;
  await db.odigExecution.create({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    data: {
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      targetAsset: "0x",
      lifiDiamond: "0x",
      strategy: 0,
      status: "FROZEN",
      reason: event.args.trigger,
    },
  });
});
