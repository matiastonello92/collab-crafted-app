'use client'

import { useMemo, useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { Clock, User, Plus, Calendar } from 'lucide-react'
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
      return
    }
    
    // Verifica che sia effettivamente cambiata la posizione
    const shift = shifts.find(s => s.id === active.id)
    if (!shift) {
      setActiveShift(null)
      return
    }
    
    // Parsare ID per estrarre userId, date, action
    const overId = over.id as string
    const parts = overId.split('_')
    
    // Formato: userId_yyyy-MM-dd_action (es: "123_2025-10-15_duplicate")
    const action = parts[parts.length - 1] as 'duplicate' | 'move'
    const dateStr = parts[parts.length - 2]
    const userId = parts.slice(0, -2).join('_')
    
    const currentUserId = shift.assignments?.[0]?.user_id || 'unassigned'
    const currentDate = format(new Date(shift.start_at), 'yyyy-MM-dd')
    
    // Se la posizione non è cambiata, non fare nulla
    if (userId === currentUserId && dateStr === currentDate) {
      setActiveShift(null)
      return
    }
    
    console.log('🔄 [Drag] Action:', { userId, date: dateStr, action })

    const isDuplicate = action === 'duplicate'

    // Aggiorna UI immediatamente (optimistic)
    setActiveShift(null)

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
      
      // Refetch in background con debounce
      if (onSave) {
        setTimeout(() => onSave(), 500)
      }
    } catch (error) {
      console.error('Error handling drag:', error)
      toast.error('Errore nello spostamento del turno')
      
      // Revert su errore
      if (onSave) {
        setTimeout(() => onSave(), 100)
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
          <Card className="p-3 opacity-90 cursor-grabbing border-2 border-primary shadow-lg">
            <div className="text-xs font-medium">
              {format(new Date(activeShift.start_at), 'HH:mm')} - {format(new Date(activeShift.end_at), 'HH:mm')}
            </div>
            {activeShift.job_tag && (
              <Badge variant="outline" className="mt-1 text-xs">
                {activeShift.job_tag.label}
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
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null)
  const [hasMoved, setHasMoved] = useState(false)
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift.id,
    data: { shift }
  })
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined

  const handlePointerDown = (e: React.PointerEvent) => {
    // Salva posizione iniziale
    setMouseDownPos({ x: e.clientX, y: e.clientY })
    setHasMoved(false)
    
    // Chiama listener dnd-kit
    const dndListener = listeners?.onPointerDown
    if (dndListener) {
      dndListener(e as any)
    }
  }
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (mouseDownPos) {
      const deltaX = Math.abs(e.clientX - mouseDownPos.x)
      const deltaY = Math.abs(e.clientY - mouseDownPos.y)
      
      // Se si muove più di 5px, è un drag
      if (deltaX > 5 || deltaY > 5) {
        setHasMoved(true)
      }
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    // Click = rilascio senza movimento significativo
    if (mouseDownPos && !hasMoved && !isDragging) {
      e.stopPropagation()
      onClick?.()
    }
    
    // Reset
    setMouseDownPos(null)
    setHasMoved(false)
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="p-2 hover:bg-accent/50 transition-colors cursor-grab active:cursor-grabbing"
    >
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
    </Card>
  )
}

function DroppableCell({ 
  userId, 
  date, 
  children
}: { 
  userId: string
  date: string
  children: React.ReactNode
}) {
  const leftZone = useDroppable({
    id: `${userId}_${date}_duplicate`,
    data: { userId, date, action: 'duplicate' }
  })
  
  const rightZone = useDroppable({
    id: `${userId}_${date}_move`,
    data: { userId, date, action: 'move' }
  })
  
  const isHovering = leftZone.isOver || rightZone.isOver

  return (
    <div className="relative min-h-[80px] rounded border border-border overflow-hidden">
      {/* Zona sinistra - DUPLICA */}
      <div 
        ref={leftZone.setNodeRef}
        className={`absolute left-0 top-0 bottom-0 w-1/2 transition-all duration-200 ${
          leftZone.isOver 
            ? 'bg-blue-500/30 backdrop-blur-[2px]' 
            : ''
        }`}
      >
        {leftZone.isOver && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-3xl">📋</span>
          </div>
        )}
      </div>
      
      {/* Zona destra - SPOSTA */}
      <div 
        ref={rightZone.setNodeRef}
        className={`absolute right-0 top-0 bottom-0 w-1/2 transition-all duration-200 ${
          rightZone.isOver 
            ? 'bg-green-500/30 backdrop-blur-[2px]' 
            : ''
        }`}
      >
        {rightZone.isOver && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-3xl">➡️</span>
          </div>
        )}
      </div>
      
      {/* Contenuto reale della cella */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
