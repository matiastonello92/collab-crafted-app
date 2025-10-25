import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { TaskDetailClient } from '@/components/haccp/tasks/TaskDetailClient';

export default async function TaskDetailPage({ params }: { params: { taskId: string } }) {
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

  return <TaskDetailClient taskId={params.taskId} />;
}
