import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { OnboardingWizard } from './components/OnboardingWizard'

export const metadata = {
  title: 'Onboarding Rota | Klyra',
  description: 'Crea la tua prima rota settimanale',
}

export default async function OnboardingRotaPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Check if user has shifts:manage permission
  const { data: hasPermission } = await supabase
    .rpc('user_has_permission', { 
      p_user: user.id, 
      p_permission: 'shifts:manage' 
    })

  if (!hasPermission) {
    redirect('/access-denied')
  }

  return <OnboardingWizard />
}
