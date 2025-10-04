'use client';

import { WidgetContainer } from '../WidgetContainer';
import { useTranslation } from '@/lib/i18n';
import { WidgetProps } from '@/lib/dashboard/types';
import { Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import useSWR from 'swr';
import { format, isToday, isTomorrow } from 'date-fns';
import { it, enUS } from 'date-fns/locale';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const MyShiftsWidget = ({ size }: WidgetProps) => {
  const { t, locale } = useTranslation();
  const { data, isLoading } = useSWR('/api/v1/me/shifts/upcoming?limit=5', fetcher);

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
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : !data?.shifts || data.shifts.length === 0 ? (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">{t('dashboard.noUpcomingShifts')}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.checkBackLater')}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {data.shifts.map((shift: any) => {
            const shiftDate = new Date(shift.start_at);
            const dateLabel = isToday(shiftDate) 
              ? t('common.today')
              : isTomorrow(shiftDate)
              ? t('common.tomorrow')
              : format(shiftDate, 'EEE d MMM', { locale: locale === 'it' ? it : enUS });

            return (
              <div key={shift.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {dateLabel}
                    </Badge>
                    {shift.location_name && (
                      <span className="text-xs text-muted-foreground truncate">
                        {shift.location_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-3 w-3" />
                    <span className="font-medium">
                      {format(new Date(shift.start_at), 'HH:mm')} - {format(new Date(shift.end_at), 'HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetContainer>
  );
};

export default MyShiftsWidget;
