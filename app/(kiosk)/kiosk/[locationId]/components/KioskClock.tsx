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
      <div className="flex items-center justify-center gap-4 md:gap-6">
        <Clock className="w-10 h-10 md:w-12 md:h-12 text-white/90 drop-shadow-lg" />
        <div className="text-5xl md:text-6xl font-mono font-bold text-white tracking-wider drop-shadow-2xl">
          {hours}:{minutes}:<span className="text-white/70">{seconds}</span>
        </div>
      </div>
      <p className="text-lg md:text-xl text-white/70 capitalize font-medium">{dateStr}</p>
    </div>
  )
}
