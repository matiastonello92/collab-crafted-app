// Week manipulation utilities for Planner UI
import { startOfWeek, endOfWeek, addDays, format, parseISO, addWeeks } from 'date-fns'
import { it } from 'date-fns/locale'

export interface WeekBounds {
  start: string // ISO date (YYYY-MM-DD)
  end: string // ISO date (YYYY-MM-DD)
  days: string[] // Array of 7 ISO dates (Mon-Sun)
}

/**
 * Get week boundaries (Monday to Sunday) for a given reference date
 * @param referenceDate - Date string (ISO) or Date object
 * @returns Week bounds with start, end, and array of all 7 days
 */
export function getWeekBounds(referenceDate: Date | string): WeekBounds {
  const date = typeof referenceDate === 'string' ? parseISO(referenceDate) : referenceDate
  const monday = startOfWeek(date, { weekStartsOn: 1 }) // ISO week (lunedì)
  const sunday = endOfWeek(date, { weekStartsOn: 1 })
  
  return {
    start: format(monday, 'yyyy-MM-dd'),
    end: format(sunday, 'yyyy-MM-dd'),
    days: Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), 'yyyy-MM-dd'))
  }
}

/**
 * Format week label for display (e.g., "13 Gen - 19 Gen 2025")
 * @param weekStart - ISO date string (Monday)
 * @returns Formatted week range label
 */
export function formatWeekLabel(weekStart: string): string {
  const monday = parseISO(weekStart)
  const sunday = addDays(monday, 6)
  return `${format(monday, 'd MMM', { locale: it })} - ${format(sunday, 'd MMM yyyy', { locale: it })}`
}

/**
 * Navigate to previous week
 * @param currentWeekStart - Current week start ISO date
 * @returns Previous week start ISO date
 */
export function getPreviousWeek(currentWeekStart: string): string {
  const prev = addWeeks(parseISO(currentWeekStart), -1)
  return format(prev, 'yyyy-MM-dd')
}

/**
 * Navigate to next week
 * @param currentWeekStart - Current week start ISO date
 * @returns Next week start ISO date
 */
export function getNextWeek(currentWeekStart: string): string {
  const next = addWeeks(parseISO(currentWeekStart), 1)
  return format(next, 'yyyy-MM-dd')
}

/**
 * Get current week start (Monday)
 * @returns Current week start ISO date
 */
export function getCurrentWeekStart(): string {
  return getWeekBounds(new Date()).start
}

/**
 * Format day header for planner (e.g., "Lunedì 13")
 * @param date - ISO date string
 * @returns Formatted day header
 */
export function formatDayHeader(date: string): string {
  return format(parseISO(date), 'EEEE d', { locale: it })
}

/**
 * Check if date is today
 * @param date - ISO date string
 * @returns True if date is today
 */
export function isToday(date: string): boolean {
  return date === format(new Date(), 'yyyy-MM-dd')
}
