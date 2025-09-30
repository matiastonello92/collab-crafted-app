'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { formatWeekLabel, getPreviousWeek, getNextWeek, getCurrentWeekStart } from '@/lib/shifts/week-utils'

interface Props {
  currentWeek: string // ISO date (lunedì)
  onWeekChange: (weekStart: string) => void
  rotaStatus?: 'draft' | 'published' | 'locked'
}

export function WeekNavigator({ currentWeek, onWeekChange, rotaStatus }: Props) {
  const goToPrevWeek = () => {
    onWeekChange(getPreviousWeek(currentWeek))
  }
  
  const goToNextWeek = () => {
    onWeekChange(getNextWeek(currentWeek))
  }
  
  const goToToday = () => {
    onWeekChange(getCurrentWeekStart())
  }

  const getStatusBadgeVariant = () => {
    switch (rotaStatus) {
      case 'locked':
        return 'destructive'
      case 'published':
        return 'default'
      case 'draft':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getStatusLabel = () => {
    switch (rotaStatus) {
      case 'draft':
        return 'Bozza'
      case 'published':
        return 'Pubblicata'
      case 'locked':
        return 'Bloccata'
      default:
        return 'Nessuna Rota'
    }
  }
  
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={goToPrevWeek}
          className="h-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex flex-col min-w-[200px]">
          <h2 className="text-lg font-semibold">{formatWeekLabel(currentWeek)}</h2>
          <Badge 
            variant={getStatusBadgeVariant()}
            className="w-fit mt-1"
          >
            {getStatusLabel()}
          </Badge>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={goToNextWeek}
          className="h-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={goToToday}
          className="h-8"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Oggi
        </Button>
      </div>
    </div>
  )
}
