import type { Metadata } from 'next'
import { PlatformChrome } from './PlatformChrome'

export const metadata: Metadata = {
  title: 'Platform Console - Klyra',
  description: 'Global platform administration and monitoring',
}

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <PlatformChrome />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </main>
    </div>
  )
}