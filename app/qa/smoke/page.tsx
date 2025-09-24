import { redirect } from 'next/navigation'
import { createSupabaseUserClient } from '@/lib/supabase/clients'
import { requireOrgAdmin } from '@/lib/admin/guards'
import { SmokeTestClient } from './components/SmokeTestClient'
import { orgHasFeature } from '@/lib/server/features'

export default async function QASmokeTestPage() {
  await requireOrgAdmin()
  
  const supabase = await createSupabaseUserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load user profile to get org_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, default_location_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.org_id) {
    redirect('/login')
  }

  // Run server-side tests
  const serverTests = {
    auth: {
      pass: !authError && !!user,
      details: authError ? authError.message : `User ID: ${user.id}`,
    },
    featureBranding: {
      pass: false,
      details: 'Loading...',
    },
    featureInvitations: {
      pass: false,
      details: 'Loading...',
    }
  }

  try {
    const brandingEnabled = await orgHasFeature(profile.org_id, 'branding')
    const invitationsEnabled = await orgHasFeature(profile.org_id, 'invitations')
    
    serverTests.featureBranding = {
      pass: brandingEnabled !== null,
      details: `Branding feature: ${brandingEnabled ? 'ENABLED' : 'DISABLED'}`,
    }
    
    serverTests.featureInvitations = {
      pass: invitationsEnabled !== null,
      details: `Invitations feature: ${invitationsEnabled ? 'ENABLED' : 'DISABLED'}`,
    }
  } catch (error) {
    serverTests.featureBranding.details = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    serverTests.featureInvitations.details = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">QA Smoke Tests</h1>
        <p className="text-muted-foreground">
          End-to-end validation of core SaaS functionality
        </p>
      </div>

      <SmokeTestClient 
        userId={user.id}
        orgId={profile.org_id}
        locationId={profile.default_location_id}
        serverTests={serverTests}
      />
    </div>
  )
}