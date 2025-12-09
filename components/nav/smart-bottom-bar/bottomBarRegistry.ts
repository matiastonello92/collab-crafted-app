import { LucideIcon, Home, LayoutGrid, Users, ClipboardList, Calendar, Clock, Package, DollarSign, Settings, FileText, ThermometerSun, Sparkles, PlusCircle, BarChart3, Bell, User, Building2, Utensils, Receipt, BookOpen, Box, MapPin, Shield, Palmtree } from 'lucide-react';

export interface BottomBarLink {
  id: string;
  href: string;
  icon: LucideIcon;
  labelKey: string;
  permission?: string;
  adminOnly?: boolean;
}

// Default home link - always present
export const HOME_LINK: BottomBarLink = {
  id: 'home',
  href: '/dashboard',
  icon: Home,
  labelKey: 'bottomBar.home',
};

// Module-specific contextual links
export const MODULE_BOTTOM_BAR_CONFIG: Record<string, BottomBarLink[]> = {
  // Dashboard
  '/dashboard': [
    { id: 'planner', href: '/planner', icon: Calendar, labelKey: 'common.planner', permission: 'planner:view' },
    { id: 'users', href: '/users', icon: Users, labelKey: 'common.users', permission: 'users:view' },
  ],

  // Planner module
  '/planner': [
    { id: 'leave-requests', href: '/leave-requests', icon: Palmtree, labelKey: 'common.leaveRequests', permission: 'leaves:view' },
    { id: 'availability', href: '/planner/availability', icon: Clock, labelKey: 'nav.availability', permission: 'availability:view' },
  ],

  // Users module  
  '/users': [
    { id: 'invitations', href: '/invitations', icon: Bell, labelKey: 'nav.invitations', permission: 'users:invite' },
    { id: 'roles', href: '/settings/roles', icon: Shield, labelKey: 'nav.roles', permission: 'settings:roles' },
  ],

  // Inventory module
  '/inventory': [
    { id: 'catalog', href: '/inventory/catalog', icon: BookOpen, labelKey: 'inventory.catalog', permission: 'inventory:view' },
    { id: 'templates', href: '/inventory/templates', icon: FileText, labelKey: 'inventory.templates', permission: 'inventory:manage' },
  ],

  // HACCP module
  '/haccp': [
    { id: 'haccp-tasks', href: '/haccp/tasks', icon: ClipboardList, labelKey: 'haccp.tasks', permission: 'haccp:view' },
    { id: 'haccp-equipment', href: '/haccp/equipment', icon: ThermometerSun, labelKey: 'haccp.equipment', permission: 'haccp:view' },
  ],

  // Finance module
  '/finance': [
    { id: 'cash-closures', href: '/finance/cash-closures', icon: Receipt, labelKey: 'nav.cashClosures', permission: 'finance:view' },
    { id: 'reports', href: '/finance/reports', icon: BarChart3, labelKey: 'nav.reports', permission: 'finance:view' },
  ],

  // Timeclock module
  '/timeclock': [
    { id: 'timeclock-history', href: '/timeclock/history', icon: Clock, labelKey: 'timeclock.history', permission: 'timeclock:view' },
    { id: 'timeclock-reports', href: '/timeclock/reports', icon: BarChart3, labelKey: 'timeclock.reports', permission: 'timeclock:reports' },
  ],

  // Settings module
  '/settings': [
    { id: 'locations', href: '/settings/locations', icon: MapPin, labelKey: 'nav.locations', permission: 'settings:locations' },
    { id: 'organization', href: '/settings/organization', icon: Building2, labelKey: 'nav.organization', permission: 'settings:organization' },
  ],

  // Leave Requests
  '/leave-requests': [
    { id: 'planner', href: '/planner', icon: Calendar, labelKey: 'common.planner', permission: 'planner:view' },
    { id: 'users', href: '/users', icon: Users, labelKey: 'common.users', permission: 'users:view' },
  ],

  // My Week (personal)
  '/my-week': [
    { id: 'my-profile', href: '/profile', icon: User, labelKey: 'nav.profile' },
    { id: 'leave-request', href: '/leave-requests/new', icon: PlusCircle, labelKey: 'leaves.newRequest', permission: 'leaves:request' },
  ],

  // Cleaning Schedule
  '/cleaning-schedule': [
    { id: 'cleaning-history', href: '/cleaning-schedule/history', icon: Clock, labelKey: 'cleaningSchedule.history', permission: 'haccp:view' },
    { id: 'cleaning-areas', href: '/cleaning-schedule/areas', icon: LayoutGrid, labelKey: 'cleaningSchedule.areas', permission: 'haccp:manage' },
  ],

  // Posts/Feed
  '/posts': [
    { id: 'new-post', href: '/posts/new', icon: PlusCircle, labelKey: 'posts.create', permission: 'posts:create' },
    { id: 'users', href: '/users', icon: Users, labelKey: 'common.users', permission: 'users:view' },
  ],
};

// Fallback links when no specific module config exists
export const DEFAULT_CONTEXTUAL_LINKS: BottomBarLink[] = [
  { id: 'planner', href: '/planner', icon: Calendar, labelKey: 'common.planner', permission: 'planner:view' },
  { id: 'users', href: '/users', icon: Users, labelKey: 'common.users', permission: 'users:view' },
];

// All possible links for smart suggestion (excluding home)
export const ALL_TRACKABLE_LINKS: BottomBarLink[] = [
  { id: 'dashboard', href: '/dashboard', icon: LayoutGrid, labelKey: 'nav.dashboard' },
  { id: 'planner', href: '/planner', icon: Calendar, labelKey: 'common.planner', permission: 'planner:view' },
  { id: 'users', href: '/users', icon: Users, labelKey: 'common.users', permission: 'users:view' },
  { id: 'inventory', href: '/inventory', icon: Package, labelKey: 'common.inventory', permission: 'inventory:view' },
  { id: 'haccp', href: '/haccp', icon: ClipboardList, labelKey: 'nav.haccp', permission: 'haccp:view' },
  { id: 'finance', href: '/finance', icon: DollarSign, labelKey: 'nav.finance', permission: 'finance:view' },
  { id: 'timeclock', href: '/timeclock', icon: Clock, labelKey: 'common.timeclock', permission: 'timeclock:view' },
  { id: 'settings', href: '/settings', icon: Settings, labelKey: 'common.settings', permission: 'settings:view' },
  { id: 'leave-requests', href: '/leave-requests', icon: Palmtree, labelKey: 'common.leaveRequests', permission: 'leaves:view' },
  { id: 'cleaning-schedule', href: '/cleaning-schedule', icon: Sparkles, labelKey: 'nav.cleaningSchedule', permission: 'haccp:view' },
  { id: 'posts', href: '/posts', icon: FileText, labelKey: 'nav.posts', permission: 'posts:view' },
  { id: 'my-week', href: '/my-week', icon: User, labelKey: 'nav.myWeek' },
];
