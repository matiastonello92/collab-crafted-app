import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { ReportsClient } from '@/components/haccp/reports/ReportsClient';

export const metadata = {
  title: 'HACCP Reports | Klyra',
  description: 'Generate and export HACCP compliance reports',
};

export default async function HaccpReportsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  const { data: hasPermission } = await supabase.rpc('user_has_permission', {
    p_user: user.id,
    p_permission: 'haccp:export'
  });

  if (!hasPermission) {
    redirect('/access-denied');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, default_location_id')
    .eq('id', user.id)
    .single();

  if (!profile?.default_location_id) {
    redirect('/');
  }

  return <ReportsClient locationId={profile.default_location_id} />;
}
