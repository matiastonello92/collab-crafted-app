'use client'

import { useMemo } from 'react'
import { differenceInHours, parseISO } from 'date-fns'
import type { ShiftWithAssignments } from '@/types/shifts'

export interface EmployeeWeekStats {
  userId: string
  plannedHours: number      // Ore pianificate (shifts nella settimana)
  actualHours: number       // Ore effettive (da timeclock - per ora = planned)
  overtimeHours: number     // Straordinario
  variance: number          // Differenza planned vs actual
  recoveryHours: number     // Ore recupero
}

interface UseEmployeeStatsProps {
  shifts: ShiftWithAssignments[]
  weekStart: string
}

/**
 * Hook per calcolare statistiche settimanali per ogni employee
 * Stile ComboHR: 43h | 42h50 | 0h | -0h10 | RC 0h
 */
export function useEmployeeStats({ shifts, weekStart }: UseEmployeeStatsProps) {
  return useMemo(() => {
    const statsByUser: Record<string, EmployeeWeekStats> = {}
    
    shifts.forEach(shift => {
      const userId = shift.assignments?.[0]?.user_id
      if (!userId) return
      
      if (!statsByUser[userId]) {
        statsByUser[userId] = {
          userId,
          plannedHours: 0,
          actualHours: 0,
          overtimeHours: 0,
          variance: 0,
          recoveryHours: 0
        }
      }
      
      // Calcola ore pianificate (start_at/end_at con pausa pianificata)
      const plannedStart = parseISO(shift.start_at)
      const plannedEnd = parseISO(shift.end_at)
      const plannedMinutes = differenceInHours(plannedEnd, plannedStart) * 60
      const plannedNetMinutes = Math.max(0, plannedMinutes - (shift.break_minutes || 0))
      statsByUser[userId].plannedHours += plannedNetMinutes / 60
      
      // Calcola ore effettive (actual_start_at/actual_end_at con pausa effettiva)
      if (shift.actual_start_at && shift.actual_end_at) {
        const actualStart = parseISO(shift.actual_start_at)
        const actualEnd = parseISO(shift.actual_end_at)
        const actualMinutes = Math.floor((actualEnd.getTime() - actualStart.getTime()) / 60000)
        const actualNetMinutes = Math.max(0, actualMinutes - (shift.actual_break_minutes || 0))
        statsByUser[userId].actualHours += actualNetMinutes / 60
      }
    })
    
    // Calcola variance e overtime
    Object.values(statsByUser).forEach(stats => {
      stats.variance = stats.actualHours - stats.plannedHours
      // Overtime se > 40h/settimana (soglia configurabile)
      stats.overtimeHours = Math.max(0, stats.plannedHours - 40)
    })
    
    return statsByUser
  }, [shifts, weekStart])
}

/**
 * Genera colore avatar da hash del nome
 */
export function getAvatarColor(name: string): string {
  if (!name) return 'oklch(70% 0.1 180)' // default blue
  
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const hue = hash % 360
  
  // Genera colore OKLCH saturo ma leggibile
  return `oklch(70% 0.15 ${hue})`
}

/**
 * Formatta statistiche ore in formato ComboHR: "43h | 42h50 | +0h10"
 */
export function formatEmployeeStats(stats: EmployeeWeekStats): string {
  const planned = `${Math.floor(stats.plannedHours)}h`
  const actual = `${Math.floor(stats.actualHours)}h${stats.actualHours % 1 > 0 ? Math.round((stats.actualHours % 1) * 60).toString().padStart(2, '0') : ''}`
  
  const variancePrefix = stats.variance >= 0 ? '+' : ''
  const variance = `${variancePrefix}${stats.variance.toFixed(1)}h`
  
  const recovery = stats.recoveryHours > 0 ? ` | RC ${stats.recoveryHours}h` : ''
  
  return `${planned} | ${actual} | ${variance}${recovery}`
}
