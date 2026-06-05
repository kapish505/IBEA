import { createPublicClient, http } from "viem";
import { somniaShannon, SafeHarborRegistryABI } from "@ibea/shared";

const publicClient = createPublicClient({
  chain: somniaShannon,
  transport: http(process.env.SOMNIA_RPC_URL || "https://dream-rpc.somnia.network"),
});

const registryAddress = (process.env.NEXT_PUBLIC_SAFE_HARBOR_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

/**
 * Validates a destination against the onchain Safe Harbor Registry.
 */
export const validateSafeHarborOnchain = async (chainId: number, vaultAddress: `0x${string}`): Promise<boolean> => {
  try {
    const isApproved = await publicClient.readContract({
      address: registryAddress,
      abi: SafeHarborRegistryABI,
      functionName: "isApproved",
      args: [BigInt(chainId), vaultAddress],
    });
    return isApproved as boolean;
  } catch (error) {
    console.error("Error validating safe harbor onchain:", error);
    return false;
  }
};
