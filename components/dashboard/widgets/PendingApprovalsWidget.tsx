'use client';

import { WidgetContainer } from '../WidgetContainer';
import { useTranslation } from '@/lib/i18n';
import { WidgetProps } from '@/lib/dashboard/types';
import { ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const PendingApprovalsWidget = ({ size }: WidgetProps) => {
  const { t } = useTranslation();

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
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
        <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{t('dashboard.noPendingApprovals')}</p>
          <p className="text-xs text-muted-foreground">{t('dashboard.allCaughtUp')}</p>
        </div>
      </div>
    </WidgetContainer>
  );
};

export default PendingApprovalsWidget;
