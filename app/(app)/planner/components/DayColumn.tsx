'use client'

import { useDroppable } from '@dnd-kit/core'
import { ShiftCard } from './ShiftCard'
import { formatDayHeader, isToday as checkIsToday } from '@/lib/shifts/week-utils'
import type { ShiftWithAssignments, Rota, LeaveRequest } from '@/types/shifts'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'

interface LeaveRequestWithType extends LeaveRequest {
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
  date: string // ISO date
  shifts: Record<string, ShiftWithAssignments[]> // grouped by job_tag_id
  leaves: LeaveRequestWithType[] // approved leaves for this day
  rota?: Rota
  allJobTags: string[] // All possible job tags to show consistent rows
  onShiftClick?: (shift: ShiftWithAssignments) => void
}

export function DayColumn({ date, shifts, leaves, rota, allJobTags, onShiftClick }: Props) {
  const dayName = formatDayHeader(date)
  const isToday = checkIsToday(date)
  
  // Filter leaves for this specific date
  const dayLeaves = leaves.filter(leave => {
    const leaveStart = new Date(leave.start_at).toISOString().split('T')[0]
    const leaveEnd = new Date(leave.end_at).toISOString().split('T')[0]
    return date >= leaveStart && date <= leaveEnd
  })
  
  return (
    <div className={cn(
      'bg-card border-r last:border-r-0',
      isToday && 'ring-2 ring-primary ring-inset'
    )}>
      {/* Header giorno */}
      <div className={cn(
        'p-3 border-b font-semibold text-sm sticky top-0 bg-card z-10',
        isToday && 'bg-primary/5'
      )}>
        <div className="capitalize">{dayName}</div>
      </div>

      {/* Leave badges (se presenti) */}
      {dayLeaves.length > 0 && (
        <div className="p-2 space-y-1 bg-muted/30 border-b">
          {dayLeaves.map(leave => (
            <Badge
              key={leave.id}
              variant="outline"
              className="text-xs"
              style={{ 
                backgroundColor: `${leave.leave_types.color}20`,
                borderColor: leave.leave_types.color || '#6b7280'
              }}
            >
              <Calendar className="h-3 w-3 mr-1" />
              {leave.profiles.full_name?.split(' ')[0] || 'User'}: {leave.leave_types.label}
            </Badge>
          ))}
        </div>
      )}
      
      {/* Righe per job tag */}
      <div className="divide-y">
        {allJobTags.map(tagId => (
          <DroppableRow 
            key={tagId}
            date={date}
            tagId={tagId}
            shifts={shifts[tagId] || []}
            isLocked={rota?.status === 'locked'}
            onShiftClick={onShiftClick}
          />
        ))}
      </div>
    </div>
  )
}

interface DroppableRowProps {
  date: string
  tagId: string
  shifts: ShiftWithAssignments[]
  isLocked: boolean
  onShiftClick?: (shift: ShiftWithAssignments) => void
}

function DroppableRow({ date, tagId, shifts, isLocked, onShiftClick }: DroppableRowProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${date}-tag-${tagId}`,
    disabled: isLocked
  })
  
  return (
    <div 
      ref={setNodeRef}
      className={cn(
        'min-h-[100px] p-2 space-y-2 transition-colors',
        isOver && 'bg-primary/10',
        isLocked && 'opacity-60'
      )}
    >
      {shifts.length === 0 && (
        <div className="text-xs text-muted-foreground/50 text-center py-8">
          Nessun turno
        </div>
      )}
      {shifts.map((shift: ShiftWithAssignments) => (
        <ShiftCard 
          key={shift.id} 
          shift={shift}
          isLocked={isLocked}
          onClick={onShiftClick}
        />
      ))}
    </div>
  )
}
