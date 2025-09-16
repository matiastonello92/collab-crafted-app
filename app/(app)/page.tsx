'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Users, Shield, Flag, Database, Settings, Activity } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppStore } from '@/lib/store'
import { useRequireSession } from '@/lib/useRequireSession'
import { can } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  useRequireSession()
  const { context, permissions } = useAppStore()

  // Mock stats for demonstration
  const stats = [
    {
      title: 'Utenti Attivi',
      value: '24',
      description: 'Utenti registrati nel sistema',
      icon: Users,
      trend: '+12%'
    },
    {
      title: 'Locations',
      value: '2',
      description: 'Lyon, Menton',
      icon: Database,
      trend: 'Stabile'
    },
    {
      title: 'Feature Flags',
      value: '8',
      description: '6 attivi, 2 inattivi',
      icon: Flag,
      trend: '+2 questa settimana'
    },
    {
      title: 'Permessi',
      value: '23',
      description: 'Permessi configurati',
      icon: Shield,
      trend: 'Aggiornati'
    }
  ]

  type QuickAction = {
    title: string
    description: string
    href: string
    icon: any
    permission: string | string[]
  }

  const quickActions: QuickAction[] = [
    {
      title: 'Gestisci Utenti',
      description: 'Amministra utenti e permessi',
      href: '/admin/users',
      icon: Users,
      permission: 'manage_users'
    },
    {
      title: 'Feature Flags',
      description: 'Configura funzionalità per moduli',
      href: '/admin/feature-flags',
      icon: Flag,
      permission: 'flags:view'
    },
    {
      title: 'Impostazioni',
      description: 'Configurazioni generali',
      href: '/settings',
      icon: Settings,
      permission: 'view_settings'
    }
  ]

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Image src="/brand/klyra-logo.svg" alt="Klyra" width={132} height={32} className="h-8 w-auto" priority />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Klyra
          </h1>
          <p className="text-muted-foreground mt-2">
            Piattaforma avanzata per la gestione del personale multi-location
          </p>
          {context.location_name && (
            <div className="flex gap-2 mt-4">
              <Badge variant="outline" className="border-primary/40 text-primary">
                Location: {context.location_name}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-success" />
          <span className="text-sm text-muted-foreground">Sistema Operativo</span>
        </div>
      </div>



      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </div>
                <stat.icon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="mt-4">
                <Badge variant="secondary" className="text-xs">
                  {stat.trend}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Azioni Rapide</CardTitle>
          <CardDescription>
            Accedi rapidamente alle funzioni principali del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action, index) => {
                const canAccess = can(permissions, action.permission)
                
                return (
                  <Card key={index} className={!canAccess ? 'opacity-50' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-3">
                        <action.icon className="h-6 w-6" />
                        <h3 className="font-semibold">{action.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {action.description}
                      </p>
                      {canAccess ? (
                        <Button asChild className="w-full" variant="brand">
                          <Link href={action.href}>
                            Accedi
                          </Link>
                        </Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button disabled className="w-full">
                              Accesso Negato
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Non hai i permessi necessari per accedere a questa sezione</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>Stato del Sistema</CardTitle>
          <CardDescription>
            Monitoraggio dei servizi principali
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span>Database Supabase</span>
              </div>
              <Badge variant="secondary">Operativo</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span>Storage</span>
              </div>
              <Badge variant="secondary">Operativo</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span>Edge Functions</span>
              </div>
              <Badge variant="secondary">Operativo</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-warning" />
                <span>Email Service (Resend)</span>
              </div>
              <Badge variant="outline" className="border-warning/40 text-warning">
                Test Richiesto
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
