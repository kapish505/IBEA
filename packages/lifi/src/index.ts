import { getQuote, type RouteOptions } from '@lifi/sdk';

export interface CrossChainPayload {
  targetChainId: number;
  targetAsset: string;
  amount: string;
  userAddress: string;
}

export async function fetchLifiRoute(payload: CrossChainPayload) {
  try {
    // We simulate from Polygon (137) to get a REAL LI.FI cross-chain route payload
    // since Somnia Testnet (50312) is not natively supported by the LI.FI API yet.
    const quote = await getQuote({
      fromChain: 137, 
      toChain: payload.targetChainId === 50312 ? 1 : payload.targetChainId, // route to Eth if target is somnia
      fromToken: '0x0000000000000000000000000000000000000000', // native MATIC
      toToken: '0x0000000000000000000000000000000000000000', // native ETH (or native on target chain)
      fromAmount: payload.amount,
      fromAddress: payload.userAddress,
    });
    
    return quote;
  } catch (err) {
    console.error('[lifi] Error fetching LI.FI route:', err);
    throw err;
  }
}
