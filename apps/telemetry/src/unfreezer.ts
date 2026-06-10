import { createWalletClient, createPublicClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const RPC_URL = 'https://dream-rpc.somnia.network';
const PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY || '0x418436b53fd8615e24258e64d549eb9d7e01da03f489972f70e1d941a3ff7bb8';
const ODIG_GUARD_ADDRESS = '0xbC0aED441E79b1229EB19ef78C2D984443928106';

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

const publicClient = createPublicClient({
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  transport: http(RPC_URL),
});

const ABI = [
  {
    type: 'function',
    name: 'isFrozen',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'liftFreeze',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
];

async function checkAndUnfreeze() {
  try {
    const isFrozen = await publicClient.readContract({
      address: ODIG_GUARD_ADDRESS,
      abi: ABI,
      functionName: 'isFrozen',
    });

    if (isFrozen) {
      console.log(`[Unfreezer] 🧊 Contract is frozen! Unfreezing...`);
      const hash = await walletClient.writeContract({
        address: ODIG_GUARD_ADDRESS,
        abi: ABI,
        functionName: 'liftFreeze',
      });
      console.log(`[Unfreezer] 🔥 Unfreeze tx sent: ${hash}`);
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`[Unfreezer] ✅ Successfully unfrozen!`);
    }
  } catch (err) {
    console.error(`[Unfreezer] Error:`, err);
  }
}

async function startPolling() {
  console.log(`[Unfreezer] 🕵️‍♂️ Starting background monitoring of ODIGGuard (${ODIG_GUARD_ADDRESS})...`);
  while (true) {
    await checkAndUnfreeze();
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

startPolling();
