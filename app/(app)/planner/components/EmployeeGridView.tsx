'use client'

import { useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Clock, Calendar } from 'lucide-react'
import type { ShiftWithAssignments, UserProfile } from '@/types/shifts'
import { format, parseISO, differenceInHours } from 'date-fns'
import { it } from 'date-fns/locale'
import { getWeekBounds } from '@/lib/shifts/week-utils'

interface Props {
  shifts: ShiftWithAssignments[]
  users: UserProfile[]
  weekStart: string
  onShiftClick?: (shift: ShiftWithAssignments) => void
}

export function EmployeeGridView({ shifts, users, weekStart, onShiftClick }: Props) {
  const { days } = getWeekBounds(weekStart)
  
  // Group shifts by user
  const shiftsByUser = useMemo(() => {
    const grouped: Record<string, ShiftWithAssignments[]> = {}
    
    // Initialize with all users
    users.forEach(user => {
      grouped[user.id] = []
    })
    
    // Add unassigned category
    grouped['unassigned'] = []
    
    // Group shifts
    shifts.forEach(shift => {
      const userId = shift.assignments?.[0]?.user_id || 'unassigned'
      if (!grouped[userId]) {
        grouped[userId] = []
      }
      grouped[userId].push(shift)
    })
    
    return grouped
  }, [shifts, users])
  
  // Calculate weekly totals per user
  const weeklyTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    
    Object.entries(shiftsByUser).forEach(([userId, userShifts]) => {
      totals[userId] = userShifts.reduce((sum, shift) => {
        const hours = differenceInHours(parseISO(shift.end_at), parseISO(shift.start_at))
        return sum + hours - (shift.break_minutes / 60)
      }, 0)
    })
    
    return totals
  }, [shiftsByUser])
  
  return (
    <div className="flex-1 overflow-auto">
      <div className="space-y-4 p-4">
        {/* Column headers */}
        <div className="grid grid-cols-8 gap-2 sticky top-0 bg-background z-10 pb-2 border-b">
          <div className="font-semibold">Impiegato</div>
          {days.map(day => (
            <div key={day} className="text-center text-sm">
              <div className="font-semibold">
                {format(parseISO(day), 'EEE', { locale: it })}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(parseISO(day), 'd MMM')}
              </div>
            </div>
          ))}
        </div>
        
        {/* User rows */}
        {Object.entries(shiftsByUser).map(([userId, userShifts]) => {
          const user = users.find(u => u.id === userId)
          const total = weeklyTotals[userId] || 0
          
          // Skip if no shifts
          if (userShifts.length === 0 && userId !== 'unassigned') return null
          
          return (
            <div key={userId} className="grid grid-cols-8 gap-2 items-start">
              {/* User info */}
              <div className="flex items-center gap-2 py-2">
                {userId === 'unassigned' ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-5 w-5" />
                    <div>
                      <div className="font-medium text-sm">Non assegnati</div>
                      <div className="text-xs">{userShifts.length} turni</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {user?.full_name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {user?.full_name || 'Utente sconosciuto'}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {total.toFixed(1)}h
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Shifts per day */}
              {days.map(day => {
                const dayShifts = userShifts.filter(
                  shift => shift.start_at.split('T')[0] === day
                )
                
                return (
                  <div key={day} className="space-y-1">
                    {dayShifts.map(shift => {
                      const hours = differenceInHours(
                        parseISO(shift.end_at), 
                        parseISO(shift.start_at)
                      )
                      const netHours = hours - (shift.break_minutes / 60)
                      
                      return (
                        <Card
                          key={shift.id}
                          className="p-2 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => onShiftClick?.(shift)}
                        >
                          <div className="text-xs space-y-1">
                            <div className="font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(parseISO(shift.start_at), 'HH:mm')} - 
                              {format(parseISO(shift.end_at), 'HH:mm')}
                            </div>
                            <div className="text-muted-foreground">
                              {netHours.toFixed(1)}h
                            </div>
                            {shift.job_tag && (
                              <Badge variant="outline" className="text-xs">
                                {shift.job_tag.label}
                              </Badge>
                            )}
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
