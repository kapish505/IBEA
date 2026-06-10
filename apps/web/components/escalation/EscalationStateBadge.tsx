'use client'

import { useIBEAStore, type EscalationState } from '@/store/ibea-store'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const STATE_CONFIG: Record<
  EscalationState,
  { label: string; chipClass: string; dotClass: string; pulse: boolean }
> = {
  NOMINAL: {
    label: 'NOMINAL',
    chipClass: 'chip-nominal',
    dotClass: 'bg-safe-text',
    pulse: false,
  },
  MONITORING: {
    label: 'MONITORING',
    chipClass: 'chip-nominal',
    dotClass: 'bg-safe-text',
    pulse: true,
  },
  ELEVATED: {
    label: 'ELEVATED',
    chipClass: 'chip-elevated',
    dotClass: 'bg-elevated-text',
    pulse: true,
  },
  CRITICAL: {
    label: 'CRITICAL',
    chipClass: 'chip-critical',
    dotClass: 'bg-critical-text',
    pulse: true,
  },
  SEMANTIC_BURST: {
    label: 'SEMANTIC BURST',
    chipClass: 'chip-semantic',
    dotClass: 'bg-semantic-text',
    pulse: true,
  },
  EXECUTING: {
    label: 'EXECUTING',
    chipClass: 'chip-critical',
    dotClass: 'bg-critical-text',
    pulse: true,
  },
}

interface EscalationStateBadgeProps {
  className?: string
  showLabel?: boolean
}

export function EscalationStateBadge({
  className,
  showLabel = true,
}: EscalationStateBadgeProps) {
  const escalationState = useIBEAStore((s) => s.escalationState)
  const authorizedAssetCount = useIBEAStore((s) => s.authorizedAssetCount)
  
  const isStandby = authorizedAssetCount === 0;
  
  const config = isStandby 
    ? {
        label: 'STANDBY (UNAUTHORIZED)',
        chipClass: 'chip-nominal',
        dotClass: 'bg-neutral-500',
        pulse: false,
      }
    : STATE_CONFIG[escalationState]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={escalationState}
        className={cn('chip', config.chipClass, className)}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            config.dotClass,
            config.pulse && 'animate-pulse'
          )}
        />
        {showLabel && (
          <span className="font-mono-data">{config.label}</span>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
