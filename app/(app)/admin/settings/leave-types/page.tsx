import { Metadata } from 'next'
import { LeaveTypesClient } from './LeaveTypesClient'
import { getTranslation } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslation()
  return {
    title: t('leave.types.title'),
    description: t('leave.types.description'),
  }
}

export default function LeaveTypesPage() {
  return <LeaveTypesClient />
}
