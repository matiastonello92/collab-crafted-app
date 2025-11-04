import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { AreasConfigPanel } from '@/components/haccp/cleaning/AreasConfigPanel';

export const metadata = {
  title: 'Cleaning Areas Config | Klyra',
  description: 'Configure HACCP cleaning areas and schedules',
};

export default async function CleaningConfigPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  const { data: hasPermission } = await supabase.rpc('user_has_permission', {
    p_user: user.id,
    p_permission: 'haccp:manage'
  });

  if (!hasPermission) {
    redirect('/access-denied');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, default_location_id')
    .eq('id', user.id)
    .single();

  if (!profile?.default_location_id || !profile?.org_id) {
    redirect('/');
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <AreasConfigPanel 
        locationId={profile.default_location_id}
        orgId={profile.org_id}
      />
    </div>
  );
}
