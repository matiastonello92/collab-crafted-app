// Klyra Shifts - Timesheet Calculator (Europe/Paris timezone-safe)

import { toParisTime, fromParisTime } from './timezone-utils'
import type { TimeClockEvent, Shift } from '@/types/shifts'

interface WorkedHours {
  regularMinutes: number
  overtimeMinutes: number
  breakMinutes: number
  daysWorked: number
}

interface PlannedHours {
  plannedMinutes: number
}

interface TimesheetTotals {
  regular_minutes: number
  overtime_minutes: number
  break_minutes: number
  planned_minutes: number
  variance_minutes: number
  days_worked: number
}

/**
 * Calcola ore lavorate da eventi time_clock per periodo
 * Assume eventi ordinati per occurred_at ASC
 */
export function calculateWorkedHoursFromClockEvents(
  events: TimeClockEvent[],
  periodStart: string,
  periodEnd: string
): WorkedHours {
  const start = new Date(periodStart)
  const end = new Date(periodEnd)
  
  let regularMinutes = 0
  let breakMinutes = 0
  const daysWorked = new Set<string>()
  
  let currentClockIn: Date | null = null
  let currentBreakStart: Date | null = null
  
  for (const event of events) {
    const eventTime = new Date(event.occurred_at)
    
    // Skip eventi fuori periodo
    if (eventTime < start || eventTime > end) continue
    
    switch (event.kind) {
      case 'clock_in':
        currentClockIn = eventTime
        daysWorked.add(eventTime.toISOString().split('T')[0])
        break
        
      case 'clock_out':
        if (currentClockIn) {
          const worked = (eventTime.getTime() - currentClockIn.getTime()) / 60000
          regularMinutes += worked
          currentClockIn = null
        }
        break
        
      case 'break_start':
        currentBreakStart = eventTime
        break
        
      case 'break_end':
        if (currentBreakStart) {
          const breakDuration = (eventTime.getTime() - currentBreakStart.getTime()) / 60000
          breakMinutes += breakDuration
          currentBreakStart = null
        }
        break
    }
  }
  
  // Se ancora in clock in alla fine del periodo, calcola fino a period_end
  if (currentClockIn && currentClockIn < end) {
    const worked = (end.getTime() - currentClockIn.getTime()) / 60000
    regularMinutes += worked
  }
  
  // Se ancora in pausa alla fine del periodo
  if (currentBreakStart && currentBreakStart < end) {
    const breakDuration = (end.getTime() - currentBreakStart.getTime()) / 60000
    breakMinutes += breakDuration
  }
  
  // Calcola straordinari (>40h/settimana)
  const totalWorkMinutes = regularMinutes - breakMinutes
  const weeksInPeriod = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const standardMinutesPerWeek = 40 * 60 // 40h
  const standardMinutesTotal = weeksInPeriod * standardMinutesPerWeek
  
  const overtimeMinutes = Math.max(0, totalWorkMinutes - standardMinutesTotal)
  const regularMinutesAdjusted = totalWorkMinutes - overtimeMinutes
  
  return {
    regularMinutes: Math.round(regularMinutesAdjusted),
    overtimeMinutes: Math.round(overtimeMinutes),
    breakMinutes: Math.round(breakMinutes),
    daysWorked: daysWorked.size
  }
}

/**
 * Calcola ore pianificate da shift assegnati nel periodo
 */
export function calculatePlannedHoursFromShifts(
  shifts: Shift[],
  periodStart: string,
  periodEnd: string
): PlannedHours {
  const start = new Date(periodStart)
  const end = new Date(periodEnd)
  
  let plannedMinutes = 0
  
  for (const shift of shifts) {
    const shiftStart = new Date(shift.start_at)
    const shiftEnd = new Date(shift.end_at)
    
    // Skip shift fuori periodo
    if (shiftEnd < start || shiftStart > end) continue
    
    const duration = (shiftEnd.getTime() - shiftStart.getTime()) / 60000
    const netDuration = duration - (shift.break_minutes || 0)
    plannedMinutes += netDuration
  }
  
  return {
    plannedMinutes: Math.round(plannedMinutes)
  }
}

/**
 * Genera totali timesheet combinando worked + planned
 */
export function generateTimesheetTotals(
  worked: WorkedHours,
  planned: PlannedHours
): TimesheetTotals {
  const totalWorked = worked.regularMinutes + worked.overtimeMinutes
  const variance = totalWorked - planned.plannedMinutes
  
  return {
    regular_minutes: worked.regularMinutes,
    overtime_minutes: worked.overtimeMinutes,
    break_minutes: worked.breakMinutes,
    planned_minutes: planned.plannedMinutes,
    variance_minutes: variance,
    days_worked: worked.daysWorked
  }
}

/**
 * Calcola periodo mensile corrente (primo giorno del mese - ultimo giorno)
 * Timezone: Europe/Paris
 */
export function getCurrentMonthPeriod(): { start: string; end: string } {
  const now = toParisTime(new Date())
  const year = now.getFullYear()
  const month = now.getMonth()
  
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
}

/**
 * Formatta minuti in ore decimali (es. 90 min = 1.5h)
 */
export function formatMinutesToHours(minutes: number): string {
  return (minutes / 60).toFixed(2)
}
