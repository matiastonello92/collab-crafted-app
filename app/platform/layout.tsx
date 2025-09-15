import { Inter } from 'next/font/google'
import { Providers } from '@/lib/providers'
import { PlatformChrome } from './PlatformChrome'
import '../globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Platform Console - Klyra',
  description: 'Global platform administration and monitoring',
}

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-klyra-bg text-klyra-fg antialiased min-h-screen noise-overlay`}>
        <Providers>
          <div className="min-h-screen bg-klyra-bg">
            <PlatformChrome />
            <main className="mx-auto max-w-7xl px-6 py-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}