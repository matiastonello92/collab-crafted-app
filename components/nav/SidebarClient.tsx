'use client'

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
import { useAppStore } from '@/lib/store'
import { can } from '@/lib/permissions'
import { Skeleton } from '@/components/ui/skeleton'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'
import { isAdminFromClaims } from '@/lib/admin/claims'

const navigation: { name: string; href: string; icon: any; permission: string | null; adminOnly?: boolean }[] = [
  { name: 'Dashboard', href: '/', icon: Home, permission: null },
  { name: 'Amministrazione', href: '/admin/users', icon: Users, permission: 'manage_users' },
  { name: 'Inviti', href: '/admin/invitations', icon: Users, permission: '*', adminOnly: true },
  { name: 'Locations', href: '/admin/locations', icon: MapPin, permission: 'locations:view', adminOnly: true },
  { name: 'Console Admin', href: '/admin/settings', icon: Settings, permission: '*', adminOnly: true },
  { name: 'QA & Debug', href: '/qa', icon: Bug, permission: '*' },
  { name: 'Impostazioni', href: '/settings', icon: Settings, permission: 'view_settings' },
]

export default function SidebarClient() {
  const [collapsed, setCollapsed] = useState(false)
  const [isAdminClaims, setIsAdminClaims] = useState(false)
  const pathname = usePathname()
  const { permissions, context } = useAppStore()
  const permissionsLoading = useAppStore(state => state.permissionsLoading)

  // Read admin claims once to avoid depending on scoped perms
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAdminClaims(isAdminFromClaims(user as any))
    }).catch(() => setIsAdminClaims(false))
  }, [])

  return (
    <div
      className={cn(
        'bg-card border-r border-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <img src="/brand/klyra-icon.svg" alt="Klyra" className="h-6 w-6" />
              <h2 className="text-lg font-semibold bg-gradient-to-r from-klyra-primary to-klyra-accent bg-clip-text text-transparent">
                Klyra
              </h2>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 p-0 hover:bg-accent"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {!collapsed && context.location_name && (
          <div className="p-4 border-b border-border">
            <Badge variant="secondary" className="w-full justify-center">
              {context.location_name}
            </Badge>
          </div>
        )}

        <nav className="flex-1 space-y-2 p-4">
          {permissionsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            navigation.map((item) => {
              const isAdmin = isAdminClaims || can(permissions, '*')
              const canAccess = isAdmin || !item.permission || can(permissions, item.permission)
              const finalHref = item.name === 'Locations' && !isAdmin && canAccess 
                ? '/locations/manage' 
                : item.href

              return (
                <Link
                  key={item.href}
                  href={canAccess ? finalHref : '#'}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    canAccess
                      ? 'hover:bg-accent hover:text-accent-foreground'
                      : 'opacity-50 cursor-not-allowed',
                    (pathname === item.href || pathname === finalHref) && canAccess
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground'
                  )}
                  onClick={(e) => {
                    if (!canAccess) {
                      e.preventDefault()
                    }
                  }}
                >
                  <item.icon className="h-4 w-4" />
                  {!collapsed && <span className="flex-1">{item.name}</span>}
                  {!collapsed && !canAccess && (
                    <Badge variant="secondary" className="text-xs">
                      Bloccato
                    </Badge>
                  )}
                </Link>
              )
            })
          )}
        </nav>

        <div className="border-t border-border p-4">
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-klyra-success" />
              <span className="text-xs text-muted-foreground">Sistema Attivo</span>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-2 w-2 rounded-full bg-klyra-success" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
