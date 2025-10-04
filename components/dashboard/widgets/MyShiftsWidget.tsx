'use client';

import { WidgetContainer } from '../WidgetContainer';
import { useTranslation } from '@/lib/i18n';
import { WidgetProps } from '@/lib/dashboard/types';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const MyShiftsWidget = ({ size }: WidgetProps) => {
  const { t } = useTranslation();

  return (
    <WidgetContainer 
      title="dashboard.widgets.myShifts"
      description="dashboard.widgets.myShiftsDesc"
      size={size}
      actions={
        <Link href="/planner">
          <Button variant="ghost" size="sm">
            {t('common.viewAll')}
          </Button>
        </Link>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">{t('dashboard.noUpcomingShifts')}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.checkBackLater')}</p>
          </div>
        </div>
      </div>
    </WidgetContainer>
  );
};

export default MyShiftsWidget;
