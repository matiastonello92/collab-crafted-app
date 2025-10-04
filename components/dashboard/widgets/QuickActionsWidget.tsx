'use client';

import { Button } from '@/components/ui/button';
import { WidgetContainer } from '../WidgetContainer';
import { usePermissions } from '@/hooks/usePermissions';
import { useTranslation } from '@/lib/i18n';
import { Users, Calendar, Package, Settings, ClipboardList, Clock } from 'lucide-react';
import Link from 'next/link';
import { WidgetProps } from '@/lib/dashboard/types';

const QuickActionsWidget = ({ size }: WidgetProps) => {
  const { permissions } = usePermissions();
  const { t } = useTranslation();

  const actions = [
    {
      href: '/planner',
      label: t('common.planner'),
      icon: Calendar,
      permission: 'shifts:manage',
    },
    {
      href: '/users',
      label: t('common.users'),
      icon: Users,
      permission: 'manage_users',
    },
    {
      href: '/inventory',
      label: t('common.inventory'),
      icon: Package,
      permission: 'view_settings',
    },
    {
      href: '/timeclock',
      label: t('common.timeclock'),
      icon: Clock,
      permission: null,
    },
    {
      href: '/leave-requests',
      label: t('common.leaveRequests'),
      icon: ClipboardList,
      permission: null,
    },
    {
      href: '/settings',
      label: t('common.settings'),
      icon: Settings,
      permission: 'view_settings',
    },
  ];

  const visibleActions = actions.filter(action => {
    if (!action.permission) return true;
    if (permissions.includes('*')) return true;
    return permissions.some(p => p === action.permission);
  });

  return (
    <WidgetContainer 
      title="dashboard.widgets.quickActions"
      description="dashboard.widgets.quickActionsDesc"
      size={size}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {visibleActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
              <action.icon className="h-5 w-5" />
              <span className="text-sm">{action.label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </WidgetContainer>
  );
};

export default QuickActionsWidget;
