import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { EmailLogsClient } from './EmailLogsClient';

export const metadata: Metadata = {
  title: 'Log Email | Admin Settings',
  description: 'metadata.emailLogsDesc'
};

export default async function EmailLogsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check admin permission
  const { data: hasPerm } = await supabase.rpc('user_has_permission', {
    p_user: user.id,
    p_permission: 'view_settings'
  });

  if (!hasPerm) {
    redirect('/admin/access-denied');
  }

  // Fetch profile for org_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) {
    redirect('/admin/no-org');
  }

  return <EmailLogsClient orgId={profile.org_id} />;
}
