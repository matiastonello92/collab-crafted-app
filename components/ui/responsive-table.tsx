'use client'

import { useBreakpoint } from '@/hooks/useBreakpoint'
import { Table } from './table'
import { ReactNode } from 'react'

interface ResponsiveTableProps {
  children: ReactNode
  mobileCards?: (data: any[]) => ReactNode
  data?: any[]
  className?: string
}

/**
 * Responsive Table Wrapper
 * Desktop: Shows normal table
 * Mobile: Shows card-based layout if mobileCards renderer is provided
 */
export function ResponsiveTable({ 
  children, 
  mobileCards, 
  data,
  className = ''
}: ResponsiveTableProps) {
  const { isMobile } = useBreakpoint()
  
  // Mobile: show cards if renderer provided
  if (isMobile && mobileCards && data) {
    return <div className="space-y-3">{mobileCards(data)}</div>
  }
  
  // Desktop: show table
  return (
    <div className={`overflow-x-auto rounded-lg border ${className}`}>
      <Table>{children}</Table>
    </div>
  )
}
