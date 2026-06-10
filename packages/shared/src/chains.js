import { defineChain } from "viem";
/**
 * Somnia Shannon Testnet chain definition for Viem.
 * Chain ID: 50312
 * Block time: ~100ms
 * Finality: sub-second (deterministic validator-backed)
 */
export const somniaShannon = defineChain({
    id: 50312,
    name: "Somnia Shannon Testnet",
    nativeCurrency: {
        decimals: 18,
        name: "Somnia Test Token",
        symbol: "STT",
    },
    rpcUrls: {
        default: {
            http: [
                process.env["SOMNIA_RPC_URL"] ??
                    process.env["NEXT_PUBLIC_SOMNIA_RPC_URL"] ??
                    "https://dream-rpc.somnia.network",
            ],
            webSocket: [
                process.env["SOMNIA_WSS_URL"] ??
                    process.env["NEXT_PUBLIC_SOMNIA_WSS_URL"] ??
                    "wss://dream-rpc.somnia.network",
            ],
        },
        public: {
            http: ["https://dream-rpc.somnia.network"],
            webSocket: ["wss://dream-rpc.somnia.network"],
        },
    },
    blockExplorers: {
        default: {
            name: "Somnia Shannon Explorer",
            url: "https://shannon-explorer.somnia.network",
        },
    },
    testnet: true,
});
export const SOMNIA_CHAIN_ID = 50312;
//# sourceMappingURL=chains.js.map