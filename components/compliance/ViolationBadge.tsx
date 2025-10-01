'use client'

import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ViolationWithUser } from '@/types/compliance'

interface ViolationBadgeProps {
  violation: ViolationWithUser
  compact?: boolean
}

export function ViolationBadge({ violation, compact = false }: ViolationBadgeProps) {
  if (violation.is_silenced) return null

  const severityColor = violation.severity === 'critical' ? 'destructive' : 'secondary'
  const ruleName = violation.rule?.display_name || 'Compliance'

  const details = violation.details
  const description = 
    details.rest_hours !== undefined
      ? `${details.rest_hours}h riposo (min ${details.threshold}h)`
      : details.hours_worked !== undefined
      ? `${details.hours_worked}h lavorate (max ${details.threshold}h)`
      : 'Violazione compliance'

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={severityColor} className="text-xs cursor-help">
              <AlertTriangle className="h-3 w-3" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div className="font-semibold">{ruleName}</div>
              <div className="text-muted-foreground">{description}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Badge variant={severityColor} className="text-xs">
      <AlertTriangle className="h-3 w-3 mr-1" />
      {ruleName}: {description}
    </Badge>
  )
}
