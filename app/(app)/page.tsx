import DashboardClient from './DashboardClient'
import { getAuthSnapshot } from '@/lib/server/auth-snapshot'

export default async function HomePage() {
  const { locations, activeLocationId, permissions } = await getAuthSnapshot()
  const locationName = locations.find(l => l.id === activeLocationId)?.name ?? null
  return <DashboardClient locationName={locationName} permissions={permissions} />
}
