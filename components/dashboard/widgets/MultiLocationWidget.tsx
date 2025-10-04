'use client';

import { WidgetContainer } from '../WidgetContainer';
import { useTranslation } from '@/lib/i18n';
import { WidgetProps } from '@/lib/dashboard/types';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const MultiLocationWidget = ({ size }: WidgetProps) => {
  const { t } = useTranslation();

  return (
    <WidgetContainer 
      title="dashboard.widgets.multiLocation"
      description="dashboard.widgets.multiLocationDesc"
      size={size}
      actions={
        <Link href="/locations">
          <Button variant="ghost" size="sm">
            {t('common.manage')}
          </Button>
        </Link>
      }
    >
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
        <MapPin className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{t('dashboard.noLocations')}</p>
          <p className="text-xs text-muted-foreground">{t('dashboard.addLocations')}</p>
        </div>
      </div>
    </WidgetContainer>
  );
};

export default MultiLocationWidget;
