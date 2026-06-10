'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Key, CheckCircle2, CircleDashed } from 'lucide-react';
import { Button } from '../ui/button';
import { useAccount, useBalance, useSignMessage } from 'wagmi';
import { useIBEAStore } from '@/store/ibea-store';

interface DetectedAsset {
  id: string;
  symbol: string;
  protocol: string;
  amount: string;
  isAuthorized: boolean;
  isProcessing: boolean;
  chainId: number;
}

export function FundAccessManager() {
  const { isConnected, address } = useAccount();
  const setAuthorizedAssetCount = useIBEAStore(s => s.setAuthorizedAssetCount);
  
  // Real balance hooks
  const { data: sttBalance } = useBalance({ address, chainId: 50312 }); // Somnia
  const { data: ethBalance } = useBalance({ address, chainId: 11155111 }); // Sepolia
  
  const { signMessageAsync } = useSignMessage();

  const [assets, setAssets] = useState<DetectedAsset[]>([]);

  // Sync real balances to state when they load
  useEffect(() => {
    if (sttBalance || ethBalance) {
      setAssets(prev => {
        // preserve auth state if it exists
        const prevStt = prev.find(p => p.id === 'stt');
        const prevEth = prev.find(p => p.id === 'eth');
        return [
          { 
            id: 'stt', 
            symbol: 'STT', 
            protocol: 'Somnia Wallet', 
            amount: sttBalance ? Number(sttBalance.formatted).toFixed(4) : '0.00', 
            isAuthorized: prevStt ? prevStt.isAuthorized : false, 
            isProcessing: prevStt ? prevStt.isProcessing : false,
            chainId: 50312
          },
          { 
            id: 'eth', 
            symbol: 'ETH', 
            protocol: 'Sepolia Wallet', 
            amount: ethBalance ? Number(ethBalance.formatted).toFixed(4) : '0.00', 
            isAuthorized: prevEth ? prevEth.isAuthorized : false, 
            isProcessing: prevEth ? prevEth.isProcessing : false,
            chainId: 11155111
          }
        ];
      });
    }
  }, [sttBalance, ethBalance]);

  // Sync authorized count to global store
  useEffect(() => {
    setAuthorizedAssetCount(assets.filter(a => a.isAuthorized).length);
  }, [assets, setAuthorizedAssetCount]);

  if (!isConnected) return null;

  const handleToggleAccess = async (asset: DetectedAsset) => {
    try {
      // Set processing state
      setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, isProcessing: true } : a));
      
      if (!asset.isAuthorized) {
        // Trigger REAL wallet signature popup for intent-based authorization!
        const message = `IBEA Relayer Authorization\n\nI authorize Somnia's autonomous agents to monitor and secure my ${asset.symbol} balance on chain ${asset.chainId} in the event of a critical threat.\n\nWallet: ${address}`;
        await signMessageAsync({ message });
      }

      // Toggle authorized state upon successful signature
      setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, isAuthorized: !a.isAuthorized, isProcessing: false } : a));
    } catch (error) {
      console.error("Signature rejected or failed:", error);
      // Revert processing state if they reject the signature
      setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, isProcessing: false } : a));
    }
  };

  const allAuthorized = assets.length > 0 && assets.every(a => a.isAuthorized);

  return (
    <div className="p-4 bg-neutral-900/60 border border-white/10 rounded-xl flex flex-col gap-4 shadow-xl backdrop-blur-md mt-4">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-400" />
          Dynamic Asset Authorization
        </h3>
        {allAuthorized ? (
          <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> FULLY PROTECTED
          </span>
        ) : (
          <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] font-mono text-amber-400 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> PARTIAL PROTECTION
          </span>
        )}
      </div>

      <div className="text-xs text-neutral-400 leading-relaxed">
        System dynamically detected real balances for <span className="font-mono text-blue-300">{address?.slice(0, 6)}...{address?.slice(-4)}</span>. 
        Sign an off-chain intent to permit IBEA's autonomous agents to evacuate individual assets when a critical threat is confirmed.
      </div>

      <div className="flex flex-col gap-2 mt-2">
        {assets.map(asset => (
          <div key={asset.id} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-lg">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{asset.symbol}</span>
                <span className="text-[10px] text-neutral-500 bg-white/5 px-2 py-0.5 rounded-full">{asset.protocol}</span>
              </div>
              <div className="text-xs font-mono text-neutral-400 mt-1">{asset.amount} {asset.symbol}</div>
            </div>
            
            <Button
              onClick={() => handleToggleAccess(asset)}
              disabled={asset.isProcessing}
              variant="ghost"
              className={`min-w-[120px] h-8 px-3 font-mono text-[10px] border transition-all ${
                asset.isAuthorized 
                  ? "border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300" 
                  : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
              }`}
            >
              {asset.isProcessing ? (
                <CircleDashed className="w-3 h-3 animate-spin" />
              ) : asset.isAuthorized ? (
                <>Revoke Access</>
              ) : (
                <>Grant Access</>
              )}
            </Button>
          </div>
        ))}
        {assets.length === 0 && (
          <div className="p-4 text-center text-xs text-neutral-500">
            <CircleDashed className="w-4 h-4 animate-spin mx-auto mb-2 opacity-50" />
            Scanning wallet for balances...
          </div>
        )}
      </div>
    </div>
  );
}
