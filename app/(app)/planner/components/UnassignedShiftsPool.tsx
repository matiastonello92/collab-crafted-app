'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, UserPlus, Calendar } from 'lucide-react'
import type { ShiftWithAssignments } from '@/types/shifts'
import { format, parseISO, differenceInHours } from 'date-fns'
import { it } from 'date-fns/locale'

interface Props {
  shifts: ShiftWithAssignments[]
  onAssignClick: (shift: ShiftWithAssignments) => void
  onShiftClick: (shift: ShiftWithAssignments) => void
}

export function UnassignedShiftsPool({ shifts, onAssignClick, onShiftClick }: Props) {
  // Filter unassigned shifts
  const unassignedShifts = shifts.filter(
    shift => !shift.assignments || shift.assignments.length === 0
  )
  
  if (unassignedShifts.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground text-sm">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Tutti i turni sono assegnati</p>
        </div>
      </Card>
    )
  }
  
  return (
    <Card className="p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Turni Non Assegnati</h3>
          <Badge variant="secondary">{unassignedShifts.length}</Badge>
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {unassignedShifts.map(shift => {
            const hours = differenceInHours(
              parseISO(shift.end_at),
              parseISO(shift.start_at)
            )
            const date = parseISO(shift.start_at)
            
            return (
              <Card 
                key={shift.id} 
                className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onShiftClick(shift)}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {format(date, 'EEEE d MMM', { locale: it })}
                    </div>
                    {shift.job_tag && (
                      <Badge variant="outline" className="text-xs">
                        {shift.job_tag.label}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {format(date, 'HH:mm')} - {format(parseISO(shift.end_at), 'HH:mm')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({hours}h)
                    </span>
                  </div>
                  
                  {shift.notes && (
                    <div className="text-xs text-muted-foreground truncate">
                      📝 {shift.notes}
                    </div>
                  )}
                  
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAssignClick(shift)
                    }}
                  >
                    <UserPlus className="h-3 w-3 mr-2" />
                    Assegna
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
