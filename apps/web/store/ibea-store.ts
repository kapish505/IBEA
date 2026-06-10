import { create } from 'zustand'
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware'

// ─── Type Definitions ───────────────────────────────────────────────────────

export type EscalationState =
  | 'NOMINAL'
  | 'MONITORING'
  | 'ELEVATED'
  | 'CRITICAL'
  | 'SEMANTIC_BURST'
  | 'EXECUTING'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type ProtocolStatus = 'NOMINAL' | 'MONITORING' | 'ELEVATED' | 'CRITICAL'

export interface ThreatVectors {
  liquidityStress: number        // 0–1
  bridgeInstability: number      // 0–1
  governanceRisk: number         // 0–1
  oracleManipulationRisk: number // 0–1
  contagionProbability: number   // 0–1
}

export interface Protocol {
  id: string
  name: string
  address: string
  chainId: number
  status: ProtocolStatus
  tvl: string | null
  riskScore: number | null       // 0–100
  lastUpdated: number
}

export type EscalationEventType =
  | 'RISK_EVENT'
  | 'ESCALATION'
  | 'SEMANTIC_BURST'
  | 'KEEPER_ACTION'
  | 'ODIG_EXECUTION'
  | 'TELEMETRY'

export interface SemanticEvidence {
  source: string
  excerpt: string
  confidence: number
  parsedAt: number
}

export interface ArchLog {
  id: string
  layer: 'LAYER_1' | 'LAYER_2' | 'LAYER_3' | 'LAYER_4'
  message: string
  timestamp: number
  status: 'PENDING' | 'SUCCESS' | 'FAIL'
  txHash?: string
}

export interface AgentResult {
  taskId: string
  workflow: string
  result: string
  txHash?: string
  requestTxHash?: string
  taskData?: string
  timestamp: number
}

export interface EscalationEvent {
  id: string
  type: EscalationEventType
  timestamp: number
  title: string
  description: string
  protocolId?: string
  severity: RiskLevel
  semanticEvidence?: SemanticEvidence[]
  txHash?: string
  blockNumber?: bigint
  tier: 1 | 2 | 3
}

export type ODIGCheckStatus = 'PENDING' | 'PASS' | 'FAIL' | 'RUNNING'

export interface ODIGCheck {
  id: string
  name: 'TWAP' | 'STABLECOIN' | 'BRIDGE' | 'SLIPPAGE' | 'SAFE_HARBOR' | 'EXECUTE'
  status: ODIGCheckStatus
  detail?: string
  timestamp?: number
}

export interface KeeperAction {
  id: string
  timestamp: number
  strategy: 'WITHDRAW' | 'HEDGE' | 'PAUSE' | 'EVACUATE' | 'REBALANCE'
  status: 'QUEUED' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'FROZEN'
  protocolId?: string
  txHash?: string
  gasUsed?: string
  odigChecks: ODIGCheck[]
}

export interface LiFiRoute {
  id: string
  fromChainId: number
  toChainId: number
  fromToken: string
  toToken: string
  fromAmount: string
  toAmount: string
  estimatedTime: number
  bridgeProvider: string
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED'
  decisionContext?: string
  steps: Array<{
    type: string
    protocol: string
    fromChain: number
    toChain: number
  }>
}

export interface SomniaMetrics {
  blockNumber: number | null
  blockTime: number | null        // ms, rolling average
  finality: number | null         // ms estimate
  validatorLatency: number | null // ms
  agentState: {
    tier1: 'ACTIVE' | 'DORMANT'
    tier2: 'ACTIVE' | 'DORMANT'
    tier3: 'ACTIVE' | 'DORMANT'
  } | null
}

export interface SafeHarborDestination {
  chainId: number
  chainName: string
  address: string
  approved: boolean
}

// ─── Store Interface ─────────────────────────────────────────────────────────

export interface IbeaStore {
  // Connection
  connectionStatus: ConnectionStatus
  setConnectionStatus: (status: ConnectionStatus) => void

  // Escalation
  escalationState: EscalationState
  setEscalationState: (state: EscalationState) => void

  // Threat Vectors — null until real data arrives
  threatVectors: ThreatVectors | null
  setThreatVectors: (vectors: ThreatVectors) => void

  // Protocols
  protocols: Protocol[]
  setProtocols: (protocols: Protocol[]) => void
  upsertProtocol: (protocol: Protocol) => void

  // Escalation Events
  escalations: EscalationEvent[]
  addEscalationEvent: (event: EscalationEvent) => void
  clearEscalations: () => void

  // Keeper Actions
  keeperActions: KeeperAction[]
  setKeeperActions: (actions: KeeperAction[]) => void
  upsertKeeperAction: (action: KeeperAction) => void
  clearKeeperActions: () => void
  updateODIGCheck: (actionId: string, check: ODIGCheck) => void

  // Arch Logs
  architectureLogs: ArchLog[]
  addArchLog: (log: ArchLog) => void
  clearArchLogs: () => void

  // Agent Results
  agentResults: AgentResult[]
  addAgentResult: (result: AgentResult) => void
  upsertAgentResult: (result: AgentResult) => void
  clearAgentResults: () => void

  // LiFi Routes
  lifiRoutes: LiFiRoute[]
  setLifiRoutes: (routes: LiFiRoute[]) => void
  upsertLifiRoute: (route: LiFiRoute) => void
  clearLifiRoutes: () => void

  // Somnia Metrics — null until block subscription fires
  somniaMetrics: SomniaMetrics
  setSomniaMetrics: (metrics: Partial<SomniaMetrics>) => void

  // Safe Harbor
  safeHarborDestinations: SafeHarborDestination[]
  setSafeHarborDestinations: (destinations: SafeHarborDestination[]) => void

  // UI State
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  selectedEventId: string | null
  setSelectedEventId: (id: string | null) => void
  activeFilters: EscalationEventType[]
  setActiveFilters: (filters: EscalationEventType[]) => void
  semanticBurstActive: boolean
  setSemanticBurstActive: (active: boolean) => void

  // Authorization
  authorizedAssetCount: number
  setAuthorizedAssetCount: (count: number) => void

  // Reset
  resetAll: () => void
}

// ─── Initial State ───────────────────────────────────────────────────────────

const initialSomniaMetrics: SomniaMetrics = {
  blockNumber: null,
  blockTime: null,
  finality: null,
  validatorLatency: null,
  agentState: null,
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useIBEAStore = create<IbeaStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
    // Connection
    connectionStatus: 'disconnected',
    setConnectionStatus: (status) => set({ connectionStatus: status }),

    // Escalation
    escalationState: 'NOMINAL',
    setEscalationState: (state) => {
      set({ escalationState: state })
      if (state === 'SEMANTIC_BURST') {
        set({ semanticBurstActive: true })
      } else {
        set({ semanticBurstActive: false })
      }
    },

    // Threat Vectors
    threatVectors: null,
    setThreatVectors: (vectors) => set({ threatVectors: vectors }),

    // Protocols
    protocols: [],
    setProtocols: (protocols) => set({ protocols }),
    upsertProtocol: (protocol) =>
      set((state) => {
        const existing = state.protocols.findIndex((p) => p.id === protocol.id)
        if (existing >= 0) {
          const updated = [...state.protocols]
          updated[existing] = protocol
          return { protocols: updated }
        }
        return { protocols: [...state.protocols, protocol] }
      }),

    // Escalation Events
    escalations: [],
    addEscalationEvent: (event) =>
      set((state) => ({
        escalations: [event, ...state.escalations].slice(0, 500), // cap at 500
      })),
    clearEscalations: () => set({ escalations: [] }),

    // Keeper Actions
    keeperActions: [],
    setKeeperActions: (actions) => set({ keeperActions: actions }),
    clearKeeperActions: () => set({ keeperActions: [] }),
    upsertKeeperAction: (action) =>
      set((state) => {
        const existing = state.keeperActions.findIndex((a) => a.id === action.id)
        if (existing >= 0) {
          const updated = [...state.keeperActions]
          updated[existing] = action
          return { keeperActions: updated }
        }
        return { keeperActions: [action, ...state.keeperActions] }
      }),
    updateODIGCheck: (actionId, check) =>
      set((state) => ({
        keeperActions: state.keeperActions.map((action) => {
          if (action.id !== actionId) return action
          const checkIndex = action.odigChecks.findIndex((c) => c.id === check.id)
          if (checkIndex >= 0) {
            const updatedChecks = [...action.odigChecks]
            updatedChecks[checkIndex] = check
            return { ...action, odigChecks: updatedChecks }
          }
          return { ...action, odigChecks: [...action.odigChecks, check] }
        }),
      })),

    // Arch Logs
    architectureLogs: [],
    addArchLog: (log) =>
      set((state) => ({
        architectureLogs: [log, ...state.architectureLogs].slice(0, 100),
      })),
    clearArchLogs: () => set({ architectureLogs: [] }),

    // Agent Results
    agentResults: [],
    addAgentResult: (result) =>
      set((state) => ({
        agentResults: [result, ...state.agentResults].slice(0, 100),
      })),
    upsertAgentResult: (result) =>
      set((state) => {
        const existingByRequestHash = state.agentResults.findIndex((r) => r.taskId === result.requestTxHash);
        if (existingByRequestHash >= 0) {
          const updated = [...state.agentResults];
          updated[existingByRequestHash] = { ...updated[existingByRequestHash], ...result, taskId: result.taskId };
          return { agentResults: updated };
        }
        const existing = state.agentResults.findIndex((r) => r.taskId === result.taskId);
        if (existing >= 0) {
          const updated = [...state.agentResults];
          updated[existing] = { ...updated[existing], ...result };
          return { agentResults: updated };
        }
        return { agentResults: [result, ...state.agentResults].slice(0, 100) };
      }),
    clearAgentResults: () => set({ agentResults: [] }),

    // LiFi Routes
    lifiRoutes: [],
    setLifiRoutes: (routes) => set({ lifiRoutes: routes }),
    clearLifiRoutes: () => set({ lifiRoutes: [] }),
    upsertLifiRoute: (route) =>
      set((state) => {
        const existing = state.lifiRoutes.findIndex((r) => r.id === route.id)
        if (existing >= 0) {
          const updated = [...state.lifiRoutes]
          updated[existing] = { ...updated[existing], ...route }
          return { lifiRoutes: updated }
        }
        return { lifiRoutes: [...state.lifiRoutes, route] }
      }),

    // Somnia Metrics
    somniaMetrics: initialSomniaMetrics,
    setSomniaMetrics: (metrics) =>
      set((state) => ({
        somniaMetrics: { ...state.somniaMetrics, ...metrics },
      })),

    // Safe Harbor
    safeHarborDestinations: [],
    setSafeHarborDestinations: (destinations) => set({ safeHarborDestinations: destinations }),

    // UI State
    commandPaletteOpen: false,
    setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    selectedEventId: null,
    setSelectedEventId: (id) => set({ selectedEventId: id }),
    activeFilters: [],
    setActiveFilters: (filters) => set({ activeFilters: filters }),
    semanticBurstActive: false,
    setSemanticBurstActive: (active) => set({ semanticBurstActive: active }),

    // Authorization
    authorizedAssetCount: 0,
    setAuthorizedAssetCount: (count) => set({ authorizedAssetCount: count }),

    // Reset
    resetAll: () =>
      set({
        connectionStatus: 'disconnected',
        escalationState: 'NOMINAL',
        threatVectors: null,
        protocols: [],
        escalations: [],
        keeperActions: [],
        lifiRoutes: [],
        agentResults: [],
        somniaMetrics: initialSomniaMetrics,
        safeHarborDestinations: [],
        semanticBurstActive: false,
        authorizedAssetCount: 0,
      }),
  })),
  {
    name: 'ibea-store',
    storage: createJSONStorage(() => sessionStorage),
  }
  )
)

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectCriticalProtocols = (state: IbeaStore) =>
  state.protocols.filter((p) => p.status === 'CRITICAL')

export const selectActiveKeeperActions = (state: IbeaStore) =>
  state.keeperActions.filter((a) => a.status === 'EXECUTING' || a.status === 'QUEUED')

export const selectFilteredEscalations = (state: IbeaStore) => {
  if (state.activeFilters.length === 0) return state.escalations
  return state.escalations.filter((e) => state.activeFilters.includes(e.type))
}

export const selectActiveLifiRoutes = (state: IbeaStore) =>
  state.lifiRoutes.filter((r) => r.status === 'ACTIVE' || r.status === 'PENDING')
