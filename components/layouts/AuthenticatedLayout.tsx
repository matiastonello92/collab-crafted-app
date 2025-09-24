import type { ReactNode } from 'react'

import AppShell from '@/components/layouts/AppShell'
import { AppStateHydrator } from '@/components/layouts/AppStateHydrator'
import { SessionGuard } from '@/components/layouts/SessionGuard'
import { loadAuthenticatedState } from '@/lib/server/session-context'

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const state = await loadAuthenticatedState()

  return (
    <SessionGuard>
      <AppStateHydrator state={state}>
        <AppShell initialState={state}>{children}</AppShell>
      </AppStateHydrator>
    </SessionGuard>
  )
}

