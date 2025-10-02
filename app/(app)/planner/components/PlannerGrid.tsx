'use client'

import { useState, useMemo, memo, useCallback, useRef, useEffect } from 'react'
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent } from '@dnd-kit/core'
import { ShiftCard } from './ShiftCard'
import { DayColumn } from './DayColumn'
import { getWeekBounds } from '@/lib/shifts/week-utils'
import type { Rota, ShiftWithAssignments, LeaveRequest } from '@/types/shifts'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

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
  rota?: Rota
  shifts: ShiftWithAssignments[]
  leaves: LeaveRequestWithType[]
  weekStart: string
  locationId: string
  onRefresh: () => void
  loading: boolean
}

interface PropsWithCallbacks extends Props {
  onShiftClick?: (shift: ShiftWithAssignments) => void
}

export const PlannerGrid = memo(function PlannerGrid({ 
  rota, 
  shifts,
  leaves,
  weekStart, 
  locationId,
  onRefresh,
  loading,
  onShiftClick
}: PropsWithCallbacks) {
  const { days } = getWeekBounds(weekStart)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [optimisticShifts, setOptimisticShifts] = useState<ShiftWithAssignments[]>(shifts)
  const dragEndTimeoutRef = useRef<NodeJS.Timeout>()
  
  // Fix 2: Sync optimisticShifts with shifts
  useEffect(() => {
    setOptimisticShifts(shifts)
  }, [shifts])
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  )
  
  // Fix 5: Guard clause to validate shift exists
  const handleDragStart = (event: DragStartEvent) => {
    const shiftId = event.active.id as string
    const shiftExists = shifts.some(s => s.id === shiftId)
    
    if (!shiftExists) {
      console.error('Shift not found:', shiftId)
      toast.error('Impossibile spostare questo turno')
      return
    }
    
    setActiveId(shiftId)
  }
  
  // Debounced drag end handler for smoother performance
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    
    if (!over || active.id === over.id) return
    if (rota?.status === 'locked') {
      toast.error('Impossibile modificare una rota bloccata')
      return
    }
    
    // over.id formato: 'day-2025-01-20-tag-uuid' oppure 'day-2025-01-20-tag-unassigned'
    const overId = over.id as string
    const parts = overId.split('-')
    
    if (parts.length < 5 || parts[0] !== 'day') {
      toast.error('Drop target non valido')
      return
    }
    
    const date = `${parts[1]}-${parts[2]}-${parts[3]}`
    const shiftId = active.id as string
    
    // Calcola nuovo start_at mantenendo ora originale
    const shift = shifts.find(s => s.id === shiftId)
    if (!shift) return
    
    const originalTime = shift.start_at.split('T')[1] // Keep time part
    const newStart = `${date}T${originalTime}`
    
    // Calculate new end_at maintaining same duration
    const duration = new Date(shift.end_at).getTime() - new Date(shift.start_at).getTime()
    const newEnd = new Date(new Date(newStart).getTime() + duration).toISOString()
    
    // Optimistic update
    const updatedShift = { ...shift, start_at: newStart, end_at: newEnd }
    setOptimisticShifts(prev => 
      prev.map(s => s.id === shiftId ? updatedShift : s)
    )
    
    // Clear any pending API calls
    if (dragEndTimeoutRef.current) {
      clearTimeout(dragEndTimeoutRef.current)
    }
    
    // Debounce API call for smoother UX
    dragEndTimeoutRef.current = setTimeout(async () => {
      try {
      const response = await fetch(`/api/v1/shifts/${shiftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          start_at: newStart,
          end_at: newEnd
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        toast.error(error.message || 'Errore durante lo spostamento')
        setOptimisticShifts(shifts) // Revert on error
        return
      }
      
        toast.success('Turno spostato')
        onRefresh()
      } catch (error) {
        console.error('Error moving shift:', error)
        toast.error('Errore durante lo spostamento')
        setOptimisticShifts(shifts) // Revert on error
      }
    }, 300) // 300ms debounce
  }, [shifts, rota, onRefresh])
  
  // Fix 4: Improved useMemo with fallback
  const displayShifts = useMemo(() => {
    // Use optimisticShifts only if it contains the active shift
    if (activeId) {
      const hasActiveShift = optimisticShifts.some(s => s.id === activeId)
      return hasActiveShift ? optimisticShifts : shifts
    }
    return shifts
  }, [activeId, optimisticShifts, shifts])
  
  // Raggruppa shift per giorno e job_tag
  const shiftsByDayAndTag = useMemo(() => {
    const grouped: Record<string, Record<string, ShiftWithAssignments[]>> = {}
    
    days.forEach(day => {
      grouped[day] = {}
    })
    
    displayShifts.forEach(shift => {
      const day = shift.start_at.split('T')[0]
      const tagId = shift.job_tag_id || 'unassigned'
      
      if (!grouped[day]) grouped[day] = {}
      if (!grouped[day][tagId]) grouped[day][tagId] = []
      grouped[day][tagId].push(shift)
    })
    
    return grouped
  }, [displayShifts, days])

  // Get all unique job tags
  const allJobTags = useMemo(() => {
    const tags = new Set<string>()
    displayShifts.forEach(shift => {
      if (shift.job_tag_id) {
        tags.add(shift.job_tag_id)
      }
    })
    return ['unassigned', ...Array.from(tags)]
  }, [displayShifts])
  
  if (loading) {
    return (
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <DndContext 
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 gap-px bg-border min-h-full">
          {days.map(day => (
            <DayColumn 
              key={day}
              date={day}
              shifts={shiftsByDayAndTag[day] || {}}
              leaves={leaves}
              rota={rota}
              allJobTags={allJobTags}
              onShiftClick={onShiftClick}
            />
          ))}
        </div>
      </div>
      
      {/* Fix 1: Null-safe DragOverlay */}
      <DragOverlay>
        {activeId && (() => {
          const draggedShift = displayShifts.find(s => s.id === activeId)
          return draggedShift ? (
            <ShiftCard 
              shift={draggedShift}
              isDragging
            />
          ) : null
        })()}
      </DragOverlay>
    </DndContext>
  )
})
