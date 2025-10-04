import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, User, Shield, Activity, Settings, Mail, Tag, AlertTriangle } from 'lucide-react'
import RolesByLocationPanel from './components/RolesByLocationPanel'
import PermissionOverridesPanel from './components/PermissionOverridesPanel'
import ActivityPanel from './components/ActivityPanel'
import JobTagsPanel from './components/JobTagsPanel'
import { CompliancePanel } from './components/CompliancePanel'
import { UserOverview } from './components/UserOverview'
import { EffectivePermissions } from './components/EffectivePermissions'
import { DeleteUserDialog } from './components/DeleteUserDialog'
import { getUserById, getUserRolesByLocation, getUserPermissionOverrides } from '@/lib/data/admin'
import { requireOrgAdmin } from '@/lib/admin/guards'
import { UserDetailSkeleton } from '@/components/ui/loading-skeleton'
import { t } from '@/lib/i18n'

interface Props {
  params: {
    id: string
  }
}

export default async function UserDetailPage({ params }: Props) {
  // Guard: require admin permissions
  await requireOrgAdmin()
  
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

  // Extract locations and top roles for overview
  const userLocations = Array.from(new Set(
    rolesByLocation.map(r => r.location_name).filter(Boolean)
  )).map((name, index) => ({ id: index.toString(), name }))

  const topRoles = Array.from(new Set(
    rolesByLocation.map(r => ({ name: r.role_name, display_name: r.role_display_name }))
      .filter(r => r.name)
  ))

  const userForOverview = {
    id: user.id,
    name: getFullName(),
    email: user.email || '',
    phone: undefined, // Not available in UserWithDetails
    avatar_url: undefined, // Not available in UserWithDetails  
    created_at: user.created_at || new Date().toISOString(),
    is_active: user.is_active ?? true,
    last_activity: undefined, // Not available in UserWithDetails
    email_confirmed: true // We don't have this field in our schema, defaulting to true
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
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-8 w-8" />
            {getFullName()}
          </h1>
          <p className="text-muted-foreground">
            {user.email} • ID: {user.id.slice(0, 8)}...
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <Mail className="h-4 w-4 mr-2" />
            Resend Invito
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Settings className="h-4 w-4 mr-2" />
            Gestisci Ruoli
          </Button>
          <DeleteUserDialog 
            userId={user.id}
            userEmail={user.email || ''}
            userName={getFullName()}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">{t('admin.tabOverview')}</TabsTrigger>
          <TabsTrigger value="roles">{t('admin.tabRolesLocation')}</TabsTrigger>
          <TabsTrigger value="job-tags">{t('admin.tabJobTags')}</TabsTrigger>
          <TabsTrigger value="permissions">{t('admin.tabPermissions')}</TabsTrigger>
          <TabsTrigger value="compliance">{t('admin.tabCompliance')}</TabsTrigger>
          <TabsTrigger value="activity">{t('admin.tabActivity')}</TabsTrigger>
          <TabsTrigger value="security">{t('admin.tabSecurity')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <UserOverview 
            user={userForOverview}
            locations={userLocations}
            topRoles={topRoles}
          />
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <Suspense fallback={<div>{t('admin.loadingRoles')}</div>}>
            <RolesByLocationPanel 
              roles={rolesByLocation} 
              userId={params.id}
              onUpdate={() => window.location.reload()} 
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="job-tags" className="mt-6">
          <div className="space-y-6">
            {userLocations.map(location => (
              <JobTagsPanel
                key={location.id}
                userId={params.id}
                locationId={rolesByLocation.find(r => r.location_name === location.name)?.location_id || ''}
                locationName={location.name}
              />
            ))}
            {userLocations.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  {t('admin.userNotAssignedToLocation')}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <EffectivePermissions userId={params.id} />
        </TabsContent>

        <TabsContent value="compliance" className="mt-6">
          <CompliancePanel userId={params.id} />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Suspense fallback={<div>{t('admin.loadingActivity')}</div>}>
            <ActivityPanel userId={params.id} />
          </Suspense>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.accountSecurity')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{t('admin.activeSessions')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.manageActiveSessionsDesc')}
                    </p>
                  </div>
                  <Button variant="outline" disabled>
                    {t('admin.revokeAll')}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{t('admin.resetPassword')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.sendResetEmail')}
                    </p>
                  </div>
                  <Button variant="outline" disabled>
                    {t('admin.sendReset')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}