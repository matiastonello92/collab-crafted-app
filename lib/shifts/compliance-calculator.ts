// Klyra Shifts - Compliance Calculator (FR labor law checks)

import type { TimeClockEvent, Shift } from '@/types/shifts'
import type { ComplianceRule, ComplianceViolation } from '@/types/compliance'
import { toParisTime } from './timezone-utils'

interface DailyHours {
  date: string // YYYY-MM-DD
  totalMinutes: number
  shifts: Shift[]
}

/**
 * Calcola ore lavorate per giorno da time clock events
 */
export function calculateDailyHours(
  events: TimeClockEvent[],
  periodStart: string,
  periodEnd: string
): DailyHours[] {
  const start = new Date(periodStart)
  const end = new Date(periodEnd)
  const dailyMap = new Map<string, DailyHours>()

  let currentClockIn: Date | null = null
  let currentDate: string | null = null

  for (const event of events) {
    const eventTime = new Date(event.occurred_at)
    if (eventTime < start || eventTime > end) continue

    const dateKey = eventTime.toISOString().split('T')[0]

    if (event.kind === 'clock_in') {
      currentClockIn = eventTime
      currentDate = dateKey
    } else if (event.kind === 'clock_out' && currentClockIn && currentDate) {
      const minutes = (eventTime.getTime() - currentClockIn.getTime()) / 60000
      
      if (!dailyMap.has(currentDate)) {
        dailyMap.set(currentDate, { date: currentDate, totalMinutes: 0, shifts: [] })
      }
      const day = dailyMap.get(currentDate)!
      day.totalMinutes += minutes

      currentClockIn = null
      currentDate = null
    }
  }

  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Calcola ore di riposo tra due turni consecutivi
 */
export function calculateRestHours(shift1End: string, shift2Start: string): number {
  const end = new Date(shift1End)
  const start = new Date(shift2Start)
  return (start.getTime() - end.getTime()) / (60 * 60 * 1000) // hours
}

/**
 * Check violazione: riposo giornaliero < 11h tra due turni
 */
export function checkDailyRestViolation(
  shifts: Shift[],
  rule: ComplianceRule
): Omit<ComplianceViolation, 'id' | 'created_at'>[] {
  if (!rule.is_active) return []

  const threshold = rule.threshold_value.hours
  const violations: Omit<ComplianceViolation, 'id' | 'created_at'>[] = []
  
  const sorted = [...shifts].sort((a, b) => 
    new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  )

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]
    const next = sorted[i + 1]
    
    const restHours = calculateRestHours(current.end_at, next.start_at)
    
    if (restHours < threshold) {
      violations.push({
        org_id: current.org_id,
        location_id: current.location_id,
        user_id: '', // will be filled by caller
        rule_id: rule.id,
        violation_date: new Date(next.start_at).toISOString().split('T')[0],
        severity: 'warning',
        details: {
          rest_hours: Math.round(restHours * 10) / 10,
          threshold,
          shift_ids: [current.id, next.id]
        },
        is_silenced: false
      })
    }
  }

  return violations
}

/**
 * Check violazione: ore lavorate > 10h in un giorno
 */
export function checkMaxHoursPerDayViolation(
  dailyHours: DailyHours[],
  rule: ComplianceRule,
  orgId: string,
  locationId: string
): Omit<ComplianceViolation, 'id' | 'created_at'>[] {
  if (!rule.is_active) return []

  const threshold = rule.threshold_value.hours
  const violations: Omit<ComplianceViolation, 'id' | 'created_at'>[] = []

  for (const day of dailyHours) {
    const hoursWorked = day.totalMinutes / 60
    
    if (hoursWorked > threshold) {
      violations.push({
        org_id: orgId,
        location_id: locationId,
        user_id: '', // will be filled by caller
        rule_id: rule.id,
        violation_date: day.date,
        severity: hoursWorked > threshold + 2 ? 'critical' : 'warning',
        details: {
          hours_worked: Math.round(hoursWorked * 10) / 10,
          threshold,
          shift_ids: day.shifts.map(s => s.id)
        },
        is_silenced: false
      })
    }
  }

  return violations
}

/**
 * Check violazione: ore lavorate > 48h in una settimana
 */
export function checkMaxHoursPerWeekViolation(
  dailyHours: DailyHours[],
  rule: ComplianceRule,
  orgId: string,
  locationId: string
): Omit<ComplianceViolation, 'id' | 'created_at'>[] {
  if (!rule.is_active) return []

  const threshold = rule.threshold_value.hours
  const violations: Omit<ComplianceViolation, 'id' | 'created_at'>[] = []

  // Group by week (ISO week starting Monday)
  const weekMap = new Map<string, DailyHours[]>()
  
  for (const day of dailyHours) {
    const date = new Date(day.date)
    const weekKey = getISOWeekKey(date)
    
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, [])
    }
    weekMap.get(weekKey)!.push(day)
  }

  for (const [weekKey, days] of weekMap) {
    const totalMinutes = days.reduce((sum, d) => sum + d.totalMinutes, 0)
    const hoursWorked = totalMinutes / 60
    
    if (hoursWorked > threshold) {
      // Violazione sulla prima data della settimana
      const firstDay = days.sort((a, b) => a.date.localeCompare(b.date))[0]
      
      violations.push({
        org_id: orgId,
        location_id: locationId,
        user_id: '', // will be filled by caller
        rule_id: rule.id,
        violation_date: firstDay.date,
        severity: hoursWorked > threshold + 8 ? 'critical' : 'warning',
        details: {
          hours_worked: Math.round(hoursWorked * 10) / 10,
          threshold,
          shift_ids: days.flatMap(d => d.shifts.map(s => s.id))
        },
        is_silenced: false
      })
    }
  }

  return violations
}

/**
 * Run tutti i compliance checks per un utente in un periodo
 */
export function runComplianceChecks(
  userId: string,
  events: TimeClockEvent[],
  shifts: Shift[],
  rules: ComplianceRule[],
  periodStart: string,
  periodEnd: string
): Omit<ComplianceViolation, 'id' | 'created_at'>[] {
  const violations: Omit<ComplianceViolation, 'id' | 'created_at'>[] = []

  // Assume first shift for org/location (or can be passed as param)
  const orgId = shifts[0]?.org_id || ''
  const locationId = shifts[0]?.location_id || ''

  // Daily hours calculation
  const dailyHours = calculateDailyHours(events, periodStart, periodEnd)

  for (const rule of rules) {
    if (!rule.is_active) continue

    switch (rule.rule_key) {
      case 'daily_rest_11h':
        violations.push(...checkDailyRestViolation(shifts, rule))
        break
      case 'max_hours_per_day_10h':
        violations.push(...checkMaxHoursPerDayViolation(dailyHours, rule, orgId, locationId))
        break
      case 'max_hours_per_week_48h':
        violations.push(...checkMaxHoursPerWeekViolation(dailyHours, rule, orgId, locationId))
        break
    }
  }

  // Fill user_id
  return violations.map(v => ({ ...v, user_id: userId }))
}

/**
 * Get ISO week key (YYYY-Www format)
 */
function getISOWeekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`
}
