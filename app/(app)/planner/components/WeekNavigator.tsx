'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar, Send, Lock } from 'lucide-react'
import { formatWeekLabel, getPreviousWeek, getNextWeek, getCurrentWeekStart } from '@/lib/shifts/week-utils'

interface Props {
  currentWeek: string // ISO date (lunedì)
  onWeekChange: (weekStart: string) => void
  rotaStatus?: 'draft' | 'published' | 'locked'
  rotaId?: string
  onPublish?: () => void
  onLock?: () => void
  canPublish?: boolean
  canLock?: boolean
}

export function WeekNavigator({ currentWeek, onWeekChange, rotaStatus, rotaId, onPublish, onLock, canPublish, canLock }: Props) {
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

      {/* Rota Actions */}
      <div className="flex items-center gap-2">
        {canPublish && onPublish && (
          <Button 
            variant="default" 
            size="sm"
            onClick={onPublish}
            className="h-8"
          >
            <Send className="h-4 w-4 mr-2" />
            Pubblica
          </Button>
        )}
        
        {canLock && onLock && (
          <Button 
            variant="destructive" 
            size="sm"
            onClick={onLock}
            className="h-8"
          >
            <Lock className="h-4 w-4 mr-2" />
            Blocca
          </Button>
        )}
      </div>
    </div>
  )
}
