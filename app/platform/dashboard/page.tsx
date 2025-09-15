import { requirePlatformAdmin } from '@/lib/admin/guards'
import { PlatformDashboardClient } from './PlatformDashboardClient'

export default async function PlatformDashboardPage() {
  await requirePlatformAdmin()

  return <PlatformDashboardClient />
}