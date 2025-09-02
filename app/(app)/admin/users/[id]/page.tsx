import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, User, Shield, Activity } from 'lucide-react'
import RolesByLocationPanel from './components/RolesByLocationPanel'
import PermissionOverridesPanel from './components/PermissionOverridesPanel'
import ActivityPanel from './components/ActivityPanel'
import { getUserById, getUserRolesByLocation, getUserPermissionOverrides } from '@/lib/data/admin'
import { requireAdmin } from '@/lib/admin/guards'
import { UserDetailSkeleton } from '@/components/ui/loading-skeleton'

interface Props {
  params: {
    id: string
  }
}

export default async function UserDetailPage({ params }: Props) {
  // Guard: require admin permissions
  await requireAdmin()
  
  const user = await getUserById(params.id)
  
  if (!user) {
    notFound()
  }

  const [rolesByLocation, permissionOverrides] = await Promise.all([
    getUserRolesByLocation(params.id),
    getUserPermissionOverrides(params.id)
  ])

  const getFullName = () => {
    const parts = [user.first_name, user.last_name].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : 'Nome non disponibile'
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla lista
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-8 w-8" />
            {getFullName()}
          </h1>
          <p className="text-muted-foreground">
            {user.email} • ID: {user.id.slice(0, 8)}...
          </p>
        </div>
      </div>

      {/* User Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Utente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-sm">{user.email || 'N/D'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome</label>
              <p className="text-sm">{getFullName()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Stato</label>
              <div className="flex items-center gap-2">
                <Badge variant={user.is_active ? 'default' : 'secondary'}>
                  {user.is_active ? 'Attivo' : 'Inattivo'}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Registrato</label>
              <p className="text-sm">
                {user.created_at 
                  ? new Date(user.created_at).toLocaleDateString('it-IT')
                  : 'N/D'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Three Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Panel 1: Roles by Location */}
        <Suspense fallback={<div>Caricamento ruoli...</div>}>
          <RolesByLocationPanel 
            roles={rolesByLocation} 
            userId={params.id}
            onUpdate={() => window.location.reload()} 
          />
        </Suspense>
        
        {/* Panel 2: Permission Overrides */}
        <Suspense fallback={<div>Caricamento permessi...</div>}>
          <PermissionOverridesPanel 
            overrides={permissionOverrides} 
            userId={params.id}
            onUpdate={() => window.location.reload()} 
          />
        </Suspense>
        
        {/* Panel 3: Activity */}
        <Suspense fallback={<div>Caricamento attività...</div>}>
          <ActivityPanel userId={params.id} />
        </Suspense>
      </div>
    </div>
  )
}