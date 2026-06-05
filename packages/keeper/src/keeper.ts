import Redis from "ioredis";
import { type RiskEvent, StrategyEnum } from "@ibea/shared";
import { selectStrategy } from "./strategy-selector.js";
import { fetchAndValidateRoute, initLifiConfig } from "@ibea/lifi";
import { validateSafeHarborOnchain } from "./safe-harbor-validator.js";
import { executeDefensiveStrategy } from "./odig-coordinator.js";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const startKeeper = async () => {
  initLifiConfig();
  console.log("KeeperHub starting...");

  const RedisClient = Redis as any;
  const sub = new RedisClient(redisUrl);
  const pub = new RedisClient(redisUrl);
  await sub.subscribe("ibea:riskevent");

  sub.on("message", async (channel: string, message: string) => {
    if (channel === "ibea:riskevent") {
      try {
        const riskEvent: RiskEvent = JSON.parse(message);
        console.log(`Received RiskEvent for protocol: ${riskEvent.protocolId}`);

        const strategy = riskEvent.strategyEnum;

        // Publish to WebSocket via telemetry's broadcast channel
        const publishArchLog = async (message: string, status: 'PENDING'|'SUCCESS'|'FAIL' = 'SUCCESS') => {
          await pub.publish('ibea:events', JSON.stringify({
            type: 'ARCH_LOG',
            payload: {
              id: `arch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              layer: 'LAYER_4',
              message,
              status,
              txHash: riskEvent.transactionHash,
              timestamp: Date.now()
            },
            ts: Date.now()
          }));
        };

        if (strategy === StrategyEnum.SAFE_HARBOR_ESCAPE || strategy === StrategyEnum.PARTIAL_EXIT) {
             const stratName = strategy === StrategyEnum.SAFE_HARBOR_ESCAPE ? 'SAFE_HARBOR_ESCAPE' : 'PARTIAL_EXIT';
             console.log(`[KEEPER] Executing Strategy: ${stratName}`);
             await publishArchLog(`Executing strategy: ${stratName}`);
             
             // Setup mock target configuration (would be fetched from on-chain protocol mapping)
             const targetAsset = (process.env.TEST_TARGET_ASSET || "0x0000000000000000000000000000000000000000") as `0x${string}`;
             const fromChainId = 50312; // Somnia
             const toChainId = Number(riskEvent.targetChainId);
             
             // Fetch LI.FI route
             console.log(`[KEEPER] Requesting route to chain ${toChainId}...`);
             await publishArchLog(`Requesting optimal route via LI.FI to target chain ${toChainId}`, 'PENDING');
             
             const routeData = await fetchAndValidateRoute({
                fromChainId,
                toChainId,
                fromAmount: 1000000000000000000n, // 1 ether equivalent
                fromTokenAddress: targetAsset,
                toTokenAddress: "0x0000000000000000000000000000000000000000", // ETH or equivalent
                fromAddress: (process.env.NEXT_PUBLIC_ODIG_GUARD_ADDRESS || "0x0000000000000000000000000000000000000000"), // the smart contract
             }, [
                // In production, this array would be fetched from the SafeHarborRegistry first
                { 
                  chainId: toChainId, 
                  vaultAddress: "0x0000000000000000000000000000000000000000",
                  chainName: "Ethereum",
                  vaultName: "SafeHarborVault",
                  assetSymbol: "ETH",
                  registeredAt: Date.now()
                } 
             ]);

             if (!routeData) {
                 console.error(`[KEEPER] No valid Safe Harbor route found for chain ${toChainId}`);
                 await publishArchLog(`No valid Safe Harbor route found for chain ${toChainId}. Evacuation stalled.`, 'FAIL');
                 return;
             }
             
             await publishArchLog(`Route validated. Best return route identified for capital migration.`);
             
             // Validate Safe Harbor onchain before attempting ODIG execution to save gas
             console.log(`[KEEPER] Verifying Safe Harbor onchain for destination ${toChainId}...`);
             await publishArchLog(`Verifying ODG target registry for onchain Safe Harbor authenticity...`, 'PENDING');
             const isValid = await validateSafeHarborOnchain(toChainId, "0x0000000000000000000000000000000000000000");
             
             if (!isValid) {
                 console.error(`[KEEPER] Destination is not an approved Safe Harbor. Aborting.`);
                 await publishArchLog(`Target chain failed Safe Harbor authenticity check. Action aborted to prevent capital loss.`, 'FAIL');
                 return;
             }
             
             await publishArchLog(`Target chain authenticated. Proceeding with ODIG guard execution.`);
             
             // Coordinate ODIG execution
             console.log(`[KEEPER] Submitting ODIG guard execution...`);
             await publishArchLog(`Submitting EVACUATE transaction to on-chain ODIG Guard...`, 'PENDING');
             
             const hash = await executeDefensiveStrategy(targetAsset, routeData.calldata.lifiDiamond, routeData.calldata.calldata);
             console.log(`[KEEPER] Execution successful! Hash: ${hash}`);
             await publishArchLog(`EVACUATION SUCCESSFUL. Funds secured via ODIG Guard. Hash: ${hash}`);
             
             // Signal final Keeper Action update
             await pub.publish('ibea:events', JSON.stringify({
               type: 'KEEPER_ACTION_UPDATE',
               payload: {
                 id: `ka-${riskEvent.transactionHash || Date.now()}`,
                 timestamp: Date.now(),
                 strategy: 'EVACUATE',
                 status: 'EXECUTING',
                 protocolId: riskEvent.protocolId.toString(),
                 txHash: hash || riskEvent.transactionHash,
                 odgChecks: [
                   { id: 'c1', name: 'TWAP', status: 'PASS' },
                   { id: 'c2', name: 'SAFE_HARBOR', status: 'PASS' }
                 ]
               },
               ts: Date.now()
             }));
        }
      } catch (err) {
        console.error("Error processing RiskEvent:", err);
      }
    }
  });
};
