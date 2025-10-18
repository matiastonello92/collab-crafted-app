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
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center gap-6">
        <Clock className="w-14 h-14 text-white/90 drop-shadow-lg" />
        <div className="text-7xl font-mono font-bold text-white tracking-wider drop-shadow-2xl">
          {hours}:{minutes}:<span className="text-white/70">{seconds}</span>
        </div>
      </div>
      <p className="text-xl text-white/70 capitalize font-medium">{dateStr}</p>
    </div>
  )
}
