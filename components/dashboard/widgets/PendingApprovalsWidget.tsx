'use client';

import { WidgetContainer } from '../WidgetContainer';
import { useTranslation } from '@/lib/i18n';
import { WidgetProps } from '@/lib/dashboard/types';
import { ClipboardCheck, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import useSWR from 'swr';
import { format } from 'date-fns';
import { it, enUS } from 'date-fns/locale';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const PendingApprovalsWidget = ({ size }: WidgetProps) => {
  const { t, locale } = useTranslation();
  const { data, isLoading } = useSWR('/api/v1/me/approvals/pending', fetcher);

  return (
    <WidgetContainer 
      title="dashboard.widgets.pendingApprovals"
      description="dashboard.widgets.pendingApprovalsDesc"
      size={size}
      actions={
        <Link href="/leave-requests">
          <Button variant="ghost" size="sm">
            {t('common.viewAll')}
          </Button>
        </Link>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : !data?.requests || data.requests.length === 0 ? (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{t('dashboard.noPendingApprovals')}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.allCaughtUp')}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {data.requests.slice(0, 3).map((request: any) => (
            <div key={request.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {request.user?.full_name || 'Unknown User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(request.start_at), 'PP', { locale: locale === 'it' ? it : enUS })}
                </p>
              </div>
              {request.type && (
                <Badge variant="outline" className="text-xs">
                  {request.type.label}
                </Badge>
              )}
            </div>
          ))}
          {data.requests.length > 3 && (
            <p className="text-xs text-center text-muted-foreground pt-2">
              +{data.requests.length - 3} {t('common.more')}
            </p>
          )}
        </div>
      )}
    </WidgetContainer>
  );
};

export default PendingApprovalsWidget;
