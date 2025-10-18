'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

export function KioskClockCompact() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit'
      }))
      setDate(now.toLocaleDateString('it-IT', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      }))
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="flex items-center gap-2 text-white/80">
      <Clock className="w-4 h-4" />
      <div className="flex flex-col items-end">
        <span className="text-base font-medium tabular-nums">{time}</span>
        <span className="text-xs text-white/60">{date}</span>
      </div>
    </div>
  )
}
