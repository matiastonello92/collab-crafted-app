import { WidgetDefinition, WidgetLevel, DashboardWidget, UserWidgetPreference } from './types';
import { WIDGET_REGISTRY } from './widget-registry';
import { hasPermission } from '@/hooks/usePermissions';

export function getUserLevel(isAdmin: boolean, permissions: string[]): WidgetLevel {
  if (permissions.includes('*')) return 'platform_admin';
  if (isAdmin) return 'org_admin';
  if (hasPermission(permissions, 'view_settings')) return 'location_manager';
  if (hasPermission(permissions, ['shifts:approve', 'shifts:manage'])) return 'team_lead';
  return 'base';
}

const LEVEL_HIERARCHY: Record<WidgetLevel, number> = {
  all: 0,
  base: 1,
  team_lead: 2,
  location_manager: 3,
  org_admin: 4,
  platform_admin: 5,
};

export function canAccessWidget(
  widget: WidgetDefinition,
  userLevel: WidgetLevel,
  permissions: string[]
): boolean {
  // Check level hierarchy
  const userLevelNum = LEVEL_HIERARCHY[userLevel];
  const widgetLevelNum = LEVEL_HIERARCHY[widget.minLevel];
  
  if (userLevelNum < widgetLevelNum) return false;

  // Check specific permissions if required
  if (widget.requiredPermission) {
    return hasPermission(permissions, widget.requiredPermission);
  }

  return true;
}

export function getVisibleWidgets(
  userLevel: WidgetLevel,
  permissions: string[],
  preferences?: UserWidgetPreference[]
): DashboardWidget[] {
  const allWidgets = Object.values(WIDGET_REGISTRY);
  
  // Filter by access
  const accessibleWidgets = allWidgets.filter(widget => 
    canAccessWidget(widget, userLevel, permissions)
  );

  // Apply user preferences
  const widgetsWithPreferences = accessibleWidgets.map(widget => {
    const preference = preferences?.find(p => p.widget_id === widget.id);
    return {
      ...widget,
      preference,
    };
  });

  // Filter visible and sort by position
  return widgetsWithPreferences
    .filter(w => w.preference?.is_visible ?? w.defaultVisible)
    .sort((a, b) => {
      const posA = a.preference?.position ?? 999;
      const posB = b.preference?.position ?? 999;
      return posA - posB;
    });
}
