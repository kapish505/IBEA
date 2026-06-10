'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useIBEAStore } from '@/store/ibea-store'
import type {
  ThreatVectors,
  Protocol,
  EscalationEvent,
  KeeperAction,
  KeeperAction,
  LiFiRoute,
  ODIGCheck,
  AgentResult,
} from '@/store/ibea-store'

// ─── Telemetry WebSocket Message Types ───────────────────────────────────────

type TelemetryMessageType =
  | 'THREAT_VECTORS_UPDATE'
  | 'PROTOCOL_UPDATE'
  | 'ESCALATION_EVENT'
  | 'KEEPER_ACTION_UPDATE'
  | 'KEEPER_ODIG_CHECK'
  | 'LIFI_ROUTE_UPDATE'
  | 'ESCALATION_STATE_CHANGE'
  | 'SOMNIA_AGENT_STATE'
  | 'AGENT_RESULT'
  | 'ARCH_LOG'
  | 'PING'

interface TelemetryMessage {
  type: TelemetryMessageType
  payload: unknown
  timestamp: number
}

interface ThreatVectorsPayload {
  liquidityStress: number
  bridgeInstability: number
  governanceRisk: number
  oracleManipulationRisk: number
  contagionProbability: number
}

interface EscalationStatePayload {
  state: 'NOMINAL' | 'MONITORING' | 'ELEVATED' | 'CRITICAL' | 'SEMANTIC_BURST' | 'EXECUTING'
}

interface AgentStatePayload {
  tier1: 'ACTIVE' | 'DORMANT'
  tier2: 'ACTIVE' | 'DORMANT'
  tier3: 'ACTIVE' | 'DORMANT'
}

interface ODIGCheckPayload {
  actionId: string
  check: ODIGCheck
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const WS_URL = process.env.NEXT_PUBLIC_TELEMETRY_WS_URL ?? 'ws://localhost:3001'
const RECONNECT_DELAY_MS = 3000
const MAX_RECONNECT_ATTEMPTS = 10
const PING_INTERVAL_MS = 30_000

export function useTelemetry() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMounted = useRef(true)

    const {
      setConnectionStatus,
      setThreatVectors,
      upsertProtocol,
      addEscalationEvent,
      upsertKeeperAction,
      updateODIGCheck,
      upsertLifiRoute,
      setEscalationState,
      setSomniaMetrics,
      addArchLog,
      upsertAgentResult,
    } = useIBEAStore()

    const clearTimers = useCallback(() => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
      if (pingTimer.current) {
        clearInterval(pingTimer.current)
        pingTimer.current = null
      }
    }, [])

    const handleMessage = useCallback(
      (raw: string) => {
        let msg: TelemetryMessage
        try {
          msg = JSON.parse(raw) as TelemetryMessage
        } catch {
          console.warn('[IBEA Telemetry] Failed to parse message:', raw.slice(0, 100))
          return
        }

        switch (msg.type) {
          case 'THREAT_VECTORS_UPDATE': {
            const payload = msg.payload as ThreatVectorsPayload
            if (
              typeof payload.liquidityStress === 'number' &&
              typeof payload.bridgeInstability === 'number' &&
              typeof payload.governanceRisk === 'number' &&
              typeof payload.oracleManipulationRisk === 'number' &&
              typeof payload.contagionProbability === 'number'
            ) {
              const vectors: ThreatVectors = {
                liquidityStress: clamp(payload.liquidityStress),
                bridgeInstability: clamp(payload.bridgeInstability),
                governanceRisk: clamp(payload.governanceRisk),
                oracleManipulationRisk: clamp(payload.oracleManipulationRisk),
                contagionProbability: clamp(payload.contagionProbability),
              }
              setThreatVectors(vectors)
            }
            break
          }

          case 'PROTOCOL_UPDATE': {
            const protocol = msg.payload as Protocol
            if (protocol?.id && protocol?.address) {
              upsertProtocol(protocol)
            }
            break
          }

          case 'ESCALATION_EVENT': {
            const event = msg.payload as EscalationEvent
            if (event?.id && event?.type && event?.timestamp) {
              addEscalationEvent(event)
            }
            break
          }

          case 'KEEPER_ACTION_UPDATE': {
            const action = msg.payload as KeeperAction
            if (action?.id && action?.strategy) {
              upsertKeeperAction(action)
            }
            break
          }

          case 'KEEPER_ODIG_CHECK': {
            const { actionId, check } = msg.payload as ODIGCheckPayload
            if (actionId && check?.id) {
              updateODIGCheck(actionId, check)
            }
            break
          }

          case 'LIFI_ROUTE_UPDATE': {
            const route = msg.payload as LiFiRoute
            if (route?.id) {
              upsertLifiRoute(route)
            }
            break
          }

          case 'ESCALATION_STATE_CHANGE': {
            const { state } = msg.payload as EscalationStatePayload
            if (state) {
              setEscalationState(state)
            }
            break
          }

          case 'SOMNIA_AGENT_STATE': {
            const agentState = msg.payload as AgentStatePayload
            if (agentState) {
              setSomniaMetrics({ agentState })
            }
            break
          }

          case 'ARCH_LOG': {
            addArchLog(msg.payload as any)
            break
          }

          case 'AGENT_RESULT': {
            upsertAgentResult(msg.payload as AgentResult)
            break
          }

          case 'PING':
            // Server keepalive — no action needed
            break

          default:
            // Unknown message type — silently ignore
            break
        }
      },
      [
        setThreatVectors,
        upsertProtocol,
        addEscalationEvent,
        upsertKeeperAction,
        updateODIGCheck,
        upsertLifiRoute,
        setEscalationState,
        setSomniaMetrics,
        addArchLog,
        upsertAgentResult,
      ]
    )

  const connect = useCallback(() => {
    if (!isMounted.current) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setConnectionStatus('connecting')

    let ws: WebSocket
    try {
      ws = new WebSocket(WS_URL)
    } catch (err) {
      console.error('[IBEA Telemetry] Failed to create WebSocket:', err)
      setConnectionStatus('disconnected')
      scheduleReconnect()
      return
    }

    wsRef.current = ws

    ws.onopen = () => {
      if (!isMounted.current) return
      reconnectAttempts.current = 0
      setConnectionStatus('connected')

      // Start ping interval to keep connection alive
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }))
        }
      }, PING_INTERVAL_MS)

      console.info('[IBEA Telemetry] Connected to', WS_URL)
    }

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        handleMessage(event.data)
      }
    }

    ws.onerror = (err) => {
      console.warn('[IBEA Telemetry] WebSocket error:', err)
    }

    ws.onclose = (event) => {
      if (!isMounted.current) return
      clearTimers()
      setConnectionStatus('disconnected')
      console.info(
        `[IBEA Telemetry] Disconnected (code=${event.code}). Scheduling reconnect...`
      )
      scheduleReconnect()
    }
  }, [handleMessage, setConnectionStatus, clearTimers]) // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleReconnect = useCallback(() => {
    if (!isMounted.current) return
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[IBEA Telemetry] Max reconnect attempts reached.')
      return
    }

    const delay = Math.min(
      RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttempts.current),
      30_000
    )
    reconnectAttempts.current += 1

    reconnectTimer.current = setTimeout(() => {
      connect()
    }, delay)
  }, [connect])

  useEffect(() => {
    isMounted.current = true
    connect()

    return () => {
      isMounted.current = false
      clearTimers()
      if (wsRef.current) {
        wsRef.current.onclose = null // prevent reconnect loop on unmount
        wsRef.current.close(1000, 'Component unmounted')
        wsRef.current = null
      }
    }
  }, [connect, clearTimers])

  return {
    connectionStatus: useIBEAStore((s) => s.connectionStatus),
    reconnect: () => {
      reconnectAttempts.current = 0
      clearTimers()
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
      connect()
    },
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(n: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, n))
}
