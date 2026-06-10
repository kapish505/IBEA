# IBEA — Invariant-Bounded Escalation Architecture

**Autonomous Defense Infrastructure for Onchain Capital on Somnia Network**

IBEA is a production-grade multi-tier autonomous defense system for DeFi protocols. It combines real-time telemetry, M-of-N consensus threat validation, AI-powered semantic reasoning, mathematically enforced execution invariants, and deterministic cross-chain evacuation — built on Somnia's native agent infrastructure and Somnia Shannon Testnet.

---

## Architecture Overview

```
DefiLlama API (TVL monitoring, 60s polls)
        ↓ HTTP
Layer 0 Reflex Engine (Node.js / Hono)
        ↓ Redis pub/sub
M-of-N Consensus Gate (tier1-gate.ts)
        ↓ escalation threshold crossed
IBEA Custom Relayer → LI.FI cross-chain route
        ↓
ODIGGuard (5 invariant checks, onchain)
        ↓
SafeHarborRegistry (pre-approved destinations only)
        ↓
LI.FI Diamond → cross-chain fund evacuation

Real-time feed → Redis → WebSocket → SRO Dashboard (Next.js)
```

### Five Contract Layers

| Contract | Role |
|---|---|
| `IBEACore` | Central coordinator, alert level state machine |
| `EscalationGate` | M-of-N validation, tier classification |
| `ThreatVectorMatrix` | 5-dimension risk state with exponential decay |
| `KeeperRegistry` | Whitelist of authorized keeper wallets |
| `ODIGGuard` | Final atomic invariant guard before execution |
| `SafeHarborRegistry` | Approved destination chains and vault addresses |
| `SemanticBurstEngine` | Somnia AI agent orchestration on escalation |

---

## Deployed Contracts (Somnia Shannon Testnet — Chain ID: 50312)

| Contract | Address |
|---|---|
| IBEACore | `0x3d944021A2eA8e8492F4FC3B9852D8837D3ff5d8` |
| ThreatVectorMatrix | `0xf1477fB77aD4b65EE666479bFC6B3F4EC1617148` |
| EscalationGate | `0xB420e68e7Ed96aa9f04eFa3f1b6Db973059e4489` |
| SemanticBurstEngine | `0xC7c2B004Dc5Ee30D3a1114b6f33E989c81dD0d2F` |
| KeeperRegistry | `0xB46cEd9F82335A2Fd1cA12c899C23e8d5AeFE35e` |
| SafeHarborRegistry | `0xDAec7FCa10760AD762B46ebdcAD4436d5aEBe6a0` |
| ODIGGuard | `0xe19A77060b915f6A0Cb7f757501EDF620A33F04b` |
| SROCoordinator | `0x686325C209a6C01CAEC87ff4249f1181111c6F0A` |

Explorer: https://shannon-explorer.somnia.network

---

## Somnia Shannon Testnet

| Property | Value |
|---|---|
| Chain ID | `50312` |
| RPC | `https://dream-rpc.somnia.network` |
| WebSocket | `wss://dream-rpc.somnia.network` |
| Explorer | `https://shannon-explorer.somnia.network` |
| Block time | ~100ms |
| Native token | STT |

---

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Framer Motion, Zustand, Viem, Wagmi
- **Backend**: Hono (Node.js), PostgreSQL, Redis, WebSocket
- **Contracts**: Solidity ^0.8.24, Foundry, OpenZeppelin
- **Integrations**: DefiLlama TVL API, LI.FI cross-chain SDK, Somnia AgentManager

---

## Repository Structure

```
ibea/
├── apps/
│   ├── web/              # Next.js 15 SRO Dashboard
│   └── telemetry/        # Hono WebSocket + telemetry service
├── packages/
│   ├── contracts/        # Foundry Solidity contracts
│   └── lifi/             # LI.FI SDK route fetcher
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Security Architecture

### ODIGGuard Invariant Checks (enforced atomically before any execution)

1. **Oracle Price Health** — asset price must be above `minimumHealthThreshold`. Failure triggers emergency freeze.
2. **TWAP Deviation** — spot price must not deviate from 30-minute TWAP by more than `maxTwapDeviationBps` (default 500 bps = 5%). Guards against flash-loan oracle manipulation.
3. **Stablecoin Health** — if asset is a registered stablecoin, depeg must not exceed `maxStablecoinDepegBps` (default 200 bps = 2%).
4. **Safe Harbor Verification** — destination chain ID and vault address from LI.FI calldata must be registered in `SafeHarborRegistry`. Any unknown destination causes an emergency freeze.
5. **LI.FI Execution** — if all invariants pass, the LI.FI diamond call is made. On failure, reverts with `LiFiRouteFailed`.

If any invariant fails → `_executeEmergencyFreeze()` is called and no capital moves.

### Access Control

- `executeDefensiveStrategy` on `ODIGGuard` is restricted to authorized `keeper` only (`onlyKeeperHub` modifier)
- `keeperHub` address is set at deploy time and updatable only by `owner` (2-step Ownable)
- `SafeHarborRegistry` entries are set only by `owner`
- `triggerStrategy` on `IBEACore` is restricted to authorized `keeper` only

---

## License

MIT
