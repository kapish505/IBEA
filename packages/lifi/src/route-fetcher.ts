import { getRoutes, type Route } from "@lifi/sdk";
import type { LifiRouteRequest, ExtractedCalldata } from "./types.js";
import { filterSafeHarborRoute } from "./safe-harbor-filter.js";
import { extractCalldata } from "./calldata-extractor.js";
import type { SafeHarborDestination } from "@ibea/shared";

/**
 * Fetches cross-chain routes using LI.FI SDK and validates them against Safe Harbors.
 */
export const fetchAndValidateRoute = async (
  request: LifiRouteRequest,
  safeHarbors: SafeHarborDestination[]
): Promise<{ route: Route; calldata: ExtractedCalldata } | null> => {
  try {
    const routesResponse = await getRoutes({
      fromChainId: request.fromChainId,
      fromAmount: request.fromAmount.toString(),
      fromTokenAddress: request.fromTokenAddress,
      toChainId: request.toChainId,
      toTokenAddress: request.toTokenAddress,
      fromAddress: request.fromAddress,
    });

    if (!routesResponse.routes || routesResponse.routes.length === 0) {
      return null;
    }

    // Filter routes by Safe Harbor
    const validRoutes = routesResponse.routes.filter((route) =>
      filterSafeHarborRoute(route, safeHarbors)
    );

    if (validRoutes.length === 0) {
      return null;
    }

    // Pick the best valid route
    const bestRoute = validRoutes[0]!;

    // Extract calldata
    const calldata = extractCalldata(bestRoute);
    if (!calldata) {
      return null;
    }

    return { route: bestRoute, calldata };
  } catch (error) {
    console.error("Error fetching LI.FI routes:", error);
    return null;
  }
};
