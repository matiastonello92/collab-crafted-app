import { Metadata } from 'next'
import { LeaveTypesClient } from './LeaveTypesClient'

export const metadata: Metadata = {
  title: 'Leave Types - Klyra',
  description: 'Manage organization leave types',
}

export default function LeaveTypesPage() {
  return <LeaveTypesClient />
}
