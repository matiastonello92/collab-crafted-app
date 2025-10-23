'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar, Send, Lock, Eye, EyeOff } from 'lucide-react'
import { formatWeekLabel, getPreviousWeek, getNextWeek, getCurrentWeekStart } from '@/lib/shifts/week-utils'
import { useTranslation } from '@/lib/i18n'
import { useBreakpoint } from '@/hooks/useBreakpoint'

interface Props {
  currentWeek: string // ISO date (lunedì)
  onWeekChange: (weekStart: string) => void
  rotaStatus?: 'draft' | 'published' | 'locked'
  rotaId?: string
  onPublish?: () => void
  onLock?: () => void
  canPublish?: boolean
  canLock?: boolean
  showUsersWithoutShifts?: boolean
  onToggleUsersWithoutShifts?: (show: boolean) => void
}

export function WeekNavigator({ currentWeek, onWeekChange, rotaStatus, rotaId, onPublish, onLock, canPublish, canLock, showUsersWithoutShifts, onToggleUsersWithoutShifts }: Props) {
  const { t } = useTranslation()
  const { isMobile } = useBreakpoint()
  
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
        return t('planner.publish.draft')
      case 'published':
        return t('planner.publish.published')
      case 'locked':
        return t('planner.publish.locked')
      default:
        return t('planner.publish.noRota')
    }
  }
  
  return (
    <div className="flex flex-col gap-3 px-4 py-4 border-b bg-card lg:flex-row lg:items-center lg:justify-between lg:px-6">
      {/* Week Navigation */}
      <div className="flex items-center gap-2 sm:gap-4">
        <Button 
          variant="outline" 
          size={isMobile ? "default" : "sm"}
          onClick={goToPrevWeek}
          className="h-9 w-9 p-0 sm:h-10 sm:w-10"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex flex-col min-w-[180px] sm:min-w-[200px]">
          <h2 className="text-base font-semibold sm:text-lg">{formatWeekLabel(currentWeek)}</h2>
          <Badge 
            variant={getStatusBadgeVariant()}
            className="w-fit mt-1 text-xs"
          >
            {getStatusLabel()}
          </Badge>
        </div>
        
        <Button 
          variant="outline" 
          size={isMobile ? "default" : "sm"}
          onClick={goToNextWeek}
          className="h-9 w-9 p-0 sm:h-10 sm:w-10"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size={isMobile ? "sm" : "sm"}
          onClick={goToToday}
          className="h-9 sm:h-10"
        >
          <Calendar className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('common.today')}</span>
        </Button>
      </div>

      {/* Rota Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {onToggleUsersWithoutShifts && !isMobile && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleUsersWithoutShifts(!showUsersWithoutShifts)}
            className="h-9 text-xs sm:h-10 sm:text-sm"
          >
            {showUsersWithoutShifts ? (
              <>
                <EyeOff className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('planner.dragDrop.hideUsersWithoutShifts')}</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('planner.dragDrop.showAllUsers')}</span>
              </>
            )}
          </Button>
        )}
        
        {canPublish && onPublish && (
          <Button 
            variant="default" 
            size="sm"
            onClick={onPublish}
            className="h-9 flex-1 text-xs sm:h-10 sm:flex-none sm:text-sm"
          >
            <Send className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('planner.common.publishRota')}</span>
            <span className="sm:hidden">Pubblica</span>
          </Button>
        )}
        
        {canLock && onLock && (
          <Button 
            variant="destructive" 
            size="sm"
            onClick={onLock}
            className="h-9 flex-1 text-xs sm:h-10 sm:flex-none sm:text-sm"
          >
            <Lock className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('planner.common.lockRota')}</span>
            <span className="sm:hidden">Blocca</span>
          </Button>
        )}
      </div>
    </div>
  )
}
