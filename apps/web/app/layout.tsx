import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'IBEA — Invariant-Bounded Escalation Architecture',
  description:
    'Autonomous defense infrastructure for onchain capital. Deterministic semantic security on Somnia.',
  metadataBase: new URL('https://ibea.insomnia.security'),
  openGraph: {
    title: 'IBEA — Autonomous Defense Infrastructure',
    description: 'Deterministic semantic security for onchain capital on Somnia.',
    type: 'website',
  },
  robots: {
    index: false, // Institutional — not public indexed
    follow: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#050505',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

import { TopBar } from "@/components/layout/TopBar"
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&display=swap"
          rel="stylesheet"
        />
        <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-black text-text-primary font-sans antialiased" suppressHydrationWarning>
        <Providers>
          <div className="min-h-screen bg-transparent text-white selection:bg-white/20 font-sans relative flex flex-col">
            <BackgroundGradientAnimation
              containerClassName="fixed inset-0 z-[-1] pointer-events-none"
              firstColor="17, 24, 39"     // Very dark gray/slate
              secondColor="30, 58, 138"   // Deep blue
              thirdColor="6, 78, 59"      // Deep emerald
              fourthColor="127, 29, 29"   // Deep red
              fifthColor="15, 23, 42"     // Slate
              pointerColor="59, 130, 246" // Blue glow
              size="120%"
            />
            <TopBar />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
