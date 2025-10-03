'use client'

import { useMemo, useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { Clock, User, Plus, Calendar, GripVertical } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useEmployeeStats } from '../hooks/useEmployeeStats'
import type { ShiftWithAssignments, UserProfile } from '@/types/shifts'
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { toast } from 'sonner'

interface Props {
  shifts: ShiftWithAssignments[]
  users: UserProfile[]
  weekStart: string
  onShiftClick?: (shift: ShiftWithAssignments) => void
  onCellClick?: (userId: string, date: string) => void
  showUsersWithoutShifts?: boolean
  onSave?: () => void
}

export function EmployeeGridView({ 
  shifts, 
  users, 
  weekStart, 
  onShiftClick, 
  onCellClick,
  showUsersWithoutShifts = true,
  onSave
}: Props) {
  const [activeShift, setActiveShift] = useState<ShiftWithAssignments | null>(null)
  const [dropIndicator, setDropIndicator] = useState<'move' | 'duplicate' | null>(null)
  
  const weekDays = getWeekBounds(weekStart)
  const employeeStats = useEmployeeStats({ shifts, weekStart })

  const handleDragStart = (event: DragStartEvent) => {
    const shift = shifts.find(s => s.id === event.active.id)
    setActiveShift(shift || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    // Verifica che ci sia un drop target valido
    if (!over || !active) {
      setActiveShift(null)
      setDropIndicator(null)
      return
    }
    
    // Verifica che sia effettivamente cambiata la posizione
    const shift = shifts.find(s => s.id === active.id)
    if (!shift) {
      setActiveShift(null)
      setDropIndicator(null)
      return
    }
    
    const [userId, dateStr] = (over.id as string).split('_')
    const currentUserId = shift.assignments?.[0]?.user_id || 'unassigned'
    const currentDate = format(new Date(shift.start_at), 'yyyy-MM-dd')
    
    // Se la posizione non è cambiata, non fare nulla
    if (userId === currentUserId && dateStr === currentDate) {
      setActiveShift(null)
      setDropIndicator(null)
      return
    }
    
    console.log('🔄 [Drag] Moving shift:', {
      from: { userId: currentUserId, date: currentDate },
      to: { userId, date: dateStr },
      indicator: dropIndicator
    })

    const isDuplicate = dropIndicator === 'duplicate'

    // Aggiorna UI immediatamente (optimistic)
    setActiveShift(null)
    setDropIndicator(null)
    
    // Chiama onSave PRIMA delle API calls per update immediato
    if (onSave) {
      onSave()
    }

    try {
      if (isDuplicate) {
        const newStartAt = new Date(`${dateStr}T${format(new Date(shift.start_at), 'HH:mm')}:00`).toISOString()
        const newEndAt = new Date(`${dateStr}T${format(new Date(shift.end_at), 'HH:mm')}:00`).toISOString()
        
        const response = await fetch('/api/v1/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rota_id: shift.rota_id,
            start_at: newStartAt,
            end_at: newEndAt,
            break_minutes: shift.break_minutes,
            job_tag_id: shift.job_tag_id || undefined,
            notes: shift.notes || undefined
          })
        })
        
        if (!response.ok) throw new Error('Failed to duplicate shift')
        
        const { shift: newShift } = await response.json()
        
        if (userId !== 'unassigned') {
          await fetch(`/api/v1/shifts/${newShift.id}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, status: 'assigned' })
          })
        }
        
        toast.success('Turno duplicato con successo')
      } else {
        const newStartAt = new Date(`${dateStr}T${format(new Date(shift.start_at), 'HH:mm')}:00`).toISOString()
        const newEndAt = new Date(`${dateStr}T${format(new Date(shift.end_at), 'HH:mm')}:00`).toISOString()
        
        const response = await fetch(`/api/v1/shifts/${shift.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_at: newStartAt,
            end_at: newEndAt
          })
        })
        
        if (!response.ok) throw new Error('Failed to move shift')
        
        if (userId !== 'unassigned' && userId !== currentUserId) {
          await fetch(`/api/v1/shifts/${shift.id}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, status: 'assigned' })
          })
        }
        
        toast.success('Turno spostato con successo')
      }
      
      // Secondo refetch per sincronizzare con server
      if (onSave) {
        onSave()
      }
    } catch (error) {
      console.error('Error handling drag:', error)
      toast.error('Errore nello spostamento del turno')
      
      // Revert su errore
      if (onSave) {
        onSave()
      }
    }
  }

  const shiftsByUser = useMemo(() => {
    const grouped: Record<string, ShiftWithAssignments[]> = {
      unassigned: []
    }
    
    users.forEach(user => {
      grouped[user.id] = []
    })
    
    shifts.forEach(shift => {
      const userId = shift.assignments?.[0]?.user_id || 'unassigned'
      if (!grouped[userId]) grouped[userId] = []
      grouped[userId].push(shift)
    })
    
    return grouped
  }, [shifts, users])

  const unassignedShifts = shiftsByUser.unassigned || []

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-2 sticky top-0 bg-background z-10 pb-2">
          <div className="font-semibold text-sm">Dipendente</div>
          {weekDays.map(day => (
            <div key={day.dateStr} className="text-center">
              <div className="font-semibold text-sm">
                {format(new Date(day.dateStr), 'EEE', { locale: it })}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(day.dateStr), 'd MMM')}
              </div>
            </div>
          ))}
        </div>

        {/* Unassigned shifts section */}
        {unassignedShifts.length > 0 && (
          <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-2 mb-4 pb-4 border-b">
            <div className="flex items-center gap-2 bg-muted/30 p-3 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-sm">Turni Non Assegnati</div>
                <div className="text-xs text-muted-foreground">
                  {unassignedShifts.length} {unassignedShifts.length === 1 ? 'turno' : 'turni'}
                </div>
              </div>
            </div>

            {weekDays.map(day => {
              const dayShifts = unassignedShifts.filter(s => 
                format(new Date(s.start_at), 'yyyy-MM-dd') === day.dateStr
              )
              
              return (
                <DroppableCell
                  key={`unassigned-${day.dateStr}`}
                  userId="unassigned"
                  date={day.dateStr}
                  onIndicatorChange={setDropIndicator}
                >
                  <div 
                    className="p-2 space-y-2 cursor-pointer min-h-[80px]"
                    onClick={() => onCellClick?.('unassigned', day.dateStr)}
                  >
                    {dayShifts.map(shift => (
                      <DraggableShiftCard
                        key={shift.id}
                        shift={shift}
                        onClick={() => onShiftClick?.(shift)}
                      />
                    ))}
                  </div>
                </DroppableCell>
              )
            })}
          </div>
        )}

        {Object.entries(shiftsByUser).map(([userId, userShifts]) => {
          if (userId === 'unassigned') return null
          if (!showUsersWithoutShifts && userShifts.length === 0) return null
          
          const user = users.find(u => u.id === userId)
          const stats = employeeStats[userId]
          
          return (
            <div key={userId} className="grid grid-cols-[200px_repeat(7,1fr)] gap-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.avatar_url || undefined} />
                  <AvatarFallback>
                    {user?.full_name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {user?.full_name || user?.email}
                  </div>
                  {stats && (
                    <div className="text-xs text-muted-foreground">
                      {formatHoursMinutes(stats.plannedHours)}
                    </div>
                  )}
                </div>
              </div>

              {weekDays.map(day => {
                const dayShifts = userShifts.filter(s => 
                  format(new Date(s.start_at), 'yyyy-MM-dd') === day.dateStr
                )
                
                return (
                  <DroppableCell
                    key={day.dateStr}
                    userId={userId}
                    date={day.dateStr}
                    onIndicatorChange={setDropIndicator}
                  >
                    <div 
                      className="p-2 space-y-2 cursor-pointer min-h-[80px]"
                      onClick={() => onCellClick?.(userId, day.dateStr)}
                    >
                      {dayShifts.map(shift => (
                        <DraggableShiftCard
                          key={shift.id}
                          shift={shift}
                          onClick={() => onShiftClick?.(shift)}
                        />
                      ))}
                      
                      {dayShifts.length === 0 && (
                        <div className="flex items-center justify-center h-16 text-muted-foreground opacity-0 hover:opacity-100 transition-opacity">
                          <Plus className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </DroppableCell>
                )
              })}
            </div>
          )
        })}
      </div>
      
      <DragOverlay>
        {activeShift && (
          <Card className="p-2 opacity-80 cursor-grabbing border-2 border-primary">
            <div className="text-xs font-medium">
              {format(new Date(activeShift.start_at), 'HH:mm')} - {format(new Date(activeShift.end_at), 'HH:mm')}
            </div>
            {dropIndicator && (
              <Badge variant={dropIndicator === 'duplicate' ? 'default' : 'secondary'} className="mt-1 text-xs">
                {dropIndicator === 'duplicate' ? '📋 Duplica (Alt)' : '➡️ Sposta'}
              </Badge>
            )}
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function getWeekBounds(weekStart: string) {
  const start = new Date(weekStart)
  const weekDays = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    weekDays.push({
      dateStr: format(date, 'yyyy-MM-dd'),
      date
    })
  }
  return weekDays
}

function formatHoursMinutes(decimalHours: number): string {
  const hours = Math.floor(decimalHours)
  const minutes = Math.round((decimalHours % 1) * 60)
  return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
}

function DraggableShiftCard({ shift, onClick }: { shift: ShiftWithAssignments; onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift.id,
    data: { shift }
  })
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-2 hover:bg-accent/50 transition-colors cursor-pointer group"
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation()
          onClick?.()
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div 
          {...listeners} 
          {...attributes}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-xs font-medium">
            <Clock className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {format(new Date(shift.start_at), 'HH:mm')} - {format(new Date(shift.end_at), 'HH:mm')}
            </span>
          </div>
          {shift.job_tag && (
            <Badge variant="outline" className="mt-1 text-xs">
              {shift.job_tag.label}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  )
}

function DroppableCell({ 
  userId, 
  date, 
  children, 
  onIndicatorChange 
}: { 
  userId: string
  date: string
  children: React.ReactNode
  onIndicatorChange?: (indicator: 'move' | 'duplicate' | null) => void
}) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `${userId}_${date}`,
    data: { userId, date }
  })

  // Rileva tasto Alt durante hover
  useEffect(() => {
    if (!isOver || !active) {
      onIndicatorChange?.(null)
      return
    }

    const handleKeyChange = (e: KeyboardEvent) => {
      onIndicatorChange?.(e.altKey ? 'duplicate' : 'move')
    }

    // Listener per Alt key
    window.addEventListener('keydown', handleKeyChange)
    window.addEventListener('keyup', handleKeyChange)
    
    // Inizializza con stato corrente
    onIndicatorChange?.('move')

    return () => {
      window.removeEventListener('keydown', handleKeyChange)
      window.removeEventListener('keyup', handleKeyChange)
      onIndicatorChange?.(null)
    }
  }, [isOver, active, onIndicatorChange])

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] rounded border transition-colors ${
        isOver ? 'border-primary bg-primary/10' : 'border-border'
      }`}
    >
      {children}
    </div>
  )
}
