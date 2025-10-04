export type WidgetSize = 'small' | 'medium' | 'large';

export type WidgetLevel = 'all' | 'base' | 'team_lead' | 'location_manager' | 'org_admin' | 'platform_admin';

export interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<WidgetProps>;
  defaultSize: WidgetSize;
  minLevel: WidgetLevel;
  requiredPermission?: string | string[];
  defaultVisible: boolean;
}

export interface WidgetProps {
  size?: WidgetSize;
  config?: Record<string, any>;
}

export interface UserWidgetPreference {
  widget_id: string;
  is_visible: boolean;
  position: number;
  size: WidgetSize;
  config: Record<string, any>;
}

export interface DashboardWidget extends WidgetDefinition {
  preference?: UserWidgetPreference;
}
