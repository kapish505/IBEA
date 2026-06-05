'use client'

import { useIBEAStore, type KeeperAction, type ODIGCheck } from '@/store/ibea-store'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatRelativeTime } from '@/lib/utils'

const STRATEGY_COLORS: Record<KeeperAction['strategy'], string> = {
  WITHDRAW: 'text-elevated-text',
  HEDGE: 'text-semantic-text',
  PAUSE: 'text-text-secondary',
  EVACUATE: 'text-critical-text',
  REBALANCE: 'text-safe-text',
}

const STATUS_COLORS: Record<KeeperAction['status'], string> = {
  QUEUED: 'text-text-tertiary',
  EXECUTING: 'text-elevated-text',
  COMPLETED: 'text-safe-text',
  FAILED: 'text-critical-text',
  FROZEN: 'text-semantic-text',
}

const ODIG_CHECK_COLORS: Record<ODIGCheck['status'], string> = {
  PENDING: 'text-text-quaternary',
  RUNNING: 'text-semantic-text',
  PASS: 'text-safe-text',
  FAIL: 'text-critical-text',
}

const ODIG_CHECK_ORDER: ODIGCheck['name'][] = [
  'TWAP',
  'STABLECOIN',
  'BRIDGE',
  'SLIPPAGE',
  'SAFE_HARBOR',
  'EXECUTE',
]

function ODIGCheckRow({ check, index }: { check: ODIGCheck; index: number }) {
  return (
    <motion.div
      className="flex items-center justify-between py-1"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.2, duration: 0.25 }}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono-data text-2xs text-text-quaternary w-4">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="font-mono-data text-xs text-text-secondary">{check.name}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {check.detail && (
          <span className="text-2xs text-text-tertiary font-sans truncate max-w-[120px]">
            {check.detail}
          </span>
        )}
        <span className={cn('font-mono-data text-2xs font-semibold', ODIG_CHECK_COLORS[check.status])}>
          {check.status === 'RUNNING' ? '⟳' : check.status === 'PASS' ? '✓' : check.status === 'FAIL' ? '✗' : '—'}
        </span>
      </div>
    </motion.div>
  )
}

function KeeperActionCard({ action }: { action: KeeperAction }) {
  const isActive = action.status === 'EXECUTING'

  // Sort checks by canonical order
  const sortedChecks = [...action.odgChecks].sort(
    (a, b) => ODIG_CHECK_ORDER.indexOf(a.name) - ODIG_CHECK_ORDER.indexOf(b.name)
  )

  return (
    <motion.div
      layout
      className={cn(
        'panel-elevated rounded p-3 border',
        isActive ? 'border-elevated/40' : 'border-border-subtle'
      )}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className={cn('font-mono-data text-xs font-semibold', STRATEGY_COLORS[action.strategy])}>
            {action.strategy}
          </span>
          <p className="text-2xs text-text-tertiary font-sans mt-0.5">
            {formatRelativeTime(action.timestamp)}
          </p>
        </div>
        <span className={cn('text-2xs font-mono-data', STATUS_COLORS[action.status])}>
          {action.status}
        </span>
      </div>

      {/* ODIG Checks */}
      {sortedChecks.length > 0 && (
        <div className="border-t border-border-subtle mt-2 pt-2">
          <p className="text-label mb-1">ODIG Invariants</p>
          <div className="space-y-0">
            {sortedChecks.map((check, i) => (
              <ODIGCheckRow key={check.id} check={check} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Tx hash */}
      {action.txHash && (
        <div className="border-t border-border-subtle mt-2 pt-2">
          <p className="text-label mb-0.5">Tx</p>
          <a 
            href={`https://shannon-explorer.somnia.network/tx/${action.txHash}`}
            target="_blank"
            rel="noreferrer" 
            className="address hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1 underline decoration-border-subtle hover:decoration-white"
          >
            {action.txHash.slice(0, 10)}…{action.txHash.slice(-6)}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
        </div>
      )}
    </motion.div>
  )
}

export function KeeperOrchestrationPanel() {
  const keeperActions = useIBEAStore((s) => s.keeperActions)
  const activeActions = keeperActions.filter(
    (a) => a.status === 'EXECUTING' || a.status === 'QUEUED'
  )
  const recentCompleted = keeperActions
    .filter((a) => a.status === 'COMPLETED' || a.status === 'FAILED' || a.status === 'FROZEN')
    .slice(0, 3)

  if (keeperActions.length === 0) {
    return (
      <div className="empty-state">
        <KeeperIcon />
        <p className="text-text-tertiary text-xs font-sans">KeeperHub standby.</p>
        <p className="empty-state-label mt-1">No active actions</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {activeActions.length > 0 && (
        <div>
          <p className="text-label mb-2">Active</p>
          <AnimatePresence mode="popLayout">
            {activeActions.map((action) => (
              <KeeperActionCard key={action.id} action={action} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {recentCompleted.length > 0 && (
        <div>
          <p className="text-label mb-2">Recent</p>
          <AnimatePresence mode="popLayout">
            {recentCompleted.map((action) => (
              <KeeperActionCard key={action.id} action={action} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function KeeperIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="opacity-30">
      <circle cx="12" cy="12" r="9" stroke="#525252" strokeWidth="1" />
      <path d="M12 7v5l3 3" stroke="#525252" strokeWidth="1" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="#525252" />
    </svg>
  )
}
