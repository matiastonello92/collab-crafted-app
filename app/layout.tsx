import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/lib/providers';
import { ErrorBoundary } from '@/components/error-boundary';

export const metadata: Metadata = {
  title: 'Staff Management - Sistema Gestione Personale',
  description: 'Sistema multi-tenant per la gestione del personale con RBAC e feature flags',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-background">
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
