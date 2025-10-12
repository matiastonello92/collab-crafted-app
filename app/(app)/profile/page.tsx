import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { UserProfileClient } from './UserSettingsClient'
import { orgHasFeature } from '@/lib/server/features'

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.warn('[PROFILE] no user')
    redirect('/login')
  }

  // Load user profile including org_id for storage context
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  // Don't redirect if profile missing - create soft placeholder
  let orgId = profile?.org_id
  if (!profile) {
    console.warn('[PROFILE] no profile for user', user.id)
  }
  if (!orgId) {
    console.warn('[PROFILE] no org_id for user', user.id)
  }

  // Check branding feature for avatar uploads
  const canBranding = orgId ? await orgHasFeature(orgId, 'branding') : false

  // Fetch user roles and locations for the "Roles & Access" tab
  const { data: rolesData } = await supabase
    .from('user_roles_locations')
    .select(`
      assigned_at,
      is_active,
      roles!inner (
        name,
        display_name
      ),
      locations (
        id,
        name
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)

  const roles = rolesData?.map(assignment => ({
    role_name: (assignment.roles as any).name,
    role_display_name: (assignment.roles as any).display_name,
    location_name: (assignment.locations as any)?.name,
    location_id: (assignment.locations as any)?.id,
    assigned_at: assignment.assigned_at
  })) || []

  // Get all assigned locations (unique)
  const assignedLocationIds = roles
    .filter(r => r.location_id)
    .map(r => r.location_id!)
    .filter((id, index, arr) => arr.indexOf(id) === index)

  const { data: locationsData } = await supabase
    .from('locations')
    .select('id, name')
    .in('id', assignedLocationIds.length > 0 ? assignedLocationIds : [''])

  const locations = locationsData || []

  return <UserProfileClient 
    user={user} 
    profile={profile} 
    userId={user.id}
    orgId={orgId}
    avatarUrl={profile?.avatar_url}
    canBranding={canBranding}
    roles={roles}
    locations={locations}
  />
}