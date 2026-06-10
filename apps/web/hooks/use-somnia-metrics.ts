'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createPublicClient, webSocket, http } from 'viem'
import { somniaShannon } from '@/lib/wagmi'
import { useIBEAStore } from '@/store/ibea-store'

// Rolling window for block time averaging
const BLOCK_TIME_WINDOW = 10
const FINALITY_MULTIPLIER = 2.5 // Somnia Shannon estimated finality = ~2.5x block time

export function useSomniaMetrics() {
  const setSomniaMetrics = useIBEAStore((s) => s.setSomniaMetrics)
  const blockTimestamps = useRef<number[]>([])
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const isMounted = useRef(true)

  const computeRollingAvg = useCallback((timestamps: number[]): number | null => {
    if (timestamps.length < 2) return null
    const diffs: number[] = []
    for (let i = 1; i < timestamps.length; i++) {
      const prev = timestamps[i - 1]
      const curr = timestamps[i]
      if (prev !== undefined && curr !== undefined) {
        diffs.push(curr - prev)
      }
    }
    if (diffs.length === 0) return null
    return diffs.reduce((a, b) => a + b, 0) / diffs.length
  }, [])

  useEffect(() => {
    isMounted.current = true

    // Try WebSocket transport first, fall back to HTTP polling
    const wsUrl = process.env.NEXT_PUBLIC_SOMNIA_WS_URL ?? 'wss://dream-rpc.somnia.network/ws'
    const httpUrl = process.env.NEXT_PUBLIC_SOMNIA_RPC_URL ?? 'https://dream-rpc.somnia.network'

    let wsClient: ReturnType<typeof createPublicClient> | null = null
    let httpPollTimer: ReturnType<typeof setInterval> | null = null
    let lastPollBlock: bigint | null = null

    const handleNewBlock = (blockNumber: bigint, blockTimestampSec?: number) => {
      if (!isMounted.current) return

      const nowMs = Date.now()
      // Use server timestamp if available (seconds → ms), else wall clock
      const blockMs = blockTimestampSec ? blockTimestampSec * 1000 : nowMs

      blockTimestamps.current.push(blockMs)
      if (blockTimestamps.current.length > BLOCK_TIME_WINDOW + 1) {
        blockTimestamps.current.shift()
      }

      const avgBlockTime = computeRollingAvg(blockTimestamps.current)
      const finality = avgBlockTime ? avgBlockTime * FINALITY_MULTIPLIER : null
      // Estimate validator latency as fraction of block time (p50 ~40%)
      const validatorLatency = avgBlockTime ? avgBlockTime * 0.4 : null

      setSomniaMetrics({
        blockNumber: Number(blockNumber),
        blockTime: avgBlockTime,
        finality,
        validatorLatency,
      })
    }

    const startWsSubscription = async () => {
      try {
        wsClient = createPublicClient({
          chain: somniaShannon,
          transport: webSocket(wsUrl),
        })

        const unwatch = wsClient.watchBlockNumber({
          onBlockNumber: async (blockNumber) => {
            try {
              if (!isMounted.current) return
              // Fetch full block to get timestamp
              const block = await wsClient!.getBlock({ blockNumber })
              handleNewBlock(blockNumber, Number(block.timestamp))
            } catch {
              // If getBlock fails, use wall clock
              handleNewBlock(blockNumber)
            }
          },
          onError: (err) => {
            console.warn('[IBEA SomniaMetrics] WS block watch error:', err)
            startHttpPolling()
          },
        })

        unsubscribeRef.current = unwatch
      } catch (err) {
        console.warn('[IBEA SomniaMetrics] WS client failed, using HTTP polling:', err)
        startHttpPolling()
      }
    }

    const startHttpPolling = () => {
      if (httpPollTimer) return // already polling

      const httpClient = createPublicClient({
        chain: somniaShannon,
        transport: http(httpUrl),
      })

      const poll = async () => {
        if (!isMounted.current) return
        try {
          const block = await httpClient.getBlock({ blockTag: 'latest' })
          if (block.number !== lastPollBlock) {
            lastPollBlock = block.number
            handleNewBlock(block.number, Number(block.timestamp))
          }
        } catch (err) {
          console.warn('[IBEA SomniaMetrics] HTTP poll failed:', err)
        }
      }

      // Poll every 500ms — Somnia targets ~100ms blocks so this gives updates
      httpPollTimer = setInterval(poll, 500)
      void poll() // immediate first call
    }

    void startWsSubscription()

    return () => {
      isMounted.current = false
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      if (httpPollTimer) {
        clearInterval(httpPollTimer)
        httpPollTimer = null
      }
    }
  }, [setSomniaMetrics, computeRollingAvg])

  return useIBEAStore((s) => s.somniaMetrics)
}
