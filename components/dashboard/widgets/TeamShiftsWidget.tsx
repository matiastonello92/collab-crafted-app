'use client';

import { WidgetContainer } from '../WidgetContainer';
import { useTranslation } from '@/lib/i18n';
import { WidgetProps } from '@/lib/dashboard/types';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const TeamShiftsWidget = ({ size }: WidgetProps) => {
  const { t } = useTranslation();

  return (
    <WidgetContainer 
      title="dashboard.widgets.teamShifts"
      description="dashboard.widgets.teamShiftsDesc"
      size={size}
      actions={
        <Link href="/planner">
          <Button variant="ghost" size="sm">
            {t('common.viewPlanner')}
          </Button>
        </Link>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{t('dashboard.noTeamShifts')}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.scheduleShifts')}</p>
          </div>
        </div>
      </div>
    </WidgetContainer>
  );
};

export default TeamShiftsWidget;
