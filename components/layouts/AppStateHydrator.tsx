'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import { useAppStore, type HydrationPayload } from '@/lib/store'

export function AppStateHydrator({ state, children }: { state: HydrationPayload; children: ReactNode }) {
  const hydrate = useAppStore((s) => s.hydrate)
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      hydrate(state)
      initialized.current = true
      return
    }
    hydrate(state)
  }, [hydrate, state])

  return <>{children}</>
}

