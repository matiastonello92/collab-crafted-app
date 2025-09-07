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
  title: 'Staff Management - Sistema Gestione Personale',
  description: 'Sistema multi-tenant per la gestione del personale con RBAC e feature flags',
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
      <body>
        <ErrorBoundary>
          <Providers>
            {showBanner && (
              <Alert className="rounded-none border-x-0 border-t-0 bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
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