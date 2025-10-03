'use client'

import { useMemo, useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { User, Plus, Calendar, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useEmployeeStats } from '../hooks/useEmployeeStats'
import type { ShiftWithAssignments, UserProfile } from '@/types/shifts'
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, DragStartEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
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
  // ✅ Local state for optimistic updates
  const [localShifts, setLocalShifts] = useState<ShiftWithAssignments[]>(shifts)
  
  // ✅ Sync localShifts when shifts prop changes (after server refetch)
  useEffect(() => {
    setLocalShifts(shifts)
  }, [shifts])
  
  const weekDays = getWeekBounds(weekStart)
  const employeeStats = useEmployeeStats({ shifts, weekStart })

  // Delete zone droppable
  const deleteZone = useDroppable({
    id: 'delete-zone',
    data: { action: 'delete' }
  })

  const handleDragStart = (event: DragStartEvent) => {
    const shift = localShifts.find(s => s.id === event.active.id)
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
    const shift = localShifts.find(s => s.id === active.id)
    if (!shift) {
      setActiveShift(null)
      return
    }
    
    // Parsare ID per estrarre userId, date, action
    const overId = over.id as string

    // Check se è stato trascinato sulla zona di eliminazione
    if (overId === 'delete-zone') {
      // Optimistic update: rimuovi lo shift
      setLocalShifts(prev => prev.filter(s => s.id !== shift.id))
      setActiveShift(null)
      
      // API call DELETE in background
      try {
        const response = await fetch(`/api/v1/shifts/${shift.id}`, { method: 'DELETE' })
        
        if (!response.ok) throw new Error('Failed to delete shift')
        
        toast.success('Turno eliminato')
        
        // Refetch per sincronizzare con server
        if (onSave) {
          onSave()
        }
      } catch (error) {
        console.error('Error deleting shift:', error)
        toast.error('Errore nell\'eliminazione del turno')
        
        // Revert: ripristina shifts originali su errore
        setLocalShifts(shifts)
        
        if (onSave) {
          onSave()
        }
      }
      
      return
    }
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

    // ✅ 1️⃣ OPTIMISTIC UPDATE - Aggiorna UI IMMEDIATAMENTE
    setActiveShift(null)

    if (isDuplicate) {
      // Crea nuovo turno ottimisticamente con ID temporaneo
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`
      const newStartAt = new Date(`${dateStr}T${format(new Date(shift.start_at), 'HH:mm')}:00`).toISOString()
      const newEndAt = new Date(`${dateStr}T${format(new Date(shift.end_at), 'HH:mm')}:00`).toISOString()
      
      const optimisticShift: ShiftWithAssignments = {
        ...shift,
        id: tempId,
        start_at: newStartAt,
        end_at: newEndAt,
        job_tag: shift.job_tag, // ✅ Preserve job_tag
        assignments: userId !== 'unassigned' ? [{
          id: `temp-assign-${Date.now()}`,
          shift_id: tempId,
          user_id: userId,
          status: 'assigned' as const,
          created_at: new Date().toISOString()
        }] : []
      }
      
      setLocalShifts(prev => [...prev, optimisticShift])
    } else {
      // Sposta turno ottimisticamente
      const newStartAt = new Date(`${dateStr}T${format(new Date(shift.start_at), 'HH:mm')}:00`).toISOString()
      const newEndAt = new Date(`${dateStr}T${format(new Date(shift.end_at), 'HH:mm')}:00`).toISOString()
      
      setLocalShifts(prev => prev.map(s => {
        if (s.id === shift.id) {
          return {
            ...s,
            start_at: newStartAt,
            end_at: newEndAt,
            job_tag: s.job_tag, // ✅ Preserve job_tag
            assignments: userId !== 'unassigned' ? [{
              id: shift.assignments?.[0]?.id || `temp-assign-${Date.now()}`,
              shift_id: shift.id,
              user_id: userId,
              status: 'assigned' as const,
              created_at: shift.assignments?.[0]?.created_at || new Date().toISOString()
            }] : []
          }
        }
        return s
      }))
    }

    // ✅ 2️⃣ API CALLS in background
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
      
      // ✅ 3️⃣ Refetch per sincronizzare con server (in background)
      if (onSave) {
        onSave()
      }
    } catch (error) {
      console.error('Error handling drag:', error)
      toast.error('Errore nello spostamento del turno')
      
      // ✅ 4️⃣ REVERT: Ripristina shifts originali su errore
      setLocalShifts(shifts)
      
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
    
    localShifts.forEach(shift => {
      const userId = shift.assignments?.[0]?.user_id || 'unassigned'
      if (!grouped[userId]) grouped[userId] = []
      grouped[userId].push(shift)
    })
    
    return grouped
  }, [localShifts, users])

  const unassignedShifts = shiftsByUser.unassigned || []

  // ✅ Sensors con activationConstraint - richiede 5px di movimento per attivare drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Minimo 5px di movimento per attivare drag
      }
    })
  )

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
                    className="p-2 space-y-2 cursor-pointer min-h-[60px]"
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
                      className="p-2 space-y-2 cursor-pointer min-h-[60px]"
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
          <Card 
            className="p-2 opacity-90 cursor-grabbing shadow-2xl overflow-hidden"
            style={{
              backgroundColor: hexToRgba(activeShift.job_tag?.color, 0.9),
              borderColor: hexToRgba(activeShift.job_tag?.color, 1),
              borderWidth: '3px'
            }}
          >
            {activeShift.job_tag && (
              <div className="text-xs font-semibold text-gray-900 mb-1 truncate">
                {activeShift.job_tag.label_it}
              </div>
            )}
            <div className="flex items-center justify-between gap-2 text-xs text-gray-800">
              <span className="font-medium">
                {formatTimeCombo(new Date(activeShift.start_at))} - {formatTimeCombo(new Date(activeShift.end_at))}
              </span>
            </div>
          </Card>
        )}
      </DragOverlay>

      {/* Zona eliminazione - appare solo durante drag */}
      {activeShift && (
        <div 
          ref={deleteZone.setNodeRef}
          className={`fixed bottom-0 left-1/2 -translate-x-1/2 max-w-md w-full h-14 flex items-center justify-center z-[100] transition-all duration-200 rounded-t-lg ${
            deleteZone.isOver 
              ? 'bg-red-500/60 shadow-2xl scale-105' 
              : 'bg-red-500/30 backdrop-blur-sm'
          }`}
        >
          <div className="flex items-center gap-2">
            <Trash2 
              className={`transition-transform duration-200 ${
                deleteZone.isOver ? 'scale-110' : 'scale-100'
              }`}
              size={20} 
              color="white" 
            />
            <span className="text-white font-semibold text-sm">
              {deleteZone.isOver ? 'Rilascia per eliminare' : 'Trascina qui per eliminare'}
            </span>
          </div>
        </div>
      )}
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

// Formatta orario come "9h50" invece di "09:50"
function formatTimeCombo(date: Date): string {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  return `${hours}h${minutes.toString().padStart(2, '0')}`
}

// Converte hex in rgba per opacità controllata
function hexToRgba(hex: string | null | undefined, alpha: number = 1): string {
  if (!hex) return `rgba(200, 200, 200, ${alpha})` // grigio default
  
  // Rimuove # se presente
  const cleanHex = hex.replace('#', '')
  
  // Converte in RGB
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function DraggableShiftCard({ shift, onClick }: { shift: ShiftWithAssignments; onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift.id,
    data: { shift }
  })
  
  const startTime = formatTimeCombo(new Date(shift.start_at))
  const endTime = formatTimeCombo(new Date(shift.end_at))
  const bgColor = hexToRgba(shift.job_tag?.color, 0.35) // ✅ 35% opacità per colori visibili
  const borderColor = hexToRgba(shift.job_tag?.color, 1)
  
  // Debug: verifica presenza colore job_tag
  if (!shift.job_tag?.color) {
    console.warn('⚠️ Shift senza colore:', { id: shift.id, job_tag: shift.job_tag })
  }
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: bgColor,
    borderColor: borderColor,
    borderWidth: '1px'
  } : {
    backgroundColor: bgColor,
    borderColor: borderColor,
    borderWidth: '1px'
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      e.stopPropagation()
      onClick?.()
    }
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className="p-1.5 hover:opacity-90 transition-all cursor-grab active:cursor-grabbing overflow-hidden"
    >
      {shift.job_tag && (
        <div 
          className="text-xs font-bold text-white mb-0 truncate"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {shift.job_tag.label_it}
        </div>
      )}
      
      <div className="flex items-center justify-between gap-2 text-xs text-white">
        <span 
          className="font-semibold truncate"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {startTime} - {endTime}
        </span>
      </div>
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
    <div className="relative min-h-[60px] rounded border border-border overflow-hidden">
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
