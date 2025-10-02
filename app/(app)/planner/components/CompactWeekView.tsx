'use client'

import { memo, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import type { ShiftWithAssignments } from '@/types/shifts'
import { Clock, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Props {
  shifts: ShiftWithAssignments[]
  weekDays: string[]
  onShiftClick?: (shift: ShiftWithAssignments) => void
}

export const CompactWeekView = memo(function CompactWeekView({ 
  shifts, 
  weekDays,
  onShiftClick 
}: Props) {
  const shiftsByDay = useMemo(() => {
    const grouped: Record<string, ShiftWithAssignments[]> = {}
    weekDays.forEach(day => { grouped[day] = [] })
    
    shifts.forEach(shift => {
      const day = shift.start_at.split('T')[0]
      if (grouped[day]) {
        grouped[day].push(shift)
      }
    })
    
    return grouped
  }, [shifts, weekDays])

  return (
    <div className="grid grid-cols-7 gap-1 bg-muted p-2 rounded-lg">
      {weekDays.map(day => {
        const dayShifts = shiftsByDay[day] || []
        const date = parseISO(day)
        
        return (
          <div key={day} className="bg-background rounded p-2 min-h-[120px]">
            {/* Header */}
            <div className="text-center mb-2 pb-2 border-b">
              <div className="text-xs text-muted-foreground uppercase">
                {format(date, 'EEE', { locale: it })}
              </div>
              <div className="text-lg font-semibold">
                {format(date, 'd')}
              </div>
            </div>
            
            {/* Shifts */}
            <div className="space-y-1">
              {dayShifts.map(shift => {
                const startTime = format(parseISO(shift.start_at), 'HH:mm')
                const endTime = format(parseISO(shift.end_at), 'HH:mm')
                const user = shift.assignments?.[0]?.user
                
                return (
                  <button
                    key={shift.id}
                    onClick={() => onShiftClick?.(shift)}
                    className="w-full text-left p-1.5 rounded text-xs hover:bg-accent transition-colors border"
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{startTime}-{endTime}</span>
                    </div>
                    
                    {user && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="truncate">{user.full_name || 'N/A'}</span>
                      </div>
                    )}
                    
                    {shift.job_tag && (
                      <Badge 
                        variant="outline" 
                        className="mt-1 text-[10px] h-4 px-1"
                        style={{ 
                          borderColor: shift.job_tag.color || undefined,
                          color: shift.job_tag.color || undefined 
                        }}
                      >
                        {shift.job_tag.label || shift.job_tag.name}
                      </Badge>
                    )}
                  </button>
                )
              })}
              
              {dayShifts.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-4">
                  Nessun turno
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
})
