'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useIBEAStore } from '@/store/ibea-store'
import { cn } from '@/lib/utils'

interface CommandItem {
  id: string
  label: string
  description?: string
  category: 'navigation' | 'protocol' | 'event' | 'action'
  href?: string
  action?: () => void
  shortcut?: string
}

const STATIC_COMMANDS: CommandItem[] = [
  {
    id: 'nav-landing',
    label: 'Home',
    description: 'Landing page',
    category: 'navigation',
    href: '/',
  },
  {
    id: 'nav-monitor',
    label: 'Monitor',
    description: 'SRO Dashboard — real-time threat terminal',
    category: 'navigation',
    href: '/monitor',
    shortcut: '⌘1',
  },
  {
    id: 'nav-architecture',
    label: 'Architecture',
    description: 'System deep-dive — EscalationGate, SemanticBurst, ODIG',
    category: 'navigation',
    href: '/architecture',
    shortcut: '⌘2',
  },
  {
    id: 'nav-evacuation',
    label: 'Evacuation',
    description: 'LI.FI cross-chain routes and Safe Harbor config',
    category: 'navigation',
    href: '/evacuation',
    shortcut: '⌘3',
  },
  {
    id: 'nav-log',
    label: 'Execution Log',
    description: 'Full audit trail of all IBEA events',
    category: 'navigation',
    href: '/execution-log',
    shortcut: '⌘4',
  },
]

const CATEGORY_LABELS: Record<CommandItem['category'], string> = {
  navigation: 'Navigation',
  protocol: 'Protocols',
  event: 'Events',
  action: 'Actions',
}

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, protocols, escalations } =
    useIBEAStore()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  // Build dynamic commands from store
  const allCommands: CommandItem[] = [
    ...STATIC_COMMANDS,
    ...protocols.slice(0, 20).map((p) => ({
      id: `protocol-${p.id}`,
      label: p.name,
      description: `${p.address.slice(0, 8)}… · ${p.status}`,
      category: 'protocol' as const,
      href: `/monitor`,
    })),
    ...escalations.slice(0, 10).map((e) => ({
      id: `event-${e.id}`,
      label: e.title,
      description: e.type,
      category: 'event' as const,
      href: `/execution-log`,
    })),
  ]

  const filtered = query.trim()
    ? allCommands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase())
      )
    : allCommands

  // Group by category
  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    const cat = CATEGORY_LABELS[item.category]
    if (!acc[cat]) acc[cat] = []
    acc[cat]!.push(item)
    return acc
  }, {})

  const flatFiltered = Object.values(grouped).flat()

  const close = useCallback(() => {
    setCommandPaletteOpen(false)
    setQuery('')
    setSelectedIndex(0)
  }, [setCommandPaletteOpen])

  const execute = useCallback(
    (item: CommandItem) => {
      if (item.href) router.push(item.href)
      if (item.action) item.action()
      close()
    },
    [router, close]
  )

  useEffect(() => {
    if (!commandPaletteOpen) return
    const timer = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [commandPaletteOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!commandPaletteOpen) return

      if (e.key === 'Escape') { close(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter') {
        const item = flatFiltered[selectedIndex]
        if (item) execute(item)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [commandPaletteOpen, flatFiltered, selectedIndex, execute, close])

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-base-0/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            className="fixed top-[20%] left-1/2 z-50 w-full max-w-xl -translate-x-1/2"
            initial={{ y: -12, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <div className="panel rounded shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <SearchIcon />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search pages, protocols, events..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={cn(
                    'flex-1 bg-transparent text-text-primary text-sm',
                    'font-sans placeholder:text-text-quaternary',
                    'outline-none border-none'
                  )}
                  autoComplete="off"
                  spellCheck={false}
                />
                <kbd className="font-mono-data text-2xs text-text-quaternary border border-border rounded px-1 py-0.5">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto">
                {flatFiltered.length === 0 ? (
                  <div className="empty-state py-8">
                    <span className="text-text-quaternary text-xs">No results</span>
                  </div>
                ) : (
                  Object.entries(grouped).map(([category, items]) => (
                    <div key={category}>
                      <div className="px-4 py-2 border-b border-border-subtle">
                        <span className="text-label">{category}</span>
                      </div>
                      {items.map((item) => {
                        const flatIdx = flatFiltered.indexOf(item)
                        const isSelected = flatIdx === selectedIndex
                        return (
                          <button
                            key={item.id}
                            id={`cmd-${item.id}`}
                            onClick={() => execute(item)}
                            onMouseEnter={() => setSelectedIndex(flatIdx)}
                            className={cn(
                              'w-full flex items-center justify-between px-4 py-2.5 text-left',
                              'transition-colors',
                              isSelected ? 'bg-base-3' : 'hover:bg-base-2'
                            )}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm text-text-primary font-medium">
                                {item.label}
                              </span>
                              {item.description && (
                                <span className="text-xs text-text-tertiary font-sans">
                                  {item.description}
                                </span>
                              )}
                            </div>
                            {item.shortcut && (
                              <kbd className="font-mono-data text-2xs text-text-quaternary border border-border rounded px-1 py-0.5 shrink-0">
                                {item.shortcut}
                              </kbd>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-border flex items-center gap-4">
                <span className="font-mono-data text-2xs text-text-quaternary">
                  ↑↓ navigate
                </span>
                <span className="font-mono-data text-2xs text-text-quaternary">
                  ↵ open
                </span>
                <span className="font-mono-data text-2xs text-text-quaternary">
                  esc close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="text-text-tertiary shrink-0"
    >
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
