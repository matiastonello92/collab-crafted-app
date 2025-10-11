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

export default async function TimesheetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TimesheetDetailClient timesheetId={id} />
}
