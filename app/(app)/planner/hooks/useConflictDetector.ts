import { useMemo } from 'react'
import type { ShiftWithAssignments, LeaveRequest } from '@/types/shifts'

export interface ShiftConflict {
  shiftId: string
  type: 'shift_overlap' | 'leave_overlap' | 'availability_mismatch'
  severity: 'error' | 'warning'
  message: string
}

export function useConflictDetector(
  shifts: ShiftWithAssignments[],
  leaves: LeaveRequest[]
) {
  const conflicts = useMemo(() => {
    const conflictMap = new Map<string, ShiftConflict[]>()
    
    // 1. Detect shift overlaps (stesso utente, orari sovrapposti)
    shifts.forEach((shift, idx) => {
      if (!shift.assignments?.[0]?.user_id) return
      
      const userId = shift.assignments[0].user_id
      const shiftStart = new Date(shift.start_at).getTime()
      const shiftEnd = new Date(shift.end_at).getTime()
      
      // Check against other shifts
      shifts.slice(idx + 1).forEach(otherShift => {
        if (otherShift.assignments?.[0]?.user_id !== userId) return
        
        const otherStart = new Date(otherShift.start_at).getTime()
        const otherEnd = new Date(otherShift.end_at).getTime()
        
        // Overlap detection
        if (shiftStart < otherEnd && shiftEnd > otherStart) {
          const conflict: ShiftConflict = {
            shiftId: shift.id,
            type: 'shift_overlap',
            severity: 'error',
            message: 'Turno sovrapposto con altro turno'
          }
          
          if (!conflictMap.has(shift.id)) {
            conflictMap.set(shift.id, [])
          }
          conflictMap.get(shift.id)!.push(conflict)
          
          // Add to other shift too
          if (!conflictMap.has(otherShift.id)) {
            conflictMap.set(otherShift.id, [])
          }
          conflictMap.get(otherShift.id)!.push({
            ...conflict,
            shiftId: otherShift.id
          })
        }
      })
      
      // 2. Check leave overlaps
      leaves
        .filter(l => l.status === 'approved' && l.user_id === userId)
        .forEach(leave => {
          const leaveStart = new Date(leave.start_at).getTime()
          const leaveEnd = new Date(leave.end_at).getTime()
          
          if (shiftStart < leaveEnd && shiftEnd > leaveStart) {
            const conflict: ShiftConflict = {
              shiftId: shift.id,
              type: 'leave_overlap',
              severity: 'error',
              message: 'Turno sovrapposto con ferie approvate'
            }
            
            if (!conflictMap.has(shift.id)) {
              conflictMap.set(shift.id, [])
            }
            conflictMap.get(shift.id)!.push(conflict)
          }
        })
    })
    
    return conflictMap
  }, [shifts, leaves])
  
  return {
    conflicts,
    hasConflict: (shiftId: string) => conflicts.has(shiftId),
    getConflicts: (shiftId: string) => conflicts.get(shiftId) || []
  }
}
