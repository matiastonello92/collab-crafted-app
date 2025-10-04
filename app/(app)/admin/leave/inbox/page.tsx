import { Metadata } from 'next'
import { LeaveInboxClient } from './LeaveInboxClient'
import { getTranslation } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslation()
  return {
    title: t('admin.pageTitle'),
    description: t('leave.inbox.description'),
  }
}

export default function LeaveInboxPage() {
  return <LeaveInboxClient />
}
