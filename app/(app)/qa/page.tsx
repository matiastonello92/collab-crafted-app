import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { requireAdmin } from '@/lib/admin/guards'
import { 
  Bug, 
  User, 
  Database, 
  Activity, 
  Shield, 
  Clock,
  CheckCircle,
  AlertCircle 
} from 'lucide-react'
import Link from 'next/link'

export default async function QAPage() {
  // Only admins can access QA tools
  await requireAdmin()

  const qaTools = [
    {
      title: 'Health Check',
      description: 'Verifica stato dei servizi',
      href: '/qa/health',
      icon: Activity,
      status: 'operational'
    },
    {
      title: 'Who Am I',
      description: 'Informazioni utente corrente',
      href: '/qa/whoami', 
      icon: User,
      status: 'operational'
    },
    {
      title: 'Database Status',
      description: 'Stato connessioni DB',
      href: '#',
      icon: Database,
      status: 'maintenance',
      disabled: true
    },
    {
      title: 'Permission Debug',
      description: 'Debug sistema permessi',
      href: '#',
      icon: Shield,
      status: 'development',
      disabled: true
    }
  ]

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'operational': return 'default'
      case 'maintenance': return 'secondary'
      case 'development': return 'outline'
      default: return 'destructive'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return CheckCircle
      case 'maintenance': return Clock
      case 'development': return Bug
      default: return AlertCircle
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">QA & Debug Tools</h1>
        <p className="text-muted-foreground">
          Strumenti di debugging e quality assurance per amministratori
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {qaTools.map((tool) => {
          const StatusIcon = getStatusIcon(tool.status)
          
          return (
            <Card key={tool.title} className={tool.disabled ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <tool.icon className="h-8 w-8 text-primary" />
                  <Badge variant={getStatusVariant(tool.status)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {tool.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {tool.disabled ? (
                  <Button variant="outline" className="w-full" disabled>
                    In Sviluppo
                  </Button>
                ) : (
                  <Button asChild className="w-full">
                    <Link href={tool.href}>
                      Accedi
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Informazioni Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Environment</h4>
              <p className="text-muted-foreground">
                Next.js 15 + Supabase + TypeScript
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Build Mode</h4>
              <p className="text-muted-foreground">
                {process.env.NODE_ENV || 'development'}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Database</h4>
              <p className="text-muted-foreground">
                PostgreSQL via Supabase
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Auth Provider</h4>
              <p className="text-muted-foreground">
                Supabase Auth
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}