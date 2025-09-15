import { redirect } from 'next/navigation'
import { requireOrgAdmin } from '@/lib/admin/guards'

export default async function AdminPage() {
  // Ensure user has org admin permissions
  await requireOrgAdmin()
  
  // Redirect to admin dashboard
  redirect('/admin/dashboard')
}