import { createConfig } from "@ponder/core";
import { http } from "viem";
import { IBEACoreABI, EscalationGateABI, ThreatVectorMatrixABI, ODIGGuardABI } from "@ibea/shared/abis";

const rpcUrl = process.env.PONDER_RPC_URL_50312 || "https://dream-rpc.somnia.network";

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
      address: (process.env.NEXT_PUBLIC_IBEA_CORE_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
      startBlock: 400671915,
    },
    EscalationGate: {
      abi: EscalationGateABI,
      network: "somniaShannon",
      address: (process.env.NEXT_PUBLIC_ESCALATION_GATE_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
      startBlock: 400671915,
    },
    ThreatVectorMatrix: {
      abi: ThreatVectorMatrixABI,
      network: "somniaShannon",
      address: (process.env.NEXT_PUBLIC_THREAT_VECTOR_MATRIX_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
      startBlock: 400671915,
    },
    ODIGGuard: {
      abi: ODIGGuardABI,
      network: "somniaShannon",
      address: (process.env.NEXT_PUBLIC_ODIG_GUARD_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
      startBlock: 400671915,
    }
  },
});
