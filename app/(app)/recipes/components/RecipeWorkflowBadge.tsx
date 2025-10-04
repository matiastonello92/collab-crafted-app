'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from '@/lib/i18n';

const STATUS_CONFIG = {
  draft: {
    icon: '🟡',
    variant: 'secondary' as const,
  },
  submitted: {
    icon: '🟠',
    variant: 'outline' as const,
  },
  published: {
    icon: '🟢',
    variant: 'default' as const,
  },
  archived: {
    icon: '⚫',
    variant: 'secondary' as const,
  }
};

interface RecipeWorkflowBadgeProps {
  status: keyof typeof STATUS_CONFIG;
  showTooltip?: boolean;
}

export function RecipeWorkflowBadge({ status, showTooltip = true }: RecipeWorkflowBadgeProps) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const label = t(`recipeStatus.${status}`);
  const tooltip = t(`recipeStatusTooltip.${status}`);

  const badge = (
    <Badge variant={config.variant} className="gap-1">
      <span>{config.icon}</span>
      <span>{label}</span>
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
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
