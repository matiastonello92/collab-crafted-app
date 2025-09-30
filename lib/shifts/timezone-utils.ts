// Klyra Shifts - Timezone Utilities (Europe/Paris normalization)

import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const PARIS_TZ = 'Europe/Paris'

/**
 * Converte una data UTC in Europe/Paris
 * @param utcDate - Data UTC (Date o ISO string)
 * @returns Data in timezone Europe/Paris
 */
export function toParisTime(utcDate: Date | string): Date {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  return toZonedTime(date, PARIS_TZ)
}

/**
 * Converte una data Europe/Paris in UTC
 * @param parisDate - Data in timezone Europe/Paris (Date o ISO string)
 * @returns Data UTC
 */
export function fromParisTime(parisDate: Date | string): Date {
  const date = typeof parisDate === 'string' ? new Date(parisDate) : parisDate
  return fromZonedTime(date, PARIS_TZ)
}

/**
 * Normalizza input utente (assume Europe/Paris) per storage DB (UTC timestamptz)
 * @param parisDateString - ISO string (assunto in Europe/Paris)
 * @returns ISO string UTC per DB
 */
export function formatForDB(parisDateString: string): string {
  const parisDate = new Date(parisDateString)
  const utcDate = fromParisTime(parisDate)
  return utcDate.toISOString()
}

/**
 * Formatta data DB (UTC) per display utente (Europe/Paris)
 * @param utcDateString - ISO string UTC dal DB
 * @returns ISO string in Europe/Paris
 */
export function formatForDisplay(utcDateString: string): string {
  const utcDate = new Date(utcDateString)
  const parisDate = toParisTime(utcDate)
  return parisDate.toISOString()
}

/**
 * Verifica se una data è all'interno di una settimana specifica
 * @param date - Data da verificare (ISO string)
 * @param weekStartDate - Inizio settimana (ISO date YYYY-MM-DD)
 * @returns true se la data è nella settimana, false altrimenti
 */
export function isDateInWeek(date: string, weekStartDate: string): boolean {
  const checkDate = new Date(date)
  const weekStart = new Date(weekStartDate)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7) // +7 giorni
  
  return checkDate >= weekStart && checkDate < weekEnd
}
