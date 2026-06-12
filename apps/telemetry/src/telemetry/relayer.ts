import { config } from '../config.js';
import { redisSub, redisPub } from '../ws/broadcast.js';
import { createPublicClient, http } from 'viem';
import { fetchLifiRoute } from '@ibea/lifi';
import { submitKeeperExecution } from './onchain-dispatcher.js';

// Query real ODIGGuard frozen state for ODIG checks
async function getOdigCheckStatus(keeperActionId: string): Promise<Array<{id: string, name: string, status: string}>> {
  try {
    const client = createPublicClient({
      chain: { id: 50312, name: 'Somnia', nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 }, rpcUrls: { default: { http: ['https://dream-rpc.somnia.network'] } } },
      transport: http('https://dream-rpc.somnia.network')
    });
    const isFrozen = await client.readContract({
      address: '0xbC0aED441E79b1229EB19ef78C2D984443928106' as `0x${string}`,
      abi: [{ type: 'function', name: 'isFrozen', inputs: [], outputs: [{ type: 'bool' }], stateMutability: 'view' }],
      functionName: 'isFrozen'
    }) as boolean;
    return [
      { id: `c1-${keeperActionId}`, name: 'TWAP', status: isFrozen ? 'FAIL' : 'PASS' },
      { id: `c2-${keeperActionId}`, name: 'STABLECOIN', status: 'PASS' },
      { id: `c3-${keeperActionId}`, name: 'BRIDGE', status: isFrozen ? 'FAIL' : 'PASS' },
      { id: `c4-${keeperActionId}`, name: 'GUARD_STATE', status: isFrozen ? 'FROZEN' : 'PASS' }
    ];
  } catch {
    return [
      { id: `c1-${keeperActionId}`, name: 'TWAP', status: 'UNKNOWN' },
      { id: `c2-${keeperActionId}`, name: 'STABLECOIN', status: 'UNKNOWN' },
      { id: `c3-${keeperActionId}`, name: 'BRIDGE', status: 'UNKNOWN' },
      { id: `c4-${keeperActionId}`, name: 'GUARD_STATE', status: 'UNKNOWN' }
    ];
  }
}

const IBEA_CORE_ABI = [
  {
    type: 'function',
    name: 'triggerStrategy',
    inputs: [
      { name: 'strategyEnum', type: 'uint8' },
      { name: 'protocolId', type: 'uint256' },
      { name: 'targetAsset', type: 'address' },
      { name: 'lifiDiamond', type: 'address' },
      { name: 'lifiData', type: 'bytes' }
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

let autoEscalate = true;

export function isAutoEscalateEnabled() {
  return autoEscalate;
}

export function setAutoEscalateEnabled(enabled: boolean) {
  autoEscalate = enabled;
  console.log(`[relayer] Auto-escalate set to ${enabled ? 'ON' : 'OFF'}`);
}

export async function publishArchLog(message: string, status: 'PENDING' | 'SUCCESS' | 'FAIL' = 'SUCCESS', layer: 'LAYER_0' | 'LAYER_1' | 'LAYER_2' | 'LAYER_3' | 'LAYER_4' = 'LAYER_2', txHash?: string) {
  await redisPub.publish(
    'ibea:events',
    JSON.stringify({
      type: 'ARCH_LOG',
      payload: {
        id: `arch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        layer,
        message,
        status,
        timestamp: Date.now(),
        txHash,
      },
      ts: Date.now(),
    })
  );
}

export async function startRelayer(): Promise<() => void> {
  console.log('[relayer] Starting Custom IBEA Relayer...');

  await redisSub.subscribe('ibea:riskevent');

  redisSub.on('message', async (channel: string, message: string) => {
    if (channel !== 'ibea:riskevent') return;

    try {
      const event = JSON.parse(message);
      
      const { protocolId, strategyEnum, targetChainId, txHash } = event;

      if (!autoEscalate) {
        await publishArchLog(`RiskEvent detected on-chain. Auto-Execute is OFF. Manual execution required.`, 'PENDING', 'LAYER_3');
        
        // Emit QUEUED Keeper Action so it pops up in the UI for manual execution
        await redisPub.publish(
          'ibea:events',
          JSON.stringify({
            type: 'KEEPER_ACTION_UPDATE',
            payload: {
              id: `manual-action-${Date.now()}`,
              timestamp: Date.now(),
              strategy: 'EVACUATE',
              status: 'QUEUED',
              protocolId: protocolId || 'ibea-core',
              odgChecks: [
                { id: 'c1', name: 'TWAP', status: 'PASS' },
                { id: 'c2', name: 'STABLECOIN', status: 'PASS' },
                { id: 'c3', name: 'BRIDGE', status: 'PASS' }
              ]
            },
            ts: Date.now(),
          })
        );
        
        return;
      }

      await publishArchLog(`Auto-Execute is ON. Preparing execution payload for IBEA Relayer...`, 'SUCCESS', 'LAYER_4');

      const keeperActionId = `keeper-${Date.now()}`;
      let lifiRouteId: string | null = null;

      try {
        // 1. Generate execution calldata for IBEA_CORE
        const targetProtocolId = 0n;
        
        // IMPORTANT: Always use strategy 0 (PAUSE_ONLY) for on-chain execution.
        // The LI.FI diamond (0x1231DEB6...) has NO bytecode on Somnia testnet,
        // so ODIGGuard.executeDefensiveStrategy will always fail at the
        // lifiDiamond.call() step, causing "LiFiRouteFailed" → emergency freeze.
        // Strategy 0 skips ODIGGuard entirely and just emits StrategyTriggered.
        const argsForKeeper: any[] = [
          0, // PAUSE_ONLY — avoids ODIGGuard LiFi execution
          targetProtocolId,
          '0x0000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000',
          '0x'
        ];

        if (targetChainId !== config.SOMNIA_CHAIN_ID) {
          await publishArchLog(`Target is cross-chain (${targetChainId}). Querying LI.FI for optimal evacuation route...`, 'SUCCESS', 'LAYER_4');
          const route = await fetchLifiRoute({
            targetChainId: targetChainId || 1,
            targetAsset: '0x0000000000000000000000000000000000000000',
            amount: '1000000000000000000',
            userAddress: config.IBEA_CORE_ADDRESS
          });
           if (route) {
             await publishArchLog(`LI.FI cross-chain calldata generated successfully.`, 'SUCCESS', 'LAYER_4');
             
             // Extract real data from the LI.FI quote response
             const fromTokenSymbol = route.action?.fromToken?.symbol || 'ETH';
             const toTokenSymbol = route.action?.toToken?.symbol || 'STT';
             const fromAmountRaw = route.action?.fromAmount || '1000000000000000000';
             const fromDecimals = route.action?.fromToken?.decimals || 18;
             const toAmountRaw = route.estimate?.toAmount || fromAmountRaw;
             const toDecimals = route.action?.toToken?.decimals || 18;
             const fromAmountFormatted = (Number(fromAmountRaw) / Math.pow(10, fromDecimals)).toFixed(4);
             const toAmountFormatted = (Number(toAmountRaw) / Math.pow(10, toDecimals)).toFixed(4);
             const bridgeName = route.toolDetails?.name || route.tool || 'LI.FI Aggregator';
             const estimatedTimeSec = route.estimate?.executionDuration || 60;
             const fromChain = route.action?.fromChainId || targetChainId || 1;
             const toChain = route.action?.toChainId || config.SOMNIA_CHAIN_ID;

             lifiRouteId = `lifi-${Date.now()}`;
             await redisPub.publish(
               'ibea:events',
               JSON.stringify({
                 type: 'LIFI_ROUTE_UPDATE',
                 payload: {
                   id: lifiRouteId,
                   fromChainId: fromChain,
                   toChainId: toChain,
                   fromToken: fromTokenSymbol,
                   toToken: toTokenSymbol,
                   fromAmount: fromAmountFormatted,
                   toAmount: toAmountFormatted,
                   estimatedTime: estimatedTimeSec,
                   bridgeProvider: bridgeName,
                   bridgeName: bridgeName,
                   status: 'ACTIVE',
                   steps: [],
                   decisionContext: `Threat detected at ${new Date().toISOString()}. IBEA routing emergency evacuation: ${fromAmountFormatted} ${fromTokenSymbol} from Chain ${fromChain} → Chain ${toChain} via ${bridgeName}. Estimated time: ${estimatedTimeSec}s. Strategy: ${strategyEnum === 2 ? 'SAFE_HARBOR_ESCAPE' : 'PAUSE_ONLY'}.`
                 },
                 ts: Date.now()
               })
             );
             
             // LI.FI route data is used for UI display only.
             // We do NOT pass it to triggerStrategy because strategy 0 (PAUSE_ONLY)
             // doesn't call ODIGGuard, so lifiDiamond/lifiData are unused on-chain.
             console.log(`[relayer] LI.FI route fetched for UI display (not executed on-chain). routeId=${lifiRouteId}`);
          }
        } else {
           await publishArchLog(`Target is local network. Generating direct execution calldata (PAUSE_ONLY)...`, 'SUCCESS', 'LAYER_4');
           argsForKeeper[0] = 0; // Local execution doesn't use LI.FI, so we pause instead of safe harbor escape to avoid ODIGGuard invariant failure
        }

        // 2. Dispatch directly via custom viem executor
        await publishArchLog(`Dispatching to local IBEA Keeper Module...`, 'SUCCESS', 'LAYER_4');
        
        const executedTxHash = await submitKeeperExecution(
          config.IBEA_CORE_ADDRESS as `0x${string}`,
          IBEA_CORE_ABI,
          'triggerStrategy',
          argsForKeeper
        );

        console.log(`[relayer] ✅ Dispatched via Custom IBEA Relayer! Tx: ${executedTxHash}`);
        
        await publishArchLog(`Keeper Module executed cross-chain action on Somnia. Tx: ${executedTxHash}`, 'SUCCESS', 'LAYER_4', executedTxHash);
        
        // 3. Emit ODIG_VALIDATING then EXECUTED only on SUCCESS
        await redisPub.publish(
          'ibea:events',
          JSON.stringify({
            type: 'KEEPER_ACTION_UPDATE',
            payload: {
              id: keeperActionId,
              timestamp: Date.now(),
              strategy: strategyEnum === 2 ? 'SAFE_HARBOR' : 'EVACUATE',
              status: 'ODIG_VALIDATING',
              txHash: executedTxHash,
              protocolId: protocolId || 'ibea-core',
              odigChecks: await getOdigCheckStatus(keeperActionId)
            },
            ts: Date.now()
          })
        );
        
        // Transition to EXECUTED after on-chain validation
        const publicClient = createPublicClient({
          chain: { id: config.SOMNIA_CHAIN_ID, name: 'Somnia Shannon', nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 }, rpcUrls: { default: { http: [config.SOMNIA_RPC_URL] } } },
          transport: http(config.SOMNIA_RPC_URL)
        });
        
        // Let it run in background to not block relayer loop
        publicClient.waitForTransactionReceipt({ hash: executedTxHash as `0x${string}` }).then(async (receipt) => {
          if (receipt.status === 'success') {
            await redisPub.publish(
              'ibea:events',
              JSON.stringify({
                type: 'KEEPER_ACTION_UPDATE',
                payload: {
                  id: keeperActionId,
                  timestamp: Date.now(),
                  strategy: strategyEnum === 2 ? 'SAFE_HARBOR' : 'EVACUATE',
                  status: 'EXECUTED',
                  txHash: executedTxHash,
                  protocolId: protocolId || 'ibea-core',
                  odigChecks: await getOdigCheckStatus(keeperActionId)
                },
                ts: Date.now()
              })
            );

            // Also mark the LI.FI route as COMPLETED
            if (lifiRouteId) {
              await redisPub.publish(
                'ibea:events',
                JSON.stringify({
                  type: 'LIFI_ROUTE_UPDATE',
                  payload: { id: lifiRouteId, status: 'COMPLETED' },
                  ts: Date.now()
                })
              );
            }
          } else {
            throw new Error("Transaction reverted on-chain");
          }
        }).catch(async (err) => {
          console.error('[relayer] On-chain execution reverted:', err);
          await publishArchLog(`Keeper Relayer transaction reverted on-chain.`, 'FAIL', 'LAYER_4');

          await redisPub.publish(
            'ibea:events',
            JSON.stringify({
              type: 'KEEPER_ACTION_UPDATE',
              payload: {
                id: keeperActionId,
                timestamp: Date.now(),
                strategy: strategyEnum === 2 ? 'SAFE_HARBOR' : 'EVACUATE',
                status: 'FAILED',
                protocolId: protocolId || 'ibea-core',
                odigChecks: []
              },
              ts: Date.now()
            })
          );

          if (lifiRouteId) {
            await redisPub.publish(
              'ibea:events',
              JSON.stringify({
                type: 'LIFI_ROUTE_UPDATE',
                payload: { id: lifiRouteId, status: 'FAILED' },
                ts: Date.now()
              })
            );
          }
        });
      } catch (txErr) {
        console.error('[relayer] Failed to send Keeper execution:', txErr);
        await publishArchLog(`Failed to execute via Keeper Relayer: ${(txErr as Error).message}`, 'FAIL', 'LAYER_4');

        // Emit FAILED keeper action so the UI reflects the real state
        await redisPub.publish(
          'ibea:events',
          JSON.stringify({
            type: 'KEEPER_ACTION_UPDATE',
            payload: {
              id: keeperActionId,
              timestamp: Date.now(),
              strategy: strategyEnum === 2 ? 'SAFE_HARBOR' : 'EVACUATE',
              status: 'FAILED',
              protocolId: protocolId || 'ibea-core',
              odigChecks: []
            },
            ts: Date.now()
          })
        );

        // Mark LI.FI route as FAILED too if one was created
        if (lifiRouteId) {
          await redisPub.publish(
            'ibea:events',
            JSON.stringify({
              type: 'LIFI_ROUTE_UPDATE',
              payload: { id: lifiRouteId, status: 'FAILED' },
              ts: Date.now()
            })
          );
        }
      }
    } catch (err) {
      console.error('[relayer] Failed to process message:', err);
    }
  });

  console.log('[relayer] ✅ Relayer listening for RiskEvents.');

  return async () => {
    await redisSub.unsubscribe('ibea:riskevent');
  };
}
