import { Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Shield, Users, Settings, AlertTriangle } from 'lucide-react'
import { requirePlatformAdmin } from '@/lib/guards/requirePlatformAdmin'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { UsersTable } from './_components/UsersTable'
import { ModulesMatrix } from './_components/ModulesMatrix'
import { getUsersWithTags, getModulePermissionsMatrix } from './actions'

// Loading components
function UsersTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ModulesMatrixSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-80" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <div className="flex space-x-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Data fetching components
async function UsersTableWrapper({ searchParams }: { searchParams: URLSearchParams }) {
  const result = await getUsersWithTags(searchParams)
  
  if (!result.success) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Error Loading Users
          </CardTitle>
          <CardDescription>
            {result.error}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }
  
  const { users, totalCount, page, pageSize, totalPages } = result.data
  
  return (
    <UsersTable
      initialUsers={users}
      totalCount={totalCount}
      currentPage={page}
      pageSize={pageSize}
      totalPages={totalPages}
    />
  )
}

async function ModulesMatrixWrapper() {
  const result = await getModulePermissionsMatrix()
  
  if (!result.success) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Error Loading Permissions Matrix
          </CardTitle>
          <CardDescription>
            {result.error}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }
  
  return <ModulesMatrix initialPermissions={result.data} />
}

// Platform Admin info component
async function PlatformAdminInfo() {
  const { user } = await requirePlatformAdmin()
  
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Shield className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <CardTitle className="text-orange-800">Platform Admin Access</CardTitle>
            <CardDescription className="text-orange-700">
              Signed in as: <strong>{user.email}</strong>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}

// Main page component
export default async function PermissionTagsPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Ensure platform admin access
  await requirePlatformAdmin()
  
  // Convert searchParams to URLSearchParams
  const urlSearchParams = new URLSearchParams()
  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === 'string') {
      urlSearchParams.set(key, value)
    } else if (Array.isArray(value)) {
      urlSearchParams.set(key, value[0])
    }
  })
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Permission Tags</h1>
          <p className="text-muted-foreground mt-1">
            Manage user permission tags and module access controls
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Platform Admin Only
        </Badge>
      </div>

      {/* Platform Admin Info */}
      <Suspense fallback={<Skeleton className="h-20 w-full" />}>
        <PlatformAdminInfo />
      </Suspense>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users Management
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Modules Matrix
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Suspense fallback={<UsersTableSkeleton />}>
            <UsersTableWrapper searchParams={urlSearchParams} />
          </Suspense>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-4">
          <Suspense fallback={<ModulesMatrixSkeleton />}>
            <ModulesMatrixWrapper />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              <strong>Permission Tags:</strong> Admin (full access) • Manager (management access) • Base (basic access)
            </p>
            <p className="mt-1">
              Changes are applied immediately and respect Row Level Security (RLS) policies.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}