'use client'

import { useIBEAStore, type Protocol, type EscalationState } from '@/store/ibea-store'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

// ─── Node geometry helpers ────────────────────────────────────────────────────

interface NodePosition {
  id: string
  x: number
  y: number
  label: string
  address: string
  status: Protocol['status']
  riskScore: number | null
}

function positionNodes(protocols: Protocol[], width: number, height: number): NodePosition[] {
  const count = protocols.length
  if (count === 0) return []

  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) * 0.35

  return protocols.map((p, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2
    return {
      id: p.id,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      label: p.name,
      address: p.address,
      status: p.status,
      riskScore: p.riskScore,
    }
  })
}

function getNodeColor(status: Protocol['status'], escalationState: EscalationState) {
  if (status === 'CRITICAL') return { fill: 'rgba(127,29,29,0.3)', stroke: '#FCA5A5' }
  if (status === 'ELEVATED') return { fill: 'rgba(146,64,14,0.2)', stroke: '#FCD34D' }
  if (status === 'MONITORING') return { fill: 'rgba(30,58,95,0.2)', stroke: '#93C5FD' }
  return { fill: 'rgba(45,106,79,0.15)', stroke: '#6EE7B7' }
}

const SVG_W = 520
const SVG_H = 320

export function EscalationPropagator() {
  const protocols = useIBEAStore((s) => s.protocols)
  const escalationState = useIBEAStore((s) => s.escalationState)

  const nodes = useMemo(
    () => positionNodes(protocols, SVG_W, SVG_H),
    [protocols]
  )

  const hubX = SVG_W / 2
  const hubY = SVG_H / 2

  const isCritical = escalationState === 'CRITICAL' || escalationState === 'SEMANTIC_BURST'
  const isElevated = escalationState === 'ELEVATED'

  if (protocols.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3">
        <svg viewBox="0 0 64 64" className="w-10 h-10 opacity-20">
          <circle cx="32" cy="32" r="20" stroke="#525252" strokeWidth="1.5" fill="none" />
          <circle cx="32" cy="32" r="4" fill="#525252" />
          <line x1="32" y1="12" x2="32" y2="4" stroke="#525252" strokeWidth="1.5" />
          <line x1="52" y1="32" x2="60" y2="32" stroke="#525252" strokeWidth="1.5" />
          <line x1="32" y1="52" x2="32" y2="60" stroke="#525252" strokeWidth="1.5" />
          <line x1="12" y1="32" x2="4" y2="32" stroke="#525252" strokeWidth="1.5" />
        </svg>
        <div className="text-center">
          <p className="text-xs text-text-tertiary font-sans">No protocols indexed</p>
          <p className="text-xs text-text-quaternary font-sans mt-1">Awaiting telemetry connection</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full"
        style={{ maxHeight: 320 }}
        aria-label="Protocol escalation propagation topology"
      >
        {/* Hub → Node connector lines */}
        {nodes.map((node, i) => {
          const colors = getNodeColor(node.status, escalationState)
          const isActive = node.status !== 'NOMINAL'
          return (
            <motion.line
              key={`line-${node.id}`}
              x1={hubX}
              y1={hubY}
              x2={node.x}
              y2={node.y}
              stroke={isActive ? colors.stroke : '#1C1C1C'}
              strokeWidth={isActive ? 1 : 0.5}
              strokeOpacity={isActive ? 0.5 : 0.3}
              strokeDasharray={isActive ? '4 2' : undefined}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            />
          )
        })}

        {/* Hub — IBEA core */}
        <motion.circle
          cx={hubX}
          cy={hubY}
          r={16}
          fill={
            isCritical
              ? 'rgba(127,29,29,0.25)'
              : isElevated
              ? 'rgba(146,64,14,0.2)'
              : 'rgba(30,58,95,0.2)'
          }
          stroke={
            isCritical ? '#FCA5A5' : isElevated ? '#FCD34D' : '#93C5FD'
          }
          strokeWidth={1.5}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
        <text
          x={hubX}
          y={hubY + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={isCritical ? '#FCA5A5' : '#93C5FD'}
          fontSize="9"
          fontFamily="'Geist Mono', monospace"
          fontWeight="600"
        >
          IBEA
        </text>

        {/* Protocol nodes */}
        <AnimatePresence>
          {nodes.map((node, i) => {
            const colors = getNodeColor(node.status, escalationState)
            const isActive = node.status !== 'NOMINAL'

            return (
              <motion.g
                key={node.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  delay: i * 0.05,
                  type: 'spring',
                  stiffness: 300,
                  damping: 22,
                }}
              >
                {/* Pulse ring for active nodes */}
                {isActive && (
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={14}
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth={1}
                    strokeOpacity={0.3}
                    animate={{ r: [14, 22], strokeOpacity: [0.4, 0] }}
                    transition={{
                      duration: node.status === 'CRITICAL' ? 1.2 : 2.5,
                      repeat: Infinity,
                      ease: 'easeOut',
                    }}
                  />
                )}

                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={10}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={1}
                />

                {/* Risk score text */}
                {node.riskScore !== null && (
                  <text
                    x={node.x}
                    y={node.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={colors.stroke}
                    fontSize="7"
                    fontFamily="'Geist Mono', monospace"
                    fontWeight="600"
                  >
                    {node.riskScore}
                  </text>
                )}

                {/* Label below */}
                <text
                  x={node.x}
                  y={node.y + 18}
                  textAnchor="middle"
                  fill="#525252"
                  fontSize="8"
                  fontFamily="'Inter Tight', sans-serif"
                >
                  {node.label.length > 10 ? `${node.label.slice(0, 9)}…` : node.label}
                </text>
              </motion.g>
            )
          })}
        </AnimatePresence>
      </svg>
    </div>
  )
}
