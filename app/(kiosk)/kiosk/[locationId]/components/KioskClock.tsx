'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

export function KioskClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const hours = time.getHours().toString().padStart(2, '0')
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')

  const dateStr = time.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="text-center space-y-4">
      <div className="flex items-center justify-center gap-4">
        <Clock className="w-12 h-12 text-primary" />
        <div className="text-6xl font-mono font-bold text-foreground tracking-wider">
          {hours}:{minutes}:{seconds}
        </div>
      </div>
      <p className="text-lg text-muted-foreground capitalize">{dateStr}</p>
    </div>
  )
}
