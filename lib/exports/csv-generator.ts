// Klyra Shifts - CSV Generator

import type { Timesheet } from '@/types/shifts'
import { formatMinutesToHours } from '@/lib/shifts/timesheet-calculator'

interface TimesheetWithUser extends Timesheet {
  user?: {
    email?: string
    full_name?: string
  }
}

interface CsvConfig {
  fields: string[]
}

const FIELD_LABELS: Record<string, string> = {
  user_email: 'Email',
  user_name: 'Nome',
  period: 'Periodo',
  regular_hours: 'Ore Ordinarie',
  overtime_hours: 'Straordinari',
  break_hours: 'Pause',
  total_hours: 'Ore Totali',
  planned_hours: 'Ore Pianificate',
  variance_hours: 'Differenza',
  days_worked: 'Giorni Lavorati',
  status: 'Stato',
  approved_at: 'Approvato Il',
  notes: 'Note'
}

/**
 * Genera CSV da array di timesheets
 */
export function generateTimesheetsCsv(
  timesheets: TimesheetWithUser[],
  config: CsvConfig
): string {
  const { fields } = config
  
  // Header
  const headers = fields.map(f => FIELD_LABELS[f] || f)
  const rows = [headers.join(',')]
  
  // Data rows
  for (const ts of timesheets) {
    const row = fields.map(field => {
      const value = getFieldValue(ts, field)
      return escapeCsvValue(value)
    })
    rows.push(row.join(','))
  }
  
  return rows.join('\n')
}

function getFieldValue(ts: TimesheetWithUser, field: string): string {
  switch (field) {
    case 'user_email':
      return ts.user?.email || ''
    case 'user_name':
      return ts.user?.full_name || ''
    case 'period':
      return `${ts.period_start} - ${ts.period_end}`
    case 'regular_hours':
      return formatMinutesToHours(ts.totals.regular_minutes)
    case 'overtime_hours':
      return formatMinutesToHours(ts.totals.overtime_minutes)
    case 'break_hours':
      return formatMinutesToHours(ts.totals.break_minutes)
    case 'total_hours':
      return formatMinutesToHours(ts.totals.regular_minutes + ts.totals.overtime_minutes)
    case 'planned_hours':
      return formatMinutesToHours(ts.totals.planned_minutes)
    case 'variance_hours':
      return formatMinutesToHours(ts.totals.variance_minutes)
    case 'days_worked':
      return ts.totals.days_worked.toString()
    case 'status':
      return ts.status
    case 'approved_at':
      return ts.approved_at ? new Date(ts.approved_at).toLocaleDateString('it-IT') : ''
    case 'notes':
      return ts.notes || ''
    default:
      return ''
  }
}

function escapeCsvValue(value: string): string {
  // Se contiene virgola, virgolette o newline, racchiudi tra virgolette
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    // Escape virgolette doppie
    const escaped = value.replace(/"/g, '""')
    return `"${escaped}"`
  }
  return value
}

/**
 * Crea Blob CSV per download
 */
export function createCsvBlob(csvContent: string): Blob {
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
}

/**
 * Genera nome file CSV con timestamp
 */
export function generateCsvFilename(prefix = 'timesheets'): string {
  const date = new Date().toISOString().split('T')[0]
  return `${prefix}_${date}.csv`
}
