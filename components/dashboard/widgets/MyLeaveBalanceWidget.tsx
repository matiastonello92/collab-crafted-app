'use client';

import { WidgetContainer } from '../WidgetContainer';
import { useTranslation } from '@/lib/i18n';
import { WidgetProps } from '@/lib/dashboard/types';
import { Palmtree, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const MyLeaveBalanceWidget = ({ size }: WidgetProps) => {
  const { t } = useTranslation();
  const { data, isLoading } = useSWR('/api/v1/me/leave/balance', fetcher);

  return (
    <WidgetContainer 
      title="dashboard.widgets.myLeaveBalance"
      size={size}
      actions={
        <Link href="/leave-requests">
          <Button variant="ghost" size="sm">
            {t('common.request')}
          </Button>
        </Link>
      }
    >
      {isLoading ? (
        <div className="h-20 rounded-lg bg-muted animate-pulse" />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Palmtree className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data?.daysAvailable || 0}</p>
              <p className="text-sm text-muted-foreground">{t('dashboard.daysAvailable')}</p>
            </div>
          </div>
          {data?.pendingRequests > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {data.pendingRequests} {t('dashboard.pendingRequests')}
              </span>
            </div>
          )}
        </div>
      )}
    </WidgetContainer>
  );
};

export default MyLeaveBalanceWidget;
