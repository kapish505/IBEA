import type { Route } from "@lifi/sdk";

export interface LifiRouteRequest {
  fromChainId: number;
  fromAmount: bigint;
  fromTokenAddress: string;
  toChainId: number;
  toTokenAddress: string;
  fromAddress: string;
}

export interface ExtractedCalldata {
  lifiDiamond: `0x${string}`;
  calldata: `0x${string}`;
}
