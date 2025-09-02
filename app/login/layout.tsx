import type { Metadata } from 'next'
import { Providers } from '@/lib/providers'
import { ErrorBoundary } from '@/components/error-boundary'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Login - Staff Management',
  description: 'Accedi al sistema di gestione del personale',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-background">
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}