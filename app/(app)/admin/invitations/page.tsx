import { requireOrgAdmin } from '@/lib/admin/guards'
import { AdminInvitationsClient } from './AdminInvitationsClient'

export default async function AdminInvitationsPage() {
  await requireOrgAdmin()
  return <AdminInvitationsClient />
}