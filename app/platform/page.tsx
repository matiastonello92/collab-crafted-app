import { redirect } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/admin/guards'
import { createSupabaseUserClient } from '@/lib/supabase/clients'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Users, Building2, Mail, Activity, AlertTriangle } from 'lucide-react'

export default async function PlatformAdminPage() {
  // Platform admin guard
  await requirePlatformAdmin()

  const supabase = await createSupabaseUserClient()

  // Gather statistics
  const [
    { count: totalOrgs },
    { count: totalUsers },
    { count: recentMemberships },
    { count: pendingInvites },
    healthResponse,
    recentOrgs
  ] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }).then(r => ({ count: r.count || 0 })),
    Promise.resolve({ count: 'N/A' }), // Placeholder for user count
    supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .then(r => ({ count: r.count || 0 })),
    supabase
      .from('invitations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(r => ({ count: r.count || 0 })),
    fetch(process.env.NODE_ENV === 'development' ? 'http://localhost:3000/api/healthz' : `https://jwchmdivuwgfjrwvgtia.supabase.co/api/healthz`)
      .then(r => r.json())
      .catch(() => ({ status: 'error', error: 'Failed to fetch' })),
    supabase
      .from('organizations')
      .select(`
        org_id,
        name,
        slug,
        created_at,
        memberships!inner(user_id),
        locations!inner(id)
      `)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(r => r.data || [])
  ])

  // Rate limit blocks (if audit_events exists)
  let rateLimitBlocks = 'N/A'
  try {
    const { count } = await supabase
      .from('audit_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_key', 'rate_limit.blocked')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    rateLimitBlocks = count?.toString() || '0'
  } catch {
    // Table might not exist
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Platform Admin Console</h1>
          <p className="text-muted-foreground">
            Panoramica e gestione della piattaforma multi-tenant
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenants Totali</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrgs}</div>
            <p className="text-xs text-muted-foreground">
              Organizzazioni attive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utenti Totali</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Utenti registrati
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membership 7gg</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentMemberships}</div>
            <p className="text-xs text-muted-foreground">
              Nuove assegnazioni
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inviti Pendenti</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvites}</div>
            <p className="text-xs text-muted-foreground">
              Da accettare
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Health and Rate Limit Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Health Status
              <Badge variant={healthResponse.status === 'ok' ? 'default' : 'destructive'}>
                {healthResponse.status?.toUpperCase() || 'ERROR'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Stato dei servizi core
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-2 rounded">
              {JSON.stringify(healthResponse, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limit Blocks 24h</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rateLimitBlocks}</div>
            <p className="text-xs text-muted-foreground">
              Richieste bloccate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Organizations */}
      <Card>
        <CardHeader>
          <CardTitle>Organizzazioni Recenti</CardTitle>
          <CardDescription>
            Ultime 10 organizzazioni create
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrgs.map((org: any) => (
              <div key={org.org_id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{org.name}</div>
                  <div className="text-sm text-muted-foreground">/{org.slug}</div>
                </div>
                <div className="text-right text-sm">
                  <div>{org.memberships?.length || 0} membri</div>
                  <div>{org.locations?.length || 0} sedi</div>
                  <div className="text-muted-foreground">
                    {new Date(org.created_at).toLocaleDateString('it-IT')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}