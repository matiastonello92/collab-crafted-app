import { lazy } from 'react';
import { WidgetDefinition } from './types';

const QuickActionsWidget = lazy(() => import('@/components/dashboard/widgets/QuickActionsWidget'));
const MyShiftsWidget = lazy(() => import('@/components/dashboard/widgets/MyShiftsWidget'));
const MyLeaveBalanceWidget = lazy(() => import('@/components/dashboard/widgets/MyLeaveBalanceWidget'));
const PendingApprovalsWidget = lazy(() => import('@/components/dashboard/widgets/PendingApprovalsWidget'));
const TeamShiftsWidget = lazy(() => import('@/components/dashboard/widgets/TeamShiftsWidget'));
const LocationStatsWidget = lazy(() => import('@/components/dashboard/widgets/LocationStatsWidget'));
const MultiLocationWidget = lazy(() => import('@/components/dashboard/widgets/MultiLocationWidget'));
const SystemHealthWidget = lazy(() => import('@/components/dashboard/widgets/SystemHealthWidget'));

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  'quick-actions': {
    id: 'quick-actions',
    title: 'dashboard.widgets.quickActions',
    description: 'dashboard.widgets.quickActionsDesc',
    component: QuickActionsWidget,
    defaultSize: 'large',
    minLevel: 'all',
    defaultVisible: true,
  },
  'my-shifts': {
    id: 'my-shifts',
    title: 'dashboard.widgets.myShifts',
    description: 'dashboard.widgets.myShiftsDesc',
    component: MyShiftsWidget,
    defaultSize: 'medium',
    minLevel: 'all',
    defaultVisible: true,
  },
  'my-leave-balance': {
    id: 'my-leave-balance',
    title: 'dashboard.widgets.myLeaveBalance',
    description: 'dashboard.widgets.myLeaveBalanceDesc',
    component: MyLeaveBalanceWidget,
    defaultSize: 'small',
    minLevel: 'all',
    defaultVisible: true,
  },
  'pending-approvals': {
    id: 'pending-approvals',
    title: 'dashboard.widgets.pendingApprovals',
    description: 'dashboard.widgets.pendingApprovalsDesc',
    component: PendingApprovalsWidget,
    defaultSize: 'medium',
    minLevel: 'team_lead',
    requiredPermission: 'shifts:approve',
    defaultVisible: true,
  },
  'team-shifts': {
    id: 'team-shifts',
    title: 'dashboard.widgets.teamShifts',
    description: 'dashboard.widgets.teamShiftsDesc',
    component: TeamShiftsWidget,
    defaultSize: 'large',
    minLevel: 'team_lead',
    requiredPermission: 'shifts:manage',
    defaultVisible: true,
  },
  'location-stats': {
    id: 'location-stats',
    title: 'dashboard.widgets.locationStats',
    description: 'dashboard.widgets.locationStatsDesc',
    component: LocationStatsWidget,
    defaultSize: 'large',
    minLevel: 'location_manager',
    requiredPermission: 'view_settings',
    defaultVisible: true,
  },
  'multi-location': {
    id: 'multi-location',
    title: 'dashboard.widgets.multiLocation',
    description: 'dashboard.widgets.multiLocationDesc',
    component: MultiLocationWidget,
    defaultSize: 'large',
    minLevel: 'org_admin',
    defaultVisible: true,
  },
  'system-health': {
    id: 'system-health',
    title: 'dashboard.widgets.systemHealth',
    description: 'dashboard.widgets.systemHealthDesc',
    component: SystemHealthWidget,
    defaultSize: 'medium',
    minLevel: 'platform_admin',
    defaultVisible: true,
  },
};

export function getWidgetById(id: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY[id];
}

export function getAllWidgets(): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY);
}
