// Time range parsing utilities for availability tstzrange

/**
 * Parse PostgreSQL tstzrange format into start/end times
 * Format: ["2024-01-15 09:00:00+01","2024-01-15 17:00:00+01")
 * @param timeRange - tstzrange string from database
 * @returns { start: string, end: string } in HH:mm format, or null if invalid
 */
export function parseTimeRange(timeRange: string | null): { start: string; end: string } | null {
  if (!timeRange) return null

  try {
    // Remove brackets and quotes, split by comma
    const cleaned = timeRange.replace(/[\[\]"()]/g, '')
    const parts = cleaned.split(',')
    
    if (parts.length !== 2) return null

    const startDate = new Date(parts[0].trim())
    const endDate = new Date(parts[1].trim())

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return null
    }

    // Format as HH:mm
    const start = formatTime(startDate)
    const end = formatTime(endDate)

    return { start, end }
  } catch (error) {
    console.error('Error parsing time range:', error)
    return null
  }
}

/**
 * Format Date object to HH:mm string
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Format time range for display
 * @param timeRange - tstzrange string
 * @returns "09:00 - 17:00" or "Tutto il giorno" if unavailable
 */
export function formatTimeRangeDisplay(timeRange: string | null): string {
  const parsed = parseTimeRange(timeRange)
  if (!parsed) return 'Tutto il giorno'
  
  return `${parsed.start} - ${parsed.end}`
}

/**
 * Check if a time range covers the full day (or is invalid)
 * @param timeRange - tstzrange string
 * @returns true if full day or unparsable
 */
export function isFullDayRange(timeRange: string | null): boolean {
  return parseTimeRange(timeRange) === null
}
