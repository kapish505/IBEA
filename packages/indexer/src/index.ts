import { ponder } from "@/generated";

ponder.on("IBEACore:RiskEvent", async ({ event, context }) => {
  const { db } = context;
  await db.riskEvent.create({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    data: {
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      protocolId: event.args.epoch,
      threatScore: Number(event.args.aggregateThreat),
      strategyEnum: event.args.alertLevel,
      targetChainId: 0n, // Fallback
    },
  });
});

ponder.on("EscalationGate:ThresholdReached", async ({ event, context }) => {
  const { db } = context;
  await db.escalationEvent.create({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    data: {
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      protocolId: event.args.epoch, // Storing epoch here as fallback
      validatorCount: 1, 
      threshold: Number(event.args.aggregateThreat),
    },
  });
});

ponder.on("ThreatVectorMatrix:DimensionUpdated", async ({ event, context }) => {
  const { db } = context;
  await db.threatVectorUpdate.create({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    data: {
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      protocolId: BigInt(event.args.block_), // Fallback
      liquidityStress: event.args.dim == 0 ? event.args.newValue : 0,
      bridgeInstability: event.args.dim == 1 ? event.args.newValue : 0,
      governanceRisk: event.args.dim == 2 ? event.args.newValue : 0,
      oracleManipulationRisk: event.args.dim == 3 ? event.args.newValue : 0,
      contagionProbability: event.args.dim == 4 ? event.args.newValue : 0,
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
      strategy: 0, // Fallback since strategy is not in the event anymore
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

ponder.on("ODIGGuard:EmergencyFreezeActivated", async ({ event, context }) => {
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
      reason: "FreezeActivated",
    },
  });
});
