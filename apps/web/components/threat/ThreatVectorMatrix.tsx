'use client'

import { useIBEAStore, type ThreatVectors } from '@/store/ibea-store'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface RadarDataPoint {
  axis: string
  value: number
  fullMark: number
}

function vectorsToRadarData(vectors: ThreatVectors): RadarDataPoint[] {
  return [
    { axis: 'Liquidity Stress', value: Math.round(vectors.liquidityStress * 100), fullMark: 100 },
    { axis: 'Bridge Instability', value: Math.round(vectors.bridgeInstability * 100), fullMark: 100 },
    { axis: 'Governance Risk', value: Math.round(vectors.governanceRisk * 100), fullMark: 100 },
    { axis: 'Oracle Manipulation', value: Math.round(vectors.oracleManipulationRisk * 100), fullMark: 100 },
    { axis: 'Contagion', value: Math.round(vectors.contagionProbability * 100), fullMark: 100 },
  ]
}

function getRadarColor(vectors: ThreatVectors): string {
  const maxVal = Math.max(
    vectors.liquidityStress,
    vectors.bridgeInstability,
    vectors.governanceRisk,
    vectors.oracleManipulationRisk,
    vectors.contagionProbability
  )
  if (maxVal > 0.75) return '#FCA5A5' // critical
  if (maxVal > 0.5) return '#FCD34D'  // elevated
  return '#6EE7B7'                     // nominal
}

function EmptyRadar() {
  return (
    <div className="relative w-full h-full min-h-[220px] flex flex-col items-center justify-center">
      {/* Static grey axes */}
      <svg viewBox="0 0 200 200" className="w-64 h-64 opacity-25">
        {[0, 72, 144, 216, 288].map((angle) => {
          const rad = (angle - 90) * (Math.PI / 180)
          return (
            <line
              key={angle}
              x1={100}
              y1={100}
              x2={100 + 70 * Math.cos(rad)}
              y2={100 + 70 * Math.sin(rad)}
              stroke="#525252"
              strokeWidth="1"
            />
          )
        })}
        {[20, 40, 60, 80].map((r) => (
          <polygon
            key={r}
            points={[0, 72, 144, 216, 288]
              .map((angle) => {
                const rad = (angle - 90) * (Math.PI / 180)
                return `${100 + (r * 0.875) * Math.cos(rad)},${100 + (r * 0.875) * Math.sin(rad)}`
              })
              .join(' ')}
            fill="none"
            stroke="#2A2A2A"
            strokeWidth="0.5"
          />
        ))}
      </svg>
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-xs text-text-quaternary font-sans">Awaiting telemetry</p>
      </div>
    </div>
  )
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
}) => {
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null
  return (
    <div className="panel px-3 py-2 text-xs font-mono-data">
      <span className="text-text-secondary">{item.name}</span>
      <span className="text-text-primary ml-2">{item.value}%</span>
    </div>
  )
}

interface ThreatVectorMatrixProps {
  className?: string
}

export function ThreatVectorMatrix({ className }: ThreatVectorMatrixProps) {
  const threatVectors = useIBEAStore((s) => s.threatVectors)

  if (!threatVectors) {
    return (
      <div className={cn('relative', className)}>
        <EmptyRadar />
      </div>
    )
  }

  const data = vectorsToRadarData(threatVectors)
  const radarColor = getRadarColor(threatVectors)

  return (
    <div className={cn('relative w-full', className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key="radar-chart"
          className="w-full"
          style={{ height: 380 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
              <PolarGrid
                stroke="#1C1C1C"
                strokeWidth={0.5}
              />
              <PolarAngleAxis
                dataKey="axis"
                tick={{
                  fill: '#737373',
                  fontSize: 11,
                  fontFamily: 'Inter Tight, sans-serif',
                }}
                tickLine={false}
              />
              <Radar
                name="Threat"
                dataKey="value"
                stroke={radarColor}
                fill={radarColor}
                fillOpacity={0.12}
                strokeWidth={1.5}
                dot={{ fill: radarColor, r: 2, strokeWidth: 0 }}
                animationBegin={0}
                animationDuration={600}
                animationEasing="ease-out"
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={false}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </AnimatePresence>

      {/* Dimension values legend */}
      <div className="grid grid-cols-1 gap-1 mt-2">
        {data.map((d) => (
          <div key={d.axis} className="flex items-center justify-between px-1">
            <span className="text-xs text-text-tertiary font-sans">{d.axis}</span>
            <span
              className="font-mono-data text-xs"
              style={{ color: radarColor }}
            >
              {d.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
