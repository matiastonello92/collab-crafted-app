import { requireOrgAdmin } from '@/lib/admin/guards'
import CreateLocationPageClient from './CreateLocationPageClient'

export default async function CreateLocationPage() {
  await requireOrgAdmin()

  return <CreateLocationPageClient />
}