import type { Route } from "@lifi/sdk";
import type { ExtractedCalldata } from "./types.js";

/**
 * Extracts the exact LI.FI diamond calldata needed for ODIG's executeDefensiveStrategy.
 */
export const extractCalldata = (route: Route): ExtractedCalldata | null => {
  if (!route.steps || route.steps.length === 0) {
    return null;
  }

  // Find the first step that contains the transaction request.
  // In a real implementation, you might need to handle multi-step routes more carefully,
  // or use lifi.getStepTransaction(step).
  const step = route.steps[0];
  
  if (step && step.transactionRequest) {
     return {
         lifiDiamond: (step.transactionRequest.to as `0x${string}`) || "0x",
         calldata: (step.transactionRequest.data as `0x${string}`) || "0x",
     };
  }

  return null;
};
