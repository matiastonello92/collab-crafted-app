// Kiosk Layout - Full Screen, No Navigation

import type { Metadata } from 'next'
import '@/app/globals.css'
import { Toaster } from '@/components/ui/sonner'
import { LocaleProvider } from '@/lib/i18n/LocaleProvider'

export const metadata: Metadata = {
  title: 'Klyra Kiosk',
  description: 'Time Clock Kiosk'
}

export default function KioskLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className="antialiased overflow-hidden">
        <LocaleProvider initialLocale="it">
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
          {/* Animated Background Blur Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
          </div>
          
          {/* Main Content */}
          <div className="relative z-10">
            {children}
          </div>
        </div>
        <Toaster position="top-center" expand={false} richColors />
        </LocaleProvider>
      </body>
    </html>
  )
}
