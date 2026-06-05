import type { Route } from "@lifi/sdk";
import type { SafeHarborDestination } from "@ibea/shared";

/**
 * Validates a route against the Safe Harbor Registry.
 * In a real implementation, this would fetch from the SafeHarborRegistry smart contract via Viem.
 */
export const filterSafeHarborRoute = (
  route: Route,
  safeHarbors: SafeHarborDestination[]
): boolean => {
  const toChainId = route.toChainId;
  const toToken = route.toToken.address.toLowerCase();

  return safeHarbors.some(
    (sh) =>
      sh.chainId === toChainId && sh.vaultAddress.toLowerCase() === toToken
  );
};
