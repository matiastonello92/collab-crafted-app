import { createSupabaseServerClient } from '@/utils/supabase/server'

export default async function SessionPing() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  return (
    <pre className="text-xs bg-muted p-3 rounded-lg">
      {JSON.stringify({ userId: user?.id ?? null, email: user?.email ?? null, error: error?.message ?? null }, null, 2)}
    </pre>
  )
}
