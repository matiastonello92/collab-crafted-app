import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { InventoryListPage } from '@/components/inventory/InventoryListPage'

export default async function KitchenInventoryPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: hasPermission } = await supabase
    .rpc('user_has_permission', { 
      p_user: user.id, 
      p_permission: 'shifts:manage'
    })

  if (!hasPermission) {
    redirect('/access-denied')
  }

  return <InventoryListPage category="kitchen" />
}
