import { Metadata } from 'next'
import { LeaveInboxClient } from './LeaveInboxClient'

export const metadata: Metadata = {
  title: 'Leave Inbox - Klyra',
  description: 'Approve or reject leave requests',
}

export default function LeaveInboxPage() {
  return <LeaveInboxClient />
}
