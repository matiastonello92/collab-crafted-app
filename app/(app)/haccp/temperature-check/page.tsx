import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { TemperatureQuickEntry } from '@/components/haccp/temperatures/TemperatureQuickEntry';

export const metadata = {
  title: 'Temperature Check | Klyra',
  description: 'Quick temperature recording for HACCP equipment',
};

export default async function TemperatureCheckPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  const { data: hasPermission } = await supabase.rpc('user_has_permission', {
    p_user: user.id,
    p_permission: 'haccp:check'
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
      <TemperatureQuickEntry 
        locationId={profile.default_location_id} 
        orgId={profile.org_id}
      />
    </div>
  );
}
