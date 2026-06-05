'use client'

import { type ReactNode } from 'react'
import { useTelemetry } from '@/hooks/use-telemetry'
import { useSomniaMetrics } from '@/hooks/use-somnia-metrics'

interface ChainDataProviderProps {
  children: ReactNode
}

export function ChainDataProvider({ children }: ChainDataProviderProps) {
  // Initialize data hooks at the app root level
  useTelemetry()
  useSomniaMetrics()

  return <>{children}</>
}
