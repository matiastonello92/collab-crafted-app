'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Home,
  Users,
  Bug,
  Settings,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAppStore } from '@/lib/store/unified'
import { can } from '@/lib/permissions'
import { Skeleton } from '@/components/ui/skeleton'
import { useSupabase } from '@/hooks/useSupabase'
import { isAdminFromClaims } from '@/lib/admin/claims'

const navigation: { name: string; href: string; icon: any; permission: string | null; adminOnly?: boolean }[] = [
  { name: 'Dashboard', href: '/', icon: Home, permission: null },
  { name: 'Amministrazione', href: '/admin/users', icon: Users, permission: 'manage_users' },
  { name: 'Inviti', href: '/admin/invitations', icon: Users, permission: '*', adminOnly: true },
  { name: 'Locations', href: '/admin/locations', icon: MapPin, permission: 'locations:view', adminOnly: true },
  { name: 'QA & Debug', href: '/qa', icon: Bug, permission: '*' },
  { name: 'Impostazioni', href: '/settings', icon: Settings, permission: 'view_settings' },
]

export default function SidebarClient() {
  const [collapsed, setCollapsed] = useState(false)
  const [isAdminClaims, setIsAdminClaims] = useState(false)
  const pathname = usePathname()
  const supabase = useSupabase()
  const { permissions, context } = useAppStore()
  const permissionsLoading = useAppStore(state => state.permissionsLoading)

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        setIsAdminClaims(isAdminFromClaims(user as any))
      })
      .catch(() => setIsAdminClaims(false))
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
              const canAccess = isAdmin || !item.permission || can(permissions, item.permission)
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
                    <item.icon className="size-4 shrink-0" />
                    {!collapsed && (
                      <span className="flex-1 truncate">{item.name}</span>
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
