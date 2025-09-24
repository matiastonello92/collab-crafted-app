import { redirect } from 'next/navigation'
import { createSupabaseUserClient } from '@/lib/supabase/clients'
import { UserSettingsClient } from './UserSettingsClient'
import { orgHasFeature } from '@/lib/server/features'

export default async function SettingsPage() {
  const supabase = await createSupabaseUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.warn('[SETTINGS] no user')
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
    console.warn('[SETTINGS] no profile for user', user.id)
  }
  if (!orgId) {
    console.warn('[SETTINGS] no org_id for user', user.id)
  }

  // Check branding feature for avatar uploads
  const canBranding = orgId ? await orgHasFeature(orgId, 'branding') : false

  return <UserSettingsClient 
    user={user} 
    profile={profile} 
    userId={user.id}
    orgId={orgId}
    avatarUrl={profile?.avatar_url}
    canBranding={canBranding}
  />
}