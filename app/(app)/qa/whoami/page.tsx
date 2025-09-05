import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, Shield, MapPin, Key, Clock } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/guards'
import { getUserById, getUserRolesByLocation, getUserPermissionOverrides } from '@/lib/data/admin'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export default async function QAWhoAmIPage() {
  // Guard: require admin permissions
  const currentUserId = await requireAdmin()

  // Get current user details
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">Authentication error: {authError?.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch user data using admin functions
  const [userProfile, rolesByLocation, permissionOverrides] = await Promise.all([
    getUserById(user.id),
    getUserRolesByLocation(user.id), 
    getUserPermissionOverrides(user.id)
  ])

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-8 w-8" />
            QA: Chi sono io?
          </h1>
          <p className="text-muted-foreground">
            Informazioni di debug per l'utente corrente
          </p>
        </div>
      </div>

      {/* Auth Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Informazioni Autenticazione
          </CardTitle>
          <CardDescription>
            Dati dalla sessione Supabase Auth
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">User ID</label>
              <p className="text-sm font-mono break-all">{user.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-sm">{user.email || 'N/D'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email Verificata</label>
              <Badge variant={user.email_confirmed_at ? 'default' : 'secondary'}>
                {user.email_confirmed_at ? 'Sì' : 'No'}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Ultimo Login</label>
              <p className="text-sm">
                {user.last_sign_in_at 
                  ? new Date(user.last_sign_in_at).toLocaleString('it-IT')
                  : 'N/D'
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Creato il</label>
              <p className="text-sm">
                {user.created_at 
                  ? new Date(user.created_at).toLocaleString('it-IT')
                  : 'N/D'
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Provider</label>
              <p className="text-sm">{user.app_metadata?.provider || 'email'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Info */}
      {userProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Profilo Utente</CardTitle>
            <CardDescription>
              Dati dalla tabella user_profiles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome</label>
                <p className="text-sm">{userProfile.first_name || 'N/D'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cognome</label>
                <p className="text-sm">{userProfile.last_name || 'N/D'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Stato</label>
                <Badge variant={userProfile.is_active ? 'default' : 'secondary'}>
                  {userProfile.is_active ? 'Attivo' : 'Inattivo'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Roles by Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Ruoli per Location
          </CardTitle>
          <CardDescription>
            Ruoli assegnati da user_roles_locations ({rolesByLocation.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rolesByLocation.length === 0 ? (
            <p className="text-muted-foreground">Nessun ruolo assegnato</p>
          ) : (
            <div className="space-y-3">
              {rolesByLocation.map((role, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Badge variant="secondary" className="mr-2">
                        {role.role_display_name}
                      </Badge>
                      <Badge variant="outline">
                        Livello {role.role_level}
                      </Badge>
                    </div>
                    <Badge variant={role.is_active ? 'default' : 'secondary'}>
                      {role.is_active ? 'Attivo' : 'Inattivo'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Location:</strong> {role.location_name}</p>
                    <p><strong>Assegnato il:</strong> {
                      role.assigned_at 
                        ? new Date(role.assigned_at).toLocaleString('it-IT')
                        : 'N/D'
                    }</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Overrides */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Override Permessi
          </CardTitle>
          <CardDescription>
            Permessi specificatamente concessi o negati da user_permissions ({permissionOverrides.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {permissionOverrides.length === 0 ? (
            <p className="text-muted-foreground">Nessun override specifico</p>
          ) : (
            <div className="space-y-3">
              {permissionOverrides.map((override, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium">{override.permission_display_name}</span>
                      <Badge variant="outline" className="ml-2">
                        {override.permission_category}
                      </Badge>
                    </div>
                    <Badge variant={override.granted ? 'default' : 'destructive'}>
                      {override.granted ? 'Concesso' : 'Negato'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Permesso:</strong> {override.permission_name}</p>
                    {override.location_name && (
                      <p><strong>Location:</strong> {override.location_name}</p>
                    )}
                    <p><strong>Concesso il:</strong> {
                      override.granted_at 
                        ? new Date(override.granted_at).toLocaleString('it-IT')
                        : 'N/D'
                    }</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Raw Data for Debug */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Dati Raw (Debug)
          </CardTitle>
          <CardDescription>
            JSON completo per debugging tecnico
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
            {JSON.stringify({
              auth_user: {
                id: user.id,
                email: user.email,
                email_confirmed_at: user.email_confirmed_at,
                last_sign_in_at: user.last_sign_in_at,
                created_at: user.created_at,
                app_metadata: user.app_metadata,
                user_metadata: user.user_metadata
              },
              user_profile: userProfile,
              roles_by_location: rolesByLocation,
              permission_overrides: permissionOverrides,
              timestamp: new Date().toISOString()
            }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
