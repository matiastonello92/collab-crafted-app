'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Home,
  Users,
  Flag,
  Settings,
  Database,
  Package,
  Wrench,
  AlertTriangle,
  Truck,
  ShoppingCart,
  CheckSquare,
  MessageSquare,
  AppWindow,
  ChevronLeft,
  ChevronRight,
  Bug,
  Activity
} from 'lucide-react'
import { useAppStore } from '@/lib/store'

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
    permission: null
  },
  {
    name: 'Amministrazione',
    items: [
      {
        name: 'Utenti & Permessi',
        href: '/admin/users',
        icon: Users,
        permission: 'locations.manage_users'
      },
      {
        name: 'Feature Flags',
        href: '/admin/feature-flags',
        icon: Flag,
        permission: 'locations.manage_flags'
      }
    ]
  },
  {
    name: 'QA & Debug',
    items: [
      {
        name: 'Chi sono io?',
        href: '/qa/whoami',
        icon: Bug,
        permission: 'manage_users'  // Admin only
      },
      {
        name: 'Health Check',
        href: '/qa/health',
        icon: Activity,
        permission: 'manage_users'  // Admin only
      }
    ]
  },
  {
    name: 'Moduli',
    items: [
      {
        name: 'Locations',
        href: '/locations',
        icon: Database,
        permission: 'locations.view'
      },
      {
        name: 'Inventario',
        href: '/inventario',
        icon: Package,
        permission: 'inventory.view'
      },
      {
        name: 'Tecnici',
        href: '/tecnici',
        icon: Wrench,
        permission: 'technicians.view'
      },
      {
        name: 'Incidents',
        href: '/incidents',
        icon: AlertTriangle,
        permission: 'incidents.view'
      },
      {
        name: 'Fornitori',
        href: '/fornitori',
        icon: Truck,
        permission: 'suppliers.view'
      },
      {
        name: 'Ordini',
        href: '/ordini',
        icon: ShoppingCart,
        permission: 'orders.view'
      },
      {
        name: 'Task',
        href: '/task',
        icon: CheckSquare,
        permission: 'tasks.view'
      },
      {
        name: 'Chat',
        href: '/chat',
        icon: MessageSquare,
        permission: 'chat.view'
      },
      {
        name: 'API',
        href: '/api-docs',
        icon: AppWindow,
        permission: 'api.view'
      }
    ]
  }
]

export default function SidebarClient() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { hasPermission, context } = useAppStore()

  return (
    <div className={cn(
      "bg-card border-r border-border transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
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
        {!collapsed && context.org_id && (
          <div className="p-4 border-b border-border">
            <div className="space-y-2">
              <Badge variant="outline" className="w-full justify-center">
                Demo Organization
              </Badge>
              <Badge variant="secondary" className="w-full justify-center">
                {context.location_id ? 'Lyon' : 'Tutte le location'}
              </Badge>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-2 p-4">
          {navigation.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {section.name && !collapsed && (
                <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.name}
                </h3>
              )}

              {section.href ? (
                // Single item
                <Link
                  href={section.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    pathname === section.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                  )}
                >
                  <section.icon className="h-4 w-4" />
                  {!collapsed && section.name}
                </Link>
              ) : (
                // Section with items
                <div className="space-y-1">
                  {section.items?.map((item) => {
                    const canAccess = !item.permission || hasPermission(item.permission)

                    if (!canAccess && !collapsed) {
                      return null // Hide inaccessible items when expanded
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          canAccess
                            ? "hover:bg-accent hover:text-accent-foreground"
                            : "opacity-50 cursor-not-allowed",
                          pathname === item.href && canAccess
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground",
                        )}
                        onClick={(e) => {
                          if (!canAccess) {
                            e.preventDefault()
                          }
                        }}
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && (
                          <span className="flex-1">{item.name}</span>
                        )}
                        {!collapsed && !canAccess && (
                          <Badge variant="secondary" className="text-xs">
                            Bloccato
                          </Badge>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}

              {sectionIndex < navigation.length - 1 && !collapsed && (
                <Separator className="my-4" />
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground">Sistema Attivo</span>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                Impostazioni
              </Button>
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

