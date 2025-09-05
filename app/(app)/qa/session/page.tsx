import { createSupabaseServerClient } from '@/utils/supabase/server';

// TODO: richiudere /qa a soli admin appena risolto il debug
export default async function SessionPing() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <pre className="text-xs bg-muted p-3 rounded-lg">
      {JSON.stringify({ userId: user?.id ?? null, email: user?.email ?? null }, null, 2)}
    </pre>
  );
}
