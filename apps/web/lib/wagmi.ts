'use client'

import { createConfig, http } from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'
import { defineChain } from 'viem'

// Somnia Shannon Testnet
export const somniaShannon = defineChain({
  id: 50312,
  name: 'Somnia Shannon',
  nativeCurrency: {
    decimals: 18,
    name: 'Somnia Token',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_SOMNIA_RPC_URL ?? 'https://dream-rpc.somnia.network',
      ],
      webSocket: [
        process.env.NEXT_PUBLIC_SOMNIA_WS_URL ?? 'wss://dream-rpc.somnia.network/ws',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Somnia Explorer',
      url: 'https://shannon-explorer.somnia.network',
    },
  },
  testnet: true,
})

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ''

export const wagmiConfig = createConfig({
  chains: [somniaShannon],
  connectors: [
    injected({ shimDisconnect: true }),
    ...(projectId
      ? [
          walletConnect({
            projectId,
            metadata: {
              name: 'IBEA — Invariant-Bounded Escalation Architecture',
              description: 'Autonomous Defense Infrastructure for Onchain Capital',
              url: 'https://ibea.insomnia.security',
              icons: ['https://ibea.insomnia.security/icon.png'],
            },
            showQrModal: true,
          }),
        ]
      : []),
  ],
  transports: {
    [somniaShannon.id]: http(
      process.env.NEXT_PUBLIC_SOMNIA_RPC_URL ?? 'https://dream-rpc.somnia.network'
    ),
  },
  ssr: true,
})

export type WagmiConfig = typeof wagmiConfig
