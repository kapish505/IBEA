import { createWalletClient, createPublicClient, http, publicActions, type Hex, parseGwei } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { somniaShannon, ODIGGuardABI } from "@ibea/shared";

const privateKey = process.env.KEEPER_PRIVATE_KEY as Hex | undefined;
const account = privateKey ? privateKeyToAccount(privateKey) : undefined;

const transport = http(process.env.SOMNIA_RPC_URL || "https://dream-rpc.somnia.network");

const walletClient = createWalletClient({
  account,
  chain: somniaShannon,
  transport,
}).extend(publicActions);

const publicClient = createPublicClient({
  chain: somniaShannon,
  transport,
});

const odigAddress = (process.env.NEXT_PUBLIC_ODIG_GUARD_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

/**
 * Executes a defensive strategy via the ODIG Guard contract with gas bumping and retry logic.
 */
export const executeDefensiveStrategy = async (
  targetAsset: `0x${string}`,
  lifiDiamond: `0x${string}`,
  lifiData: `0x${string}`
): Promise<`0x${string}`> => {
  if (!account) {
    throw new Error("Keeper private key not configured");
  }

  const maxRetries = 3;
  let currentRetry = 0;
  
  while (currentRetry < maxRetries) {
    try {
      const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: 'pending' });
      const gasPrice = await publicClient.getGasPrice();
      // Bump gas by 15% per retry if stuck
      const adjustedGasPrice = gasPrice + (gasPrice * BigInt(15 * currentRetry)) / 100n;

      const { request } = await publicClient.simulateContract({
        address: odigAddress,
        abi: ODIGGuardABI,
        functionName: "executeDefensiveStrategy",
        args: [targetAsset, lifiDiamond, lifiData],
        account,
        nonce,
        gasPrice: adjustedGasPrice,
      });

      const hash = await walletClient.writeContract(request);
      console.log(`[ODIG] Tx submitted: ${hash} (Attempt ${currentRetry + 1})`);
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      if (receipt.status !== 'success') {
         throw new Error("Transaction reverted");
      }
      
      return hash;
    } catch (err) {
      console.error(`[ODIG] Execution failed on attempt ${currentRetry + 1}:`, err);
      currentRetry++;
      if (currentRetry >= maxRetries) {
         throw new Error("Max execution retries exceeded");
      }
      // Wait before retry
      await new Promise(res => setTimeout(res, 2000 * currentRetry));
    }
  }
  throw new Error("Execution failed");
};
