'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from './ui/button'
import { LogOut, Wallet } from 'lucide-react'

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  const injectedConnector = connectors.find((c) => c.id === 'injected' || c.id === 'metaMask')

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-sm font-mono text-zinc-300">
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        <Button variant="ghost" size="icon" onClick={() => disconnect()}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <Button 
      onClick={() => injectedConnector && connect({ connector: injectedConnector })}
      className="bg-purple-600 hover:bg-purple-700 text-white font-medium"
    >
      <Wallet className="w-4 h-4 mr-2" />
      Connect Wallet
    </Button>
  )
}
