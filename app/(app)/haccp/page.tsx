import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { HaccpDashboard } from '@/components/haccp/dashboard/HaccpDashboard';

export const metadata = {
  title: 'HACCP Dashboard | Klyra',
  description: 'Food safety compliance tracking and management',
};

export default async function HaccpPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  // Check HACCP permission
  const { data: hasPermission, error: permError } = await supabase.rpc('user_has_permission', {
    p_user: user.id,
    p_permission: 'haccp:view'
  });

  if (permError || !hasPermission) {
    redirect('/access-denied');
  }

  // Get user profile with org/location
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, default_location_id')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id || !profile?.default_location_id) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Organization Setup Required</h1>
        <p className="text-muted-foreground">Please complete your organization setup to access HACCP module.</p>
      </div>
    );
  }

  return (
    <HaccpDashboard 
      orgId={profile.org_id} 
      locationId={profile.default_location_id}
    />
  );
}
