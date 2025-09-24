'use client'

import { useEffect } from 'react'
import type { AppBootstrap } from '@/types/app-bootstrap'
import { useAppStore } from '@/lib/store'
import { useRequireSession } from '@/lib/useRequireSession'

interface Props {
  bootstrap: AppBootstrap
  children: React.ReactNode
}

export default function AuthenticatedLayoutClient({ bootstrap, children }: Props) {
  const hydrate = useAppStore((state) => state.hydrate)

  useRequireSession()

  useEffect(() => {
    hydrate(bootstrap)
  }, [bootstrap, hydrate])

  return <>{children}</>
}
