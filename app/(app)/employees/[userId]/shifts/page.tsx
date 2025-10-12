import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { ShiftsOverviewClient } from './ShiftsOverviewClient'

export default async function EmployeeShiftsPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const supabase = await createSupabaseServerClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Check if user has shifts:manage permission or is viewing own profile
  const { data: hasPermission } = await supabase.rpc('user_has_permission', {
    p_permission: 'shifts:manage'
  })

  const isOwnProfile = user.id === userId

  if (!hasPermission && !isOwnProfile) {
    redirect('/planner')
  }

  // Fetch employee profile
  const { data: employee, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('id', userId)
    .single()

  if (error || !employee) {
    redirect('/planner')
  }

  return <ShiftsOverviewClient employee={employee} currentUserId={user.id} />
}
