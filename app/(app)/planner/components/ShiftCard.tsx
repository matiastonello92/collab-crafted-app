'use client'

import { memo, useState, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format, parseISO, differenceInHours } from 'date-fns'
import { Clock, AlertTriangle, User, MoreHorizontal } from 'lucide-react'
import type { ShiftWithAssignments } from '@/types/shifts'
import type { ViolationWithUser } from '@/types/compliance'
import { cn } from '@/lib/utils'
import { ViolationBadge } from '@/components/compliance/ViolationBadge'

interface ShiftConflict {
  shiftId: string
  type: 'shift_overlap' | 'leave_overlap' | 'availability_mismatch'
  severity: 'error' | 'warning'
  message: string
}

interface Props {
  shift: ShiftWithAssignments
  isDragging?: boolean
  isLocked?: boolean
  onClick?: (shift: ShiftWithAssignments) => void
  conflicts?: ShiftConflict[]
  showConflicts?: boolean
}

export const ShiftCard = memo(function ShiftCard({ 
  shift, 
  isDragging, 
  isLocked, 
  onClick,
  conflicts = [],
  showConflicts = false
}: Props) {
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
  const hasError = conflicts && conflicts.some(c => c.severity === 'error')
  const hasWarning = conflicts && conflicts.some(c => c.severity === 'warning')
  const isUnassigned = !assignment
  
  // Get job tag color class (ComboHR style)
  const getJobTagColorClass = (jobTagName?: string) => {
    if (!jobTagName) return 'bg-card border-l-muted'
    
    const colorMap: Record<string, string> = {
      'pizzaiolo': 'bg-[var(--color-job-pizzaiolo)] border-l-[var(--color-job-pizzaiolo-border)]',
      'plongeur': 'bg-[var(--color-job-plongeur)] border-l-[var(--color-job-plongeur-border)]',
      'commis': 'bg-[var(--color-job-commis)] border-l-[var(--color-job-commis-border)]',
      'serveur': 'bg-[var(--color-job-serveur)] border-l-[var(--color-job-serveur-border)]',
      'barista': 'bg-[var(--color-job-barista)] border-l-[var(--color-job-barista-border)]',
    }
    
    return colorMap[jobTagName.toLowerCase()] || 'bg-accent/20 border-l-accent'
  }
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onClick?.(shift)}
      role="button"
      tabIndex={isLocked ? -1 : 0}
      aria-label={`Turno dalle ${startTime} alle ${endTime}${assignment ? ` assegnato a ${assignment.user?.full_name}` : ' non assegnato'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.(shift)
        }
      }}
      className={cn(
        'group border rounded-lg p-3 shadow-sm transition-all duration-200 relative animate-smooth',
        'min-h-[88px] touch-manipulation border-l-4',
        getJobTagColorClass(shift.job_tag?.label),
        !isLocked && 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] hover:border-primary/50 focus-enhanced',
        isDragging && 'opacity-50 rotate-2 scale-105',
        hasViolation && 'border-yellow-500',
        showConflicts && hasError && 'border-red-500 border-2',
        showConflicts && hasWarning && !hasError && 'border-yellow-500',
        isUnassigned && 'border-dashed border-muted-foreground/30',
        assignmentStatus === 'accepted' && 'border-green-500/30',
        assignmentStatus === 'declined' && 'border-red-500/30',
        isLocked && 'cursor-not-allowed opacity-60'
      )}
    >
      {/* Break time badge - ComboHR style: prominent and dark */}
      {shift.break_minutes > 0 && (
        <Badge 
          className="absolute top-2 right-2 bg-muted-foreground/90 text-white font-bold border-none px-2 py-0.5"
          aria-label={`Pausa ${shift.break_minutes} minuti`}
        >
          -{shift.break_minutes}mn
        </Badge>
      )}
      
      {/* Conflict indicator badge */}
      {showConflicts && (hasError || hasWarning) && (
        <div className="absolute -top-2 -left-2 z-10">
          <Badge 
            variant={hasError ? "destructive" : "outline"}
            className="h-6 w-6 p-0 flex items-center justify-center rounded-full"
            aria-label={hasError ? 'Errore conflitto' : 'Avviso conflitto'}
          >
            <AlertTriangle className="h-3 w-3" />
          </Badge>
        </div>
      )}
      
      {/* Header: orario + durata */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span>{startTime} - {endTime}</span>
          <span className="text-muted-foreground font-normal">({duration}h)</span>
        </div>
        <div className="flex items-center gap-2">
          {violation && <ViolationBadge violation={violation} compact />}
        </div>
      </div>
      
      {/* Job tag badge - smaller below time */}
      {shift.job_tag && (
        <div className="mb-2">
          <Badge variant="outline" className="text-xs font-medium">
            {shift.job_tag.label}
          </Badge>
        </div>
      )}
      
      {/* Assegnazione utente */}
      {assignment ? (
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm">Non assegnato</span>
        </div>
      )}

      {/* Notes preview */}
      {shift.notes && (
        <div className="text-xs text-muted-foreground mt-2 truncate">
          📝 {shift.notes}
        </div>
      )}
      
      {/* Action icon - ComboHR style, visible on hover */}
      <button
        className="absolute bottom-2 right-2 h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted/50"
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(shift)
        }}
        aria-label="Azioni turno"
      >
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </button>
      
      {/* Conflict messages */}
      {showConflicts && conflicts && conflicts.length > 0 && (
        <div className="mt-2 pt-2 border-t space-y-1">
          {conflicts.map((conflict, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              <AlertTriangle className={cn(
                "h-3 w-3 mt-0.5 shrink-0",
                conflict.severity === 'error' ? 'text-red-500' : 'text-yellow-500'
              )} aria-hidden="true" />
              <span className={cn(
                conflict.severity === 'error' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
              )}>
                {conflict.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}, (prev, next) => {
  // Aggressive memoization
  return prev.shift.id === next.shift.id && 
         prev.shift.updated_at === next.shift.updated_at &&
         prev.isDragging === next.isDragging &&
         prev.isLocked === next.isLocked &&
         prev.showConflicts === next.showConflicts &&
         JSON.stringify(prev.conflicts) === JSON.stringify(next.conflicts)
})
