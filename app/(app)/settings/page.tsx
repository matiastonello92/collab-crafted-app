import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { UserSettingsClient } from './UserSettingsClient'

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load user profile including org_id for storage context
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.org_id) {
    // User has no org_id - this shouldn't happen in a proper setup
    redirect('/login')
  }

  return <UserSettingsClient user={user} profile={profile} orgId={profile.org_id} />
}