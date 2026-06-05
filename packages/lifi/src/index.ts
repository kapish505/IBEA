import { getQuote, type RouteOptions } from '@lifi/sdk';

export interface CrossChainPayload {
  targetChainId: number;
  targetAsset: string;
  amount: string;
  userAddress: string;
}

export async function fetchLifiRoute(payload: CrossChainPayload) {
  try {
    // We are originating from Somnia (Chain ID: 50312)
    const quote = await getQuote({
      fromChain: 50312, 
      toChain: payload.targetChainId,
      fromToken: '0x0000000000000000000000000000000000000000', // native STT
      toToken: payload.targetAsset,
      fromAmount: payload.amount,
      fromAddress: payload.userAddress,
    });
    
    return quote;
  } catch (err) {
    console.error('[lifi] Error fetching LI.FI route:', err);
    throw err;
  }
}
