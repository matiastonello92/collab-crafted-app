import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { PlannerClient } from './PlannerClient'

export const metadata = {
  title: 'Planner Turni | Klyra',
  description: 'Pianificazione settimanale turni per location'
}

export default async function PlannerPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Check if user has shifts:manage permission via RPC
  const { data: hasPermission } = await supabase
    .rpc('user_has_permission', { 
      p_user: user.id, 
      p_permission: 'shifts:manage' 
    })

  if (!hasPermission) {
    redirect('/access-denied')
  }

  return <PlannerClient />
}
