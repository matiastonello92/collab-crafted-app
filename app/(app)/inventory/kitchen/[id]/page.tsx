import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { InventoryPage } from '@/components/inventory/InventoryPage'

export default async function KitchenInventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
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

  return <InventoryPage category="kitchen" inventoryId={id} />
}
