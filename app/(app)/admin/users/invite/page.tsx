import { requireOrgAdmin } from '@/lib/admin/guards'
import InviteUserPageClient from './InviteUserPageClient'

export default async function InviteUserPage() {
  await requireOrgAdmin()

  return <InviteUserPageClient />
}