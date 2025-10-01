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
} from 'lucide-react'
import { useHydratedStore } from '@/lib/store/useHydratedStore'
import { can } from '@/lib/permissions'
import { Skeleton } from '@/components/ui/skeleton'
import { useSupabase } from '@/hooks/useSupabase'
import { isAdminFromClaims } from '@/lib/admin/claims'

const navigation: any[] = [
  { name: 'Dashboard', href: '/', icon: Home, permission: null },
  { 
    name: 'Inventari', 
    icon: Package, 
    permission: null,
    children: [
      { name: 'Cucina', href: '/inventory/kitchen', icon: ChefHat },
      { name: 'Bar', href: '/inventory/bar', icon: Wine },
      { name: 'Pulizie', href: '/inventory/cleaning', icon: Sparkles },
      { name: 'Storico', href: '/inventory/history', icon: History },
      { name: 'Gestione Template', href: '/admin/templates', icon: Package },
      { name: '--- Prodotti ---', disabled: true },
      { name: 'Catalogo Prodotti', href: '/inventory/catalog', icon: Package },
    ]
  },
  { name: 'Planner Turni', href: '/planner', icon: CalendarClock, permission: 'shifts:manage' },
  { name: 'I miei Turni', href: '/my-shifts', icon: CalendarDays, permission: null },
  { name: 'Amministrazione', href: '/admin/users', icon: Users, permission: 'manage_users' },
  { name: 'Inviti', href: '/admin/invitations', icon: Users, permission: '*', adminOnly: true },
  { name: 'Locations', href: '/admin/locations', icon: MapPin, permission: 'locations:view', adminOnly: true },
  { name: 'Permission Tags', href: '/permission-tags', icon: Shield, permission: null, platformAdminOnly: true },
  { name: 'Compliance Settings', href: '/admin/settings/compliance', icon: Shield, permission: 'shifts:manage' },
  { name: 'Email Logs', href: '/admin/settings/email-logs', icon: Mail, permission: 'view_settings' },
  { name: 'QA & Debug', href: '/qa', icon: Bug, permission: '*' },
  { name: 'Impostazioni', href: '/settings', icon: Settings, permission: 'view_settings' },
]

export default function SidebarClient() {
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<string[]>([])
  const [isAdminClaims, setIsAdminClaims] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const pathname = usePathname()
  const supabase = useSupabase()
  const { permissions, context, permissionsLoading } = useHydratedStore()

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
      aria-label="Navigazione principale"
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
          aria-label={collapsed ? 'Espandi menu di navigazione' : 'Comprimi menu di navigazione'}
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

      {!collapsed && context.location_name && (
        <div className="border-b border-border/60 px-4 py-3">
          <Badge variant="secondary" className="w-full justify-center rounded-full border border-border/60 bg-muted/60 text-[11px] font-semibold uppercase tracking-wide">
            {context.location_name}
          </Badge>
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
                            
                            const isChildActive = pathname === child.href;
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                  'group flex w-full items-center gap-3 rounded-xl px-3 py-2 pl-10 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                  isChildActive
                                    ? 'bg-accent text-accent-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground'
                                )}
                              >
                                <child.icon className="size-4 shrink-0" />
                                <span className="flex-1 truncate">{child.name}</span>
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
                        Platform
                      </Badge>
                    )}
                    {!collapsed && !canAccess && (
                      <span className="rounded-full border border-border/60 bg-muted/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Bloccato
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
          {!collapsed && <span className="font-medium">Sistema Attivo</span>}
        </div>
      </div>
    </aside>
  )
}