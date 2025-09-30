'use client'

import { useDroppable } from '@dnd-kit/core'
import { ShiftCard } from './ShiftCard'
import { formatDayHeader, isToday as checkIsToday } from '@/lib/shifts/week-utils'
import type { ShiftWithAssignments, Rota } from '@/types/shifts'
import { cn } from '@/lib/utils'

interface Props {
  date: string // ISO date
  shifts: Record<string, ShiftWithAssignments[]> // grouped by job_tag_id
  rota?: Rota
  allJobTags: string[] // All possible job tags to show consistent rows
}

export function DayColumn({ date, shifts, rota, allJobTags }: Props) {
  const dayName = formatDayHeader(date)
  const isToday = checkIsToday(date)
  
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
      
      {/* Righe per job tag */}
      <div className="divide-y">
        {allJobTags.map(tagId => (
          <DroppableRow 
            key={tagId}
            date={date}
            tagId={tagId}
            shifts={shifts[tagId] || []}
            isLocked={rota?.status === 'locked'}
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
}

function DroppableRow({ date, tagId, shifts, isLocked }: DroppableRowProps) {
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
        />
      ))}
    </div>
  )
}
