import { Suspense } from 'react';
import DashboardSettingsClient from './DashboardSettingsClient';
import { SmartLoadingSkeleton } from '@/components/performance/SmartLoading';

export const dynamic = 'force-dynamic';

export default function DashboardSettingsPage() {
  return (
    <Suspense fallback={<SmartLoadingSkeleton variant="form" />}>
      <DashboardSettingsClient />
    </Suspense>
  );
}
