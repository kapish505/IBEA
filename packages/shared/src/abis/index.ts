/**
 * ISomniaAgent ABI
 *
 * This represents the EVM interface for calling Somnia's native agents.
 * The exact ABI will be updated when Somnia publishes agent contract specs.
 * The interaction PATTERN is production-ready — only addresses change.
 *
 * Tier 1: JSON API Agent — structured offchain intelligence fetch
 * Tier 2: Website Parse Agent — semantic context enrichment
 * Tier 3: LLM Inference Agent — bounded threat reasoning
 */
export const ISomniaAgentABI = [
  {
    name: "requestInference",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "requestId", type: "uint256" },
      { name: "payload", type: "bytes" },
    ],
    outputs: [{ name: "jobId", type: "bytes32" }],
  },
  {
    name: "getInferenceResult",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "bytes32" }],
    outputs: [
      { name: "ready", type: "bool" },
      { name: "result", type: "bytes" },
    ],
  },
  {
    name: "InferenceRequested",
    type: "event",
    inputs: [
      { name: "jobId", type: "bytes32", indexed: true },
      { name: "requester", type: "address", indexed: true },
      { name: "requestId", type: "uint256", indexed: false },
    ],
  },
  {
    name: "InferenceCompleted",
    type: "event",
    inputs: [
      { name: "jobId", type: "bytes32", indexed: true },
      { name: "resultHash", type: "bytes32", indexed: false },
    ],
  },
] as const;

export const IBEACoreABI = [
  {
    name: "RiskEvent",
    type: "event",
    inputs: [
      { name: "epoch", type: "uint256", indexed: true },
      { name: "alertLevel", type: "uint8", indexed: true },
      { name: "aggregateThreat", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "escalate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "protocolId", type: "uint256" },
      { name: "threatVectors", type: "uint256[5]" },
    ],
    outputs: [],
  },
  {
    name: "getProtocolState",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "protocolId", type: "uint256" }],
    outputs: [
      { name: "escalationState", type: "uint8" },
      { name: "lastRiskEvent", type: "uint256" },
    ],
  },
] as const;

export const EscalationGateABI = [
  {
    name: "ThresholdReached",
    type: "event",
    inputs: [
      { name: "epoch", type: "uint256", indexed: true },
      { name: "aggregateThreat", type: "uint256", indexed: false },
    ],
  },
  {
    name: "submitSignal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "protocolId", type: "uint256" },
      { name: "dimension", type: "uint8" },
      { name: "magnitude", type: "uint256" },
      { name: "evidence", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "isEscalated",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "protocolId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const ThreatVectorMatrixABI = [
  {
    name: "DimensionUpdated",
    type: "event",
    inputs: [
      { name: "dim", type: "uint8", indexed: true },
      { name: "oldValue", type: "uint256", indexed: false },
      { name: "newValue", type: "uint256", indexed: false },
      { name: "block_", type: "uint256", indexed: false },
    ],
  },
  {
    name: "getVectors",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "protocolId", type: "uint256" }],
    outputs: [{ name: "vectors", type: "uint256[5]" }],
  },
  {
    name: "updateVectors",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "protocolId", type: "uint256" },
      { name: "vectors", type: "uint256[5]" },
    ],
    outputs: [],
  },
] as const;

export const ODIGGuardABI = [
  {
    name: "ExecutionAuthorized",
    type: "event",
    inputs: [
      { name: "targetAsset", type: "address", indexed: true },
      { name: "lifiDiamond", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "InvariantFailed",
    type: "event",
    inputs: [
      { name: "targetAsset", type: "address", indexed: true },
      { name: "reason", type: "string", indexed: false },
    ],
  },
  {
    name: "EmergencyFreezeActivated",
    type: "event",
    inputs: [
      { name: "initiator", type: "address", indexed: true },
      { name: "block_", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "executeDefensiveStrategy",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "targetAsset", type: "address" },
      { name: "lifiDiamond", type: "address" },
      { name: "lifiData", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

export const SafeHarborRegistryABI = [
  {
    name: "SafeHarborAdded",
    type: "event",
    inputs: [
      { name: "chainId", type: "uint256", indexed: true },
      { name: "vaultAddress", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "isApproved",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "chainId", type: "uint256" },
      { name: "vaultAddress", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "addSafeHarbor",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "chainId", type: "uint256" },
      { name: "vaultAddress", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "getAllDestinations",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "chainIds", type: "uint256[]" },
      { name: "vaultAddresses", type: "address[]" },
    ],
  },
] as const;

export const KeeperRegistryABI = [
  {
    name: "KeeperRegistered",
    type: "event",
    inputs: [
      { name: "keeper", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "isKeeper",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
