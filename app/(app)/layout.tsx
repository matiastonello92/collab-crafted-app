import type { Metadata } from 'next'
import { Providers } from '@/lib/providers'
import { ErrorBoundary } from '@/components/error-boundary'
import AppShell from '@/components/layouts/AppShell'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Staff Management - Sistema Gestione Personale',
  description: 'Sistema multi-tenant per la gestione del personale con RBAC e feature flags',
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body>
        <ErrorBoundary>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}