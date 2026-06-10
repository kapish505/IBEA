'use client'

import { useState } from 'react'
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { Server, Activity, AlertTriangle, Send, Wallet, ShieldAlert } from 'lucide-react'
import { parseEther } from 'viem'
import { Button } from './ui/button'
import { FundAccessManager } from './wallet/FundAccessManager'

const SRO_COORDINATOR_ADDRESS = process.env.NEXT_PUBLIC_SRO_COORDINATOR_ADDRESS as `0x${string}`
const IBEA_CORE_ADDRESS = process.env.NEXT_PUBLIC_IBEA_CORE_ADDRESS as `0x${string}`

export function AdminPanel() {
  const { isConnected } = useAccount()
  const { data: sroBalance } = useBalance({ address: SRO_COORDINATOR_ADDRESS })
  const { data: ibeaBalance } = useBalance({ address: IBEA_CORE_ADDRESS })
  
  const [fundAmountSro, setFundAmountSro] = useState('10')
  const [fundAmountIbea, setFundAmountIbea] = useState('100')
  const [sensitivity, setSensitivity] = useState(10)

  const { sendTransaction, data: hash, isPending } = useSendTransaction()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })

  const handleFund = (amount: string, toAddress: `0x${string}`) => {
    if (!amount || isNaN(Number(amount))) return;
    sendTransaction({
      to: toAddress,
      value: parseEther(amount),
      chainId: 50312,
    })
  }

  if (!isConnected) return null

  return (
    <div className="h-full p-6 rounded-2xl bg-neutral-900/50 border border-white/10 flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Server className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">System Administration</h3>
            <p className="text-xs text-neutral-400">Manage IBEA core contracts and run demo exploit simulations.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Global Evacuation Sensitivity */}
        <div className="p-5 bg-black/40 rounded-xl border border-white/5 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-4 relative z-10">
            <h4 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              Global Evacuation Sensitivity
            </h4>
            <span className="text-sm font-mono text-purple-400 font-bold">Trigger at &gt; {sensitivity}% Drop</span>
          </div>

          <p className="text-xs text-neutral-500 mb-6 relative z-10">
            Set the threshold for the IBEA autonomous agents. If DefiLlama reports a TVL drop across your monitored protocols exceeding this value, your approved balances will be immediately bridged to the Somnia Safe Harbor Vault via LI.FI.
          </p>
          
          <div className="relative z-10 pb-2">
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={sensitivity} 
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-full accent-purple-500 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <FundAccessManager />

      </div>
    </div>
  )
}
