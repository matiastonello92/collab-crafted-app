import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { CleaningScheduleView } from '@/components/haccp/cleaning/CleaningScheduleView';

export const metadata = {
  title: 'Cleaning Plan | Klyra',
  description: 'HACCP cleaning schedule and tracking',
};

export default async function CleaningPlanPage() {
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
    .select('default_location_id')
    .eq('id', user.id)
    .single();

  if (!profile?.default_location_id) {
    redirect('/');
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <CleaningScheduleView locationId={profile.default_location_id} />
    </div>
  );
}
