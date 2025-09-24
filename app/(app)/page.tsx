import { Suspense } from 'react'
import DashboardClient from './dashboard/DashboardClient'
import { SmartLoadingSkeleton } from '@/components/performance/SmartLoading'

export const dynamic = 'force-dynamic'

export default function HomePage() {

  return (
    <Suspense fallback={<SmartLoadingSkeleton variant="dashboard" />}>
      <DashboardClient />
    </Suspense>
  )
}
