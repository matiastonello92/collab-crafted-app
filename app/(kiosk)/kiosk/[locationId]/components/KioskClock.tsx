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
    <div className="text-center space-y-2">
      <div className="flex items-center justify-center gap-4">
        <Clock className="w-12 h-12 text-white/80" />
        <div className="text-7xl md:text-8xl font-bold text-white drop-shadow-2xl tabular-nums">
          {hours}:{minutes}:<span className="text-white/60">{seconds}</span>
        </div>
      </div>
      <div className="text-xl md:text-2xl text-white/70 capitalize">
        {dateStr}
      </div>
    </div>
  )
}
