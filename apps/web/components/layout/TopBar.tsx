"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { WalletConnect } from '../WalletConnect';

const NAV_ITEMS = [
  { href: '/monitor', label: 'Monitor' },
  { href: '/evacuation', label: 'Safe Harbors' },
  { href: '/safe-harbor', label: 'Post-Evacuation' },
  { href: '/execution-log', label: 'Executions' },
  { href: '/about', label: 'About' },
];

export function TopBar() {
  const pathname = usePathname();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  return (
    <header className="absolute top-0 z-50 w-full h-16 mix-blend-difference">
      <div className="flex h-full items-center justify-between px-6 max-w-7xl mx-auto">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/20 flex items-center justify-center overflow-hidden relative shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-shadow duration-500">
            <div className="w-3 h-3 border border-white/80 rounded-sm rotate-45 group-hover:rotate-180 transition-transform duration-1000 ease-out" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-semibold text-sm tracking-widest text-white group-hover:text-neutral-300 transition-colors">IBEA CORE</span>
          </div>
        </Link>

        {/* Sliding Nav */}
        <nav 
          className="flex items-center h-10 p-1 bg-neutral-900/50 rounded-full border border-white/10 relative"
          onMouseLeave={() => setHoveredPath(null)}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const isHovered = hoveredPath === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => setHoveredPath(item.href)}
                className={cn(
                  'relative px-5 py-1.5 text-xs font-semibold font-sans tracking-wide rounded-full transition-colors z-10 flex items-center justify-center',
                  isActive ? 'text-black' : 'text-neutral-400 hover:text-white'
                )}
              >
                {/* Active Indicator (Solid White Background) */}
                {isActive && (
                  <motion.div
                    layoutId="activeNavBackground"
                    className="absolute inset-0 bg-white rounded-full -z-10 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Hover Indicator (Subtle Glowing Border behind text) */}
                {isHovered && !isActive && (
                  <motion.div
                    layoutId="hoverNavBackground"
                    className="absolute inset-0 bg-white/10 rounded-full -z-10 border border-white/20"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Status & Wallet */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <div className="relative flex items-center justify-center w-2 h-2">
              <div className="absolute w-full h-full bg-emerald-400 rounded-full animate-ping opacity-75" />
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            </div>
            <span className="text-xs font-mono text-emerald-400 font-semibold tracking-wide uppercase">Somnia Testnet</span>
          </div>
          <WalletConnect />
        </div>

      </div>
    </header>
  );
}
