import type { Metadata } from 'next'
import { ErrorBoundary } from '@/components/error-boundary'

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
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}