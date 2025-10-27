import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { TaskDetailClient } from '@/components/haccp/tasks/TaskDetailClient';

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export default async function TaskDetailPage({ params }: { params: { taskId: string } }) {
  // Validate taskId before proceeding
  if (params.taskId === 'new' || !isValidUUID(params.taskId)) {
    redirect('/haccp/tasks');
  }

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
