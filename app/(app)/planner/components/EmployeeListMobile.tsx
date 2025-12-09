'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Plus, Clock, User } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { getWeekBounds } from '@/lib/shifts/week-utils'
import type { ShiftWithAssignments, UserProfile } from '@/types/shifts'
import { useTranslation } from '@/lib/i18n'
import { hapticLight } from '@/lib/capacitor/native'

interface LeaveRequest {
  id: string
  user_id: string
  type_id: string
  start_at: string
  end_at: string
  status: string
  reason: string | null
  leave_types: {
    id: string
    key: string
    label: string
    color: string | null
  }
  profiles: {
    id: string
    full_name: string | null
  }
}

interface Props {
  shifts: ShiftWithAssignments[]
  leaves: LeaveRequest[]
  users: UserProfile[]
  weekStart: string
  onShiftClick?: (shift: ShiftWithAssignments) => void
  onCellClick?: (userId: string, date: string) => void
}

export function EmployeeListMobile({ 
  shifts, 
  leaves,
  users, 
  weekStart, 
  onShiftClick, 
  onCellClick 
}: Props) {
  const { t } = useTranslation()
  const { days } = getWeekBounds(weekStart)
  
  // Group shifts by day
  const shiftsByDay = days.map(dateStr => {
    const dayShifts = shifts.filter(s => 
      format(new Date(s.start_at), 'yyyy-MM-dd') === dateStr
    )
    const dayLeaves = leaves.filter(l =>
      format(new Date(l.start_at), 'yyyy-MM-dd') === dateStr
    )
    return { dateStr, shifts: dayShifts, leaves: dayLeaves }
  })

  const handleShiftClick = (shift: ShiftWithAssignments) => {
    hapticLight()
    onShiftClick?.(shift)
  }

  const handleAddClick = (date: string) => {
    hapticLight()
    onCellClick?.('unassigned', date)
  }

  return (
    <div className="space-y-4 pb-24">
      <Accordion type="single" collapsible className="space-y-3">
        {shiftsByDay.map(({ dateStr, shifts: dayShifts, leaves: dayLeaves }) => (
          <AccordionItem 
            key={dateStr} 
            value={dateStr}
            className="border rounded-lg overflow-hidden bg-card"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 touch-target">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="text-left">
                  <div className="font-semibold">
                    {format(new Date(dateStr), 'EEEE', { locale: it })}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(dateStr), 'd MMMM', { locale: it })}
                  </div>
                </div>
                <Badge variant="secondary">
                  {dayShifts.length} {dayShifts.length === 1 ? t('planner.mobile.shift') : t('planner.mobile.shifts')}
                </Badge>
              </div>
            </AccordionTrigger>
            
            <AccordionContent className="px-4 pb-4 pt-2">
              <div className="space-y-3">
                {/* Shifts */}
                {dayShifts.map((shift: ShiftWithAssignments) => {
                  const user = users.find(u => u.id === shift.assignments?.[0]?.user_id)
                  const startTime = format(new Date(shift.start_at), 'HH:mm')
                  const endTime = format(new Date(shift.end_at), 'HH:mm')
                  
                  return (
                    <Card 
                      key={shift.id}
                      className="p-4 space-y-3 touch-target hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleShiftClick(shift)}
                    >
                      {/* User Info */}
                      <div className="flex items-center gap-3">
                        {user ? (
                          <>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback>
                                {user.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{user.full_name}</div>
                              <div className="text-sm text-muted-foreground">Staff</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-muted-foreground">{t('planner.mobile.unassigned')}</div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Time & Job Tag */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono font-medium">
                            {startTime} - {endTime}
                          </span>
                        </div>
                        
                        {shift.job_tag && (
                          <Badge 
                            style={{ 
                              backgroundColor: shift.job_tag.color ? `${shift.job_tag.color}20` : undefined,
                              color: shift.job_tag.color || undefined,
                              borderColor: shift.job_tag.color ? `${shift.job_tag.color}40` : undefined
                            }}
                            className="border"
                          >
                            {shift.job_tag.key}
                          </Badge>
                        )}
                      </div>

                      {/* Status Indicators */}
                      {shift.actual_start_at && !shift.actual_end_at && (
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                          🟠 {t('planner.mobile.inProgress')}
                        </Badge>
                      )}
                      {shift.actual_start_at && shift.actual_end_at && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                          ✓ {t('planner.mobile.completed')}
                        </Badge>
                      )}
                    </Card>
                  )
                })}

                {/* Leaves */}
                {dayLeaves.map((leave: LeaveRequest) => {
                  const user = users.find(u => u.id === leave.user_id)
                  
                  return (
                    <Card 
                      key={leave.id}
                      className="p-4 space-y-2 bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        {user && (
                          <>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback>
                                {user.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{user.full_name}</div>
                              <Badge 
                                variant="outline"
                                style={{
                                  backgroundColor: `${leave.leave_types.color || '#666'}20`,
                                  color: leave.leave_types.color || '#666',
                                  borderColor: `${leave.leave_types.color || '#666'}40`
                                }}
                              >
                                {leave.leave_types.label}
                              </Badge>
                            </div>
                          </>
                        )}
                      </div>
                    </Card>
                  )
                })}

                {/* Add Button */}
                {dayShifts.length === 0 && dayLeaves.length === 0 && (
                  <Card 
                    className="p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors touch-target"
                    onClick={() => handleAddClick(dateStr)}
                  >
                    <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">{t('planner.mobile.noShifts')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('planner.mobile.tapToAdd')}</p>
                  </Card>
                )}
                
                {(dayShifts.length > 0 || dayLeaves.length > 0) && (
                  <Button
                    variant="outline"
                    className="w-full touch-target"
                    onClick={() => handleAddClick(dateStr)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('planner.mobile.addShift')}
                  </Button>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
