import { requireOrgAdmin } from '@/lib/admin/guards'
import { AdminDashboardClient } from './AdminDashboardClient'

export default async function AdminDashboardPage() {
  const { orgId } = await requireOrgAdmin()

  return <AdminDashboardClient orgId={orgId} />
}