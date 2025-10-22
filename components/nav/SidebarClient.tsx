'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Home,
  Users,
  Bug,
  Settings,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shield,
  ChefHat,
  Wine,
  Sparkles,
  History,
  Package,
  CalendarClock,
  CalendarDays,
  Mail,
  Tag,
  DollarSign,
  TrendingUp,
  Plus,
  Upload,
  CreditCard,
} from 'lucide-react'
import { useHydratedStore } from '@/lib/store/useHydratedStore'
import { can } from '@/lib/permissions'
import { Skeleton } from '@/components/ui/skeleton'
import { useSupabase } from '@/hooks/useSupabase'
import { isAdminFromClaims } from '@/lib/admin/claims'
import { useTranslation } from '@/lib/i18n'

export default function SidebarClient({ 
  onNavigate,
  locations,
  activeLocationId,
  setActiveLocation
}: { 
  onNavigate?: () => void
  locations?: { id: string; name: string; org_id: string }[]
  activeLocationId?: string | null
  setActiveLocation?: (id?: string | null) => Promise<void>
} = {}) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<string[]>([])
  const [isAdminClaims, setIsAdminClaims] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const pathname = usePathname()
  const supabase = useSupabase()
  const { permissions, context, permissionsLoading } = useHydratedStore()
  
  const navigation: any[] = [
    { name: t('nav.dashboard'), href: '/', icon: Home, permission: null },
    { 
      name: t('nav.inventory'), 
      icon: Package, 
      permission: null,
      children: [
        { name: t('nav.kitchen'), href: '/inventory/kitchen', icon: ChefHat },
        { name: t('nav.bar'), href: '/inventory/bar', icon: Wine },
        { name: t('nav.cleaning'), href: '/inventory/cleaning', icon: Sparkles },
        { name: t('nav.history'), href: '/inventory/history', icon: History },
        { name: t('nav.templates'), href: '/admin/templates', icon: Package },
        { name: `--- ${t('nav.productsSeparator')} ---`, disabled: true },
        { name: t('nav.catalog'), href: '/inventory/catalog', icon: Package },
      ]
    },
    {
      name: t('nav.shifts'),
      icon: CalendarClock,
      permission: null,
      children: [
        { name: t('nav.onboarding'), href: '/onboarding/rota', icon: CalendarClock, permission: 'shifts:manage', badge: 'NEW' },
        { name: t('nav.planner'), href: '/planner', icon: CalendarClock, permission: 'shifts:manage' },
        { name: t('nav.myShifts'), href: '/my-shifts', icon: CalendarDays, permission: null },
        { name: t('nav.jobTags'), href: '/staff/job-tags', icon: Tag, permission: 'manage_users', adminOnly: true },
        { name: t('nav.compliance'), href: '/admin/settings/compliance', icon: Shield, permission: 'shifts:manage' },
      ]
    },
    {
      name: t('nav.recipes'),
      icon: ChefHat,
      permission: null,
      children: [
        { name: t('nav.recipesList'), href: '/recipes', icon: ChefHat, permission: null },
      ]
    },
    {
      name: t('finance.nav.financialHub'),
      icon: DollarSign,
      permission: 'finance:view',
      children: [
        { name: t('finance.nav.dashboard'), href: '/admin/finance/dashboard', icon: TrendingUp, permission: 'finance:view' },
        { name: t('finance.nav.newClosure'), href: '/admin/finance/closures/new', icon: Plus, permission: 'finance:create' },
        { name: t('finance.nav.closureHistory'), href: '/admin/finance/closures/history', icon: History, permission: 'finance:view' },
        { name: t('finance.nav.importCsv'), href: '/admin/finance/import', icon: Upload, permission: 'finance:create' },
        { name: t('finance.nav.paymentMethods'), href: '/admin/finance/settings/payment-methods', icon: CreditCard, permission: 'finance:manage', adminOnly: true },
        { name: t('finance.nav.emailManagement'), href: '/admin/finance/settings/recipients', icon: Mail, permission: 'finance:manage', adminOnly: true },
      ]
    },
    { name: t('nav.admin'), href: '/admin/users', icon: Users, permission: 'manage_users' },
    { name: t('nav.invitations'), href: '/admin/invitations', icon: Users, permission: '*', adminOnly: true },
    { name: t('nav.locations'), href: '/admin/locations', icon: MapPin, permission: 'locations:view', adminOnly: true },
    { name: t('nav.permissionTags'), href: '/permission-tags', icon: Shield, permission: null, platformAdminOnly: true },
    { name: t('nav.emailLogs'), href: '/admin/settings/email-logs', icon: Mail, permission: 'view_settings' },
    { name: t('nav.qa'), href: '/qa', icon: Bug, permission: '*' },
    { name: t('nav.settings'), href: '/settings', icon: Settings, permission: 'view_settings' },
  ]

  const handleLinkClick = () => {
    onNavigate?.()
  }

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => 
      prev.includes(groupName) 
        ? prev.filter(name => name !== groupName)
        : [...prev, groupName]
    );
  };

  const isGroupOpen = (groupName: string) => openGroups.includes(groupName);

  const isActiveInGroup = (children: any[]) => {
    return children?.some(child => pathname === child.href) || false;
  };

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        // Check admin claims
        setIsAdminClaims(isAdminFromClaims(user as any))
        
        // Check platform admin status
        if (user) {
          // Method 1: Check JWT claims for platform admin
          if (user.app_metadata?.platform_admin === true) {
            setIsPlatformAdmin(true)
            return
          }
          
          // Method 2: Check via database query (platform_admins table)
          const { data: platformAdminCheck } = await supabase
            .from('platform_admins')
            .select('user_id')
            .eq('user_id', user.id)
            .limit(1)
          
          setIsPlatformAdmin(!!(platformAdminCheck && platformAdminCheck.length > 0))
        }
      } catch (error) {
        console.error('Failed to check admin status:', error)
        setIsAdminClaims(false)
        setIsPlatformAdmin(false)
      }
    }

    checkAdminStatus()
  }, [supabase])

  return (
    <aside
      aria-label={t('aria.mainNav')}
      className={cn(
        'relative flex h-dvh flex-col border-r border-border/60 bg-card/90 text-sm shadow-sm transition-[width] duration-300 ease-out supports-[backdrop-filter]:backdrop-blur',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center justify-between gap-2 border-b border-border/60 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Image src="/brand/klyra-icon.svg" alt="Klyra" width={24} height={24} className="size-6" priority />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Klyra</h2>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={collapsed ? t('aria.expandNav') : t('aria.collapseNav')}
          onClick={() => setCollapsed(!collapsed)}
          className="size-8 rounded-full text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground"
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Button>
      </div>

      {/* Location Switcher */}
      {locations && locations.length > 0 && (
        <div className="border-b border-border/60 px-3 py-2">
          {!collapsed ? (
            <select
              className="w-full rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={activeLocationId ?? ''}
              onChange={(e) => setActiveLocation?.(e.target.value)}
              aria-label="Select location"
            >
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center justify-center py-1">
              <MapPin className="size-4 text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {permissionsLoading ? (
          <ul className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <li key={i}>
                <Skeleton className="h-9 w-full rounded-xl" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isAdmin = isAdminClaims || can(permissions, '*')
              
              // Check access permissions
              let canAccess = false
              
              if (item.platformAdminOnly) {
                // Platform admin only items
                canAccess = isPlatformAdmin
              } else if (item.adminOnly) {
                // Regular admin only items
                canAccess = isAdmin
              } else {
                // Regular permission-based items
                canAccess = isAdmin || !item.permission || can(permissions, item.permission)
              }

              // Handle group items with children
              if (item.children) {
                const isOpen = isGroupOpen(item.name);
                const hasActiveChild = isActiveInGroup(item.children);

                return (
                  <li key={item.name}>
                    <Collapsible open={isOpen} onOpenChange={() => toggleGroup(item.name)}>
                      <CollapsibleTrigger className={cn(
                        'group flex w-full items-center gap-3 rounded-xl px-3 py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        canAccess
                          ? 'text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground'
                          : 'cursor-not-allowed text-muted-foreground/50',
                        hasActiveChild && 'bg-accent text-accent-foreground shadow-sm'
                      )}>
                        <item.icon className="size-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate text-left">{item.name}</span>
                            <ChevronDown className={cn(
                              "size-4 transition-transform",
                              isOpen ? "rotate-180" : "rotate-0"
                            )} />
                          </>
                        )}
                      </CollapsibleTrigger>
                      
                      {!collapsed && (
                        <CollapsibleContent className="space-y-1 mt-1">
                          {item.children.map((child: any) => {
                            // Handle disabled separator items
                            if (child.disabled) {
                              return (
                                <div
                                  key={child.name}
                                  className="px-3 py-2 pl-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground/60"
                                >
                                  {child.name.replace(/^---\s*/, '').replace(/\s*---$/, '')}
                                </div>
                              );
                            }
                            
                            // Check child permissions
                            const childIsAdmin = isAdminClaims || can(permissions, '*')
                            let childCanAccess = false
                            
                            if (child.platformAdminOnly) {
                              childCanAccess = isPlatformAdmin
                            } else if (child.adminOnly) {
                              childCanAccess = childIsAdmin
                            } else {
                              childCanAccess = childIsAdmin || !child.permission || can(permissions, child.permission)
                            }
                            
                            if (!childCanAccess) return null
                            
                            const isChildActive = pathname === child.href;
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={handleLinkClick}
                                className={cn(
                                  'group flex w-full items-center gap-3 rounded-xl px-3 py-2 pl-10 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                  isChildActive
                                    ? 'bg-accent text-accent-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground'
                                )}
                              >
                                <child.icon className="size-4 shrink-0" />
                                <span className="flex-1 truncate">{child.name}</span>
                                {child.badge && (
                                  <Badge variant="outline" className="text-[10px]">{child.badge}</Badge>
                                )}
                              </Link>
                            );
                          })}
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  </li>
                );
              }
              
              // Handle regular nav items
              const finalHref = item.name === 'Locations' && !isAdmin && canAccess
                ? '/locations/manage'
                : item.href
              const isActive = (pathname === item.href || pathname === finalHref) && canAccess

              return (
                <li key={item.href}>
                  <Link
                    href={canAccess ? finalHref : '#'}
                    aria-disabled={!canAccess}
                    aria-current={isActive ? 'page' : undefined}
                    tabIndex={canAccess ? undefined : -1}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-xl px-3 py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      canAccess
                        ? 'text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground'
                        : 'cursor-not-allowed text-muted-foreground/50',
                      isActive && 'bg-accent text-accent-foreground shadow-sm'
                    )}
                    onClick={(event) => {
                      if (!canAccess) {
                        event.preventDefault()
                      } else {
                        handleLinkClick()
                      }
                    }}
                  >
                    <item.icon className={cn(
                      "size-4 shrink-0",
                      item.platformAdminOnly && canAccess && "text-orange-600"
                    )} />
                    {!collapsed && (
                      <span className="flex-1 truncate">{item.name}</span>
                    )}
                    {!collapsed && item.platformAdminOnly && canAccess && (
                      <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                        {t('nav.platform')}
                      </Badge>
                    )}
                    {!collapsed && !canAccess && (
                      <span className="rounded-full border border-border/60 bg-muted/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('nav.locked')}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </nav>

      <div className="border-t border-border/60 px-4 py-4">
        <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', collapsed ? 'justify-center' : 'justify-start')}>
          <span className="size-2 rounded-full bg-klyra-success" aria-hidden="true" />
          {!collapsed && <span className="font-medium">{t('nav.systemActive')}</span>}
        </div>
      </div>
    </aside>
  )
}