'use client'

import { memo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format, parseISO, differenceInHours } from 'date-fns'
import { Clock, AlertTriangle, User } from 'lucide-react'
import type { ShiftWithAssignments } from '@/types/shifts'
import { cn } from '@/lib/utils'

interface Props {
  shift: ShiftWithAssignments
  isDragging?: boolean
  isLocked?: boolean
}

export const ShiftCard = memo(function ShiftCard({ shift, isDragging, isLocked }: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: shift.id,
    disabled: isLocked || shift.rota?.status === 'locked'
  })
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined
  
  const startTime = format(parseISO(shift.start_at), 'HH:mm')
  const endTime = format(parseISO(shift.end_at), 'HH:mm')
  const assignment = shift.assignments?.[0]
  
  // Check for potential rest violation (< 11h between shifts - simplified)
  const hasWarning = false // TODO: implement proper rest violation check
  
  // Calculate shift duration
  const duration = differenceInHours(parseISO(shift.end_at), parseISO(shift.start_at))
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'bg-card border rounded-lg p-3 shadow-sm transition-all',
        !isLocked && 'cursor-move hover:shadow-md',
        isDragging && 'opacity-50 rotate-2',
        hasWarning && 'border-yellow-500 bg-yellow-50/50',
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
        {shift.job_tag && (
          <Badge variant="outline" className="text-xs">
            {shift.job_tag.label}
          </Badge>
        )}
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
      
      {/* Warning icon */}
      {hasWarning && (
        <div className="flex items-center gap-1 mt-2 text-yellow-600 text-xs">
          <AlertTriangle className="h-3 w-3" />
          <span>Riposo &lt; 11h</span>
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
