import { Metadata } from 'next'
import TimesheetDetailClient from './TimesheetDetailClient'
import { getTranslation } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslation()
  return {
    title: t('admin.pageTitle'),
    description: t('timesheet.detail.description'),
  }
}

export default function TimesheetDetailPage({ params }: { params: { id: string } }) {
  return <TimesheetDetailClient timesheetId={params.id} />
}
