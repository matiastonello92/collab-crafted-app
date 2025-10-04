import { Metadata } from 'next'
import { JobTagsClient } from './JobTagsClient'
import { getTranslation } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslation()
  return {
    title: t('staff.jobTags.pageTitle'),
    description: t('staff.jobTags.pageDescription'),
  }
}

export default function JobTagsPage() {
  return <JobTagsClient />
}
