import { createConfig } from "@ponder/core";
import { http, createPublicClient } from "viem";
import { IBEACoreABI, EscalationGateABI, ThreatVectorMatrixABI, ODIGGuardABI } from "@ibea/shared/abis";

const rpcUrl = process.env.PONDER_RPC_URL_50312 || "https://dream-rpc.somnia.network";

// Read dynamic start block from env set by wrapper script, default to recent fallback
const startBlock = Number(process.env.PONDER_START_BLOCK || 407417530);

export default createConfig({
  networks: {
    somniaShannon: {
      chainId: 50312,
      transport: http(rpcUrl),
      maxBlockRange: 900,
    },
  },
  contracts: {
    IBEACore: {
      abi: IBEACoreABI,
      network: "somniaShannon",
      address: (process.env.NEXT_PUBLIC_IBEA_CORE_ADDRESS || "0x54095465F0eB6B8642C30e99bE9A2fb86C279663") as `0x${string}`,
      startBlock,
    },
    EscalationGate: {
      abi: EscalationGateABI,
      network: "somniaShannon",
      address: (process.env.NEXT_PUBLIC_ESCALATION_GATE_ADDRESS || "0xBeEb57C55981E35BF93612B3375cc50e6498A4a7") as `0x${string}`,
      startBlock,
    },
    ThreatVectorMatrix: {
      abi: ThreatVectorMatrixABI,
      network: "somniaShannon",
      address: (process.env.NEXT_PUBLIC_THREAT_VECTOR_MATRIX_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
      startBlock,
    },
    ODIGGuard: {
      abi: ODIGGuardABI,
      network: "somniaShannon",
      address: (process.env.NEXT_PUBLIC_ODIG_GUARD_ADDRESS || "0xe10eC449C5b4081D08641252b00b5193c8Df7061") as `0x${string}`,
      startBlock,
    }
  },
});

