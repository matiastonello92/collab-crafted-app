'use client'

import Link from 'next/link'
import { Clock, Activity } from 'lucide-react'
import { useEffect, useState } from 'react'

export function PlatformChrome() {
  const [lastSync, setLastSync] = useState<Date | null>(null)

  useEffect(() => {
    // Initialize timestamp on client
    setLastSync(new Date())
    
    const interval = setInterval(() => {
      setLastSync(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold gradient-title">
              Platform Console
            </h1>
            <nav className="hidden md:flex items-center space-x-4">
              <Link 
                href="/platform/dashboard"
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              >
                <Activity size={16} />
                <span>Dashboard</span>
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Clock size={14} />
              <span>Last sync: {lastSync ? lastSync.toLocaleTimeString() : '--:--:--'}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}