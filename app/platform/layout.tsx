import type { Metadata } from 'next'
import { AppShell } from '@/components/shell/AppShell'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'Platform Console - Klyra',
  description: 'Global platform administration and monitoring',
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell variant="platform" contentClassName="px-6 py-8">
        {children}
      </AppShell>
      <Toaster richColors position="top-right" />
    </>
  )
}