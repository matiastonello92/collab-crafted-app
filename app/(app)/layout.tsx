import type { Metadata } from 'next'
import { Providers } from '@/lib/providers'
import { ErrorBoundary } from '@/components/error-boundary'
import AppShell from '@/components/layouts/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { getAppSetting } from '@/app/actions/app-settings'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Klyra - Sistema Gestione Personale',
  description: 'Piattaforma multi-tenant avanzata per la gestione del personale con controllo degli accessi basato sui ruoli e feature flags dinamici',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AppLayout({
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
    <html lang="it">
      <head>
        <title>Klyra - Sistema Gestione Personale</title>
        <meta name="description" content="Piattaforma multi-tenant avanzata per la gestione del personale con controllo degli accessi basato sui ruoli e feature flags dinamici" />
        <link rel="icon" href="/brand/klyra-icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/brand/klyra-icon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="dark">
        <ErrorBoundary>
          <Providers>
            {showBanner && (
              <Alert className="rounded-none border-x-0 border-t-0 bg-klyra-warning/10 border-klyra-warning/20">
                <AlertTriangle className="h-4 w-4 text-klyra-warning" />
                <AlertDescription className="text-klyra-warning">
                  {banner.message}
                </AlertDescription>
              </Alert>
            )}
            <AppShell>{children}</AppShell>
            <Toaster richColors position="top-right" />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}