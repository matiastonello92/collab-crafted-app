'use client'

import type { ReactNode } from 'react'

import { useRequireSession } from '@/lib/useRequireSession'

export function SessionGuard({ children }: { children: ReactNode }) {
  useRequireSession()
  return <>{children}</>
}

