import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { CatalogPage } from '@/components/inventory/CatalogPage'

export default async function CatalogRoute({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  
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

  return <CatalogPage category={category as 'kitchen' | 'bar' | 'cleaning'} />
}
