// Cook Mode Layout - Full Screen, No Navigation

import type { Metadata } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Cook Mode - Klyra',
  description: 'Modalità Cucina'
};

export default function CookModeLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className="antialiased">
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
          {children}
        </div>
      </body>
    </html>
  );
}
