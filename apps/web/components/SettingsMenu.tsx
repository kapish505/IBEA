'use client';

import { useState } from 'react';
import { Settings, Shield, Server, X, AlertTriangle, Terminal, Radio } from 'lucide-react';
import { ProtectionPanel } from './ProtectionPanel';
import { AdminPanel } from './AdminPanel';
import { motion, AnimatePresence } from 'framer-motion';

const TELEMETRY_API_URL = process.env.NEXT_PUBLIC_TELEMETRY_WS_URL?.replace('wss://', 'https://').replace('/ws', '') || 'http://localhost:3001';

export function SettingsMenu() {
  const [isSimOpen, setIsSimOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'admin' | null>(null);

  const [injectingFast, setInjectingFast] = useState(false);
  const [injectingSlow, setInjectingSlow] = useState(false);
  const [injectingGov, setInjectingGov] = useState(false);

  const injectThreat = async (type: 'flashloan' | 'governance', deviation?: number) => {
    let setInjecting = setInjectingGov;
    if (type === 'flashloan') setInjecting = deviation === 99 ? setInjectingFast : setInjectingSlow;
    
    setInjecting(true)
    try {
      await fetch(`${TELEMETRY_API_URL}/api/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, deviation })
      })
    } catch (err) {
      console.error('Failed to inject threat:', err)
    } finally {
      setTimeout(() => setInjecting(false), 2000)
    }
  }

  return (
    <>
      {/* Threat Simulator Button */}
      <div className="fixed bottom-24 right-8 z-40">
        <button
          onClick={() => {
            setIsSimOpen(!isSimOpen);
            if (isOpen) setIsOpen(false);
          }}
          className="p-4 bg-black border border-rose-500/30 rounded-full shadow-2xl hover:bg-rose-900/40 transition-colors text-rose-400"
        >
          <Radio className="w-6 h-6" />
        </button>

        {/* Sim Dropdown */}
        <AnimatePresence>
          {isSimOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-16 right-0 mb-4 w-72 bg-neutral-900 border border-rose-500/30 rounded-xl shadow-2xl overflow-hidden flex flex-col"
            >
              <button
                onClick={() => {
                  injectThreat('flashloan', 99);
                  setIsSimOpen(false);
                }}
                disabled={injectingFast}
                className="flex items-center gap-3 p-4 hover:bg-rose-500/10 transition-colors text-left disabled:opacity-50"
              >
                <div className="p-2 bg-rose-500/10 rounded-lg shrink-0">
                  <Terminal className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-rose-400">{injectingFast ? 'Injecting...' : 'Inject Fast-Path Drain (99%)'}</div>
                  <div className="text-xs text-neutral-500">Simulates 99% TVL crash. JSON API validates via echo endpoint.</div>
                </div>
              </button>
              
              <div className="h-px w-full bg-white/5" />

              <button
                onClick={() => {
                  injectThreat('flashloan', 10);
                  setIsSimOpen(false);
                }}
                disabled={injectingSlow}
                className="flex items-center gap-3 p-4 hover:bg-orange-500/10 transition-colors text-left disabled:opacity-50"
              >
                <div className="p-2 bg-orange-500/10 rounded-lg shrink-0">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-orange-400">{injectingSlow ? 'Injecting...' : 'Inject Slow-Path Drain (10%)'}</div>
                  <div className="text-xs text-neutral-500">Simulates 10% TVL dip. Agent data is fetched from live sources.</div>
                </div>
              </button>
              
              <div className="h-px w-full bg-white/5" />

              <button
                onClick={() => {
                  injectThreat('governance');
                  setIsSimOpen(false);
                }}
                disabled={injectingGov}
                className="flex items-center gap-3 p-4 hover:bg-purple-500/10 transition-colors text-left disabled:opacity-50"
              >
                <div className="p-2 bg-purple-500/10 rounded-lg shrink-0">
                  <Terminal className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-purple-400">{injectingGov ? 'Injecting...' : 'Inject Slow-Path Governance'}</div>
                  <div className="text-xs text-neutral-500">Injects 10% TVL dip via DefiLlama. JSON API verifies → LLM agents analyze → slow execution.</div>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-40">
        <button
          onClick={() => {
            setActiveModal(activeModal === 'admin' ? null : 'admin');
            if (isSimOpen) setIsSimOpen(false);
          }}
          className="p-4 bg-neutral-900 border border-white/10 rounded-full shadow-2xl hover:bg-neutral-800 transition-colors text-white"
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-white/10 rounded-full text-white transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                {activeModal === 'admin' && <AdminPanel />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
