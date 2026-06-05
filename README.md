# IBEA — Invariant-Bounded Escalation Architecture

**Autonomous Defense Infrastructure for Onchain Capital on Somnia Network**

IBEA is a production-grade multi-tier autonomous defense system for DeFi protocols and liquidity providers. It combines ultra-fast deterministic telemetry, asynchronous semantic AI reasoning, bounded autonomous orchestration, mathematically enforced execution invariants, and deterministic cross-chain evacuation — all built on Somnia's native agent infrastructure.

---

## Core Guarantees

1. **No unrestricted AI execution** — all AI outputs are bounded to a 4-byte `StrategyEnum`. The AI never generates calldata.
2. **Event-driven, never cron-driven** — all telemetry uses WebSocket subscriptions and RPC event listeners.
3. **ODIG-bound execution** — every capital movement is atomically invariant-checked before execution. If invariants fail, an emergency freeze triggers instead.
4. **Zero mock data** — all metrics, telemetry signals, and chart data originate from real sources (Somnia RPC, DefiLlama, Forta, LI.FI SDK).

---

## Architecture

```
USER / LP
    ↓
SRO Dashboard (Next.js 15)
    ↓ WebSocket
Telemetry Service (Hono)
    ↓ Somnia RPC + Forta + DefiLlama
IBEA Core (Onchain — Somnia Shannon)
    │
    ├── EscalationGate (M-of-N validation)
    ├── SemanticBurstEngine (3-tier Somnia agents)
    ├── ThreatVectorMatrix (5-dim, decaying)
    ├── KeeperHub Runtime (offchain orchestration)
    │       └── LI.FI Route Fetcher
    └── ODIGGuard (invariant enforcement)
            └── SafeHarborRegistry
```

### Five-Layer Separation

| Layer | Role | Location |
|---|---|---|
| EscalationGate | M-of-N multi-source anomaly validation | Onchain |
| SemanticBurstEngine | Dormant → activated; wraps 3 Somnia agent calls | Onchain |
| ThreatVectorMatrix | 5-dim risk state with exponential decay | Onchain |
| KeeperHub Runtime | Offchain orchestration + strategy selection | Offchain |
| ODIG Guards | Final atomic invariant enforcement | Onchain |

---

## Tech Stack

### Frontend
- **Next.js 15** App Router + TypeScript
- **Tailwind CSS** with custom design tokens
- **shadcn/ui** components
- **Framer Motion** for state-driven animations
- **Zustand** for real-time state
- **Viem + Wagmi** for wallet connection (custom UI — no RainbowKit)
- **React Query** for HTTP data
- **Recharts** for threat vector visualization

### Smart Contracts
- **Solidity ^0.8.24**
- **Foundry** for testing and deployment
- **OpenZeppelin** for security primitives
- **Somnia Shannon Testnet** (Chain ID: 50312)

### Backend
- **Hono** WebSocket telemetry service
- **PostgreSQL** for persistent state
- **Redis** pub/sub for real-time fan-out
- **Ponder** event indexer

### Integrations
- **Somnia native agents** — EVM contract calls to JSON API, Website Parse, and LLM Inference agents
- **LI.FI SDK** (`@lifi/sdk`) — bounded cross-chain evacuation routes
- **Forta** — real-time DeFi threat alerts
- **DefiLlama** — TVL change monitoring

---

## Repository Structure

```
ibea/
├── apps/
│   ├── web/                    # Next.js 15 SRO Dashboard
│   └── telemetry/              # Hono WebSocket + RPC telemetry service
├── packages/
│   ├── contracts/              # Foundry Solidity contracts
│   ├── indexer/                # Ponder event indexer
│   ├── keeper/                 # KeeperHub orchestration runtime
│   ├── lifi/                   # LI.FI SDK route fetcher
│   ├── shared/                 # Shared types, ABIs, chain config, constants
│   └── ui/                     # Shared component library
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

---

## Getting Started

### Prerequisites
- Node.js ≥ 20
- pnpm ≥ 9
- PostgreSQL (running locally or remote)
- Redis (running locally or remote)
- Foundry (`curl -L https://foundry.paradigm.xyz | bash`)

### Setup

```bash
# Clone and install
git clone <repo>
cd ibea
pnpm install

# Copy environment config
cp .env.example .env
# Fill in: KEEPER_PRIVATE_KEY, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID, FORTA_BOT_IDS
# Somnia agent addresses will be available from Somnia team

# Start infrastructure (ensure Postgres and Redis are running locally)
# e.g., `redis-server` and your local postgres service

# Deploy contracts to Somnia Shannon Testnet
pnpm contracts:deploy

# Start all services
pnpm dev
```

### Contract Deployment

```bash
cd packages/contracts

# Set env
export SOMNIA_RPC_URL=https://dream-rpc.somnia.network
export PRIVATE_KEY=<your-deployer-key>

# Deploy
forge script script/DeployCore.s.sol --rpc-url $SOMNIA_RPC_URL --broadcast --verify

# After deployment, copy addresses to .env
```

---

## Threat Vector Decay Mechanics

Each of the five threat dimensions decays exponentially per block:

```
value_new = value_current × DECAY_FACTOR / 1e18
```

Where `DECAY_FACTOR = 0.995e18` (applied every `DECAY_INTERVAL = 10 blocks` ≈ 1 second on Somnia).

This creates **adaptive equilibrium** — stale escalations don't persist. If no new telemetry reinforces a dimension, the system naturally de-escalates. The KeeperHub offchain decay tracker mirrors this model before submitting onchain updates to avoid gas waste.

---

## Security Architecture

### ODIG Invariant Checks (in order)
1. **TWAP Safety** — current price must be within `MIN_TWAP_HEALTH_RATIO` of TWAP
2. **Stablecoin Health** — destination stablecoin peg must be ≥ `MIN_STABLECOIN_PEG_RATIO`
3. **Bridge Validity** — LI.FI bridge must be operational and not flagged
4. **Slippage Bounds** — route slippage must not exceed `MAX_SLIPPAGE_BPS`
5. **Safe Harbor Verification** — destination must be in `SafeHarborRegistry`

If any check fails: `_executeEmergencyFreeze()` — no capital movement occurs.

### AI Safety Constraints
- LLM Inference Agent output is strictly `(uint256 protocolId, uint8 threatScore, uint8 strategyEnum, uint256 targetChainId)`
- `strategyEnum` is a bounded 4-value enum — no arbitrary string outputs
- The AI never generates calldata
- ODIG validates every execution independently of AI output

---

## Network: Somnia Shannon Testnet

| Property | Value |
|---|---|
| Chain ID | 50312 |
| RPC | https://dream-rpc.somnia.network |
| WebSocket | wss://dream-rpc.somnia.network |
| Explorer | https://shannon-explorer.somnia.network |
| Block time | ~100ms |
| Finality | Sub-second (deterministic) |
| Native token | STT |

Somnia's ~100ms block times and sub-second deterministic finality are what make IBEA's real-time threat response architecture possible. Traditional chains (1-12s blocks) cannot support the latency requirements of autonomous DeFi defense.

---

## Deployment

| Service | Platform |
|---|---|
| Frontend | Vercel |
| Telemetry Service | Railway / Fly.io |
| PostgreSQL | Railway Postgres |
| Redis | Railway Redis / Upstash |
| Ponder Indexer | Railway |
| Contracts | Somnia Shannon Testnet |

---

## License

MIT
