'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, User, Mail, Settings, Calendar } from 'lucide-react'
import { Suspense } from 'react'
import RolesByLocationPanel from './components/RolesByLocationPanel'
import ActivityPanel from './components/ActivityPanel'
import JobTagsPanel from './components/JobTagsPanel'
import { CompliancePanel } from './components/CompliancePanel'
import { UserOverview } from './components/UserOverview'
import { EffectivePermissions } from './components/EffectivePermissions'
import { DeleteUserDialog } from './components/DeleteUserDialog'
import { ContractsSchedulingPanel } from './components/ContractsSchedulingPanel'
import { useTranslation } from '@/lib/i18n'

interface UserDetailClientProps {
  user: {
    id: string
    email: string | null
    first_name?: string | null
    last_name?: string | null
    created_at?: string | null
    is_active?: boolean | null
    is_schedulable?: boolean | null
  }
  rolesByLocation: any[]
  userForOverview: {
    id: string
    name: string
    email: string
    phone: undefined
    avatar_url: undefined
    created_at: string
    is_active: boolean
    last_activity: undefined
    email_confirmed: boolean
  }
  userLocations: Array<{ id: string; name: string }>
  topRoles: Array<{ name: string; display_name: string }>
}

export default function UserDetailClient({
  user,
  rolesByLocation,
  userForOverview,
  userLocations,
  topRoles
}: UserDetailClientProps) {
  const { t } = useTranslation()

  const getFullName = () => {
    const parts = [user.first_name, user.last_name].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : t('admin.nameNotAvailable')
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('admin.backToList')}
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
            {t('admin.resendInvite')}
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Settings className="h-4 w-4 mr-2" />
            {t('admin.manageRoles')}
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
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">{t('admin.tabOverview')}</TabsTrigger>
          <TabsTrigger value="roles">{t('admin.tabRolesLocation')}</TabsTrigger>
          <TabsTrigger value="job-tags">{t('admin.tabJobTags')}</TabsTrigger>
          <TabsTrigger value="contracts">
            <Calendar className="h-4 w-4 mr-2" />
            {t('admin.tabContracts')}
          </TabsTrigger>
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
              userId={user.id}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="job-tags" className="mt-6">
          <div className="space-y-6">
            {userLocations.map(location => (
              <JobTagsPanel
                key={location.id}
                userId={user.id}
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

        <TabsContent value="contracts" className="mt-6">
          <ContractsSchedulingPanel 
            userId={user.id}
            isSchedulable={user.is_schedulable ?? false}
            userFullName={getFullName()}
          />
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <EffectivePermissions userId={user.id} />
        </TabsContent>

        <TabsContent value="compliance" className="mt-6">
          <CompliancePanel userId={user.id} />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Suspense fallback={<div>{t('admin.loadingActivity')}</div>}>
            <ActivityPanel userId={user.id} />
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
