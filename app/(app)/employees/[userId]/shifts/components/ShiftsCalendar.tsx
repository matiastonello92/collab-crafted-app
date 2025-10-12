'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { it } from 'date-fns/locale'
import { useTranslation } from '@/lib/i18n'
import { useEmployeeShifts } from '../hooks/useEmployeeShifts'

interface ShiftsCalendarProps {
  userId: string
  onDayClick?: (date: Date) => void
}

export function ShiftsCalendar({ userId, onDayClick }: ShiftsCalendarProps) {
  const { t } = useTranslation()
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const { shifts, leaves, loading } = useEmployeeShifts(
    userId,
    monthStart.toISOString(),
    monthEnd.toISOString()
  )

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const hasShift = (date: Date) => {
    return shifts.some(shift => 
      isSameDay(new Date(shift.startAt), date)
    )
  }

  const hasLeave = (date: Date) => {
    return leaves.some(leave => {
      const leaveStart = new Date(leave.startAt)
      const leaveEnd = new Date(leave.endAt)
      return date >= leaveStart && date <= leaveEnd
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
            >
              {t('employees.shifts.calendar.today')}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              {t('common.loading')}...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {/* Week day headers */}
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
            
            {/* Days */}
            {days.map(day => {
              const isToday = isSameDay(day, new Date())
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const dayHasShift = hasShift(day)
              const dayHasLeave = hasLeave(day)
              
              return (
                <button
                  key={day.toString()}
                  onClick={() => onDayClick?.(day)}
                  className={`
                    aspect-square p-2 rounded-lg border transition-colors relative
                    ${!isCurrentMonth ? 'opacity-30' : ''}
                    ${isToday ? 'border-primary bg-primary/10 font-semibold' : 'border-border'}
                    ${dayHasShift ? 'bg-blue-50 hover:bg-blue-100' : ''}
                    ${dayHasLeave ? 'bg-orange-50 hover:bg-orange-100' : ''}
                    ${!dayHasShift && !dayHasLeave ? 'hover:bg-muted' : ''}
                  `}
                >
                  <span className="text-sm">{format(day, 'd')}</span>
                  
                  {dayHasShift && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                      <div className="h-1 w-1 rounded-full bg-blue-600" />
                    </div>
                  )}
                  
                  {dayHasLeave && (
                    <div className="absolute top-1 right-1">
                      <div className="h-1 w-1 rounded-full bg-orange-600" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
