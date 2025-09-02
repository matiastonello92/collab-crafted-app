import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/lib/providers'
import { Suspense } from 'react'
import Header from '@/components/nav/Header'
import SidebarClient from '@/components/nav/SidebarClient'
import { ErrorBoundary } from '@/components/error-boundary'

export const metadata: Metadata = {
  title: 'Staff Management - Sistema Gestione Personale',
  description: 'Sistema multi-tenant per la gestione del personale con RBAC e feature flags',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body>
        <ErrorBoundary>
          <Providers>
            <div className="flex h-screen bg-background">
              <Suspense fallback={null}>
                <SidebarClient />
              </Suspense>
              <div className="flex-1 flex flex-col overflow-hidden">
                <Suspense fallback={null}>
                  {/* Server component wrapper for header */}
                  <Header />
                </Suspense>
                <main className="flex-1 overflow-y-auto">
                  {children}
                </main>
              </div>
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
