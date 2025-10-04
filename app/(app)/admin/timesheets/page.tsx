import { Metadata } from 'next'
import TimesheetsClient from './TimesheetsClient'
import { getTranslation } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslation()
  return {
    title: t('admin.pageTitle'),
    description: t('timesheet.description'),
  }
}

export default function TimesheetsPage() {
  return <TimesheetsClient />
}
