'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const STATUS_CONFIG = {
  draft: {
    label: 'Bozza',
    icon: '🟡',
    variant: 'secondary' as const,
    tooltip: 'Ricetta in fase di creazione, non ancora inviata per approvazione'
  },
  submitted: {
    label: 'In Approvazione',
    icon: '🟠',
    variant: 'outline' as const,
    tooltip: 'Ricetta inviata e in attesa di approvazione dal manager'
  },
  published: {
    label: 'Pubblicata',
    icon: '🟢',
    variant: 'default' as const,
    tooltip: 'Ricetta approvata e visibile a tutti'
  },
  archived: {
    label: 'Archiviata',
    icon: '⚫',
    variant: 'secondary' as const,
    tooltip: 'Ricetta archiviata, non più in uso'
  }
};

interface RecipeWorkflowBadgeProps {
  status: keyof typeof STATUS_CONFIG;
  showTooltip?: boolean;
}

export function RecipeWorkflowBadge({ status, showTooltip = true }: RecipeWorkflowBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  const badge = (
    <Badge variant={config.variant} className="gap-1">
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
