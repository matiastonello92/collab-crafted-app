import type { Metadata } from 'next'
import { ErrorBoundary } from '@/components/error-boundary'
import { AppShell } from '@/components/shell/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { getAppSetting } from '@/app/actions/app-settings'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Klyra - Sistema Gestione Personale',
  description: 'Piattaforma multi-tenant avanzata per la gestione del personale con controllo degli accessi basato sui ruoli e feature flags dinamici',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AppSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Read banner settings server-side (no cache)
  let banner = null
  try {
    banner = await getAppSetting('banner')
  } catch (error) {
    // Fallback if banner settings fail to load
    console.warn('Failed to load banner settings:', error)
  }

  const showBanner = banner?.enabled && banner?.message

  return (
    <ErrorBoundary>
      {showBanner && (
        <Alert className="rounded-none border-x-0 border-t-0 border-warning/30 bg-warning/15 text-warning-foreground">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            {banner.message}
          </AlertDescription>
        </Alert>
      )}
      <AppShell variant="app">{children}</AppShell>
      <Toaster richColors position="top-right" />
    </ErrorBoundary>
  )
}