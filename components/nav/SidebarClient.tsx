'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Home,
  Users,
  Bug,
  Database,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
    permission: null,
  },
  {
    name: 'Amministrazione',
    href: '/admin/users',
    icon: Users,
    permission: 'locations.manage_users',
  },
  {
    name: 'QA & Debug',
    href: '/qa',
    icon: Bug,
    permission: 'manage_users',
  },
  {
    name: 'Moduli',
    href: '/modules',
    icon: Database,
    permission: 'locations.view',
  },
]

export default function SidebarClient() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { hasPermission, context } = useAppStore()

  return (
    <div
      className={cn(
        'bg-card border-r border-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          {!collapsed && (
            <div>
              <h2 className="text-lg font-semibold">Staff Management</h2>
              <p className="text-xs text-muted-foreground">Multi-tenant System</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 p-0"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Context Info */}
        {!collapsed && context.location_name && (
          <div className="p-4 border-b border-border">
            <Badge variant="secondary" className="w-full justify-center">
              {context.location_name}
            </Badge>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-2 p-4">
          {navigation.map((item) => {
            const canAccess = !item.permission || hasPermission(item.permission)
            if (!canAccess && !collapsed) {
              return null
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  canAccess
                    ? 'hover:bg-accent hover:text-accent-foreground'
                    : 'opacity-50 cursor-not-allowed',
                  pathname === item.href && canAccess
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
                {!collapsed && item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground">Sistema Attivo</span>
              </div>
              {(() => {
                const canSettings = hasPermission('locations.view')
                return (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn('w-full', !canSettings && 'opacity-50 cursor-not-allowed')}
                    asChild
                  >
                    <Link
                      href="/settings"
                      onClick={(e) => {
                        if (!canSettings) e.preventDefault()
                      }}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Impostazioni
                    </Link>
                  </Button>
                )
              })()}
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-2 w-2 rounded-full bg-green-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
