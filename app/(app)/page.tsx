import { Suspense } from 'react'
import DashboardClient from './dashboard/DashboardClient'
import { SmartLoadingSkeleton } from '@/components/performance/SmartLoading'
import { ClientOnly } from '@/lib/hydration/ClientOnly'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <Suspense fallback={<SmartLoadingSkeleton variant="dashboard" />}>
      <ClientOnly fallback={<SmartLoadingSkeleton variant="dashboard" />}>
        <DashboardClient />
      </ClientOnly>
    </Suspense>
  )
}
