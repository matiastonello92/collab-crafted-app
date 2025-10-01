import { Metadata } from 'next'
import TimesheetDetailClient from './TimesheetDetailClient'

export const metadata: Metadata = {
  title: 'Dettaglio Timesheet | Admin',
  description: 'Visualizza e approva timesheet'
}

export default function TimesheetDetailPage({ params }: { params: { id: string } }) {
  return <TimesheetDetailClient timesheetId={params.id} />
}
