'use client'

import { memo, useState, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format, parseISO, differenceInHours } from 'date-fns'
import { Clock, AlertTriangle, User } from 'lucide-react'
import type { ShiftWithAssignments } from '@/types/shifts'
import type { ViolationWithUser } from '@/types/compliance'
import { cn } from '@/lib/utils'
import { ViolationBadge } from '@/components/compliance/ViolationBadge'

interface Props {
  shift: ShiftWithAssignments
  isDragging?: boolean
  isLocked?: boolean
  onClick?: (shift: ShiftWithAssignments) => void
}

export const ShiftCard = memo(function ShiftCard({ shift, isDragging, isLocked, onClick }: Props) {
  // Fix 6: Defensive programming - return early if shift is invalid
  if (!shift || !shift.id) {
    console.error('Invalid shift:', shift)
    return null
  }
  
  const [violation, setViolation] = useState<ViolationWithUser | null>(null)
  
  // Fix 3: Safe access - disable drag if shift has no valid ID
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: shift.id,
    disabled: isLocked || shift.rota?.status === 'locked' || !shift.id
  })
  
  useEffect(() => {
    // Fetch violations for this shift's date and user if assigned
    if (shift.assignments?.[0]?.user_id) {
      const shiftDate = new Date(shift.start_at).toISOString().split('T')[0]
      fetch(`/api/v1/compliance/violations?user_id=${shift.assignments[0].user_id}&is_silenced=false`)
        .then(res => res.json())
        .then(data => {
          const relevantViolation = data.violations?.find((v: ViolationWithUser) => 
            v.violation_date === shiftDate || 
            v.details.shift_ids?.includes(shift.id)
          )
          if (relevantViolation) setViolation(relevantViolation)
        })
        .catch(err => console.error('Error fetching violations:', err))
    }
  }, [shift.id, shift.assignments])
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined
  
  const startTime = format(parseISO(shift.start_at), 'HH:mm')
  const endTime = format(parseISO(shift.end_at), 'HH:mm')
  const assignment = shift.assignments?.[0]
  
  // Calculate shift duration
  const duration = differenceInHours(parseISO(shift.end_at), parseISO(shift.start_at))
  
  const assignmentStatus = assignment?.status
  const hasViolation = !!violation
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onClick?.(shift)}
      className={cn(
        'bg-card border rounded-lg p-3 shadow-sm transition-all duration-200',
        !isLocked && 'cursor-pointer hover:shadow-md hover:scale-[1.02] hover:border-primary/50',
        isDragging && 'opacity-50 rotate-2 scale-105',
        hasViolation && 'border-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10',
        assignmentStatus === 'accepted' && 'border-green-500/30',
        assignmentStatus === 'declined' && 'border-red-500/30',
        isLocked && 'cursor-not-allowed opacity-60'
      )}
    >
      {/* Header: orario + durata */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{startTime} - {endTime}</span>
          <span className="text-muted-foreground">({duration}h)</span>
        </div>
        <div className="flex items-center gap-2">
          {violation && <ViolationBadge violation={violation} compact />}
          {shift.job_tag && (
            <Badge variant="outline" className="text-xs">
              {shift.job_tag.label}
            </Badge>
          )}
        </div>
      </div>
      
      {/* Assegnazione utente */}
      {assignment ? (
        <div className="flex items-center gap-2 mb-1">
          <Avatar className="h-6 w-6">
            <AvatarImage src={assignment.user?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {assignment.user?.full_name?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate flex-1">
            {assignment.user?.full_name || 'Utente sconosciuto'}
          </span>
          <Badge 
            variant={assignment.status === 'accepted' ? 'default' : 'secondary'} 
            className="text-xs"
          >
            {assignment.status === 'accepted' ? 'OK' : assignment.status}
          </Badge>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <User className="h-4 w-4" />
          <span className="text-sm">Non assegnato</span>
        </div>
      )}

      {/* Break minutes if present */}
      {shift.break_minutes > 0 && (
        <div className="text-xs text-muted-foreground mt-1">
          Pausa: {shift.break_minutes} min
        </div>
      )}

      {/* Notes preview */}
      {shift.notes && (
        <div className="text-xs text-muted-foreground mt-2 truncate">
          📝 {shift.notes}
        </div>
      )}
    </div>
  )
}, (prev, next) => {
  return prev.shift.id === next.shift.id && 
         prev.shift.updated_at === next.shift.updated_at &&
         prev.isDragging === next.isDragging &&
         prev.isLocked === next.isLocked
})
