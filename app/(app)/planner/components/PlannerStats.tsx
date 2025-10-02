'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, Calendar, TrendingUp } from 'lucide-react'
import type { ShiftWithAssignments, Rota } from '@/types/shifts'
import { differenceInHours, parseISO } from 'date-fns'

interface Props {
  shifts: ShiftWithAssignments[]
  rota?: Rota
}

export function PlannerStats({ shifts, rota }: Props) {
  const stats = useMemo(() => {
    const totalShifts = shifts.length
    const assignedShifts = shifts.filter(s => s.assignments && s.assignments.length > 0).length
    const unassignedShifts = totalShifts - assignedShifts
    
    // Calculate total hours
    const totalHours = shifts.reduce((sum, shift) => {
      const hours = differenceInHours(parseISO(shift.end_at), parseISO(shift.start_at))
      return sum + hours - (shift.break_minutes / 60)
    }, 0)
    
    // Unique users
    const uniqueUsers = new Set(
      shifts
        .filter(s => s.assignments && s.assignments.length > 0)
        .map(s => s.assignments![0].user_id)
    )
    
    // Coverage percentage
    const coveragePercent = totalShifts > 0 ? (assignedShifts / totalShifts) * 100 : 0
    
    // Budget usage (if available)
    let budgetPercent = 0
    if (rota?.labor_budget_eur) {
      // Assume €15/hour average (this should come from config)
      const estimatedCost = totalHours * 15
      budgetPercent = (estimatedCost / rota.labor_budget_eur) * 100
    }
    
    return {
      totalShifts,
      assignedShifts,
      unassignedShifts,
      totalHours: totalHours.toFixed(1),
      uniqueUsers: uniqueUsers.size,
      coveragePercent: coveragePercent.toFixed(0),
      budgetPercent: budgetPercent.toFixed(0)
    }
  }, [shifts, rota])
  
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">Statistiche Settimana</h3>
      
      {/* Coverage */}
      <Card className="p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-medium">Copertura Turni</span>
            </div>
            <span className="font-bold">{stats.coveragePercent}%</span>
          </div>
          <Progress value={parseFloat(stats.coveragePercent)} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{stats.assignedShifts} assegnati</span>
            <span>{stats.unassignedShifts} da assegnare</span>
          </div>
        </div>
      </Card>
      
      {/* Total Hours */}
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Ore Totali</div>
              <div className="text-lg font-bold">{stats.totalHours}h</div>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Unique Users */}
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Impiegati Attivi</div>
              <div className="text-lg font-bold">{stats.uniqueUsers}</div>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Budget (if available) */}
      {rota?.labor_budget_eur && (
        <Card className="p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-medium">Budget</span>
              </div>
              <span className="font-bold">{stats.budgetPercent}%</span>
            </div>
            <Progress 
              value={parseFloat(stats.budgetPercent)} 
              className={`h-2 ${parseFloat(stats.budgetPercent) > 100 ? 'bg-destructive' : ''}`}
            />
            <div className="text-xs text-muted-foreground">
              Budget: €{rota.labor_budget_eur}
            </div>
          </div>
        </Card>
      )}
      
      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="text-xs">
          {stats.totalShifts} Turni
        </Badge>
        {stats.unassignedShifts > 0 && (
          <Badge variant="destructive" className="text-xs">
            {stats.unassignedShifts} Non Assegnati
          </Badge>
        )}
      </div>
    </div>
  )
}
