'use client';

import { WidgetContainer } from '../WidgetContainer';
import { useTranslation } from '@/lib/i18n';
import { WidgetProps } from '@/lib/dashboard/types';
import { Palmtree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const MyLeaveBalanceWidget = ({ size }: WidgetProps) => {
  const { t } = useTranslation();

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
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/10">
          <Palmtree className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">{t('dashboard.daysAvailable')}</p>
        </div>
      </div>
    </WidgetContainer>
  );
};

export default MyLeaveBalanceWidget;
