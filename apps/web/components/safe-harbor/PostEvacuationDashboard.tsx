'use client';

import { useState, useEffect } from 'react';
import { Shield, ArrowRightLeft, Landmark, Wallet, CheckCircle2, CircleDashed } from 'lucide-react';
import { Button } from '../ui/button';
import { useIBEAStore } from '@/store/ibea-store';

interface EvacuatedAsset {
  id: string;
  symbol: string;
  amount: string;
  destinationChain: string;
  vaultAddress: string;
  status: 'IDLE' | 'PROCESSING' | 'MOVED';
  movedTo?: 'LOCAL_WALLET' | 'YIELD_PROTOCOL' | 'REPATRIATED';
  monitoringReenabled: boolean;
}

export function PostEvacuationDashboard() {
  const { lifiRoutes } = useIBEAStore();
  const [assets, setAssets] = useState<EvacuatedAsset[]>([]);
  const [mounted, setMounted] = useState(false);

  // Sync completed routes to local state exactly once or when new routes complete
  useEffect(() => {
    setMounted(true);
    const completedRoutes = lifiRoutes.filter(r => r.status === 'COMPLETED');
    
    setAssets(prev => {
      // Only add new routes that aren't already in our local state
      const existingIds = new Set(prev.map(a => a.id));
      const newAssets = completedRoutes
        .filter(r => !existingIds.has(r.id))
        .map(r => ({
          id: r.id,
          symbol: r.toToken || 'STT',
          amount: parseFloat(r.toAmount).toFixed(2),
          destinationChain: 'Somnia Testnet',
          vaultAddress: process.env.NEXT_PUBLIC_IBEA_CORE_ADDRESS || '0xSafeHarbor...4A21',
          status: 'IDLE' as const,
          monitoringReenabled: false
        }));
        
      return [...prev, ...newAssets];
    });
  }, [lifiRoutes]);

  const handleAction = async (id: string, action: 'LOCAL_WALLET' | 'YIELD_PROTOCOL' | 'REPATRIATED') => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, status: 'PROCESSING' } : a));
    
    // Simulate smart contract / cross-chain execution delay
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    setAssets(prev => prev.map(a => a.id === id ? { ...a, status: 'MOVED', movedTo: action } : a));
  };

  const handleToggleMonitoring = (id: string) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, monitoringReenabled: !a.monitoringReenabled } : a));
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
      <div className="text-left mb-4">
        <h1 className="text-3xl font-display font-bold text-white mb-2">Decentralized Asset Control</h1>
        <p className="text-neutral-400">Somnia's autonomous agents have successfully secured your assets. Manage your protected capital, deploy to yield, or repatriate once the threat is neutralized.</p>
      </div>

      {assets.length === 0 ? (
        <div className="w-full p-12 bg-neutral-900/40 border border-white/5 rounded-3xl flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-white/[0.02] border border-white/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-neutral-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Evacuated Assets</h3>
          <p className="text-neutral-500 max-w-md">
            When Somnia's decentralized agents detect a threat, they autonomously secure your funds across chains. Once protected, they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {assets.map(asset => (
            <div key={asset.id} className="bg-neutral-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-black/40 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{asset.amount} {asset.symbol}</h3>
                  <div className="text-xs text-neutral-500 font-mono">Secured on {asset.destinationChain} • {asset.vaultAddress}</div>
                </div>
              </div>
              {asset.status === 'IDLE' && (
                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-mono text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> SECURE IN VAULT
                </span>
              )}
              {asset.status === 'PROCESSING' && (
                <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-xs font-mono text-blue-400 flex items-center gap-2">
                  <CircleDashed className="w-4 h-4 animate-spin" /> EXECUTING ROUTE
                </span>
              )}
              {asset.status === 'MOVED' && (
                <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-xs font-mono text-purple-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> ASSET MOVED
                </span>
              )}
            </div>

            {/* Actions or Moved State */}
            <div className="p-6">
              {asset.status === 'IDLE' || asset.status === 'PROCESSING' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Option 1: Withdraw */}
                  <div className="p-5 border border-white/10 rounded-xl bg-black/60 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center gap-3 hover:bg-black/80 transition-colors relative overflow-hidden">
                    <div className="p-3 bg-neutral-800 rounded-full relative z-10"><Wallet className="w-5 h-5 text-neutral-300" /></div>
                    <div className="relative z-10">
                      <h4 className="text-sm font-semibold text-white mb-1">Emergency Withdraw</h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">Withdraw your secured funds directly from the Somnia Safe Harbor Vault into your personal Somnia wallet.</p>
                    </div>
                    <Button 
                      onClick={() => handleAction(asset.id, 'LOCAL_WALLET')}
                      disabled={asset.status === 'PROCESSING'}
                      variant="ghost" 
                      className="mt-auto w-full border border-white/10 hover:bg-white/10 text-xs font-mono relative z-10"
                    >
                      Withdraw to Wallet
                    </Button>
                  </div>

                  {/* Option 2: Yield */}
                  <div className="p-5 border border-white/10 rounded-xl bg-black/60 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center gap-3 hover:bg-black/80 transition-colors relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
                    <div className="p-3 bg-blue-500/20 rounded-full relative z-10"><Landmark className="w-5 h-5 text-blue-400" /></div>
                    <div className="relative z-10">
                      <h4 className="text-sm font-semibold text-white mb-1">Deploy to Somnia Yield</h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">Don't let capital sit idle. Deposit into a native Somnia lending protocol to earn risk-free yield.</p>
                    </div>
                    <Button 
                      onClick={() => handleAction(asset.id, 'YIELD_PROTOCOL')}
                      disabled={asset.status === 'PROCESSING'}
                      variant="ghost" 
                      className="mt-auto w-full border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 text-xs font-mono relative z-10"
                    >
                      Deposit on Somnia
                    </Button>
                  </div>

                  {/* Option 3: Repatriate */}
                  <div className="p-5 border border-white/10 rounded-xl bg-black/60 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center gap-3 hover:bg-black/80 transition-colors relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />
                    <div className="p-3 bg-purple-500/20 rounded-full relative z-10"><ArrowRightLeft className="w-5 h-5 text-purple-400" /></div>
                    <div className="relative z-10">
                      <h4 className="text-sm font-semibold text-white mb-1">Repatriate to Source</h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">Aave threat neutralized? Use <strong className="text-white">LI.FI</strong> cross-chain routing to bridge funds back to the original chain.</p>
                    </div>
                    <Button 
                      onClick={() => handleAction(asset.id, 'REPATRIATED')}
                      disabled={asset.status === 'PROCESSING'}
                      variant="ghost" 
                      className="mt-auto w-full border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 text-xs font-mono relative z-10"
                    >
                      Bridge via LI.FI
                    </Button>
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-black/20 rounded-xl border border-white/5">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {asset.movedTo === 'LOCAL_WALLET' && `Withdrawn to personal Somnia Wallet`}
                    {asset.movedTo === 'YIELD_PROTOCOL' && `Deposited into Somnia Yield Protocol`}
                    {asset.movedTo === 'REPATRIATED' && `Repatriated to Source Chain via LI.FI`}
                  </h3>
                  <p className="text-sm text-neutral-400 mb-6 text-center max-w-md">
                    The {asset.amount} {asset.symbol} has been successfully moved. IBEA can dynamically monitor this new position.
                  </p>
                  
                  <div className="flex items-center gap-4 bg-white/[0.03] px-6 py-4 rounded-xl border border-white/10">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">Enable IBEA Monitoring</span>
                      <span className="text-xs text-neutral-500">Protect this new position against exploits</span>
                    </div>
                    <Button
                      onClick={() => handleToggleMonitoring(asset.id)}
                      className={`ml-4 px-6 font-mono text-xs transition-all ${
                        asset.monitoringReenabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                    >
                      {asset.monitoringReenabled ? 'MONITORING ACTIVE' : 'ENABLE MONITORING'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

          </div>
        ))}
      </div>
      )}
    </div>
  );
}
