import { requireAdmin } from '@/lib/admin/guards'
import { AdminSettingsClient } from './AdminSettingsClient'
import { getAppSetting } from '@/app/actions/app-settings'
import { orgHasFeature } from '@/lib/server/features'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export default async function AdminSettingsPage() {
  // Server-side admin protection
  await requireAdmin()

  // Get org context
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let orgId = null
  if (user) {
    const { data: membership } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .single()
    orgId = membership?.org_id
  }

  // Check feature flags
  const canBranding = orgId ? await orgHasFeature(orgId, 'branding') : false
  const canInvitations = orgId ? await orgHasFeature(orgId, 'invitations') : false

  // Environment status (server-side only)
  const envStatus = {
    resendApiKey: !!process.env.RESEND_API_KEY,
    resendFrom: !!process.env.RESEND_FROM
  }

  // Load app settings
  const [branding, business, access, banner] = await Promise.all([
    getAppSetting('branding'),
    getAppSetting('business'), 
    getAppSetting('access'),
    getAppSetting('banner')
  ])

  const appSettings = {
    branding,
    business,
    access,
    banner
  }

  const featureFlags = {
    canBranding,
    canInvitations
  }

  return <AdminSettingsClient 
    envStatus={envStatus} 
    appSettings={appSettings}
    featureFlags={featureFlags}
    orgId={orgId}
  />
}