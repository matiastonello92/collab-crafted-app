import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { TemperaturesClient } from '@/components/haccp/temperatures/TemperaturesClient';

export const metadata = {
  title: 'Temperature Logs | Klyra',
  description: 'View HACCP temperature monitoring logs',
};

export default async function HaccpTemperaturesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  const { data: hasPermission } = await supabase.rpc('user_has_permission', {
    p_user: user.id,
    p_permission: 'haccp:view'
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

  return <TemperaturesClient locationId={profile.default_location_id} />;
}
